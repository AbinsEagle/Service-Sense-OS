// Service Sense OS main firmware: the electronics board's pin map, with the Service Sense OS measuring
// logic and Bluetooth (BLE) reporting on top. Pin map is taken unchanged from
// firmware/hardware_bringup (the hardware team's bring-up sketch).
//
// Four buttons, each runs one measurement entirely on the ESP32 and sends only the FINAL result
// (never raw samples) as one line of JSON over BLE, e.g.
//   {"dev":"F294","fw":"0.4.0","sensor":"TDS","value":58,"unit":"ppm","status":"settled","temp":25.3}
// The Bluetooth name is SSOS_B1.0; "dev" is the unit ID.
// status: settled / unstable / fault (value is null on a fault).
//   Button 1 TEMP  - waits until the DS18B20 reading levels off.
//   Button 2 TDS   - waits until the TDS signal levels off, compensated with the water temperature.
//   Button 3 VOLT  - 4 s of mains RMS (whole cycles); reports median plus min and max.
//   Button 4 PRESS - waits until the pressure signal levels off; reports bar.
// Lights: green pulses while measuring; steady green = settled, yellow = unstable (re-take),
// red = sensor fault. The buzzer beeps once (settled), twice (unstable) or long (fault).
//
// Buttons are read as analog voltages like the bring-up sketch: below 0.3 V = pressed.
//
// ASSUMPTIONS TO CONFIRM WITH THE HARDWARE TEAM (see the constants below):
//   - Pressure transducer (0.5-4.5 V = 0-1.2 MPa) reaches GPIO 15 through a 10k/15k divider.
//   - TDS and pressure go straight to the ESP32 ADC (no ADS1115 on this board).
//   - ZMPT101B uses the hardware team's calibration (ZMPT_CALIBRATION = 500, their library
//     sensitivity: volts = RMS volts at the pin x 500). Re-check against a multimeter.
//   - Mains is 50 or 60 Hz (a 100 ms window holds 5 or 6 whole cycles either way).
//   - Buzzer is an active buzzer (on when the pin is HIGH); LEDs are active-high.
// All thresholds are first guesses, to be tuned on real traces.
#include <OneWire.h>
#include <DallasTemperature.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

#define FW_VERSION "0.4.1"
#define BLE_SERVICE_UUID "6f1b0001-8c3a-4d7e-9a52-0b1d5c7e4a10"
#define BLE_READING_UUID "6f1b0002-8c3a-4d7e-9a52-0b1d5c7e4a10"
#define BLE_CHUNK 20           // bytes per notification: fits the default BLE packet size everywhere

// ---- Pin map (from the hardware team, unchanged) ----
#define SWITCH_1      27       // TEMP
#define SWITCH_2      14       // TDS
#define SWITCH_3      12       // VOLT  (GPIO 12 is a boot-strapping pin: do not hold it HIGH at power-up)
#define SWITCH_4      26       // PRESS
#define RED_LED       33
#define YELLOW_LED    25
#define GREEN_LED     32
#define BUZZER        22
#define TEMP_PIN      21       // DS18B20 data
#define PRESSURE_PIN  15       // ADC2 (needs Wi-Fi off, fine with BLE); boot-strapping pin
#define TDS_PIN       13       // ADC2
#define ZMPT_PIN      36       // ADC1, input only

#define BUTTON_PRESSED_MV 300  // below 0.3 V = pressed
#define DEBOUNCE_MS 30

#define RESULT_MS 3000         // how long the green / yellow / red result stays lit
#define PULSE_MS 1000          // one green fade in and out

// Temperature
#define TEMP_WINDOW 8          // readings compared for stability (8 x 750 ms = 6 s)
#define TEMP_STABLE_C 0.1f     // max spread across the window to count as settled
#define TEMP_TIMEOUT_MS 30000
#define TEMP_FAULT_RUN 3       // this many bad readings in a row = sensor fault
#define DEFAULT_TEMP_C 25.0f   // used for TDS compensation if the DS18B20 isn't connected

// Shared "wait until steady" analog measurement (TDS and pressure)
#define SAMPLE_INTERVAL_MS 25
#define BLOCK_SAMPLES 20       // 20 x 25 ms = one 500 ms block
#define SETTLE_BLOCKS 4        // first 2 s discarded
#define STEADY_WINDOW 6        // blocks compared for stability (3 s)
#define STEADY_FAULT_BLOCKS 6  // out-of-range for 3 s = sensor fault

