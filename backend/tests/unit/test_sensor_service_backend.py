from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.services.sensor_service import sensor_service


def disable_incident_calls(monkeypatch):
    monkeypatch.setattr(
        "app.services.sensor_service.incident_service.detect_sensor_incident",
        lambda **kwargs: None,
    )
    monkeypatch.setattr(
        "app.services.sensor_service.incident_service.auto_resolve_sensor_incidents",
        lambda db, sensor_id: 0,
    )

def test_stale_sensor_marks_assigned_slot_unknown(monkeypatch):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
    )
    slot = SimpleNamespace(id=20, slot_number="A1", status="AVAILABLE", is_available=True)

    db = MagicMock()
    db.scalars.return_value.all.return_value = [sensor]
    db.get.return_value = slot

    count = sensor_service.mark_stale_sensors_offline(db)

    assert count == 1
    assert sensor.is_online is False
    assert slot.status == "UNKNOWN"
    assert slot.is_available is False
    db.commit.assert_called_once()


@pytest.mark.parametrize("status", ["RESERVED"])
def test_stale_sensor_preserves_protected_slot_status(monkeypatch, status):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
    )
    slot = SimpleNamespace(status=status, is_available=False)

    db = MagicMock()
    db.scalars.return_value.all.return_value = [sensor]
    db.get.return_value = slot

    sensor_service.mark_stale_sensors_offline(db)

    assert slot.status == status


def test_direct_offline_event_marks_slot_unknown(monkeypatch):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
        last_seen_at=None,
    )
    slot = SimpleNamespace(status="AVAILABLE", is_available=True)

    db = MagicMock()
    db.get.side_effect = [sensor, slot]

    sensor_service.process_event(
        db=db,
        sensor_id=1,
        event_type="sensor_offline",
    )

    assert sensor.is_online is False
    assert slot.status == "UNKNOWN"
    assert slot.is_available is False
    db.commit.assert_called_once()


@pytest.mark.parametrize("status", ["RESERVED"])
def test_direct_offline_event_preserves_protected_status(
    monkeypatch, status
):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
        last_seen_at=None,
    )
    slot = SimpleNamespace(status=status, is_available=False)

    db = MagicMock()
    db.get.side_effect = [sensor, slot]

    sensor_service.process_event(
        db=db,
        sensor_id=1,
        event_type="sensor_offline",
    )

    assert slot.status == status


def test_stable_vacancy_preserves_active_session(monkeypatch):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
        last_seen_at=None,
    )
    slot = SimpleNamespace(
        id=20, status="OCCUPIED", is_available=False
    )
    session = SimpleNamespace(status="ACTIVE", ended_at=None)

    db = MagicMock()
    db.get.side_effect = [sensor, slot]
    db.scalars.return_value.all.return_value = [
        "available", "available", "available"
    ]

    monkeypatch.setattr(
        "app.services.sensor_service.get_active_session_for_slot_for_update",
        lambda *args: session,
    )

    sensor_service.process_event(
        db=db,
        sensor_id=1,
        event_type="available",
    )

    assert session.status == "ACTIVE"
    assert session.ended_at is None
    assert slot.status == "OCCUPIED"
    assert slot.is_available is False
    db.commit.assert_called_once()


def test_stable_vacancy_does_not_complete_reserved_slot_session(monkeypatch):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=1,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
        last_seen_at=None,
    )
    slot = SimpleNamespace(
        id=20, status="RESERVED", is_available=False
    )

    db = MagicMock()
    db.get.side_effect = [sensor, slot]
    db.scalars.return_value.all.return_value = [
        "available", "available", "available"
    ]

    lookup = MagicMock()
    monkeypatch.setattr(
        "app.services.sensor_service.get_active_session_for_slot_for_update",
        lookup,
    )

    sensor_service.process_event(
        db=db,
        sensor_id=1,
        event_type="available",
    )

    lookup.assert_not_called()
    assert slot.status == "RESERVED"
    assert slot.is_available is False



def test_stale_sensor_broadcasts_changed_slot_after_commit(monkeypatch):
    disable_incident_calls(monkeypatch)

    sensor = SimpleNamespace(
        id=7,
        parking_lot_id=10,
        parking_slot_id=20,
        is_online=True,
    )
    slot = SimpleNamespace(
        id=20,
        slot_number="A1",
        status="AVAILABLE",
        is_available=True,
    )
    db = MagicMock()
    db.scalars.return_value.all.return_value = [sensor]
    db.get.return_value = slot

    publisher = MagicMock()
    monkeypatch.setattr(
        "app.services.sensor_service.publish_parking_update",
        publisher,
    )

    sensor_service.mark_stale_sensors_offline(db)

    db.commit.assert_called_once()
    publisher.assert_called_once_with(
        {
            "slot_id": 20,
            "slot_number": "A1",
            "status": "UNKNOWN",
            "is_available": False,
            "event_type": "sensor_offline",
            "sensor_id": 7,
        }
    )
