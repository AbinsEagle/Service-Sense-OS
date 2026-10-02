# Build Log — Service Sense OS

Dated entry after every completed stage: what was done, what was tested,
the result, and any problems. Toolchain setup history (2026-09-27) is in
`~/hommiez-fw/BUILD_LOG.md`.

## 2026-09-28 — DS18B20 temperature probe bring-up

**Done:**
- Reserved the full pin map up front (`docs/pinmap.md`, interactive `docs/pinmap.html`).
- Wired the DS18B20 waterproof probe: red → 3V3, black → GND, yellow → GPIO 4, 4.7kΩ pull-up between GPIO 4 and 3V3.
- Added `firmware/tests/ds18b20_test` (12-bit resolution, 1 s interval, flags -127 disconnect and 85 °C reset values).
- Set up Arduino IDE 2 (flatpak) alongside arduino-cli; both share the same core and libraries.

**Tested:**
- Compiled and uploaded with `PartitionScheme=min_spiffs` (14% flash).
- Serial output after reset: 1 device found, address `28E6BD7800000092`, steady 32.31 °C readings.
- Warm test (probe pinched): reading rose from 32.31 °C to 34.56 °C and held steady. Also confirmed flashing and monitoring from Arduino IDE 2.
- Cold test (probe in cold water): reading dropped to 10.12 °C and settled.
- Added an activity indicator: the onboard blue LED (GPIO 2) fades in and out during each 750 ms conversion (non-blocking read). Confirmed working on the board.

**Result:** DS18B20 working on the bench. Responds correctly to warm and cold, readings stable.

**Pending:** comparison against a reference thermometer (target ±0.5 °C), when one is available.

**Problems:** none.

## 2026-10-02 — TDS bench bring-up + pin map rear view

**Done:**
- Flashed `firmware/tests/tds_test` (analog TDS module on GPIO 34, temperature-compensated with the DS18B20 on GPIO 4).
- Added reasoning comments to `tds_test.ino` (no logic changes).
- Added a "Rear view (mirrored)" toggle to `docs/pinmap.html` (and the published artifact) for soldering on the back of the board.

**Tested:**
- First flash: TDS signal steady at 142 mV (58 ppm), but the DS18B20 was reported "NOT found" (25 °C assumed). The probe wiring had been disturbed while soldering.
- After the wiring was fixed, you confirmed both the temperature probe and the TDS module read correctly.

**Result:** TDS and DS18B20 both working together on the bench.

**Pending:** TDS calibration. `K_VALUE` is still 1.0; it needs a known-TDS solution or a TDS pen. Reference thermometer check for the DS18B20 is also still pending.

**Problems:** the Arduino IDE's Serial Monitor holds `/dev/ttyUSB0`, which blocks `arduino-cli upload`. Close it before flashing from the terminal.
