# BSuite Production Reconciliation Design

> **Status:** v1.00W (Working)
> **Date:** 2026-02-28
> **Author:** Claude Code (architecture + compliance)
> **Approach:** Layered Waves — fix everything before adding features

**Goal:** Bring the entire BSuite monorepo to production-ready state by systematically resolving every consistency, security, DRY, RBAC, schema, and testing gap.

**Architecture:** 5 sequential waves, each building on the last. Each wave has a verification gate — no wave starts until the previous wave's gate passes.

**Delegation:**
- **Claude Code** = architecture, compliance, shared types, migrations, calc engine, BOOT
- **Cascade** = bulk UI/RBAC rollout, Supabase call migration, Zod upgrades
- **Claude 2** = testing, documentation, migration scripts

---

## Current State (Post-Audit)

| Metric | Value | Target | Gap |
|--------|-------|--------|-----|
| PermissionGate coverage | 138/240 routes (58%) | 100% | 102 routes |
| Direct supabase.from() DRY violations | 111 calls across 3 projects | 0 | 111 calls |
| Zod version consistency | v3 (conduit, braden, BSU) vs v4 (crm7, R80.3) | All v4 | 3 projects |
| React version consistency | v18 (crm7, R80.3, BSU) vs v19 (conduit, braden) | Aligned | Acceptable split |
| Migration timestamp collisions | 1 collision (20260228140000) | 0 | 1 fix |
| Root pnpm-workspace.yaml | Missing | Present | Not needed (submodule design) |
| crm7 barrel index files | 2/7 directories | 7/7 | 5 barrels |
| R80.3 PKCE in supabase client | Missing (OAuth layer has it) | Direct client too | 1 fix |
| BSU hardcoded domains | 10+ instances | 0 | 10 instances |
| crm7 test files | 42 files | 70% coverage | Gap TBD after coverage run |
| Worktree cleanup | Done (0 active) | 0 | Resolved |
| Merge conflicts | Done (0 remaining) | 0 | Resolved |

---

## Wave 0: Cleanup & Security (9 tasks)

**Owner:** Claude Code
**Gate:** All security issues resolved, no merge conflicts, clean git state

### 0.1 Fix migration timestamp collision
- Rename `20260228140000_create_placement_status_history.sql` to `20260228140001_create_placement_status_history.sql`
- Verify migration ordering is correct

### 0.2 Fix R80.3 PKCE configuration
- Add `flowType: 'pkce'` to `R80.3/src/integrations/supabase/client.ts` auth config
- Matches BSU's pattern at `business-suite-unified/src/lib/supabase.ts:122`

### 0.3 Fix BSU hardcoded domains
- Move all domain strings in `src/lib/supabase.ts`, `src/lib/sessionHandoff.ts`, `src/config/navigation.ts` to environment variables
- Add `VITE_CRM7_URL`, `VITE_CONDUIT_URL`, `VITE_R80_URL`, `VITE_BRADEN_URL`, `VITE_SUITE_URL`
- Fallback to existing hardcoded values in dev mode only

### 0.4 Create missing crm7 barrel files
- `crm7/src/types/index.ts` — export all type modules
- `crm7/src/lib/index.ts` — export rates, pipelines, validators, compliance, workflows
- `crm7/src/utils/index.ts` — export calc bridges
- `crm7/src/components/index.ts` — export common, auth, rates, ui categories
- `crm7/src/lib/rates/index.ts` — already exists, verify completeness

### 0.5 Add .npmrc files
- Each project root: `strict-peer-dependencies=false` (prevents pnpm peer dep failures)
- Consistent across all 5 projects

### 0.6 WHS staging migration check
- Verify `20251015025100_crm7_whs_workflow_reporting_v2.sql` runs cleanly on fresh DB
- Check for dependency ordering issues

### 0.7 Audit crm7 store barrel completeness
- Verify all 15+ stores are exported from `stores/index.ts`
- Add any missing exports

### 0.8 Audit crm7 schema barrel completeness
- Verify all schemas exported from `schemas/index.ts`
- Remove any remaining duplicates

### 0.9 Run full test suite, document baseline
- `pnpm test` in crm7 — record pass/fail/skip counts
- Document the 5 pre-existing failures (entityNavigation: 4, useAIChat: 1)

---

## Wave 1: Data Layer (15 tasks)

**Owner:** Claude Code (migrations) + Claude 2 (Zod schemas)
**Gate:** All tables exist, all entities have Zod schemas, migrations run clean

### 1.1-1.9 Create missing migration tables

These entities exist in `types/entities.ts` but have no corresponding migration:

