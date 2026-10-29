from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    VehicleCreateRequest,
    VehicleListResponse,
    VehicleResponse,
)


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)


@router.post(
    "",
    response_model=VehicleResponse,
)
def create_vehicle(
    request: VehicleCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    vehicle = Vehicle(
        user_id=current_user.id,
        vehicle_number=request.registration_number,
        vehicle_type=request.vehicle_type,
    )

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle


@router.get(
    "",
    response_model=VehicleListResponse,
)
def get_vehicles(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.user_id == current_user.id)
        .order_by(Vehicle.id)
        .all()
    )

    return {"vehicles": vehicles}