// TDS
#define TDS_STABLE_MV 10       // spread allowed regardless of level
#define TDS_STABLE_FRAC 0.02f  // or 2% of the median, whichever is larger
#define TDS_TIMEOUT_MS 20000
#define K_VALUE 1.0f           // TDS calibration factor (still uncalibrated)
#define TDS_MIN_MV 20          // below this the signal is effectively 0 V: probe/module fault
#define TDS_MAX_MV 2300        // above the module's rated output: fault

// Pressure: 0.5-4.5 V = 0-1.2 MPa, through a divider (assumed 10k top / 15k bottom, ratio 0.6)
#define PRESS_DIVIDER_RATIO 0.6f
#define PRESS_V_ZERO 0.5f
#define PRESS_V_FULL 4.5f
#define PRESS_FULL_SCALE_MPA 1.2f
#define PRESS_ZERO_OFFSET_MPA 0.0f   // reading with the line open to air; set after bench check
#define PRESS_SPAN_FACTOR 1.0f       // set against a gauge at pressure
#define PRESS_MIN_SENSOR_V 0.4f      // below: signal/5 V/GND disconnected
#define PRESS_MAX_SENSOR_V 4.6f      // above: outside the transducer's range
#define PRESS_STABLE_MV 10
#define PRESS_STABLE_FRAC 0.01f
#define PRESS_TIMEOUT_MS 20000

// Voltage (ZMPT101B)
#define ZMPT_CALIBRATION 500.0f      // volts of mains per volt RMS at the pin; hardware team calibrated against mains (their ZMPT101B sensitivity = 500)
#define VOLT_WINDOW_SAMPLES 500      // 500 x 200 us = 100 ms = whole mains cycles at 50 and 60 Hz
#define VOLT_SAMPLE_US 200
#define VOLT_WINDOWS 40              // 40 x 100 ms = 4 s
#define VOLT_MIN_RMS_MV 20           // below this no AC is seen (= 10 V at the calibrated gain, same as the hardware team's cutoff)
#define VOLT_CLIP_LOW_MV 40          // samples this close to the rails = clipping = fault
#define VOLT_CLIP_HIGH_MV 3100
#define VOLT_STABLE_FRAC 0.05f       // spread (max-min) within 5% of the median = settled

enum Outcome { SETTLED, UNSTABLE, FAULT };

struct Button {
  uint8_t pin;
  bool pressed = false;    // debounced
  bool lastRaw = false;
  uint32_t changedAt = 0;
};

BLECharacteristic *readingChar = nullptr;
volatile bool bleConnected = false;
#define BLE_NAME "SSOS_B1.0"   // advertised Bluetooth name (the same on every unit)
char deviceId[8];              // per-unit ID from the chip MAC, sent in every message as "dev"

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { bleConnected = true; }
  void onDisconnect(BLEServer *) override {
    bleConnected = false;
    BLEDevice::startAdvertising();   // let the phone/laptop reconnect
  }
};

// Sends one result as a JSON line, split into small notifications (the receiver joins them
// until the newline). `extra` is pre-formatted extra fields starting with a comma, or "".
// Nothing is queued if nobody is connected, as the PRD specifies.
void sendReading(const char *sensor, bool haveValue, float value, int decimals, const char *unit,
                 const char *status, const char *extra) {
  if (!bleConnected) return;
  char val[16] = "null";
  if (haveValue) snprintf(val, sizeof val, "%.*f", decimals, value);
  char msg[256];
  int len = snprintf(msg, sizeof msg,
                     "{\"dev\":\"%s\",\"fw\":\"%s\",\"sensor\":\"%s\",\"value\":%s,\"unit\":\"%s\",\"status\":\"%s\"%s}\n",
                     deviceId, FW_VERSION, sensor, val, unit, status, extra);
  if (len >= (int)sizeof msg) len = sizeof msg - 1;
  for (int i = 0; i < len; i += BLE_CHUNK) {
    readingChar->setValue((uint8_t *)(msg + i), min(BLE_CHUNK, len - i));
    readingChar->notify();
    delay(10);
  }
}

const char *statusText(Outcome o) {
  return o == SETTLED ? "settled" : o == UNSTABLE ? "unstable" : "fault";
}

OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

