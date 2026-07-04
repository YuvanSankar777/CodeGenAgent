"""Database setup for MySQL via SQLAlchemy.

The connection is created lazily and defensively: if MySQL is unreachable
(common on ephemeral hosts like Hugging Face Spaces without an attached
database), the app still starts and code generation keeps working — only the
history feature is disabled. ``DB_AVAILABLE`` reflects that state.
"""
from __future__ import annotations

import logging

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


def init_db() -> bool:
    """Create tables if possible. Returns True when the DB is usable."""
    global DB_AVAILABLE
    # Import models so they register on ``Base.metadata`` before create_all.
    from . import models  # noqa: F401

    try:
        Base.metadata.create_all(bind=engine)
        DB_AVAILABLE = True
        logger.info("MySQL connected — generation history enabled.")
    except Exception as exc:  # pragma: no cover - depends on environment
        DB_AVAILABLE = False
        logger.warning(
            "MySQL unavailable (%s). Running without history persistence.", exc
        )
    return DB_AVAILABLE


def get_db():
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
