# Pin map — ESP32 DevKitC (ESP32-WROOM-32)


Graphical version: open `docs/pinmap.html` in a browser (click any pin for details).
Reserved up front so each sensor can be added without re-wiring earlier ones.
Avoided: strapping pins (0, 2, 5, 12, 15), flash pins (6–11), and input-only
pins 34–39 for anything that needs an internal pull-up.

| Function | GPIO | Notes | Status |
|---|---|---|---|
| DS18B20 data (1-Wire) | 4 | 4.7kΩ pull-up to 3.3V | wired, reading |
| TDS signal (bench only; moves to ADS1115 A1) | 34 | ADC1_CH6, input only | wired |
| Pressure signal (bench only; moves to ADS1115 A2) | 35 | ADC1_CH7, input only, via 10k/15k divider | planned |
| I2C SDA (ADS1115) | 21 | ESP32 default SDA | planned |
| I2C SCL (ADS1115) | 22 | ESP32 default SCL | planned |
| WS2812B data (RGB1 → RGB2 chained) | 16 | | planned |
| Traffic light RED | 23 | LED module R pin, active high | planned |
| Traffic light GREEN | 19 | LED module G pin, pulses while measuring | planned |
| Traffic light YELLOW | 18 | LED module Y pin (reserved for alerts) | planned |
| POWER button | 33 | RTC GPIO, wakes from deep sleep (ext0) | planned |
| TEMP button | 32 | RTC GPIO | planned |
| TDS button | 25 | RTC GPIO | planned |
| VOLT button | 26 | RTC GPIO | planned |
| PRESS button | 27 | RTC GPIO | planned |

ADS1115 channels: A0 voltage (ZMPT101B), A1 TDS, A2 pressure, A3 battery.

## DS18B20 wiring
Waterproof probe wire colours (most common; check your probe's listing):

| Probe wire | Connect to |
|---|---|
| Red (VDD) | 3V3 |
| Black (GND) | GND |
| Yellow/white (DATA) | GPIO 4, plus 4.7kΩ resistor from GPIO 4 to 3V3 |

Power the probe from 3.3V, not 5V, so the data line never exceeds the
ESP32's 3.3V logic level.

## TDS module wiring (bench)

| Module pin | Connect to |
|---|---|
| + (VCC) | 3V3 |
| A (signal) | GPIO 34 |
| − (GND) | GND |

Power the module from 3V3 so its output stays inside the ESP32 ADC range.

## ADS1115 wiring (bench)

| ADS1115 pin | Connect to |
|---|---|
| VDD | 3V3 |
| GND | GND |
| SCL | GPIO 22 |
| SDA | GPIO 21 |
| ADDR | GND (I2C address 0x48) |
| ALERT/RDY | not connected |
| A0–A3 | unused for now. For the bench check, tie one to 3V3 and one to GND. |

## Pressure transducer wiring (bench)

0.5–4.5 V, 0–1.2 MPa, 5 V part. Colours below are typical; check the sensor's label.

| Transducer wire | Connect to |
|---|---|
| +5V (red) | 5V pin |
| GND (black) | GND |
| Signal (yellow) | 10kΩ → GPIO 35, with 15kΩ from GPIO 35 to GND |

Resistor colour bands (first band is the one closest to an end):

| Value | 4-band ±5% | 5-band ±1% |
|---|---|---|
| 10kΩ (R1, signal side) | brown, black, orange, gold | brown, black, black, red, brown |
| 15kΩ (R2, to GND) | brown, green, orange, gold | brown, green, black, red, brown |

The divider (ratio 0.6) turns 0.5–4.5 V into 0.30–2.70 V so the ESP32 pin never sees more
than 3.3 V. Never connect the signal wire straight to a GPIO. Test sketch:
`firmware/tests/pressure_test`.

## Traffic light LED module
4-pin module (GND, R, Y, G, signal output, has its own resistors). Test sketch: `firmware/tests/temp_tds_buttons`.

| Module pin | Connect to |
|---|---|
| GND | GND |
| R | GPIO 23 |
| Y | GPIO 18 |
| G | GPIO 19 |

Green pulses while a 5 s reading is taken, then stays on for 3 s. Red means the sensor is not working. Yellow is kept off for now (alerts later).

## 4-button tactile module (pins V, G, 1, 2, 3, 4)
Four tactile buttons on one board. Power it from 3V3 so the outputs are 3.3 V. The sketch detects at boot whether a press reads HIGH or LOW, so don't press anything while it starts.

| Module pin | Connect to |
|---|---|
| V | 3V3 (not 5V) |
| G | GND |
| 1 (TEMP) | GPIO 32 |
| 2 (TDS) | GPIO 25 |
| 3 / 4 | GPIO 26 / 27 later (VOLT / PRESS) |
