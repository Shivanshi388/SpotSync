import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.parking_session import ParkingSession
from app.repositories.ticket_repository import (
    create_ticket_token,
    get_token_for_update,
    revoke_unused_session_tokens,
)


TOKEN_EXPIRY_MINUTES = 720


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_session_ticket(
    db: Session,
    *,
    session_id: int,
    user_id: int,
):
    session = db.get(ParkingSession, session_id)

    if session is None or session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking session not found",
        )

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket can only be generated for an active session",
        )

    now = datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

    try:
        revoke_unused_session_tokens(db, session_id, now)
        create_ticket_token(
            db,
            session_id,
            _hash_token(raw_token),
            expires_at,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "token": raw_token,
        "expires_at": expires_at,
        "message": "Show this ticket at the parking exit. It can be used once.",
    }


def validate_session_ticket(db: Session, raw_token: str):
    if not raw_token or len(raw_token) > 256:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticket",
        )

    token_hash = _hash_token(raw_token)
    now = datetime.now(timezone.utc)

    token = get_token_for_update(db, token_hash)

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if token.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket has been revoked",
        )

    if token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket has already been used",
        )

    if token.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Ticket has expired",
        )

    session = db.get(ParkingSession, token.parking_session_id)

    if session is None or session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking session is not active",
        )

    return {
        "valid": True,
        "session_id": session.id,
        "parking_lot_id": session.parking_lot_id,
        "parking_slot_id": session.parking_slot_id,
        "vehicle_id": session.vehicle_id,
        "message": "Ticket validated successfully.",
    }


def exit_session_with_ticket(db: Session, raw_token: str):
    """Complete a parking session using a staff-scanned QR token."""
    if not raw_token or len(raw_token) > 256:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticket",
        )

    now = datetime.now(timezone.utc)
    token = get_token_for_update(db, _hash_token(raw_token))

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if token.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket has been revoked",
        )

    if token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket has already been used",
        )

    if token.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Ticket has expired",
        )

    session = (
        db.query(ParkingSession)
        .filter(ParkingSession.id == token.parking_session_id)
        .with_for_update()
        .first()
    )

    if session is None or session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking session is not active",
        )

    # Token consumption and session completion happen in one transaction.
    token.used_at = now
    session.status = "COMPLETED"
    session.ended_at = now

    try:
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "valid": True,
        "session_id": session.id,
        "parking_lot_id": session.parking_lot_id,
        "parking_slot_id": session.parking_slot_id,
        "vehicle_id": session.vehicle_id,
        "status": session.status,
        "ended_at": session.ended_at,
        "message": "Ticket accepted. Parking exit completed.",
    }
