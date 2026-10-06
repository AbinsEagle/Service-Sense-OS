# Hommiez backend (FastAPI on Vercel → Supabase)

```
Phone web app (server side) --HTTPS + X-API-Key--> FastAPI on Vercel --service role--> Supabase
```

Receives a completed site visit (customer details + readings) and saves it
in Supabase: one row in `visits`, one row per reading in `readings`.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | `{"status": "ok"}`. No key needed. |
| POST | `/visits` | Saves a visit. `201` when new; `200` with `"created": false` if this visit `id` was already saved (safe retry). |
| GET | `/visits/{id}` | The visit with its readings, oldest first. |

Every call except `/health` needs the `X-API-Key` header. Interactive docs: `/docs`.

### Example `POST /visits`
```json
{
  "id": "8b3c6f3e-1d2a-4c55-9a77-0f2b6a1e9d01",
  "technician_id": "tech-01",
  "customer": { "name": "R. Menon", "phone": "+91 90000 00000", "address": "Kakkanad" },
  "location": { "latitude": 10.0159, "longitude": 76.3419, "label": "Kochi" },
  "started_at": "2026-10-06T10:00:00+05:30",
  "readings": [
    { "sensor": "temperature", "value": 32.31, "unit": "C", "result": "pass", "status": "settled",
      "battery_v": 5.9, "device_id": "hommiez-001", "firmware_version": "dev",
      "taken_at": "2026-10-06T10:01:00+05:30" },
    { "sensor": "sound", "value": 62, "unit": "dB", "result": "pass",
      "taken_at": "2026-10-06T10:05:00+05:30" }
  ]
}
```

Rules the API enforces:
- `id` is a UUID the app generates when the visit starts. Resubmitting the same `id` never creates a duplicate.
- Units and accepted ranges per sensor: temperature `C` (−55…125), tds `ppm` (0…2000), voltage `V` (0…300), pressure `MPa` (0…1.6), sound `dB` (0…150). Out-of-range values (e.g. −127 °C from an unplugged probe) are rejected with `422`.
- `result` is `pass` / `warn` / `fail`. `status` (optional) is `settled` / `unstable` / `fault`.
- Device readings need `device_id` and `firmware_version`. Sound comes from the phone microphone, so it doesn't.
- Timestamps must include a timezone.
- The visit and all its readings are saved in one transaction: either everything is stored or nothing is.

## Run locally
```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # fill in the values
set -a; . ./.env; set +a
uvicorn hommiez_api.main:app --reload    # http://127.0.0.1:8000/docs
pytest                                    # API tests
# Also run the SQL tests against a local Postgres:
TEST_DATABASE_URL=postgresql://postgres:<password>@localhost/postgres pytest
```

## One-time setup

### 1. Supabase
1. Create a project at supabase.com (region: Mumbai `ap-south-1` is closest to Kerala).
2. SQL Editor → paste and run `supabase/migrations/20261006000000_visits_readings.sql`.
3. Project Settings → API: copy the **Project URL** and the **service_role** key.

### 2. Vercel
1. vercel.com → Add New Project → import `AbinsEagle/Service-Sense-OS`.
2. **Root Directory: `backend`**. Framework preset: Other.
3. Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY`
   (make one with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`).
4. Deploy. Check `https://<your-app>.vercel.app/health`.

Vercel redeploys on every push to the production branch.

## Security notes
- The service role key bypasses Supabase row-level security. It lives only in Vercel's environment variables, never in the repo or the browser.
- RLS is on for both tables with no policies, so the public anon key can't read or write visits.
- Call this API from the web app's **server side** (a Next.js route handler), so `API_KEY` never reaches the phone's browser. Per-technician login (Supabase Auth) can replace the shared key later.
