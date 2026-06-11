# Hand-off — Next Session Issue Burndown

**Date:** 2026-05-06
**Author:** Claude Opus 4.7 (1M context)
**Status:** W (working draft for next-session agent)
**Repos in scope:** `bsuite` (parent) + 6 submodules (crm7, R80.3, throughput, conduit, braden, business-suite-unified)

---

## TL;DR for the new agent

You are picking up an active BSuite session that just shipped a major OAuth-init-direct freeze + 5 perplexity-filed UX defects to production. **156 open issues** remain across 7 repos. Your job is to burn down the highest-leverage ones systematically using the master-orchestration protocol below. **OAuth code is FROZEN — do not touch it under any circumstances** (see § "DO NOT TOUCH" below).

Start your session by running `/master-orchestration` to load the skill index, then triage issues by priority + closeability before opening any new PRs.

---

## What just shipped (last 4 hours)

### Production-deployed work (all on `main` of every repo, all Vercel deploys READY)

| Area | What | Where it landed |
|------|------|-----------------|
| **OAuth-init-direct freeze** | Deleted deprecated `bsuRedirect.ts` cookie-SSO redirect target from BSU + 5 consumers; rewrote BSU `AuthScreen.handleSuccess` to redirect to consumer `/auth/login` instead of `window.location.href` | crm7#496, R80.3#188, conduit#191, braden#230, throughput#121, BSU#334, bsuite#540 |
| **OAuth session bridge** | Each consumer's `/auth/callback` now calls `supabase.auth.setSession({access_token, refresh_token})` after `exchangeCodeForTokens` so PostgREST/RPC/Realtime authenticate as the user (was leaving them anonymous) | All 5 client apps + CLAUDE.md frozen-fact #5 |
| **#545 Edit Page meta-bug** | Probe-ack pattern: launcher dispatches `bsu-probe-page-editor` on route change; PageGridLayout acks if mounted. Sets `?edit=1` URL state. Save & Exit pill on edit. NO surprise-nav to /developer/pages | BSU#336 → #338 (prod) |
| **#541 Edge Functions UX** | Friendly `AccessDeniedCard` for tenant-tier devs (was hostile "Load failed") — role explanation, mailto: CTA, cached function names, /docs link | BSU#336 → #338 |
| **#543 Routing cards independent** | Wrapped Routing Rules + Catch-all in `<PageGridLayout>` — independently draggable; inner DnD preserved (rules card keeps own DndContext for sub-reordering) | BSU#336 → #338 |
| **#538 column slider 1-col** | `@bsuite/page-builder@0.2.4` released to npm: `Math.max(2, ...)` → `Math.max(1, ...)`, slider `min={2}` → `min={1}`, presets `[1,2,3,4,6,12]` | bsuite#546 → #559 → #565; BSU#339 → #341 → #342 |
| **#539 corner-resize handle** | `@bsuite/page-builder@0.2.5` — visible 20×20 handle CSS, electric-blue arrow marker on hover | bsuite#564 + #562 |
| **#537 OKLCH picker** | `OklchColorPicker.tsx` + `oklch.ts` lib (culori^4.0.1 backed) — slider-driven L/C/H/A, gamut warning, WCAG 2.2 contrast, BSuite presets, token export. Wired into Branding, AdminBranding, Developer/TenantSettings | BSU#337 + BSU#340 → #342 (prod) |
| **D2C theme canvas chrome** | bsuite#563 — Compact Layout / Reset / column chips / Add-widget pills now use Tailwind tokens + `data-[active]:*` variants instead of inline `style={...}` with legacy `--accent-primary` fallbacks | parent#565 (prod) |
| **CI workflow hardening** | publish-page-builder.yml uses workspace-aware install (`pnpm install --filter @bsuite/page-builder...`); ${{ steps.* }} expressions in env: blocks (security best practice) | bsuite#561 + #562 |

