"""FastAPI application entry point.

Exposes the JSON API under ``/api`` and, in production, serves the built React
frontend as static files from the same container (single-image deploy).
"""
from __future__ import annotations

import logging
import os
import re

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import database
from .auth import create_token, get_current_user, hash_password, verify_password
from .config import get_settings
from .database import get_db, init_db
from .gemini_client import GeminiError, generate_code
from .models import Generation, User
from .schemas import (
    AuthResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    HistoryItem,
    LoginRequest,
    SignupRequest,
    UserOut,
)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

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


# --- Auth routes ------------------------------------------------------------


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not database.ensure_db():
        raise HTTPException(status_code=503, detail="Database not available.")
    email = req.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )
    user = User(
        email=email,
        name=(req.name or "").strip() or None,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(
        token=create_token(user.id, user.email), user=UserOut(**user.as_dict())
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not database.ensure_db():
        raise HTTPException(status_code=503, detail="Database not available.")
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return AuthResponse(
        token=create_token(user.id, user.email), user=UserOut(**user.as_dict())
    )


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(**user.as_dict())


# --- Generation (requires auth) ---------------------------------------------


@app.post("/api/generate", response_model=GenerateResponse)
def generate(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GenerateResponse:
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
                user_id=user.id,
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
def history(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[HistoryItem]:
    if not database.ensure_db():
        return []
    limit = max(1, min(limit, 100))
    rows = (
        db.query(Generation)
        .filter(Generation.user_id == user.id)
        .order_by(Generation.created_at.desc())
        .limit(limit)
        .all()
    )
    return [HistoryItem(**row.as_dict()) for row in rows]


@app.delete("/api/history/{gen_id}")
def delete_history(
    gen_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not database.ensure_db():
        raise HTTPException(status_code=503, detail="Database not available.")
    row = db.get(Generation, gen_id)
    if not row or row.user_id != user.id:
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
