# Fix AGENTS.md — Accurate Model Stack & Remove Anthropic

Update `AGENTS.md` with researched model facts and remove all Anthropic/Claude/OpenAI references from the deployment docs.

## Researched Model Facts

| Model | Role | Key Specs |
|---|---|---|
| **GLM-4.7-Flash** (`zai-org/GLM-4.7-Flash`) | Primary — Modal GPU inference | 30B-A3B MoE; 131K max output tokens; default temp 1.0, top-p 0.95; vLLM/SGLang local deploy |
| **LFM2.5-1.2B-Thinking** | Ollama fallback — vex-brain base | 1.17B params; 32,768 ctx; vocab 65,536; temp 0.05, rep_penalty 1.05; best for agentic/RAG/extraction — NOT knowledge-intensive or coding |
| **grok-4-1-fast-reasoning** | External fallback + search/overflow | Full reasoning model (no non-reasoning mode); `stop`, `presencePenalty`, `frequencyPenalty`, `reasoning_effort` NOT supported; web search tools available; knowledge cutoff Nov 2024 |

Temperature for all models is set by the kernels — not a static env var.

## Changes to AGENTS.md

### Lines ~77 (Quick Start comment)
- Remove: `# Minimum required: OLLAMA_URL, ANTHROPIC_API_KEY (or other LLM provider)`
- Replace with: `# Minimum required: OLLAMA_URL (Ollama service) + XAI_API_KEY (external fallback)`

### Lines ~180 (Architecture diagram — Ollama box)
- Remove: `- LFM2.5-1.2B model` / `- vex-brain custom model`
- Replace with accurate hierarchy:
  - `- GLM-4.7-Flash (primary, via Modal GPU)`
  - `- vex-brain/LFM2.5-1.2B-Thinking (Ollama fallback)`
  - `- grok-4-1-fast-reasoning (external fallback/search)`

### Lines ~225–239 (Required Variables block)
- Remove: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- Add: `XAI_API_KEY` (external fallback), `MODAL_INFERENCE_MODEL`, `MODAL_HARVEST_MODEL`
- Note: `KERNEL_API_KEY` already set in Railway — no need to generate

### Lines ~259–262 (Optional Variables — External LLM Fallback)
- Remove: `EXTERNAL_MODEL=claude-3-sonnet-20240229`, `EXTERNAL_TEMPERATURE`, `EXTERNAL_MAX_TOKENS`
- Replace with: `XAI_MODEL=grok-4-1-fast-reasoning` + note that temperature is kernel-driven

### Lines ~682–684 (Railway setup snippet)
- Remove: `railway variables set ANTHROPIC_API_KEY=sk-ant-...`
- Remove: `railway variables set KERNEL_API_KEY=$(openssl rand -hex 32)` (already set)
- Replace with: `railway variables set XAI_API_KEY=...`

### Lines ~709–719 (Railway env vars block)
- Remove: `ANTHROPIC_API_KEY`, note about `KERNEL_API_KEY=<generate>`
- Add: `XAI_API_KEY`, `MODAL_INFERENCE_MODEL=glm-4.7-flash`, `MODAL_HARVEST_MODEL=glm-4.7-flash`
- Note `KERNEL_API_KEY` already configured

### Lines ~731–733 / ~749 (Docker run + Docker Compose)
- Replace `ANTHROPIC_API_KEY` → `XAI_API_KEY` in both

### Line ~810 (Troubleshooting — Ollama pull)
- `ollama pull LFM2.5-1.2B` → `ollama pull glm-4.7-flash` (primary) with note about vex-brain/LFM2.5 as fallback

### Notes on grok-4 for agents section (new or existing)
- Add note: grok-4-1-fast-reasoning does NOT support `stop`, `presencePenalty`, `frequencyPenalty`, `reasoning_effort` params — callers must omit these
