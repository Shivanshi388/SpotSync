from sqlalchemy.orm import Session

from app.repositories.incident_repository import (
    create_incident,
    get_open_incidents,
    resolve_incident,
    auto_resolve_sensor_incidents,
)


class IncidentService:
    def detect_sensor_incident(
        self,
        db: Session,
        parking_lot_id: int,
        event_type: str,
        value=None,
        sensor_id: int | None = None,
    ):
        incident_type = None
        severity = "low"
        description = None

        if event_type == "sensor_offline":
            incident_type = "sensor_failure"
            severity = "high"
            description = "Parking sensor is offline."

        elif event_type == "fault":
            incident_type = "sensor_fault"
            severity = "high"
            description = "Parking sensor reported a fault."

        elif event_type == "blocked":
            incident_type = "blocked_slot"
            severity = "medium"
            description = "Parking slot appears to be blocked."

        elif event_type == "unexpected_occupancy":
            incident_type = "occupancy_anomaly"
            severity = "medium"
            description = "Sensor reported unexpected occupancy."

        if incident_type is None:
            return None

        return create_incident(
            db=db,
            parking_lot_id=parking_lot_id,
            incident_type=incident_type,
            severity=severity,
            description=description,
            sensor_id=sensor_id,
        )

    def auto_resolve_sensor_incidents(self, db: Session, sensor_id: int):
        return auto_resolve_sensor_incidents(db, sensor_id)

    def get_open(
        self,
        db: Session,
        parking_lot_id: int | None = None,
    ):
        return get_open_incidents(db, parking_lot_id)

    def resolve(
        self,
        db: Session,
        incident_id: int,
    ):
        return resolve_incident(db, incident_id)


incident_service = IncidentService()
