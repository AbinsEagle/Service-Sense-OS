# Use case: a technician visit with Service Sense OS

Status: current as of 2026-10-08. The app only displays readings; saving to Supabase is the next phase.

## Who and why
A field technician visits a customer who says the water purifier gives bad water and the pump seems weak.
Normally they would check by eye and write numbers on paper. With Service Sense OS they take four
measurements with one handheld device and read the results on their phone.

## What they carry
- The device (ESP32 with sensors, 4 buttons, traffic light, buzzer), powered by batteries.
- Their phone with a Web Bluetooth browser: Chrome on Android, or Bluefy on iPhone.

## Step by step
1. **Switch on.** The lights flash red, yellow, green once (self-check). The device starts
   broadcasting Bluetooth as `SSOS_B1.0`.
2. **Open the app:** https://service-sense-os.vercel.app/ and tap **Connect**. Pick `SSOS_B1.0` from the
   list. (It does not appear in the phone's Bluetooth settings; BLE devices only show in this list.)
3. **Temperature (button 1).** Probe in a glass of tap water. The green light pulses while the device waits
   for the reading to level off. Steady green plus one beep means done: *26.4 C, settled*.
4. **TDS (button 2).** TDS probe in the same glass. The device ignores the first 2 seconds, waits for the
   signal to level off, and corrects for the water temperature it measures at the same time:
   *412 ppm, settled*. That is high for purified water, so the technician notes it.
5. **Voltage (button 3).** Voltage sensor on the pump's supply. The device measures 4 seconds of mains and
   reports the median plus the lowest and highest value: *198 V, min 171, max 226, unstable*. Yellow light
   and two beeps. The swing is the finding: an unsteady supply may explain the weak pump.
6. **Pressure (button 4).** Transducer on the inlet pipe. The device waits for the reading to level off:
   *1.1 bar, settled*. Low pressure is more evidence for the weak pump.

## Reading the lights and beeps
| Light | Beeps | Meaning |
|---|---|---|
| Green pulsing | none | measuring, waiting for the reading to settle |
| Green steady | 1 short | settled: the value is trustworthy |
| Yellow | 2 short | unstable: the reading never settled (or the supply varies); take it again |
| Red | 1 long | sensor fault: probe unplugged, wrong wiring or out of range |

## What the technician learns
Poor water quality (412 ppm), an unsteady supply voltage and low inlet pressure, each with a status so they
know which numbers to trust. If a probe is unplugged they see a fault instead of a fake number.

## What happens inside
- The ESP32 does all the thinking: it samples, waits for the signal to settle and decides the final value.
- It sends only that final value, as one short JSON line over Bluetooth, for example
  `{"dev":"F294","fw":"0.4.0","sensor":"TDS","value":412,"unit":"ppm","status":"settled","temp":26.4}`.
  Raw samples are never sent. `dev` is the unit ID (last two bytes of the chip's MAC address).
- The web page joins the chunks, shows the value on a card and adds a line to the log.
- If the phone is not connected, results are not stored on the device; they are lost (by design for now).

## Not built yet
- Saving each reading to Supabase with technician, customer and site details, login and visit history (next phase).
- Pressure-hold leak test, battery level display, deep sleep.
- Calibration of voltage (ZMPT101B), TDS and pressure; threshold tuning on real probes.
