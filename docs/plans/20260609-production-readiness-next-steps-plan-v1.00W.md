# Production Readiness Next Steps Implementation Plan

> **Status as of 2026-06-12 (storage lane live UX pass):** This plan remains the **active umbrella** for production readiness. `crm7#1056` is closed with live bucket/policy/pgTAP/upload/EICAR evidence. `crm7#1057` and `crm7#1058` remain open for their unimplemented acceptance criteria (sensitive encrypt→download→decrypt/Vault/access-log evidence; self-service portal routes; verification UI transitions; 30d/7d alert scheduling; email notifications; immutable audit evidence), alongside `bsuite#1505` and Workstream E–H tails.
>
> **Shipped:** Workstreams E–H core (training calendar/block release, RTO/qualification/reports, R80 read-only integration, Conduit handoff scaffolding — see closed `crm7#1052`/`#1053`/`#1054`); placement↔people identity bridge (`crm7#1024` closed via `crm7#1045`, follow-ups `crm7#1046`/`#1047` closed); package consumer rollout (`bsuite#1487` closed); migration-pipeline reconciliation (`bsuite#1492`, `bsuite#1499`/`#1500` closed); Supabase advisor sweep (`bsuite#1460` closed; pgTAP advisor-hardening suite `crm7#1067`).
>
> **Remaining (open):** `bsuite#1505`, `crm7#1057`/`#1058`, E–H tails `crm7#661`/`#662`/`#534`/`#530`, `R80.3#233`/`#234`, and conduit tails `conduit#218`/`#219`/`#221`/`#225`/`#227`/`#229`/`#231`/`#251`/`#252`.

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Close the remaining BSuite production-readiness gaps after package publishing, visual-smoke findings, TCID/WAAMS clarification, block-release training calendar review, and single-Supabase consolidation.

**Architecture:** CRM7 remains the owner of apprentice, placement, training contract, RTO, qualification, and training schedule data. R80.3, Conduit, BSU, host/apprentice/field-officer views, and reports read/link to CRM7-owned data through Supabase/RLS or package APIs, with calculation snapshots stored only where required for auditability. Package rollout proceeds in staged app batches, with lockfile hygiene, browser visual QA, cross-app consistency, and red-team sign-off before any app `development` -> `main` promotion.

**Tech Stack:** React 19, Vite, Next.js 16 for Conduit, Supabase/Postgres/RLS/Edge Functions, pnpm 10.33.3, Vercel, Vitest, Playwright/Chrome DevTools, GitHub Actions, npm Trusted Publishing.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Scope and issue map

### Package and platform

- `bsuite#1487` - roll out latest published `@bsuite/*` packages to app consumers.
- Latest npm package targets:
  - `@bsuite/auth@0.2.6` - 2026-06-08T06:55:09Z.
  - `@bsuite/page-builder@0.4.1` - 2026-06-08T06:06:43Z.
  - `@bsuite/schema-builder@0.7.3` - 2026-06-08T06:06:57Z.
  - `@bsuite/schema-registry@0.3.5` - 2026-06-08T23:55:13Z.
  - `@bsuite/theme@0.4.1` - 2026-06-05T06:53:12Z.
  - `@bsuite/ui@0.4.0` - 2026-06-05T14:59:15Z.
- Local source packages needing deliberate decision before publishing:
  - `@bsuite/design-tokens@0.1.0` - not published.
  - `@bsuite/theme-codemod@1.0.0` - not published.
  - `@bsuite/eslint-config@0.2.0` - not published.
  - `@bsuite/tsconfig@0.1.0` - not published.

### CRM7 / GTO / training

- `crm7#1031` - reports page schema drift: `report_deliveries.last_attempt_at` missing in live schema, plus related report-page REST failures.
- `crm7#1029` - production placement detail OTS/pay-item rule schema error: `public.pay_item_rules` missing from schema cache.
- `crm7#1030` - development dashboard first-load blank screen requiring manual refresh.
- `crm7#1024` - placements/person/apprentice schism blocks host billing and charge-calc training-day linkage.
- `crm7#1027` - use TCID as the national training contract label; WAAMS is WA-only alias.
- `crm7#1028` - make offline-support unavailable notice accurate and non-intrusive.
- `crm7#625` - Training Days/Week -> day/date picker, training plan ingest, R8 sync, holidays.
- `crm7#663` - `training_day_pattern_periods`, block release, period override, history.
- `crm7#661` - RTO/provider model, non-TGA inline create, AASS provider, multi-state portal support.
- `crm7#662` - units of competency and training-period assignment.
- `crm7#534` - training plan progress vs AQF unit completion report.
- `crm7#728` - field officer KPI rollup.
- `crm7#480` - email/calendar integration UI.

### Cross-app consumers

- `conduit#307` - production Conduit ATS BSuite OAuth/Candidates outage (`Unable to load client details`, error ref `#773sm536`).
- `throughput#214` - development Throughput BS OAuth redirect-loop protection blocks login.
- `R80.3#235` - operational reporting: placements, completions, training-hours, margin dashboards.
- `conduit#225` - field officer assignment, workplace visit, three-way calendar invites.
- `conduit#227` - offer -> training contract e-sign, AASS lodgement, status state machine.
- Existing production gate remains: do not promote app repos to `main` until the ship gate passes.

---

## 1.1 Visual smoke report intake - 2026-06-09

