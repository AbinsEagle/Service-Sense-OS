# Feature list: Service Sense OS

Status: **v1: stage 1 core agreed** (2026-10-08). Built one decision at a time; each answer
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

## 1e. Stage 1 install-check flow (Q10)
The customer has already bought the product; the technician arrives to install it.
1. Scan the product QR (serial), pick category and model
2. Customer name, phone, address, location
3. Take only the readings that category needs (see 1c)
4. Site status for that product + add-ons, with the low/high bars
5. WhatsApp summary to the customer, finish

## 1d. Install check outcome (Q9, Q10)
- 🟡 **Site status:** *Ready* / *Ready with add-on* / *Not ready*, with the reason in one line (e.g. "Low voltage: 198 V")
- 🟡 **Add-ons that fix the site:** stabilizer, pre-filter/softener, booster pump, pressure-reducing valve
- ⏭ Customer declines the add-on: acknowledgement / blocking rules decided later (Q11)
- ⏭ Model suggestion from readings (later upgrade, Q10). Stage 1 checks the product the customer has already bought

## 1c. Product categories, first rollout (Q5, Q14)
Stage 1 is the site check **before** installation only (Q14), so it takes the readings that describe the site. Water temperature and sound describe a running product, so they are hidden until the post-install test (later upgrade); the device still measures them.

| Category | TDS | Inlet pressure | Supply voltage |
|---|---|---|---|
| Water heater (geyser) | ✓ scaling risk | ✓ | ✓ |
| Water purifier | ✓ input water | ✓ | ✓ |
| Pump | | ✓ | ✓ |
| Stabilizer / inverter | | | ✓ min/max |
| Kitchen chimney | | | ✓ |

- ⏭ Post-install commissioning test: heater reaches temperature, chimney/pump noise, output pressure
- ❓ **Gap: chimney suction.** "Weak suction" is the top chimney complaint, and the device has no airflow sensor. Options for later: a small anemometer add-on, or a guided visual check in the app.

## 1f. Language (Q12)
- ✅ English only in stage 1 (app and WhatsApp summary). Text kept in one place so languages can be added later

## 2. Device link
- ✅ Connect to `SSOS_B1.0` over Bluetooth from the browser (Chrome on Android; Bluefy on iPhone)
- ✅ **Website only in stage 1 (Q18):** opened from the link, needs mobile signal to load. Installable offline app (PWA) and a Play Store build are later options
- ✅ Live reading per sensor with settled / unstable / fault status
- ✅ Survives disconnects; readings taken so far are kept
- ✅ Simulate mode for training and demos

## 3. Readings
- ✅ Water temperature, TDS (with water temp), supply voltage (min/max), inlet pressure
- 🟡 **Voltage is watched for 5 s for every category (Q16);** firmware change from today's 4 s (min / max / median reported)
- ✅ Sound level from the phone microphone (uncalibrated estimate); hidden in stage 1 (post-install only)
- ✅ Re-take replaces the earlier reading; full log of everything received
- 🟡 **Every required reading must be settled to finish (Q17).** Unstable or sensor-fault readings must be re-taken; the app says how to fix it (probe fully in water, check the connector)
- ✅ **Verdict per reading from standards now, brand specs later (Q6).** Limits are app data per category, replaceable per model when the brand's specs arrive
- ✅ **Limits are changed only by us, through an app update (Q15)**, so every technician gets the same verdict for the same reading. No limit settings on the phone
- 🟡 **Low / high range bar on every reading (Q6):** a horizontal gauge with a green OK band, amber and red zones on both sides, and a marker at the reading. The verdict names the side: *Low voltage*, *High TDS*, which decides the add-on to recommend

Proposed starting limits (to confirm with the brand before field use):

| Reading | OK | Warn | Fail | Basis |
|---|---|---|---|---|
| Supply voltage | 216–244 V | 207–216 / 244–253 V | < 207 / > 253 V | 230 V ±6% (CEA supply regulations); ±10% as warn |
| TDS, drinking/purifier input | ≤ 500 ppm | 500–2000 ppm | > 2000 ppm | IS 10500 acceptable / permissible limits |
| TDS, heater scaling risk | ≤ 300 ppm | 300–500 ppm | > 500 ppm | proposal; hardness is the real driver, TDS a proxy |
| Inlet pressure | per category | | | from product manuals (to collect) |
| Water temp, sound | per category | | | from product manuals (to collect) |

