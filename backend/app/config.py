"""Application configuration loaded from environment variables.

All secrets and environment-specific values are read here so the rest of the
codebase never touches ``os.environ`` directly.
"""
from __future__ import annotations

import os
from functools import lru_cache


class Settings:
    """Runtime settings sourced from environment variables."""

    def __init__(self) -> None:
        # --- LLM (Google Gemini) ---
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.gemini_temperature: float = float(os.getenv("GEMINI_TEMPERATURE", "0.2"))
        self.gemini_max_output_tokens: int = int(
            os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192")
        )

        # --- Database (MySQL) ---
        # Full SQLAlchemy URL wins if provided; otherwise assembled from parts.
        self.database_url: str = os.getenv("DATABASE_URL", "").strip()
        self.mysql_host: str = os.getenv("MYSQL_HOST", "localhost")
        self.mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
        self.mysql_user: str = os.getenv("MYSQL_USER", "codegen")
        self.mysql_password: str = os.getenv("MYSQL_PASSWORD", "codegen")
        self.mysql_database: str = os.getenv("MYSQL_DATABASE", "codegen")
        # SQLite fallback file path (used when MySQL is unreachable).
        self.sqlite_path: str = os.getenv("SQLITE_PATH", "codegen.db")

        # --- App ---
        self.cors_origins: list[str] = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "*").split(",")
            if o.strip()
        ]
        self.app_env: str = os.getenv("APP_ENV", "development")

        # --- Auth ---
        # Used to sign session tokens. Set a strong SECRET_KEY in production.
        self.secret_key: str = os.getenv("SECRET_KEY", "dev-insecure-change-me")
        self.token_ttl_hours: int = int(os.getenv("TOKEN_TTL_HOURS", "168"))

    @property
    def sqlalchemy_url(self) -> str:
        """Return the SQLAlchemy connection URL for MySQL."""
        if self.database_url:
            return self.database_url
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            "?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
