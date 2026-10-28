from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

import razorpay
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking
from app.models.payment import Payment

_CENT = Decimal("0.01")


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(_CENT, rounding=ROUND_HALF_UP)


def _assert_mock_payments_allowed() -> None:
    """Mock checkout is opt-in and never allowed outside development."""
    if (
        settings.app_env.strip().lower() != "development"
        or not settings.allow_mock_payments
    ):
        raise ValueError(
            "Mock payments are disabled. For local development only, set "
            "APP_ENV=development and ALLOW_MOCK_PAYMENTS=true."
        )


def _razorpay_client():
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise ValueError("Razorpay credentials are not configured")
    return razorpay.Client(
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
    )


def _order_payload(order_id: str, amount: Decimal, currency: str):
    return {
        "id": order_id,
        "amount": int(_money(amount) * 100),
        "currency": currency,
        "status": "created",
    }


def create_payment_order(
    db: Session,
    booking_id: int,
    user_id: int,
    amount: Decimal,
    currency: str = "INR",
):
    # Serialize payment-order creation for a booking on PostgreSQL.
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .with_for_update()
        .first()
    )
    if not booking:
        raise ValueError("Booking not found")
    if booking.user_id != user_id:
        raise ValueError("You cannot pay for this booking")
    if booking.status in ("cancelled", "completed", "confirmed"):
        raise ValueError("This booking is already confirmed or cannot be paid")
    if _money(amount) != _money(booking.total_amount):
        raise ValueError("Payment amount does not match booking amount")
    if currency.upper() != "INR":
        raise ValueError("Only INR payments are supported")

    mode = settings.payment_mode.strip().lower()
    if mode not in ("razorpay", "mock"):
        raise ValueError("Invalid payment mode configuration")
    if mode == "mock":
        _assert_mock_payments_allowed()

    # Reuse an existing unpaid order so refreshes/retries do not create
    # multiple provider orders for the same booking.
    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.booking_id == booking_id,
            Payment.status.in_(["created", "pending"]),
        )
        .order_by(Payment.id.desc())
        .first()
    )
    if existing_payment:
        existing_is_mock = (existing_payment.razorpay_order_id or "").startswith("mock_order_")
        if existing_is_mock != (mode == "mock"):
            raise ValueError(
                "An unpaid order exists for a different payment mode. Finish or expire "
                "that checkout before changing PAYMENT_MODE."
            )
        return existing_payment, _order_payload(
            existing_payment.razorpay_order_id,
            existing_payment.amount,
            existing_payment.currency,
        )

    already_paid = (
        db.query(Payment)
        .filter(Payment.booking_id == booking_id, Payment.status == "paid")
        .first()
    )
    if already_paid:
        raise ValueError("This booking has already been paid")

    safe_amount = _money(booking.total_amount)
    if mode == "mock":
        order_id = f"mock_order_{booking_id}_{user_id}_{uuid4().hex[:10]}"
    else:
        try:
            provider_order = _razorpay_client().order.create({
                "amount": int(safe_amount * 100),
                "currency": "INR",
                "receipt": f"booking_{booking_id}",
            })
            order_id = provider_order["id"]
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("Could not create Razorpay order") from exc

    payment = Payment(
        booking_id=booking_id,
        user_id=user_id,
        amount=safe_amount,
        currency="INR",
        status="created",
        razorpay_order_id=order_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment, _order_payload(order_id, payment.amount, payment.currency)


def verify_payment(
    db: Session,
    payment_id: int,
    user_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .with_for_update()
        .first()
    )
    if not payment:
        raise ValueError("Payment not found")
    if payment.user_id != user_id:
        raise ValueError("You cannot verify this payment")
    if payment.razorpay_order_id != razorpay_order_id:
        raise ValueError("Payment order ID does not match")

    if payment.status == "paid":
        # Provider retries are idempotent only for the same verified values.
        if (
            payment.razorpay_payment_id == razorpay_payment_id
            and payment.razorpay_signature == razorpay_signature
        ):
            return payment
        raise ValueError("This payment has already been verified")
    if payment.status not in ("created", "pending"):
        raise ValueError("This payment cannot be verified")
    if not razorpay_payment_id or not razorpay_signature:
        raise ValueError("Payment verification details are required")

    booking = db.get(Booking, payment.booking_id)
    if booking is None:
        raise ValueError("Booking not found for this payment")
    if booking.status in ("cancelled", "completed"):
        raise ValueError("This booking can no longer be confirmed")
    if booking.status == "confirmed":
        raise ValueError("This booking is already confirmed; no further payment is accepted")

    mode = settings.payment_mode.strip().lower()
    if mode == "mock":
        _assert_mock_payments_allowed()
        if not razorpay_order_id.startswith("mock_order_"):
            raise ValueError("Invalid mock order")
    elif mode == "razorpay":
        try:
            _razorpay_client().utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("Razorpay payment signature verification failed") from exc
    else:
        raise ValueError("Invalid payment mode configuration")

    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    payment.status = "paid"
    booking.status = "confirmed"
    db.commit()
    db.refresh(payment)
    return payment
