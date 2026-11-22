from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.parking_lot import ParkingLot
from app.models.vehicle import Vehicle
from app.services.notification_service import notification_service
from app.repositories.session_repository import (
    create_session,
    get_active_session_for_slot,
    get_session_for_user_for_update,
    get_slot_for_update,
    list_sessions_for_user,
)


def start_parking_session(
    db: Session,
    *,
    user_id: int,
    parking_slot_id: int,
    vehicle_id: int,
    booking_id: int | None = None,
):
    now = datetime.now(timezone.utc)

    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    slot = get_slot_for_update(db, parking_slot_id)
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking slot not found",
        )

    lot = db.get(ParkingLot, slot.parking_lot_id)
    if lot is None or not lot.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking lot is not active",
        )

    if get_active_session_for_slot(db, parking_slot_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This parking slot already has an active session",
        )

    if booking_id is not None:
        booking = db.get(Booking, booking_id)

        if booking is None or booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        if (
            booking.parking_slot_id != parking_slot_id
            or booking.vehicle_id != vehicle_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking, vehicle, and parking slot do not match",
            )

        if booking.status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only confirmed bookings can be used for entry",
            )

        if not (booking.start_time <= now < booking.end_time):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This booking is not currently active",
            )

        if slot.status not in {"AVAILABLE", "RESERVED"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Parking slot is currently {slot.status}",
            )

    else:
        if slot.status != "AVAILABLE" or not slot.is_available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Parking slot is not available for drive-in entry",
            )

        active_booking = db.scalar(
            select(Booking.id).where(
                Booking.parking_slot_id == parking_slot_id,
                Booking.start_time <= now,
                Booking.end_time > now,
                or_(
                    Booking.status == "confirmed",
                    and_(
                        Booking.status == "pending",
                        or_(
                            Booking.expires_at.is_(None),
                            Booking.expires_at > now,
                        ),
                    ),
                ),
            ).limit(1)
        )

        if active_booking is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This slot is reserved by an active booking",
            )

    try:
        session = create_session(
            db,
            parking_lot_id=slot.parking_lot_id,
            parking_slot_id=slot.id,
            user_id=user_id,
            vehicle_id=vehicle_id,
        )

        # Keep an active session's slot unavailable.
        slot.status = "OCCUPIED"
        slot.is_available = False
        db.commit()
        db.refresh(session)

        notification_service.create_safely(
            db,
            user_id,
            "Parking session started",
            f"Your parking session for slot {parking_slot_id} has started.",
            "success",
        )

        return session
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another active session already exists for this slot",
        ) from exc


def end_parking_session(
    db: Session,
    *,
    session_id: int,
    user_id: int,
):
    session = get_session_for_user_for_update(db, session_id, user_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking session not found",
        )

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This parking session is already closed",
        )

    session.status = "COMPLETED"
    session.ended_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(session)

        notification_service.create_safely(
            db,
            user_id,
            "Parking session completed",
            f"Your parking session #{session_id} has been completed.",
            "success",
        )

        return session
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not complete this parking session",
        ) from exc


def get_user_parking_sessions(db: Session, user_id: int):
    return list_sessions_for_user(db, user_id)
