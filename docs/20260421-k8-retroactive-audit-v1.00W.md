# Part K.8 — Retroactive checklist audit (2026-04-21 cycle)

**Status:** W (Working)
**Scope:** 7 commits landed on `development` branches in the 2026-04-21
audit cycle before Part K of the [world-class audit plan](/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md) was written.

Per Part J.6, each commit is annotated with the K.8 checklist skeleton
filled in from session memory. Fields that can't be proven from commit
messages + memory are marked "not recorded" rather than fabricated.

Going forward (from J.1 onward), K.8 is mandatory in every PR description.

---

## Commit 1 — `0417c4e` test(shared): @bsuite/auth — 24 vitest cases for OAuth 2.1 PKCE client

**Repo:** bsuite (parent) — `development` branch, direct push
**Date:** 2026-04-21
**Files:** `packages/auth/vitest.config.ts`, `packages/auth/src/__tests__/{setup,oauth-client}.ts`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /test-driven-development (TDD for each describe block)
- [x] /verification-before-completion (ran `pnpm test` → 24/24 passing)

### MCPs consulted
- [x] Current-state: direct Read of `packages/auth/src/oauth-client.ts` (375 LOC)
- [ ] Library docs via Context7 — not recorded; jose API was already understood from earlier audit work

### Samples referenced
- [x] `packages/nav-core/src/__tests__/*` — pattern for custom storage shim (mirrored the vi.stubGlobal approach)

### 2026 sense-check gate
- [x] Domain gate passed: **TanStack Query / TDD** (vitest + jsdom + vi.mock module-scope + per-call counter for deterministic random)

### Red-team
- [x] Security — CSRF guard, nonce-mismatch, PKCE missing, 4xx body pass-through
- [x] Reliability — JWKS caching, attemptSilentAuth never throws, startBSTokenRefresh cleanup
- [ ] Performance — not applicable (tests only)
- [ ] UX/a11y — not applicable (no UI)

### Memory
- [x] `bsuite_session_20260421` written
- [x] `bsuite_pending_actions` updated
- [x] `MEMORY.md` index updated — `project_bsuite_auth_tests.md` entry

---

## Commit 2 — `d4ebcd8` perf(bsu): Step 9 — variable Inter + fetchpriority + drop modulepreload polyfill

