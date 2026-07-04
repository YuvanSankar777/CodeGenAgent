"""Convenience launcher for local development.

Loads a ``.env`` from the project root (if present) then starts uvicorn with
auto-reload. Production uses the Dockerfile's uvicorn command instead.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv

# Load .env from repo root (one level above backend/).
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
