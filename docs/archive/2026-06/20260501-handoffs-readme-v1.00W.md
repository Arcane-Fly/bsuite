# BSuite ship-all-apps handoffs — 2026-05-01 batch

**Document**: `20260501-handoffs-readme-v1.00W.md`
**Status**: W (Working)
**Created**: 2026-05-01
**Lead session**: Claude Code (VSCode native, has Vercel/Supabase/GitHub MCPs)
**Worker sessions**: Codebuff (no MCPs available, CLI only)

## Why this batch exists

The continuation prompt at `docs/20260501-new-session-continuation-prompt-v1.00W.md` anticipated substantial submodule work to ship. After Phase A inventory, the actual picture is much smaller:

- 4 of 6 submodules (`crm7`, `conduit`, `braden`, `R80.3`) are already shipped — the apparent "1 commit behind main" is just GitHub's squash-merge artefact, no real code drift.
- 1 submodule (`throughput`) has a trivial reconcile-merge ahead of main + a CLAUDE.md tidy.
- 1 submodule (`business-suite-unified`) has a feature branch with mixed scope: a real auth-flicker bug fix, a P1-14 FK-embed bug fix, AND a 121-line migration that **directly contradicts ratified ADR-0001**. This branch must be split.
- 1 parent repo has dirty `M AGENTS.md`, the new continuation prompt as untracked, and an open dev→main PR (#322, GREEN, MERGEABLE).

The split + cleanup is decomposed into the queue below.

## Active queue

| ID | Owner | Scope | Blocking dep | Doc |
|---|---|---|---|---|
| **1** | Codebuff | throughput dev→main trivial ship | none | [20260501-handoff-1-throughput-trivial-ship-v1.00W.md](20260501-handoff-1-throughput-trivial-ship-v1.00W.md) |
| **2** | Codebuff | parent housekeeping (AGENTS.md + continuation prompt commit) | HANDOFF-1 result feeds parent CLAUDE.md throughput correction | [20260501-handoff-2-parent-housekeeping-v1.00W.md](20260501-handoff-2-parent-housekeeping-v1.00W.md) |
| **3a** | ~~Codebuff~~ **CANCELLED 2026-05-01** | ~~BSU auth-flicker fix~~ — premise wrong; auth-flicker fix already in production (PR #129); branch contained only P1-14/P1-15/migration work | n/a | [20260501-handoff-3a-bsu-auth-flicker-v1.00W.md](20260501-handoff-3a-bsu-auth-flicker-v1.00W.md) (see Cancellation Notice) |
| **3b** | Codebuff | BSU P1-14 FK embed fix (Admin.tsx + leadRoutingStore.ts) sibling PR | snapshot branch from 3a Step 1 | [20260501-handoff-3b-bsu-fk-embed-fix-v1.00W.md](20260501-handoff-3b-bsu-fk-embed-fix-v1.00W.md) |
| **3c** | _deferred_ | BSU Developer/* + tenantRoutes follow-up issue (P1-15) | 3d must land first | [20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md](20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md) |
| **3d** | Claude Code | author `20260502000000_drop_tenant_page_layouts.sql` via Supabase MCP introspection | none (runs concurrently) | [20260501-handoff-3d-drop-tenant-page-layouts-v1.00W.md](20260501-handoff-3d-drop-tenant-page-layouts-v1.00W.md) |

## Sequencing diagram (post-3a-cancellation, 2026-05-01)

```
HANDOFF-1 (throughput)        ─┐
HANDOFF-2 (parent)            ─┼── parallel ──→ user smoke tests previews
HANDOFF-3a (CANCELLED)        ─x  no work to ship; branch was misnamed
HANDOFF-3b (FK embed)         ─┘  cherry-picks from snapshot

HANDOFF-3d (drop migration, lead session, PR #218)  ──→ enables HANDOFF-3c later
```

The three remaining "Codebuff" handoffs (1, 2, 3b) land independently as their own dev→main PRs, **stop short of merge**, and wait for the user's visual smoke test on Vercel previews before merging.

## Hand-off contract

Each HANDOFF doc is self-contained: a Codebuff session reads it cold and executes without prior context. Required sections per doc:

1. **Goal** — one-paragraph what + why
2. **Pre-conditions** — branch state, working tree, env vars
3. **Step-by-step actions** — copy-pasteable shell + git commands
4. **Verification gates** — what must pass before declaring done
5. **Stop conditions** — where to halt and report back

## Out of scope this batch

- The 5-app `dev↔main` merge-commit lag (cosmetic, not user-visible)
- BSU's 17-entry stash list (pre-existing, not blocking)
- Any submodule pointer bumps in the parent (handled organically once submodule PRs merge)
- mobile/ submodule (last-session note: "verify before touching" — not part of ship-all-apps scope this round)

## Process anomalies discovered during inventory

### Out-of-band Supabase migration application (flagged for follow-up)

Lead session's Supabase MCP `list_migrations` against `tuybltdrdefjblnplpqo` returned migration record `20260428085641_repair_tenant_page_layouts_contract` — but the migration file lives only on a local feature branch in BSU (never pushed to GitHub). Someone ran `supabase db push` against production from a local checkout, bypassing PR review.

This is a § 2.10 doctrine smell. Two implications for this batch:

1. **HANDOFF-3a was originally framed to `git rm` the repair migration** — that would have created a permanent git↔production history gap. Plan was revised mid-batch to carry the file into HANDOFF-3d for git-history preservation alongside the new drop migration. (This revision is moot post-3a-cancellation since HANDOFF-3a no longer runs at all.)
2. **Follow-up work needed**: add a guard rule to AGENTS.md prohibiting `supabase db push` from local checkouts against `tuybltdrdefjblnplpqo`. Track as separate workstream — not blocking this batch's ship.

### HANDOFF-3a premise error (2026-05-01)

Lead session's digest claimed an auth-flicker fix existed on `fix/auth-tier-free-flicker-20260428` based on (a) branch name, (b) `git status --short` showing 11 modified files, and (c) memory note `feedback_useeffect_dep_cycle.md`. Codebuff's file-level diligence (`git diff origin/main -- src/contexts/AuthContext.tsx`) proved the three claimed-auth-flicker files are byte-identical to `origin/main` — the fix already shipped via PR #129. The branch was misnamed; its actual content is P1-14/P1-15/migration work captured in HANDOFF-3b/3c/3d scope. **Lesson**: file-level diff vs default branch is the authoritative signal; branch names + statuses are heuristics that can mislead. Codebuff caught this before any no-op PR opened.

## Verification responsibilities

| Surface | Owner | Tool |
|---|---|---|
| Per-PR CI check rollups | Lead session | GitHub MCP `pull_request_read` |
| Vercel preview deploy health | Lead session | Vercel MCP `list_deployments` + `get_deployment` |
| Vercel preview build logs (on failure) | Lead session | Vercel MCP `get_deployment_build_logs` |
| Bot review comments (CodeRabbit, Copilot) | Lead session | GitHub MCP comment endpoints |
| Local typecheck/lint pass before push | Codebuff | `pnpm typecheck && pnpm lint` (or `npm` for throughput) |
| Live Supabase schema state for 3d | Lead session | Supabase MCP `list_tables` + `execute_sql` |

## Stop-short-of-merge gate

Per continuation prompt § 3.4 — **no PR merges to `main`/`master`** until the user explicitly signals "smoke test passed". Each handoff ends at: "PR open, all checks green, preview deploy renders correctly, awaiting user". The user merges manually.

## Memory protocol on completion

When all four Codebuff handoffs reach ready-to-merge state:

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260501_ship_ready \
  -H 'Content-Type: application/json' \
  -d '{"category":"session_summary","content":"<per-app PR list + preview URLs + bot status>","updated":"2026-05-01T00:00:00Z"}'
```

Lead session writes this; Codebuff reports completion via in-band message.
