from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.payment import Payment
from app.services import booking_service


class FakeQuery:
    def __init__(self, payment):
        self.payment = payment

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        return self.payment


class FakeDB:
    def __init__(self, payment):
        self.payment = payment
        self.commits = 0
        self.rollbacks = 0

    def query(self, model):
        assert model is Payment
        return FakeQuery(self.payment)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def refresh(self, obj):
        return None


def make_booking():
    return SimpleNamespace(id=71, user_id=5, status="confirmed")


def make_payment(*, order_id="mock_order_71_test", payment_id="mock_payment_test", status="paid"):
    return SimpleNamespace(
        id=91,
        booking_id=71,
        status=status,
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
    )


def set_demo_settings(monkeypatch, *, mode="mock", env="development", allowed=True):
    monkeypatch.setattr(booking_service.settings, "payment_mode", mode)
    monkeypatch.setattr(booking_service.settings, "app_env", env)
    monkeypatch.setattr(booking_service.settings, "allow_mock_payments", allowed)


def patch_booking(monkeypatch, booking):
    monkeypatch.setattr(booking_service, "get_booking_for_user", lambda *args, **kwargs: booking)

    def update(_db, current_booking, new_status):
        current_booking.status = new_status
        return current_booking

    monkeypatch.setattr(booking_service, "update_booking_status", update)


def test_demo_paid_mock_booking_is_cancelled_and_marked_refunded(monkeypatch):
    set_demo_settings(monkeypatch)
    booking = make_booking()
    payment = make_payment()
    db = FakeDB(payment)
    patch_booking(monkeypatch, booking)

    result, simulated = booking_service.cancel_user_booking(db, booking_id=71, user_id=5)

    assert result.status == "cancelled"
    assert payment.status == "refunded"
    assert simulated is True
    assert db.commits == 1


def test_real_paid_payment_is_not_auto_refunded_or_cancelled(monkeypatch):
    set_demo_settings(monkeypatch, mode="razorpay", env="development", allowed=True)
    booking = make_booking()
    payment = make_payment(order_id="order_real_abc", payment_id="pay_real_abc")
    db = FakeDB(payment)
    patch_booking(monkeypatch, booking)

    with pytest.raises(HTTPException) as caught:
        booking_service.cancel_user_booking(db, booking_id=71, user_id=5)

    assert caught.value.status_code == 409
    assert booking.status == "confirmed"
    assert payment.status == "paid"
    assert db.commits == 0


def test_mock_mode_does_not_auto_refund_a_non_mock_payment(monkeypatch):
    set_demo_settings(monkeypatch)
    booking = make_booking()
    payment = make_payment(order_id="order_real_abc", payment_id="pay_real_abc")
    db = FakeDB(payment)
    patch_booking(monkeypatch, booking)

    with pytest.raises(HTTPException):
        booking_service.cancel_user_booking(db, booking_id=71, user_id=5)

    assert booking.status == "confirmed"
    assert payment.status == "paid"
    assert db.commits == 0


def test_unpaid_booking_can_be_cancelled_without_refund(monkeypatch):
    set_demo_settings(monkeypatch)
    booking = make_booking()
    db = FakeDB(payment=None)
    patch_booking(monkeypatch, booking)

    result, simulated = booking_service.cancel_user_booking(db, booking_id=71, user_id=5)

    assert result.status == "cancelled"
    assert simulated is False
    assert db.commits == 1
