from app.iot.mqtt_client import mqtt_client


class SensorBridge:

    def publish_sensor_event(
        self,
        sensor_id: int,
        event_type: str,
        value: float | None = None,
    ):
        return mqtt_client.publish(
            topic=f"spotsync/sensors/{sensor_id}/events",
            payload={
                "sensor_id": sensor_id,
                "event_type": event_type,
                "value": value,
            },
        )


sensor_bridge = SensorBridge()