| # | Entity | Table Name | Key Columns |
|---|--------|-----------|-------------|
| 1.1 | Vacancy | vacancies | title, status, host_employer_id, position_type |
| 1.2 | Worker | workers | type (WorkerType), status, pay_rate, award_id |
| 1.3 | HostSite | host_sites | name, address, host_employer_id, risk_level |
| 1.4 | Lead | leads | source, status, contact_info, assigned_to |
| 1.5 | FundingSource | funding_sources | name, type, provider, scheme_code |
| 1.6 | FundingClaim | funding_claims | source_id, apprentice_id, amount, status |
| 1.7 | GtoOrganization | gto_organizations | name, registration_number, state |
| 1.8 | GtoComplaint | gto_complaints | organization_id, apprentice_id, category, status |
| 1.9 | ChargeRateQuote | charge_rate_quotes | worker_id, rate_config (JSONB), boot_assessment_id |

All tables include: `id uuid PK`, `tenant_id uuid FK`, `created_at`, `updated_at`, RLS policies.

### 1.10-1.15 Create missing Zod schemas

Entities needing Zod validation schemas:

| # | Entity | Schema File |
|---|--------|------------|
| 1.10 | HostEmployer | schemas/hostEmployer.ts |
| 1.11 | HostAgreement | schemas/hostAgreement.ts |
| 1.12 | Award | schemas/award.ts |
| 1.13 | Vacancy | schemas/vacancy.ts |
| 1.14 | Qualification + Competency | schemas/qualifications.ts |
| 1.15 | FundingSource + FundingClaim | schemas/funding.ts |

Each schema: Zod v4 with `.transform()` for date parsing, `.describe()` for field docs, exported from `schemas/index.ts`.

---

## Wave 2: Consistency (12 tasks)

**Owner:** Cascade (Zod upgrade, Supabase calls) + Claude Code (calc bridge)
**Gate:** All projects on Zod v4, no direct supabase.from() in pages/components

### 2.1-2.3 Upgrade Zod v3 to v4

| # | Project | Current | Target |
|---|---------|---------|--------|
| 2.1 | conduit | ^3.24.1 | ^4.1.12 |
| 2.2 | business-suite-unified | ^3.24.1 | ^4.1.12 |
| 2.3 | braden | ^3.24.1 | ^4.1.12 |

Each upgrade: update `package.json`, run `pnpm install`, fix any breaking API changes (`.parse()` → `.safeParse()` patterns, `z.object()` API stable).

### 2.4-2.8 Standardize Supabase clients

| # | Project | Fix |
|---|---------|-----|
| 2.4 | crm7 | Create `lib/supabaseClient.ts` with PKCE, cookie storage, env-based URL |
| 2.5 | crm7 | Migrate 92 direct `supabase.from()` calls in pages/components to store methods |
| 2.6 | BSU | Migrate 4 direct calls to service layer |
| 2.7 | braden | Migrate 15 direct calls to service layer |
| 2.8 | All | Verify all clients use `flowType: 'pkce'` |

### 2.9 Complete R80.3 ↔ crm7 calc bridge
- Verify `@bsuite/charge-calc` is the single source of truth
- Ensure `crmCalcBridge.ts` and R80.3's `calcBridge.ts` both delegate to shared engine
- No duplicated calculation logic

### 2.10 Standardize type imports across projects
- All projects should import shared types from `@bsuite/` packages or local `/types/`
- No inline type definitions that duplicate shared types

### 2.11 Align package.json scripts
- All projects: `dev`, `build`, `test`, `lint`, `typecheck` scripts
- Consistent naming across all 5 projects

### 2.12 Add pnpm lockfile verification
- Each project CI should run `pnpm install --frozen-lockfile`
- Prevents accidental dependency drift

---

## Wave 3: RBAC + Store Migration (10 tasks)

**Owner:** Cascade (bulk rollout) + Claude Code (review)
**Gate:** 100% route protection, 0 direct supabase calls in UI layer

### 3.1-3.5 PermissionGate on remaining routes

| # | Project | Unprotected Routes | Strategy |
|---|---------|-------------------|----------|
| 3.1 | crm7 | ~37 remaining | Add PermissionGate with appropriate permissions |
| 3.2 | conduit | 20 routes | Add middleware-based auth (Next.js App Router pattern) |
| 3.3 | BSU | 19 routes | Add PermissionGate (portal-level permissions) |
| 3.4 | braden | 25 routes | Public site — most don't need auth, protect admin routes |
| 3.5 | R80.3 | 1 route | Public calculator — verify no auth-requiring endpoints |

