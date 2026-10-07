#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

#define SWITCH_1      27
#define SWITCH_2      14
#define SWITCH_3      12
#define SWITCH_4      26

#define RED_LED       33
#define YELLOW_LED    25
#define GREEN_LED     32
#define BUZZER        22

#define TEMP_PIN      21
#define PRESSURE_PIN  15
#define TDS_PIN       13
#define ZMPT_PIN      36

// ZMPT101B calibration
// Change this after calibration against a known AC voltage
float ZMPT_CALIBRATION = 1.0;

// DS18B20
OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);

  pinMode(SWITCH_1, INPUT);
  pinMode(SWITCH_2, INPUT);
  pinMode(SWITCH_3, INPUT);
  pinMode(SWITCH_4, INPUT);

  pinMode(PRESSURE_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);
  pinMode(ZMPT_PIN, INPUT);

  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER, LOW);

  analogReadResolution(12);

  sensors.begin();
}

void loop() {

  // --------------------------------
  // SWITCH VOLTAGES
  // --------------------------------

  float v1 = analogRead(SWITCH_1) * 3.3 / 4095.0;
  float v2 = analogRead(SWITCH_2) * 3.3 / 4095.0;
  float v3 = analogRead(SWITCH_3) * 3.3 / 4095.0;
  float v4 = analogRead(SWITCH_4) * 3.3 / 4095.0;

  int sw1 = (v1 < 0.3) ? 1 : 0;
  int sw2 = (v2 < 0.3) ? 1 : 0;
  int sw3 = (v3 < 0.3) ? 1 : 0;
  int sw4 = (v4 < 0.3) ? 1 : 0;

  // --------------------------------
  // TEMPERATURE
  // --------------------------------

  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);

  // --------------------------------
  // PRESSURE ADC
  // --------------------------------

  int pressureADC = analogRead(PRESSURE_PIN);

  // --------------------------------
  // TDS ADC
  // --------------------------------

  int tdsADC = analogRead(TDS_PIN);

  // --------------------------------
  // ZMPT101B AC RMS MEASUREMENT
  // --------------------------------

  const int samples = 500;

  float sum = 0;
  float sumSquares = 0;

  // First calculate the DC midpoint
  for (int i = 0; i < samples; i++) {
    int adc = analogRead(ZMPT_PIN);
    sum += adc;
    delayMicroseconds(200);
  }

  float averageADC = sum / samples;

  // Calculate AC RMS component
  for (int i = 0; i < samples; i++) {
    float adc = analogRead(ZMPT_PIN);
    float acComponent = adc - averageADC;

    sumSquares += acComponent * acComponent;

    delayMicroseconds(200);
  }

  float rmsADC = sqrt(sumSquares / samples);

  // Convert ADC RMS to voltage at ESP32 ADC pin
  float rmsADCVoltage = rmsADC * 3.3 / 4095.0;

  // Convert to actual AC input voltage
  float acVoltage = rmsADCVoltage * ZMPT_CALIBRATION;

  // --------------------------------
  // SERIAL OUTPUT
  // --------------------------------

  Serial.print(v1, 1);
  Serial.print(", ");

  Serial.print(v2, 1);
  Serial.print(", ");

  Serial.print(v3, 1);
  Serial.print(", ");

  Serial.print(v4, 1);
  Serial.print(", ");

  Serial.print(sw1);
  Serial.print(", ");

  Serial.print(sw2);
  Serial.print(", ");

  Serial.print(sw3);
  Serial.print(", ");

  Serial.print(sw4);
  Serial.print(", ");

  Serial.print(temperature, 1);
  Serial.print(", ");

  Serial.print(pressureADC);
  Serial.print(", ");

  Serial.print(tdsADC);
  Serial.print(", ");

  // Actual AC voltage
  Serial.println(acVoltage, 1);

  // --------------------------------
  // LEDs ON
  // --------------------------------

  digitalWrite(RED_LED, HIGH);
  digitalWrite(YELLOW_LED, HIGH);
  digitalWrite(GREEN_LED, HIGH);

  delay(500);

  // --------------------------------
  // LEDs OFF
  // --------------------------------

  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER, LOW);

  delay(200);
}
