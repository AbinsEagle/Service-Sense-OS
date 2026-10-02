# Service Sense OS

Firmware, backend and app for the Hommiez handheld field diagnostic tool.
A technician presses a button and the device measures water temperature,
TDS, AC supply voltage or inlet pressure. It shows pass/warn/fail on an LED
and sends the reading over Bluetooth to the technician's phone. The phone
submits the site visit to the backend.

**Requirements:** see [docs/PRD.md](docs/PRD.md) (MVP v1.0).

All parts of the system (embedded, backend, frontend) live in this one repo,
so a single tagged release describes the whole system.

## System overview
```
[Device: ESP32 + sensors] --BLE--> [Phone: Next.js web app] --HTTPS--> [FastAPI backend] --> [Supabase]
                                                        (hosted on Vercel)
```

## Hardware (MVP, locked in the PRD)
- MCU: ESP32-WROOM-32 class (dev board: NodeMCU ESP-32S V1.1, 38-pin, DevKitC-compatible pinout, 4MB flash)
- ADC: ADS1115 16-bit I2C. A0 voltage, A1 TDS, A2 pressure, A3 battery
- Sensors: DS18B20 (1-Wire), analog TDS, ZMPT101B, 0.5–4.5V pressure transducer (0–1.2 MPa)
- Power: 4× AA → 3.3V LDO (logic) + MT3608 boost to 5V (ZMPT101B, pressure)
- UI: POWER button (wakes from deep sleep), 4 sensor buttons, 2× WS2812B LEDs
- Connectivity: BLE only in MVP

## Repository layout
```
docs/                PRD, wiring diagrams, pinouts, design notes
datasheets/          PDFs for sensors/modules
firmware/            ESP32 source (arduino-cli)
backend/             FastAPI service (Supabase storage)           (planned)
app/                 Next.js technician web app (Vercel)          (planned)
.github/workflows/   CI: build firmware, test backend/app         (planned)
```

## Roadmap
Work proceeds track by track, in this order.

**1. Hardware**
- [x] Toolchain set up; blink test flashed and verified on the dev board
- [x] Pin map + wiring diagram in `docs/` (`pinmap.md`, `pinmap.html`, `wiring.html`)
- [ ] Power budget review against the <10 µA sleep target
- [ ] Bench build on perfboard, each sensor verified individually
  - [x] DS18B20 temperature (reference thermometer check pending)
  - [ ] ADS1115 ADC
  - [ ] TDS
  - [ ] ZMPT101B voltage
  - [ ] Pressure transducer
  - [ ] Battery divider

**2. Embedded**
- [ ] Firmware skeleton: `FW_VERSION`, state machine (sleep → wake → read → sleep)
- [ ] Battery sense + 4.2V cutoff, RGB1 status
- [ ] Sensor drivers: DS18B20, TDS (temp-compensated), ZMPT101B RMS, pressure
- [ ] Pass/warn/fail banding (placeholder thresholds), RGB2 result
- [ ] BLE service + reading payload
- [ ] 20× wake → read → transmit → sleep reliability run

**3. Backend (FastAPI + Supabase)**
- [ ] Schema for visits and readings
- [ ] Visit submission endpoint

**4. Frontend (Next.js on Vercel)**
- [ ] BLE connect + live readings with pass/warn/fail badges
- [ ] Site/customer details form, sound level via phone microphone
- [ ] Submit visit to backend; end-to-end technician test

## Building firmware locally
```bash
FQBN=esp32:esp32:esp32:PartitionScheme=min_spiffs

arduino-cli compile --fqbn $FQBN firmware/<sketch>
arduino-cli upload  -p /dev/ttyUSB0 --fqbn $FQBN firmware/<sketch>

# serial (non-interactive shells: read the port directly)
stty -F /dev/ttyUSB0 115200 raw -echo && timeout 10 cat /dev/ttyUSB0
```
The Minimal SPIFFS partition layout is used from day one, even though OTA is
Phase 2. Changing partitions later means reflashing every device over USB.

---

## Phase 2: field firmware updates (OTA)

Out of scope for MVP (the PRD has no WiFi on the device). This section is
kept as the agreed design so that MVP decisions don't block it.

### How a field update works
1. **Release.** Push code to GitHub and tag a release, e.g. `v1.2.0`.
2. **Build.** GitHub Actions compiles the firmware, bakes the tag in as
   `FW_VERSION`, and produces `firmware.bin` plus `manifest.json`.
3. **Publish.** Actions uploads both files to backend storage (Supabase
   Storage). Devices never download from GitHub directly.
4. **Check.** The app reads the device's `FW_VERSION` over BLE. If the
   manifest has a newer version, the app offers an update.
5. **Connect.** The app sends the phone hotspot's WiFi credentials over BLE.
   The device joins, downloads over HTTPS, verifies the SHA-256, flashes the
   spare slot, and reboots. Then it forgets the credentials.
6. **Confirm or roll back.** The new firmware runs a self-test. If it passes,
   the firmware marks itself valid. If it crashes or fails the self-test first,
   the bootloader restores the previous version on the next reboot.

### manifest.json
```json
{
  "version": "1.2.0",
  "url": "https://<backend>/firmware/1.2.0/firmware.bin",
  "sha256": "<hex digest>",
  "size": 1234567,
  "min_battery_pct": 50
}
```

### Design decisions
1. **Partition layout: Minimal SPIFFS (1.9MB APP with OTA).** Two app slots
   are needed. The default 1.2MB slots are too small for BLE + WiFi + TLS.
2. **`FW_VERSION` everywhere.** CI sets it from the git tag, and local builds
   default to `"dev"`. It goes in every BLE payload (already required by
   PRD §4.3).
3. **Firmware hosted by the backend, not GitHub.** A GitHub token on every
   device could be extracted from any unit. Devices accept a download only if
   the manifest's SHA-256 matches.
4. **Online without a screen.** WiFi credentials come over BLE and are kept
   only for the duration of the update.
5. **Power guard.** An update starts only if the battery is above 50% or USB
   power is present. A brownout mid-update wastes the update (rollback).
6. **Explicit rollback confirmation.** The arduino-esp32 core has bootloader
   rollback enabled, but by default it marks a new image valid before
   `setup()` runs. The firmware overrides `verifyRollbackLater()` to return
   `true`, and calls `esp_ota_mark_app_valid_cancel_rollback()` only after a
   self-test passes (sensors respond, BLE advertising starts).

### Open questions for Phase 2
- Web Bluetooth works in Chrome on Android/desktop, but not in Safari on iOS.
  This also affects the MVP app if technicians use iPhones.
- Firmware signing (ESP32 Secure Boot v2) on top of the SHA-256 check.