### npm publish status
- `@bsuite/page-builder` published versions: `[0.1.0, 0.2.0, 0.2.1, 0.2.4, 0.2.5]` — current latest **0.2.5**
- `@bsuite/auth` exact-pinned at **0.2.1** in all 5 consumers
- `@bsuite/dry-lint` at **0.4.0** (with `oauth-callback-must-bridge` rule)

### Issues closed in this run (13 total)
**Resolved by recent work** — already commented + closed with PR citations:
- bsuite#537, #538, #541, #543, #545 (5 perplexity UX)
- bsuite#505 (cross-app auth bug RCA), #513 (auth bump), #463 (@bsuite/auth adoption), #466 (deprecate local OAuth helpers)
- bsuite#460 (cookie SSO audit doc — superseded), #497 (G-8 NULL client_secret_hash) + 3 mirrors (conduit#182, throughput#103, BSU#326)
- BSU#306 (OIDC nonce — already in @bsuite/auth)

---

## ⛔ DO NOT TOUCH — OAuth 2.1 code is FROZEN

The OAuth flow took 3 weeks to stabilize. There is a multi-layer freeze in place. **Any deviation from these patterns will be caught by CI and reverted.**

### Hard bans (enforced by CI / lint / CODEOWNERS)
| Forbidden pattern | Enforcement |
|-------------------|-------------|
| `cookieStorage` / `domain: '.crm7.app'` / `storageKey: 'business_suite_auth'` in any Supabase client | `oauth-contract.test.ts` regex check (5 consumer apps, CI gate) |
| Recreating `src/lib/bsuRedirect.ts` | Same regex check |
| `https://suite.crm7.app/login` redirect target | Same |
| `?return_to=` query param pattern | Same |
| Replacing `setSession` bridge with anything else in callbacks | `bsuite/oauth-callback-must-bridge` ESLint rule (`@bsuite/dry-lint@0.4.0`) |
| Modifying `@bsuite/auth` source without dependency-bump-checklist ceremony | CODEOWNERS requires @GaryOcean428 review on packages/auth/ |
| Bumping `@bsuite/auth` semver pin in any consumer without ceremony | Exact-pin policy: `"@bsuite/auth": "0.2.1"` (no caret) |

### Frozen files (read-only unless dependency-bump-checklist invoked)
- `packages/auth/src/oauth-client.ts` (the package)
- Each consumer's `src/lib/business-suite-oauth.ts` (thin wrapper)
- Each consumer's `/auth/callback` page (CRM7: `src/pages/auth/callback.tsx`, R80.3: `src/pages/AuthCallback.tsx`, etc.)
- Each consumer's `src/__tests__/oauth-contract.test.ts` (CI invariant — DO NOT WEAKEN)
- BSU `src/components/auth/AuthScreen.tsx` (`handleSuccess` redirects to consumer `/auth/login`)
- BSU `supabase/functions/oauth-state/` (state generation/verification edge function)
- `.github/CODEOWNERS` (gates the above)

### Frozen-fact #5 (corrected 2026-05-06)
> BS OAuth tokens ARE Supabase-compatible JWTs (`aud=authenticated`, `role=authenticated`, `sub=<user-uuid>`, plus a `client_id` claim) — **but they are NOT automatic supabase-js sessions.** Each client app's callback MUST bridge them via `supabase.auth.setSession({access_token, refresh_token})` so PostgREST/RPC/Realtime authenticate as the user. Without the bridge, the per-domain Supabase client falls back to anon and RLS-protected reads return 401/406.

If you encounter an OAuth bug, **stop and write a handoff** rather than touch the code. The freeze exists because every prior agent who "just made a small change" broke production.

### What you CAN do safely around OAuth
- Read the code to understand the flow
- File issues against the auth backlog (e.g. UX of the consent screen, error messages, post-login redirect destinations) — but don't fix them without explicit operator approval
- Add tests to the existing `oauth-contract.test.ts` (strengthening invariants is fine; weakening is not)
- Document the architecture more

