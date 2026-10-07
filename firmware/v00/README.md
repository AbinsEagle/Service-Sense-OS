# Firmware v00 (bench version)

`ssos_v00/ssos_v00.ino` is the first working firmware, built and verified on the bench ESP32 DevKitC
before the hardware team's board existed. It is kept as it was, separate from the current firmware in
`firmware/ssos_main`.

- Sensors: DS18B20 temperature and analog TDS only (no voltage, no pressure).
- Buttons: 4-button tactile module, button 1 = TEMP (GPIO 32), button 2 = TDS (GPIO 25).
- Traffic light: R = GPIO 23, Y = GPIO 18, G = GPIO 19. No buzzer.
- DS18B20 data on GPIO 4 (4.7k pull-up to 3V3); TDS signal on GPIO 34.
- Bluetooth name `SSOS_B1.0`; each final result is sent as a JSON line. Firmware version string `0.0.0`.
- Works with the viewer at https://service-sense-os.vercel.app/ (only the TEMP and TDS cards update).

These pins differ from the hardware team's board, so do not flash v00 onto it. Use `firmware/ssos_main`.
Flash settings are the same as in the main README (ESP32 Dev Module, OneWire and DallasTemperature libraries).
