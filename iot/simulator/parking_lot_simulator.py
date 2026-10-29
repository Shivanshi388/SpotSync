import json
import random
import time
from datetime import datetime, timezone


def generate_slot_reading(sensor_id, slot_id):
    """Generate a simulated reading for one parking slot."""

    occupied = random.choice([True, False])

    if occupied:
        status = "occupied"
        distance_cm = round(random.uniform(3.0, 15.0), 2)
    else:
        status = "available"
        distance_cm = round(random.uniform(30.0, 100.0), 2)

    return {
        "sensor_id": sensor_id,
        "slot_id": slot_id,
        "status": status,
        "distance_cm": distance_cm,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    """Simulate a complete parking lot."""

    parking_lot = {
        "LOT_A_001": "SENSOR_001",
        "LOT_A_002": "SENSOR_002",
        "LOT_A_003": "SENSOR_003",
        "LOT_A_004": "SENSOR_004",
        "LOT_A_005": "SENSOR_005",
    }

    print("SpotSync Parking Lot Simulator")
    print("------------------------------")
    print(f"Simulating {len(parking_lot)} parking slots.")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            readings = []

            for slot_id, sensor_id in parking_lot.items():
                reading = generate_slot_reading(sensor_id, slot_id)
                readings.append(reading)

            print(json.dumps(readings, indent=2))
            print("-" * 60)

            time.sleep(5)

    except KeyboardInterrupt:
        print("\nParking lot simulator stopped.")


if __name__ == "__main__":
    main()