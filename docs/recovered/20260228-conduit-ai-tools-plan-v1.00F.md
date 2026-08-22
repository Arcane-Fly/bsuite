---
kind: record
authority: none
owner: bsuite-lane
verdict: delivered
---

<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> Conduit's AI tool suite for candidate search and pipeline management is live.
>
> **Evidence:** `conduit/src/lib/ai/tools/` — `candidate-tools.ts`, `pipeline-tools.ts`,
> `job-tools.ts`, `interview-tools.ts`, `communication-tools.ts`, `analytics-tools.ts`,
> `triage-tools.ts`, with tests in `__tests__`. Routing and persona at
> `conduit/src/lib/ai/router.ts`, `model-router.ts`, `jodie-persona.ts`.
>
> **Marker defect:** `W` on delivered work.

---

# P1 #15: Conduit AI Tools — Candidate Search & Pipeline Management

**Version:** 1.00W
**Date:** 2026-02-28
**Status:** Working
**Project:** conduit
**Effort:** 1 week
**Depends on:** CRM7 AI architecture (Phases 1–8 complete)

---

## Objective

Add an AI assistant to Conduit (recruitment ATS) that can search candidates, manage pipeline entries, schedule interviews, and answer recruitment questions — mirroring CRM7's Jodie architecture but with Conduit-specific tools and persona.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Runtime** | Next.js Edge Runtime (App Router API route) | Conduit is Next.js 16; Edge Runtime for streaming |
| **AI SDK** | `@ai-sdk/react` + `ai` (Vercel AI SDK v6) | Same as CRM7, consistent DX |
| **Model** | `xai/grok-4.1-fast-reasoning` default, route to `anthropic/claude-sonnet-4.6` for complex tasks | Fast for search, smart for reasoning |
| **Tool pattern** | Factory with `ToolExecutionContext` | Mirrors CRM7 `createToolRegistry` |
| **DB access** | Direct Supabase client (server-side) | Next.js server components; no need for `/api/db` proxy |
| **Table prefix** | `r7_` (Conduit tables use this prefix) | Existing schema |

---

## Phase 1: Foundation (Day 1)

### 1a. Install dependencies

```bash
pnpm add ai @ai-sdk/react @ai-sdk/google @ai-sdk/anthropic
```

### 1b. AI config & model router

Create `src/lib/ai/config.ts`:

- Model definitions (approved models only)
- `routeModel(complexity)` function
- Rate limit constants

Create `src/lib/ai/model-router.ts`:

- Complexity classification (simple/medium/complex)
- Token budget management

### 1c. Persona

Create `src/lib/ai/conduit-persona.ts`:

- Name: **"Scout"** — Conduit's recruitment AI assistant
- Role: Recruitment specialist, ATS navigator, pipeline advisor
- Tone: Professional but approachable, recruitment-domain language
- Skills: candidate search, pipeline management, interview coordination, compliance checks, talent pool recommendations

---

## Phase 2: Tool Registry (Days 2–3)

### Tool Categories & Count: ~25 tools

#### Candidate Tools (`src/lib/ai/tools/candidate-tools.ts`) — 7 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `search_candidates` | Full-text search across name, email, skills, qualifications | `r7_candidates` |
| `get_candidate_profile` | Detailed candidate view with pools, applications, compliance | `r7_candidates` + joins |
| `filter_candidates` | Advanced filter by status, skills, location, pool, availability | `r7_candidates` |
| `update_candidate_status` | Change candidate status (screening → shortlisted, etc.) | `r7_candidates` |
| `add_candidate_to_pool` | Add candidate to a talent pool | `r7_candidate_pool_memberships` |
| `score_candidate` | Rate a candidate (1–5) with notes | `r7_candidates` |
| `suggest_candidates_for_job` | Match candidates to a job by skills/qualifications/location | `r7_candidates` + `r7_jobs` |

#### Pipeline Tools (`src/lib/ai/tools/pipeline-tools.ts`) — 5 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `get_pipeline_overview` | Counts per stage, bottleneck detection | `r7_pipeline_entries` + `r7_pipeline_stages` |
| `move_candidate_in_pipeline` | Move entry to different stage | `r7_pipeline_entries` |
| `add_to_pipeline` | Add candidate to pipeline at specified stage | `r7_pipeline_entries` |
| `get_stage_candidates` | List all candidates in a specific pipeline stage | `r7_pipeline_entries` |
| `pipeline_bottleneck_analysis` | Identify stages with unusual dwell times | `r7_pipeline_entries` |

#### Job Tools (`src/lib/ai/tools/job-tools.ts`) — 4 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `search_jobs` | Search open/draft/filled jobs | `r7_jobs` |
| `get_job_applications` | List applications for a job with candidate details | `r7_applications` |
| `draft_job_description` | AI-generate a job description from requirements | N/A (generation only) |
| `get_job_metrics` | Application count, time-to-fill, conversion rates | `r7_applications` + `r7_jobs` |

