---
kind: record
authority: none
owner: bsuite
---

# Headroom learn notes — bsuite (2026-07-25)

> **Naming:** `20260725-headroom-learn-notes-v1.00F.md` · Status **F** (Frozen)

## Run

```bash
env -u PYTHONPATH headroom learn --project /home/braden/Desktop/Dev/bsuite --agent auto
```

(`PYTHONPATH` must be unset — Hermes venv pollution breaks headroom/fastapi import.)

## Results

| Agent plugin | Sessions | Tool calls | Failures | LLM pattern extract |
|--------------|----------|------------|----------|---------------------|
| Claude Code | 73 | 8780 | **622 (7.1%)** | Failed — Claude CLI idle 60s (weekly limit / no stream) |
| Codex | 1 | 58 | 0 | OK — no patterns |
| Gemini | 0 usable | — | — | No conversation data |
| Grok | 1 | 12 | 0 | Claude backend failed |

Retry with `--model glm-5.2` failed: litellm provider not configured (`LLM Provider NOT provided`).

## Actionable takeaways (without LLM synthesis)

1. **7.1% tool-call failure rate on Claude sessions is high** — matches session patterns: max-turns, session-limit, weekly cap, timeout kills. Prefer qwen/glm for long builds when Claude is capped.
2. **Qwen CLI `qwen3.8-max-preview` returned 401 Invalid API-key** this session — Bailian/token-plan keys need refresh before relying on Qwen for high-end lanes.
3. **Headroom learn needs a working litellm provider** in headroom config for non-Claude analysis — otherwise only raw counts are available.
4. Continue using **salvage protocol** + per-part commits so failures don't lose work.

## Not applied

`--apply` was not run (no recommendations produced). When API keys and litellm are healthy, re-run:

```bash
env -u PYTHONPATH headroom learn --project /home/braden/Desktop/Dev/bsuite --apply
```