**Source:** Claude-for-Chrome / Abacus AI Agent visual smoke test, 12 app/environments, desktop browser with human-visual judgement.

### P0 blockers - execute before package rollout or feature work

1. **Conduit ATS production outage** (`conduit#307`)
   - Production URL: `https://conduit.crm7.app`.
   - Symptom: BSuite SSO authorization failed with `Unable to load client details`.
   - Candidates page error: `Something went wrong`, reference `#773sm536`.
   - Impact: users cannot access production ATS.
2. **CRM7 production placement OTS/pay-item schema error** (`crm7#1029`)
   - Production URL family: `https://crm.crm7.app/placements`.
   - Symptom: placement detail exposes `Could not find the table 'public.pay_item_rules' in the schema cache`.
   - Impact: OTS/pay-item/rate calculations broken and raw schema error visible to users.

### P1 major issues

1. **CRM7 development reports schema drift** (`crm7#1031`)
   - Development URL: `https://d.crm.crm7.app/reports`.
   - Symptom: `Failed to load report templates: column report_deliveries.last_attempt_at does not exist`.
   - REST evidence:
     - `report_deliveries` select includes `last_attempt_at`, `retry_count`, `timezone`, `triggered_by` and returns 400.
     - `apprentice_completions?select=id&status=eq.completed` returns 404.
     - `user_preferences?select=date_format&user_id=...` returns 400.
   - Source evidence:
     - `crm7/src/services/reportTemplateQueries.ts` selects `last_attempt_at` / `retry_count`.
     - `crm7/src/types/supabase.ts` includes `report_deliveries.last_attempt_at` / `retry_count`.
     - `crm7/supabase/tests/database/18_report_deliveries_reliability.sql` asserts `last_attempt_at`, retry count, timezone constraints, and retry-ready index.
     - `crm7/supabase/migrations/20260604051244_report_deliveries_reliability.sql` is the source migration to reconcile with live DB.
   - Impact: report templates cannot load; reporting source/live schema is drifting.
2. **CRM7 development blank first load** (`crm7#1030`)
   - URL: `https://d.crm.crm7.app`.
   - Symptom: blank dark/navy dashboard until manual refresh.
3. **TCID/WAAMS wording wrong in both environments** (`crm7#1027`)
   - Current copy: `Training Contract Number / WAAMS ID`.
   - Required copy: `Training Contract ID (TCID)` with WAAMS only as `WAAMS ID (WA only)`.
4. **Training Details section is development-only**
   - Present on `https://d.crm.crm7.app/people/new`.
   - Missing on `https://crm.crm7.app/people/new`.
   - Do not promote to production until TCID/WAAMS copy and P0 placement schema issue are addressed.
5. **Block release calendar is not implemented** (`crm7#625`, `crm7#663`)
   - Current dev UI has parametric fields only: weeks/year, blocks/year, weeks/block, notes.
   - Required: full-year calendar/date picker with actual block-release dates and exceptions.
6. **R80 training weeks are manual, not linked to CRM7 schedule**
   - R80 supports training weeks in charge calculation, but no visible CRM7 apprentice/training schedule link.
7. **Conduit development lacks built-out e-sign/AASS/Field Officer handoff surfaces** (`conduit#225`, `conduit#227`)
8. **Throughput development OAuth redirect loop** (`throughput#214`)
9. **CRM7 INP performance diagnostics visible to end users** (`crm7#833`, `bsuite#483`)

### P2/P3 follow-ups

- Offline support notice was **not observed** in production or development. `crm7#1028` should now explicitly include offline simulation before deciding whether to suppress/remove/reposition it.
- BSU development ADMIN sidebar vs production absence is likely intentional but should be confirmed during production gate.
- Braden production/development visual parity is good; success/error post-submit remains unverified without test data.

### Smoke-report acceptance additions

- Every P0/P1 item above must have issue evidence, fix PR, browser re-test evidence, and dashboard update before app main promotion.
- P0 fixes run before package consumer rollout unless a package bump is proven necessary to fix the P0.
- Production ship gate is blocked until Conduit production and CRM7 production placement details are functional.

---

## 2. Project family, skills, MCPs, and team distribution

**Detected project family:** BSuite.

**Detection signals:** Working tree `/home/braden/Desktop/Dev/bsuite`, remote `GaryOcean428/bsuite`, attached app repos `crm7`, `conduit`, `business-suite-unified`, `R80.3`, `braden`, `throughput`.

### Skills to load/use

