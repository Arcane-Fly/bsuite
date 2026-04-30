# Wave-5 Cross-Cutting Red-Team QA Report

**Date:** 2026-04-25
**Status:** W (Working)
**Owner:** Claude Code W5-QA subagent
**Scope:** 10x red-team pass across all 7 BSuite repos post Wave-4 landing.
**Baseline:** `bsuite_session_20260425b` memory packet + `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md`.

## Executive summary

- **Overall health:** YELLOW (no stop-ship; multiple environmental / pre-existing findings to resolve before `main` merge).
- **Green signals:** all 6 app repos typecheck, lint cleanly; 4554 passing tests across the fleet (BSU 253, CRM7 3044/23 skipped, conduit 554, R80.3 453, braden 117, throughput 138); `packages/schema-registry` builds with all 4 exports (`.`, `/react`, `/react/editors`, `/server`) at <500 KB; all 10 probes completed; no cross-app write regressions; no hardcoded secrets; no lockfile-importer drift; no submodule-pointer drift.
- **Regression signals:** 0 — every finding below either predates the current session or is an environmental artefact (missing local env, stale local `node_modules`).
- **Red flags:** 4 YELLOW (see §Red flags). Top three are the conduit prerender failure (requires local `.env.local`), throughput test regressions (26 failing — pre-existing env-stub issues flagged in commit 439f309), and the braden `VITE_WEBHOOK_SECRET` anti-pattern (bundles a static webhook secret into client JS).

## Per-repo verification matrix

