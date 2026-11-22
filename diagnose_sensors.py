"""
SpotSync sensor pipeline check.  Run from the backend folder (venv active):

    cd backend
    python ../diagnose_sensors.py

Tells you exactly which hop of
  Arduino UNO Q -> bridge -> EMQX -> backend -> PostgreSQL -> dashboard
is broken.
"""
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.getcwd())

from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.parking_slot import ParkingSlot  # noqa: E402
from app.models.sensor import Sensor  # noqa: E402
from app.models.sensor_event import SensorEvent  # noqa: E402

# Must match arduino_mqtt_bridge.py
BRIDGE = {
    "SENSOR_001": "B1-A1", "SENSOR_002": "B1-A2", "SENSOR_003": "B1-A3",
    "SENSOR_004": "B2-A1", "SENSOR_005": "B2-A2", "SENSOR_006": "B2-A3",
    "SENSOR_007": "B2-A4",
}

problems = []


def section(title):
    print(f"\n=== {title} ===")


section("1. Backend MQTT settings (backend/.env)")
print(f"MQTT_ENABLED        : {settings.mqtt_enabled}")
print(f"MQTT_BROKER / PORT  : {settings.mqtt_broker}:{settings.mqtt_port}  TLS={settings.mqtt_tls_enabled}")
print(f"MQTT_USERNAME set   : {bool(settings.mqtt_username)}")
print(f"MQTT_PASSWORD set   : {bool(settings.mqtt_password)}")
if not settings.mqtt_username or not settings.mqtt_password:
    problems.append("backend/.env has no MQTT_USERNAME / MQTT_PASSWORD -> backend can never receive sensor data.")
if not settings.mqtt_enabled and not settings.mqtt_username:
    problems.append("MQTT_ENABLED is false -> subscriber does not start.")

db = SessionLocal()
try:
    section("2. Sensor -> slot mapping (the bridge's slot_id must match the DB)")
    sensors = {s.sensor_code: s for s in db.scalars(select(Sensor)).all()}
    for code, bridge_slot in BRIDGE.items():
        sensor = sensors.get(code)
        if sensor is None:
            print(f"{code}: MISSING from sensors table")
            problems.append(f"{code} is not registered in the sensors table.")
            continue
        slot = db.get(ParkingSlot, sensor.parking_slot_id) if sensor.parking_slot_id else None
        if slot is None:
            print(f"{code}: not linked to any parking slot")
            problems.append(f"{code} has no parking_slot_id.")
            continue
        valid = {c for c in (slot.slot_number, slot.display_code) if c}
        ok = bridge_slot in valid
        print(
            f"{code}: bridge sends '{bridge_slot}' | DB slot id={slot.id} "
            f"slot_number={slot.slot_number} display_code={slot.display_code} "
            f"status={slot.status} -> {'OK' if ok else 'MISMATCH (messages are REJECTED)'}"
        )
        if not ok:
            problems.append(
                f"{code}: bridge sends '{bridge_slot}' but DB slot is {sorted(valid)}. "
                f"Edit SENSORS in arduino_mqtt_bridge.py or fix parking_slots.display_code."
            )
    s8 = sensors.get("SENSOR_008")
    print(f"SENSOR_008 (entrance): {'present, type=' + str(s8.sensor_type) if s8 else 'MISSING'}")

    section("3. Latest reading per sensor in PostgreSQL")
    now = datetime.now(timezone.utc)
    newest_age = None
    for code in list(BRIDGE) + ["SENSOR_008"]:
        sensor = sensors.get(code)
        if sensor is None:
            continue
        event = db.scalars(
            select(SensorEvent)
            .where(SensorEvent.sensor_id == sensor.id)
            .order_by(SensorEvent.created_at.desc(), SensorEvent.id.desc())
            .limit(1)
        ).first()
        if event is None:
            print(f"{code}: no events ever stored")
            continue
        age = (now - event.created_at).total_seconds()
        newest_age = age if newest_age is None else min(newest_age, age)
        fresh = "LIVE" if age <= 120 else "STALE"
        print(f"{code}: {event.event_type:<10} value={event.value} age={age:7.0f}s  online={sensor.is_online}  [{fresh}]")

    section("RESULT")
    if newest_age is None:
        problems.append(
            "No sensor events are stored at all. Data is not reaching PostgreSQL: "
            "check the bridge terminal prints PUBLISHED, then the backend log for "
            "'MQTT CONNECTED' / 'MQTT SENSOR' / 'REJECTED SENSOR MESSAGE'."
        )
    elif newest_age > 120:
        problems.append(
            f"Newest reading is {newest_age:.0f}s old. The bridge is not running, or the "
            "backend is not receiving. Start arduino_mqtt_bridge.py and watch the backend log."
        )
finally:
    db.close()

if problems:
    print("PROBLEMS FOUND:")
    for number, text in enumerate(problems, 1):
        print(f"  {number}. {text}")
else:
    print("Database side is healthy: readings are fresh and mapped correctly.")
    print("If the dashboard is still empty: log in again and hard-refresh (Ctrl+Shift+R).")
