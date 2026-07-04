"""Thin wrapper around the Google Gemini API (google-genai SDK).

Uses structured output: Gemini is asked to return JSON conforming to
``RESPONSE_SCHEMA`` so the backend never has to scrape code out of prose.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict

from google import genai
from google.genai import types

from .config import get_settings
from .prompts import SYSTEM_INSTRUCTION, build_user_prompt

logger = logging.getLogger("codegen.gemini")
settings = get_settings()

# 4) STRUCTURED OUTPUT — the JSON contract the model must satisfy.
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "language": {"type": "string"},
        "filename": {"type": "string"},
        "code": {"type": "string"},
        "explanation": {"type": "string"},
        "dependencies": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["language", "filename", "code", "explanation"],
    "propertyOrdering": [
        "language",
        "filename",
        "code",
        "explanation",
        "dependencies",
    ],
}


class GeminiError(RuntimeError):
    """Raised when the Gemini call fails or returns unusable output."""


# Gemini occasionally returns transient errors (503 "high demand", 429 rate
# limit, 5xx). These are safe to retry with backoff.
_TRANSIENT_CODES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_BACKOFF_BASE = 1.5  # seconds: 1.5, 3.0, 6.0


def _is_transient(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    if code in _TRANSIENT_CODES:
        return True
    text = str(exc).upper()
    return any(str(c) in text for c in _TRANSIENT_CODES) or "UNAVAILABLE" in text


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise GeminiError(
                "GEMINI_API_KEY is not set. Add it to your environment/.env."
            )
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def generate_code(
    requirement: str, language: str, include_tests: bool
) -> Dict[str, Any]:
    """Call Gemini and return the parsed structured result."""
    client = _get_client()
    user_prompt = build_user_prompt(requirement, language, include_tests)

    config_kwargs: Dict[str, Any] = dict(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=settings.gemini_temperature,
        max_output_tokens=settings.gemini_max_output_tokens,
        response_mime_type="application/json",
        response_schema=RESPONSE_SCHEMA,
    )
    # Gemini 2.5 models spend part of the output-token budget on hidden
    # "thinking" tokens, which can truncate longer code mid-JSON. Disable it so
    # the whole budget goes to the actual answer. Guarded: older SDKs / models
    # may not support ThinkingConfig.
    try:
        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except Exception:  # pragma: no cover - SDK/model without thinking support
        pass
    config = types.GenerateContentConfig(**config_kwargs)

    last_exc: Exception | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=user_prompt,
                config=config,
            )
            break
        except Exception as exc:  # pragma: no cover - network dependent
            last_exc = exc
            if attempt < _MAX_RETRIES and _is_transient(exc):
                wait = _BACKOFF_BASE * (2 ** (attempt - 1))
                logger.warning(
                    "Gemini transient error (attempt %d/%d), retrying in %.1fs: %s",
                    attempt, _MAX_RETRIES, wait, exc,
                )
                time.sleep(wait)
                continue
            logger.exception("Gemini request failed")
            raise GeminiError(f"Gemini request failed: {exc}") from exc
    else:  # pragma: no cover - loop always breaks or raises
        raise GeminiError(f"Gemini request failed: {last_exc}")

    # Detect truncation (hit the output-token ceiling) and report it clearly
    # instead of surfacing a confusing "unterminated string" JSON error.
    try:
        finish = str(response.candidates[0].finish_reason)
    except Exception:  # pragma: no cover - shape varies
        finish = ""
    if "MAX_TOKENS" in finish:
        raise GeminiError(
            "The response was too long and got cut off. Try a more specific "
            "requirement, or raise GEMINI_MAX_OUTPUT_TOKENS."
        )

    raw = (response.text or "").strip()
    if not raw:
        raise GeminiError("Gemini returned an empty response.")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GeminiError(f"Could not parse Gemini JSON output: {exc}") from exc

    # Normalise / fill defaults defensively.
    data.setdefault("language", language)
    data.setdefault("filename", _default_filename(language))
    data.setdefault("explanation", "")
    data.setdefault("dependencies", [])
    data["model"] = settings.gemini_model
    return data


def _default_filename(language: str) -> str:
    ext = {
        "python": "py",
        "javascript": "js",
        "typescript": "ts",
        "java": "java",
        "cpp": "cpp",
        "c++": "cpp",
        "go": "go",
        "rust": "rs",
        "sql": "sql",
    }.get(language.lower(), "txt")
    return f"solution.{ext}"
