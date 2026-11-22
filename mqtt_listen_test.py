"""
Listens with the BACKEND's MQTT credentials and prints what EMQX delivers.
Run from the backend folder with the venv active, while the bridge is running:

    cd backend
    python ../mqtt_listen_test.py
"""
import os
import sys
import time

sys.path.insert(0, os.getcwd())

from app.mqtt.client import create_mqtt_client  # noqa: E402
from app.core.config import settings  # noqa: E402

received = 0


def on_connect(client, userdata, flags, reason_code, properties):
    print("CONNECT result:", reason_code)
    client.subscribe([("spotsync/parking/+/occupancy", 1), ("spotsync/sensors/+/events", 1)])


def on_subscribe(client, userdata, mid, reason_codes, properties):
    print("SUBACK (broker answer):", [str(code) for code in reason_codes])
    print("  -> 'Granted QoS 1' is good. 'Not authorized' means the EMQX user has no subscribe permission.")


def on_message(client, userdata, msg):
    global received
    received += 1
    print("GOT:", msg.topic, msg.payload[:120])


client = create_mqtt_client()
client.on_connect = on_connect
client.on_subscribe = on_subscribe
client.on_message = on_message
print(f"Connecting to {settings.mqtt_broker}:{settings.mqtt_port} as '{settings.mqtt_username}' ...")
client.connect(settings.mqtt_broker, settings.mqtt_port, 60)
client.loop_start()
time.sleep(20)
client.loop_stop()
print(f"\nMessages received in 20s: {received}")
if received == 0:
    print("NOTHING arrived. Backend user cannot read the bridge's topics (EMQX ACL), "
          "or the bridge uses a different broker/credentials.")
else:
    print("Messages arrive. The problem is inside the backend handler - send me its log.")
