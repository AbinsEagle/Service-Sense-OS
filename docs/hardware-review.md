# Review of the hardware team's bring-up sketch (2026-10-07)

`firmware/hardware_bringup/hardware_bringup.ino` is their sketch, unchanged. It reads every sensor
once and prints raw numbers; it has no settle logic, no unit conversion and no BLE.
`firmware/hommiez_main/hommiez_main.ino` uses their pin map exactly and adds the measuring logic
and Bluetooth reporting. The viewer in `app/ble-viewer/` shows all four sensors.

## Pin map used (unchanged)
Buttons 27 / 14 / 12 / 26 (TEMP / TDS / VOLT / PRESS, pressed = below 0.3 V); LEDs R33 Y25 G32;
buzzer 22; DS18B20 21; pressure 15; TDS 13; ZMPT101B 36.

## Please confirm or fix
1. **GPIO 12 and 15 are boot-strapping pins.** Button 3 on GPIO 12 must not be HIGH at power-up
   (HIGH selects 1.8 V flash and the board will not boot). Pressure on GPIO 15 is fine electrically
   but silences the boot log if held LOW. Safer pins would be better if the PCB can still change.
2. **TDS (13) and pressure (15) are on ADC2.** Fine with BLE, but they stop working if Wi-Fi is ever
   enabled. The ESP32 ADC is also non-linear and noisy; the bench used an ADS1115 for both.
3. **Buzzer (22) and DS18B20 (21) are the default I2C pins.** They conflict if an ADS1115 is added.
4. **Pressure divider:** the sketch assumes 10k top / 15k bottom (ratio 0.6) between the
   transducer's 0.5-4.5 V signal and the pin. If different, change `PRESS_DIVIDER_RATIO`.
5. **ZMPT101B is not calibrated.** `ZMPT_CALIBRATION` is 1.0, so VOLT is the raw RMS at the pin and
   the message carries `"cal":false`. Set it against a known mains voltage.
6. **Buzzer** is assumed active (ON when HIGH); LEDs are assumed active-high.
7. The bring-up sketch reported an unplugged DS18B20 as -127 C. The new firmware treats that as a
   sensor fault.

## Messages sent over BLE (one JSON line per final result)
`{"dev","fw","sensor":"TEMP|TDS|VOLT|PRESS","value","unit","status":"settled|unstable|fault"}`
plus `temp` (TDS), `min` / `max` / `cal` (VOLT). Units: C, ppm, V, bar. No raw samples are sent.

## Not done yet
Pressure-hold leak test, battery sensing, deep sleep, thresholds tuned on real traces.