- Orchestration and planning: `master-orchestration`, `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, `subagent-driven-development`, `multi-agent-red-team-planning`, `planning-and-roadmapping`.
- Package/platform: `bsuite-platform`, `dependency-management` where applicable, `deployment-readiness`, `git-workflow`, `code-quality-enforcement`, `verification-before-completion`.
- One-shot/data: `dry-one-shot-architecture`, `supabase`, `supabase-postgres-best-practices`, `frontend-backend-mapping`, `schema-consistency`, `forms-and-validation`.
- Auth/security: `supabase-auth-comprehensive`, `auth-setup`, `security-audit`, `bsuite-auth-guardian`.
- UI/QA: `bsuite-brand-system`, `ui-ux-consistency`, `bsuite-design-sheriff`, `bsuite-user-advocate`, `playwright-skill`, `qa-and-verification`, `performance-regression`.
- Next.js/Conduit: `nextjs-app-router`, `vercel-next-best-practices`, Next.js MCP.
- Research: `best-practice-research`, `Context7`, `Tavily` when current vendor/regulatory docs are needed.

### MCP/tool distribution

- GitHub / `gh`: issue/PR state, PR creation, check monitoring, issue updates.
- Bash/pnpm/npm: package version checks, installs, builds, tests, lockfile regeneration, npm verification.
- Supabase MCP/CLI/SQL: schema/RLS validation, migrations, function deploy verification when DB work starts.
- Chrome DevTools MCP + Playwright: browser visual smoke, console/network traces, mobile/desktop screenshots.
- Next.js MCP: Conduit route/runtime diagnostics before touching App Router code.
- Context7: current docs for React Hook Form, Zod, TanStack Query, Supabase, Next.js, Playwright, package APIs.
- Tavily: current GTO/AASS/RTO/TCID regulatory terminology if implementation needs confirmation.
- Vercel CLI/MCP: deployment readiness, preview/production status, env verification.
- AG Grid MCP: only if any AG Grid grid surface is touched.

### Subagent team

- `bsuite-platform` - package rollout, CI/lockfile hygiene, npm/version gates.
- `bsuite-auth-guardian` - auth package bump and OAuth/session regression review.
- `bsuite-design-sheriff` - theme/UI token drift, Braden corporate/D2C boundary, shared primitive adoption.
- `bsuite-user-advocate` - real-user browser smoke, mobile/desktop visual QA, role-scoped UX checks.
- `bsuite-plans-keeper` - docs, issues, dashboard, roadmap updates.
- `general-purpose` one-shot reviewer - CRM7/R80/Conduit data model, RLS, and downstream propagation red-team.
- `code-review` - final diff review before merge for every implementation PR.

---

## 3. Global gates before implementation

### Gate 0 - Emergency smoke P0 triage

**Files/issues:** `conduit#307`, `crm7#1029`, production browser evidence, Vercel/Supabase/Next.js logs.

**Skills/MCPs:** `master-orchestration`, `bsuite-auth-guardian`, `nextjs-app-router`, `vercel-next-best-practices`, `supabase`, `supabase-postgres-best-practices`, `security-audit`, `systematic-debugging`, `playwright-skill`, Next.js MCP, Supabase MCP/SQL, Chrome DevTools MCP, Vercel CLI/MCP, GitHub.

**Steps:**
1. Reproduce Conduit production OAuth failure in a fresh browser context.
2. Use Next.js MCP/Vercel logs to locate the Conduit client-details and `#773sm536` runtime failure.
3. Verify BSU OAuth client registry and Conduit production envs match canonical OAuth client configuration.
4. Reproduce CRM7 production placement detail `pay_item_rules` schema-cache error.
5. Use Supabase schema inspection to determine whether `pay_item_rules` is missing, renamed, or stale-cache referenced by deployed code.
6. Fix only the minimal production blocker path first.
7. Re-run production browser smoke on Conduit login/Candidates and CRM7 Placements detail.

**Acceptance criteria:**
- `https://conduit.crm7.app` signs in and loads Candidates without `Unable to load client details` or `#773sm536`.
- `https://crm.crm7.app/placements` detail renders rates/OTS path without `public.pay_item_rules` schema-cache error.
- User-safe error boundaries hide raw SQL/schema messages if downstream data is unavailable.
- Both P0 issue threads contain reproduction, root cause, fix PR, and browser retest evidence.

### Gate 1 - Visual smoke intake

**Files/issues:** Claude-for-Chrome output, `conduit#307`, `crm7#1029`, `crm7#1031`, `crm7#1030`, `throughput#214`, `crm7#1028`, `crm7#1027`, `crm7#625`, `crm7#663`, `crm7#833`, `bsuite#483`, any new issues from the visual smoke.

**Skills/MCPs:** `bsuite-user-advocate`, `qa-and-verification`, `ui-ux-consistency`, `playwright-skill`, Chrome DevTools MCP, GitHub.

**Steps:**
1. Collect Claude-for-Chrome screenshots and notes.
2. Classify each finding as P0/P1/P2/P3.
3. Attach evidence to existing issue when it maps cleanly.
4. File a new issue only when no existing tracker covers it.
5. Add each issue to the parent dashboard/update PR.

**Acceptance criteria:**
- Every visual finding is either linked to an issue or explicitly marked no-action with rationale.
- P0/P1 smoke findings are ordered before feature rollout.
- Reports schema drift, offline simulation, TCID/WAAMS, block-release calendar, R8 interplay, field officer/host/apprentice visibility, INP popup gating, and page-editor overlap have screenshot evidence.

### Gate 1a - CRM7 reporting schema/load triage

**Files/issues:** `crm7#1031`, `docs/plans/20260521-reports-w2-uplift-implementation-v1.00F.md`, `docs/20260506-reports-parity-spec-v1.00F.md`, `docs/20260519-rpc-report-page-security-review-v1.00F.md`, `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`, `crm7/src/services/reportTemplateQueries.ts`, `crm7/supabase/migrations/20260604051244_report_deliveries_reliability.sql`, `crm7/supabase/tests/database/18_report_deliveries_reliability.sql`.

**Skills/MCPs:** `documentation-compliance`, `supabase`, `supabase-postgres-best-practices`, `schema-consistency`, `frontend-backend-mapping`, `security-audit`, `qa-and-verification`, Supabase MCP/SQL, Chrome DevTools MCP, GitHub.

