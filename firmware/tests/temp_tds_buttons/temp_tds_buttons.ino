// Temp + TDS with a 4-button tactile module and a traffic-light LED module.
// All the "best value" logic runs here on the ESP32; only the final decided value is output.
//   Press TEMP or TDS: the green light pulses while the device waits for the reading to settle.
//   Settled:          green stops pulsing and stays on for 3 s; the final value is printed.
//   Never settled:    yellow for 3 s; the last value is printed marked UNSTABLE (re-take it).
//   Sensor not working: red for 3 s (probe unplugged, shorted, or out of range).
// Wiring (see docs/pinmap.md):
//   4-button tactile module (pins V, G, 1, 2, 3, 4): V -> 3V3 (NOT 5V, so its outputs stay 3.3 V),
//   G -> GND, 1 (TEMP) -> GPIO 32, 2 (TDS) -> GPIO 25. Buttons 3 and 4 unused for now.
//   Which level means "pressed" depends on how the module is built, so the sketch reads each
//   button's resting level at boot (don't touch the buttons while it starts) and treats the
//   opposite level as a press.
//   Traffic light module: GND -> GND, R -> GPIO 23, Y -> GPIO 18, G -> GPIO 19
//   DS18B20 data on GPIO 4 (4.7k pull-up to 3V3), TDS module signal on GPIO 34.
// The module's pins are driven directly from the ESP32 (it has its own resistors).
//
// Stability rules (all numbers below are first guesses, to be tuned on real traces):
//   Temperature: DS18B20 read every 750 ms; settled when the last 8 valid readings span
//                no more than TEMP_STABLE_C. Result = their median. Gives up after TEMP_TIMEOUT_MS.
//   TDS:         signal sampled every 25 ms, reduced to one median per 500 ms block. The first
//                SETTLE_BLOCKS blocks are thrown away (probe settling). Settled when the last 6
//                blocks span no more than max(TDS_STABLE_MV, 2% of their median). Result = median
//                of those blocks, converted to ppm with the temperature measured meanwhile.
#include <OneWire.h>
#include <DallasTemperature.h>

struct Button {
  uint8_t pin;
  bool state = HIGH;       // debounced level
  bool lastRaw = HIGH;
  bool pressedLevel = LOW; // set at boot from the resting level
  uint32_t changedAt = 0;
};

enum Outcome { SETTLED, UNSTABLE, FAULT };

#define TDS_PIN 34             // ADC1_CH6, input only
#define ONE_WIRE_PIN 4
#define TEMP_BTN_PIN 32
#define TDS_BTN_PIN 25
#define RED_PIN 23
#define YELLOW_PIN 18
#define GREEN_PIN 19
#define DEBOUNCE_MS 30

#define RESULT_MS 3000         // how long the green / yellow / red result stays lit
#define PULSE_MS 1000          // one green fade in and out

#define TEMP_WINDOW 8          // readings compared for stability (8 x 750 ms = 6 s)
#define TEMP_STABLE_C 0.1f     // max spread across the window to count as settled
#define TEMP_TIMEOUT_MS 30000
#define TEMP_FAULT_RUN 3       // this many bad readings in a row = sensor fault

#define SAMPLE_INTERVAL_MS 25
#define BLOCK_SAMPLES 20       // 20 x 25 ms = one 500 ms block
#define SETTLE_BLOCKS 4        // first 2 s discarded
#define TDS_WINDOW 6           // blocks compared for stability (3 s)
#define TDS_STABLE_MV 10       // spread allowed regardless of level
#define TDS_STABLE_FRAC 0.02f  // or 2% of the median, whichever is larger
#define TDS_TIMEOUT_MS 20000
#define TDS_FAULT_BLOCKS 6     // out-of-range for 3 s = sensor fault
#define K_VALUE 1.0f           // TDS calibration factor (still uncalibrated)
#define DEFAULT_TEMP_C 25.0f   // used for TDS compensation if the DS18B20 isn't connected
#define TDS_MIN_MV 20          // below this the TDS signal is effectively 0 V: probe/module fault
#define TDS_MAX_MV 2300        // above the module's rated output: fault

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

void setLights(uint8_t red, uint8_t yellow, uint8_t green) {
  ledcWrite(RED_PIN, red);
  ledcWrite(YELLOW_PIN, yellow);
  ledcWrite(GREEN_PIN, green);
}