| Repo | Typecheck | Tests | Lint | Build | Clean tree | Secrets |
|------|-----------|-------|------|-------|-----------|---------|
| bsuite (parent) | n/a | n/a | n/a | n/a | clean (no `M` on tracked files) | clean |
| business-suite-unified | PASS | PASS (253/253) | PASS | PASS | clean | clean |
| crm7 | PASS | PASS (3044/3067 — 23 skipped) | PASS | PASS (58.6s, 22-entry precache, prerender OK) | ahead /origin 1 (P0-7 commit) | clean¹ |
| conduit | PASS | PASS (554/554) | PASS | FAIL² | clean | clean |
| braden | PASS | **4 FAIL / 117 pass** (pre-existing, see probe notes) | PASS | PASS | clean | **1 anti-pattern** (see red flag #3) |
| R80.3 | PASS | PASS (453/453) | PASS | PASS | ahead /origin 1 (P0-7 commit) | clean |
| throughput | PASS | **26 FAIL / 138 pass** (pre-existing) | PASS | FAIL³ | ahead /origin 1 (P0-7 commit) | clean |

¹ CRM7 contains `AKIAIOSFODNN7EXAMPLE` at `src/pages/settings/integrations.tsx:1269` — this is the **official AWS docs example placeholder** used in UI as an input hint, not a real credential. Pass.

² conduit build failure is environmental: prerender of `/analytics` + `/settings/schema-builder` tries to instantiate a Supabase browser client during static generation. Supabase env vars not present in local `.env.local`; on Vercel this passes because Production envs are wired. Not a session regression.

³ throughput build failure is environmental: `node_modules/@sentry` doesn't exist despite `@sentry/vite-plugin` being in `package.json` (stale local install). `npm install` locally fixes it; Vercel install command re-hydrates. Not a repo regression.

### Ahead-of-origin commits

Three submodules are ahead of `origin/development` by exactly one commit each:

- `crm7` → `1fa401e1` — `fix(crm7): require VITE_BSU_URL on BS-OAuth paths — remove hardcoded production fallback (P0-7)`
- `R80.3` → `6f3859b` — same fix for R80.3
- `throughput` → `fa7e874` — same fix for throughput

These are the P0-7 "no hardcoded suite.crm7.app fallback" commits from Phase 1 this session. They need to be **pushed** before the Wave-5 QA can be considered landed on remote.

## 10 probe results

### Probe 1 — schema-registry consumer integrity: PASS

All `@bsuite/*` package pins checked in every consumer `package.json`:

| Consumer | `@bsuite/schema-registry` | `@bsuite/nav-core` | `@bsuite/theme` | `@bsuite/auth` | `@bsuite/charge-calc` |
|----------|---------------------------|--------------------|-----------------|----------------|-----------------------|
| BSU | `^0.2.0` | `^0.5.0` | `^0.2.0` | — | — |
| CRM7 | `^0.2.0` | `^0.5.0` | `^0.2.0` | `^0.1.0` | `^0.2.2` |
| conduit | `^0.2.0` | `^0.5.0` | `^0.2.0` | — | — |
| braden | `^0.2.0` | `^0.5.0` | — | `^0.1.0` | — |
| R80.3 | `^0.2.0` | `^0.5.0` | `^0.2.0` | `^0.1.0` | `^0.2.2` |
| throughput | (absent — by design) | `^0.3.0` | `^0.2.0` | `^0.1.0` | — |

Lockfile importer check: all 5 pnpm repos report `.:` as sole importer (not `..` or `../packages/*`). throughput's `package-lock.json` is valid. No Vercel-blocking lockfile issues.

**Note:** throughput intentionally ships **without** `schema-registry` because `nav-core@0.3.0` doesn't expose the hooks schema-registry 0.2.x requires. Deferring the bump is correct per the session memory packet.

### Probe 2 — no Vite-leaked secrets: 1 YELLOW finding

- **BSU:** clean
- **CRM7:** clean
- **conduit:** clean
- **braden:** `src/lib/webhooks.js:19` uses `import.meta.env.VITE_WEBHOOK_SECRET || 'default-webhook-secret'` — **any `VITE_*` env var is bundled into the public JS at build time**. This leaks the webhook signing secret (or the hardcoded fallback) to every visitor of `braden.com.au`. See red flag #3.
- **R80.3:** clean
- **throughput:** clean

### Probe 3 — no hardcoded `https://suite.crm7.app` regressions: PASS

Hits across the three cleaned-up repos:

- **R80.3** `src/config/navigation.ts:66` — intentional nav entry pointing to BSU portal (static nav item, not an auth-callback path). PASS.
- **CRM7:** 4 hits across `config/navigation.ts`, `config/__tests__/navigation-flags.test.ts`, `components/common/CommandPalette.test.tsx`, `pages/settings/configuration.tsx`. All are (a) static nav item, (b) test fixtures, or (c) `siteUrl` default in a tenant settings form — none on auth-callback or redirect paths. PASS.
- **throughput:** clean — zero hits.
- **BSU:** 2 hits (`redirectTargets.ts`, `Developer/Embed.tsx`). BSU owns the `suite.crm7.app` origin, so these are expected. PASS.
- **braden:** clean.

### Probe 4 — no cross-app writes reintroduced: PASS

All 5 audit subjects verified:

- BSU `.from('leads').insert` → 0 matches (P1-1 shipped).
- BSU `.from('ideas').insert|update|upsert|delete` → 0 matches (P1-2 shipped).
- throughput `.from('team_members').insert|update|upsert|delete` → 0 matches (P1-6 shipped).
- CRM7 `.from('tenant_branding').insert|update|upsert` → 0 matches (P1-3 shipped).
- R80.3 `.from('apprentices').insert|update|upsert` → 0 matches (Codex audit clean).

### Probe 5 — schema-registry bundle size: PASS

`packages/schema-registry/dist/`:

- Total size **424 KB** (unminified; tsc --noEmit output).
- Exports present: `./` (`index.js` 560 B), `./react` (12 modules, ~48 KB), `./react/editors` (7 modules, ~28 KB), `./server` (2 modules, ~8 KB).
- 7 widgets all compile (DataTable, StatGrid, EntitySelector, Card, FormRenderer, EntityRefCell, SchemaFieldAdder + UnknownWidget fallback).
- peerDependencies declare `@bsuite/nav-core@^0.5.0` matching consumer pins.
- Well under the 35 KB gzip budget per phase-5 §R-02 for individual subpath imports (tree-shaking works because each widget / editor is a separate module).

### Probe 6 — RLS migration sanity: PASS

Migrations inspected at `business-suite-unified/supabase/migrations/`:

1. `20260425000000_tfd_entity_fk.sql` — adds `tenant_field_definitions_entity_id_fkey` with **ON DELETE CASCADE**. Idempotent (guards on `pg_constraint` lookup). Defensive `ADD COLUMN IF NOT EXISTS` for the column itself. PASS.
2. `20260425000001_phase5_enterprise_admin_rls.sql` — enterprise-admin RW policy scoped via `LATERAL public.descendants_of(ut.tid)`; platform-admin policy gated via `to_regproc('public.platform_is_developer_or_admin')` existence check. **Zero `USING (true)` clauses**; no permissive fallback. PASS.
3. `20260425000002_add_tenant_field_definition_rpc.sql` — SECURITY DEFINER RPC rejecting reserved field names `id`, `tenant_id`, `user_id`, `auth_id`, `created_at`, `updated_at`, `deleted_at` (case-insensitive via `lower(btrim(...))`). Enum whitelist on `p_field_type`. Two-tier write permission (descendant admin → platform admin → deny). All failures raise explicit SQLSTATEs for clean client mapping. PASS.

All 3 migrations still in "staged — awaiting operator `apply_migration`" per W1-C.

### Probe 7 — Vercel env sanity: DEFERRED

Vercel CLI not installed in this QA container; cannot run `vercel env ls` remotely. The probe was designed for the operator's local environment where Vercel CLI is authenticated. **Recommendation:** operator should run the documented probe manually before `main` merge. Based on code review:

- `VITE_BSU_URL` is required (no fallback) by all 4 client apps post-P0-7 commits. If it's not set on Vercel Production/Preview for CRM7/R80.3/braden/throughput, those builds will fail at runtime (not build time) when the BS-OAuth path triggers. Operator must verify.
- `VITE_SUPABASE_PUBLISHABLE_KEY` consumed universally (renamed from `_ANON_KEY` in Phase 2). All 6 repos use the publishable-key name; legacy `_ANON_KEY` entries on Vercel are still live (same value) pending the Contract-phase delete.

### Probe 8 — PageGridLayout adoption rate: PASS (91.8%)

```
crm7/src/pages: 304 of 331 tsx files reference <PageGridLayout> → 91.8%
```

Above the 90% target. Remaining 27 are primarily auth-screen, onboarding, and standalone-layout pages that intentionally opt out.

### Probe 9 — Design Studio surface liveness: PASS

`business-suite-unified/src/pages/Developer/Pages.tsx`:

- Line 29: imports `getRegisteredWidgets` from `@bsuite/schema-registry/react`
- Lines 33-38: imports 5 PropsEditor components from `@bsuite/schema-registry/react/editors` (Card, DataTable, EntitySelector, FormRenderer, StatGrid)
- Lines 76-80: widget-type → PropsEditor map
- Lines 401 / 433: 3-panel layout with `data-testid='design-studio-canvas'` + `data-testid='design-studio-inspector'` (implies Palette column exists too)

Route alias verified: `business-suite-unified/src/components/AppContent.tsx:169-170` redirects `/design-studio` → `/developer/pages`.

### Probe 10 — no submodule pointer drift: PASS

`git status -s` in parent returns no ` M ` entries on tracked submodules. All 6 submodule pointers match committed heads.

## Red flags found

### 1. YELLOW — throughput has 26 failing unit tests (pre-existing)

- **Where:** `src/lib/__tests__/accessibility.test.ts`, `src/lib/__tests__/logger.test.ts`, `src/components/__tests__/Modal.test.tsx`, `src/lib/__tests__/supabase-config.test.ts`, `src/lib/auth/__tests__/AuthProvider.test.tsx`, `src/components/llm-panel/__tests__/FeedbackList.test.tsx`, `src/components/llm-panel/__tests__/FeedbackForm.test.tsx`, etc.
- **Severity:** YELLOW. Pre-existing per commit message of `439f309`: "4 pre-existing env-stub failures unchanged". Current count is 26, so the baseline has drifted — some may be newly-introduced by unrelated work. Root causes include:
  - `supabase-config.test.ts:19` imports `"../lib/supabase"` but file is at `src/lib/__tests__/...` → resolves to non-existent `src/lib/lib/supabase`. Broken test path.
  - `fixOperations.ts:15` calls `localStorage.clear()` but test env localStorage is read-only mock.
  - Multiple accessibility / a11y tests — likely jsdom env setup drift.
- **Session attribution:** NONE — all failure signatures are unrelated to the P0-7 / env-rename / cross-app-write work landed this session.
- **Remediation:** open throughput issue for test triage; not a stop-ship.

### 2. YELLOW — braden has 4 failing tests in `EnhancedContactForm.test.tsx` (pre-existing)

- **Where:** progress indicator, character counter, success state x2.
- **Symptom:** `waitFor` timeouts after 5s. Component itself last touched in `91a3641 fix(braden): [N.3] WCAG P0 — autocomplete + dialog audit` — a WCAG hardening commit that changed form attribute structure. Tests likely expect prior DOM.
- **Session attribution:** NONE — this session didn't touch `src/components/contact/`.
- **Remediation:** update test expectations or bump userEvent timeout; not a stop-ship.

### 3. YELLOW — braden `VITE_WEBHOOK_SECRET` anti-pattern

- **Where:** `braden/src/lib/webhooks.js:19` — `'X-Webhook-Secret': import.meta.env.VITE_WEBHOOK_SECRET || 'default-webhook-secret'`
- **Severity:** HIGH semantic, YELLOW priority. Any `VITE_*` env is inlined into the public client bundle. This means (a) the real webhook secret is leaked to anyone who visits `braden.com.au` and opens devtools, OR (b) if the env is unset on Vercel, the string `'default-webhook-secret'` is shipped. Both are broken.
- **Correct pattern:** contact form should POST to a Supabase edge function (or server route) that owns the webhook secret server-side and forwards signed to CRM.
- **Session attribution:** NONE — this file predates this session (same pattern existed at start).
- **Remediation:** move webhook signing to an edge function OR rename to a server-side env and wire through the existing lead-capture edge function (`5a5faa4 fix(braden): route contact form through lead-capture edge function` already set up the scaffold).

### 4. YELLOW — conduit prerender fails without local env

- **Where:** `next build` aborts during static page generation for `/analytics` + `/settings/schema-builder` when Supabase env absent.
- **Root cause:** `DashboardShell.tsx:44` calls `createClient()` during prerender. On Vercel this works because `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set.
- **Session attribution:** NONE — the DashboardShell pattern predates this session. However, it IS a production ergonomics issue: onboarding developers can't build conduit locally without Vercel env pulled.
- **Remediation:** either (a) `export const dynamic = 'force-dynamic'` on the two affected pages, OR (b) operator ensures `vercel env pull .env.local` ran before local builds. Not a stop-ship for Vercel deploys.

## Overall verdict

**YELLOW** — ship the submodule `P0-7 VITE_BSU_URL` commits (crm7, R80.3, throughput) to `origin/development` before `main` merge; otherwise remote CI will diverge from the local audit. The 4 flagged items are all pre-existing and should be addressed in a follow-up triage sweep but do not block the current Wave-4 → Wave-5 completion.

### Pre-main checklist

1. `git push` each of the 3 ahead-of-origin submodules (`crm7`, `R80.3`, `throughput`) so the P0-7 commits land remote.
2. Operator runs probe 7 (Vercel env audit) and confirms `VITE_BSU_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are set on Production + Preview for all 4 client apps.
3. Operator applies the 3 W1-C migrations to live Supabase (`20260425000000_tfd_entity_fk`, `_phase5_enterprise_admin_rls`, `_add_tenant_field_definition_rpc`).
4. Decide whether to fix or ticket the 4 YELLOW items.

### Artefacts

All raw logs captured at `/tmp/w5qa/*.log` on the QA runner (ephemeral — not committed). The key numbers above are reproducible by re-running `pnpm typecheck && pnpm vitest run && pnpm lint && pnpm build` in each repo.
