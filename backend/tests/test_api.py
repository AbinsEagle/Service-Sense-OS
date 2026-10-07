from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from ssos_api.main import app, get_repository

KEY = "test-key"


class FakeRepository:
    def __init__(self):
        self.visits = {}

    def submit_visit(self, payload):
        visit_id = UUID(payload["id"])
        if visit_id in self.visits:
            return visit_id, False
        self.visits[visit_id] = payload
        return visit_id, True

    def get_visit(self, visit_id):
        return self.visits.get(visit_id)


@pytest.fixture
def repo(monkeypatch):
    monkeypatch.setenv("API_KEY", KEY)
    fake = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
def client(repo):
    return TestClient(app, headers={"X-API-Key": KEY})


def reading(**overrides):
    # A real device message (firmware/ssos_main) plus the phone's receive time.
    r = {
        "dev": "F294",
        "fw": "0.4.0",
        "sensor": "TEMP",
        "value": 32.31,
        "unit": "C",
        "status": "settled",
        "taken_at": "2026-10-08T10:01:00+05:30",
    }
    r.update(overrides)
    return r


def visit(**overrides):
    v = {
        "id": str(uuid4()),
        "technician_id": "tech-01",
        "customer": {"name": "Test Customer", "phone": "+91 90000 00000"},
        "location": {"latitude": 10.0159, "longitude": 76.3419, "label": "Kochi"},
        "started_at": "2026-10-06T10:00:00+05:30",
        "readings": [
            reading(),
            reading(sensor="TDS", value=58, unit="ppm", temp=25.3),
            reading(sensor="VOLT", value=231.4, unit="V", min=229.8, max=232.0, cal=False),
            reading(sensor="PRESS", value=2.45, unit="bar", result="warn"),
            reading(sensor="TEMP", value=None, status="fault"),
            # sound comes from the phone microphone, so no device fields
            reading(sensor="SOUND", value=62, unit="dB", status=None, dev=None, fw=None),
        ],
    }
    v.update(overrides)
    return v


def test_health_needs_no_key():
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_submit_saves_visit(client, repo):
    v = visit()
    res = client.post("/visits", json=v)
    assert res.status_code == 201
    assert res.json() == {"id": v["id"], "created": True}
    assert len(repo.visits[UUID(v["id"])]["readings"]) == 6


def test_retry_with_same_id_is_not_saved_twice(client, repo):
    v = visit()
    client.post("/visits", json=v)
    res = client.post("/visits", json=v)
    assert res.status_code == 200
    assert res.json()["created"] is False
    assert len(repo.visits) == 1


def test_get_visit(client):
    v = visit()
    client.post("/visits", json=v)
    assert client.get(f"/visits/{v['id']}").json()["technician_id"] == "tech-01"
    assert client.get(f"/visits/{uuid4()}").status_code == 404


@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "wrong"}])
def test_rejects_missing_or_wrong_key(repo, headers):
    res = TestClient(app, headers=headers).post("/visits", json=visit())
    assert res.status_code == 401
    assert repo.visits == {}


def test_fails_closed_without_configured_key(repo, monkeypatch):
    monkeypatch.delenv("API_KEY")
    res = TestClient(app, headers={"X-API-Key": ""}).post("/visits", json=visit())
    assert res.status_code == 503


def test_missing_supabase_config_is_a_clear_503(monkeypatch):
    monkeypatch.setenv("API_KEY", KEY)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    res = TestClient(app, headers={"X-API-Key": KEY}).post("/visits", json=visit())
    assert res.status_code == 503
    assert "SUPABASE_URL" in res.json()["detail"]


@pytest.mark.parametrize(
    "bad",
    [
        reading(unit="F"),                                   # wrong unit
        reading(value=-127),                                 # DS18B20 disconnected value
        reading(sensor="PRESS", value=20, unit="bar"),       # beyond the transducer
        reading(sensor="PRESS", value=0.25, unit="MPa"),     # firmware sends bar
        reading(sensor="temperature"),                       # not a firmware sensor code
        reading(value=None),                                 # null value without a fault
        reading(result="ok"),                                # not pass/warn/fail
        reading(dev=None),                                   # device reading without unit ID
        reading(note={"nested": 1}),                         # extra fields must be simple values
        reading(taken_at="2026-10-08T10:01:00"),             # no timezone
    ],
)
def test_rejects_bad_reading(client, repo, bad):
    res = client.post("/visits", json=visit(readings=[bad]))
    assert res.status_code == 422
    assert repo.visits == {}


def test_rejects_visit_without_readings(client):
    assert client.post("/visits", json=visit(readings=[])).status_code == 422


def test_payload_sent_to_storage_matches_sql_function(client, repo):
    # submit_visit() in the migrations reads these exact keys.
    v = visit()
    client.post("/visits", json=v)
    stored = repo.visits[UUID(v["id"])]
    assert set(stored) == {"id", "technician_id", "customer", "location", "notes", "started_at", "readings"}
    tds = stored["readings"][1]
    assert tds == {
        "sensor": "TDS", "value": 58.0, "unit": "ppm", "result": None, "status": "settled",
        "battery_v": None, "device_id": "F294", "firmware_version": "0.4.0",
        "taken_at": "2026-10-08T10:01:00+05:30", "extra": {"temp": 25.3},
    }
    assert stored["readings"][0]["extra"] is None
