"""Runs the Supabase migration on a throwaway local Postgres database.

Skipped unless TEST_DATABASE_URL points at a Postgres server where the user
may create databases, e.g. postgresql://postgres@localhost/postgres
"""

import json
import os
import uuid
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

ADMIN_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not ADMIN_URL, reason="TEST_DATABASE_URL not set")

MIGRATIONS = sorted((Path(__file__).parents[2] / "supabase" / "migrations").glob("*.sql"))


@pytest.fixture
def db():
    name = f"hommiez_test_{uuid.uuid4().hex[:8]}"
    with psycopg.connect(ADMIN_URL, autocommit=True) as admin:
        admin.execute(f"create database {name}")
        for role in ("anon", "authenticated", "service_role"):  # Supabase's built-in roles
            admin.execute(
                f"do $$ begin create role {role} nologin; exception when duplicate_object then null; end $$"
            )
    url = psycopg.conninfo.make_conninfo(ADMIN_URL, dbname=name)
    try:
        with psycopg.connect(url, autocommit=True) as conn:
            for m in MIGRATIONS:
                conn.execute(m.read_text())
            yield conn
    finally:
        with psycopg.connect(ADMIN_URL, autocommit=True) as admin:
            admin.execute(f"drop database {name} with (force)")


def payload(**overrides):
    p = {
        "id": str(uuid.uuid4()),
        "technician_id": "tech-01",
        "customer": {"name": "Test Customer", "phone": None, "address": None},
        "location": {"latitude": 10.0159, "longitude": 76.3419, "label": "Kochi"},
        "notes": None,
        "started_at": "2026-10-06T10:00:00+05:30",
        "readings": [
            {"sensor": "temperature", "value": 32.31, "unit": "C", "result": "pass", "status": "settled",
             "battery_v": 5.9, "device_id": "hommiez-001", "firmware_version": "dev",
             "taken_at": "2026-10-06T10:01:00+05:30"},
            {"sensor": "sound", "value": 62, "unit": "dB", "result": "pass", "status": None,
             "battery_v": None, "device_id": None, "firmware_version": None,
             "taken_at": "2026-10-06T10:02:00+05:30"},
        ],
    }
    p.update(overrides)
    return p


def submit(conn, p):
    return conn.execute("select public.submit_visit(%s::jsonb)", [json.dumps(p)]).fetchone()[0]


def count(conn, table):
    return conn.execute(f"select count(*) from public.{table}").fetchone()[0]


def test_saves_visit_and_readings(db):
    p = payload()
    assert submit(db, p) == {"id": p["id"], "created": True}
    row = db.execute("select customer_name, location_label from visits").fetchone()
    assert row == ("Test Customer", "Kochi")
    assert db.execute("select sensor, value from readings order by taken_at").fetchall() == [
        ("temperature", 32.31), ("sound", 62.0)
    ]


def test_retry_is_idempotent(db):
    p = payload()
    submit(db, p)
    assert submit(db, p) == {"id": p["id"], "created": False}
    assert (count(db, "visits"), count(db, "readings")) == (1, 2)


def test_bad_reading_rolls_back_the_whole_visit(db):
    p = payload()
    p["readings"][1]["result"] = "ok"
    with pytest.raises(psycopg.errors.CheckViolation):
        submit(db, p)
    assert (count(db, "visits"), count(db, "readings")) == (0, 0)


def test_public_roles_cannot_call_submit(db):
    granted = db.execute(
        "select has_function_privilege(r, 'public.submit_visit(jsonb)', 'execute') "
        "from unnest(array['anon', 'authenticated', 'service_role']) r"
    ).fetchall()
    assert granted == [(False,), (False,), (True,)]


def test_rls_enabled(db):
    assert db.execute(
        "select bool_and(relrowsecurity) from pg_class where relname in ('visits', 'readings')"
    ).fetchone()[0]
