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

## Decision log
| # | Question | Answer | Date |
|---|---|---|---|
| U1 | Step-by-step screens or one long page | _open_ | |
