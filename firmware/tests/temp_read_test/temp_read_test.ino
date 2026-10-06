// Simplest DS18B20 check: print the temperature once a second.
// Wiring: red -> 3V3, black -> GND, yellow -> GPIO 4, 4.7k resistor between GPIO 4 and 3V3.
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_PIN 4

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  sensors.begin();
  Serial.printf("DS18B20 devices found: %d\n", sensors.getDeviceCount());
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("No sensor found: check wiring and the 4.7k pull-up");
  } else {
    Serial.printf("Temperature: %.2f C\n", tempC);
  }
  delay(1000);
}
