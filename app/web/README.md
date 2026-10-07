# Technician app (`app/web`)

React + Vite + Tailwind. Connects to the device over Web Bluetooth (`SSOS_B1.0`),
shows each reading as it arrives, and records customer/site details and phone-mic
sound level. Stage 1: everything stays on the phone (no sign-in, no server).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
pnpm build                   # output in dist/
```

- **Simulate** stands in for the device (training, demos, no hardware nearby).
- The visit in progress is kept on the phone (localStorage), so a reload or a
  dropped connection loses nothing.
- Only the latest reading of each sensor is saved; re-taking replaces it.
- Device protocol (service/characteristic UUIDs, message format): `src/lib/ble.ts`,
  matching `firmware/ssos_main`.
