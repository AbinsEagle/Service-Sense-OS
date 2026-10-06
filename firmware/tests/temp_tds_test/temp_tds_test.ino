// Temp + TDS bench test: analog TDS module on GPIO 34, temperature-compensated with the DS18B20 on GPIO 4.
// Bench wiring only. In the final device the TDS signal goes to ADS1115 A1 (see docs/PRD.md).
// The onboard LED pulses while each reading is being taken.
//
// Revision: 2026-10-02, reasoning comments added (no logic changes).
//
// How a reading works, and why:
//   1. Start the DS18B20 conversion (takes ~750 ms) in the background.
//   2. Meanwhile sample the TDS voltage 30 times over the same 750 ms and take the median.
//   3. Read the temperature, convert voltage -> ppm with temperature compensation.
//   4. Print, wait 1 s, repeat.
// Doing 1 and 2 at the same time means a full reading costs 750 ms, not 750 + 750.
#include <OneWire.h>
#include <DallasTemperature.h>

// GPIO 34 is on ADC1. ADC2 pins can't be read while Wi-Fi is running, and ADC1 keeps the
// same pin choice safe if radios are used later. GPIO 34 is also input-only, so nothing can
// accidentally drive the module's signal line from the ESP32 side.
#define TDS_PIN 34             // ADC1_CH6, input only
#define ONE_WIRE_PIN 4
#define LED_PIN 2              // onboard blue LED
#define LED_MAX_BRIGHTNESS 255 // 0-255, peak brightness of the pulse

// The ESP32 ADC is noisy and can throw the odd wild reading. The median of many samples
// ignores those outliers; an average would be dragged by them.
#define SAMPLES 30             // readings per measurement; the median is used
// 30 x 25 ms = 750 ms, the DS18B20's worst-case conversion time at 12-bit resolution,
// so the temperature is ready exactly when the TDS sampling finishes.
#define SAMPLE_INTERVAL_MS 25  // 30 x 25 ms = 750 ms, same as the DS18B20 conversion
// 1.0 = uncalibrated. Dip the probe in a solution of known TDS (a TDS pen or 342 ppm NaCl
// standard) and scale this until the reading matches. Do it once per module.
#define K_VALUE 1.0f           // calibration factor: adjust until a known TDS solution reads correctly
// 25 C is the reference temperature, so at 25 C the compensation below does nothing.
// That makes it the least-wrong fallback when the probe is missing.
#define DEFAULT_TEMP_C 25.0f   // used if the DS18B20 isn't connected

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

// One smooth fade in and out across the measurement. progress runs 0.0 → 1.0.
// The cosine makes a smooth up-and-down curve; squaring it (b * b) compensates for the eye
// seeing brightness non-linearly, so the fade looks even instead of jumping on at low duty.
void pulseLed(float progress) {
  float b = (1.0f - cosf(progress * 2.0f * PI)) / 2.0f;
  ledcWrite(LED_PIN, (uint32_t)(b * b * LED_MAX_BRIGHTNESS));
}

// Comparison function for qsort. Subtracting is safe here because uint16_t values are
// promoted to int before the subtraction, so the result can't wrap around.
int cmpU16(const void *a, const void *b) {
  return *(const uint16_t *)a - *(const uint16_t *)b;
}

// Samples the TDS signal SAMPLES times while pulsing the LED; returns the median in millivolts.
// Timing is anchored to `start` (next = start + (i+1) * interval) instead of "wait 25 ms after
// each read", so the time spent reading doesn't accumulate as drift across the 30 samples.
// analogReadMilliVolts() applies the chip's factory ADC calibration, so no manual
// raw-count-to-volts conversion (and its error) is needed.
uint16_t readTdsMilliVolts() {
  uint16_t buf[SAMPLES];
  uint32_t totalMs = SAMPLES * SAMPLE_INTERVAL_MS;
  uint32_t start = millis();
  for (int i = 0; i < SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(TDS_PIN);
    uint32_t next = start + (i + 1) * SAMPLE_INTERVAL_MS;
    // Signed subtraction keeps the comparison correct when millis() wraps after ~49 days.
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
// Why compensate: water conducts about 2% better per °C, so the same water reads a higher
// voltage when warm. Dividing the voltage by (1 + 0.02 * (T - 25)) converts it back to what
// it would read at 25 °C, the temperature TDS values are quoted at.
// The cubic polynomial is DFRobot's fit of the module's voltage to conductivity (EC, in
// µS/cm). TDS in ppm is EC x 0.5, the usual conversion factor for natural water.
float tdsPpm(float volts, float tempC) {
  float coefficient = 1.0f + 0.02f * (tempC - 25.0f);
  float v = volts / coefficient;
  float ec = (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * K_VALUE;
  return ec * 0.5f;
}

void setup() {
  Serial.begin(115200);
  delay(500);   // give the USB serial bridge time to settle so the first lines aren't lost

  // 5 kHz, 8-bit PWM for the LED fade: fast enough to be flicker-free, 256 brightness steps.
  ledcAttach(LED_PIN, 5000, 8);
  ledcWrite(LED_PIN, 0);
  // At the default attenuation the ADC only reads up to ~1.1 V. 11 dB widens it to ~3.1 V,
  // which covers the TDS module's 0-2.3 V output.
  analogSetPinAttenuation(TDS_PIN, ADC_11db); // 0 to ~3.1 V input range

  sensors.begin();
  sensors.setResolution(12);            // 12-bit = 0.0625 C steps, the finest the DS18B20 offers
  // The default call blocks for the whole 750 ms conversion. Turning that off lets us
  // sample the TDS signal during the wait (see loop()).
  sensors.setWaitForConversion(false);

  // getDeviceCount() is 0 when nothing answers on the 1-Wire bus (probe unplugged, pull-up
  // missing, or a wiring fault). Printing it once at boot makes that obvious.
  Serial.printf("TDS test: signal on GPIO %d, temperature probe %s\n", TDS_PIN,
                sensors.getDeviceCount() > 0 ? "found" : "NOT found (using 25 C)");
}

void loop() {
  sensors.requestTemperatures();        // converts in the background while we sample TDS
  uint16_t mv = readTdsMilliVolts();

  float tempC = sensors.getTempCByIndex(0);
  // Two values mean "no valid temperature": -127 (DEVICE_DISCONNECTED_C) when the sensor
  // doesn't answer, and 85 C, which is the DS18B20's power-on default and shows up when a
  // conversion didn't finish. Real water readings are never exactly 85.00 in this use.
  bool tempOk = tempC != DEVICE_DISCONNECTED_C && tempC != 85.0f;
  if (!tempOk) tempC = DEFAULT_TEMP_C;

  float ppm = tdsPpm(mv / 1000.0f, tempC);

  // Under 20 mV the signal line is effectively at 0 V: the probe is out of the water or
  // the module isn't connected. Reporting "0 ppm" with a reason beats a meaningless
  // small number from the polynomial.
  if (mv < 20) {
    Serial.printf("TDS: 0 ppm   (signal %u mV: probe in air or not connected)\n", mv);
  } else {
    // " assumed" is appended when the 25 C fallback was used, so a reading that isn't
    // temperature-compensated is never mistaken for one that is.
    Serial.printf("TDS: %.0f ppm   (signal %u mV, water %.2f C%s)\n", ppm, mv, tempC,
                  tempOk ? "" : " assumed");
  }
  // The module is specified for 0-2.3 V output. Above that the polynomial is outside the
  // range it was fitted for, so the ppm value can't be trusted.
  if (mv > 2300) {
    Serial.println("WARN: signal above 2.3 V, outside the module's normal range.");
  }
  delay(1000);
}
