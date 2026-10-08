# Technician app (`app/web`)

Stage 1 pre-installation site check (see `docs/feature-list.md` and `docs/ui-plan.md`).
React + Vite + Tailwind with a Material 3 colour scheme (seed `#1565C0`). Everything stays
on the phone: no sign-in, no server.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # verdict, site-status and Langelier rules
pnpm lint
pnpm build      # output in dist/
```

## Flow
Technician profile (once) → Home (connect the device, recent checks) → **Product & site**
(scan QR serial, type, model, tap-to-capture location) → **Readings** (guided, one at a time,
must settle; optional pH strip) → **Result** (Ready / Ready with add-on / Not ready, add-ons,
range bars, Langelier estimate; *Share report* sends the image report via the share sheet).

The device chip in the top bar (every screen) connects to `SSOS_B1.0`; the link is kept for
the whole session. The customer step is built but hidden (`src/config/features.ts`).

## Where things live
| What | File |
|---|---|
| Brand name/logo on the report | `src/config/brand.ts` (placeholder) |
| Categories, models, readings per category, how-to text | `src/config/catalog.ts` (placeholder models) |
| OK/Low/High limits, add-ons, pH, Langelier ratios | `src/config/limits.ts` (pressure limits and ratios are placeholders) |
| Verdicts, site status, Langelier | `src/lib/evaluate.ts` (+ `__tests__`) |
| Report image | `src/lib/report.ts` |
| Device protocol (matches `firmware/ssos_main`) | `src/lib/ble.ts` |
| Location permission flow | `src/lib/location.ts`, `src/screens/check/LocationField.tsx` |

**Simulate** stands in for the device for demos and training; checks with simulated
readings are marked "training" and their report says so.
