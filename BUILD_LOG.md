# Build Log — Service Sense OS

Dated entry after every completed stage: what was done, what was tested,
the result, and any problems. Toolchain setup: arduino-cli 1.5.1 with the esp32:esp32 core 3.3.12 (2026-09-27).

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

## 2026-10-03 — Rename combined temp + TDS sketch

**Done:**
- Renamed `firmware/tests/tds_test/tds_test.ino` to `firmware/tests/temp_tds_test/temp_tds_test.ino` (the sketch reads both the DS18B20 and the TDS module). Updated the header comment; no logic changes.
- Earlier entries above still refer to the old `tds_test` name.

**Tested:** compiles for `esp32:esp32:esp32` (22% flash, 6% RAM). Not re-flashed.

**Problems:** none.

## 2026-10-03 — Push buttons for TEMP and TDS (sketch written, not yet wired)

**Done:**
- Added `firmware/tests/temp_tds_buttons/temp_tds_buttons.ino`: TEMP button (GPIO 32) takes a temperature reading, TDS button (GPIO 25) takes a temperature-compensated TDS reading. Internal pull-ups, buttons wire to GND, 30 ms debounce, nothing measured until a press.

**Tested:** compiles for `esp32:esp32:esp32` (22% flash, 6% RAM). Not flashed: no push buttons on hand (parts need buying).

**Pending:** wire the two buttons, flash, confirm one reading per press.

**Problems:** first compile failed because the `Button` struct was declared after Arduino's auto-generated prototype; moved it to the top of the file.

## 2026-10-03 — Traffic light LED + 5 s button readings (sketch written, not yet wired)

**Done:**
- Rewrote `firmware/tests/temp_tds_buttons/temp_tds_buttons.ino`: a button press measures for 5 s (median of readings) while the green light pulses; then green stays on 3 s if the reading is good, red 3 s if the sensor is faulty (DS18B20 no valid reading, or TDS signal outside 20–2300 mV). Yellow reserved for alerts (off for now).
- Traffic light module pins: R=GPIO 23, Y=GPIO 19, G=GPIO 18, GND to GND. Boot light check cycles red, yellow, green.
- Updated `docs/pinmap.md` and `docs/pinmap.html` (and the published page).

**Tested:** compiles for `esp32:esp32:esp32` (22% flash, 6% RAM). Not flashed.

**Pending:** wire module and buttons, flash, confirm pulse / green / red behaviour. Pin choices replace the planned WS2812B LEDs on GPIO 16 for now.

**Problems:** none.

## 2026-10-03 — Switched buttons to the 4-key touch module

**Done:**
- Buttons are a 4-key touch module (TTP224 type, VCC/GND/OUT1–OUT4), not push buttons. Its outputs go HIGH on touch, so the sketch now uses plain inputs (no pull-ups) and treats HIGH as pressed. OUT1 (TEMP) → GPIO 32, OUT2 (TDS) → GPIO 25. Module powered from 3V3 so outputs are 3.3 V.
- Updated `docs/pinmap.md`, `docs/pinmap.html` (removed the push-button drawings; wiring steps are in the pin detail panel).

**Tested:** compiles (22% flash). Not flashed. Product page was blocked (HTTP 403), so module details are from general knowledge of this module type and need checking against the board's silkscreen.

## 2026-10-03 — Correction: buttons are a 4-button tactile module

