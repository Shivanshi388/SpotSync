
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.services.payment_service import create_payment_order


def test_create_payment_order_rejects_missing_booking():
    db = MagicMock()
    db.get.return_value = None

    with pytest.raises(ValueError, match="Booking not found"):
        create_payment_order(
            db=db,
            booking_id=999,
            user_id=1,
            amount=Decimal("50.00"),
        )

    db.commit.assert_not_called()


def test_create_payment_order_rejects_wrong_owner():
    db = MagicMock()
    booking = MagicMock()
    booking.user_id = 2
    db.get.return_value = booking

    with pytest.raises(ValueError, match="cannot pay for this booking"):
        create_payment_order(
            db=db,
            booking_id=1,
            user_id=1,
            amount=Decimal("50.00"),
        )

    db.commit.assert_not_called()


def test_create_payment_order_rejects_cancelled_booking():
    db = MagicMock()
    booking = MagicMock()
    booking.user_id = 1
    booking.status = "cancelled"
    db.get.return_value = booking

    with pytest.raises(ValueError, match="Cancelled bookings"):
        create_payment_order(
            db=db,
            booking_id=1,
            user_id=1,
            amount=Decimal("50.00"),
        )

    db.commit.assert_not_called()


def test_create_payment_order_rejects_wrong_amount():
    db = MagicMock()
    booking = MagicMock()
    booking.user_id = 1
    booking.status = "pending"
    booking.total_amount = Decimal("100.00")
    db.get.return_value = booking

    with pytest.raises(ValueError, match="amount does not match"):
        create_payment_order(
            db=db,
            booking_id=1,
            user_id=1,
            amount=Decimal("50.00"),
        )

    db.commit.assert_not_called()


def test_create_payment_order_rejects_non_inr_currency():
    db = MagicMock()
    booking = MagicMock()
    booking.user_id = 1
    booking.status = "pending"
    booking.total_amount = Decimal("50.00")
    db.get.return_value = booking

    with pytest.raises(ValueError, match="Only INR"):
        create_payment_order(
            db=db,
            booking_id=1,
            user_id=1,
            amount=Decimal("50.00"),
            currency="USD",
        )

    db.commit.assert_not_called()
