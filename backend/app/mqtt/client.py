import paho.mqtt.client as mqtt

from app.core.config import settings


def create_mqtt_client() -> mqtt.Client:
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=settings.mqtt_client_id,
    )

    client.connect(
        settings.mqtt_broker,
        settings.mqtt_port,
    )

    return client