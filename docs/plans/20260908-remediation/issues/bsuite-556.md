# feat(page-builder): prompt-to-section AI generator via Supabase Edge Functions + AI Gateway

https://github.com/GaryOcean428/bsuite/issues/556

Snapshot updatedAt: 2026-08-24T03:26:01Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q1 research synthesis**
> Source: `/home/user/workspace/research/q1-builder-gaps.md`

## Mandatory before merge

Skills:
- `supabase` (Edge Functions)
- `forms-and-validation` (Zod schema for prompt + output validation)
- `bsuite-brand-system`
- `dnd-kit` (drop the generated section onto the canvas)

## Red-team requirements

1. **Security** — prompt injection mitigation; no shell/file-system tool exposure to the LLM.
2. **Reliability** — output schema-validated; LLM errors fall back gracefully with a retry button.
3. **Performance** — section render <500 ms after generation.
4. **Quality** — every generated section uses tokens from `@bsuite/design-tokens`, never inline hex/rgb.

## Problem

BSuite has no prompt-to-section AI generator. Every 2026 builder ships one:
- [Framer Wireframer](https://www.framer.com/ai/) — prompt → canvas section.
- [Webflow AI code components (2026)](https://webflow.com/blog/ai-code-components)
- [Builder.io Visual Copilot](https://www.builder.io/ai)

## Required implementation

1. Supabase Edge Function `generate-section` that accepts:
   - `prompt: string`
   - `tenant_id: string`
   - `breakpoint: 'desktop' | 'tablet' | 'mobile'`
2. Function uses [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (single key, model failover) with `generateObject` from AI SDK 5 and a Zod schema constrained to BSuite's shadcn component palette + OKLCH token map. See [AI SDK structured generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data).
3. Output validated with `zod`; rejected outputs get one retry, then a clear error.
4. Generated section streams onto the canvas via dnd-kit drop emulation; user can accept or discard.
5. Cost cap per tenant (configurable; default $5/day) tracked in Supabase `tenant_ai_usage` table.

## Acceptance criteria

- [ ] Edge Function deployed; tested with `mcp__supabase__deploy_edge_function`
- [ ] Output Zod schema rejects any inline hex; only `oklch(var(--*))` references allowed
- [ ] Cost cap enforced per tenant, tested
- [ ] Streaming generation visible in UI within 1 s
- [ ] Discard reverts canvas to pre-generation state
- [ ] WCAG-compliant
- [ ] No service-role key exposed client-side

## Suggested team

Heavy scope. `bsuite_heavy_work_queue`. Coordinates with the Jodie AI Gateway issue.

## Citations

- [Vercel AI Gateway (2026)](https://vercel.com/docs/ai-gateway)
- [AI SDK 5 — generateObject](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [Framer Wireframer (2026)](https://www.framer.com/ai/)
- [Webflow AI code components (2026)](https://webflow.com/blog/ai-code-components)
- [Builder.io Visual Copilot (2026)](https://www.builder.io/ai)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- Internal: `/home/user/workspace/research/q1-builder-gaps.md` § "AI-assisted authoring"
