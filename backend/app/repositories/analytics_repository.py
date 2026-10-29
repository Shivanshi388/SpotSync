from sqlalchemy import select, func, Integer
from sqlalchemy.orm import Session

from app.models.parking_slot import ParkingSlot
from app.models.prediction import Prediction
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.refund import Refund

def get_prediction_statistics(db: Session, parking_lot_id: int):
    statement = select(
        func.count(Prediction.id),
        func.avg(Prediction.predicted_occupancy),
        func.max(Prediction.predicted_occupancy),
        func.min(Prediction.predicted_occupancy),
    ).where(
        Prediction.parking_lot_id == parking_lot_id
    )

    count, average, maximum, minimum = db.execute(statement).one()

    return {
        "prediction_count": count or 0,
        "average_occupancy": round(float(average or 0), 4),
        "maximum_occupancy": round(float(maximum or 0), 4),
        "minimum_occupancy": round(float(minimum or 0), 4),
    }


def get_slot_statistics(db: Session, parking_lot_id: int):
    statement = select(
        func.count(ParkingSlot.id),
        func.sum(
            func.cast(ParkingSlot.is_available, Integer)
        ),
    ).where(
        ParkingSlot.parking_lot_id == parking_lot_id
    )

    total, available = db.execute(statement).one()

    total = total or 0
    available = available or 0
    occupied = total - available

    return {
        "total_slots": total,
        "available_slots": available,
        "occupied_slots": occupied,
    }

def get_booking_statistics(db: Session, parking_lot_id: int):
    statement = (
        select(Booking.status, func.count(Booking.id))
        .join(
            ParkingSlot,
            Booking.parking_slot_id == ParkingSlot.id,
        )
        .where(ParkingSlot.parking_lot_id == parking_lot_id)
        .group_by(Booking.status)
    )

    rows = db.execute(statement).all()
    status_counts = {
        status: count for status, count in rows
    }

    return {
        "total_bookings": sum(status_counts.values()),
        "status_counts": status_counts,
    }


def get_revenue_statistics(db: Session, parking_lot_id: int):
    payment_statement = (
        select(
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.amount), 0),
        )
        .join(Booking, Payment.booking_id == Booking.id)
        .join(
            ParkingSlot,
            Booking.parking_slot_id == ParkingSlot.id,
        )
        .where(
            ParkingSlot.parking_lot_id == parking_lot_id,
            Payment.status.in_(["paid", "partially_refunded", "refunded"]),
        )
    )

    payment_count, gross_revenue = db.execute(
        payment_statement
    ).one()

    refund_statement = (
        select(func.coalesce(func.sum(Refund.amount), 0))
        .join(Payment, Refund.payment_id == Payment.id)
        .join(Booking, Payment.booking_id == Booking.id)
        .join(
            ParkingSlot,
            Booking.parking_slot_id == ParkingSlot.id,
        )
        .where(
            ParkingSlot.parking_lot_id == parking_lot_id,
            Refund.status == "processed",
        )
    )

    processed_refunds = db.execute(refund_statement).scalar_one()

    gross_revenue = float(gross_revenue or 0)
    processed_refunds = float(processed_refunds or 0)

    return {
        "successful_payment_count": payment_count or 0,
        "gross_revenue": round(gross_revenue, 2),
        "processed_refunds": round(processed_refunds, 2),
        "net_revenue": round(
            gross_revenue - processed_refunds, 2
        ),
        "currency": "INR",
    }
