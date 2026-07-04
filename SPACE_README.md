---
title: CodeGenAgent
emoji: ⌘
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: Turn plain-language requirements into runnable code (Gemini)
---

# CodeGenAgent

Turn natural-language requirements into production-ready code using Google
Gemini, with React + FastAPI + MySQL. See the main
[README](README.md) for full documentation.

**Setup:** add `GEMINI_API_KEY` as a Space secret. Optionally add `DATABASE_URL`
(MySQL) to enable persistent generation history.