## 3a. Manual water tests (Q19)
- 🟡 **pH from indicator paper strips, entered by hand, optional (Q19).** The technician picks the matching colour/value (e.g. 5.0–9.0 in 0.5 steps); shown with its own OK / Low / High bar (IS 10500: 6.5–8.5). Marked "strip" in the summary so it isn't mistaken for a probe reading
- ⏭ pH probe on the device (needs a free ADC input, isolation from the TDS probe, calibration)
- 🟡 **Langelier index, estimated (Q20):** computed when pH is entered, from pH (strip), TDS and water temperature (device), with calcium hardness and alkalinity **estimated from TDS** using typical ratios from published water data. Shown as *Scale-forming* / *Balanced* / *Corrosive* and always labelled "estimate"
  - Formula (Carrier): pHs = (9.3 + A + B) − (C + D); A = (log₁₀TDS − 1)/10; B = −13.12·log₁₀(T °C + 273) + 34.55; C = log₁₀(Ca hardness as CaCO₃) − 0.4; D = log₁₀(alkalinity as CaCO₃); LSI = pH − pHs
  - Bands (proposed): LSI < −0.5 corrosive · −0.5 to +0.5 balanced · > +0.5 scale-forming
  - The TDS→hardness and TDS→alkalinity ratios are app data; validate them against a few lab-tested local samples before trusting the label in the field
- ✅ One general TDS ratio for every site in stage 1 (Q21)
- ⏭ Water-source pick (open well / borewell / municipal) with per-source ratios
- ⏭ Hardness/alkalinity strip entry or probe, to replace the estimate

## 4. Customer and site
- ✅ Customer name, phone, address, GPS location, notes
- 🟡 **Scan the product's QR code** to fill the serial number (QR holds the serial only, Q3; phone camera, manual entry fallback where the browser can't scan)
- 🟡 **After the scan, the technician picks category → model from a short list (Q4).** Works offline; recently used models shown first; the list is editable app data so the brand catalogue can be loaded later
- 🟡 Product details: brand, model, serial number, install date

## 5. Finishing a visit
- ✅ Finish visit (kept on the phone), start the next one
- 🟡 **WhatsApp summary to the customer (Q7), shared as an image report card (UI plan U5):** product + serial, each reading with OK / Low / High, the verdict and the recommendation. Works from the phone with no server
- 🟡 **Check history on the phone (Q13):** list of finished checks, search by customer or serial, open one and re-send its WhatsApp summary. No export; the office sees checks from stage 2

## 5a. Open items carried forward
- Q11: customer declines the add-on (deferred)
- Chimney suction gap (no airflow sensor)
- Inlet-pressure limits per category: collect from product manuals
- Firmware: voltage window 4 s → 5 s (Q16)

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
| Q10 | Is the product already on site during the check | Yes, already bought. Model suggestion parked for later | 2026-10-08 |
| Q11 | What happens when the site isn't ready and the customer declines the fix | Decide later | 2026-10-08 |
| Q12 | Language of the app and the WhatsApp summary | English only | 2026-10-08 |
| Q13 | Visit history and reporting without a server | History on the phone only | 2026-10-08 |
| Q14 | Pre-install check only, or also a post-install test | Before installation only | 2026-10-08 |
| Q15 | Who can change the limits in stage 1 | Only us, via app update | 2026-10-08 |
| Q16 | How long the voltage is watched | 5 s for every category | 2026-10-08 |
| Q17 | Can a check finish with unstable or faulty readings | No: must re-take until settled | 2026-10-08 |
| Q18 | How technicians get the app | Website only (needs signal) | 2026-10-08 |
| Q19 | pH probe and Langelier index | pH from paper strips, optional manual entry; probe later | 2026-10-08 |
| Q20 | Hardness/alkalinity for the Langelier index | Estimate from TDS with typical ratios; LSI from pH + TDS + temp | 2026-10-08 |
| Q21 | Ask the water source to improve the estimate | Not now; one general ratio, water source is a later upgrade | 2026-10-08 |
