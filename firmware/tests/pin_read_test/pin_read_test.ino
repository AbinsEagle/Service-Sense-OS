// Simplest possible input check: print what GPIO 35 sees, raw and in millivolts.
// Signal must go through the 10k/15k divider; never connect the sensor wire straight to the pin.
#define PIN 35

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PIN, ADC_11db);   // read up to ~3.1 V
}

void loop() {
  Serial.printf("raw %4d   pin %4d mV\n", analogRead(PIN), analogReadMilliVolts(PIN));
  delay(300);
}