void setLights(uint8_t red, uint8_t yellow, uint8_t green) {
  ledcWrite(RED_LED, red);
  ledcWrite(YELLOW_LED, yellow);
  ledcWrite(GREEN_LED, green);
}

// Green fade driven by elapsed time: repeats every PULSE_MS. Squaring the cosine
// compensates for the eye seeing brightness non-linearly.
void pulseGreen(uint32_t elapsedMs) {
  float phase = (elapsedMs % PULSE_MS) / (float)PULSE_MS;
  float b = (1.0f - cosf(phase * 2.0f * PI)) / 2.0f;
  setLights(0, 0, (uint32_t)(b * b * 255));
}

void beep(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(ms);
    digitalWrite(BUZZER, LOW);
    delay(ms);
  }
}

void showResult(Outcome o) {
  if (o == SETTLED) setLights(0, 0, 255);
  else if (o == UNSTABLE) setLights(0, 255, 0);
  else setLights(255, 0, 0);
  uint32_t t0 = millis();
  if (o == SETTLED) beep(1, 100);
  else if (o == UNSTABLE) beep(2, 100);
  else beep(1, 500);
  uint32_t used = millis() - t0;
  delay(used < RESULT_MS ? RESULT_MS - used : 0);
  setLights(0, 0, 0);
}

bool wasPressed(Button &b) {
  bool raw = analogReadMilliVolts(b.pin) < BUTTON_PRESSED_MV;
  if (raw != b.lastRaw) {
    b.lastRaw = raw;
    b.changedAt = millis();
  }
  if (raw != b.pressed && millis() - b.changedAt >= DEBOUNCE_MS) {
    b.pressed = raw;
    return raw;
  }
  return false;
}

Button btnTemp{SWITCH_1}, btnTds{SWITCH_2}, btnVolt{SWITCH_3}, btnPress{SWITCH_4};

int cmpU16(const void *a, const void *b) {
  return *(const uint16_t *)a - *(const uint16_t *)b;
}
int cmpFloat(const void *a, const void *b) {
  float d = *(const float *)a - *(const float *)b;
  return (d > 0) - (d < 0);
}

