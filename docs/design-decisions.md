# Design decisions (running list)

## On-device "best value" logic (decided 2026-10-03)
All processing happens on the ESP32; only the final decided value is output.
- **Temperature:** wait until the reading levels off (no fixed window). Implemented: last 8 valid readings within 0.1 °C, result = median, give up after 30 s.
- **TDS:** median of the stable part, corrected with the temperature measured during the same run. Implemented: first 2 s discarded, last 6 half-second blocks within max(10 mV, 2%), give up after 20 s.
- **Voltage (not built):** min, max and a stability check; the spread is the finding. Use whole mains cycles (RMS per 20 ms), and give the ADS1115 to this channel while sampling.
- **Pressure (not built):** one stable value for the install record, plus a separate longer pressure-hold window that checks for leaks by decay. The transducer is only ±1.5% FS (about 18 kPa), so the leak rule must be a drop in kPa per minute, not an absolute value, and the 5 V supply must be steady or a sagging battery looks like a leak.
- **Unstable rule:** if the reading never settles, flag it as unstable so the tech re-takes it, instead of storing a confident wrong number.
- All thresholds are first guesses, to be tuned on real probe traces.

## Traffic light and buttons (bench prototype)
- Buttons: 4-button tactile module (pins V, G, 1-4), V to 3V3. 1 = TEMP (GPIO 32), 2 = TDS (GPIO 25), 3/4 = VOLT/PRESS later (26/27). Press polarity is detected at boot.
- Traffic light module: R = GPIO 23, Y = GPIO 18, G = GPIO 19. Green pulses while measuring, green steady = settled, yellow = unstable (re-take), red = sensor fault. This replaces the planned WS2812B LEDs for now.

## Power (open issue)
- The MT3608 is boost-only. With 4 fresh AA (about 6 V) it cannot produce 5 V; it passes roughly 5.7 V through. The 5 V sensors (pressure, ZMPT101B) need a steady 5 V.
- Options: 3x AA (4.5 V fresh) with the MT3608 set to 5.0 V (recommended), or keep 4x AA with a buck-boost module. The 4.2 V cut-off and the battery divider values would change for 3 cells.
- Battery divider values disagree: PRD says 10k/15k, an earlier pin map page used 47k/47k. Resolve when the battery work starts.
- For now (only temp and TDS wired, everything at 3.3 V), 4x AA can go straight to VIN and GND. Never to the 3V3 pin. Do not connect with USB plugged in. Battery life is hours without deep sleep.
