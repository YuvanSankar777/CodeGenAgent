<div align="center">

# ⌘ CodeGenAgent

### Turn plain-language requirements into production-ready code.

**React · FastAPI · Google Gemini · MySQL · Docker**

*An AI agent that reads a natural-language requirement, reasons about the design,
and returns clean, runnable code in the language of your choice — with an
explanation, a dependency list, and a saved history.*

</div>

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [Why CodeGenAgent?](#-why-codegenagent)
3. [System Architecture](#-system-architecture)
4. [Three-Layer Generation Stack](#-three-layer-generation-stack)
5. [Prompt Engineering Layer](#-prompt-engineering-layer)
6. [Structured Output Pipeline](#-structured-output-pipeline)
7. [Generation Engine](#-generation-engine)
8. [Request Walkthrough](#-request-walkthrough)
9. [Project Structure](#-project-structure)
10. [Quick Start](#-quick-start)
11. [Security Reference](#-security-reference)
12. [Configuration](#-configuration)
13. [Deployment](#-deployment)
14. [Roadmap](#-roadmap)
15. [Meet the Team](#-meet-the-team)

---

## ✨ Key Features

| Feature | Description |
| --- | --- |
| 🧠 **Requirement → Code** | Describe a task in English; get complete, runnable code back. |
| 🌐 **8 languages** | Python, JavaScript, TypeScript, Java, C++, Go, Rust, SQL. |
| 🎯 **Prompt-engineered** | Role prompting, few-shot exemplars, guardrails, and structured output. |
| 📦 **Structured results** | Every answer includes code, filename, explanation, and dependencies. |
| 🧪 **Optional unit tests** | Toggle to have the agent also generate tests. |
| 🗂️ **Persistent history** | Every generation is saved to MySQL and re-loadable in one click. |
| 📋 **Copy & download** | One-click copy or download the generated file. |
| 🛡️ **Guardrails** | Refuses non-coding and unsafe requests. |
| 🐳 **One-image deploy** | Single Docker container serves both API and UI (Hugging Face Spaces ready). |

---

## 🤔 Why CodeGenAgent?

Most "AI code" tools dump a wall of text and leave you to fish the code out of
Markdown fences. CodeGenAgent is built around **determinism and structure**:

- The LLM is constrained to return **JSON matching a fixed schema**, so the UI
  always knows the language, filename, code, explanation, and dependencies.
- **Prompt engineering is a first-class module** (`backend/app/prompts.py`),
  not an afterthought buried in a string.
- The backend **degrades gracefully** — if the database is offline, code
  generation still works; only history is disabled.
- It ships as **one container**, so the exact thing you run locally is the exact
  thing that deploys.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React + TS)                     │
│   RequirementForm  ·  CodeOutput  ·  HistoryPanel            │
└───────────────────────────┬─────────────────────────────────┘
                            │  fetch /api/*  (JSON)
┌───────────────────────────▼─────────────────────────────────┐
│                    FastAPI backend (Python)                  │
│                                                              │
│   /api/generate ──▶ prompts.py ──▶ gemini_client.py          │
│                         (prompt eng.)   (structured output)  │
│                              │                               │
│                              ▼                               │
│                       Google Gemini API                      │
│                              │                               │
│   parse JSON ◀───────────────┘                               │
│        │                                                     │
│        ├──▶ MySQL (SQLAlchemy)  ── generation history        │
│        └──▶ JSON response ──▶ React                           │
└──────────────────────────────────────────────────────────────┘
```

**In production**, the built React bundle is served as static files by FastAPI,
so a single Docker image hosts the whole app on one port.

---

## 🧱 Three-Layer Generation Stack

CodeGenAgent processes every request through three deliberate layers:

| Layer | Responsibility | Where |
| --- | --- | --- |
| **1. Prompt Engineering** | Cast the model as an expert, give it a worked example, set guardrails, and frame the task. | `app/prompts.py` |
| **2. Structured Generation** | Call Gemini with a JSON response schema; parse and normalise the result. | `app/gemini_client.py` |
| **3. Persistence & Serving** | Save to MySQL, return typed JSON, render with syntax highlighting. | `app/main.py`, `frontend/` |

---

## 🎯 Prompt Engineering Layer

This is the assignment's **Prompt Engineering** requirement, concentrated in
[`backend/app/prompts.py`](backend/app/prompts.py). Five techniques are combined:

1. **Role / persona prompting** — the model is cast as a *senior polyglot
   engineer* so it adopts expert idioms and conventions.
2. **Explicit constraints & guardrails** — hard rules keep output on-task (real,
   runnable code only) and refuse unrelated or unsafe requests.
3. **Few-shot exemplar** — one high-quality worked example (`FEW_SHOT_EXAMPLE`)
   teaches the exact shape and quality bar expected.
4. **Structured output** — the model must return JSON matching
   `RESPONSE_SCHEMA`, removing brittle text parsing.
5. **Task framing / decomposition** — the requirement is wrapped with target
   language, optional tests, and a "think step by step, then output JSON"
   instruction so the model plans before it writes.

> Temperature defaults to **0.2** — low, because code generation rewards
> determinism over creativity.

---

## 📐 Structured Output Pipeline

Gemini is invoked with `response_mime_type="application/json"` and a schema:

```json
{
  "language": "python",
  "filename": "solution.py",
  "code": "def solve(...): ...",
  "explanation": "Why the approach works and any assumptions.",
  "dependencies": ["requests"]
}
```

Because the contract is fixed, the frontend can reliably render the filename,
syntax-highlight the code by language, show the explanation, and list
dependencies as tags — no regex-scraping of Markdown.

---

## ⚙ Generation Engine

`gemini_client.generate_code()`:

1. Builds the system + user prompt via `prompts.py`.
2. Calls `client.models.generate_content(...)` with the schema and temperature.
3. Parses the JSON, fills defaults defensively (filename by language, etc.).
4. Stamps the model name and returns a plain dict.

`main.generate()` then persists the result to MySQL (if available) and returns a
typed `GenerateResponse`.

---

## 🚶 Request Walkthrough

1. User types *"A function that debounces another function"*, picks **typescript**,
   clicks **Generate**.
2. React `POST`s `/api/generate` with `{requirement, language, include_tests}`.
3. FastAPI builds the prompt, calls Gemini with the JSON schema.
4. Gemini returns structured JSON; the backend parses and normalises it.
5. The row is written to MySQL (`generations` table) and returned to the client.
6. React renders the code with Prism highlighting, plus explanation and deps.
7. The generation appears in the **History** panel, re-loadable in one click.

---

## 📁 Project Structure

```
CodeGenAgent/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, routes, static-file serving
│   │   ├── config.py         # env-driven settings
│   │   ├── database.py       # MySQL engine + graceful degradation
│   │   ├── models.py         # Generation ORM model
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── prompts.py        # 🎯 Prompt engineering (role, few-shot, guardrails)
│   │   └── gemini_client.py  # Gemini call + structured output
│   ├── requirements.txt
│   └── run_local.py          # dev launcher (uvicorn --reload)
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # top-level state & layout
│   │   ├── api.ts            # typed backend client
│   │   ├── index.css         # dark theme
│   │   └── components/
│   │       ├── RequirementForm.tsx
│   │       ├── CodeOutput.tsx      # syntax highlighting, copy, download
│   │       └── HistoryPanel.tsx
│   ├── package.json
│   └── vite.config.ts        # dev proxy /api -> :8000
├── Dockerfile                # multi-stage: build React → serve via FastAPI
├── docker-compose.yml        # app + MySQL for local full-stack
├── .env.example
├── DEPLOY.md                 # Hugging Face Spaces deployment guide
└── README.md
```

---

## 🚀 Quick Start

### Option A — Docker Compose (recommended, includes MySQL)

```bash
git clone <your-repo-url> CodeGenAgent
cd CodeGenAgent
cp .env.example .env          # then edit .env and set GEMINI_API_KEY
docker compose up --build
# open http://localhost:7860
```

### Option B — Run backend and frontend separately (dev)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_key        # or put it in ../.env
python run_local.py                   # http://localhost:8000
```

**Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev                           # http://localhost:5173 (proxies /api)
```

> No MySQL running? The app still generates code — it just disables history and
> logs a warning. Start one quickly with:
> `docker run -p 3306:3306 -e MYSQL_DATABASE=codegen -e MYSQL_USER=codegen -e MYSQL_PASSWORD=codegen -e MYSQL_ROOT_PASSWORD=root mysql:8.4`

Get a free Gemini API key at **https://aistudio.google.com/apikey**.

---

## 🛡 Security Reference

| Concern | Mitigation |
| --- | --- |
| **API key exposure** | The Gemini key lives only in server-side env vars; it is never sent to the browser. |
| **Prompt-injection / misuse** | System guardrails refuse non-coding and unsafe requests (malware, credential theft, DoS). |
| **SQL injection** | All DB access goes through SQLAlchemy's parameterised ORM. |
| **Container hardening** | Docker image runs as a non-root user (uid 1000). |
| **Secrets in git** | `.env` is git-ignored; only `.env.example` is committed. |
| **Input limits** | Requirement length is capped (3–4000 chars) via Pydantic validation. |

---

## 🔧 Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model used for generation. |
| `GEMINI_TEMPERATURE` | `0.2` | Sampling temperature (low = deterministic). |
| `GEMINI_MAX_OUTPUT_TOKENS` | `4096` | Max tokens per generation. |
| `DATABASE_URL` | *(empty)* | Full SQLAlchemy URL; overrides the parts below. |
| `MYSQL_HOST` / `MYSQL_PORT` | `localhost` / `3306` | MySQL location. |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `codegen` / `codegen` | MySQL credentials. |
| `MYSQL_DATABASE` | `codegen` | Database name. |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated). |
| `PORT` | `8000` (dev) / `7860` (Docker) | Server port. |

---

## 🌍 Deployment

Full walkthrough in **[DEPLOY.md](DEPLOY.md)**. In short:

- **Hugging Face Spaces (Docker SDK):** push this repo; the Space builds the
  `Dockerfile`, serves on port `7860`. Set `GEMINI_API_KEY` (and MySQL vars if
  you attach an external database) as **Space secrets**.
- **Any Docker host** (Render / Railway / AWS ECS): `docker build` and run,
  passing the env vars above.

---

## 🗺 Roadmap

- [ ] Streaming token output as the code is generated.
- [ ] "Refine" button to iterate on the last result conversationally.
- [ ] RAG over a snippet library to ground generations in house style.
- [ ] Multi-file project scaffolding.
- [ ] Auth + per-user history.

---

## 👥 Meet the Team

| Name | Role |
| --- | --- |
| **Yuvan Sankar** | Design, backend, frontend, prompt engineering, deployment |

---

<div align="center">
Built for the Individual AI Project assignment · 2026
</div>
