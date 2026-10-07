# Feature list: Service Sense OS

Status: **draft v0** (2026-10-08). Built one decision at a time; each answer
is logged at the bottom and folded into the list. UI design starts only after
this list is agreed.

Legend: ✅ built · 🟡 proposed · ❓ needs a decision · ⏭ later stage

## Stage plan
- **Stage 1 (now):** device + phone app, everything on the phone. No sign-in, no server.
- **Stage 2:** sign-in, saving to the server (built and parked in `backend/`), office view.

## 1. Who and why (❓ in progress)
- ✅ **Vision: install checks and service visits (Q1). Stage 1 builds the pre-installation check only (Q8);** service/fault visits are a later upgrade, once hardware and app run end to end
- ✅ **First rollout: one brand's service technicians (Q2).** Multi-brand later; every visit stores the brand from day one so that is a settings change, not a rewrite
- ❓ Who reads the result: technician only, customer, service centre, product/quality team

## 1b. Technician identity (from Q2)
- 🟡 Technician enters their mobile number once on the phone; it is stamped on every visit
- ⏭ OTP verification of the number (stage 2, with the server)

## 1a. Visit types (Q1, Q8)
- 🟡 **Stage 1: Install check only.** Is the site suitable for the product? What add-on does it need?
- ⏭ Service visit: record the complaint (category chips, note, photos), readings point to a likely cause (site problem vs product fault)

## 1d. Install check outcome (Q9)
- 🟡 **Site status:** *Ready* / *Ready with add-on* / *Not ready*, with the reason in one line (e.g. "Low voltage: 198 V")
- 🟡 **Add-ons that fix the site:** stabilizer, pre-filter/softener, booster pump, pressure-reducing valve
- 🟡 **Model suggestion** from the brand catalogue, driven by readings. Example rules (to confirm with the brand):
  - Purifier: TDS ≤ 200 → UV/UF fine; 200–2000 → RO; plus booster pump if inlet pressure is low
  - Stabilizer: pick the model whose working range covers the measured min/max voltage with margin
  - Heater / pump / chimney: capacity and voltage-range rules from the brand's catalogue
- The suggestion rules live in app data next to the limits, so the brand can tune them without a code change

## 1c. Product categories, first rollout (from Q5)
Which readings each category asks for (the app shows only these, in this order):

| Category | Water temp | TDS | Inlet pressure | Supply voltage | Sound |
|---|---|---|---|---|---|
| Water heater (geyser) | ✓ | ✓ scaling risk | ✓ | ✓ | |
| Water purifier | | ✓ input water | ✓ | ✓ | |
| Pump | | | ✓ | ✓ | ✓ bearing noise |
| Stabilizer / inverter | | | | ✓ min/max | ✓ hum, relay chatter |
| Kitchen chimney | | | | ✓ | ✓ motor noise |

- ❓ **Gap: chimney suction.** "Weak suction" is the top chimney complaint, and the device has no airflow sensor. Options for later: a small anemometer add-on, or a guided visual check in the app.

## 2. Device link
- ✅ Connect to `SSOS_B1.0` over Bluetooth from the browser (Chrome on Android; Bluefy on iPhone)
- ✅ Live reading per sensor with settled / unstable / fault status
- ✅ Survives disconnects; readings taken so far are kept
- ✅ Simulate mode for training and demos

## 3. Readings
- ✅ Water temperature, TDS (with water temp), supply voltage (min/max), inlet pressure
- ✅ Sound level from the phone microphone (uncalibrated estimate)
- ✅ Re-take replaces the earlier reading; full log of everything received
- ✅ **Verdict per reading from standards now, brand specs later (Q6).** Limits are app data per category, editable in settings, replaceable per model when the brand's specs arrive
- 🟡 **Low / high range bar on every reading (Q6):** a horizontal gauge with a green OK band, amber and red zones on both sides, and a marker at the reading. The verdict names the side: *Low voltage*, *High TDS*, which decides the add-on to recommend

Proposed starting limits (to confirm with the brand before field use):

| Reading | OK | Warn | Fail | Basis |
|---|---|---|---|---|
| Supply voltage | 216–244 V | 207–216 / 244–253 V | < 207 / > 253 V | 230 V ±6% (CEA supply regulations); ±10% as warn |
| TDS, drinking/purifier input | ≤ 500 ppm | 500–2000 ppm | > 2000 ppm | IS 10500 acceptable / permissible limits |
| TDS, heater scaling risk | ≤ 300 ppm | 300–500 ppm | > 500 ppm | proposal; hardness is the real driver, TDS a proxy |
| Inlet pressure | per category | | | from product manuals (to collect) |
| Water temp, sound | per category | | | from product manuals (to collect) |

## 4. Customer and site
- ✅ Customer name, phone, address, GPS location, notes
- 🟡 **Scan the product's QR code** to fill the serial number (QR holds the serial only, Q3; phone camera, manual entry fallback where the browser can't scan)
- 🟡 **After the scan, the technician picks category → model from a short list (Q4).** Works offline; recently used models shown first; the list is editable app data so the brand catalogue can be loaded later
- 🟡 Product details: brand, model, serial number, install date

## 5. Finishing a visit
- ✅ Finish visit (kept on the phone), start the next one
- 🟡 **WhatsApp summary to the customer (Q7):** one tap opens WhatsApp to the customer's number with a short report: product + serial, each reading with OK / Low / High, the verdict and the recommendation. Works from the phone with no server
- ❓ Visit history on the phone

## 6. Later stages
- ⏭ Sign-in per technician; visits saved to the server (`backend/`, Supabase)
- ⏭ Office/manager view of visits

## Decision log
| # | Question | Answer | Date |
|---|---|---|---|
| Q1 | Primary moment of use | Both install checks and service visits, equally | 2026-10-08 |
| Q2 | Who uses the device | One brand's service technicians first; bind to technician mobile number; product QR scan; other brands later | 2026-10-08 |
| Q3 | What the product QR contains | Serial number only | 2026-10-08 |
| Q4 | How the model is found from the serial | Technician picks category and model from a list | 2026-10-08 |
| Q5 | Product categories in the first rollout | Water heater, purifier, pump, stabilizer/inverter, kitchen chimney | 2026-10-08 |
| Q6 | Where pass/warn/fail limits come from | Indian standards now, brand specs later; show a low/high range bar | 2026-10-08 |
| Q7 | What the customer gets at the end of a visit | WhatsApp summary | 2026-10-08 |
| Q8 | How the complaint is recorded on a service visit | Later upgrade. Stage 1 focuses on the pre-installation check | 2026-10-08 |
| Q9 | What an install check concludes | Site status (with add-ons) plus a model suggestion | 2026-10-08 |
| Q10 | Is the product already on site during the check | _open_ | |
