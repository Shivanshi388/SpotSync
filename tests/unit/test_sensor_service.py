from unittest.mock import MagicMock, patch

from app.services.sensor_service import sensor_service


def setup_db(readings, current_status="UNKNOWN"):
    db = MagicMock()

    sensor = MagicMock()
    sensor.id = 101
    sensor.parking_lot_id = 1
    sensor.parking_slot_id = 501

    slot = MagicMock()
    slot.id = 501
    slot.status = current_status
    slot.is_available = False

    db.get.side_effect = [sensor, slot]
    incident_result = MagicMock()
    incident_result.all.return_value = []
    reading_result = MagicMock()
    reading_result.all.return_value = readings
    session_result = MagicMock()
    session_result.first.return_value = None
    db.scalars.side_effect = [incident_result, reading_result, session_result]

    return db, sensor, slot


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_one_reading_does_not_confirm_occupancy(mock_incident):
    db, _, slot = setup_db(["occupied"])

    event = sensor_service.process_event(
        db, 101, "occupied", 8.5, {}
    )

    assert event is not None
    assert slot.status == "UNKNOWN"
    assert slot.is_available is False
    db.commit.assert_called_once()


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_three_occupied_readings_confirm_occupancy(mock_incident):
    db, _, slot = setup_db(["occupied", "occupied", "occupied"])

    event = sensor_service.process_event(
        db, 101, "occupied", 8.5, {}
    )

    assert event is not None
    assert slot.status == "OCCUPIED"
    assert slot.is_available is False


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_three_available_readings_confirm_availability(mock_incident):
    db, _, slot = setup_db(
        ["available", "available", "available"],
        current_status="OCCUPIED",
    )

    event = sensor_service.process_event(
        db, 101, "available", 80.0, {}
    )

    assert event is not None
    assert slot.status == "AVAILABLE"
    assert slot.is_available is True


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_reserved_slot_is_not_released_by_sensor(mock_incident):
    db, _, slot = setup_db(
        ["available", "available", "available"],
        current_status="RESERVED",
    )

    sensor_service.process_event(db, 101, "available", 80.0, {})

    assert slot.status == "RESERVED"
    assert slot.is_available is False


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_available_sensor_readings_release_former_out_of_service_slot(mock_incident):
    db, _, slot = setup_db(
        ["available", "available", "available"],
        current_status="OUT_OF_SERVICE",
    )

    sensor_service.process_event(db, 101, "available", 80.0, {})

    assert slot.status == "AVAILABLE"
    assert slot.is_available is True

@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_explicit_offline_event_marks_sensor_offline(mock_incident):
    db, sensor, _ = setup_db([])

    event = sensor_service.process_event(
        db, 101, "sensor_offline", None, {}
    )

    assert event is not None
    assert sensor.is_online is False
    assert sensor.last_seen_at is not None
    mock_incident.assert_called_once_with(
        db=db,
        parking_lot_id=1,
        event_type="sensor_offline",
        value=None,
        sensor_id=101,
    )


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_stale_sensor_is_marked_offline(mock_incident):
    db = MagicMock()

    sensor = MagicMock()
    sensor.id = 101
    sensor.parking_lot_id = 1
    sensor.is_online = True

    db.scalars.return_value.all.return_value = [sensor]

    count = sensor_service.mark_stale_sensors_offline(
        db,
        timeout_seconds=120,
    )

    assert count == 1
    assert sensor.is_online is False
    mock_incident.assert_called_once_with(
        db=db,
        parking_lot_id=1,
        event_type="sensor_offline",
        sensor_id=101,
    )
    db.commit.assert_called_once()


@patch("app.services.sensor_service.incident_service.detect_sensor_incident")
def test_normal_reading_marks_sensor_online(mock_incident):
    db, sensor, _ = setup_db(["occupied"])

    sensor.is_online = False

    event = sensor_service.process_event(
        db, 101, "occupied", 8.5, {}
    )

    assert event is not None
    assert sensor.is_online is True
    assert sensor.last_seen_at is not None
