#include <Arduino.h>
#include "sensor_manager.h"
#include "pins.h"

long readDistanceCm() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);

    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);

    if (duration == 0) {
        return -1;
    }

    return duration * 0.034 / 2;
}

bool isSlotOccupied(long distanceCm) {
    if (distanceCm < 0) {
        return false;
    }

    return distanceCm <= 15;
}