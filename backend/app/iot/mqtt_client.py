import json
import os


class MQTTClient:

    def __init__(self):
        self.broker = os.getenv("MQTT_BROKER", "localhost")
        self.port = int(os.getenv("MQTT_PORT", "1883"))

    def publish(self, topic: str, payload: dict):
        message = json.dumps(payload)

        return {
            "broker": self.broker,
            "port": self.port,
            "topic": topic,
            "payload": message,
            "status": "queued",
        }


mqtt_client = MQTTClient()
