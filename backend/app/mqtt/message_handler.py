import json

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.mqtt.payload_validator import SensorPayload
from app.services.sensor_service import sensor_service, update_slot_from_sensor


def handle_sensor_message(
    db: Session,
    payload: bytes,
) -> bool:
    try:
        data = json.loads(payload.decode("utf-8"))
        sensor_payload = SensorPayload.model_validate(data)
    except (json.JSONDecodeError, UnicodeDecodeError, ValidationError):
        return False

    slot_updated = update_slot_from_sensor(
        db=db,
        slot_id=sensor_payload.slot_id,
        status=sensor_payload.status,
    )

    if not slot_updated:
        return False

    sensor_id = 1 if sensor_payload.sensor_id == "SENSOR_001" else None

    if sensor_id is None:
        return False

    event = sensor_service.process_event(
        db=db,
        sensor_id=sensor_id,
        event_type=sensor_payload.status,
        value=sensor_payload.distance_cm,
        payload=data,
    )

    return event is not None
