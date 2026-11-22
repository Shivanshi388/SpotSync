
import os
import ssl

import paho.mqtt.client as mqtt

from app.core.config import settings


def create_mqtt_client() -> mqtt.Client:
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"{settings.mqtt_client_id}-{os.getpid()}",
        protocol=mqtt.MQTTv311,
    )

    # Configure MQTT authentication.
    if settings.mqtt_username:
        client.username_pw_set(
            settings.mqtt_username,
            settings.mqtt_password,
        )

    # Configure TLS for EMQX Cloud.
    if settings.mqtt_tls_enabled:
        client.tls_set(
            cert_reqs=ssl.CERT_REQUIRED,
            tls_version=ssl.PROTOCOL_TLS_CLIENT,
        )

    client.reconnect_delay_set(min_delay=1, max_delay=30)

    return client
