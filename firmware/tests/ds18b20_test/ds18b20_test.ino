// DS18B20 bench test: prints each probe's address and temperature once per second.
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_PIN 4

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

void printAddress(const DeviceAddress addr) {
  for (int i = 0; i < 8; i++) {
    if (addr[i] < 16) Serial.print("0");
    Serial.print(addr[i], HEX);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  sensors.begin();
  sensors.setResolution(12);

  int count = sensors.getDeviceCount();
  Serial.printf("DS18B20 test on GPIO %d: %d device(s) found\n", ONE_WIRE_PIN, count);
  if (count == 0) {
    Serial.println("No probe found. Check wiring and the 4.7k pull-up to 3V3.");
  }
  for (int i = 0; i < count; i++) {
    DeviceAddress addr;
    if (sensors.getAddress(addr, i)) {
      Serial.printf("  probe %d address: ", i);
      printAddress(addr);
      Serial.println();
    }
  }
}

void loop() {
  sensors.requestTemperatures();
  float c = sensors.getTempCByIndex(0);

  if (c == DEVICE_DISCONNECTED_C) {
    Serial.println("ERROR: probe disconnected (-127). Check DATA wire and pull-up.");
  } else if (c == 85.0) {
    Serial.println("WARN: 85.00 C is the power-on reset value. Check VDD wiring.");
  } else {
    Serial.printf("Temp: %.2f C\n", c);
  }
  delay(1000);
}
