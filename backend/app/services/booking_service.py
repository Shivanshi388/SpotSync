from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.booking import Booking
from app.models.payment import Payment
from app.repositories.booking_repository import (
    create_booking,
    get_booking_by_id,
    get_overlapping_booking,
    get_user_bookings,
    update_booking_status,
)
from app.repositories.parking_repository import get_parking_lot_by_id
from app.models.parking_slot import ParkingSlot
from app.models.vehicle import Vehicle


def create_user_booking(
    db: Session,
    user_id: int,
    vehicle_id: int,
    parking_slot_id: int,
    start_time,
    end_time,
):
    normalized_start = (
        start_time.replace(tzinfo=timezone.utc)
        if start_time.tzinfo is None else start_time
    )
    normalized_end = (
        end_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None else end_time
    )
    if normalized_start >= normalized_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    now = datetime.now(timezone.utc)
    if normalized_start < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot start in the past",
        )

    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    slot = db.get(ParkingSlot, parking_slot_id)

    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking slot not found",
        )

    if not slot.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parking slot is not available",
        )

    parking_lot = get_parking_lot_by_id(db, slot.parking_lot_id)

    if not parking_lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking lot not found",
        )

    overlapping_booking = get_overlapping_booking(
        db,
        parking_slot_id,
        normalized_start,
        normalized_end,
    )

    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking slot is already booked for this time",
        )

    duration_hours = Decimal(
        str((normalized_end - normalized_start).total_seconds() / 3600)
    )
    # Match the booking screen's existing price options (parking fee + ₹10 service fee).
    # The server remains authoritative; clients cannot choose an amount in the request.
    parking_rates = {
        Decimal("2"): Decimal("60.00"),
        Decimal("4"): Decimal("120.00"),
        Decimal("24"): Decimal("250.00"),
    }
    whole_hours = duration_hours.quantize(Decimal("1"))
    if duration_hours != whole_hours or duration_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking duration must be a positive whole number of hours",
        )
    parking_fee = parking_rates.get(whole_hours, whole_hours * Decimal("30.00"))
    service_fee = Decimal("10.00")
    total_amount = parking_fee + service_fee

    booking = create_booking(
        db=db,
        user_id=user_id,
        vehicle_id=vehicle_id,
        parking_slot_id=parking_slot_id,
        start_time=normalized_start,
        end_time=normalized_end,
        total_amount=total_amount,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This slot conflicts with another reservation. Please choose another time or slot.",
        ) from exc
    db.refresh(booking)

    return booking


def get_booking_for_user(
    db: Session,
    booking_id: int,
    user_id: int,
):
    booking = get_booking_by_id(db, booking_id)

    if not booking or booking.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    return booking


def list_user_bookings(
    db: Session,
    user_id: int,
):
    return get_user_bookings(db, user_id)


def cancel_user_booking(
    db: Session,
    booking_id: int,
    user_id: int,
):
    booking = get_booking_for_user(db, booking_id, user_id)

    if booking.status in ["cancelled", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot be cancelled",
        )

    captured_payment = (
        db.query(Payment)
        .filter(
            Payment.booking_id == booking.id,
            Payment.status.in_(["paid", "partially_refunded", "refunded"]),
        )
        .first()
    )
    if captured_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking has a captured payment. Use the refund workflow before cancellation.",
        )

    booking = update_booking_status(
        db,
        booking,
        "cancelled",
    )

    db.commit()
    db.refresh(booking)

    return booking

