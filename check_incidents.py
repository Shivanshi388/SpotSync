"""
Shows exactly what the "unresolved mismatches" number is made of.
Run from the backend folder (venv active):

    cd backend
    python ../check_incidents.py          # read-only report
    python ../check_incidents.py --fix    # also close STALE incidents

--fix only closes fault/offline incidents of sensors that are reporting a
good (occupied/available) reading right now. Faulty sensors keep theirs.
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.getcwd())

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.incident import Incident  # noqa: E402
from app.models.sensor import Sensor  # noqa: E402
from app.models.sensor_event import SensorEvent  # noqa: E402

FIX = "--fix" in sys.argv

service_file = Path("app/services/sensor_service.py")
patched = service_file.exists() and "auto_resolve_sensor_incidents" in service_file.read_text(
    encoding="utf-8", errors="ignore"
)
print(f"Incident auto-resolve patch present in code: {patched}")
if not patched:
    print("  -> Run spotsync_incident_patch.py, then restart the backend.\n")

db = SessionLocal()
try:
    now = datetime.now(timezone.utc)
    sensors = {s.id: s for s in db.scalars(select(Sensor)).all()}

    healthy = {}
    for sensor_id, sensor in sensors.items():
        event = db.scalars(
            select(SensorEvent)
            .where(SensorEvent.sensor_id == sensor_id)
            .order_by(SensorEvent.created_at.desc(), SensorEvent.id.desc())
            .limit(1)
        ).first()
        age = (now - event.created_at).total_seconds() if event else None
        healthy[sensor_id] = bool(
            event and event.event_type in ("occupied", "available") and age is not None and age <= 120
        )

    open_incidents = db.scalars(
        select(Incident).where(Incident.status == "open").order_by(Incident.id)
    ).all()

    print(f"Open incidents: {len(open_incidents)}\n")
    print(f"{'id':>5}  {'sensor':<11} {'type':<18} {'sensor now':<10} verdict")
    stale = []
    for incident in open_incidents:
        sensor = sensors.get(incident.sensor_id)
        code = sensor.sensor_code if sensor else "(none)"
        is_healthy = bool(sensor) and healthy.get(sensor.id, False)
        closable = is_healthy and incident.incident_type in ("sensor_fault", "sensor_failure")
        if closable:
            stale.append(incident)
        verdict = (
            "STALE - sensor is fine now" if closable
            else "real - sensor still bad/silent" if sensor
            else "no sensor linked (cannot auto-close)"
        )
        print(f"{incident.id:>5}  {code:<11} {incident.incident_type:<18} "
              f"{'healthy' if is_healthy else 'not ok':<10} {verdict}")

    print(f"\nStale (safe to close): {len(stale)}   Real: {len(open_incidents) - len(stale)}")

    if FIX and stale:
        for incident in stale:
            incident.status = "resolved"
        db.commit()
        print(f"Closed {len(stale)} stale incident(s). Refresh the dashboard.")
    elif stale:
        print("Run again with --fix to close the stale ones now.")
finally:
    db.close()
