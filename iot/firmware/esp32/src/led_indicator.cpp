#include <Arduino.h>

#define LED_PIN 2

void setupLed() {
    pinMode(LED_PIN, OUTPUT);
}

void setLed(bool state) {
    digitalWrite(LED_PIN, state ? HIGH : LOW);
}