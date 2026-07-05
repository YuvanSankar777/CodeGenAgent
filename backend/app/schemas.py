"""Pydantic request/response schemas for the API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    requirement: str = Field(
        ..., min_length=3, max_length=4000,
        description="Natural-language description of what the code should do.",
    )
    language: str = Field(
        default="python",
        description="Target programming language.",
    )
    include_tests: bool = Field(
        default=False,
        description="Ask the model to also produce unit tests.",
    )


class GenerateResponse(BaseModel):
    id: Optional[int] = None
    language: str
    filename: str
    code: str
    explanation: str
    dependencies: List[str] = []
    model: str
    persisted: bool = Field(
        default=False,
        description="True if the result was saved to the database.",
    )


class HistoryItem(BaseModel):
    id: int
    requirement: str
    language: str
    filename: Optional[str] = None
    code: str
    explanation: Optional[str] = None
    dependencies: List[str] = []
    model: Optional[str] = None
    created_at: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    db_available: bool
    model: str


# --- Auth -------------------------------------------------------------------


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=200)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut
