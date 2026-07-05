"""Authentication: password hashing + signed session tokens.

Implemented with the Python standard library only (no extra dependencies):
- Passwords are hashed with PBKDF2-HMAC-SHA256 and a per-user random salt.
- Session tokens are compact HMAC-signed payloads (JWT-like) verified on each
  protected request.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db

settings = get_settings()

_PBKDF2_ROUNDS = 200_000


# --- Password hashing -------------------------------------------------------

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


# --- Tokens -----------------------------------------------------------------

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + settings.token_ttl_hours * 3600,
    }
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = _b64(
        hmac.new(settings.secret_key.encode(), body.encode(), hashlib.sha256).digest()
    )
    return f"{body}.{sig}"


def decode_token(token: str) -> Optional[dict]:
    try:
        body, sig = token.split(".")
        expected = _b64(
            hmac.new(
                settings.secret_key.encode(), body.encode(), hashlib.sha256
            ).digest()
        )
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_unb64(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# --- FastAPI dependency -----------------------------------------------------

def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """Resolve the bearer token to a User, or raise 401."""
    from .models import User

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(authorization.split(" ", 1)[1].strip())
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user
