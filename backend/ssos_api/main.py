"""Service Sense OS backend: receives completed site visits from the technician app
and stores them in Supabase (PRD §5.3)."""

import hmac
import os
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .repository import VisitRepository, supabase_repository
from .schemas import SubmitOut, VisitIn

app = FastAPI(title="Service Sense OS API", version="0.2.0")

# The technician web app runs on another origin (its own Vercel site), so the
# browser needs CORS. Comma-separated, e.g. "https://service-sense-os.vercel.app".
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-API-Key"],
    )


def get_repository() -> VisitRepository:
    try:
        return supabase_repository()
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from e


def require_api_key(x_api_key: Optional[str]) -> None:
    # For trusted tools and scripts only; never ship this key in the web app.
    expected = os.environ.get("API_KEY")
    if not expected:
        # Fail closed: an unconfigured deployment must not accept writes.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "API_KEY is not configured")
    if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing or wrong X-API-Key")


@dataclass
class Caller:
    technician_id: Optional[str]  # set for a signed-in technician; None for an X-API-Key caller


def authenticate(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None),
    repo: VisitRepository = Depends(get_repository),
) -> Caller:
    """Technicians send their Supabase sign-in token; tools send X-API-Key."""
    if authorization is not None:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "expected 'Authorization: Bearer <token>'")
        user_id = repo.verify_token(token)
        if user_id is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sign-in expired or invalid")
        return Caller(technician_id=user_id)
    require_api_key(x_api_key)
    return Caller(technician_id=None)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Plain `def` handlers: the Supabase client is synchronous, so FastAPI runs
# these in a worker thread instead of blocking the event loop.
@app.post("/visits", response_model=SubmitOut, status_code=status.HTTP_201_CREATED)
def submit_visit(
    visit: VisitIn,
    response: Response,
    caller: Caller = Depends(authenticate),
    repo: VisitRepository = Depends(get_repository),
) -> SubmitOut:
    if caller.technician_id is not None:
        # A signed-in technician can only file visits under their own id.
        visit = visit.model_copy(update={"technician_id": caller.technician_id})
    elif visit.technician_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "technician_id is required with X-API-Key")
    visit_id, created = repo.submit_visit(visit.to_payload())
    if not created:
        response.status_code = status.HTTP_200_OK
    return SubmitOut(id=visit_id, created=created)


@app.get("/visits/{visit_id}")
def get_visit(
    visit_id: UUID, caller: Caller = Depends(authenticate), repo: VisitRepository = Depends(get_repository)
) -> dict:
    visit = repo.get_visit(visit_id)
    # Technicians only see their own visits; someone else's looks the same as a missing one.
    if visit is None or (caller.technician_id is not None and visit["technician_id"] != caller.technician_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "visit not found")
    return visit
