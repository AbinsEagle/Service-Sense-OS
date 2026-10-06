# Connectivity plan: device, web app, Supabase, GitHub

Status: proposal (2026-10-03). Not implemented yet. Matches the system overview in the README.

```
ESP32  --BLE-->  Web app (phone browser)  --HTTPS-->  FastAPI (Vercel)  -->  Supabase
                     ^ both deployed from GitHub via Vercel
```

The ESP32 never talks to GitHub or Supabase directly.

## 1. ESP32 to web app: Web Bluetooth
- Chrome on Android and desktop can connect to a BLE device from a web page, so no native app is needed.
- **iPhone Safari does not support Web Bluetooth.** If technicians use iPhones, we need a small native app or a Bluefy-type browser. **Open question: Android or iPhone?**
- Firmware sends one small message per reading: device ID, firmware version, sensor name, final value, unit, status (settled / unstable / fault), battery voltage. The device decides the final value itself (see design-decisions.md); raw samples are never sent.

## 2. Web app to Supabase
- Next.js app on Vercel receives each reading and sends the visit to the FastAPI backend, adding technician, customer and site details typed in the app.
- Tables (simple start): `visits` (technician, customer, location, time) and `readings` (visit, sensor, value, unit, status, device ID, firmware version, time).
- Supabase Auth plus row-level security decide who sees which visits.
- **Decided (2026-10-06): the app goes through a FastAPI backend on Vercel**, which writes to Supabase with the service role key. Built in `backend/` (see `backend/README.md`); schema in `supabase/migrations/`.

## 3. GitHub
- This repo (`AbinsEagle/Service-Sense-OS`) holds firmware, docs and, later, `backend/` and `app/`.
- Vercel watches the app and redeploys on every push.
- Optional CI: a GitHub Action that compiles the firmware with `arduino-cli` on each push.
- Keep Supabase keys out of the repo (Vercel environment variables). The browser needs no Supabase key: only the backend talks to Supabase.

## Suggested order
1. Firmware: add BLE and send the final readings.
2. Supabase: create `visits` and `readings`.
3. Web app: one page that connects, shows the live value and saves it.
4. Then login, customer details and visit history.
