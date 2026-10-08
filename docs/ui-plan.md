# UI plan: stage 1 (pre-installation site check)

Built from `docs/feature-list.md` v1. Decisions are logged at the bottom, one at a time.

## Minimal pass (U7, 2026-10-08)
After the first build was judged too busy:
- **Device first:** a device chip in the top bar of every screen (Connect / unit ID / Simulator) opens a bottom sheet to connect, disconnect or use the simulator. Home leads with "Connect the device" until connected. The Bluetooth link lives at app level, so it stays up across Home and every step.
- **Customer step hidden for now** (`app/web/src/config/features.ts`); **site location moves to the Product step** ("Product & site") and stays required.
- **3 steps:** Product & site → Readings → Result. Share is part of Result: *Share report* finishes the check and opens the share sheet; *Finish without sharing* below it.
- Thin segmented progress bar instead of numbered circles; one full-width bottom button whose label says what's missing ("Take 2 more readings").
- **Theme (U8):** Settings icon on the Home top bar → Theme: System / Light / Dark; the choice is remembered on the phone. The same sheet opens Your details (U9).
- Plain rows and dividers instead of filled cards; readings shown as a compact strip plus one focus area; pH as a −/+ stepper; range bars as soft tints.

## Screen map (original; see U7 for the current flow)
1. **First run: technician profile** (once): name, mobile number
2. **Home:** "New install check" + check history (search by customer or serial)
3. **Product:** scan the product QR (serial) or type it → pick category → pick model (recent first)
4. **Customer:** name, phone (for WhatsApp), address, and a required **Location** field: tap *Capture location* → fetched if allowed; otherwise a hint card ("Tap **Allow** on the next pop-up", Q24) and then the permission pop-up again; if blocked, show how to allow it in Chrome site settings (Q23)
5. **Readings:** connect the device; only the readings this category needs; each with a low/high range bar; must be settled to continue; optional pH strip entry (→ Langelier estimate)
6. **Result:** site status (Ready / Ready with add-on / Not ready), reasons, add-ons, Langelier estimate
7. **Share:** WhatsApp summary to the customer → done → Home
- **History detail:** the finished check, re-send on WhatsApp

## Navigation (U1)
- **Step-by-step:** one task per screen, one big primary button at the thumb (bottom of the screen)
- **Step tracker always visible** at the top: Product · Customer · Readings · Result · Share, each marked *done* ✓, *current*, *to do*, or *needs attention* (e.g. a reading to re-take, or location not captured yet). Tapping a done step goes back to it; answers are kept

## Look (U2)
- **Material You / Material 3:** M3 components (top app bar, filled/tonal buttons, cards, chips, bottom sheets, snackbars), Roboto type scale, M3 shape and elevation
- A web app can't read the phone's wallpaper colours, so "dynamic colour" becomes one fixed M3 colour scheme generated from a seed colour (U3), with light and dark variants
- **Seed colour: trust blue `#1565C0` (U3).** Primary, secondary, tertiary, surfaces and outlines are generated from it with the Material colour utilities
- OK / Low / High colours stay reserved for verdicts, separate from the theme colours
- Big touch targets (48 dp minimum), large numerals for readings, readable in sunlight

## Readings step (U4)
- **Guided, one reading at a time:** a large card for the next required reading with a picture-style instruction ("Dip the TDS probe in tap water, then press 2 on the device"), a live *measuring…* state while the device settles, then the value with its low/high range bar
- Settled → auto-advance to the next required reading after a short pause; unstable/fault → stays, says how to fix, "Re-take"
- Device connection lives at the top of this step (connect once; reconnect prompt if it drops)
- After the device readings: optional pH strip entry (pick the value), then the step completes

## Sharing (U5)
- **The final summary is shared as an image report card:** the app draws the report (status, each reading with its range bar, add-ons, Langelier estimate) as a picture and opens the phone's share sheet; the technician picks WhatsApp and the customer's chat
- Fallback where sharing files isn't supported: save the image to the gallery, then send it from WhatsApp
- The image is also kept with the check in History, so it can be re-sent
- **Identity on the image (U6, revised U9):** Service Sense OS logo and name at the top and a "Powered by Service Sense OS" footer with the mark. If a partner brand is configured (`app/web/src/config/brand.ts`), its name and logo lead and the "Powered by" footer stays. Also on it: date and time, location (coordinates + map link), technician name and mobile, product category, model and serial, customer name

## Decision log
| # | Question | Answer | Date |
|---|---|---|---|
| U1 | Step-by-step screens or one long page | Step-by-step, with a visible step-progress tracker | 2026-10-08 |
| U2 | Visual style and branding | Material You (Material 3) | 2026-10-08 |
| U3 | Seed colour for the Material scheme | Trust blue (`#1565C0`) | 2026-10-08 |
| U4 | How the Readings step guides the technician | Guided, one reading at a time, auto-advance | 2026-10-08 |
| U5 | Format of the WhatsApp summary | Image report card via the share sheet | 2026-10-08 |
| U6 | Whose identity is on the report image | Brand first; small 'Checked with Service Sense OS' footer | 2026-10-08 |
| U7 | First build too busy; where is the Bluetooth setup? | Minimal pass: device chip on every screen, connect-first Home, customer step hidden, location in Product, 3 steps, share inside Result | 2026-10-08 |
| U8 | App only showed dark on a dark-mode phone | Theme choice on Home (System / Light / Dark), remembered on the phone; System follows the phone | 2026-10-08 |
| U9 | Replace 'Partner Brand' | Service Sense OS identity with a logo (pulse mark on trust blue): welcome lockup 'Powered by Service Sense OS', Home top bar, report header and footer, favicon. Theme and profile moved into one Settings sheet on Home | 2026-10-08 |
