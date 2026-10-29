from unittest.mock import MagicMock, patch

from app.mqtt.message_handler import handle_sensor_message


def make_payload(**overrides):
    payload = {
        "sensor_id": "SENSOR_001",
        "slot_id": "A1",
        "status": "occupied",
        "distance_cm": 8.5,
        "timestamp": "2026-10-07T17:15:02+00:00",
    }
    payload.update(overrides)
    return payload


def test_invalid_json_is_rejected():
    db = MagicMock()

    result = handle_sensor_message(db, b"not-json")

    assert result is False


def test_invalid_payload_is_rejected():
    import json

    db = MagicMock()

    payload = make_payload()
    payload["unexpected"] = "value"

    result = handle_sensor_message(
        db,
        json.dumps(payload).encode(),
    )

    assert result is False


@patch("app.mqtt.message_handler.sensor_service.process_event")
@patch("app.mqtt.message_handler.update_slot_from_sensor")
def test_valid_sensor_message_is_processed(
    mock_update_slot,
    mock_process_event,
):
    import json

    db = MagicMock()

    mock_update_slot.return_value = True
    mock_process_event.return_value = MagicMock()

    result = handle_sensor_message(
        db,
        json.dumps(make_payload()).encode(),
    )

    assert result is True

    mock_update_slot.assert_called_once_with(
        db=db,
        slot_id="A1",
        status="occupied",
    )

    mock_process_event.assert_called_once_with(
        db=db,
        sensor_id=1,
        event_type="occupied",
        value=8.5,
        payload=make_payload(),
    )


@patch("app.mqtt.message_handler.update_slot_from_sensor")
def test_unknown_sensor_is_rejected(mock_update_slot):
    import json

    db = MagicMock()
    mock_update_slot.return_value = True

    result = handle_sensor_message(
        db,
        json.dumps(
            make_payload(sensor_id="UNKNOWN_SENSOR")
        ).encode(),
    )

    assert result is False


@patch("app.mqtt.message_handler.sensor_service.process_event")
@patch("app.mqtt.message_handler.update_slot_from_sensor")
def test_unknown_slot_is_rejected(
    mock_update_slot,
    mock_process_event,
):
    import json

    db = MagicMock()

    mock_update_slot.return_value = False

    result = handle_sensor_message(
        db,
        json.dumps(make_payload()).encode(),
    )

    assert result is False
    mock_process_event.assert_not_called()
