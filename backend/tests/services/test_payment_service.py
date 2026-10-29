
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.services.payment_service import create_payment_order


def mock_booking_query(db, booking):
    query = db.query.return_value
    query.filter.return_value.with_for_update.return_value.first.return_value = booking


def test_create_payment_order_rejects_missing_booking():
    db = MagicMock()
    mock_booking_query(db, None)

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
    mock_booking_query(db, booking)

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
    mock_booking_query(db, booking)

    with pytest.raises(ValueError, match="already confirmed or cannot be paid"):
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
    mock_booking_query(db, booking)

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
    mock_booking_query(db, booking)

    with pytest.raises(ValueError, match="Only INR"):
        create_payment_order(
            db=db,
            booking_id=1,
            user_id=1,
            amount=Decimal("50.00"),
            currency="USD",
        )

    db.commit.assert_not_called()