### 3.6-3.10 Migrate direct Supabase calls to stores

| # | Scope | Calls to Migrate |
|---|-------|-----------------|
| 3.6 | crm7 pages (apprentices, contracts, charge-rates) | ~30 |
| 3.7 | crm7 pages (clients, contacts, documents) | ~25 |
| 3.8 | crm7 components (forms, tables, modals) | ~20 |
| 3.9 | crm7 hooks/contexts | ~17 |
| 3.10 | BSU + braden combined | 19 |

Pattern: Extract query into store method → replace `supabase.from()` with `useXxxStore()` hook → add loading/error states.

---

## Wave 4: Verify & Ship (8 tasks)

**Owner:** Claude 2 (testing) + Claude Code (final review)
**Gate:** All tests pass, coverage > 70%, red-team clean, deployment notes complete

### 4.1 Full test suite — fix all failures
- Fix 5 pre-existing test failures (entityNavigation: 4, useAIChat: 1)
- Run full suite across all projects

### 4.2 Coverage analysis
- Run `pnpm test -- --coverage` in each project
- Identify files below 70% threshold
- Write tests for critical paths (calc engine, BOOT, auth, billing)

### 4.3 Write missing tests for Wave 1-3 changes
- Migration table CRUD tests
- Zod schema validation tests
- Store method tests for migrated Supabase calls
- PermissionGate integration tests

### 4.4 Security red-team
- Verify no secrets in code (`grep -r "sk_live\|password\|secret"`)
- Verify PKCE on all auth flows
- Verify RLS policies on all new tables
- Verify PermissionGate cannot be bypassed

### 4.5 Build verification
- `pnpm build` succeeds in all 5 projects
- No TypeScript errors
- No ESLint warnings

### 4.6 Migration deployment notes
- Document migration run order for Supabase
- Note any migrations that need manual review
- Expand → Migrate → Contract pattern for schema changes

### 4.7 Documentation update
- Update `CLAUDE.md` if any conventions changed
- Update `docs/DRY-ONE-SHOT-ARCHITECTURE.md` with new barrel structure
- Update `docs/AUTH-MAP.md` with PKCE changes

### 4.8 Merge to main
- Create PR from development → main
- Include full changelog
- Require human approval (Braden)

---

## Delegation Matrix

| Agent | Responsibilities | Wave(s) |
|-------|-----------------|---------|
| **Claude Code** | Architecture, migrations, calc engine, BOOT, security fixes, final review | 0, 1 (migrations), 2.9-2.12, 4.4-4.8 |
| **Cascade** | Bulk UI: PermissionGate rollout, Supabase call migration, Zod upgrades | 2.1-2.8, 3.1-3.10 |
| **Claude 2** | Testing, Zod schemas, documentation, coverage analysis | 1.10-1.15, 4.1-4.3, 4.7 |

### Handoff Protocol

1. Each wave produces a clean commit on `development` branch
2. Claude Code verifies gate passes before next wave starts
3. Cascade/Claude 2 work in dedicated worktrees branched from `development`
4. All PRs reviewed by Claude Code before merge
5. Braden reviews at Wave 0 gate, Wave 2 gate, and Wave 4 (final)

---

## React Version Decision

React 18 vs 19 split is **acceptable and intentional**:
- conduit uses React 19 for Next.js 16 server components
- braden uses React 19 for modern features
- crm7/R80.3/BSU stay on React 18 (stable, no migration risk)
- No cross-project React component sharing that would break

**Decision: Do not align React versions.** Each project manages its own React version.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Zod v3→v4 breaking changes | Cascade runs `pnpm typecheck` after each upgrade |
| 92 Supabase calls too many to migrate safely | Batch by page/feature, test each batch |
| PermissionGate adds latency | Permission check is in-memory (Zustand store), no API call |
| Migration timestamp collision causes deploy failure | Fix in Wave 0.1 before any new migrations |
| BOOT NES validation has legal implications | All BOOT results require `humanReviewRequired: true` |
| Store migration changes data flow | Each migration gets its own test file |

---

## Success Criteria

- [ ] 0 merge conflicts, 0 active worktrees
- [ ] 0 migration timestamp collisions
- [ ] All Supabase clients use PKCE
- [ ] 0 hardcoded domain strings in BSU
- [ ] 7/7 crm7 directories have barrel exports
- [ ] 240/240 routes protected (or documented as intentionally public)
- [ ] 0 direct supabase.from() in pages/components
- [ ] All projects on Zod v4
- [ ] All tests pass, >70% coverage on critical paths
- [ ] Clean build across all 5 projects
- [ ] Design doc and implementation plan committed
