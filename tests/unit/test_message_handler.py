import json
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.mqtt.message_handler import handle_sensor_message


def make_payload(**overrides):
    payload = {
        "sensor_id": "SENSOR_001",
        "slot_id": "B1-A1",
        "status": "occupied",
        "distance_cm": 8.5,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    payload.update(overrides)
    return payload


def setup_sensor_db():
    db = MagicMock()

    sensor = MagicMock()
    sensor.id = 101
    sensor.parking_slot_id = 501
    sensor.sensor_code = "SENSOR_001"

    slot = MagicMock()
    slot.id = 501
    slot.slot_number = "B1-A1"
    slot.display_code = "B1-A1"

    db.scalar.return_value = sensor
    db.get.return_value = slot

    return db, sensor, slot


def test_invalid_json_is_rejected():
    assert handle_sensor_message(MagicMock(), b"not-json") is False


def test_unexpected_payload_field_is_rejected():
    db, _, _ = setup_sensor_db()
    payload = make_payload(unexpected="value")

    result = handle_sensor_message(db, json.dumps(payload).encode())

    assert result is False


@patch("app.mqtt.message_handler.sensor_service.process_event")
def test_valid_sensor_message_uses_registered_sensor(mock_process):
    db, sensor, slot = setup_sensor_db()
    mock_process.return_value = MagicMock()

    payload = make_payload()

    result = handle_sensor_message(db, json.dumps(payload).encode())

    assert result is True
    db.scalar.assert_called_once()
    from app.models.parking_slot import ParkingSlot
    db.get.assert_any_call(ParkingSlot, sensor.parking_slot_id)
    mock_process.assert_called_once_with(
        db=db,
        sensor_id=101,
        event_type="occupied",
        value=8.5,
        payload=payload,
    )


@patch("app.mqtt.message_handler.sensor_service.process_event")
def test_unknown_sensor_is_rejected(mock_process):
    db, _, _ = setup_sensor_db()
    db.scalar.return_value = None

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(sensor_id="UNKNOWN_SENSOR")).encode(),
    )

    assert result is False
    mock_process.assert_not_called()


@patch("app.mqtt.message_handler.sensor_service.process_event")
def test_sensor_cannot_claim_another_slot(mock_process):
    db, _, _ = setup_sensor_db()

    payload = make_payload(slot_id="B2-A1")
    result = handle_sensor_message(db, json.dumps(payload).encode())

    assert result is False
    mock_process.assert_not_called()


@patch("app.mqtt.message_handler.sensor_service.process_event")
def test_unassigned_sensor_is_rejected(mock_process):
    db, sensor, _ = setup_sensor_db()
    sensor.parking_slot_id = None

    result = handle_sensor_message(
        db,
        json.dumps(make_payload()).encode(),
    )

    assert result is False
    mock_process.assert_not_called()


def test_old_sensor_reading_is_rejected():
    db, _, _ = setup_sensor_db()
    old_timestamp = (
        datetime.now(timezone.utc) - timedelta(minutes=5)
    ).isoformat()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(timestamp=old_timestamp)).encode(),
    )

    assert result is False


@patch("app.mqtt.message_handler.sensor_service.process_event")
def test_sensor_reading_two_minutes_ahead_is_accepted(mock_process):
    db, _, _ = setup_sensor_db()
    mock_process.return_value = MagicMock()
    future_timestamp = (
        datetime.now(timezone.utc) + timedelta(minutes=2)
    ).isoformat()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(timestamp=future_timestamp)).encode(),
    )

    assert result is True
    mock_process.assert_called_once()


def test_sensor_reading_ten_minutes_ahead_is_rejected():
    db, _, _ = setup_sensor_db()
    future_timestamp = (
        datetime.now(timezone.utc) + timedelta(minutes=10)
    ).isoformat()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(timestamp=future_timestamp)).encode(),
    )

    assert result is False


def test_timezone_naive_sensor_reading_is_rejected():
    db, _, _ = setup_sensor_db()
    naive_timestamp = datetime.now().replace(microsecond=0).isoformat()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(timestamp=naive_timestamp)).encode(),
    )

    assert result is False


def test_invalid_timestamp_is_rejected():
    db, _, _ = setup_sensor_db()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload(timestamp="not-a-timestamp")).encode(),
    )

    assert result is False