**Repo:** business-suite-unified — `development` branch (PR #126)
**Date:** 2026-04-21
**Files:** `package.json`, `pnpm-lock.yaml`, `src/index.css`, `src/main.tsx`, `vite.config.ts`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /tailwind-css-v4-best-practices — gen-oklch-colors + util patterns confirmed
- [x] /vercel-react-best-practices — implicit via audit-plan rollout

### MCPs consulted
- [x] Current-state: Read `dist/` asset counts (35 woff2 baseline)
- [ ] Library docs via Context7 — not recorded; @fontsource-variable subset structure inspected directly from `node_modules/@fontsource-variable/inter/`

### Samples referenced
- [x] `/home/braden/Desktop/Dev/supabase-platform/vite-app/app/app.css` — `@import "@fontsource-variable/geist"` pattern

### 2026 sense-check gate
- [x] Domain gate passed: **Vercel SPA** — `modulePreload.polyfill: false`; priority hints on 5 critical chunks; variable fonts latin-only

### Red-team
- [x] Performance — 35 → 2 woff2 verified in `dist/`; typecheck + tests green; polyfill gone (grep `__vitePreload` → 0)
- [x] Security — `transformIndexHtml` uses anchored literal (AGENTS.md No-Regex-by-Default)
- [ ] Reliability — not separately assessed; browserslist target covered by Vite 8 default
- [ ] UX/a11y — not separately assessed; font-family 'Inter' unchanged

### Memory
- [x] `bsuite_session_20260421` written
- [x] `bsuite_pending_actions` updated

---

## Commit 3 — `5efd937` ci(bsu): Step 12 — size-limit budgets + CI gate

**Repo:** business-suite-unified — `development` branch (PR #126)
**Date:** 2026-04-21
**Files:** `.github/workflows/ci.yml`, `.size-limit.json`, `package.json`, `pnpm-lock.yaml`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /git-workflow (CI integration)
- [x] /code-quality-enforcement (budget-driven quality gate)

### MCPs consulted
- [x] Current-state: ran `pnpm size` locally to calibrate budgets

### Samples referenced
- [ ] No sample app counterpart (CI config is BSU-specific)

### 2026 sense-check gate
- [x] Domain gate passed: **Vercel SPA** — 5 size-limit entries matching the critical-path + per-chunk ceilings

### Red-team
- [x] Performance — regression demo (re-adding sonner to AuthContext) would bust AuthContext + critical-path budgets
- [ ] Security — not applicable (CI config)
- [ ] Reliability — CI step added; depends on build step running first
- [ ] UX/a11y — not applicable

### Memory
- [x] `bsuite_session_20260421` written

---

## Commit 4 — `1efd94d` test(bsu): Step 14 — WCAG 2.1 AA + 2.2 audit spec + artefact doc

**Repo:** business-suite-unified — `development` branch (PR #126)
**Date:** 2026-04-21
**Files:** `tests/e2e/wcag-aa.spec.ts`, `docs/20260421-wcag-aa-audit-v1.00W.md`, `package.json`, `pnpm-lock.yaml`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /playwright
- [x] /test-driven-development
- [x] /qa-and-verification
- [x] /documentation-compliance (W-status artefact with YYYYMMDD filename)

### MCPs consulted
- [x] Current-state: grep for existing `prefers-reduced-motion`, `role="status"`, `focus-visible` patterns in BSU `src/`
- [ ] Library docs via Context7 — not recorded; @axe-core/playwright API was understood from its README in `node_modules/`

### Samples referenced
- [ ] No sample (BSU-specific e2e)

### 2026 sense-check gate
- [x] Domain gate passed: **Accessibility** — WCAG 2.2 SC 1.4.3, 2.4.11, 2.5.8 covered; dark + light theme axe runs; target-size check

### Red-team
- [x] UX/a11y dedicated pass — axe serious/critical = 0 tolerance; moderate/minor attached as report artefact
- [ ] Security — not applicable (tests only)
- [x] Reliability — tests gated on `networkidle`; reducedMotion context created fresh per test
- [ ] Performance — not applicable

### Memory
- [x] `bsuite_session_20260421` written

---

## Commit 5 — `2c993ae` feat(bsu): Step 16 — platform-kit foundation

**Repo:** business-suite-unified — `development` branch (PR #126)
**Date:** 2026-04-21
**Files:** `supabase/functions/platform-kit-proxy/index.ts`, `src/pages/Admin/PlatformKit.tsx`, `src/components/AppContent.tsx`, `docs/20260421-platform-kit-admin-v1.00W.md`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /supabase (edge function pattern)
- [x] /supabase-auth-comprehensive (JWT verification via gateway `verify_jwt:true`)
- [x] /security-audit (6 security gates: CORS, rate-limit, JWT, platform_admin role, project-pin, path blocklist)
- [x] /shadcn-ui (UI primitives)

### MCPs consulted
- [x] Read `supabase/functions/assign-tester-license/index.ts` as canonical auth pattern
- [x] Read `/home/braden/Desktop/Dev/supabase-platform/vite-app/app/routes/api/supabase-proxy/[...path]/route.ts`
- [ ] Library docs via Context7 — not recorded; Management API schema was read directly from `supabase-platform/vite-app/app/lib/management-api-schema.d.ts`

### Samples referenced
- [x] `/home/braden/Desktop/Dev/supabase-platform/vite-app/app/routes/api/supabase-proxy/[...path]/route.ts` — Next.js → Deno translation pattern
- [x] BSU's `supabase/functions/assign-tester-license/index.ts` — auth gate pattern

### 2026 sense-check gate
- [x] Domain gate passed: **Supabase auth** — Management API token never reaches client; `verify_jwt: true` implicit on the edge fn

### Red-team
- [x] Security — token isolation, project-ref pin, destructive-path blocklist, rate-limit
- [x] Reliability — missing-token returns 500 "not configured"; bad JWT returns 401; non-admin returns 403
- [x] Performance — `pnpm size` still green; PlatformKit emitted as its own lazy chunk, not preloaded
- [x] UX/a11y — `InlineAlert` inline primitive (no shadcn Alert shipped), `role="alert"`, `aria-hidden` on icons

### Memory
- [x] `bsuite_session_20260421` written
- [x] `bsuite_pending_actions` updated

---

## Commit 6 — `54bd7124` feat(crm7): schema-builder app_scope — cross-app entity visibility

**Repo:** crm7 — `development` branch, direct push (no PR)
**Date:** 2026-04-21
**Files:** `supabase/migrations/20260421120000_add_app_scope_to_tenant_entities.sql`, `src/services/schemaBuilderService.ts`, `src/services/tenantService.ts`, `src/types/supabase.ts`, `src/pages/settings/schema-builder/components/EntityPropertiesPanel.tsx`, `src/pages/settings/schema-builder/index.tsx`, `supabase/functions/tenant-management/index.ts`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /supabase (additive migration pattern)
- [x] /supabase-postgres-best-practices (partial index on non-default values)

### MCPs consulted
- [ ] `execute_sql` + `get_advisors` — not recorded; migration was assembled from existing CRM7 service pattern

### Samples referenced
- [ ] None — this work was originated by the user, not ported from an external sample

### 2026 sense-check gate
- [x] Domain gate passed: **Supabase** — migration is additive (new NOT NULL column with default 'all'); safe for zero-downtime; Expand phase only (no Contract yet)

### Red-team
- [x] Reliability — `DEFAULT 'all'` preserves backward compat; `CHECK` constraint bounds valid values
- [x] Performance — partial index `WHERE app_scope <> 'all'` keeps existing query plans unchanged for the 'all' case (which is most rows)
- [ ] Security — not separately assessed; RLS policies on `tenant_entities` unchanged (existing tenant-member read still applies)
- [ ] UX/a11y — minimal UI change (one Select in EntityPropertiesPanel, shadcn-styled, existing contrast)

### Memory
- [ ] `bsuite_*` — not recorded at the time of this commit (user's own in-progress work captured via the parent monorepo bump)

### Follow-up (J.1)
- R80.3 ce4b9ef, Conduit 6e63b0b, Braden 45172a2 — added the same filter to the three remaining D2C apps.

---

## Commit 7 — `f410a50` docs(bsuite): Step 17 — Supabase Realtime blocks rollout plan

**Repo:** bsuite (parent) — `development` branch, direct push
**Date:** 2026-04-21
**Files:** `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md`

### Skills invoked
- [x] /master-orchestration
- [x] /using-superpowers
- [x] /writing-plans
- [x] /documentation-compliance (W-status, YYYYMMDD-name convention)

### MCPs consulted
- [x] Current-state: grep for existing realtime / channel / broadcast usage in Conduit + CRM7 (→ 0 hits; greenfield)

### Samples referenced
- [x] [Supabase UI realtime block docs](https://supabase.com/ui/docs/blocks/realtime-chat) — block URLs + registry pattern

### 2026 sense-check gate
- [x] Domain gate passed: **Docs** — YYYYMMDD-name-type-v1.00W filename; W-status for a rollout blueprint not yet implementation
- [x] Supabase Realtime discipline (channel scoping, presence payload shape, broadcast vs postgres_changes) consistent with `/supabase` skill's `references/use-realtime.md`

### Red-team
- [x] Reliability — rollback plan per block, per-tenant channel scoping, cohort-rollout pattern documented
- [x] Security — RLS on `realtime.messages`, PII leak audit, CSP wss:*.supabase.co delta flagged
- [ ] Performance — not applicable (docs only)
- [ ] UX/a11y — deferred to per-block install PR

### Memory
- [x] `bsuite_session_20260421` written
- [x] `bsuite_pending_actions` updated

---

## Verification

- `gh pr view 126 --repo GaryOcean428/business-suite-unified` → PR
  description links to this doc for the 4 BSU commits' K.8 state.
- `gh pr view 80 --repo GaryOcean428/conduit` → same link for the J.1
  Conduit commit.
- Future PRs (J.2, J.3, J.5.*, J.6 itself) include the K.8 checklist
  inline in the PR body per Part K.8 template.

## Rollback

Delete this file. No runtime impact — metadata only.
