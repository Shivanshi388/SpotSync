from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.incident import IncidentListResponse, IncidentResponse
from app.services.incident_service import incident_service


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


@router.get(
    "/parking/{parking_lot_id}",
    response_model=IncidentListResponse,
)
def get_incidents(
    parking_lot_id: int,
    db: Session = Depends(get_db),
):
    incidents = incident_service.get_open(
        db=db,
        parking_lot_id=parking_lot_id,
    )

    return {
        "incidents": [
            {
                "id": incident.id,
                "parking_lot_id": incident.parking_lot_id,
                "incident_type": incident.incident_type,
                "severity": incident.severity,
                "status": incident.status,
                "description": incident.description,
            }
            for incident in incidents
        ]
    }


@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
)
def resolve_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):
    incident = incident_service.resolve(
        db=db,
        incident_id=incident_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident
