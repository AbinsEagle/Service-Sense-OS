# PRD — Hommiez Field Diagnostic Tool
**Version:** 1.0 (MVP) · **Status:** Hardware in build · **Owner:** Abins

---

## 1. Problem & Purpose

Field service technicians currently inspect site conditions (water quality,
supply voltage, pressure) manually and transcribe results by hand or not
at all. The Hommiez diagnostic tool is a handheld device that takes these
readings at the push of a button and pushes them straight to a backend,
removing manual transcription and giving a timestamped, technician-attributed
record per site visit.

**MVP goal:** one working prototype, validated with a real technician, in
time for the client deadline. Phase 2 (scale, more sensors) is explicitly
out of scope until MVP is validated.

---

## 2. What the device does

A technician presses **POWER**, sees battery status, then presses one of
four sensor buttons. Each press takes a reading, shows pass/warn/fail on an
LED, and sends the result over Bluetooth to the technician's phone, which
forwards it to the backend along with technician ID, location and customer
details entered in the app.

| Sensor | Measures | Range |
|---|---|---|
| DS18B20 | Water temperature | −55°C to +125°C, ±0.5°C |
| Analog TDS | Water quality (temp-compensated) | 0–1000 ppm, ±10% |
| ZMPT101B | AC supply voltage | 0–250V, isolated |
| Pressure transducer | Inlet water pressure | 0–1.2 MPa, ±1.5% FS |

Between presses, the device sleeps at under 10 µA to get 25–30 days of
field life from 4× AA cells.

---

## 3. Hardware architecture (locked)

- **MCU:** ESP32-WROOM-32, dual-core, 240 MHz, WiFi + BLE (BLE only is used in MVP)
- **ADC:** single ADS1115, 16-bit, I2C, 4 channels — A0 voltage, A1 TDS, A2 pressure, A3 battery
- **Power:** 4× AA (6V nominal) → AMS1117-3.3V LDO for logic, MT3608 boost → 5V for ZMPT101B and the pressure transducer
- **Battery sense:** 10kΩ/15kΩ divider into ADS1115 A3; firmware rejects all reads below 4.2V
- **LEDs:** 2× WS2812B (RGB1 = battery status, RGB2 = last sensor result)
- **Buttons:** POWER (wakes from deep sleep) + 4 sensor buttons (TEMP, TDS, VOLT, PRESS)
- **Connectivity:** Bluetooth Low Energy only — no WiFi in MVP
- **Enclosure:** none yet — bench prototype on perfboard

Full pin map, BOM and sourcing are tracked separately in the project's
hardware notes; this PRD covers firmware and backend behavior.

---

## 4. Firmware requirements

### 4.1 State flow
1. Deep sleep (default state, <10 µA)
2. POWER press wakes the device → read battery (A3) → set RGB1 → start idle timer
3. Any sensor button → read that sensor → compute pass/warn/fail → set RGB2 → transmit over BLE → reset idle timer
4. No activity for 5–10 minutes → deep sleep again

### 4.2 Per-sensor logic
- **Battery:** >70% green, 30–70% amber, <30% red-and-blink. Below 4.2V, reject all sensor reads (LED blinks red until cells are replaced).
- **TDS:** read via ADS1115 A1, apply the standard analog TDS polynomial, then temperature-compensate using the current DS18B20 reading.
- **Voltage:** read via ADS1115 A0, scale to 0–250V AC RMS.
- **Pressure:** read via ADS1115 A2, apply the transducer's 0.5–4.5V → 0–1.2 MPa linear scale (with the voltage divider already accounted for in hardware).
- **Temperature:** read directly from DS18B20 over 1-Wire.
- Each result is banded into pass / warn / fail against thresholds (currently placeholders — **must be confirmed with the client before field use**).

### 4.3 BLE payload
Each reading transmits as a small JSON (or CBOR, if payload size matters)
object containing: device ID, firmware version, sensor name, value, unit,
pass/warn/fail result, and current battery voltage. Firmware version is
included in every payload from day one, so the backend can track which
devices are on which build once OTA updates exist (Phase 2).

### 4.4 Non-negotiables
- Never take or transmit a sensor reading while battery is below the 4.2V cutoff.
- Never block on BLE — if no phone is connected, store nothing (MVP has no offline queue; add this only if technicians report lost readings).
- Idle timeout must return to deep sleep even if a reading fails or a sensor is disconnected.

---

## 5. Backend & app requirements

Reuses the existing FastAPI + Supabase + Next.js/Vercel stack — no new
infrastructure.

### 5.1 Data captured per reading
Technician ID, location, customer name/details, sensor name, value, unit,
pass/warn/fail result, device battery voltage, device ID, firmware version,
timestamp.

### 5.2 Web/mobile app (technician-facing)
- Connects to the device over BLE (phone acts as the bridge; the device has no WiFi)
- Lets the technician enter site/customer details before or after readings
- Shows each reading as it arrives, with a pass/warn/fail badge
- Submits the completed visit record to the backend
- **Sound level (dB):** captured via the phone's own microphone in-app, not a hardware sensor — this was deliberately removed from the device BOM

### 5.3 Backend API
- Endpoint to receive a completed visit record (readings + technician + customer context)
- Storage in Supabase, one row per reading (or one row per visit with readings as a JSON column — decide during implementation, not a hard requirement here)
- No auth requirements beyond what the existing stack already provides

---

## 6. Explicitly out of scope for MVP

- WiFi connectivity on the device
- OTA firmware updates (planned for Phase 2, once BLE works end-to-end)
- Offline reading queue on the device
- Current sensor (SCT-013), dual TDS, hardware sound sensor
- Custom PCB / enclosure
- Rechargeable battery variant

---

## 7. Success criteria for this prototype

- All four sensors read correctly on the bench (validated against a known reference where possible: a multimeter for voltage, a calibrated TDS solution, a pressure gauge)
- Battery cutoff correctly blocks reads below 4.2V and recovers above it
- A full cycle (wake → read → transmit → sleep) works reliably 20+ times in a row without a hang or crash
- A technician can complete one full site visit (all 4 readings + customer details) using the phone app end to end
- Field life estimate is validated: device left idle should still respond after several days on the same batteries

---

## 8. Open questions to resolve before field use

- Exact pass/warn/fail thresholds per sensor (currently placeholders)
- BLE payload format: JSON vs CBOR, and whether a reading needs a retry/ack mechanism
- Whether a lost-connection reading should be stored locally or simply lost (MVP assumes lost is acceptable)
- Enclosure and IP rating for outdoor/site use (not addressed in this PRD)