**Steps:**
1. Reproduce `/reports` failure in development with browser/network capture.
2. Inspect live `report_deliveries` columns and compare to source migration/types/tests.
3. Decide whether the live DB is missing the source migration or frontend is selecting superseded columns.
4. Reconcile `report_deliveries.last_attempt_at`, `retry_count`, `timezone`, constraints, and retry index with source-of-truth.
5. Audit related report-page REST errors:
   - `apprentice_completions` 404.
   - `user_preferences.date_format` 400.
6. Run report pgTAP/database tests and browser smoke `/reports`.
7. Update reporting docs/plan status and dashboard.

**Acceptance criteria:**
- `/reports` loads templates/deliveries without `last_attempt_at` REST 400.
- `apprentice_completions` and `user_preferences.date_format` report-page calls are fixed or removed/replaced by canonical sources.
- Raw Supabase schema errors are not shown to end users.
- Evidence is attached to `crm7#1031`.

### Gate 2 - One-shot propagation matrix

**Files/issues:** `docs/20260227-dry-one-shot-architecture-v1.04A.md`, `crm7#1024`, `crm7#625`, `crm7#663`, `crm7#661`, `crm7#662`, `conduit#225`, `conduit#227`, `R80.3#235`.

**Skills/MCPs:** `dry-one-shot-architecture`, `supabase`, `supabase-postgres-best-practices`, `frontend-backend-mapping`, Supabase MCP/SQL.

**Steps:**
1. Create a propagation matrix in the implementation PR body before code changes:
   - Entity.
   - Owning app.
   - Owning table/view/RPC.
   - Create/edit UI.
   - Reader apps.
   - RLS policy.
   - Downstream reports/calculations.
2. Confirm CRM7 owns training schedules and training contracts.
3. Confirm R80 owns calculation snapshots only, not source training schedule entry.
4. Confirm Conduit owns candidate-stage recruitment data and handoff snapshots only.

**Acceptance criteria:**
- No new free-text entity fields where FK-backed tables exist.
- No reader app creates local mirror tables.
- Every downstream consumer reads/links from CRM7-owned source data or stores an immutable calculation snapshot.

### Gate 3 - Package/lockfile hygiene

**Files/issues:** `bsuite#1487`, app `package.json`, app `pnpm-lock.yaml`.

**Skills/MCPs:** `bsuite-platform`, `deployment-readiness`, `git-workflow`, bash/pnpm/npm, GitHub.

**Steps:**
1. Check current npm latest for every consumed `@bsuite/*` package.
2. Decide exact pin vs caret per package. Exact pins are required for `@bsuite/auth`; semver ranges may remain for packages already using ranges if app policy allows.
3. Regenerate each app lockfile from outside the `bsuite` tree.
4. Verify each lockfile has `.:` as the only importer and no `../packages`.
5. Run app install/typecheck/lint/test/build.

**Acceptance criteria:**
- No `workspace:*` or `file:../packages/*` in app manifests.
- No lockfile workspace poison.
- All touched apps pass checks.

### Gate 4 - Red-team sign-off

**Skills/MCPs:** `multi-agent-red-team-planning`, `security-audit`, `code-quality-enforcement`, `bsuite-user-advocate`, `bsuite-platform`, GitHub, Chrome DevTools/Playwright.

**Steps:**
1. Platform red-team checks package/lockfile/deploy risk.
2. One-shot red-team checks ownership, RLS, and downstream propagation.
3. User-advocate red-team checks visual/role/mobile/browser evidence.
4. Security red-team checks auth, RLS, service-role boundaries, and data exposure.

**Acceptance criteria:**
- Every P0/P1 red-team finding is either fixed or explicitly tracked as a blocker.

---

## 4. Workstream A - Package consumer rollout (`bsuite#1487`)

**Goal:** Consume latest published shared package versions safely across app `development` branches.

**Subagent:** `bsuite-platform`.

**Skills/MCPs:** `bsuite-platform`, `code-quality-enforcement`, `deployment-readiness`, `git-workflow`, `verification-before-completion`, bash/pnpm/npm, GitHub, Vercel CLI.

### Task A1 - Pre-flight package diff

**Files:**
- Read: `packages/*/package.json`.
- Read/modify later: six app `package.json` and `pnpm-lock.yaml`.

**Steps:**
1. Run `npm view @bsuite/<pkg> version time --json` for every package.
2. Compare to each app `package.json`.
3. Check package changelogs/README for breaking changes.
4. Build an app-by-app rollout matrix.

**Acceptance criteria:**
- Matrix identifies every package bump per app and whether it is exact pin or semver range.
- P0 smoke blockers are either fixed first or explicitly proven to require this package rollout as part of the fix.

### Task A2 - Lockfile hygiene guard

**Files:**
- Modify or create: parent CI/workflow or script if missing.
- Candidate: `.github/workflows/package-lockfile-hygiene.yml` or `scripts/check-lockfiles.mjs`
  - **DELIVERED as `scripts/check-lockfile-hygiene.mjs`** — neither candidate name was
    used. Its own header cites "Production-readiness plan Workstream A, Task A2", which
    is this plan. It fails when an app's `pnpm-lock.yaml` is workspace-poisoned:
    lockfiles generated inside the bsuite tree embed `../packages/*` importers and break
    Vercel standalone builds with `ERR_PNPM_OUTDATED_LOCKFILE`. A correct lockfile has
    `.:` as its only importer..

