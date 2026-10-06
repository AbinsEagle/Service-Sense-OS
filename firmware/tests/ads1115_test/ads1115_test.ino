// ADS1115 bench test: I2C scan, then read all four channels (single-ended) once a second.
// Wiring: VDD -> 3V3, GND -> GND, SDA -> GPIO 21, SCL -> GPIO 22, ADDR -> GND (address 0x48).
// Final channel use (see docs/PRD.md): A0 AC voltage, A1 TDS, A2 pressure, A3 battery.
//
// Bench check: tie one input to 3V3 (reads ~3.3 V) and one to GND (reads ~0 V). An input left
// floating drifts and reads noise; that is normal and not a fault.
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define ADS_ADDR 0x48          // ADDR pin to GND

Adafruit_ADS1115 ads;

// GAIN_ONE = +/-4.096 V full scale (0.125 mV per count). The ADS1115 is powered from 3.3 V
// and its inputs must not go above VDD + 0.3 V, so a +/-6.144 V range would be wasted.
// Revisit per channel when the real sensors are connected (ZMPT101B and pressure are 5 V parts).
#define ADS_GAIN GAIN_ONE

// Lists every device that answers on the I2C bus. If the ADS1115 doesn't show up at 0x48,
// this tells us whether the bus is dead (nothing found) or the address is wrong (found elsewhere).
void scanBus() {
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("I2C device at 0x%02X%s\n", addr, addr == ADS_ADDR ? "  <- ADS1115" : "");
      found++;
    }
  }
  if (found == 0) Serial.println("No I2C devices found: check SDA/SCL wiring, VDD and GND.");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin(SDA_PIN, SCL_PIN);
  scanBus();

  if (!ads.begin(ADS_ADDR, &Wire)) {
    Serial.printf("ADS1115 NOT found at 0x%02X. Halting; fix the wiring and reset.\n", ADS_ADDR);
    while (true) delay(1000);
  }
  ads.setGain(ADS_GAIN);
  ads.setDataRate(RATE_ADS1115_128SPS);   // default speed; one conversion takes ~8 ms
  Serial.println("ADS1115 ready.");
}

void loop() {
  for (int ch = 0; ch < 4; ch++) {
    int16_t raw = ads.readADC_SingleEnded(ch);   // blocks until the conversion finishes
    Serial.printf("A%d: %6d  %.4f V   ", ch, raw, ads.computeVolts(raw));
  }
  Serial.println();
  delay(1000);
}