float medianF(const float *v, int n) {
  float c[VOLT_WINDOWS];             // largest window used anywhere
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

// One 500 ms block of samples on `pin`, pulsing green; returns the median in millivolts.
uint16_t blockMv(int pin, uint32_t start) {
  uint16_t buf[BLOCK_SAMPLES];
  uint32_t blockStart = millis();
  for (int i = 0; i < BLOCK_SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(pin);
    uint32_t next = blockStart + (i + 1) * SAMPLE_INTERVAL_MS;
    while ((int32_t)(millis() - next) < 0) {
      pulseGreen(millis() - start);
      delay(5);
    }
  }
  qsort(buf, BLOCK_SAMPLES, sizeof(buf[0]), cmpU16);
  return buf[BLOCK_SAMPLES / 2];
}

// Waits until the last STEADY_WINDOW blocks agree within max(stableMv, stableFrac * median).
// Result is the median pin millivolts. If trackTemp, the water temperature is read in the
// background the whole time (latestTemp / haveTemp) for TDS compensation.
float latestTemp = DEFAULT_TEMP_C;
bool haveTemp = false;

Outcome measureSteady(int pin, int minMv, int maxMv, float stableMv, float stableFrac,
                      uint32_t timeoutMs, bool trackTemp, float &medMv) {
  float win[STEADY_WINDOW];
  int n = 0, block = 0, outRun = 0;
  latestTemp = DEFAULT_TEMP_C;
  haveTemp = false;
  uint32_t tempReqAt = millis();
  if (trackTemp) sensors.requestTemperatures();
  uint32_t start = millis();
  Outcome outcome = UNSTABLE;
  while (millis() - start < timeoutMs) {
    uint16_t mv = blockMv(pin, start);
    block++;
    if (trackTemp && millis() - tempReqAt >= 800) {   // conversion done; read it, start the next
      float t = sensors.getTempCByIndex(0);
      if (validTemp(t)) { latestTemp = t; haveTemp = true; }
      sensors.requestTemperatures();
      tempReqAt = millis();
    }
    outRun = (mv < minMv || mv > maxMv) ? outRun + 1 : 0;
    if (outRun >= STEADY_FAULT_BLOCKS) return FAULT;
    if (block <= SETTLE_BLOCKS) continue;
    if (n == STEADY_WINDOW) { memmove(win, win + 1, (STEADY_WINDOW - 1) * sizeof(float)); n--; }
    win[n++] = mv;
    if (n == STEADY_WINDOW) {
      float lo = win[0], hi = win[0];
      for (int i = 1; i < n; i++) { lo = min(lo, win[i]); hi = max(hi, win[i]); }
      float med = medianF(win, n);
      if (hi - lo <= max(stableMv, stableFrac * med)) { medMv = med; outcome = SETTLED; break; }
    }
  }
  if (outcome != SETTLED) {
    if (n == 0) return FAULT;
    medMv = medianF(win, n);
  }
  if (medMv < minMv || medMv > maxMv) return FAULT;
  return outcome;
}

void doTemp() {
  float tempC = 0;
  Outcome o = measureTemp(tempC);
  if (o == SETTLED) Serial.printf("TEMP: %.2f C\n", tempC);
  else if (o == UNSTABLE) Serial.printf("TEMP: %.1f C  UNSTABLE (did not settle, re-take)\n", tempC);
  else Serial.println("TEMP: SENSOR FAULT (no valid reading; check wiring and the 4.7k pull-up)");
  sendReading("TEMP", o != FAULT, tempC, 2, "C", statusText(o), "");
  showResult(o);
}

void doTds() {
  float mv = 0;
  Outcome o = measureSteady(TDS_PIN, TDS_MIN_MV, TDS_MAX_MV, TDS_STABLE_MV, TDS_STABLE_FRAC,
                            TDS_TIMEOUT_MS, true, mv);
  float ppm = (o == FAULT) ? 0 : tdsPpm(mv / 1000.0f, latestTemp);
  char extra[32] = "";
  if (o != FAULT && haveTemp) snprintf(extra, sizeof extra, ",\"temp\":%.1f", latestTemp);
  if (o == FAULT) {
    Serial.println("TDS: SENSOR FAULT (signal missing or out of range; probe in air, unplugged or damaged)");
  } else {
    Serial.printf("TDS: %.0f ppm  (water %.1f C%s)%s\n", ppm, latestTemp, haveTemp ? "" : " assumed",
                  o == UNSTABLE ? "  UNSTABLE (did not settle, re-take)" : "");
  }
  sendReading("TDS", o != FAULT, ppm, 0, "ppm", statusText(o), extra);
  showResult(o);
}

void doPressure() {
  float mv = 0;
  const int minMv = (int)(PRESS_MIN_SENSOR_V * PRESS_DIVIDER_RATIO * 1000);
  const int maxMv = (int)(PRESS_MAX_SENSOR_V * PRESS_DIVIDER_RATIO * 1000);
  Outcome o = measureSteady(PRESSURE_PIN, minMv, maxMv, PRESS_STABLE_MV, PRESS_STABLE_FRAC,
                            PRESS_TIMEOUT_MS, false, mv);
  float bar = 0;
  if (o != FAULT) {
    float sensorV = (mv / 1000.0f) / PRESS_DIVIDER_RATIO;
    float mpa = ((sensorV - PRESS_V_ZERO) / (PRESS_V_FULL - PRESS_V_ZERO) * PRESS_FULL_SCALE_MPA
                 - PRESS_ZERO_OFFSET_MPA) * PRESS_SPAN_FACTOR;
    bar = mpa * 10.0f;
    Serial.printf("PRESS: %.2f bar  (sensor %.3f V)%s\n", bar, sensorV,
                  o == UNSTABLE ? "  UNSTABLE (did not settle, re-take)" : "");
  } else {
    Serial.println("PRESS: SENSOR FAULT (signal outside 0.4-4.6 V; check 5 V, GND, signal wire and divider)");
  }
  sendReading("PRESS", o != FAULT, bar, 2, "bar", statusText(o), "");
  showResult(o);
}

// One 100 ms window of the ZMPT signal: RMS of the AC part, in millivolts at the pin.
// Sets `clipped` if any sample touches the ADC rails.
float zmptWindowRmsMv(bool &clipped) {
  static uint16_t s[VOLT_WINDOW_SAMPLES];
  uint32_t next = micros();
  for (int i = 0; i < VOLT_WINDOW_SAMPLES; i++) {
    s[i] = analogReadMilliVolts(ZMPT_PIN);
    next += VOLT_SAMPLE_US;
    while ((int32_t)(micros() - next) < 0) {}
  }
  float sum = 0;
  for (int i = 0; i < VOLT_WINDOW_SAMPLES; i++) {
    sum += s[i];
    if (s[i] < VOLT_CLIP_LOW_MV || s[i] > VOLT_CLIP_HIGH_MV) clipped = true;
  }
  float mean = sum / VOLT_WINDOW_SAMPLES, sq = 0;
  for (int i = 0; i < VOLT_WINDOW_SAMPLES; i++) {
    float d = s[i] - mean;
    sq += d * d;
  }
  return sqrtf(sq / VOLT_WINDOW_SAMPLES);
}

void doVoltage() {
  float rms[VOLT_WINDOWS];
  bool clipped = false;
  uint32_t start = millis();
  for (int i = 0; i < VOLT_WINDOWS; i++) {
    rms[i] = zmptWindowRmsMv(clipped);
    pulseGreen(millis() - start);
  }
  float lo = rms[0], hi = rms[0];
  for (int i = 1; i < VOLT_WINDOWS; i++) { lo = min(lo, rms[i]); hi = max(hi, rms[i]); }
  float med = medianF(rms, VOLT_WINDOWS);
  Outcome o;
  if (clipped || med < VOLT_MIN_RMS_MV) o = FAULT;
  else o = (hi - lo <= VOLT_STABLE_FRAC * med) ? SETTLED : UNSTABLE;

  const float k = ZMPT_CALIBRATION / 1000.0f;       // mV at the pin -> volts
  float v = med * k, vMin = lo * k, vMax = hi * k;
  char extra[64] = "";
  if (o != FAULT) snprintf(extra, sizeof extra, ",\"min\":%.1f,\"max\":%.1f%s", vMin, vMax,
                           ZMPT_CALIBRATION == 1.0f ? ",\"cal\":false" : "");
  if (o == FAULT) {
    Serial.println(clipped ? "VOLT: SENSOR FAULT (signal clipping: check ZMPT gain and 3.3 V range)"
                           : "VOLT: SENSOR FAULT (no AC signal: check ZMPT wiring and that mains is present)");
  } else {
    Serial.printf("VOLT: %.1f V  (min %.1f, max %.1f)%s%s\n", v, vMin, vMax,
                  ZMPT_CALIBRATION == 1.0f ? "  UNCALIBRATED" : "",
                  o == UNSTABLE ? "  UNSTABLE (supply varies)" : "");
  }
  sendReading("VOLT", o != FAULT, v, 1, "V", statusText(o), extra);
  showResult(o);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  for (int p : {SWITCH_1, SWITCH_2, SWITCH_3, SWITCH_4, PRESSURE_PIN, TDS_PIN, ZMPT_PIN}) {
    pinMode(p, INPUT);
    analogSetPinAttenuation(p, ADC_11db);   // 0 to ~3.1 V input range
  }

  ledcAttach(RED_LED, 5000, 8);
  ledcAttach(YELLOW_LED, 5000, 8);
  ledcAttach(GREEN_LED, 5000, 8);

  sensors.begin();
  sensors.setResolution(12);
  sensors.setWaitForConversion(false);

  // Light check at boot: red, yellow, green one after another, so wiring mistakes show up now.
  setLights(255, 0, 0); delay(300);
  setLights(0, 255, 0); delay(300);
  setLights(0, 0, 255); delay(300);
  setLights(0, 0, 0);

  // Bluetooth name is fixed (BLE_NAME); the unit is told apart by the last two MAC bytes.
  uint64_t mac = ESP.getEfuseMac();
  snprintf(deviceId, sizeof deviceId, "%02X%02X", (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  BLEDevice::init(BLE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(BLE_SERVICE_UUID);
  readingChar = service->createCharacteristic(BLE_READING_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  readingChar->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.printf("Bluetooth name: %s  unit %s  firmware %s\n", BLE_NAME, deviceId, FW_VERSION);
  Serial.printf("Ready. Buttons: 1 TEMP, 2 TDS, 3 VOLT, 4 PRESS. Temperature probe %s.\n",
                sensors.getDeviceCount() > 0 ? "found" : "NOT found");
}

void loop() {
  if (wasPressed(btnTemp)) doTemp();
  if (wasPressed(btnTds)) doTds();
  if (wasPressed(btnVolt)) doVoltage();
  if (wasPressed(btnPress)) doPressure();
  delay(2);
}
