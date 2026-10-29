from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.services.payment_service import create_payment_order, verify_payment
from app.services.refund_service import create_refund


router = APIRouter(prefix="/payments", tags=["Payments"])


class CreatePaymentRequest(BaseModel):
    booking_id: int
    amount: Decimal
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    payment_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RefundRequest(BaseModel):
    payment_id: int
    amount: Decimal
    reason: str | None = None


@router.post("/create-order")
def create_order(
    request: CreatePaymentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        payment, order = create_payment_order(
            db=db,
            booking_id=request.booking_id,
            user_id=current_user.id,
            amount=request.amount,
            currency=request.currency,
        )

        return {
            "payment_id": payment.id,
            "razorpay_order_id": order["id"],
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "amount_paise": order["amount"],
            "razorpay_key_id": settings.razorpay_key_id if settings.payment_mode.lower() == "razorpay" else None,
            "mock_mode": settings.payment_mode.lower() == "mock",
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/verify")
def verify(
    request: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        payment = verify_payment(
            db=db,
            payment_id=request.payment_id,
            user_id=current_user.id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
        )

        return {
            "payment_id": payment.id,
            "status": payment.status,
            "razorpay_payment_id": payment.razorpay_payment_id,
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/refund")
def refund(
    request: RefundRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        refund_record = create_refund(
            db=db,
            payment_id=request.payment_id,
            user_id=current_user.id,
            amount=request.amount,
            reason=request.reason,
        )

        return {
            "refund_id": refund_record.id,
            "payment_id": refund_record.payment_id,
            "amount": refund_record.amount,
            "status": refund_record.status,
            "razorpay_refund_id": refund_record.razorpay_refund_id,
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