#### Interview Tools (`src/lib/ai/tools/interview-tools.ts`) — 4 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `schedule_interview` | Create interview with calendar integration | `r7_interviews` |
| `get_upcoming_interviews` | List interviews for a candidate or job | `r7_interviews` |
| `cancel_interview` | Cancel with notification | `r7_interviews` |
| `suggest_interview_times` | Find available slots based on calendar | `r7_interviews` |

#### Analytics Tools (`src/lib/ai/tools/analytics-tools.ts`) — 3 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `recruitment_summary` | Pipeline conversion, time-to-hire, active jobs count | Multiple |
| `source_effectiveness` | Which candidate sources yield best hires | `r7_candidates` |
| `compliance_overview` | Expiring checks, missing documents per candidate | `r7_compliance_checks` |

#### Communication Tools (`src/lib/ai/tools/communication-tools.ts`) — 2 tools

| Tool | Description | DB Table |
|------|-------------|----------|
| `send_candidate_email` | Send email via Edge Function dispatcher | `email-dispatcher` |
| `draft_outreach` | Generate personalized outreach message for a candidate | N/A (generation only) |

---

## Phase 3: API Endpoint (Day 4)

### 3a. Chat API route

Create `src/app/api/ai/chat/route.ts`:

- Edge Runtime
- Auth validation via `@supabase/ssr`
- Tenant isolation
- Streaming response via `streamText`
- Tool registry injection
- System prompt with Scout persona + skills

### 3b. useChat hook

Create `src/hooks/useAIChat.ts`:

- Wraps `@ai-sdk/react` `useChat`
- Passes tenant context
- Handles tool result display
- Error handling and retry

---

## Phase 4: Chat UI (Day 5)

### Components (mirror CRM7 pattern)

| Component | Path | Purpose |
|-----------|------|---------|
| `AISheet` | `src/components/ai/AISheet.tsx` | Slide-out panel (right side) |
| `AIMessage` | `src/components/ai/AIMessage.tsx` | Message bubble with markdown |
| `AIInputArea` | `src/components/ai/AIInputArea.tsx` | Input with send button |
| `AIToolCard` | `src/components/ai/AIToolCard.tsx` | Tool result display cards |
| `AITrigger` | `src/components/ai/AITrigger.tsx` | FAB button to open AI sheet |

### Integration points

- Add `AITrigger` to dashboard layout (`src/app/(dashboard)/layout.tsx`)
- AI labels on all generated content per AGENTS.md rules
- D2C Neon Electric theme compliance

---

## Phase 5: Testing & Polish (Day 5)

- Unit tests for all tool factories (Jest, co-located)
- Integration test for chat API route
- 70% coverage target on tool logic
- Error states and loading UI

---

## Environment Variables Required

```env
# Conduit .env.local
AI_GATEWAY_API_KEY=<anthropic-or-google-key>
GOOGLE_GENERATIVE_AI_API_KEY=<google-key>
```

---

## Files to Create

```
conduit/src/lib/ai/
├── config.ts                    # Model config, rate limits
├── model-router.ts              # Complexity → model routing
├── conduit-persona.ts           # Scout persona definition
└── tools/
    ├── index.ts                 # Tool registry factory
    ├── candidate-tools.ts       # 7 candidate tools
    ├── pipeline-tools.ts        # 5 pipeline tools
    ├── job-tools.ts             # 4 job tools
    ├── interview-tools.ts       # 4 interview tools
    ├── analytics-tools.ts       # 3 analytics tools
    └── communication-tools.ts   # 2 communication tools

conduit/src/app/api/ai/
└── chat/
    └── route.ts                 # Edge Runtime streaming endpoint

conduit/src/hooks/
└── useAIChat.ts                 # Chat hook wrapper

conduit/src/components/ai/
├── AISheet.tsx                  # Slide-out panel
├── AIMessage.tsx                # Message display
├── AIInputArea.tsx              # Input area
├── AIToolCard.tsx               # Tool result cards
└── AITrigger.tsx                # FAB trigger button
```

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Rate limiting not in place | Add per-tenant token metering from day 1 |
| Tool hallucination | Strict Zod schemas, permission checks before execution |
| Cross-tenant data leak | Every query includes `tenant_id` filter |
| Model cost | Default to `gemini-2.5-flash` (cheap), escalate only for complex reasoning |

---

## Definition of Done

- [ ] 25 AI tools implemented with Zod schemas and permission checks
- [ ] Scout persona with recruitment-domain knowledge
- [ ] Streaming chat API on Edge Runtime
- [ ] Chat UI integrated into dashboard layout
- [ ] All generated content labeled as AI-generated
- [ ] Jest tests at 70% coverage for tool logic
- [ ] No API keys in source code
- [ ] Roadmap updated to mark P1 #15 as complete