**Steps:**
1. Add or reuse a script that fails if any app lockfile contains workspace importers or `../packages`.
2. Run the script against current app lockfiles.
3. Add evidence to PR.

**Acceptance criteria:**
- CI or local gate prevents workspace-poisoned lockfiles.

### Task A3 - Low-risk app rollout

**Apps:** Braden and Throughput.

**Steps:**
1. Create app branches from `development`.
2. Update package versions.
3. Regenerate lockfiles outside `bsuite`.
4. Run install/typecheck/lint/test/build.
5. Deploy dev/preview if needed.
6. Capture browser smoke screenshots.

**Acceptance criteria:**
- Braden corporate brand remains separate from D2C.
- Throughput protected/public surfaces load without package runtime errors.

### Task A4 - Medium-risk app rollout

**Apps:** BSU and R80.3.

**Steps:** Repeat A3 with extra R80 calculation smoke.

**Acceptance criteria:**
- R80 calculation screens still render and package imports resolve.
- BSU portal/auth/navigation surfaces still render.

### Task A5 - High-risk app rollout

**Apps:** CRM7 and Conduit.

**Steps:** Repeat A3 with CRM7 training/people/page-editor smoke and Conduit Next.js MCP diagnostics.

**Acceptance criteria:**
- CRM7 People/Add Person, Placements, Page Editor, Dashboard load.
- Conduit App Router build/runtime diagnostics are clean.

### Task A6 - Close package rollout

**Steps:**
1. Update `bsuite#1487` with evidence matrix.
2. Refresh dashboard counters.
3. Close only after all consumer apps are merged and validated.

---

## 5. Workstream B - Offline notice (`crm7#1028`)

**Goal:** Make the `Offline support is unavailable. Online features still work.` notice accurate and non-intrusive.

**Subagents:** `bsuite-user-advocate`, `bsuite-design-sheriff`.

**Skills/MCPs:** `ui-ux-consistency`, `bsuite-brand-system`, `playwright-skill`, `qa-and-verification`, Chrome DevTools MCP, Playwright.

**Files likely affected:**
- `crm7/src/App.tsx`.
- Offline/bootstrap utilities under `crm7/src/lib/` or `crm7/src/services/`.
- CRM7 tests near route/bootstrap/offline behavior.

**Tasks:**
1. Write a failing test for banner rendering conditions.
2. Re-run visual smoke with deliberate offline simulation through Chrome DevTools Network -> Offline because the notice was not observed online.
3. Inspect why offline support is unavailable in production/development.
4. If it is expected, make the notice dismissible/session-scoped and non-overlapping.
5. If it is unexpected, fix the failing offline init path.
6. Capture desktop and mobile screenshots in CRM7 development and production-like preview.

**Acceptance criteria:**
- Banner is absent when not actionable or appears only as a non-overlapping dismissible warning.
- It does not cover footer, floating edit controls, page editor, or form actions.

---

## 6. Workstream C - TCID/WAAMS terminology (`crm7#1027`)

**Goal:** Make TCID the national primary training-contract label and WAAMS a WA-specific alias/source.

**Subagent:** one-shot reviewer plus `bsuite-user-advocate`.

**Skills/MCPs:** `dry-one-shot-architecture`, `forms-and-validation`, `qa-and-verification`, `verification-before-completion`, Chrome DevTools MCP.

**Files likely affected:**
- `crm7/src/pages/people/new.tsx`.
- Any training-contract form components.
- CRM7 tests for People/Add Person.
- Docs that mention WAAMS/TCID.

**Tasks:**
1. Search all CRM7 source/docs for WAAMS/TCID/training contract wording.
2. Define canonical copy:
   - Primary label: `Training Contract ID (TCID)`.
   - Placeholder: national training contract ID first; WAAMS only as an example when WA context is explicit.
   - Alias/helper: `WAAMS ID (WA only)` when jurisdiction is WA.
3. Update labels, placeholders, helper text, validation errors, report/export headings.
4. Add regression tests for visible copy.
5. Capture People/Add Person screenshots.

**Acceptance criteria:**
- Non-WA users see TCID as the primary concept.
- WAAMS remains supported but is not framed as universal.

---

## 7. Workstream D - Placement/person/apprentice identity bridge (`crm7#1024`)

**Goal:** Resolve the schism blocking host billing and charge-calc training-day propagation.

**Status: ✅ DONE 2026-06-10** — crm7#1045 merged (operator-approved). FK bridge `placements.person_id`/`apprentices.person_id` → `people` with deterministic backfill + BEFORE-trigger forward population (migration `20260610023056_placement_person_identity_bridge.sql`); billingEngine host-billing crash fixed (incl. `status`→`state` and line-item FK target latent bugs); all four placement charge-calc training-day resolvers functional. Evidence: 11/11 CI checks, 4232 vitest, 33 pgTAP suites / 331 assertions on prod-baseline replay, live-prod read-only coverage 15/15 apprentices. Carry-overs: crm7#1046 (pgTAP CI glob gap), crm7#1047 (orphaned legacy placements), contract-phase NOT NULL deferred until prod population confirmed.

**Subagents:** one-shot reviewer, security reviewer, platform reviewer.

