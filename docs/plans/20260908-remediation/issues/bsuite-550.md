# chore(ai): route all LLM calls through Vercel AI Gateway

https://github.com/GaryOcean428/bsuite/issues/550

Snapshot updatedAt: 2026-05-13T04:31:14Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q3 research synthesis**
> Source: `/home/user/workspace/research/q3-jodie-copilot-architecture.md`

## Mandatory before merge

Skills:
- `vercel-react-best-practices` (server actions, Edge runtime)
- `supabase` (cost-tracking table)
- `forms-and-validation`

## Red-team requirements

1. **Security** — single AI Gateway key in Vercel encrypted env var; never client-side; per-agent role keys (jodie-classifier, claude-coder, etc.) so cost is attributable.
2. **Performance** — gateway sort=cost vs sort=ttft chosen per workload.
3. **Reliability** — auto-retry on 5xx; failover to alternate providers.
4. **Quality** — every Gateway request tagged with `x-issue-number` for cost attribution.

## Problem

Today every Jodie/Copilot/Claude LLM call hits provider APIs directly. No central observability, no failover, no per-issue cost attribution.

## Required implementation

Route all LLM calls through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) at `https://ai-gateway.vercel.sh/v1`:

1. Create Vercel AI Gateway team `bsuite-ai`.
2. Issue separate API keys per agent role (one per: `jodie-classifier`, `jodie-agent`, `claude-coder`, `copilot-helper`, `section-generator`).
3. Configure routing per [Vercel AI Gateway docs](https://vercel.com/docs/ai-gateway/capabilities/routing):
   - `sort: 'cost'` for classifier (Haiku/Gemini Flash class)
   - `sort: 'ttft'` for the user-facing Jodie agent (Sonnet 4.5 / GPT-5)
4. Tag every request with metadata: `{ issueNumber, repo, agentRole }` for the Logs view.
5. Configure auto top-up + daily spend alert (default $20/day) via Vercel dashboard.
6. Drop all direct provider SDK imports; everything uses [AI SDK 5](https://ai-sdk.dev/) via the gateway base URL.

## Acceptance criteria

- [ ] Gateway team + keys provisioned
- [ ] All `import OpenAI from "openai"` and `import Anthropic from "@anthropic-ai/sdk"` calls removed
- [ ] AI SDK 5 in use (`generateText`, `streamText`, `generateObject`)
- [ ] Each request tagged with `{ issueNumber, repo, agentRole }`
- [ ] Cost dashboard shows per-issue + per-agent rollups
- [ ] Daily spend alert configured
- [ ] Failover tested by manually disabling primary model for 1 minute
- [ ] No client-side gateway key

## Suggested team

Medium. `@claude` dispatch (touches multiple repos for the SDK swap):

> IMPORTANT @claude: please open a PR for review that addresses this issue. **Scope:** route all LLM calls through Vercel AI Gateway via AI SDK 5 across the 7 repos. **Files likely affected:** any file importing openai/anthropic-ai/sdk or google/genai. **Branch:** chore/ai-gateway-migration. **Base:** development. **Acceptance criteria:** above bullets + CI green + conventional commits. **When done:** post the PR URL.

## Citations

- [Vercel AI Gateway (2026)](https://vercel.com/docs/ai-gateway)
- [Vercel AI Gateway — routing (2026)](https://vercel.com/docs/ai-gateway/capabilities/routing)
- [Vercel AI Gateway — observability (2026)](https://vercel.com/docs/ai-gateway/capabilities/observability)
- [AI SDK 5 — providers (2026)](https://ai-sdk.dev/docs/foundations/providers-and-models)
- Internal: `/home/user/workspace/research/q3-jodie-copilot-architecture.md` § 2 + 9
