---
kind: record
authority: none
owner: bsuite
evidence:
  - .github/workflows/app-quality-checks.yml
  - scripts/check-exported-not-mounted.mjs
  - crm7/src/lib/ai/tools/tool-authority.ts
  - crm7/src/lib/ai/tools/tool-authority.test.ts
  - crm7/api/ai/chat.ts
---

# The automation dial reaches the tools — evidence

**Date:** 2026-09-04 | **PR:** crm7#2396 | Task 2 of
[`20260904-jodie-proposes-and-you-save-v1.00W.md`](../plans/20260904-jodie-proposes-and-you-save-v1.00W.md)

## What was wrong

`evaluateJodieTurn` resolved the tenant's automation level on every turn and `api/ai/chat.ts`
discarded it. `createToolRegistry(toolContext)` took no level and returned all **89** tools
regardless, so at `off` — whose entire definition in the approved design is *"Answer. No
state-changing tools"* — the model was still handed every create, update, delete and send.
The dial gated the meter and nothing else.

## What was measured

| Command | Result |
|---|---|
| `npx vitest run src/lib/ai api/ai` | 36 files, **416 tests pass** |
| `npx tsc --noEmit` | clean |
| `npx eslint` (5 changed files) | clean |
| BITE: return `buildEveryTool(context)` without `toolsForLevel` | **3 of 8 cases fail**; restored, green |
| `TOOL_ACTION` entry count vs live registry | **89 = 89**, asserted in BOTH directions |

The two-directional assertion is the load-bearing one: no registered tool may be unlisted in
the table, and no listed tool may be absent from the registry. Drift either way is a red test
rather than a silent permission or a silent restriction. An unlisted name resolves to `send`,
the most restrictive class, so the failure mode is refusal rather than exposure.

## Behaviour change on production: none, and that was measured too

```sql
select count(*) from public.ai_quotas;                 -- 0 rows, all 7 tenants
```

With no row the level falls back to `ceilingForLicence(...)`. The four enterprise tenants
resolve to `auto_act` and keep every tool; the three without a subscription are refused 402 at
`chat.ts:570`, before the registry is built. The filter binds the moment a dial is saved.

**Worth reading as a finding in its own right:** the dial UI exists and is mounted
(`src/pages/settings/configuration.tsx:1379`), and no tenant has ever saved it — so the
effective default everywhere is maximum autonomy, by omission rather than by choice. Task 4b
moves that default to `suggest` once the propose surface exists; it is deliberately not moved
before, because dropping it today would remove capability with nothing to replace it.

## Gate

`agent-definition-of-done` → **D1–D8 pass**, D9 pending pre-merge with its closer named:
after the promotion, set the dial to `off` for one non-demo tenant, ask Jodie to create a
record, confirm refusal, then read `ai_quotas` for that `tenant_id`.