// Green fade driven by elapsed time: repeats every PULSE_MS. Squaring the cosine
// compensates for the eye seeing brightness non-linearly.
void pulseGreen(uint32_t elapsedMs) {
  float phase = (elapsedMs % PULSE_MS) / (float)PULSE_MS;
  float b = (1.0f - cosf(phase * 2.0f * PI)) / 2.0f;
  setLights(0, 0, (uint32_t)(b * b * 255));
}

void showResult(Outcome o) {
  if (o == SETTLED) setLights(0, 0, 255);
  else if (o == UNSTABLE) setLights(0, 255, 0);
  else setLights(255, 0, 0);
  delay(RESULT_MS);
  setLights(0, 0, 0);
}

bool wasPressed(Button &b) {
  bool raw = digitalRead(b.pin);
  if (raw != b.lastRaw) {
    b.lastRaw = raw;
    b.changedAt = millis();
  }
  if (raw != b.state && millis() - b.changedAt >= DEBOUNCE_MS) {
    b.state = raw;
    return raw == b.pressedLevel;
  }
  return false;
}

Button tempBtn{TEMP_BTN_PIN};
Button tdsBtn{TDS_BTN_PIN};

int cmpU16(const void *a, const void *b) {
  return *(const uint16_t *)a - *(const uint16_t *)b;
}
int cmpFloat(const void *a, const void *b) {
  float d = *(const float *)a - *(const float *)b;
  return (d > 0) - (d < 0);
}

float medianF(const float *v, int n) {
  float c[16];
  memcpy(c, v, n * sizeof(float));
  qsort(c, n, sizeof(float), cmpFloat);
  return c[n / 2];
}

