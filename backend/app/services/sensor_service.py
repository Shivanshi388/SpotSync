
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.parking_slot import ParkingSlot
from app.models.sensor import Sensor
from app.models.sensor_event import SensorEvent
from app.services.incident_service import incident_service
from app.websocket.parking_updates import publish_parking_update
from app.repositories.session_repository import get_active_session_for_slot_for_update


class SensorService:

    @staticmethod
    def _mark_slot_unknown(slot: ParkingSlot | None) -> None:
        if slot is None or slot.status == "RESERVED":
            return

        slot.status = "UNKNOWN"
        slot.is_available = False

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
        is_offline_event = event_type == "sensor_offline"

        event = SensorEvent(
            sensor_id=sensor_id,
            event_type=event_type,
            value=value,
            payload=payload or {},
            created_at=now,
        )

        db.add(event)
        sensor.last_seen_at = now
        sensor.is_online = not is_offline_event
        db.flush()

        # Only the assigned slot can be updated by this sensor.
        slot = None
        if sensor.parking_slot_id is not None:
            slot = db.get(ParkingSlot, sensor.parking_slot_id)

        # A good reading means the sensor has recovered: close its open
        # fault/offline incidents (committed with the rest of this event).
        if event_type in {"occupied", "available"}:
            incident_service.auto_resolve_sensor_incidents(db, sensor_id)

        # Fault/offline/blocked readings immediately make the bay non-available.
        # A sensor fault is not an occupancy reading and must never free a bay.
        if is_offline_event or event_type in {"fault", "blocked", "unexpected_occupancy"}:
            self._mark_slot_unknown(slot)

        # Fault and offline events must never count as occupancy readings.
        if (
            not is_offline_event
            and slot is not None
            and event_type in {"occupied", "available"}
        ):
            recent_events = db.scalars(
                select(SensorEvent.event_type)
                .where(SensorEvent.sensor_id == sensor_id)
                .order_by(
                    SensorEvent.created_at.desc(),
                    SensorEvent.id.desc(),
                )
                .limit(3)
            ).all()

            if len(recent_events) == 3 and all(
                reading == event_type for reading in recent_events
            ):
                if event_type == "occupied":
                    slot.status = "OCCUPIED"
                    slot.is_available = False

                elif slot.status != "RESERVED":
                    # Sensor readings must never complete an active session.
                    active_session = get_active_session_for_slot_for_update(
                        db, slot.id
                    )
                    if active_session is None:
                        slot.status = "AVAILABLE"
                        slot.is_available = True
                    else:
                        slot.status = "OCCUPIED"
                        slot.is_available = False

        if sensor.parking_lot_id is not None:
            incident_service.detect_sensor_incident(
                db=db,
                parking_lot_id=sensor.parking_lot_id,
                event_type=event_type,
                value=value,
                sensor_id=sensor_id,
            )

        db.commit()
        db.refresh(event)

        return event

    def mark_stale_sensors_offline(
        self,
        db: Session,
        timeout_seconds: int = 120,
    ) -> int:
        """Mark online sensors offline when they stop reporting."""
        cutoff = datetime.now(timezone.utc) - timedelta(
            seconds=timeout_seconds
        )

        statement = select(Sensor).where(
            Sensor.is_online.is_(True),
            or_(
                Sensor.last_seen_at.is_(None),
                Sensor.last_seen_at < cutoff,
            ),
        )

        stale_sensors = db.scalars(statement).all()
        changed_slots = {}

        for sensor in stale_sensors:
            sensor.is_online = False

            if sensor.parking_slot_id is not None:
                slot = db.get(ParkingSlot, sensor.parking_slot_id)
                previous_state = (
                    getattr(slot, "status", None),
                    getattr(slot, "is_available", None),
                )
                self._mark_slot_unknown(slot)

                if slot is not None:
                    current_state = (slot.status, slot.is_available)
                    if current_state != previous_state:
                        changed_slots[slot.id] = {
                            "slot_id": slot.id,
                            "slot_number": slot.slot_number,
                            "status": slot.status,
                            "is_available": slot.is_available,
                            "event_type": "sensor_offline",
                            "sensor_id": sensor.id,
                        }

            if sensor.parking_lot_id is not None:
                incident_service.detect_sensor_incident(
                    db=db,
                    parking_lot_id=sensor.parking_lot_id,
                    event_type="sensor_offline",
                    sensor_id=sensor.id,
                )

        db.commit()

        for update in changed_slots.values():
            publish_parking_update(update)

        return len(stale_sensors)

    def get_sensor(
        self,
        db: Session,
        sensor_id: int,
    ):
        return db.get(Sensor, sensor_id)


sensor_service = SensorService()
