# UI plan: stage 1 (pre-installation site check)

Built from `docs/feature-list.md` v1. Decisions are logged at the bottom, one at a time.

## Screen map
1. **First run: technician profile** (once): name, mobile number
2. **Home:** "New install check" + check history (search by customer or serial)
3. **Product:** scan the product QR (serial) or type it → pick category → pick model (recent first)
4. **Customer:** name, phone (for WhatsApp), address, location
5. **Readings:** connect the device; only the readings this category needs; each with a low/high range bar; must be settled to continue; optional pH strip entry (→ Langelier estimate)
6. **Result:** site status (Ready / Ready with add-on / Not ready), reasons, add-ons, Langelier estimate
7. **Share:** WhatsApp summary to the customer → done → Home
- **History detail:** the finished check, re-send on WhatsApp

## Navigation (U1)
- **Step-by-step:** one task per screen, one big primary button at the thumb (bottom of the screen)
- **Step tracker always visible** at the top: Product · Customer · Readings · Result · Share, each marked *done* ✓, *current*, *to do*, or *needs attention* (e.g. a reading to re-take). Tapping a done step goes back to it; answers are kept

## Decision log
| # | Question | Answer | Date |
|---|---|---|---|
| U1 | Step-by-step screens or one long page | Step-by-step, with a visible step-progress tracker | 2026-10-08 |
| U2 | Visual style and branding | _open_ | |
