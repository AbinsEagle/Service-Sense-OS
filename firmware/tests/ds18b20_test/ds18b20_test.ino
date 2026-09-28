// DS18B20 bench test: prints each probe's address and temperature once per second.
// The onboard LED pulses (fades in and out) while each reading is being taken.
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_PIN 4
#define LED_PIN 2            // onboard blue LED; the final device uses WS2812B RGB2 instead
#define LED_MAX_BRIGHTNESS 255 // 0-255, peak brightness of the pulse

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

void printAddress(const DeviceAddress addr) {
  for (int i = 0; i < 8; i++) {
    if (addr[i] < 16) Serial.print("0");
    Serial.print(addr[i], HEX);
  }
}

// One smooth fade in and out across the conversion time. progress runs 0.0 → 1.0.
void pulseLed(float progress) {
  float b = (1.0f - cosf(progress * 2.0f * PI)) / 2.0f;   // 0 → 1 → 0
  ledcWrite(LED_PIN, (uint32_t)(b * b * LED_MAX_BRIGHTNESS)); // squared so the fade looks even to the eye
}

void setup() {
  Serial.begin(115200);
  delay(500);

  ledcAttach(LED_PIN, 5000, 8); // 5 kHz PWM, 8-bit brightness
  ledcWrite(LED_PIN, 0);

  sensors.begin();
  sensors.setResolution(12);
  sensors.setWaitForConversion(false); // don't block, so the LED can animate during the reading

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
  uint32_t start = millis();
  uint32_t conversionMs = sensors.millisToWaitForConversion(); // 750 ms at 12-bit
  while (millis() - start < conversionMs) {
    pulseLed((millis() - start) / (float)conversionMs);
    delay(10);
  }
  ledcWrite(LED_PIN, 0);

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
