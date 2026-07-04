"""Prompt engineering for the Code Generation Agent.

This module is where the assignment's *Prompt Engineering* requirement is
concentrated. Five deliberate techniques are combined:

1. **Role / persona prompting** — the model is cast as a senior polyglot
   engineer so it adopts expert conventions and idioms.
2. **Explicit constraints & guardrails** — hard rules that keep output on-task
   (real, runnable code only) and refuse unrelated requests.
3. **Few-shot exemplar** — one high-quality worked example teaches the exact
   shape and quality bar expected of the answer.
4. **Structured output** — the model must return JSON matching a fixed schema
   (see ``gemini_client.RESPONSE_SCHEMA``), which removes brittle text parsing.
5. **Task framing / decomposition** — the user requirement is wrapped with the
   target language, optional tests, and step ordering so the model plans before
   it writes.
"""
from __future__ import annotations

# 1) ROLE / PERSONA ----------------------------------------------------------
SYSTEM_INSTRUCTION = """\
You are CodeGenAgent, a senior software engineer fluent in Python, JavaScript,
TypeScript, Java, C++, Go, Rust, and SQL. You translate plain-language
requirements into clean, correct, production-quality code.

RULES (follow every one):
- Write complete, runnable code — no placeholders, no "TODO", no "...".
- Follow the idioms and style conventions of the requested language.
- Prefer the standard library; only add third-party dependencies when they are
  clearly justified, and list every one you use.
- Include short, meaningful comments on non-obvious logic — do not over-comment.
- Handle obvious edge cases (empty input, bad types, boundaries).
- If the request is ambiguous, choose the most reasonable interpretation and
  state that assumption in the explanation.
- GUARDRAIL: If the request is not about writing code (e.g. general chit-chat,
  or anything unsafe such as malware, credential theft, or DoS tooling), return
  a short refusal in the `explanation` field and an empty `code` field.
- Always respond with a single JSON object matching the required schema. Do not
  wrap it in Markdown fences or add prose outside the JSON.
"""

# 3) FEW-SHOT EXEMPLAR -------------------------------------------------------
# A compact, high-quality example that anchors the output shape and quality.
FEW_SHOT_EXAMPLE = """\
EXAMPLE
Requirement: "A function that returns the nth Fibonacci number efficiently."
Language: python
Expected JSON response:
{
  "language": "python",
  "filename": "fibonacci.py",
  "code": "def fibonacci(n: int) -> int:\\n    \\"\\"\\"Return the nth Fibonacci number (0-indexed).\\"\\"\\"\\n    if n < 0:\\n        raise ValueError(\\"n must be non-negative\\")\\n    a, b = 0, 1\\n    for _ in range(n):\\n        a, b = b, a + b\\n    return a\\n",
  "explanation": "Iterative O(n) time, O(1) space approach. Guards against negative input.",
  "dependencies": []
}
END EXAMPLE
"""


def build_user_prompt(
    requirement: str, language: str, include_tests: bool
) -> str:
    """Assemble the task-framed user prompt (techniques 2, 4, 5)."""
    tests_line = (
        "- Also include unit tests in the same code block.\n"
        if include_tests
        else ""
    )
    return f"""\
{FEW_SHOT_EXAMPLE}

NOW COMPLETE THIS TASK.
Target language: {language}
{tests_line}Requirement:
\"\"\"
{requirement.strip()}
\"\"\"

Think step by step about the design, then produce the final JSON object with
fields: language, filename, code, explanation, dependencies.
"""
