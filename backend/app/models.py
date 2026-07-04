"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from .database import Base


class Generation(Base):
    """One code-generation event: the requirement in, the code out."""

    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requirement = Column(Text, nullable=False)
    language = Column(String(32), nullable=False, index=True)
    filename = Column(String(255), nullable=True)
    code = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    dependencies = Column(Text, nullable=True)  # comma-separated
    model = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "requirement": self.requirement,
            "language": self.language,
            "filename": self.filename,
            "code": self.code,
            "explanation": self.explanation,
            "dependencies": (
                self.dependencies.split(",") if self.dependencies else []
            ),
            "model": self.model,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
