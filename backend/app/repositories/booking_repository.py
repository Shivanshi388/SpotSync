from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking


def create_booking(
    db: Session,
    user_id: int,
    vehicle_id: int,
    parking_slot_id: int,
    start_time: datetime,
    end_time: datetime,
    total_amount,
):
    booking = Booking(
        user_id=user_id,
        vehicle_id=vehicle_id,
        parking_slot_id=parking_slot_id,
        start_time=start_time,
        end_time=end_time,
        total_amount=total_amount,
    )

    db.add(booking)
    db.flush()
    db.refresh(booking)

    return booking


def get_booking_by_id(
    db: Session,
    booking_id: int,
):
    return db.scalar(
        select(Booking).where(Booking.id == booking_id)
    )


def get_user_bookings(
    db: Session,
    user_id: int,
):
    return db.scalars(
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(Booking.created_at.desc())
    ).all()


def get_overlapping_booking(
    db: Session,
    parking_slot_id: int,
    start_time: datetime,
    end_time: datetime,
):
    return db.scalar(
        select(Booking).where(
            Booking.parking_slot_id == parking_slot_id,
            Booking.status.in_(["pending", "confirmed"]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    )


def update_booking_status(
    db: Session,
    booking: Booking,
    status: str,
):
    booking.status = status
    db.flush()
    db.refresh(booking)

    return booking
