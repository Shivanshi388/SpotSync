from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.booking import Booking
from app.models.parking_lot import ParkingLot
from app.models.parking_slot import ParkingSlot
from app.services.availability_service import (
    get_available_slots,
    is_slot_available,
)


def future_range():
    start = datetime.now(timezone.utc) + timedelta(days=1)
    return start, start + timedelta(hours=2)


def test_invalid_time_range_raises_before_database_access():
    db = MagicMock()
    start = datetime.now(timezone.utc)

    with pytest.raises(ValueError, match="End time must be after start time"):
        is_slot_available(db, 1, start, start)

    db.get.assert_not_called()


def test_missing_slot_is_unavailable():
    db = MagicMock()
    db.get.return_value = None
    start, end = future_range()

    assert is_slot_available(db, 1, start, end) is False


def test_unavailable_slot_is_rejected():
    db = MagicMock()
    slot = MagicMock()
    slot.is_available = False
    db.get.return_value = slot
    start, end = future_range()

    assert is_slot_available(db, 1, start, end) is False
    assert db.get.call_count == 1


def test_inactive_parking_lot_is_rejected():
    db = MagicMock()
    slot = MagicMock()
    slot.is_available = True
    slot.parking_lot_id = 10
    lot = MagicMock()
    lot.is_active = False
    db.get.side_effect = [slot, lot]
    start, end = future_range()

    assert is_slot_available(db, 1, start, end) is False


def test_available_slot_with_no_overlap_is_accepted():
    db = MagicMock()
    slot = MagicMock()
    slot.is_available = True
    slot.parking_lot_id = 10
    lot = MagicMock()
    lot.is_active = True
    db.get.side_effect = [slot, lot]
    db.query.return_value.filter.return_value.first.return_value = None
    start, end = future_range()

    assert is_slot_available(db, 1, start, end) is True

    filters = db.query.return_value.filter.call_args.args
    assert any(
        getattr(condition, "left", None) is not None
        for condition in filters
    )


def test_available_slots_rejects_invalid_time_range():
    db = MagicMock()
    start = datetime.now(timezone.utc)

    with pytest.raises(ValueError, match="End time must be after start time"):
        get_available_slots(db, 1, start, start)

    db.get.assert_not_called()
