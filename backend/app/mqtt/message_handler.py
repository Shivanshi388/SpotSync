import json
from datetime import datetime, timezone

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.parking_slot import ParkingSlot
from app.models.sensor import Sensor
from app.mqtt.payload_validator import SensorPayload
from app.services.sensor_service import sensor_service
from app.websocket.parking_updates import publish_parking_update


PARKING_SENSOR_EVENTS = {
    "occupied",
    "available",
    "fault",
    "blocked",
    "sensor_offline",
    "unexpected_occupancy",
}

# S8 reports activity at the entrance/ramp. It must never claim or update a slot.
ENTRANCE_SENSOR_EVENTS = {
    "entry_detected",
    "exit_detected",
    "fault",
    "sensor_offline",
}


def process_sensor_payload(db: Session, data: dict):
    """Validate and process a reading according to the registered sensor role."""
    try:
        sensor_payload = SensorPayload.model_validate(data)
    except ValidationError:
        return None

    reading_time = sensor_payload.timestamp

    # Device timestamps must include a timezone.
    if reading_time.tzinfo is None or reading_time.utcoffset() is None:
        return None

    now = datetime.now(timezone.utc)
    age_seconds = (now - reading_time.astimezone(timezone.utc)).total_seconds()

    if age_seconds > settings.sensor_stale_after_seconds:
        return None

    # Some ESP/PC clocks can run slightly ahead. Keep a bounded tolerance;
    # event.created_at and last_seen_at are stamped by the backend on receipt.
    future_skew_limit = max(settings.sensor_max_future_skew_seconds, 300)
    if age_seconds < -future_skew_limit:
        return None

    sensor_code = sensor_payload.sensor_id.strip()
    claimed_slot = (sensor_payload.slot_id or "").strip()
    event_type = sensor_payload.status.strip().lower()

    if not sensor_code:
        return None

    sensor = db.scalar(
        select(Sensor).where(Sensor.sensor_code == sensor_code)
    )

    if sensor is None:
        return None

    sensor_type = (sensor.sensor_type or "").strip().lower()

    if sensor_type == "entrance_exit":
        # Entrance sensors are deliberately not assigned to a parking slot.
        if sensor.parking_slot_id is not None or claimed_slot:
            return None
        if event_type not in ENTRANCE_SENSOR_EVENTS:
            return None

    else:
        # Every parking sensor must be assigned to exactly the slot it reports.
        if sensor.parking_slot_id is None or not claimed_slot:
            return None
        if event_type not in PARKING_SENSOR_EVENTS:
            return None

        assigned_slot = db.get(ParkingSlot, sensor.parking_slot_id)
        if assigned_slot is None:
            return None

        valid_slot_codes = {
            code
            for code in (assigned_slot.slot_number, assigned_slot.display_code)
            if code
        }

        if claimed_slot not in valid_slot_codes:
            return None

    # SensorService records entrance events too. Since S8 has no slot assignment,
    # this updates its health/last-seen state and stores the event without changing
    # any parking-space occupancy.
    event = sensor_service.process_event(
        db=db,
        sensor_id=sensor.id,
        event_type=event_type,
        value=sensor_payload.distance_cm,
        payload=data,
    )

    if event is not None and sensor_type != "entrance_exit":
        db.refresh(assigned_slot)
        publish_parking_update(
            {
                "slot_id": assigned_slot.id,
                "slot_number": assigned_slot.slot_number,
                "status": assigned_slot.status,
                "is_available": assigned_slot.is_available,
                "event_type": event_type,
                "event_id": event.id,
            }
        )

    return event


def handle_sensor_message(db: Session, payload: bytes) -> bool:
    """MQTT adapter: decode the message and use shared sensor validation."""
    try:
        data = json.loads(payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return False

    if not isinstance(data, dict):
        return False

    return process_sensor_payload(db, data) is not None
