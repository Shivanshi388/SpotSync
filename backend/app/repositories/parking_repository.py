from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.parking_lot import ParkingLot
from app.models.parking_slot import ParkingSlot


def get_active_parking_lots(db: Session):
    return db.scalars(
        select(ParkingLot)
        .where(ParkingLot.is_active.is_(True))
        .order_by(ParkingLot.id)
    ).all()


def get_parking_lot_by_id(
    db: Session,
    parking_lot_id: int,
):
    return db.scalar(
        select(ParkingLot).where(
            ParkingLot.id == parking_lot_id,
            ParkingLot.is_active.is_(True),
        )
    )


def get_parking_slots(
    db: Session,
    parking_lot_id: int,
):
    return db.scalars(
        select(ParkingSlot)
        .where(ParkingSlot.parking_lot_id == parking_lot_id)
        .order_by(ParkingSlot.id)
    ).all()


def get_available_parking_slots(
    db: Session,
    parking_lot_id: int,
):
    return db.scalars(
        select(ParkingSlot)
        .where(
            ParkingSlot.parking_lot_id == parking_lot_id,
            ParkingSlot.is_available.is_(True),
        )
        .order_by(ParkingSlot.id)
    ).all()


def get_parking_occupancy(
    db: Session,
    parking_lot_id: int,
):
    slots = get_parking_slots(db, parking_lot_id)

    total_slots = len(slots)

    if total_slots == 0:
        return {
            "total_slots": 0,
            "occupied_slots": 0,
            "available_slots": 0,
            "occupancy_rate": 0.0,
        }

    available_slots = sum(
        1 for slot in slots
        if slot.is_available
    )

    occupied_slots = total_slots - available_slots

    occupancy_rate = occupied_slots / total_slots

    return {
        "total_slots": total_slots,
        "occupied_slots": occupied_slots,
        "available_slots": available_slots,
        "occupancy_rate": round(occupancy_rate, 4),
    }
