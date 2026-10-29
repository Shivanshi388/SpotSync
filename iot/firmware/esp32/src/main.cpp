#include <Arduino.h>

#include "sensor_manager.h"
#include "wifi_manager.h"
#include "mqtt_client.h"
#include "watchdog.h"
#include "ota_updater.h"

void setup() {
    Serial.begin(115200);

    setupWatchdog();
    connectWiFi();
    connectMQTT();
    setupOTA();
}

void loop() {
    resetWatchdog();
    handleOTA();

    long distanceCm = readDistanceCm();
    bool occupied = isSlotOccupied(distanceCm);

    Serial.print("Distance: ");
    Serial.print(distanceCm);
    Serial.print(" cm | Status: ");
    Serial.println(occupied ? "Occupied" : "Available");

    delay(5000);
}