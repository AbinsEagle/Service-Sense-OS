# Service Sense OS

Firmware and backend for the Hommiez handheld multi-sensor diagnostic tool.
The embedded firmware (ESP32) and the backend live in this one repo, so a
single tagged release describes the whole system. Devices in the field update
themselves over the internet (OTA). A technician never needs a laptop or cable.

## Hardware
- Board: ESP32 DevKitC, 38-pin, ESP32-D0WD-V3, 4MB flash, CP2102 USB-UART
- Arduino FQBN: `esp32:esp32:esp32:PartitionScheme=min_spiffs`
- Sensor libraries: OneWire, DallasTemperature, Adafruit NeoPixel, Adafruit ADS1X15

## Repository layout
```
firmware/            ESP32 source (arduino-cli)
backend/             API, device registry, firmware storage   (planned)
docs/                wiring diagrams, pinouts, design notes
datasheets/          PDFs for sensors/modules
.github/workflows/   CI: build firmware, publish releases     (planned)
```

## How a field update works

1. **Release.** Push code to GitHub and tag a release, e.g. `v1.2.0`.
2. **Build.** GitHub Actions compiles the firmware, bakes the tag in as
   `FW_VERSION`, and produces `firmware.bin` plus `manifest.json`.
3. **Publish.** Actions uploads both files to the backend's storage. Devices
   never download from GitHub directly.
4. **Check.** The web app talks to the device over Bluetooth and reads its
   `FW_VERSION`. If the manifest has a newer version, the app offers an update.
5. **Connect.** The web app sends the phone hotspot's WiFi credentials to the
   device over Bluetooth. The device joins, downloads over HTTPS, verifies the
   SHA-256, flashes the spare slot, and reboots. Then it forgets the credentials.
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

## Design decisions

### 1. Partition layout: Minimal SPIFFS (1.9MB APP with OTA)
Updates need two app slots (current + new). The default layout gives each slot
1.2MB, and BLE + WiFi + TLS together usually exceed that. Use `min_spiffs`
from day one: changing partitions later requires a USB reflash of every device.

### 2. Firmware version everywhere
The firmware defines a `FW_VERSION` constant. CI sets it from the git tag, and
local builds default to `"dev"`. Every Bluetooth message includes it, so the
backend always knows which firmware each device runs.

### 3. Firmware hosted by the backend, not GitHub
Downloading straight from a private GitHub repo needs an access token on every
device, and anyone who opens a device could extract it. CI pushes the `.bin`
to backend storage instead, and devices fetch it over HTTPS. Devices accept the
download only if the manifest's SHA-256 matches.

### 4. Getting online without a screen
The Bluetooth link supplies the WiFi credentials (phone hotspot) only for the
duration of the update. The device doesn't store them afterwards.

### 5. Power guard
An update starts only if the battery is above 50% or USB power is present.
WiFi draws a lot of current, and a brownout mid-update wastes the update
(rollback to the old version).

### 6. Rollback must be confirmed explicitly
The ESP32 bootloader's app rollback is enabled in the arduino-esp32 core. By
default, though, the core marks a new image valid *before* `setup()` runs, so
the rollback only catches very early crashes. The firmware therefore overrides
`verifyRollbackLater()` to return `true`. After a self-test passes (sensors
respond, BLE advertising starts), it calls
`esp_ota_mark_app_valid_cancel_rollback()`. Otherwise it calls
`esp_ota_mark_app_invalid_rollback_and_reboot()`.

### Open questions
- Backend stack and hosting (storage for `.bin`/manifest, device registry).
- Web app platform: Web Bluetooth works in Chrome on Android/desktop, but not
  in Safari on iOS. iPhone technicians would need a native or wrapper app.
- Firmware signing (ESP32 Secure Boot v2) on top of the SHA-256 check,
  before shipping to customers.

## Building locally
```bash
# compile
arduino-cli compile --fqbn esp32:esp32:esp32:PartitionScheme=min_spiffs firmware/<sketch>

# upload over USB
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32:PartitionScheme=min_spiffs firmware/<sketch>

# serial (non-interactive shells: read the port directly)
stty -F /dev/ttyUSB0 115200 raw -echo && timeout 10 cat /dev/ttyUSB0
```

## Status
- [x] Toolchain set up; blink test flashed and verified on hardware
- [ ] Firmware skeleton with `FW_VERSION`, BLE service, sensor drivers
- [ ] OTA client (HTTPS download, SHA-256 check, self-test + rollback)
- [ ] GitHub Actions: build on tag, publish `.bin` + manifest
- [ ] Backend: firmware storage, manifest endpoint, device registry
- [ ] Web app: BLE connect, update prompt, WiFi credential hand-off
