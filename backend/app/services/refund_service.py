from decimal import Decimal, ROUND_HALF_UP

import razorpay
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payment import Payment
from app.models.refund import Refund


def _assert_mock_payments_allowed() -> None:
    if (
        settings.app_env.strip().lower() != "development"
        or not settings.allow_mock_payments
    ):
        raise ValueError(
            "Mock refunds are disabled. For local development only, set "
            "APP_ENV=development and ALLOW_MOCK_PAYMENTS=true."
        )


def create_refund(
    db: Session,
    payment_id: int,
    user_id: int,
    amount: Decimal,
    reason: str | None = None,
):
    # Lock the payment row so concurrent refund requests reserve the balance serially.
    amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .with_for_update()
        .first()
    )
    if not payment:
        raise ValueError("Payment not found")
    if payment.user_id != user_id:
        raise ValueError("You cannot refund this payment")
    if payment.status not in ("paid", "partially_refunded"):
        raise ValueError("Only paid or partially refunded payments can be refunded")
    if amount <= 0:
        raise ValueError("Refund amount must be greater than zero")
    if not payment.razorpay_payment_id:
        raise ValueError("Payment has no provider payment ID")

    mode = settings.payment_mode.strip().lower()
    if mode == "mock":
        _assert_mock_payments_allowed()
    elif mode != "razorpay":
        raise ValueError("Invalid payment mode configuration")

    previous_refunds = (
        db.query(Refund).filter(Refund.payment_id == payment.id).all()
    )
    # Reserve pending refunds too, so parallel/repeated requests cannot exceed
    # the payment amount. Simulated refunds are for local testing only.
    reserved_statuses = {"pending", "processed", "simulated"}
    already_reserved = sum(
        (refund.amount for refund in previous_refunds if refund.status in reserved_statuses),
        Decimal("0"),
    )
    if already_reserved + amount > payment.amount:
        raise ValueError("Refund amount exceeds remaining payment amount")

    if mode == "mock":
        refund_id = f"mock_refund_{payment.id}_{len(previous_refunds) + 1}"
        refund_status = "simulated"
    else:
        try:
            client = razorpay.Client(
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
            )
            payload = {"amount": int(amount * 100)}
            if reason:
                payload["notes"] = {"reason": reason[:256]}
            provider_refund = client.payment.refund(payment.razorpay_payment_id, payload)
            refund_id = provider_refund["id"]
            provider_status = provider_refund.get("status", "pending")
            refund_status = "processed" if provider_status == "processed" else "pending"
        except Exception as exc:
            raise ValueError("Razorpay refund request failed") from exc

    refund = Refund(
        payment_id=payment.id,
        amount=amount,
        status=refund_status,
        razorpay_refund_id=refund_id,
        reason=reason,
    )
    db.add(refund)

    if refund_status == "processed":
        processed_total = sum(
            (item.amount for item in previous_refunds if item.status == "processed"),
            Decimal("0"),
        ) + amount
        payment.status = "refunded" if processed_total == payment.amount else "partially_refunded"

    db.commit()
    db.refresh(refund)
    return refund
