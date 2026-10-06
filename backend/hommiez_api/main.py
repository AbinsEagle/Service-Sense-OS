"""Hommiez backend: receives completed site visits from the technician app
and stores them in Supabase (PRD §5.3)."""

import hmac
import os
from typing import Optional
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status

from .repository import VisitRepository, supabase_repository
from .schemas import SubmitOut, VisitIn

app = FastAPI(title="Hommiez API", version="0.1.0")


def get_repository() -> VisitRepository:
    try:
        return supabase_repository()
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from e


def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    # The web app calls this from its server side, so the key never reaches the browser.
    expected = os.environ.get("API_KEY")
    if not expected:
        # Fail closed: an unconfigured deployment must not accept writes.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "API_KEY is not configured")
    if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing or wrong X-API-Key")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Plain `def` handlers: the Supabase client is synchronous, so FastAPI runs
# these in a worker thread instead of blocking the event loop.
@app.post(
    "/visits",
    response_model=SubmitOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_api_key)],
)
def submit_visit(
    visit: VisitIn, response: Response, repo: VisitRepository = Depends(get_repository)
) -> SubmitOut:
    visit_id, created = repo.submit_visit(visit.model_dump(mode="json"))
    if not created:
        response.status_code = status.HTTP_200_OK
    return SubmitOut(id=visit_id, created=created)


@app.get("/visits/{visit_id}", dependencies=[Depends(require_api_key)])
def get_visit(visit_id: UUID, repo: VisitRepository = Depends(get_repository)) -> dict:
    visit = repo.get_visit(visit_id)
    if visit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "visit not found")
    return visit