**Done:**
- The module is four tactile buttons with pins V, G, 1, 2, 3, 4 (the shop listing's "touch" wording was misleading), not a touch-pad chip. Press polarity is unknown, so the sketch now enables internal pull-ups, reads each button's resting level at boot, and treats the opposite level as a press; the detected polarity is printed on Serial.
- Wiring: V → 3V3, G → GND, 1 (TEMP) → GPIO 32, 2 (TDS) → GPIO 25; 3/4 reserved for VOLT/PRESS (GPIO 26/27).
- Updated `docs/pinmap.md`, `docs/pinmap.html` and the published page.

**Tested:** compiles (22% flash). Not flashed.

## 2026-10-03 — hardware_check sketch

**Done:**
- Added `firmware/tests/hardware_check/hardware_check.ino`: boot light cycle, prints every change on buttons 1–4 (GPIO 32/25/26/27) with raw level, lights red/yellow/green while buttons 1/2/3 are held (4 = all), and prints DS18B20 temperature and TDS millivolts every 2 s.

**Tested:** compiles (21% flash). Upload failed: `/dev/ttyUSB0` busy (the Arduino IDE Serial Monitor holds it). Not flashed yet.

## 2026-10-03 — Traffic light yellow/green pins swapped

**Done:** Yellow is now GPIO 18 and green is GPIO 19 (red unchanged on GPIO 23). Updated `temp_tds_buttons`, `hardware_check`, `ds18b20_test` (which currently holds a copy of the traffic-light sketch), `docs/pinmap.md`, `docs/pinmap.html` and the published page. In the diagram the module's green terminal now sits above yellow, matching the pin order on the board header.

**Tested:** all three sketches compile. Not re-flashed.

## 2026-10-03 — On-device "best value" logic for temperature and TDS

**Done:**
- Replaced the fixed 5 s reading in `temp_tds_buttons` (and its copy `ds18b20_test`) with settle detection that runs entirely on the ESP32; only the final value is printed (no raw data).
- Temperature: DS18B20 every 750 ms, settled when the last 8 valid readings span ≤ 0.1 °C, result = median, gives up after 30 s.
- TDS: 500 ms median blocks, first 2 s discarded, settled when the last 6 blocks span ≤ max(10 mV, 2%), result = median converted to ppm using the temperature read in the background during the same measurement; gives up after 20 s.
- Lights: green pulsing while waiting; green steady = settled; yellow = never settled (re-take, value printed marked UNSTABLE); red = sensor fault. Yellow is therefore no longer "reserved for alerts".

**Tested:** compiles (22% flash). Not flashed. All thresholds are first guesses.

**Pending:** flash and check settling times with the real probes, then tune the thresholds. Voltage (min/max/spread) and pressure (stable value plus leak-hold decay window) are not implemented because those sensors aren't wired yet.

## 2026-10-07 — Bluetooth (BLE) readings + browser viewer (written, not yet flashed)

**Done:**
- Bench now runs on 4×AA straight into VIN (only temp + TDS wired); USB data cable unplugged.
- Added `firmware/tests/temp_tds_ble/temp_tds_ble.ino`: same measuring as `temp_tds_buttons`, plus a BLE service that sends each FINAL result as a JSON line (device, firmware version, sensor, value, unit, status settled/unstable/fault, water temp for TDS). Sent in 20-byte notifications ending with a newline. Device name `SSOS_B1.0` (last MAC bytes).
- Added `app/ble-viewer/index.html`: a single-page Web Bluetooth viewer (Chrome/Edge) showing the latest temp and TDS and a log.

**Tested:** firmware compiles (85% flash with the BLE stack; if space gets tight, switch to NimBLE or a bigger partition scheme). Viewer script passes a syntax check. Neither tested with hardware yet.

## 2026-10-07 — BLE verified on hardware

**Done:** Flashed `temp_tds_ble` from the Arduino IDE; battery-powered over 4×AA on VIN. The browser viewer (Chromium on Fedora, with Web Bluetooth enabled) connected to `SSOS_B1.0` and received readings.

**Tested:** TDS button gave 58 ppm, status settled, shown in the viewer log. TEMP button gave a sensor fault (no valid DS18B20 reading), so the probe wiring or the 4.7k pull-up needs checking.

**Notes:**
- Brave has Web Bluetooth disabled (`navigator.bluetooth` undefined); Chromium needs the experimental web platform features flag on Linux.
- BLE devices do not appear in the OS Bluetooth settings; connection is made from inside the page/app. Android uses Chrome; iPhone needs a Web Bluetooth browser such as Bluefy (or a native app later). Wi-Fi AP mode was considered and left for later.

**Pending:** fix the temperature fault; tune settle thresholds on real probes.

## 2026-10-07 — Integration onto the hardware team's pin map (branch ble-integration)

**Done:**
- Kept their bring-up sketch as `firmware/hardware_bringup/` (unchanged).
- Added `firmware/ssos_main/ssos_main.ino` (v0.4.0): their pin map, our settle logic for TEMP and TDS, new VOLT (4 s of whole-cycle RMS windows; median, min, max) and PRESS (settle detection, bar), traffic light, buzzer, BLE JSON messages.
- Viewer now shows voltage and pressure cards.
- `docs/hardware-review.md` lists what to confirm with the hardware team.

**Tested:** compiles (85% flash). Not flashed; nothing tested on their board yet.

**Assumptions:** 10k/15k divider on pressure, direct ESP32 ADC for TDS and pressure, ZMPT uncalibrated, active buzzer.

## 2026-10-08 — Bluetooth name SSOS_B1.0; dry-run test

**Done:** Advertised name is now fixed `SSOS_B1.0` on every unit; the per-unit ID (last two MAC bytes) moved into the `dev` field of each message. Viewer connects to the exact name `SSOS_B1.0`. Supabase stays out of scope: the app only displays readings.

**Tested (host-side dry run, no hardware):** firmware compiles (85% flash). Messages for TEMP, TDS, VOLT, PRESS and a fault (85-125 bytes, under the 256 buffer), split into 20-byte chunks, rejoin and parse correctly in the viewer's logic. RMS maths on simulated 50 Hz and 60 Hz mains with a 100 ms window gives the exact expected value (707.1 mV for 1 V peak), confirming whole-cycle sampling.

**Not tested:** anything on real hardware (settle thresholds, ADC pins, buzzer, buttons on GPIO 12).

## 2026-10-08 — Bench firmware saved as v00

**Done:** Copied the verified bench firmware (TEMP + TDS, bench pins, BLE) to `firmware/v00/ssos_v00/` with version string 0.0.0 and a README. Current firmware stays in `firmware/ssos_main`.

**Tested:** compiles (85% flash). Not re-flashed; code is identical to `temp_tds_ble` apart from the version string.

## 2026-10-10 — Hardware team's updated sketch; ZMPT calibration adopted

**Done:** Compared the hardware team's updated sketch with `ssos_main`. Pins are identical. Their only functional change is the AC voltage via the ZMPT101B library (sensitivity 500, readings under 10 V shown as 0); they calibrated it against mains. The library computes volts = RMS volts at the pin x sensitivity (checked in ZMPT101B 1.0.1 source), so this equals our `ZMPT_CALIBRATION`. Set `ZMPT_CALIBRATION` to 500 and `VOLT_MIN_RMS_MV` to 20 (= 10 V) in `firmware/ssos_main`. We keep our own whole-cycle RMS (settle, clipping fault) rather than the library.

**Tested:** compiles (85% flash). Not flashed.

**Note:** their calibration used raw `analogRead`; ours uses `analogReadMilliVolts` (factory-corrected), so expect a small difference. Check against a multimeter.

**Version:** firmware bumped to 0.4.1.

## 2026-10-10 — Pin map updated to the hardware team's board

**Done:** Rewrote `docs/pinmap.md` to match `ssos_main` and the hardware team's sketch (buttons 27/14/12/26, LEDs 33/25/32, buzzer 22, DS18B20 21, pressure 15, TDS 13, ZMPT 36; no ADS1115). Fixed the ADC line and checklist in the README. `docs/pinmap.html` and `docs/wiring.html` still show the old bench map and are not redrawn.
