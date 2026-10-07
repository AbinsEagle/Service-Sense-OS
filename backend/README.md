# Service Sense OS backend (FastAPI on Vercel → Supabase)

```
Technician app (phone browser) --HTTPS + sign-in token--> FastAPI on Vercel --service role--> Supabase
```

Receives a completed site visit (customer details + readings) and saves it
in Supabase: one row in `visits`, one row per reading in `readings`.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | `{"status": "ok"}`. No key needed. |
| POST | `/visits` | Saves a visit. `201` when new; `200` with `"created": false` if this visit `id` was already saved (safe retry). |
| GET | `/visits/{id}` | The visit with its readings, oldest first. |

Every call except `/health` needs one of:
- `Authorization: Bearer <access token>`: a technician signed in to the app with Supabase Auth. The visit is filed under their user id (any `technician_id` in the body is ignored), and they can only read their own visits.
- `X-API-Key: <API_KEY>`: trusted tools and scripts only (never put this key in the app). The body must include `technician_id`.

Interactive docs: `/docs`.

### Example `POST /visits`
Each reading is the device's Bluetooth message, forwarded unchanged, plus `taken_at` (when the phone received it):
```json
{
  "id": "8b3c6f3e-1d2a-4c55-9a77-0f2b6a1e9d01",
  "technician_id": "tech-01",
  "customer": { "name": "R. Menon", "phone": "+91 90000 00000", "address": "Kakkanad" },
  "location": { "latitude": 10.0159, "longitude": 76.3419, "label": "Kochi" },
  "started_at": "2026-10-08T10:00:00+05:30",
  "readings": [
    { "dev": "F294", "fw": "0.4.0", "sensor": "TDS", "value": 58, "unit": "ppm",
      "status": "settled", "temp": 25.3, "taken_at": "2026-10-08T10:01:00+05:30" },
    { "dev": "F294", "fw": "0.4.0", "sensor": "PRESS", "value": null, "unit": "bar",
      "status": "fault", "taken_at": "2026-10-08T10:03:00+05:30" },
    { "sensor": "SOUND", "value": 62, "unit": "dB", "taken_at": "2026-10-08T10:05:00+05:30" }
  ]
}
```

Rules the API enforces:
- `id` is a UUID the app generates when the visit starts. Resubmitting the same `id` never creates a duplicate.
- Sensor codes and units match the firmware: `TEMP` `C` (−55…125), `TDS` `ppm` (0…2000), `VOLT` `V` (0…300), `PRESS` `bar` (0…16), plus `SOUND` `dB` (0…150) from the phone. Out-of-range values (e.g. −127 °C from an unplugged probe) are rejected with `422`.
- `value` is `null` only when `status` is `fault`. Fault readings are stored too, so a visit shows which sensor failed.
- Device readings need `dev`, `fw` and `status`. Sound comes from the phone microphone, so it doesn't.
- Extra fields the firmware adds (TDS `temp`, VOLT `min`/`max`/`cal`) are kept in the reading's `extra` column.
- `result` (`pass`/`warn`/`fail`) is optional until the thresholds are agreed (PRD §8).
- Timestamps must include a timezone.
- The visit and all its readings are saved in one transaction: either everything is stored or nothing is.

## Run locally
```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # fill in the values
set -a; . ./.env; set +a
uvicorn ssos_api.main:app --reload    # http://127.0.0.1:8000/docs
pytest                                    # API tests
# Also run the SQL tests against a local Postgres:
TEST_DATABASE_URL=postgresql://postgres:<password>@localhost/postgres pytest
```

## One-time setup

### 1. Supabase
1. Create a project at supabase.com (region: Mumbai `ap-south-1` is closest to Kerala).
2. SQL Editor → run each file in `supabase/migrations/` **in filename order** (one query per file).
3. Project Settings → API: copy the **Project URL** and the **service_role** key.

### 2. Vercel
The existing Vercel project (service-sense-os.vercel.app) serves the BLE viewer from the repo root. The backend is a **second project** from the same repo:
1. vercel.com → Add New → Project → import `AbinsEagle/Service-Sense-OS` again (name it e.g. `service-sense-os-api`).
2. **Root Directory: `backend`**. Framework preset: Other.
3. Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY`, and `CORS_ORIGINS` set to the technician app's address (e.g. `https://service-sense-os.vercel.app`)
   (make one with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`).
4. Deploy. Check `https://<your-app>.vercel.app/health`.

Vercel redeploys on every push to the production branch.

## Security notes
- The service role key bypasses Supabase row-level security. It lives only in Vercel's environment variables, never in the repo or the browser.
- RLS is on for both tables with no policies, so the public anon key can't read or write visits.
- The app signs technicians in with Supabase Auth and sends their token; the backend checks it with Supabase on every call, so who filed a visit can't be faked.
- Only invited technicians should have accounts: in Supabase, **Authentication → Sign In / Providers → Email**, turn off "Allow new users to sign up", and add each technician under **Authentication → Users → Add user**.
- `API_KEY` is for scripts and tests only; it never goes in the app.
