// Hardware check for the wired bench: run this first to see that every input and output
// responds, before using the full temp_tds_buttons sketch.
//   - Boot: traffic light cycles red, yellow, green.
//   - Buttons 1-4 (GPIO 32, 25, 26, 27): every change is printed with the raw level, so you
//     can see whether a press reads HIGH or LOW. While a button is held its light turns on:
//     1 = red, 2 = yellow, 3 = green, 4 = all three.
//   - Every 2 s: DS18B20 temperature and TDS signal (raw millivolts) are printed.
// Wiring: tactile module V -> 3V3, G -> GND, 1..4 -> GPIO 32/25/26/27.
//         Traffic light R -> GPIO 23, Y -> GPIO 18, G -> GPIO 19, GND -> GND.
//         DS18B20 data GPIO 4 (4.7k to 3V3), TDS signal GPIO 34.
#include <OneWire.h>
#include <DallasTemperature.h>

const uint8_t BTN_PINS[4] = {32, 25, 26, 27};
#define RED_PIN 23
#define YELLOW_PIN 18
#define GREEN_PIN 19
#define TDS_PIN 34
#define ONE_WIRE_PIN 4

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

bool lastLevel[4];
bool restLevel[4];      // level at boot with nothing pressed
bool held[4];
uint32_t lastReport = 0;

void lights(bool r, bool y, bool g) {
  digitalWrite(RED_PIN, r);
  digitalWrite(YELLOW_PIN, y);
  digitalWrite(GREEN_PIN, g);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(RED_PIN, OUTPUT);
  pinMode(YELLOW_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  // Pull-ups keep an unconnected line from floating; a module with its own resistors still wins.
  for (int i = 0; i < 4; i++) pinMode(BTN_PINS[i], INPUT_PULLUP);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);
  sensors.begin();

  lights(1, 0, 0); delay(400);
  lights(0, 1, 0); delay(400);
  lights(0, 0, 1); delay(400);
  lights(0, 0, 0);

  for (int i = 0; i < 4; i++) {
    lastLevel[i] = restLevel[i] = digitalRead(BTN_PINS[i]);
  }
  Serial.println("--- hardware check ---");
  Serial.printf("Temperature probe: %s\n", sensors.getDeviceCount() > 0 ? "found" : "NOT found");
  for (int i = 0; i < 4; i++)
    Serial.printf("Button %d (GPIO %d) rests at %s\n", i + 1, BTN_PINS[i], restLevel[i] ? "HIGH" : "LOW");
  Serial.println("Press each button; the line level is printed when it changes.");
}

void loop() {
  for (int i = 0; i < 4; i++) {
    bool level = digitalRead(BTN_PINS[i]);
    if (level != lastLevel[i]) {
      delay(20);                              // let contact bounce settle
      level = digitalRead(BTN_PINS[i]);
      if (level != lastLevel[i]) {
        lastLevel[i] = level;
        held[i] = level != restLevel[i];
        Serial.printf("Button %d (GPIO %d): %s -> %s\n", i + 1, BTN_PINS[i],
                      held[i] ? "pressed" : "released", level ? "HIGH" : "LOW");
      }
    }
  }
  lights(held[0] || held[3], held[1] || held[3], held[2] || held[3]);

  if (millis() - lastReport >= 2000) {
    lastReport = millis();
    sensors.requestTemperatures();
    delay(750);
    float t = sensors.getTempCByIndex(0);
    uint32_t mv = 0;
    for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(TDS_PIN);
    mv /= 16;
    if (t == DEVICE_DISCONNECTED_C) Serial.printf("Temp: NO SENSOR   TDS signal: %u mV\n", mv);
    else Serial.printf("Temp: %.2f C   TDS signal: %u mV\n", t, mv);
  }
}
