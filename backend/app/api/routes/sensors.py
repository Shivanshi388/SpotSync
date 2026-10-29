from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.sensor import (
    SensorEventRequest,
    SensorEventResponse,
)
from app.services.sensor_service import sensor_service


router = APIRouter(
    prefix="/sensors",
    tags=["Sensors"],
)


@router.post(
    "/events",
    response_model=SensorEventResponse,
)
def process_sensor_event(
    request: SensorEventRequest,
    db: Session = Depends(get_db),
):
    event = sensor_service.process_event(
        db=db,
        sensor_id=request.sensor_id,
        event_type=request.event_type,
        value=request.value,
        payload=request.payload,
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Sensor not found",
        )

    return {
        "id": event.id,
        "sensor_id": event.sensor_id,
        "event_type": event.event_type,
        "value": event.value,
        "payload": event.payload,
    }