// Standard analog TDS conversion (DFRobot Gravity TDS), compensated to 25 C.
float tdsPpm(float volts, float tempC) {
  float coefficient = 1.0f + 0.02f * (tempC - 25.0f);
  float v = volts / coefficient;
  float ec = (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * K_VALUE;
  return ec * 0.5f;
}

bool validTemp(float t) {
  return t != DEVICE_DISCONNECTED_C && t != 85.0f;   // -127 = no answer, 85 = power-on default
}

// Pulses green for `ms` while waiting; `start` anchors the pulse phase.
void waitPulsing(uint32_t ms, uint32_t start) {
  uint32_t t0 = millis();
  while (millis() - t0 < ms) {
    pulseGreen(millis() - start);
    delay(5);
  }
}

// Waits until the last TEMP_WINDOW valid readings agree within TEMP_STABLE_C.
Outcome measureTemp(float &result) {
  float win[TEMP_WINDOW];
  int n = 0, badRun = 0;
  uint32_t start = millis();
  while (millis() - start < TEMP_TIMEOUT_MS) {
    sensors.requestTemperatures();
    waitPulsing(750, start);
    float t = sensors.getTempCByIndex(0);
    if (!validTemp(t)) {
      if (++badRun >= TEMP_FAULT_RUN) return FAULT;
      continue;
    }
    badRun = 0;
    if (n == TEMP_WINDOW) { memmove(win, win + 1, (TEMP_WINDOW - 1) * sizeof(float)); n--; }
    win[n++] = t;
    if (n == TEMP_WINDOW) {
      float lo = win[0], hi = win[0];
      for (int i = 1; i < n; i++) { lo = min(lo, win[i]); hi = max(hi, win[i]); }
      if (hi - lo <= TEMP_STABLE_C) { result = medianF(win, n); return SETTLED; }
    }
  }
  if (n == 0) return FAULT;
  result = medianF(win, n);
  return UNSTABLE;
}

// One 500 ms block of TDS samples, pulsing green; returns the median in millivolts.
uint16_t tdsBlockMv(uint32_t start) {
  uint16_t buf[BLOCK_SAMPLES];
  uint32_t blockStart = millis();
  for (int i = 0; i < BLOCK_SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(TDS_PIN);
    uint32_t next = blockStart + (i + 1) * SAMPLE_INTERVAL_MS;
    while ((int32_t)(millis() - next) < 0) {
      pulseGreen(millis() - start);
      delay(5);
    }
  }
  qsort(buf, BLOCK_SAMPLES, sizeof(buf[0]), cmpU16);
  return buf[BLOCK_SAMPLES / 2];
}

// Waits until the last TDS_WINDOW blocks agree. Temperature is read in the background the
// whole time, so the compensation uses the water temperature from the same moment.
Outcome measureTds(float &ppm, uint16_t &mvOut, float &tempOut, bool &tempOk) {
  float win[TDS_WINDOW];
  int n = 0, block = 0, outRun = 0;
  float latestTemp = DEFAULT_TEMP_C;
  bool haveTemp = false;
  uint32_t tempReqAt = millis();
  sensors.requestTemperatures();
  uint32_t start = millis();
  Outcome outcome = UNSTABLE;
  bool decided = false;
  while (!decided && millis() - start < TDS_TIMEOUT_MS) {
    uint16_t mv = tdsBlockMv(start);
    block++;
    if (millis() - tempReqAt >= 800) {          // conversion done; read it and start the next
      float t = sensors.getTempCByIndex(0);
      if (validTemp(t)) { latestTemp = t; haveTemp = true; }
      sensors.requestTemperatures();
      tempReqAt = millis();
    }
    outRun = (mv < TDS_MIN_MV || mv > TDS_MAX_MV) ? outRun + 1 : 0;
    if (outRun >= TDS_FAULT_BLOCKS) { outcome = FAULT; decided = true; mvOut = mv; break; }
    if (block <= SETTLE_BLOCKS) continue;
    if (n == TDS_WINDOW) { memmove(win, win + 1, (TDS_WINDOW - 1) * sizeof(float)); n--; }
    win[n++] = mv;
    if (n == TDS_WINDOW) {
      float lo = win[0], hi = win[0];
      for (int i = 1; i < n; i++) { lo = min(lo, win[i]); hi = max(hi, win[i]); }
      float med = medianF(win, n);
      if (hi - lo <= max((float)TDS_STABLE_MV, TDS_STABLE_FRAC * med)) {
        outcome = SETTLED; decided = true;
      }
    }
  }
  tempOut = latestTemp;
  tempOk = haveTemp;
  if (outcome == FAULT) return FAULT;
  if (n == 0) return FAULT;
  float med = medianF(win, n);
  mvOut = (uint16_t)med;
  if (mvOut < TDS_MIN_MV || mvOut > TDS_MAX_MV) return FAULT;
  ppm = tdsPpm(med / 1000.0f, latestTemp);
  return outcome;
}

void doTemp() {
  float tempC = 0;
  Outcome o = measureTemp(tempC);
  if (o == SETTLED) Serial.printf("TEMP: %.2f C\n", tempC);
  else if (o == UNSTABLE) Serial.printf("TEMP: %.1f C  UNSTABLE (did not settle, re-take)\n", tempC);
  else Serial.println("TEMP: SENSOR FAULT (no valid reading; check wiring and the 4.7k pull-up)");
  showResult(o);
}

void doTds() {
  float ppm = 0, tempC = 0;
  uint16_t mv = 0;
  bool tempOk = false;
  Outcome o = measureTds(ppm, mv, tempC, tempOk);
  if (o == FAULT) {
    Serial.println("TDS: SENSOR FAULT (signal missing or out of range; probe in air, unplugged or damaged)");
  } else {
    Serial.printf("TDS: %.0f ppm  (water %.1f C%s)%s\n", ppm, tempC, tempOk ? "" : " assumed",
                  o == UNSTABLE ? "  UNSTABLE (did not settle, re-take)" : "");
  }
  showResult(o);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // Weak internal pull-ups keep the lines from floating. A module with its own pull-down
  // resistor still wins (reads LOW at rest); an active-low module is held HIGH by them.
  pinMode(TEMP_BTN_PIN, INPUT_PULLUP);
  pinMode(TDS_BTN_PIN, INPUT_PULLUP);
  delay(50);
  for (Button *b : {&tempBtn, &tdsBtn}) {
    b->state = b->lastRaw = digitalRead(b->pin);
    b->pressedLevel = !b->state;
  }

  ledcAttach(RED_PIN, 5000, 8);
  ledcAttach(YELLOW_PIN, 5000, 8);
  ledcAttach(GREEN_PIN, 5000, 8);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  sensors.begin();
  sensors.setResolution(12);
  sensors.setWaitForConversion(false);

  // Light check at boot: red, yellow, green one after another, so wiring mistakes show up now.
  setLights(255, 0, 0); delay(300);
  setLights(0, 255, 0); delay(300);
  setLights(0, 0, 255); delay(300);
  setLights(0, 0, 0);

  Serial.printf("Ready. TEMP button GPIO %d (pressed = %s), TDS button GPIO %d (pressed = %s). Temperature probe %s.\n",
                TEMP_BTN_PIN, tempBtn.pressedLevel ? "HIGH" : "LOW", TDS_BTN_PIN, tdsBtn.pressedLevel ? "HIGH" : "LOW",
                sensors.getDeviceCount() > 0 ? "found" : "NOT found");
}

void loop() {
  if (wasPressed(tempBtn)) doTemp();
  if (wasPressed(tdsBtn)) doTds();
  delay(2);
}
