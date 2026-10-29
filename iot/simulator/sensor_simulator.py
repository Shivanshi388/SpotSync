import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "spotsync/parking/{slot_id}/occupancy"


def generate_sensor_reading(sensor_id, slot_id):
    occupied = random.choice([True, False])

    if occupied:
        distance_cm = round(random.uniform(3.0, 15.0), 2)
        status = "occupied"
    else:
        distance_cm = round(random.uniform(30.0, 100.0), 2)
        status = "available"

    return {
        "sensor_id": sensor_id,
        "slot_id": slot_id,
        "status": status,
        "distance_cm": distance_cm,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    sensor_id = "SENSOR_001"
    slot_id = "A1"
    topic = MQTT_TOPIC.format(slot_id=slot_id)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    print("SpotSync Sensor Simulator")
    print("--------------------------")
    print(f"Sensor ID: {sensor_id}")
    print(f"Slot ID:   {slot_id}")
    print(f"MQTT:      {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic:     {topic}")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            reading = generate_sensor_reading(sensor_id, slot_id)
            payload = json.dumps(reading)

            client.publish(topic, payload)
            print(payload)

            time.sleep(5)

    except KeyboardInterrupt:
        print("\nSensor simulator stopped.")

    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
