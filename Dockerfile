# syntax=docker/dockerfile:1

# ---------- Stage 1: build the React frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Python backend + static frontend ----------
FROM python:3.12-slim AS runtime

# Non-root user (Hugging Face Spaces runs as uid 1000).
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install backend deps first for better layer caching.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Backend source.
COPY backend/ ./

# Built frontend from stage 1 -> served by FastAPI at "/".
COPY --from=frontend /ui/dist ./frontend_dist

ENV FRONTEND_DIST=/app/frontend_dist \
    PORT=7860 \
    PYTHONUNBUFFERED=1 \
    SQLITE_PATH=/app/data/codegen.db

# Writable dir for the SQLite fallback (the container runs as non-root uid 1000,
# e.g. on Hugging Face Spaces, and /app is owned by root).
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

USER appuser
EXPOSE 7860

# HF Spaces expects the app on port 7860.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
