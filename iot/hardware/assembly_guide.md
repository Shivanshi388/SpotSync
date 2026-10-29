# SpotSync Hardware Assembly Guide

## 1. Prepare the Components

Place the ESP32, ultrasonic sensor, LED, resistor, breadboard, jumper wires, and USB cable on your workspace.

## 2. Connect the Ultrasonic Sensor

Connect the HC-SR04 sensor:

- VCC → ESP32 5V
- GND → ESP32 GND
- TRIG → ESP32 GPIO 5
- ECHO → ESP32 GPIO 18

> For a physical HC-SR04 circuit, make sure the ESP32 GPIO does not receive an unsafe 5V signal from the ECHO pin. Use an appropriate voltage divider or level shifter if required by the sensor module.

## 3. Connect the LED

Connect the LED through a 220Ω resistor:

- ESP32 GPIO 2 → 220Ω resistor → LED anode
- LED cathode → ESP32 GND

## 4. Connect the ESP32

Connect the ESP32 to the computer using a USB cable.

The USB connection provides power and allows firmware to be uploaded through PlatformIO.

## 5. Test the Circuit

After assembling the circuit:

1. Upload the ESP32 firmware.
2. Open the serial monitor at `115200` baud.
3. Place an object near the ultrasonic sensor.
4. Check that the measured distance changes.
5. Verify that the parking status changes between `Occupied` and `Available`.

## 6. Safety Notes

- Disconnect USB power before changing wiring.
- Check all connections before powering the circuit.
- Do not connect a 5V signal directly to an ESP32 GPIO pin.
- Use a common ground between connected components.
