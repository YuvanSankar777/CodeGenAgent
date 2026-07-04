"""FastAPI application entry point.

Exposes the JSON API under ``/api`` and, in production, serves the built React
frontend as static files from the same container (single-image deploy).
"""
from __future__ import annotations

import logging
import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import database
from .config import get_settings
from .database import get_db, init_db
from .gemini_client import GeminiError, generate_code
from .models import Generation
from .schemas import (
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    HistoryItem,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("codegen.main")

settings = get_settings()

app = FastAPI(
    title="CodeGenAgent API",
    description="Generate code from natural-language requirements using Gemini.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # Retry with backoff so a database that is still booting (MySQL first-run
    # init briefly refuses connections even after its healthcheck passes) does
    # not permanently disable history for the process.
    init_db(retries=15, delay=1.0)


# --- API routes -------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        db_available=database.ensure_db(),
        model=settings.gemini_model,
    )


@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest, db: Session = Depends(get_db)) -> GenerateResponse:
    try:
        result = generate_code(
            requirement=req.requirement,
            language=req.language,
            include_tests=req.include_tests,
        )
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    persisted = False
    gen_id = None
    if database.ensure_db():
        try:
            row = Generation(
                requirement=req.requirement,
                language=result["language"],
                filename=result.get("filename"),
                code=result["code"],
                explanation=result.get("explanation"),
                dependencies=",".join(result.get("dependencies", [])),
                model=result.get("model"),
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            gen_id = row.id
            persisted = True
        except Exception:  # pragma: no cover - db runtime issues
            db.rollback()
            logger.exception("Failed to persist generation")

    return GenerateResponse(
        id=gen_id,
        language=result["language"],
        filename=result.get("filename", "solution.txt"),
        code=result["code"],
        explanation=result.get("explanation", ""),
        dependencies=result.get("dependencies", []),
        model=result.get("model", settings.gemini_model),
        persisted=persisted,
    )


@app.get("/api/history", response_model=list[HistoryItem])
def history(limit: int = 20, db: Session = Depends(get_db)) -> list[HistoryItem]:
    if not database.ensure_db():
        return []
    limit = max(1, min(limit, 100))
    rows = (
        db.query(Generation)
        .order_by(Generation.created_at.desc())
        .limit(limit)
        .all()
    )
    return [HistoryItem(**row.as_dict()) for row in rows]


@app.delete("/api/history/{gen_id}")
def delete_history(gen_id: int, db: Session = Depends(get_db)) -> dict:
    if not database.ensure_db():
        raise HTTPException(status_code=503, detail="Database not available.")
    row = db.get(Generation, gen_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(row)
    db.commit()
    return {"deleted": gen_id}


# --- Static frontend (production single-container deploy) --------------------
# When the React app has been built into ``frontend_dist`` we serve it here so
# one container hosts both API and UI (ideal for Hugging Face Spaces).
_FRONTEND_DIST = os.getenv("FRONTEND_DIST", "/app/frontend_dist")

if os.path.isdir(_FRONTEND_DIST):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(_FRONTEND_DIST, "assets")),
        name="assets",
    )

    @app.get("/")
    def _index() -> FileResponse:
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def _spa(full_path: str) -> FileResponse:
        # Anything not matched by /api or /assets falls back to the SPA shell.
        candidate = os.path.join(_FRONTEND_DIST, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
