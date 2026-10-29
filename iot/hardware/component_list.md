# SpotSync Hardware Components

## Main Components

| Component                 |  Quantity | Purpose                                      |
| ------------------------- | --------: | -------------------------------------------- |
| ESP32 development board   |         1 | Main controller and Wi-Fi/MQTT communication |
| HC-SR04 ultrasonic sensor |         1 | Detects vehicle presence using distance      |
| LED                       |         1 | Indicates parking slot status                |
| Resistor (220Ω)           |         1 | Limits current for the LED                   |
| Breadboard                |         1 | Prototype circuit assembly                   |
| Jumper wires              | As needed | Connects the components                      |
| USB cable                 |         1 | Powers and programs the ESP32                |

## Sensor Connections

The ultrasonic sensor uses:

- TRIG → ESP32 GPIO 5
- ECHO → ESP32 GPIO 18
- VCC → 5V
- GND → GND

## LED Connection

- LED → ESP32 GPIO 2
- LED should use a 220Ω current-limiting resistor
- LED GND → ESP32 GND