**Skills/MCPs:** `dry-one-shot-architecture`, `supabase`, `supabase-postgres-best-practices`, `schema-consistency`, `frontend-backend-mapping`, `security-audit`, Supabase MCP/SQL.

**Files likely affected:**
- CRM7 migrations.
- CRM7 Supabase generated types.
- CRM7 placement, apprentice, timesheet, billing services.
- Tests for placements/timesheets/billing joins.

**Tasks:**
1. Baseline live/source schema for `people`, `contacts`, `apprentices`, `placements`, `timesheets`.
2. Decide canonical bridge:
   - Prefer stable FK/link table over duplicating person details.
   - Preserve existing data and RLS.
3. Write migration with backfill and constraints.
4. Update queries that assume nonexistent `placements.person_id`.
5. Add RLS and pgTAP/regression tests.
6. Verify charge-calc/training-day joins use the canonical bridge.

**Acceptance criteria:**
- Placement -> apprentice -> person/contact -> timesheet/billing path is deterministic.
- No free-text or local mirror workaround.

---

## 8. Workstream E - Training schedule calendar and block release (`crm7#625`, `crm7#663`)

**Goal:** Represent block-release training as actual calendar dates and propagate it across R80, field officer, host, apprentice, and reporting surfaces.

**Subagents:** one-shot reviewer, `bsuite-design-sheriff`, `bsuite-user-advocate`.

**Skills/MCPs:** `dry-one-shot-architecture`, `forms-and-validation`, `supabase`, `supabase-postgres-best-practices`, `frontend-backend-mapping`, `playwright-skill`, `Context7` for calendar/form library docs, Chrome DevTools MCP.

**Entities to add/confirm:**
- `training_contracts`.
- `training_contract_identifiers`.
- `training_contract_status_events`.
- `training_plan_versions`.
- `training_schedule_dates`.
- `training_schedule_exceptions`.
- `training_schedule_unit_assignments`.
- `training_attendance`.
- `competency_assessments`.
- `host_release_notifications` or backfill requests.

**Tasks:**
1. Confirm current schema and avoid duplicate entities.
2. Add versioned training plan and date-instance schedule tables if missing.
3. Add RLS:
   - CRM7 owner/admin CRUD.
   - Field officer read assigned apprentice schedules.
   - Host read release/backfill dates for hosted apprentice only.
   - Apprentice read own schedule/progress.
   - R80 read-only for calculations.
4. Replace counts-only block fields with a full-year calendar selector.
5. Preserve `weeks per year`, `blocks per year`, and `weeks per block` as derived/summary values, not the source of truth.
6. Add exceptions/holiday/non-scheduled weeks.
7. Add import/manual entry pathway from training plan.
8. Add tests for weekly, block, flexible, exceptions, and derived weeks/year.
9. Browser-test People/Add Person and apprentice detail.

**Acceptance criteria:**
- Operator can select actual training dates for the year.
- Derived counts feed reporting and R80.
- Calendar dates are visible to field officer/host/apprentice contexts.
- Production rollout of the existing Training Details section is blocked until TCID wording and P0 placement schema issues are fixed, then promoted through the production gate with browser evidence.

---

## 9. Workstream F - RTO, qualification, units, and reports (`crm7#661`, `crm7#662`, `crm7#534`)

**Goal:** Make RTO/qualification/unit data usable by the training schedule and reports.

**Subagents:** one-shot reviewer, security reviewer, user advocate.

**Skills/MCPs:** `dry-one-shot-architecture`, `supabase`, `forms-and-validation`, `frontend-backend-mapping`, `data-export`, `qa-and-verification`.

**Tasks:**
1. Normalize RTO/provider names and TOID/code fields.
2. Add non-TGA inline-create flow with clear provenance.
3. Add AASS provider entity/support where required.
4. Populate/validate units of competency selectors.
5. Link units to training plan periods/schedule dates.
6. Build training plan progress report using CRM7-owned source data.

**Acceptance criteria:**
- RTO/provider selection is FK-backed.
- Units can be assigned to schedule periods.
- Report shows scheduled vs completed vs at-risk units for apprentice, host, field officer/admin.

---

## 10. Workstream G - R80 read-only calculation integration (`R80.3#235`)

**Goal:** R80 reads CRM7 training schedule and placement data for rates and operational reporting without owning source apprentice data.

**Subagents:** platform reviewer, one-shot reviewer, user advocate.

**Skills/MCPs:** `dry-one-shot-architecture`, `frontend-backend-mapping`, `deployment-readiness`, `qa-and-verification`, Playwright/Chrome DevTools.

**Tasks:**
1. Define read API/view/RPC from CRM7 training schedule data.
2. Update R80 calculation inputs to read training dates where applicable.
3. Keep manual training-week entry available only as an explicit override with provenance if product requires it.
4. Store calculation snapshots in R80-owned tables for audit.
5. Add visual smoke comparing one apprentice's CRM7 schedule and R80 rate output.

**Acceptance criteria:**
- R80 does not require duplicate training schedule entry.
- Same schedule produces consistent rate/charge output.

---

## 11. Workstream H - Conduit recruitment handoff (`conduit#225`, `conduit#227`)

**Goal:** Connect recruitment-stage field officer/host/workplace visit and offer/training-contract handoff to CRM7-owned operational records.

**Subagents:** Next.js reviewer, one-shot reviewer, user advocate.

**Skills/MCPs:** `nextjs-app-router`, `vercel-next-best-practices`, Next.js MCP, `dry-one-shot-architecture`, `frontend-backend-mapping`, `security-audit`.

