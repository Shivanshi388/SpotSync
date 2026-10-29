#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "secrets.example.h"
#include "wifi_manager.h"

void connectWiFi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startTime = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - startTime < WIFI_TIMEOUT_MS) {
        delay(500);
    }
}