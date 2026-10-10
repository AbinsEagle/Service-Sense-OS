"""Storage. The API talks to this, so tests can swap Supabase for a fake."""

import os
from functools import lru_cache
from typing import Optional, Protocol
from uuid import UUID


class VisitRepository(Protocol):
    def submit_visit(self, payload: dict) -> tuple[UUID, bool]: ...
    def get_visit(self, visit_id: UUID) -> Optional[dict]: ...
    def verify_token(self, token: str) -> Optional[str]: ...


class SupabaseRepository:
    def __init__(self, url: str, service_role_key: str):
        from supabase import create_client

        self._client = create_client(url, service_role_key)

    def submit_visit(self, payload: dict) -> tuple[UUID, bool]:
        # One database call; the SQL function saves the visit and its readings atomically.
        data = self._client.rpc("submit_visit", {"p": payload}).execute().data
        return UUID(data["id"]), data["created"]

    def get_visit(self, visit_id: UUID) -> Optional[dict]:
        rows = (
            self._client.table("visits")
            .select("*, readings(*)")
            .eq("id", str(visit_id))
            .limit(1)
            .execute()
            .data
        )
        if not rows:
            return None
        visit = rows[0]
        visit["readings"].sort(key=lambda r: r["taken_at"])
        return visit


    def verify_token(self, token: str) -> Optional[str]:
        """The Supabase Auth user id for a technician's access token, or None if it isn't valid."""
        try:
            res = self._client.auth.get_user(token)
        except Exception:
            return None
        return res.user.id if res and res.user else None


@lru_cache
def supabase_repository() -> SupabaseRepository:
    # Cached so a warm serverless instance reuses one client.
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return SupabaseRepository(url, key)