**Tasks:**
1. After `conduit#307` production outage is fixed, use Next.js MCP to inspect routes/errors before edits.
2. Model candidate-stage field officer assignment and workplace visit.
3. Add offer/training contract e-sign/lodgement status state machine.
4. On handoff, create/link CRM7 person/apprentice/training contract via owner-approved RPC/API.
5. Avoid duplicate CRM7-owned forms in Conduit.

**Acceptance criteria:**
- Conduit owns recruitment state only.
- CRM7 owns apprentice/training contract once converted.
- Field officer/host handoff is visible and auditable.

---

## 12. Workstream I - Browser visual QA and production gate

**Goal:** Turn Claude-for-Chrome visual findings into a formal production gate.

**Subagents:** `bsuite-user-advocate`, `bsuite-design-sheriff`, `bsuite-plans-keeper`.

**Skills/MCPs:** `playwright-skill`, Chrome DevTools MCP, `qa-and-verification`, `ui-ux-consistency`, `bsuite-brand-system`, Vercel CLI/MCP, GitHub.

**Tasks:**
1. Collect human visual smoke output from production and development.
2. Confirm/update issue links for the smoke report:
   - Conduit production outage -> `conduit#307`.
   - CRM7 pay item rule schema error -> `crm7#1029`.
   - CRM7 development blank load -> `crm7#1030`.
   - Throughput development redirect loop -> `throughput#214`.
   - INP popups -> `crm7#833` / `bsuite#483`.
3. Add mobile/desktop screenshot matrix for all apps.
4. Add role-scoped screenshots:
   - Admin.
   - Field officer.
   - Host.
   - Apprentice.
5. Verify Braden corporate brand boundary.
6. Verify D2C apps share shell/toast/button/nav patterns.
7. Verify no app `main` promotion until:
   - Package rollout complete.
   - P0/P1 visual blockers fixed.
   - Auth/session flows smoke-tested.
   - Docs/dashboard updated.

**Acceptance criteria:**
- Production ship gate has screenshot evidence and issue links.
- All P0/P1 findings are fixed or approved as explicit blocker waivers.

---

## 13. Documentation, dashboard, and closure

**Subagent:** `bsuite-plans-keeper`.

**Skills/MCPs:** `documentation-compliance`, `planning-and-roadmapping`, `git-workflow`, GitHub, dashboard scripts.

**Tasks:**
1. Update `docs/plans/STATUS.md` after each merged workstream.
2. Refresh dashboard JSON and inline HTML in the same PR as status changes.
3. Close issues only after evidence rows are attached.
4. Update one-shot docs if new propagation rules are added.
5. Prepare app `development` -> `main` promotion PRs only after ship gate passes.

**Acceptance criteria:**
- Dashboard counts match GitHub.
- Every closed issue has evidence.
- Production promotion is deliberate and gated.

---

## 13.1 CRM7 reporting docs and plans inventory

Use this inventory before any report-page, report-template, report-delivery, or GTO report work. Historical archive docs may be useful for provenance but must not override current source/tests.

### Current parent docs/plans

- `docs/plans/20260521-reports-w2-uplift-implementation-v1.00F.md` - active Reports W2 uplift implementation plan.
- `docs/20260506-reports-parity-spec-v1.00F.md` - reports parity specification.
- `docs/20260519-rpc-report-page-security-review-v1.00F.md` - report page/RPC security review.
- `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` - approved GTO billing/reporting plan.
- `docs/archive/2026-06/20260317-bsuite-gap-report-v2.00W.md` - broader gap report with reporting context.
- `docs/archive/2026-06/20260501-phase-0-completion-report-v1.00W.md` - phase completion evidence.
- `docs/CONSISTENCY-REPORT.md` - parent consistency report.

### CRM7 docs/plans

- `crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md` - CRM7 GTO master plan.
- `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-v1.00W.md` - combined foundations/GTO roadmap.
- `crm7/docs/CONSISTENCY-REPORT.md` - CRM7 consistency report.
- Historical CRM7 reporting archive docs under:
  - `crm7/docs/archive/20251015-report-implementation-complete-v1.00A.md`
  - `crm7/docs/archive/20260226-report-*.md`
  - `crm7/docs/archive/2026-04-30-2026-02-26-deploy-cohort/20260226-*.md`
  - `docs/archive/crm7/2026-04-24-submodule-import/20260226-report-*.md`

### Related cross-app docs

- `R80.3/docs/20260304-r80-billing-models-reference-v1.00W.md`
- `R80.3/docs/CONSISTENCY-REPORT.md`
- `business-suite-unified/docs/CONSISTENCY-REPORT.md`
- `conduit/docs/CONSISTENCY-REPORT.md`

### Active issue anchors

- `crm7#1031` - report-deliveries schema drift and report template loading.
- `crm7#866` - `/admin/reports/fair-work-inspector` access issue on development.
- `crm7#744` - reports grid resize/card behavior.
- `crm7#477` - report builder templates/scheduling.
- `crm7#527`-`crm7#534` - GTO report catalogue gaps.
- `crm7#733` - apprentice completion-rate cohort analytics.
- `bsuite#1237` - Reports W2 RPC schema-gap audit.
- `bsuite#1221` - report template schema-squash regression audit.

---

## 14. Red-team planning report

