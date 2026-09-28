// TDS bench test: analog TDS module on GPIO 34, temperature-compensated with the DS18B20 on GPIO 4.
// Bench wiring only. In the final device the TDS signal goes to ADS1115 A1 (see docs/PRD.md).
// The onboard LED pulses while each reading is being taken.
#include <OneWire.h>
#include <DallasTemperature.h>

#define TDS_PIN 34             // ADC1_CH6, input only
#define ONE_WIRE_PIN 4
#define LED_PIN 2              // onboard blue LED
#define LED_MAX_BRIGHTNESS 255 // 0-255, peak brightness of the pulse

#define SAMPLES 30             // readings per measurement; the median is used
#define SAMPLE_INTERVAL_MS 25  // 30 x 25 ms = 750 ms, same as the DS18B20 conversion
#define K_VALUE 1.0f           // calibration factor: adjust until a known TDS solution reads correctly
#define DEFAULT_TEMP_C 25.0f   // used if the DS18B20 isn't connected

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

// One smooth fade in and out across the measurement. progress runs 0.0 → 1.0.
void pulseLed(float progress) {
  float b = (1.0f - cosf(progress * 2.0f * PI)) / 2.0f;
  ledcWrite(LED_PIN, (uint32_t)(b * b * LED_MAX_BRIGHTNESS));
}

int cmpU16(const void *a, const void *b) {
  return *(const uint16_t *)a - *(const uint16_t *)b;
}

// Samples the TDS signal SAMPLES times while pulsing the LED; returns the median in millivolts.
uint16_t readTdsMilliVolts() {
  uint16_t buf[SAMPLES];
  uint32_t totalMs = SAMPLES * SAMPLE_INTERVAL_MS;
  uint32_t start = millis();
  for (int i = 0; i < SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(TDS_PIN);
    uint32_t next = start + (i + 1) * SAMPLE_INTERVAL_MS;
    while ((int32_t)(millis() - next) < 0) {
      pulseLed((millis() - start) / (float)totalMs);
      delay(5);
    }
  }
  ledcWrite(LED_PIN, 0);
  qsort(buf, SAMPLES, sizeof(buf[0]), cmpU16);
  return buf[SAMPLES / 2];
}

// Standard analog TDS conversion (DFRobot Gravity TDS), compensated to 25 °C.
float tdsPpm(float volts, float tempC) {
  float coefficient = 1.0f + 0.02f * (tempC - 25.0f);
  float v = volts / coefficient;
  float ec = (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * K_VALUE;
  return ec * 0.5f;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  ledcAttach(LED_PIN, 5000, 8);
  ledcWrite(LED_PIN, 0);
  analogSetPinAttenuation(TDS_PIN, ADC_11db); // 0 to ~3.1 V input range

  sensors.begin();
  sensors.setResolution(12);
  sensors.setWaitForConversion(false);

  Serial.printf("TDS test: signal on GPIO %d, temperature probe %s\n", TDS_PIN,
                sensors.getDeviceCount() > 0 ? "found" : "NOT found (using 25 C)");
}

void loop() {
  sensors.requestTemperatures();        // converts in the background while we sample TDS
  uint16_t mv = readTdsMilliVolts();

  float tempC = sensors.getTempCByIndex(0);
  bool tempOk = tempC != DEVICE_DISCONNECTED_C && tempC != 85.0f;
  if (!tempOk) tempC = DEFAULT_TEMP_C;

  float ppm = tdsPpm(mv / 1000.0f, tempC);

  if (mv < 20) {
    Serial.printf("TDS: 0 ppm   (signal %u mV: probe in air or not connected)\n", mv);
  } else {
    Serial.printf("TDS: %.0f ppm   (signal %u mV, water %.2f C%s)\n", ppm, mv, tempC,
                  tempOk ? "" : " assumed");
  }
  if (mv > 2300) {
    Serial.println("WARN: signal above 2.3 V, outside the module's normal range.");
  }
  delay(1000);
}
