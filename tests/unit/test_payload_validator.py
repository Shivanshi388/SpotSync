import json

from app.mqtt.payload_validator import SensorPayload


def test_valid_sensor_payload():
    payload = {
        "sensor_id": "SENSOR_001",
        "slot_id": "A1",
        "status": "occupied",
        "distance_cm": 8.5,
        "timestamp": "2026-10-07T17:15:02+00:00",
    }

    result = SensorPayload.model_validate(payload)

    assert result.sensor_id == "SENSOR_001"
    assert result.slot_id == "A1"
    assert result.status == "occupied"
    assert result.distance_cm == 8.5


def test_sensor_payload_rejects_extra_fields():
    payload = {
        "sensor_id": "SENSOR_001",
        "slot_id": "A1",
        "status": "available",
        "distance_cm": 50.0,
        "timestamp": "2026-10-07T17:15:02+00:00",
        "unexpected": "value",
    }

    try:
        SensorPayload.model_validate(payload)
        assert False, "Expected validation to fail"
    except Exception:
        assert True
