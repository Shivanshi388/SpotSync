from unittest.mock import MagicMock, patch

from app.services.sensor_service import update_slot_from_sensor


def test_invalid_sensor_status_returns_false():
    db = MagicMock()

    result = update_slot_from_sensor(
        db=db,
        slot_id="A1",
        status="broken",
    )

    assert result is False


def test_unknown_slot_returns_false():
    db = MagicMock()

    db.scalar.return_value = None

    result = update_slot_from_sensor(
        db=db,
        slot_id="UNKNOWN",
        status="occupied",
    )

    assert result is False


def test_available_slot_updates_database():
    db = MagicMock()

    slot = MagicMock()
    db.scalar.return_value = slot

    result = update_slot_from_sensor(
        db=db,
        slot_id="A1",
        status="available",
    )

    assert result is True
    assert slot.is_available is True
    db.commit.assert_called_once()


def test_occupied_slot_updates_database():
    db = MagicMock()

    slot = MagicMock()
    db.scalar.return_value = slot

    result = update_slot_from_sensor(
        db=db,
        slot_id="A1",
        status="occupied",
    )

    assert result is True
    assert slot.is_available is False
    db.commit.assert_called_once()
