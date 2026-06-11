# BSuite Production Specification Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Use `subagent-driven-development` or `dispatching-parallel-agents` only when tasks are independent and do not share mutable state.

**Goal:** Bring BSuite from the current `development` state to full intended production specification across parent `bsuite`, CRM7, Conduit, Business Suite Unified, R80.3, Braden, Throughput, and shared `@bsuite/*` packages.

**Architecture:** Execute as coordinated, evidence-first workstreams. Shared packages are source-of-truth in parent `packages/*`, published to npm, then consumed by standalone app repos on `development`; app promotion to `main` happens only through the production ship gate. Every workstream must preserve the DRY one-shot ownership model, BS OAuth 2.1 PKCE auth doctrine, Supabase RLS as the security boundary, and cross-app UI/component consistency.

**Tech Stack:** React 19, TypeScript strict mode, Vite, Next.js 16 for Conduit, Supabase Auth/Postgres/Storage/Edge Functions, pnpm 10.30.3+, Node 24, Tailwind v4, shadcn/Radix, Zustand, TanStack Query, Vitest, Playwright, `@bsuite/*` npm packages.

---

## Status and ownership

**Status:** Working
**Created:** 2026-06-05
**Owner:** BSuite development agents under operator direction
**Branch policy:** Work from `development` unless a shared package publish requires `main`.
**Production policy:** Do not promote application repos to `main` until the production ship gate in Task 9 passes.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop:** both §9.1 output-equivalence and §9.2 visual-equivalence where UI changes are made.
- **Equivalence target:** current `development` behavior plus the acceptance criteria in each task below; production URL smoke results for Task 9.
- **Cross red-team:** `code-review` agent plus `bsuite-user-advocate`; add `bsuite-auth-guardian`, `bsuite-design-sheriff`, or `bsuite-platform` when touching auth, UI, or packages.
- **Skills to load:** `ship-all-apps`, `bsuite-context`, `supabase`, `supabase-postgres-best-practices`, `supabase-auth-comprehensive`, `auth-setup`, `dry-one-shot-architecture`, `qa-and-verification`, `verification-before-completion`, `code-quality-enforcement`, `frontend-backend-mapping`, `forms-and-validation`, `playwright-skill`, `deployment-readiness`, `git-workflow`, `bsuite-brand-system`, `ui-ux-consistency`, `security-audit`.
- **Self-report on divergence:** yes. Do not rationalise gaps; file or update the relevant issue/dashboard row.

Every PR body must include:

```markdown
## Evidence

- [ ] Output-equivalence (§9.1) baseline + diff: <path or N/A>
- [ ] Visual-equivalence (§9.2) reference + after screenshots: <path or N/A>
- [ ] Self-report block: known divergences from spec or "none"
- [ ] Tests run: <command + result>
- [ ] Live verify: <URL + observation>
```

## Standing package permission

The operator grants standing permission to merge **shared package PRs** in parent `bsuite` to `main` when required to publish npm packages that development branches must consume and test.

This permission is limited to package-release work:

1. Build, typecheck, test, and pack the package first.
2. Bump semver correctly in `packages/*/package.json`.
3. Merge the package release PR to `main` only when npm publishing requires it.
4. Publish through the matching GitHub Actions `publish-*.yml` workflow on `main` using npm Trusted Publishers (OIDC); do not default back to `NPM_TOKEN`/manual token publishing.
5. Confirm `npm view @bsuite/<package> version` returns the new version.
6. Update consumer apps on `development` using npm semver only.
7. Regenerate consumer lockfiles from outside the `bsuite` tree.
8. Do not use `workspace:*` or `file:../packages/*` in deployable app repos.

This does **not** grant blanket permission to promote application repos to `main`. App promotion remains gated by Task 9.

## Authority chain and required reading

Read these before executing any task:

