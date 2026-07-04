# Deployment Guide

CodeGenAgent ships as a **single Docker image**: the React frontend is built and
then served as static files by the FastAPI backend, so one container hosts the
whole app on one port (`7860`).

---

## 1. Deploy to Hugging Face Spaces (Docker SDK)

This is the recommended path and mirrors the YapBack deployment.

### Steps

1. **Create a Space**
   - Go to https://huggingface.co/new-space
   - **SDK:** Docker → *Blank*
   - Visibility: Public (or Private)

2. **Push the code**
   ```bash
   git remote add space https://huggingface.co/spaces/<user>/<space-name>
   git push space main
   ```
   The Space builds the `Dockerfile` automatically and serves on port `7860`
   (already configured in the Dockerfile and the Space metadata below).

3. **Add secrets** (Space → Settings → *Variables and secrets*)

   | Key | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | your Gemini key (**secret**) |
   | `GEMINI_MODEL` | `gemini-2.5-flash` (optional) |

4. **(Optional) Attach a MySQL database** for persistent history. Spaces have no
   built-in MySQL, so use a free managed host (Aiven, Railway, PlanetScale-MySQL,
   or FreeSQLDatabase) and set these secrets:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `mysql+pymysql://user:pass@host:3306/db?charset=utf8mb4` |

   Without a database the app still runs — it simply disables the history panel.

### Space metadata (README header for the Space)

Hugging Face reads YAML front-matter from the Space's `README.md`. Use
[`SPACE_README.md`](SPACE_README.md) as that file (rename it to `README.md` in
the Space, or copy its header to the top of this README when pushing).

---

## 2. Deploy to any Docker host (Render / Railway / AWS)

```bash
docker build -t codegen-agent .
docker run -p 7860:7860 \
  -e GEMINI_API_KEY=your_key \
  -e DATABASE_URL="mysql+pymysql://user:pass@host:3306/codegen?charset=utf8mb4" \
  codegen-agent
# open http://localhost:7860
```

- **Render:** New → Web Service → Docker; set `GEMINI_API_KEY` env var; Render
  provides the port via `$PORT` (the Dockerfile honours it).
- **Railway:** New → Deploy from repo; add a **MySQL plugin**; Railway injects
  the connection variables — map them to `MYSQL_*` or set `DATABASE_URL`.
- **AWS ECS/Fargate:** push the image to ECR, run as a task, inject env vars
  from Secrets Manager.

---

## 3. Local full-stack (Docker Compose, includes MySQL)

```bash
cp .env.example .env      # set GEMINI_API_KEY
docker compose up --build
# open http://localhost:7860
```

This starts a real MySQL 8.4 container so you can exercise the history feature
exactly as it behaves in production.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `GEMINI_API_KEY is not set` | Add the key to Space secrets / `.env` / `-e`. |
| History panel says "Database offline" | MySQL not reachable — check `DATABASE_URL`/`MYSQL_*`. Generation still works. |
| Space build fails on `npm run build` | Ensure `frontend/package.json` is committed and Node stage has network access. |
| 502 from `/api/generate` | Gemini rejected the request — check the key, model name, and quota. |
