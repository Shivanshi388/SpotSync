import hashlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services import ticket_service


def test_ticket_generation_stores_hash_not_raw_token(monkeypatch):
    db = MagicMock()
    db.get.return_value = SimpleNamespace(user_id=1, status="ACTIVE")

    created = {}
    monkeypatch.setattr(
        ticket_service,
        "revoke_unused_session_tokens",
        lambda *a: None,
    )

    def fake_create(db, session_id, token_hash, expires_at):
        created.update(
            session_id=session_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

    monkeypatch.setattr(ticket_service, "create_ticket_token", fake_create)

    result = ticket_service.generate_session_ticket(
        db, session_id=10, user_id=1
    )

    assert result["token"]
    assert created["session_id"] == 10
    assert created["token_hash"] == hashlib.sha256(
        result["token"].encode()
    ).hexdigest()
    assert created["token_hash"] != result["token"]
    assert result["expires_at"] > datetime.now(timezone.utc)
    db.commit.assert_called_once()


def test_ticket_generation_rejects_another_users_session():
    db = MagicMock()
    db.get.return_value = SimpleNamespace(user_id=2, status="ACTIVE")

    with pytest.raises(HTTPException) as exc:
        ticket_service.generate_session_ticket(
            db, session_id=10, user_id=1
        )

    assert exc.value.status_code == 404


def test_ticket_generation_rejects_inactive_session():
    db = MagicMock()
    db.get.return_value = SimpleNamespace(user_id=1, status="COMPLETED")

    with pytest.raises(HTTPException) as exc:
        ticket_service.generate_session_ticket(
            db, session_id=10, user_id=1
        )

    assert exc.value.status_code == 409


def test_ticket_validation_succeeds_without_consuming_token(monkeypatch):
    raw_token = "sample-secure-ticket-token-123456"
    token = SimpleNamespace(
        parking_session_id=10,
        revoked_at=None,
        used_at=None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    session = SimpleNamespace(
        id=10,
        status="ACTIVE",
        parking_lot_id=20,
        parking_slot_id=30,
        vehicle_id=40,
    )
    db = MagicMock()
    db.get.return_value = session

    monkeypatch.setattr(
        ticket_service,
        "get_token_for_update",
        lambda db, token_hash: token,
    )

    result = ticket_service.validate_session_ticket(db, raw_token)

    assert result["valid"] is True
    assert result["session_id"] == 10
    assert token.used_at is None
    db.commit.assert_not_called()


@pytest.mark.parametrize(
    ("field", "value", "expected_status"),
    [
        ("revoked_at", datetime.now(timezone.utc), 409),
        ("used_at", datetime.now(timezone.utc), 409),
        ("expires_at", datetime.now(timezone.utc) - timedelta(minutes=1), 410),
    ],
)
def test_ticket_validation_rejects_unusable_token(
    monkeypatch, field, value, expected_status
):
    token = SimpleNamespace(
        parking_session_id=10,
        revoked_at=None,
        used_at=None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    setattr(token, field, value)

    db = MagicMock()
    monkeypatch.setattr(
        ticket_service,
        "get_token_for_update",
        lambda *a: token,
    )

    with pytest.raises(HTTPException) as exc:
        ticket_service.validate_session_ticket(
            db, "sample-secure-ticket-token-123456"
        )

    assert exc.value.status_code == expected_status
    db.commit.assert_not_called()


def test_ticket_validation_rejects_unknown_token(monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(
        ticket_service,
        "get_token_for_update",
        lambda *a: None,
    )

    with pytest.raises(HTTPException) as exc:
        ticket_service.validate_session_ticket(
            db, "sample-secure-ticket-token-123456"
        )

    assert exc.value.status_code == 404


def test_ticket_validation_rejects_inactive_session(monkeypatch):
    token = SimpleNamespace(
        parking_session_id=10,
        revoked_at=None,
        used_at=None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db = MagicMock()
    db.get.return_value = SimpleNamespace(status="COMPLETED")

    monkeypatch.setattr(
        ticket_service,
        "get_token_for_update",
        lambda *a: token,
    )

    with pytest.raises(HTTPException) as exc:
        ticket_service.validate_session_ticket(
            db, "sample-secure-ticket-token-123456"
        )

    assert exc.value.status_code == 409
    db.commit.assert_not_called()

def test_exit_ticket_completes_active_session_once(monkeypatch):
    raw_token = "sample-secure-ticket-token-123456"
    token = SimpleNamespace(
        parking_session_id=10,
        revoked_at=None,
        used_at=None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    session = SimpleNamespace(
        id=10,
        status="ACTIVE",
        parking_lot_id=20,
        parking_slot_id=30,
        vehicle_id=40,
        ended_at=None,
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = session

    monkeypatch.setattr(
        ticket_service,
        "get_token_for_update",
        lambda *args: token,
    )

    result = ticket_service.exit_session_with_ticket(db, raw_token)

    assert result["success"] is True
    assert result["status"] == "COMPLETED"
    assert token.used_at is not None
    assert session.ended_at is not None
    db.commit.assert_called_once()
