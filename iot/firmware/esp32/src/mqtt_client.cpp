#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include "config.h"
#include "secrets.example.h"
#include "mqtt_client.h"

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

void connectMQTT() {
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

    while (!mqttClient.connected()) {
        mqttClient.connect("SpotSyncSensor");
        delay(MQTT_RECONNECT_DELAY_MS);
    }
}