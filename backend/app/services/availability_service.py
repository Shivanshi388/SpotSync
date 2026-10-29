from datetime import datetime

from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.parking_lot import ParkingLot
from app.models.parking_slot import ParkingSlot


ACTIVE_BOOKING_STATUSES = ("pending", "confirmed")


def is_slot_available(
    db: Session,
    parking_slot_id: int,
    start_time: datetime,
    end_time: datetime,
) -> bool:
    """Return whether a slot has no overlapping active booking."""
    if start_time >= end_time:
        raise ValueError("End time must be after start time")

    slot = db.get(ParkingSlot, parking_slot_id)
    if slot is None or not slot.is_available:
        return False

    lot = db.get(ParkingLot, slot.parking_lot_id)
    if lot is None or not lot.is_active:
        return False

    overlap = (
        db.query(Booking.id)
        .filter(
            Booking.parking_slot_id == parking_slot_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
        .first()
    )

    return overlap is None


def get_available_slots(
    db: Session,
    parking_lot_id: int,
    start_time: datetime,
    end_time: datetime,
) -> list[ParkingSlot]:
    """Return available slots in an active parking lot for a time range."""
    if start_time >= end_time:
        raise ValueError("End time must be after start time")

    lot = db.get(ParkingLot, parking_lot_id)
    if lot is None or not lot.is_active:
        return []

    slots = (
        db.query(ParkingSlot)
        .filter(
            ParkingSlot.parking_lot_id == parking_lot_id,
            ParkingSlot.is_available.is_(True),
        )
        .order_by(ParkingSlot.id)
        .all()
    )

    available = []
    for slot in slots:
        overlap = (
            db.query(Booking.id)
            .filter(
                Booking.parking_slot_id == slot.id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
            .first()
        )
        if overlap is None:
            available.append(slot)

    return available
