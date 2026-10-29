import paho.mqtt.client as mqtt

from app.core.database import SessionLocal
from app.mqtt.message_handler import handle_sensor_message

MQTT_TOPIC = "spotsync/parking/+/occupancy"


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        client.subscribe(MQTT_TOPIC)
        print(f"Subscribed to {MQTT_TOPIC}")
    else:
        print(f"MQTT connection failed: {reason_code}")


def on_message(client, userdata, msg):
    db = SessionLocal()

    try:
        success = handle_sensor_message(db, msg.payload)

        if success:
            print(f"Processed sensor message: {msg.topic}")
        else:
            print(f"Invalid sensor message: {msg.topic}")

    finally:
        db.close()