# Pin map — ESP32 DevKitC (ESP32-WROOM-32)

Reserved up front so each sensor can be added without re-wiring earlier ones.
Avoided: strapping pins (0, 2, 5, 12, 15), flash pins (6–11), and input-only
pins 34–39 for anything that needs an internal pull-up.

| Function | GPIO | Notes | Status |
|---|---|---|---|
| DS18B20 data (1-Wire) | 4 | 4.7kΩ pull-up to 3.3V | wiring |
| I2C SDA (ADS1115) | 21 | ESP32 default SDA | planned |
| I2C SCL (ADS1115) | 22 | ESP32 default SCL | planned |
| WS2812B data (RGB1 → RGB2 chained) | 16 | | planned |
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