### Round 1 findings

1. **Package rollout risk:** Lockfile workspace poisoning is the highest known failure mode. Mitigation: explicit lockfile hygiene gate before app PRs.
2. **Rollout blast radius:** Do not bump all apps blindly. Mitigation: staged rollout Braden/Throughput -> BSU/R80 -> CRM7/Conduit.
3. **One-shot ordering:** `crm7#1024` must be resolved before training schedule can reliably feed billing/R80. Mitigation: identity bridge precedes schedule propagation.
4. **Entity model risk:** Block release cannot be represented by weeks/year counts. Mitigation: date-instance schedule tables and calendar UI.
5. **Visual QA risk:** Programmatic HTTP 200 checks miss visual regressions. Mitigation: human screenshot matrix and role-scoped browsing.
6. **Terminology risk:** WAAMS is WA-specific; TCID is national. Mitigation: `crm7#1027` before broader training UI polish.
7. **Security/RLS risk:** Host/apprentice/field officer visibility must be scoped by RLS, not UI-only checks. Mitigation: RLS tests and role-scoped screenshots.

### Round 2 plan changes

- Added visual-smoke P0/P1 issue map and emergency Gate 0.
- Added package pre-flight, lockfile gate, staged rollout, rollback gates.
- Added placement/person identity bridge before training calendar.
- Added RLS/read-only consumer requirements for R80, Conduit, host, apprentice, field officer.
- Added visual role/mobility/brand evidence requirements.
- Added explicit package/source decisions for unpublished local packages.

### Remaining risks

- Live credentials and role-specific test users may be operator-provided.
- Supabase migration repair issues `crm7#831` and `crm7#758` may block clean schema test automation.
- Some visual smoke evidence will arrive from Claude-for-Chrome and must be triaged into this plan before execution.

---

## 15. Commencement prompt for a new execution thread

Use a new thread because this is Heavy-tier, cross-repo, multi-app work with package rollout, schema/RLS, UI, and live browser gates.

```text
Run autonomously until complete, using `executing-plans`.

Plan to execute:
`/home/braden/Desktop/Dev/bsuite/docs/plans/20260609-production-readiness-next-steps-plan-v1.00W.md`

Start from `development` branches. Do not promote app repos to `main` until the production ship gate in the plan passes. Parent shared-package/docs/dashboard PRs may be merged to `development`; shared-package release PRs to `main` are allowed only when npm publication requires it.

Load/use these skills:
`master-orchestration`, `executing-plans`, `dispatching-parallel-agents`, `subagent-driven-development`, `multi-agent-red-team-planning`, `bsuite-context`, `bsuite-platform`, `bsuite-auth-guardian`, `bsuite-design-sheriff`, `bsuite-user-advocate`, `dry-one-shot-architecture`, `supabase`, `supabase-postgres-best-practices`, `frontend-backend-mapping`, `forms-and-validation`, `security-audit`, `code-quality-enforcement`, `deployment-readiness`, `qa-and-verification`, `verification-before-completion`, `playwright-skill`, `ui-ux-consistency`, `bsuite-brand-system`, `git-workflow`, `documentation-compliance`, `planning-and-roadmapping`, `nextjs-app-router`, `vercel-next-best-practices`, `best-practice-research`.

Use MCP/tools as assigned in the plan:
- GitHub/`gh` for issues, PRs, checks.
- Bash/pnpm/npm for package/version/install/build/test.
- Supabase MCP/CLI/SQL for schema/RLS/migration checks.
- Chrome DevTools MCP and Playwright for real browser visual QA.
- Next.js MCP for Conduit before App Router edits.
- Context7 for current framework/library docs before package/runtime changes.
- Tavily for current GTO/AASS/RTO terminology research if implementation requires regulatory confirmation.
- Vercel CLI/MCP for deploy status and preview/prod verification.

Immediate order:
1. Treat visual smoke P0s as emergency blockers: fix `conduit#307` production OAuth/Candidates outage and `crm7#1029` production placement `pay_item_rules` schema error before package rollout or feature work unless a package bump is proven necessary for the fix.
2. Triage P1 smoke/report findings: `crm7#1031` reports `report_deliveries.last_attempt_at` schema drift, `crm7#1030` development blank first load, `throughput#214` development OAuth redirect loop, INP popups on `crm7#833`/`bsuite#483`, TCID/WAAMS `crm7#1027`, and Training Details prod gap.
3. Execute Workstream A package consumer rollout with lockfile hygiene.
4. Fix CRM7 offline notice via deliberate offline simulation and TCID/WAAMS wording.
5. Resolve `crm7#1024` identity bridge before implementing block-release calendar propagation.
6. Implement training schedule calendar and downstream R80/Field Officer/host/apprentice/report consumers.
7. Complete Conduit handoff/R80 read-only integrations.
8. Run red-team and production ship gate before any app main promotion.

Hard rules:
- No `workspace:*` or `file:../packages/*` in deployable app package manifests.
- Lockfiles must be generated from outside the bsuite tree.
- CRM7 owns apprentice/training schedule source data; R80/Conduit/portals read/link or store immutable snapshots only.
- TCID is the national training contract term; WAAMS is WA-only.
- Block release must be represented as actual calendar dates with exceptions, not just counts.
- Browser/UI fixes require real browser evidence at desktop and mobile widths.
- Update docs/dashboard/issues in the same PR as evidence changes.
```
