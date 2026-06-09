# Production Readiness Next Steps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Close the remaining BSuite production-readiness gaps after package publishing, visual-smoke findings, TCID/WAAMS clarification, block-release training calendar review, and single-Supabase consolidation.

**Architecture:** CRM7 remains the owner of apprentice, placement, training contract, RTO, qualification, and training schedule data. R80.3, Conduit, BSU, host/apprentice/field-officer views, and reports read/link to CRM7-owned data through Supabase/RLS or package APIs, with calculation snapshots stored only where required for auditability. Package rollout proceeds in staged app batches, with lockfile hygiene, browser visual QA, cross-app consistency, and red-team sign-off before any app `development` -> `main` promotion.

**Tech Stack:** React 19, Vite, Next.js 16 for Conduit, Supabase/Postgres/RLS/Edge Functions, pnpm 10.33.3, Vercel, Vitest, Playwright/Chrome DevTools, GitHub Actions, npm Trusted Publishing.

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

- `R80.3#235` - operational reporting: placements, completions, training-hours, margin dashboards.
- `conduit#225` - field officer assignment, workplace visit, three-way calendar invites.
- `conduit#227` - offer -> training contract e-sign, AASS lodgement, status state machine.
- Existing production gate remains: do not promote app repos to `main` until the ship gate passes.

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

### Gate 1 - Visual smoke intake

**Files/issues:** Claude-for-Chrome output, `crm7#1028`, `crm7#1027`, `crm7#625`, `crm7#663`, any new issues from the visual smoke.

**Skills/MCPs:** `bsuite-user-advocate`, `qa-and-verification`, `ui-ux-consistency`, `playwright-skill`, Chrome DevTools MCP, GitHub.

**Steps:**
1. Collect Claude-for-Chrome screenshots and notes.
2. Classify each finding as P0/P1/P2/P3.
3. Attach evidence to existing issue when it maps cleanly.
4. File a new issue only when no existing tracker covers it.
5. Add each issue to the parent dashboard/update PR.

**Acceptance criteria:**
- Every visual finding is either linked to an issue or explicitly marked no-action with rationale.
- Offline notice, TCID/WAAMS, block-release calendar, R8 interplay, field officer/host/apprentice visibility, and page-editor overlap have screenshot evidence.

### Gate 2 - One-shot propagation matrix

**Files/issues:** `docs/20260227-dry-one-shot-architecture-v1.02A.md`, `crm7#1024`, `crm7#625`, `crm7#663`, `crm7#661`, `crm7#662`, `conduit#225`, `conduit#227`, `R80.3#235`.

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

### Task A2 - Lockfile hygiene guard

**Files:**
- Modify or create: parent CI/workflow or script if missing.
- Candidate: `.github/workflows/package-lockfile-hygiene.yml` or `scripts/check-lockfiles.mjs`.

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
2. Inspect why offline support is unavailable in production/development.
3. If it is expected, make the notice dismissible/session-scoped and non-overlapping.
4. If it is unexpected, fix the failing offline init path.
5. Capture desktop and mobile screenshots in CRM7 development.

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
   - Primary: `Training Contract ID (TCID)`.
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
5. Preserve summary fields as derived values.
6. Add exceptions/holiday/non-scheduled weeks.
7. Add import/manual entry pathway from training plan.
8. Add tests for weekly, block, flexible, exceptions, and derived weeks/year.
9. Browser-test People/Add Person and apprentice detail.

**Acceptance criteria:**
- Operator can select actual training dates for the year.
- Derived counts feed reporting and R80.
- Calendar dates are visible to field officer/host/apprentice contexts.

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
3. Store calculation snapshots in R80-owned tables for audit.
4. Add visual smoke comparing one apprentice's CRM7 schedule and R80 rate output.

**Acceptance criteria:**
- R80 does not require duplicate training schedule entry.
- Same schedule produces consistent rate/charge output.

---

## 11. Workstream H - Conduit recruitment handoff (`conduit#225`, `conduit#227`)

**Goal:** Connect recruitment-stage field officer/host/workplace visit and offer/training-contract handoff to CRM7-owned operational records.

**Subagents:** Next.js reviewer, one-shot reviewer, user advocate.

**Skills/MCPs:** `nextjs-app-router`, `vercel-next-best-practices`, Next.js MCP, `dry-one-shot-architecture`, `frontend-backend-mapping`, `security-audit`.

**Tasks:**
1. Use Next.js MCP to inspect routes/errors before edits.
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
2. Add mobile/desktop screenshot matrix for all apps.
3. Add role-scoped screenshots:
   - Admin.
   - Field officer.
   - Host.
   - Apprentice.
4. Verify Braden corporate brand boundary.
5. Verify D2C apps share shell/toast/button/nav patterns.
6. Verify no app `main` promotion until:
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
1. Ingest Claude-for-Chrome visual smoke output and attach findings to issues.
2. Execute Workstream A package consumer rollout with lockfile hygiene.
3. Fix CRM7 offline notice and TCID/WAAMS wording.
4. Resolve crm7#1024 identity bridge before implementing block-release calendar propagation.
5. Implement training schedule calendar and downstream R80/Field Officer/host/apprentice/report consumers.
6. Complete Conduit handoff/R80 read-only integrations.
7. Run red-team and production ship gate before any app main promotion.

Hard rules:
- No `workspace:*` or `file:../packages/*` in deployable app package manifests.
- Lockfiles must be generated from outside the bsuite tree.
- CRM7 owns apprentice/training schedule source data; R80/Conduit/portals read/link or store immutable snapshots only.
- TCID is the national training contract term; WAAMS is WA-only.
- Block release must be represented as actual calendar dates with exceptions, not just counts.
- Browser/UI fixes require real browser evidence at desktop and mobile widths.
- Update docs/dashboard/issues in the same PR as evidence changes.
```