---

## Master Orchestration Protocol (run this FIRST)

```bash
# Load the skill index
/master-orchestration
```

This will:
1. Read your persistent memory at `https://qig-memory-api.vercel.app/api/memory` (silo: `bsuite_*`)
2. Spawn `memory-synapse` + `accountability-agent` sub-agents
3. Establish the skill matrix for the work-type

### Required skills for this hand-off (per task type)

**For UX/UI feature work** (the bulk of remaining issues):
- `bsuite-brand-system` — D2C theme tokens, OKLCH, semantic shadcn classes
- `ui-ux-pro-max` — UX patterns, INP <200ms, Lighthouse ≥90
- `shadcn-ui` — component primitives
- `dnd-kit` — heavy use in page-builder, navigation editor (#544), layers panel (#549)
- `forms-and-validation` — zod schemas, react-hook-form patterns
- `tanstack-query` — data fetching/mutations (BSU + CRM7 standard)
- `verification-before-completion` — closure gate (deploy + screenshot + INP)
- `qa-and-verification` — Playwright + axe-core

**For Supabase / data work**:
- `supabase-postgres-best-practices` — RLS, indexing, JSONB patterns
- `supabase-auth-comprehensive` — **READ ONLY** for OAuth context; do not edit

**For AI / Jodie work** (#542, #547-#552):
- `vercel:ai-architect` — Vercel AI Gateway routing, AI SDK 5 generateObject + Zod
- `master-orchestration` — multi-agent coordination

**For deployment / shipping**:
- `ship-all-apps` — full Phase 0-7 ceremony (orphan sweep, commit/push, CI monitor, PR, merge, prod verify)
- `dry-one-shot-architecture` — entity ownership, no duplicate forms

### MCP servers active in this environment

| MCP | When to use |
|-----|-------------|
| `mcp__claude_ai_github__*` | All GitHub operations (issues, PRs, branches, workflows). Prefer over `gh` CLI for structured queries; fall back to `gh` for simple commands. |
| `mcp__claude_ai_Supabase__*` | List tables, execute_sql (READ-ONLY queries by default), get_logs (auth + postgrest + edge), get_advisors. **Do not run `apply_migration` against `tuybltdrdefjblnplpqo` without explicit operator approval.** |
| `mcp__claude_ai_Vercel__*` | `list_deployments`, `get_deployment`, `get_deployment_build_logs`, `get_runtime_logs`. Project IDs in ship-all-apps skill. |
| `mcp__plugin_chrome-devtools-mcp__*` | INP/Lighthouse measurements (closure gate). |
| `mcp__plugin_playwright__*` | E2E smoke tests for #478. |
| `mcp__plugin_context7_context7__*` | Library docs (React, dnd-kit, Tailwind, AI SDK) — prefer over training-data assumptions. |
| `mcp__claude_ai_Context7__*` | Same — alternate path. |

---

## Backlog burndown — recommended order (highest leverage first)

### Tier 1: Quick wins (close after 5-30min verification each)

These are likely already done by recent work but need confirmation before close:

| Issue | Why it might be done |
|-------|---------------------|
| `bsuite#503` (G-14 Supabase OAuth dashboard allowlist) | Operator-side task; check if the dashboard now matches AGENTS.md §Automated Deployment Checks. If yes, close. |
| `bsuite#502` (G-13 Submodule deprecated-branch cleanup) | Earlier orphan-branch sweep cleared most. Re-run the sweep, close if clean. |
| `bsuite#499` (G-10 P1-84 SQL migration push) | Operator-blocked — check if commit `43fb250` migrations have been applied to Supabase. |
| `bsuite#496` (G-7 Deploy-Vercel-green gate) | All 5 apps are deploying green now. Add the workflow guard if missing, close. |
| `bsuite#491` (BL-018 WS-D Production Ship Gate) | ALL 6 submodules promoted dev→main today. Run Playwright smoke against suite.crm7.app + others. If green, close. |

### Tier 2: Heavy items (route to next-session agents or perplexity sub-agents)

These need deep work — write briefs and route to Copilot or Cron B's heavy queue:

| Issue | Skill chain | Notes |
|-------|-------------|-------|
| `bsuite#544` Visual Nav Builder (replace JSON textarea) | dnd-kit + shadcn-ui + tanstack-query + forms-and-validation | Brief already posted on issue. Tree of draggable cards, element picker, inline edit, JSON preview pane. |
| `bsuite#542` Jodie AI assignee + auto-route | vercel:ai-architect + forms-and-validation + supabase-auth | Brief already posted. LLM classifier (xai/grok-4.20-reasoning), structured Zod output, GitHub App PAT in Supabase secrets. |
| `bsuite#547` Snap modifier + alignment guides | dnd-kit + page-builder | Filed by perplexity, P1, has research-driven label. |
| `bsuite#548` Multi-select on canvas | dnd-kit + page-builder | Same. |
| `bsuite#549` Layers panel | dnd-kit + virtualized list | Same. |
| `bsuite#554` Breakpoint switcher | page-builder canvas | Needs-team label. |
| `bsuite#555` Global Symbol model | page-builder + Supabase JSONB | Needs-team. |
| `bsuite#556` AI section generator | page-builder + AI Gateway + Edge Functions | Needs-team. |

### Tier 3: P1 backlog (BL-* + BSU# items)

Significant coordinated work:
- `bsuite#467` WCAG 2.1 AA audit (6 apps) — needs axe-core in CI, big lift
- `bsuite#465` CI security assertions for secret-naming drift
- `bsuite#464` Supabase env-var standardisation (NEXT_PUBLIC_SUPABASE_ / VITE_SUPABASE_ / SUPABASE_)
- `bsuite#491` BL-018 production ship gate (Playwright smoke + first enterprise tenant onboarding)
- `bsuite#473` BL-011a BSU Supabase CRM-domain migration (stakeholder/people/contact schema)
- `business-suite-unified#319` P2-2 Schema / page-builder rebuild residuals

### Tier 4: P2 / nice-to-have

Most of `BL-006a–g`, `P2-*`, `R80-BL-*`, etc. Triage by impact when Tier 1-3 cleared.

---

## Deferred but still relevant

These tasks are NOT closed and still need attention, but are operator-blocked or external:

| Issue | Why blocked | Action |
|-------|-------------|--------|
| `bsuite#461` (P0-6 OAuth preview-redirect sign-off Part C) | Operator must update Supabase dashboard | Document the exact dashboard fields that need adding; ping operator |
| `bsuite#462` (Remove wildcard redirect URIs from Supabase) | Operator-side dashboard task | Same — list specific URIs to remove, replace with explicit ones |
| `bsuite#211` (P1 Deps TS 6.0.3) | External — TS 7 Go-native compiler timeline | Watch upstream |
| `bsuite#283` (Auth hardening — Azure xms_edov + Supabase wildcard) | external-blocked | Operator-side |
| `bsuite#515` (107 SECURITY DEFINER + search_path warnings) | external-blocked | Re-run advisors, triage which can be auto-fixed via migrations |

---

## Repository state at hand-off

| Repo | main HEAD | Open issues | Notes |
|------|-----------|-------------|-------|
| crm7 | `a4619b3` | 38 | OAuth-init-direct freeze landed; dev branch recovered from main |
| R80.3 | `dad7cfe` | 9 | Same |
| throughput | `d2edeed` | 4 | Same |
| conduit | `dc3af71` | 6 | Same; dev branch recovered |
| braden | `58464d2` | 13 | Same |
| business-suite-unified | `cfe6e0c` | 30 | Includes OKLCH picker + page-builder 0.2.5 — **all 3 perplexity defects shipped to suite.crm7.app** |
| bsuite (parent) | `e37effc` | 56 | Includes packages/page-builder@0.2.5 source |
| **TOTAL** | | **156** | |

### npm published packages (latest)
- `@bsuite/page-builder@0.2.5`
- `@bsuite/auth@0.2.1` (exact-pinned, do not bump without ceremony)
- `@bsuite/dry-lint@0.4.0`
- `@bsuite/theme@0.3.3`
- `@bsuite/schema-registry@0.3.4`
- `@bsuite/nav-core@0.5.2`
- `@bsuite/charge-calc@0.2.4`
- `@bsuite/schema-builder@0.7.1`
- `@bsuite/ui@0.1.0`
- `@bsuite/data-export@0.1.4`

---

## Persistent memory keys to read on session start

```bash
curl https://qig-memory-api.vercel.app/api/memory?keys_only=true
curl https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260506
curl https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions
curl https://qig-memory-api.vercel.app/api/memory/bsuite_perplexity_session_2026-05-06T10:20:39Z   # deferred Cron A — STALE NOW, both PRs merged
curl https://qig-memory-api.vercel.app/api/memory/bsuite_sleep_packet_20260506
```

The deferred Cron A record (`bsuite_perplexity_session_2026-05-06T10:20:39Z`) is **stale** — the PRs it expected to merge (bsuite#563 + BSU#340) have already been merged, promoted to main, and deployed to production. Treat that key as historical context only.

---

## Operator-pending actions (if you can ask the user)

Things the operator (Braden) needs to do that no agent can:
1. **Vercel env vars on BSU**: `VITE_APP_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` show "Missing" on the Developer Portal Platform tab → add to Vercel Production + Preview env-var settings
2. **Supabase OAuth dashboard allowlist** (closes bsuite#461 Part C + #503): confirm dashboard matches AGENTS.md §Automated Deployment Checks
3. **Supabase wildcard redirect URI removal** (closes #462): operator-side dashboard task
4. **Push P1-84 SQL migrations at commit `43fb250`** (closes #468 + #499): operator must run `supabase db push` against `tuybltdrdefjblnplpqo`
5. **Branch protection enforcement** (closes #498): GitHub org admin review

If you're working autonomously, surface these clearly in any session-end summary so the operator can batch them.

---

## Closure gate (per BSuite rulebook §6)

Every PR you open must:
- [ ] Live preview deploy verified (Vercel)
- [ ] Screenshot or screen-recording attached
- [ ] INP measurement <200ms (Chrome DevTools performance trace)
- [ ] Lighthouse ≥90
- [ ] Red-team passes: UX-DX, Security, Performance, Reliability, Quality
- [ ] No `@deprecated` markers, no dual-path interim states, no workaround allow-lists
- [ ] Tests added/adjusted in same PR
- [ ] Documentation updated in same PR
- [ ] Conventional commit format (`type(scope): description`)
- [ ] PR body cites the issue + verification evidence

---

## Anti-laziness reminders

From the project CLAUDE.md (BANNED behaviors):
- ❌ "Closing all X in this session isn't realistic" / "Leaving those for another session"
- ❌ Deferring tasks because they require "fresh sessions" or "judgment calls"
- ❌ "TODO: implement later" / stub implementations
- ❌ Using pre-existing issues as an excuse to ignore them

If you can fix it, fix it now. If genuinely blocked by external dependency, register a formal issue + return when unblocked.

---

## Final notes

- The **5 client apps + parent** are all on clean main HEADs with production deploys READY
- The **page-builder** is at v0.2.5 on npm; consumers are on `^0.2.5` (BSU) or `^0.2.1` (others — bump when needed)
- The **OAuth flow is frozen** — see § DO NOT TOUCH
- The user wants **"no deferrals"** — execute work, don't queue it for cron unless truly blocked
- When in doubt, run `/master-orchestration` to load the right skills, then proceed

Good luck. The codebase is in a healthier state than it has been all week.

— Claude Opus 4.7 (1M context)
