# Pin map — hardware team's board (ESP32, 38-pin)

This is the pin map the firmware (`firmware/ssos_main`) uses. It comes from the hardware
team's bring-up sketch (`firmware/hardware_bringup`, updated 2026-10-10); GPIO numbers are
the same in both. It replaces the earlier bench map (NodeMCU ESP-32S, ADS1115).
Items marked *to confirm* are assumptions listed in `docs/hardware-review.md`.

| Function | GPIO | Notes |
|---|---|---|
| TEMP button (SWITCH_1) | 27 | Active low, read as an ADC voltage: below 0.3 V = pressed |
| TDS button (SWITCH_2) | 14 | Same. Outputs a PWM signal for a moment at boot |
| VOLT button (SWITCH_3) | 12 | Same. **Boot-strapping pin: must not be held HIGH at power-up** |
| PRESS button (SWITCH_4) | 26 | Same |
| Traffic light RED | 33 | Active high |
| Traffic light YELLOW | 25 | Active high (unstable result) |
| Traffic light GREEN | 32 | Active high (pulses while measuring, then settled) |
| Buzzer | 22 | Active buzzer assumed (*to confirm*) |
| DS18B20 data (1-Wire) | 21 | 4.7 kΩ pull-up to 3V3 |
| Pressure signal | 15 | Direct ESP32 ADC (ADC2) through a 10k/15k divider (*to confirm*). **Boot-strapping pin** |
| TDS signal | 13 | Direct ESP32 ADC (ADC2), module powered from 3V3 |
| ZMPT101B (mains voltage) | 36 | ADC1, input only (labelled SVP on some boards) |

## Notes
- **No ADS1115, no I2C.** Every analog signal goes straight to the ESP32 ADC. The old
  bench plan (ADS1115 on GPIO 21/22) no longer applies; GPIO 21 is now the DS18B20 pin.
- **ADC2 pins** (12, 13, 14, 15, 25, 26, 27) cannot be read while Wi-Fi is on. The firmware
  uses Bluetooth only, so this is fine.
- **Strapping pins** 12 and 15 affect boot. Nothing may drive them HIGH while the board
  powers up.
- **Pin attenuation:** the firmware sets 11 dB (about 0 to 3.1 V) on all analog inputs.

## Sensor wiring
- **DS18B20:** red to 3V3, black to GND, data to GPIO 21 with 4.7 kΩ from GPIO 21 to 3V3.
  Power from 3.3 V so the data line never exceeds 3.3 V logic.
- **TDS module:** + to 3V3, − to GND, A (signal) to GPIO 13.
- **Pressure transducer** (0.5–4.5 V, 0–1.2 MPa, 5 V part): +5V to 5V, GND to GND,
  signal through 10 kΩ to GPIO 15, with 15 kΩ from GPIO 15 to GND. The divider (ratio 0.6)
  turns 0.5–4.5 V into 0.30–2.70 V. Never connect the signal wire straight to a GPIO.

  | Value | 4-band ±5% | 5-band ±1% |
  |---|---|---|
  | 10kΩ (R1, signal side) | brown, black, orange, gold | brown, black, black, red, brown |
  | 15kΩ (R2, to GND) | brown, green, orange, gold | brown, green, black, red, brown |
- **ZMPT101B:** signal output to GPIO 36. The module's AC side connects to mains
  through its own terminals, so follow the module's instructions. Calibration is in
  firmware (`ZMPT_CALIBRATION` = 500, from the hardware team).

## Superseded files
`docs/pinmap.html` and `docs/wiring.html` still show the old bench map (NodeMCU, ADS1115,
TDS on 34, pressure on 35). They have not been redrawn yet.