- [`../README.md`](../README.md) - documentation authority and index.
- [`../20260227-bsuite-master-roadmap-v5.00W.md`](../20260227-bsuite-master-roadmap-v5.00W.md) - long-horizon roadmap.
- [`../20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md) - active phase-ordered queue.
- [`../20260425-bsuite-finish-line-roadmap-v1.00W.md`](../20260425-bsuite-finish-line-roadmap-v1.00W.md) - finish-line queue provenance.
- [`20260423-bsuite-production-plan-v1.00W.md`](20260423-bsuite-production-plan-v1.00W.md) - production hardening phases.
- [`20260513-bsuite-consolidated-hardening-v1.00W.md`](20260513-bsuite-consolidated-hardening-v1.00W.md) - Supabase/auth/DB hardening state.
- [`20260423-gto-billing-reporting-refined-plan-v1.00A.md`](20260423-gto-billing-reporting-refined-plan-v1.00A.md) - approved GTO billing/reporting architecture.
- [`crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md`](../../crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md) - CRM7 GTO master plan.
- [`crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md`](../../crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md) - GTO WS3-WS9 implementation detail.
- [`20260521-reports-w2-uplift-implementation-v1.00W.md`](20260521-reports-w2-uplift-implementation-v1.00W.md) - CRM7 report uplift ledger.
- [`20260506-codehouse-parity-and-platform-360-v1.00W.md`](20260506-codehouse-parity-and-platform-360-v1.00W.md) - Codehouse parity and 9-portal doctrine.
- [`20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`](20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md) - full-7 audit, page-builder, branding, relationship plan.
- [`20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md`](20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md) - theme placement and doc coherence.
- [`../20260504-bsuite-tech-stack-alignment-v1.00W.md`](../20260504-bsuite-tech-stack-alignment-v1.00W.md) - tech-stack baseline.
- [`../20260227-dry-one-shot-architecture-v1.02A.md`](../20260227-dry-one-shot-architecture-v1.02A.md) - entity ownership and one-shot doctrine.
- [`../20260227-contributing-standards-guide-v1.01W.md`](../20260227-contributing-standards-guide-v1.01W.md) - coding/documentation standards.
- [`../20260228-d2c-theme-specification-v1.00A.md`](../20260228-d2c-theme-specification-v1.00A.md) - D2C theme specification.
- [`../20260227-auth-map-reference-v1.00A.md`](../20260227-auth-map-reference-v1.00A.md) and [`../../AUTH_CANONICAL.md`](../../AUTH_CANONICAL.md) - auth doctrine.
- [`../dashboard/data/dashboard-data.json`](../dashboard/data/dashboard-data.json) - dashboard source of truth.
- Per-app `docs/UNIFIED-ROADMAP.md`, `docs/STACK-AUDIT.md`, and `docs/README.md`.

## Principles and standards

1. **Development first, production later:** all feature work lands in `development`; application `main` is only touched in Task 9.
2. **Package-first reuse:** if logic/components belong in `@bsuite/*`, update the package, publish it, then update consumers. Do not duplicate code across apps.
3. **No local package links:** consumer app `package.json` files must use npm versions, never `workspace:*` or `file:../packages/*`.
4. **Supabase is the security boundary:** use RLS, tested policies, migrations, and canonical auth helpers. Never add service-role use to browser code.
5. **BS OAuth only:** no cookie SSO, no `business_suite_auth`, no `.crm7.app` shared-cookie patterns.
6. **DRY one-shot:** each entity has one owner app; other apps read/link.
7. **No silent failures:** every mutation surfaces typed failure states and tests zero-row/RLS failure paths.
8. **Inter-app consistency:** components, tokens, navigation patterns, loaders, empty states, filters, tables, and error displays must match across apps unless Braden corporate brand or Conduit Next.js architecture explicitly requires divergence.
9. **Cross-cutting QA always:** every stage includes tests, lint/typecheck/build where available, Playwright/browser checks for UI, red-team review, doc/dashboard updates, and cross-app consistency checks.
10. **No mock production data:** live/tenant data paths must use real Supabase tables, RLS, and storage; demos must be clearly isolated.

## MCPs and tools available for this plan

Use these where relevant:

- **Git/GitHub:** `gh` CLI via shell, GitKraken MCP (`git_status`, `git_log_or_diff`, PR details/comments/create/merge workflow when available).
- **Shell:** `bash` for pnpm, npm, gh, jq, curl, tests, builds, scripts.
- **Code search/files:** `rg`, `glob`, `view`, `apply_patch`, filesystem MCP.
- **Browser/runtime QA:** Chrome DevTools MCP, Playwright/browser automation MCP, Lighthouse/accessibility/performance tools.
- **Next.js:** Next DevTools MCP (`init`, `nextjs_docs`, `nextjs_index`, `nextjs_call`, browser_eval) for Conduit.
- **Docs/research:** Context7 for framework/library docs, Tavily for current regulatory/vendor research, AG Grid MCP if data-grid work touches AG Grid.
- **TypeScript modernisation:** TypeScript modernization tools for dependency scans, compile, tests, and runtime validation when package-upgrade work uses npm/pnpm.
- **Session/project memory:** session store SQL for recent session lookup; repo docs and dashboard are canonical for persisted project state.
- **Supabase:** use Supabase MCP SQL tools if available in a future runtime; otherwise create migrations, edge-function tests, and explicit SQL for operator/Supabase SQL editor execution.

## Supabase schema topology and linking doctrine

BSuite uses **one shared Supabase backend**, not one schema repo per app. All
apps point at project `tuybltdrdefjblnplpqo`; the schema is sharded across the
parent repo and submodules via their own `supabase/migrations/` folders.

As of the 2026-06-05 Task 7 inventory, SQL migration files are distributed as:

| Scope | SQL migration files | Notes |
|-------|--------------------:|-------|
| `crm7` | 289 | Bulk of the table/function/RLS schema and edge-function reference implementation |
| `business-suite-unified` | 80 | BSU platform/admin/auth-hub schema surfaces |
| `braden` | 43 | Braden corporate-site/admin/tenant-layout schema surfaces |
| `R80.3` | 21 | R80-owned calculation/rate-state schema surfaces |
| parent `bsuite` | 19 | Cross-suite/shared orchestration migrations |
| `conduit` | 9 | Recruitment/candidate schema surfaces |
| `packages/schema-builder` | 5 | Shared schema-builder RPC/migration primitives |
| `throughput` | 4 | Throughput idea-platform schema surfaces |

`schema_migrations` is shared across all scopes. This is why per-submodule
drift checks must use `supabase migration up --linked --include-all` rather
than naive `supabase db push`; each submodule only has a subset of the remote
history.

Operationally:

1. **Project to connect/link:** always use Supabase project
   `tuybltdrdefjblnplpqo`.
2. **Pipeline owner:** parent `bsuite` owns the CI connection via
   `.github/workflows/supabase-migrate.yml`. That workflow detects which
   submodule changed, runs `supabase link --project-ref "$SUPABASE_PROJECT_ID"`,
   then applies migrations from that scope with `--include-all`.
3. **Primary schema authority:** `crm7` contains most of the actual schema and
   should be treated as the reference implementation for table/function/RLS
   definitions unless the entity ownership map assigns ownership elsewhere.
4. **Preferred production applier:** Supabase MCP `apply_migration` remains the
   operator-preferred path for audited production changes; the CI workflow is the
   fallback/PR path. Never run local `supabase db push` against
   `tuybltdrdefjblnplpqo`.
5. **Braden caveat:** `braden/supabase/config.toml` currently contains
   `project_id = "iykrauzuutvmnxpqppzk"`. Treat this as stale/local-dev linkage
   for production work. When linking manually from Braden, explicitly pass
   `--project-ref tuybltdrdefjblnplpqo`.

## Global stage gate

Before any stage is marked complete:

1. Run relevant unit tests, typecheck, lint, and build commands.
2. Run browser checks for UI-facing changes at desktop and mobile breakpoints.
3. Run a red-team review (`code-review` plus relevant custom BSuite agent).
4. Compare equivalent components across apps.
5. Update affected docs, issues, and dashboard data.
6. Confirm no `workspace:*`, `file:../packages/*`, forbidden auth strings, raw D2C colours, or new free-text entity fields were introduced.
7. Commit with conventional commits and PR Evidence block.

---

## Task 0: Pre-flight inventory and authority reconciliation

**Purpose:** Establish current truth before changing code.

**Files:**
- Read: `docs/plans/STATUS.md`
- Read: `docs/dashboard/data/dashboard-data.json`
- Read: all active roadmap/plan/audit/gap docs listed above.
- Modify if stale: `docs/plans/STATUS.md`
- Modify if stale: `docs/dashboard/data/dashboard-data.json`
- Modify if dashboard changed: `docs/dashboard/index.html`

**Skills:** `planning-and-roadmapping`, `bsuite-context`, `ship-all-apps`, `qa-and-verification`, `verification-before-completion`, `documentation-compliance`, `code-quality-enforcement`.

**MCPs/tools:** `gh`, GitKraken MCP, `bash`, `rg`, `glob`, `jq`, dashboard scripts, session store SQL.

**Steps:**

1. Run repo state inventory:
   ```bash
   for repo in bsuite crm7 conduit business-suite-unified R80.3 braden throughput; do
     dir="/home/braden/Desktop/Dev/bsuite/$repo"
     [ "$repo" = "bsuite" ] && dir="/home/braden/Desktop/Dev/bsuite"
     git -C "$dir" fetch origin --quiet
     git -C "$dir" status -sb --untracked-files=normal
     git -C "$dir" rev-list --count origin/main..origin/development
   done
   ```
   Expected: dirty work is understood and not overwritten.

2. Run issue/PR inventory:
   ```bash
   for repo in bsuite crm7 conduit business-suite-unified R80.3 braden throughput; do
     gh pr list --repo "GaryOcean428/$repo" --state open --limit 100
     gh issue list --repo "GaryOcean428/$repo" --state open --limit 200
   done
   ```
   Expected: open PR count and issue counts match dashboard or dashboard is updated.

3. Generate a current remaining-work matrix grouped as: production blockers, operator blockers, package blockers, auth/security, DB/source-of-truth, DRY one-shot, CRM7 GTO, Conduit recruitment, BSU platform, UI/UX/a11y/perf, docs.

4. Red-team the matrix for stale docs. If a doc conflicts with merged commits or dashboard evidence, prefer latest code/PR/dashboard evidence and mark the older doc as historical in the new PR.

5. Commit only documentation/status/dashboard changes for the inventory.

**Acceptance Criteria:**
- [ ] No open PRs or blocked PRs are missed.
- [ ] Dashboard counters match `gh` output or include an explicit note.
- [ ] Every active issue is classified or intentionally left in backlog.
- [ ] Parent `bsuite` branch divergence from `main` is documented before Task 9.

---

## Task 1: Shared package release lane

**Purpose:** Keep shared packages usable by standalone app repos and unblock development testing.

**Files:**
- Modify: `packages/charge-calc/package.json`
- Modify: `packages/charge-calc/CHANGELOG.md`
- Modify as needed: `packages/charge-calc/src/**`
- Modify consumers only after publish: `crm7/package.json`, `crm7/pnpm-lock.yaml`, `R80.3/package.json`, `R80.3/pnpm-lock.yaml`
- Modify dashboard if status changes: `docs/dashboard/data/dashboard-data.json`, `docs/dashboard/index.html`

**Skills:** `bsuite-platform`, `code-quality-enforcement`, `qa-and-verification`, `verification-before-completion`, `test-driven-development`, `git-workflow`.

**MCPs/tools:** `bash`, `npm`, `pnpm`, `gh`, GitKraken MCP, TypeScript compile/test tools.

**Steps:**

1. Verify package source:
   ```bash
   cd /home/braden/Desktop/Dev/bsuite
   pnpm --filter @bsuite/charge-calc test
   pnpm --filter @bsuite/charge-calc typecheck
   pnpm --filter @bsuite/charge-calc build
   npm pack --workspace packages/charge-calc --dry-run
   ```

2. If npm publish requires `main`, open a parent `bsuite` package-release PR to `main`, merge it under standing package permission, then publish:
   ```bash
   npm publish packages/charge-calc --access public
   npm view @bsuite/charge-calc version
   ```
   Expected: version is `0.5.0` or newer.

3. Update CRM7/R80.3 consumers on `development` only. Regenerate lockfiles outside the `bsuite` tree:
   ```bash
   tmp=$(mktemp -d)
   cp crm7/package.json "$tmp/package.json"
   (cd "$tmp" && corepack enable && pnpm install)
   cp "$tmp/pnpm-lock.yaml" crm7/pnpm-lock.yaml
   rm -rf "$tmp"
   ```
   Repeat for R80.3.

4. Run consumer checks:
   ```bash
   cd crm7 && pnpm run typecheck && pnpm test
   cd ../R80.3 && pnpm run typecheck && pnpm test
   ```

5. Red-team package API compatibility before merging consumers.

**Acceptance Criteria:**
- [ ] `npm view @bsuite/charge-calc version` returns the published version.
- [ ] CRM7 and R80.3 consume npm semver, not workspace/file links.
- [ ] Consumer tests/typechecks pass.
- [ ] Dashboard operator blocker for charge-calc is cleared with evidence.

---

## Task 2: Auth, Supabase, and security closure

**Purpose:** Close active auth/security dashboard gaps and production hardening blockers.

**Files:**
- Parent: `AUTH_CANONICAL.md`
- Parent: `.github/workflows/**`
- Parent/package: `packages/auth/src/**`, `packages/auth/tests/**`
- Consumer callbacks/providers:
  - `crm7/src/pages/auth/**`
  - `R80.3/src/pages/**Auth**`
  - `braden/src/pages/auth/**`
  - `throughput/src/pages/auth/**`
  - `conduit/src/app/auth/**`, `conduit/src/lib/auth/**`, `conduit/src/lib/supabase/**`
- Braden role manager: `braden/src/utils/roleManager.ts`
- CODEOWNERS: `.github/CODEOWNERS` in each repo.

**Skills:** `supabase`, `supabase-auth-comprehensive`, `auth-setup`, `security-audit`, `bsuite-auth-guardian`, `code-quality-enforcement`, `qa-and-verification`, `verification-before-completion`.

**MCPs/tools:** Supabase MCP SQL if available, migrations, `gh`, GitKraken MCP, `bash`, Context7 Supabase docs, Playwright/browser tools, Next.js MCP for Conduit.

**Steps:**

1. Add OIDC nonce support in `@bsuite/auth`; write package tests first.
2. Update all consumer BS OAuth call sites to pass/verify nonce.
3. Add OAuth token revoke helper and call it on logout.
4. Add cross-tab logout listener for `bs_access_token` disappearance.
5. Add circuit breaker for repeated silent-auth redirects.
6. Add `bs-oauth-expired` listener in every consumer and surface a re-auth prompt.
7. Add forbidden-pattern CI guard for cookie SSO strings in active source.
8. Add CODEOWNERS across all repos and ask operator to enable branch protection/code-owner review.
9. Replace Braden role decisions using `getSession()` with `getClaims()`/server-verified role lookups and remove hardcoded admin email.
10. Audit RLS for sensitive tables that must be direct-session only or client-specific via `auth.jwt() ->> 'client_id'`.
11. Confirm Conduit service-role RPC grants and SECURITY DEFINER posture with live SQL.
12. Browser-test sign-in, silent auth, refresh, logout, cross-tab logout, and Conduit SSR auth.

**Acceptance Criteria:**
- [ ] OAuth contract tests pass in all six apps/server surfaces.
- [ ] No active forbidden cookie SSO code paths exist.
- [ ] Logout revokes or explicitly documents non-revocation limitations.
- [ ] Cross-tab logout works.
- [ ] Braden has no hardcoded admin email.
- [ ] CODEOWNERS exists in all repos.
- [ ] `AUTH_CANONICAL.md` includes the redirect URI registry and current exception rules.

---

## Task 3: CRM7 database source-of-truth and Supabase advisor closure

**Purpose:** Ensure migrations, production schema, pgTAP, and advisor findings converge.

**Files:**
- `crm7/supabase/migrations/**`
- `crm7/supabase/tests/**`
- `crm7/docs/STACK-AUDIT.md`
- `docs/plans/20260513-bsuite-consolidated-hardening-v1.00W.md`
- `docs/dashboard/data/dashboard-data.json`

**Skills:** `supabase-postgres-best-practices`, `supabase`, `security-audit`, `test-driven-development`, `qa-and-verification`, `verification-before-completion`, `code-quality-enforcement`.

**MCPs/tools:** Supabase MCP SQL if available, Supabase CLI, `psql`, `bash`, `jq`, GitKraken MCP, `gh`.

**Steps:**

1. Reconcile crm7#758 and crm7#831:
   - inventory empty/applied migrations;
   - archive superseded migrations with README;
   - promote a verified baseline;
   - make local reset produce an empty diff against production baseline.

2. Run pgTAP locally and in CI:
   ```bash
   cd crm7
   supabase db reset
   supabase test db
   ```

3. Re-run advisor checks after each DB hardening PR.

4. Confirm live SECURITY DEFINER and RPC grants:
   ```sql
   SELECT proname, prosecdef, proacl, proconfig
   FROM pg_proc
   WHERE proname IN (
     'handle_new_user',
     'resolve_bs_oauth_subject_portal_role',
     'branding_json_for_tenant'
   );
   ```

5. Update dashboard and issues with advisor deltas.

**Acceptance Criteria:**
- [ ] `supabase db reset` works from source migrations.
- [ ] pgTAP suite is green or every remaining failure has an issue and owner.
- [ ] Advisor security findings are zero or explicitly accepted with evidence.
- [ ] Live DB and source migrations agree for production-critical tables/functions.

---

## Task 4: DRY one-shot entity completion

**Purpose:** Finish canonical entity ownership, FKs, selectors, and linker flows.

**Files:**
- `crm7/supabase/migrations/**`
- `crm7/src/components/entity/selectors/**`
- `crm7/src/components/entity/EntityLinker*`
- CRM7 forms/detail pages for employers, mentors, training providers, funding sources, leads, contacts, opportunities, vacancies, placements.
- `R80.3/src/**` surfaces that touch CRM7-owned people/apprentice data.
- `docs/20260227-dry-one-shot-architecture-v1.02A.md`

**Skills:** `dry-one-shot-architecture`, `forms-and-validation`, `frontend-backend-mapping`, `supabase-postgres-best-practices`, `shadcn-ui`, `tanstack-query`, `qa-and-verification`, `verification-before-completion`, `bsuite-user-advocate`.

**MCPs/tools:** `bash`, `rg`, `gh`, GitKraken MCP, Playwright/browser tools, Chrome DevTools MCP.

**Steps:**

1. Add remaining FK migrations and indexes for:
   - `employers.primary_contact_id`
   - `mentors.contact_id`
   - `training_providers.contact_id`
   - `funding_sources.contact_id`
   - `host_agreements.signatory_contact_id`
   - `opportunities.client_id`
   - `vacancies.client_id`

2. Add failing pgTAP tests for each FK, RLS visibility, and backfill behavior.

3. Enforce `people.contact_id` convergence for new records and add duplicate-blocking tests.

4. Build/reuse selectors instead of raw UUID or free-text fields.

5. Wire selectors into affected forms and delete free-text islands.

6. Build `EntityLinker` and wire priority detail pages.

7. Finish placement create/edit and transition dialog UI.

8. Validate R80.3 reads CRM7-owned apprentice/person data and writes R80-owned calculation state only.

9. Run Playwright for create/edit/link/convert flows.

**Acceptance Criteria:**
- [ ] Every listed FK exists with indexes and tests.
- [ ] No new entity free-text fields remain where a table exists.
- [ ] CRM7 placement, lead, document, person, and training-plan flows use canonical selectors/linking.
- [ ] R80.3 no longer writes CRM7-owned apprentices/people.
- [ ] Inter-app entity display components match in styling and empty/error states.

---

## Task 5: CRM7 GTO, payroll, reporting, and regulatory closure

**Purpose:** Close remaining GTO production gaps after the June report/payroll wave.

**Files:**
- `crm7/src/pages/reports/**`
- `crm7/src/lib/reports/**`
- `crm7/src/lib/payroll/**`
- `crm7/src/pages/payroll/**`
- `crm7/supabase/functions/**`
- `crm7/supabase/migrations/**`
- `packages/charge-calc/**`
- `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`
- `crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md`
- `crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md`

**Skills:** `supabase`, `supabase-postgres-best-practices`, `xero`, `xero-integration`, `data-export`, `forms-and-validation`, `tanstack-query`, `qa-and-verification`, `verification-before-completion`, `security-audit`.

**MCPs/tools:** `bash`, `pnpm`, Supabase MCP/CLI if available, Context7, Tavily for regulatory source checks, Playwright/browser tools, GitKraken MCP, `gh`.

**Steps:**

1. Complete `@bsuite/charge-calc` rollout from Task 1.
2. Reconcile open GTO report issues crm7#527-#534 against merged PRs and close only with evidence.
3. Finish bsuite#570 payroll adapter scope: MYOB/Astute/Xero/STP/EOFY evidence, provider acknowledgement, and direct-ATO out-of-scope documentation under ADR-0004.
4. Finish training schedule override and training-day pattern period scope.
5. Verify report exports, large CSV queues, PDF generation, storage URLs, and delivery retry behavior.
6. Verify AVETMISS/state extracts with known fixtures.
7. Run accountant/admin/host/apprentice role matrix.

**Acceptance Criteria:**
- [ ] Regulatory reports in scope have real data, RLS, exports, and evidence.
- [ ] Payroll provider flows are explicit about system of record and finalisation status.
- [ ] Charge-calc provenance and pay item IDs round-trip through CRM7/R80.3.
- [ ] No placeholder proposal/document generation paths remain.

---

## Task 6: Conduit recruitment to CRM7 handoff completion

**Purpose:** Bring recruitment/candidate flow to production spec and handoff fully to CRM7 people/placement flows.

**Files:**
- `conduit/src/app/(dashboard)/candidates/**`
- `conduit/src/app/(dashboard)/jobs/**`
- `conduit/src/app/(dashboard)/offers/**`
- `conduit/src/stores/**`
- `conduit/supabase/migrations/**`
- `conduit/src/lib/supabase/**`
- CRM7 handoff receive/create-person surfaces.

**Skills:** `nextjs-app-router`, `vercel-next-best-practices`, `supabase`, `supabase-auth-comprehensive`, `dry-one-shot-architecture`, `forms-and-validation`, `tanstack-query`, `qa-and-verification`, `verification-before-completion`, `playwright-skill`, `api-design-validation`.

**MCPs/tools:** Next.js MCP (`init`, `nextjs_docs`, `nextjs_index`, `nextjs_call`), browser automation, `bash`, `pnpm`, GitKraken MCP, `gh`, Context7.

**Steps:**

1. Start with Next.js MCP:
   ```bash
   cd conduit
   pnpm run dev
   ```
   Then use `nextjs_index`/`nextjs_call` for runtime errors.

2. Add schema/status CHECK constraints and TypeScript enum mirrors for `r7_*` status fields.

3. Expand handoff snapshot to candidate + application + job + interviews + offer + field officer + compliance + consents.

4. Add candidate compliance fields and talent-pool consent.

5. Add public apply form with duplicate detection.

6. Add offer-to-training-contract e-sign/AASS lodgement/status machine.

7. Add candidate documents tab wired to `r7_documents`.

8. Browser-test candidate creation, application, offer, handoff, and CRM7 person/placement creation.

**Acceptance Criteria:**
- [ ] Candidate handoff contains all required downstream CRM7 data.
- [ ] Anonymous/public apply path is RLS-safe and duplicate-aware.
- [ ] Conduit and CRM7 use matching person/candidate display components, status badges, document sections, and error states.
- [ ] Conduit SSR/localStorage/cookie auth surfaces stay consistent after callback and refresh.

---

## Task 7: BSU platform, page/schema builder, and Visual Feature Builder

**Purpose:** Complete the no-code platform layer and platform-admin capabilities.

**Files:**
- `business-suite-unified/src/pages/**`
- `business-suite-unified/src/components/**`
- `business-suite-unified/src/lib/**`
- `packages/page-builder/**`
- `packages/schema-builder/**`
- `packages/schema-registry/**`
- `packages/ui/**`
- `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`
- `docs/plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`

**Skills:** `bsuite-platform`, `dry-one-shot-architecture`, `shadcn-ui`, `dnd-kit`, `forms-and-validation`, `tanstack-query`, `ui-ux-pro-max`, `ui-ux-consistency`, `design-system`, `supabase`, `qa-and-verification`, `verification-before-completion`.

**MCPs/tools:** browser automation, Chrome DevTools MCP, Context7, `bash`, `pnpm`, GitKraken MCP, `gh`.

**Steps:**

1. Execute ADR-0002: schema authoring is CRM7-owned; BSU renders/hosts platform surfaces without duplicating authoring ownership.
2. Complete Visual Feature Builder Phase 1 advanced entity layer.
3. Complete page layer: breakpoints, snap guides, layers, multi-select, symbols.
4. Complete logic layer: workflow, edge functions, scheduled jobs.
5. Complete AI prompt-to-feature only after `AI_GATEWAY_API_KEY` is present.
6. Complete permission visual editor and portal targeting.
7. Complete full-stack PR export after `FEATURE_BUILDER_GH_PAT` or Jodie GitHub App is available.
8. Complete platform-kit panels: auth, logs, database, secrets, storage, dynamic tables.
9. Run visual and RLS contract tests.

**Acceptance Criteria:**
- [ ] BSU platform panels are usable by platform admins and RLS-safe.
- [ ] Feature Builder phases have evidence or explicit blockers.
- [ ] Shared page/schema packages are used instead of app-local duplication.
- [ ] CRM7, BSU, Braden, R80.3, Conduit, and Throughput render shared page/layout concepts consistently.

---

## Task 8: Cross-app UI, accessibility, performance, and observability consistency

**Purpose:** Make the suite feel like one product and meet production UX quality.

**Files:**
- All app `src/components/**`
- All app `src/pages/**` / Conduit `src/app/**`
- `packages/theme/**`
- `packages/ui/**`
- `packages/nav-core/**`
- Per-app `vercel.json`
- Per-app Playwright/Vitest tests.

**Skills:** `bsuite-brand-system`, `design-system`, `ui-ux-consistency`, `ui-ux-pro-max`, `shadcn-ui`, `tailwind`, `framer-motion`, `performance-regression`, `playwright-skill`, `qa-and-verification`, `verification-before-completion`, `bsuite-design-sheriff`, `bsuite-user-advocate`.

**MCPs/tools:** Chrome DevTools MCP, Lighthouse, Playwright/browser automation, Context7, `bash`, `pnpm`, GitKraken MCP, `gh`.

**Steps:**

1. Inventory components across apps: buttons, dialogs, cards, tables, filters, loaders, empty states, status badges, document sections, document uploaders, navigation, sidebars, dashboard cards.
2. Extract or reuse shared package primitives where duplication exists.
3. Complete CRM7 DialogContent a11y sweep.
4. Run WCAG AA checks across all apps.
5. Finish raw D2C colour/OKLCH sweep, excluding Braden corporate brand rules.
6. Add Sentry/error reporting where planned.
7. Add Web Vitals reporting and resolve CRM7 INP issues.
8. Complete PWA assets, FOUC prevention, font alignment, shared Logo, Storybook.
9. Capture screenshots at mobile/tablet/desktop for changed UI.

**Acceptance Criteria:**
- [ ] Same component class behaves and looks the same across apps.
- [ ] Braden is corporate brand compliant and never D2C-themed.
- [ ] D2C apps use `@bsuite/theme` tokens and no raw colour regressions.
- [ ] axe/Lighthouse/Playwright evidence exists for critical surfaces.
- [ ] Shared primitives live in `@bsuite/*` packages where appropriate.

---

## Task 9: Production ship gate

**Purpose:** Promote verified `development` to `main` and prove production works.

**Files:**
- Parent dashboard and docs:
  - `docs/dashboard/data/dashboard-data.json`
  - `docs/dashboard/index.html`
  - `docs/plans/STATUS.md`
  - `docs/README.md`
- App release PRs across all repos.

**Skills:** `ship-all-apps`, `deployment-readiness`, `qa-and-verification`, `verification-before-completion`, `playwright-skill`, `git-workflow`, `finishing-a-development-branch`, `bsuite-user-advocate`, `security-audit`, `performance-regression`.

**MCPs/tools:** `gh`, GitKraken MCP, `bash`, Playwright/browser tools, Chrome DevTools MCP, deployment/log tools if available.

**Steps:**

1. Ensure no open PRs except intentional promotion PRs:
   ```bash
   for repo in bsuite crm7 conduit business-suite-unified R80.3 braden throughput; do
     gh pr list --repo "GaryOcean428/$repo" --state open
   done
   ```

2. Reconcile parent `bsuite` if `main` is ahead of `development`.

3. For each app repo, open `development -> main` PR only after checks are green.

4. Run app-level verification before merge:
   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm test
   pnpm run build
   ```
   Use only scripts that exist in that repo.

5. Merge one app at a time, wait for production deployment, then run production smoke.

6. Run cross-app smoke:
   - BSU login.
   - Launch CRM7, Conduit, R80.3, Braden, Throughput from BSU.
   - Silent auth refresh.
   - Logout and cross-tab/cross-app cleanup.
   - CRM7 placement creation.
   - CRM7 document upload.
   - CRM7 lead creation/conversion.
   - Conduit candidate handoff to CRM7.
   - CRM7 proposal/document generation.
   - Training schedule override.

7. Run first non-Braden enterprise tenant onboarding end-to-end.

8. Update dashboard and docs after each app promotion.

**Acceptance Criteria:**
- [ ] All app production URLs load with no critical console errors.
- [ ] Cross-app auth works and logout clears expected state.
- [ ] Core user flows listed above pass in browser.
- [ ] Dashboard production state reflects the shipped SHA/PR evidence.
- [ ] No app `development` branch contains unmerged production-critical work after promotion.

---

## Task 10: Documentation, issue, and dashboard closure

**Purpose:** Make the docs match reality and prevent future agents from re-opening stale work.

**Files:**
- `docs/plans/STATUS.md`
- `docs/plans/README.md`
- `docs/README.md`
- `docs/dashboard/data/dashboard-data.json`
- `docs/dashboard/index.html`
- Relevant per-app `docs/UNIFIED-ROADMAP.md`, `docs/STACK-AUDIT.md`, `docs/README.md`.

**Skills:** `documentation-compliance`, `documentation-sync`, `planning-and-roadmapping`, `qa-and-verification`, `verification-before-completion`, `bsuite-plans-keeper`.

**MCPs/tools:** `gh`, GitKraken MCP, `bash`, `rg`, `jq`, dashboard scripts.

**Steps:**

1. For every issue closed by Tasks 1-9, add PR/commit/live evidence before closing.
2. Mark superseded plan rows as superseded, not deleted.
3. Archive completed plans only after evidence exists.
4. Run dashboard refresh:
   ```bash
   cd /home/braden/Desktop/Dev/bsuite
   python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json
   bash docs/dashboard/inline-data.sh
   python3 -m json.tool docs/dashboard/data/dashboard-data.json >/dev/null
   ```

5. Open a dashboard/docs PR to `development`; merge only after checks pass.

**Acceptance Criteria:**
- [ ] Roadmap, dashboard, issues, and docs agree.
- [ ] No stale open PR references remain in dashboard.
- [ ] Every status change has an evidence URL.
- [ ] Documentation naming convention is preserved.

---

## Execution notes for future agents

- Always start from this plan plus the dashboard and `docs/plans/STATUS.md`.
- Use a fresh worktree for large phases.
- Do not batch unrelated app changes into a single PR unless an atomic package/contract change requires it.
- Prefer package changes over copy-paste between apps.
- Before changing one app's component pattern, inspect at least two sibling apps for equivalent UI and update all affected surfaces or document intentional divergence.
- Red-team every auth, RLS, package, and UI-system change before merge.
- If Supabase live verification is unavailable, write migrations/tests and mark live verification as blocked with exact SQL for the operator.
- If a task touches Conduit runtime behavior, initialise Next.js MCP and use official Next.js docs through the MCP before coding.
- If a task touches external regulatory/vendor behavior, use Tavily/research and cite current source URLs in the PR.
- If a task touches AG Grid, use the AG Grid MCP version detector/docs before editing.
