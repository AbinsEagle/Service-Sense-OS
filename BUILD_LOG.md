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

**Result:** Probe detected and reading on the bench.

**Pending:** cold-water check and comparison against a reference thermometer (target ±0.5 °C).

**Problems:** none.
