from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident


def create_incident(
    db: Session,
    parking_lot_id: int,
    incident_type: str,
    severity: str,
    description: str,
    sensor_id: int | None = None,
):
    if sensor_id is not None:
        existing = db.scalar(
            select(Incident).where(
                Incident.sensor_id == sensor_id,
                Incident.incident_type == incident_type,
                Incident.status == "open",
            )
        )

        if existing is not None:
            return existing

    incident = Incident(
        parking_lot_id=parking_lot_id,
        sensor_id=sensor_id,
        incident_type=incident_type,
        severity=severity,
        description=description,
    )

    db.add(incident)
    db.flush()

    return incident


def auto_resolve_sensor_incidents(
    db: Session,
    sensor_id: int,
    incident_types=("sensor_fault", "sensor_failure"),
):
    """Close open fault/offline incidents for a sensor that is reporting again."""
    open_incidents = db.scalars(
        select(Incident).where(
            Incident.sensor_id == sensor_id,
            Incident.status == "open",
            Incident.incident_type.in_(incident_types),
        )
    ).all()

    for incident in open_incidents:
        incident.status = "resolved"

    return len(open_incidents)


def get_open_incidents(
    db: Session,
    parking_lot_id: int | None = None,
):
    statement = select(Incident).where(
        Incident.status == "open"
    )

    if parking_lot_id is not None:
        statement = statement.where(
            Incident.parking_lot_id == parking_lot_id
        )

    return db.scalars(
        statement.order_by(Incident.id.desc())
    ).all()


def resolve_incident(
    db: Session,
    incident_id: int,
):
    incident = db.get(Incident, incident_id)

    if incident is None:
        return None

    incident.status = "resolved"

    db.commit()
    db.refresh(incident)

    return incident
