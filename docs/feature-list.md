# Feature list: Service Sense OS

Status: **draft v0** (2026-10-08). Built one decision at a time; each answer
is logged at the bottom and folded into the list. UI design starts only after
this list is agreed.

Legend: ✅ built · 🟡 proposed · ❓ needs a decision · ⏭ later stage

## Stage plan
- **Stage 1 (now):** device + phone app, everything on the phone. No sign-in, no server.
- **Stage 2:** sign-in, saving to the server (built and parked in `backend/`), office view.

## 1. Who and why (❓ in progress)
- ❓ Primary moment of use: pre-installation site check, service/complaint visit, or both (Q1)
- ❓ Who holds the device: brand technicians, dealer/franchise technicians, or independents
- ❓ Who reads the result: technician only, customer, service centre, product/quality team

## 2. Device link
- ✅ Connect to `SSOS_B1.0` over Bluetooth from the browser (Chrome on Android; Bluefy on iPhone)
- ✅ Live reading per sensor with settled / unstable / fault status
- ✅ Survives disconnects; readings taken so far are kept
- ✅ Simulate mode for training and demos

## 3. Readings
- ✅ Water temperature, TDS (with water temp), supply voltage (min/max), inlet pressure
- ✅ Sound level from the phone microphone (uncalibrated estimate)
- ✅ Re-take replaces the earlier reading; full log of everything received
- ❓ Pass / warn / fail verdict per reading: who sets the limits, and do they depend on the product being installed or serviced?

## 4. Customer and site
- ✅ Customer name, phone, address, GPS location, notes
- 🟡 Product details (model, serial number, install date)

## 5. Finishing a visit
- ✅ Finish visit (kept on the phone), start the next one
- ❓ What the customer gets at the end (nothing, a WhatsApp summary, a PDF report)
- ❓ Visit history on the phone

## 6. Later stages
- ⏭ Sign-in per technician; visits saved to the server (`backend/`, Supabase)
- ⏭ Office/manager view of visits

## Decision log
| # | Question | Answer | Date |
|---|---|---|---|
| Q1 | Primary moment of use | _open_ | |
