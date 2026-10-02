# Pin map — NodeMCU ESP-32S V1.1 (38-pin)

The bench board is a NodeMCU ESP-32S V1.1 (ESP-WROOM-32-class module,
micro-USB, EN and IO0 buttons, blue LED on GPIO 2). Its header order is
identical to the ESP32 DevKitC V4, so firmware and GPIO numbers are unchanged.
Pin labels are printed **on the back only**, with a `P` prefix (`P4` = GPIO 4);
the flash pins read `SD0`–`SD3`, `CLK`, `CMD`, and GPIO 36/39 read `SVP`/`SVN`.

| Left header (front view, top → bottom) | Right header (front view, top → bottom) |
|---|---|
| 3V3, EN, SVP, SVN, P34, P35, P32, P33, P25, P26, P27, P14, P12, GND, P13, SD2, SD3, CMD, 5V | GND, P23, P22, TX, RX, P21, GND, P19, P18, P5, P17, P16, P4, P0, P2, P15, SD1, SD0, CLK |

Seen from the back (where the labels are), the two columns swap sides.

Graphical version: open `docs/pinmap.html` in a browser (click any pin for details).
Full circuit (power, ADS1115, all sensors): `docs/wiring.html`.
Reserved up front so each sensor can be added without re-wiring earlier ones.
Avoided: strapping pins (0, 2, 5, 12, 15), flash pins (6–11), and input-only
pins 34–39 for anything that needs an internal pull-up.

| Function | GPIO | Board label | Notes | Status |
|---|---|---|---|---|
| DS18B20 data (1-Wire) | 4 | P4 | 4.7kΩ pull-up to 3.3V | wired, reading |
| TDS signal (bench only; moves to ADS1115 A1) | 34 | P34 | ADC1_CH6, input only | wired |
| Pressure signal (bench only, via 10k/15k divider; moves to ADS1115 A2) | 35 | P35 | ADC1_CH7, input only | planned |
| I2C SDA (ADS1115) | 21 | P21 | ESP32 default SDA | planned |
| I2C SCL (ADS1115) | 22 | P22 | ESP32 default SCL | planned |
| WS2812B data (RGB1 → RGB2 chained) | 16 | P16 | | planned |
| POWER button | 33 | P33 | RTC GPIO, wakes from deep sleep (ext0) | planned |
| TEMP button | 32 | P32 | RTC GPIO | planned |
| TDS button | 25 | P25 | RTC GPIO | planned |
| VOLT button | 26 | P26 | RTC GPIO | planned |
| PRESS button | 27 | P27 | RTC GPIO | planned |

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

## Pressure transducer wiring (bench)

| Transducer wire | Connect to |
|---|---|
| Red (+5V) | 5V pin (left header, last pin) |
| Black (GND) | GND |
| Yellow (signal) | 10kΩ → GPIO 35; 15kΩ from GPIO 35 to GND |

The divider scales 0.5–4.5V to 0.3–2.7V. Never connect the signal straight
to a GPIO.
