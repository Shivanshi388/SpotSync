from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.parking_slot import ParkingSlot
from app.models.sensor import Sensor
from app.models.sensor_event import SensorEvent
from app.services.incident_service import incident_service


def update_slot_from_sensor(
    db: Session,
    slot_id: str,
    status: str,
) -> bool:
    slot = db.scalar(
        select(ParkingSlot).where(
            ParkingSlot.slot_number == slot_id
        )
    )

    if not slot:
        return False

    if status not in {"occupied", "available"}:
        return False

    slot.is_available = status == "available"

    db.commit()

    return True


class SensorService:

    def process_event(
        self,
        db: Session,
        sensor_id: int,
        event_type: str,
        value: float | None = None,
        payload: dict | None = None,
    ):
        sensor = db.get(Sensor, sensor_id)

        if sensor is None:
            return None

        now = datetime.now(timezone.utc)

        event = SensorEvent(
            sensor_id=sensor_id,
            event_type=event_type,
            value=value,
            payload=payload or {},
            created_at=now,
        )

        db.add(event)

        sensor.last_seen_at = now
        sensor.is_online = True

        db.flush()

        parking_lot_id = getattr(
            sensor,
            "parking_lot_id",
            None,
        )

        if parking_lot_id is not None:
            incident_service.detect_sensor_incident(
                db=db,
                parking_lot_id=parking_lot_id,
                event_type=event_type,
                value=value,
            )

        db.commit()
        db.refresh(event)

        return event

    def get_sensor(
        self,
        db: Session,
        sensor_id: int,
    ):
        return db.get(Sensor, sensor_id)


sensor_service = SensorService()