import random
import time
from datetime import datetime, timezone


FAULT_TYPES = [
    "sensor_offline",
    "invalid_distance",
    "stale_reading",
    "low_battery",
]


def generate_fault(sensor_id, slot_id):
    """Generate a simulated fault for a parking sensor."""

    fault_type = random.choice(FAULT_TYPES)

    if fault_type == "sensor_offline":
        message = "Sensor stopped responding."

    elif fault_type == "invalid_distance":
        message = "Sensor returned an invalid distance value."

    elif fault_type == "stale_reading":
        message = "Sensor reading has not been updated recently."

    else:
        message = "Sensor battery level is low."

    return {
        "sensor_id": sensor_id,
        "slot_id": slot_id,
        "fault_type": fault_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    """Continuously simulate sensor faults."""

    sensors = [
        ("SENSOR_001", "LOT_A_001"),
        ("SENSOR_002", "LOT_A_002"),
        ("SENSOR_003", "LOT_A_003"),
        ("SENSOR_004", "LOT_A_004"),
        ("SENSOR_005", "LOT_A_005"),
    ]

    print("SpotSync Fault Simulator")
    print("------------------------")
    print(f"Monitoring {len(sensors)} sensors.")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            sensor_id, slot_id = random.choice(sensors)

            fault = generate_fault(sensor_id, slot_id)

            print(fault)
            print("-" * 60)

            time.sleep(5)

    except KeyboardInterrupt:
        print("\nFault simulator stopped.")


if __name__ == "__main__":
    main()