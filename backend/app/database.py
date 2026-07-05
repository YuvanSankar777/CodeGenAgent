"""Database setup via SQLAlchemy.

Primary store is MySQL. If MySQL is unreachable (e.g. Hugging Face Spaces
without an attached database), the app automatically falls back to a local
SQLite file so accounts and history keep working everywhere. ``DB_AVAILABLE``
reflects whether *some* database is usable.
"""
from __future__ import annotations

import logging
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

logger = logging.getLogger("codegen.database")

settings = get_settings()

Base = declarative_base()

# SQLite fallback location (writable in the container and locally).
_SQLITE_URL = "sqlite:///./codegen.db"


def _make_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(
            url, connect_args={"check_same_thread": False}, future=True
        )
    # ``pool_pre_ping`` recycles dead connections; ``pool_recycle`` avoids
    # MySQL's default 8h idle timeout dropping pooled connections under us.
    return create_engine(url, pool_pre_ping=True, pool_recycle=3600, future=True)


engine = _make_engine(settings.sqlalchemy_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Toggled to True once tables are confirmed to exist.
DB_AVAILABLE = False
# True once we've fallen back to SQLite (surfaced in /api/health as the backend).
USING_SQLITE = settings.sqlalchemy_url.startswith("sqlite")

_last_attempt = 0.0
_RETRY_INTERVAL = 10.0  # seconds between lazy reconnect attempts


def _create_all() -> None:
    from . import models  # noqa: F401 — register models on Base.metadata

    Base.metadata.create_all(bind=engine)


def _switch_to_sqlite() -> None:
    """Rebind the module engine/session to the SQLite fallback."""
    global engine, SessionLocal, USING_SQLITE
    engine = _make_engine(_SQLITE_URL)
    SessionLocal.configure(bind=engine)
    USING_SQLITE = True


def init_db(retries: int = 1, delay: float = 0.0) -> bool:
    """Ensure a usable database, preferring MySQL, falling back to SQLite.

    ``retries``/``delay`` let startup wait out a MySQL instance that is still
    booting before we give up and fall back.
    """
    global DB_AVAILABLE, _last_attempt
    _last_attempt = time.monotonic()

    # Try the configured (MySQL) engine first, with retries.
    if not USING_SQLITE:
        for attempt in range(1, retries + 1):
            try:
                _create_all()
                if not DB_AVAILABLE:
                    logger.info("MySQL connected — accounts & history enabled.")
                DB_AVAILABLE = True
                return True
            except Exception as exc:  # pragma: no cover - environment dependent
                if attempt < retries:
                    time.sleep(delay)
                else:
                    logger.warning(
                        "MySQL unavailable (%s). Falling back to SQLite.", exc
                    )

    # Fall back to (or continue on) SQLite.
    try:
        if not USING_SQLITE:
            _switch_to_sqlite()
        _create_all()
        if not DB_AVAILABLE:
            logger.info("Using SQLite fallback — accounts & history enabled.")
        DB_AVAILABLE = True
        return True
    except Exception as exc:  # pragma: no cover - should not happen
        DB_AVAILABLE = False
        logger.error("No database available (%s).", exc)
        return False


def ensure_db() -> bool:
    """Return current DB availability, lazily retrying if not yet ready."""
    if DB_AVAILABLE:
        return True
    if time.monotonic() - _last_attempt < _RETRY_INTERVAL:
        return False
    return init_db()


def get_db():
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
