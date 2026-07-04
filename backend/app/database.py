"""Database setup for MySQL via SQLAlchemy.

The connection is created lazily and defensively: if MySQL is unreachable
(common on ephemeral hosts like Hugging Face Spaces without an attached
database), the app still starts and code generation keeps working — only the
history feature is disabled. ``DB_AVAILABLE`` reflects that state.
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

# ``pool_pre_ping`` recycles dead connections; ``pool_recycle`` avoids MySQL's
# default 8h idle timeout dropping pooled connections under us.
engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Toggled to True once tables are confirmed to exist.
DB_AVAILABLE = False

# Monotonic timestamp of the last connection attempt, used to throttle the
# lazy reconnect in ``ensure_db`` so we don't hammer a genuinely-absent DB on
# every request.
_last_attempt = 0.0
_RETRY_INTERVAL = 10.0  # seconds between lazy reconnect attempts


def init_db(retries: int = 1, delay: float = 0.0) -> bool:
    """Create tables if possible. Returns True when the DB is usable.

    ``retries``/``delay`` let startup wait out a database that is still booting
    (e.g. MySQL's first-run init, which briefly refuses connections even after
    its healthcheck passes).
    """
    global DB_AVAILABLE, _last_attempt
    # Import models so they register on ``Base.metadata`` before create_all.
    from . import models  # noqa: F401

    _last_attempt = time.monotonic()
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            if not DB_AVAILABLE:
                logger.info("MySQL connected — generation history enabled.")
            DB_AVAILABLE = True
            return True
        except Exception as exc:  # pragma: no cover - depends on environment
            last_exc = exc
            if attempt < retries:
                time.sleep(delay)

    DB_AVAILABLE = False
    logger.warning(
        "MySQL unavailable (%s). Running without history persistence.", last_exc
    )
    return False


def ensure_db() -> bool:
    """Return current DB availability, lazily retrying a dead connection.

    Called on each DB-backed request so history self-heals the moment MySQL
    becomes reachable, without a one-shot startup probe deciding for the whole
    process lifetime. Retries are throttled to ``_RETRY_INTERVAL``.
    """
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
