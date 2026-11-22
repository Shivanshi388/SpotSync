import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.mqtt.client import create_mqtt_client
from app.mqtt.message_handler import handle_sensor_message
from app.mqtt.topics import ENTRANCE_EVENT_TOPIC, OCCUPANCY_TOPIC

logger = logging.getLogger(__name__)

MQTT_TOPIC = OCCUPANCY_TOPIC.replace("{slot_id}", "+")
MQTT_TOPICS = (MQTT_TOPIC, ENTRANCE_EVENT_TOPIC)
_mqtt_client = None


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logger.info("MQTT CONNECTED successfully to %s:%s",
                    settings.mqtt_broker, settings.mqtt_port)
        for topic in MQTT_TOPICS:
            result, mid = client.subscribe(topic, qos=1)
            logger.info("MQTT SUBSCRIBE requested: topic=%s result=%s mid=%s",
                        topic, result, mid)
    else:
        logger.error("MQTT connection rejected: reason_code=%s", reason_code)



def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    logger.warning(
        "MQTT DISCONNECTED: reason_code=%s flags=%s",
        reason_code,
        disconnect_flags,
    )


def on_message(client, userdata, msg):
    logger.info("MQTT message received: %s", msg.topic)

    db = SessionLocal()
    try:
        import json
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            logger.info(
                "MQTT SENSOR: sensor=%s slot=%s status=%s distance=%s",
                payload.get("sensor_id"),
                payload.get("slot_id"),
                payload.get("status"),
                payload.get("distance_cm"),
            )
        except Exception:
            logger.warning("MQTT payload is not valid JSON")

        success = handle_sensor_message(db, msg.payload)
        if success:
            db.commit()
            logger.info("PROCESSED SENSOR MESSAGE: %s", msg.topic)
        else:
            db.rollback()
            logger.warning("REJECTED SENSOR MESSAGE: %s payload=%s", msg.topic, msg.payload[:300])
    except Exception:
        db.rollback()
        logger.exception("ERROR PROCESSING MQTT MESSAGE: %s", msg.topic)
    finally:
        db.close()



def start_mqtt_subscriber():
    global _mqtt_client

    if _mqtt_client is not None:
        return

    client = create_mqtt_client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    logger.info(
        "Connecting MQTT subscriber: broker=%s port=%s username_configured=%s tls=%s",
        settings.mqtt_broker,
        settings.mqtt_port,
        bool(settings.mqtt_username),
        settings.mqtt_tls_enabled,
    )
    try:
        client.connect(
            settings.mqtt_broker,
            settings.mqtt_port,
            keepalive=60,
        )
        client.loop_start()
    except Exception:
        logger.exception("MQTT initial connection failed")
        raise
    _mqtt_client = client

    logger.info(
        "MQTT subscriber started for %s:%s",
        settings.mqtt_broker,
        settings.mqtt_port,
    )


def stop_mqtt_subscriber():
    global _mqtt_client

    if _mqtt_client is None:
        return

    client = _mqtt_client
    _mqtt_client = None

    client.disconnect()
    client.loop_stop()
    logger.info("MQTT subscriber stopped")
