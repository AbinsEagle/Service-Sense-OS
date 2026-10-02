// Pressure bench test: 0.5-4.5 V transducer (0-1.2 MPa) on GPIO 35 through a voltage divider.
// Bench wiring only. In the final device the signal goes to ADS1115 A2 (see docs/PRD.md).
//
// Wiring (transducer is a 5 V part, so it is powered from the board's 5V pin, NOT 3V3):
//   transducer +5V     -> 5V pin (USB 5 V)
//   transducer GND     -> GND
//   transducer signal  -> R1 10k -> GPIO 35 -> R2 15k -> GND      (divider ratio 0.6)
//   optional: 100 nF from GPIO 35 to GND to smooth ADC noise
//
// Why the divider: the transducer outputs up to 4.5 V but the ESP32 input tolerates 3.3 V max.
// With 10k/15k, 0.5-4.5 V becomes 0.30-2.70 V, inside the ADC's ~3.1 V range, and the same
// resistor pair as the battery divider so one value covers both. Never connect the signal wire
// straight to a GPIO.
#include <Arduino.h>

#define PRESSURE_PIN 35        // ADC1_CH7, input only
#define LED_PIN 2              // onboard blue LED, blinks briefly per reading

#define SAMPLES 30             // median of 30 reads rejects ADC outliers
#define SAMPLE_INTERVAL_MS 10

#define R1_OHMS 10000.0f       // divider top (signal side)
#define R2_OHMS 15000.0f       // divider bottom (to GND)
#define DIVIDER_RATIO (R2_OHMS / (R1_OHMS + R2_OHMS))   // = 0.6

// Transducer transfer function: linear, 0.5 V = 0 MPa, 4.5 V = full scale.
#define V_AT_ZERO 0.5f
#define V_AT_FULL 4.5f
#define FULL_SCALE_MPA 1.2f
// Adjust after checking against a gauge: ZERO_OFFSET_MPA is the reading with the line open to air
// (subtracted from every reading); SPAN_FACTOR scales the result to match the gauge at pressure.
#define ZERO_OFFSET_MPA 0.0f
#define SPAN_FACTOR 1.0f

int cmpU16(const void *a, const void *b) {
  return *(const uint16_t *)a - *(const uint16_t *)b;
}

// Median of SAMPLES reads, in millivolts at the GPIO pin (analogReadMilliVolts applies the
// chip's factory ADC calibration).
uint16_t readPinMilliVolts() {
  uint16_t buf[SAMPLES];
  for (int i = 0; i < SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(PRESSURE_PIN);
    delay(SAMPLE_INTERVAL_MS);
  }
  qsort(buf, SAMPLES, sizeof(buf[0]), cmpU16);
  return buf[SAMPLES / 2];
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(LED_PIN, OUTPUT);
  analogSetPinAttenuation(PRESSURE_PIN, ADC_11db);   // 0 to ~3.1 V input range
  Serial.printf("Pressure test: signal on GPIO %d, divider ratio %.2f\n", PRESSURE_PIN, DIVIDER_RATIO);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  uint16_t pinMv = readPinMilliVolts();
  digitalWrite(LED_PIN, LOW);

  // Undo the divider to get the transducer's own output voltage.
  float sensorV = (pinMv / 1000.0f) / DIVIDER_RATIO;

  // A healthy transducer never goes below ~0.5 V. Well under that means the signal wire, the
  // 5 V supply or the ground is disconnected, so say so instead of printing a fake pressure.
  if (sensorV < 0.4f) {
    Serial.printf("Pressure: -- (sensor %.2f V: below 0.5 V, check 5V, GND and signal wiring)\n", sensorV);
  } else {
    float mpa = ((sensorV - V_AT_ZERO) / (V_AT_FULL - V_AT_ZERO) * FULL_SCALE_MPA - ZERO_OFFSET_MPA) * SPAN_FACTOR;
    Serial.printf("Pressure: %.3f MPa  %.2f bar  %.1f psi   (sensor %.3f V, pin %u mV)\n",
                  mpa, mpa * 10.0f, mpa * 145.038f, sensorV, pinMv);
    if (sensorV > 4.6f) Serial.println("WARN: sensor above 4.6 V, outside the transducer's range.");
  }
  delay(700);
}
