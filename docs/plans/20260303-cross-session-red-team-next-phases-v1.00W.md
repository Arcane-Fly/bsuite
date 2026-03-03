# BSuite Next Phases — Cross-Session Red-Team Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Address all deferred work from both Claude Code sessions, fix critical bugs found during red-teaming, and prepare CRM7 for PR C (table drop) and Conduit for multi-user deployment.

**Architecture:** 5 priority tiers executed across **two Claude Code sessions** (Session A and Session B) working in parallel on non-overlapping files. Tier 0 is emergency fixes, Tier 1 is security, Tier 2 is PR C gate, Tier 3 is quality, Tier 4 is cleanup.

**Tech Stack:** Supabase (PostgreSQL + RLS), React + Vite (CRM7), Next.js 16 (Conduit), Zustand, Zod 4, wouter, next-themes

**Plan path:** `docs/plans/20260303-cross-session-red-team-next-phases-v1.00W.md`

---

## What's Done (Previous Sessions)

### Session A (Claude A — People Model)

- PR A: All `from('apprentices')` migrated to `from('people')` in app-layer (8 tasks)
- PR B: 15 legacy route redirects, `person_id` FK added to 4 RESTRICT tables, BaseEntity index signature removed, 31 TS errors fixed
- Committed `de9a18c`, pushed to `origin/development`
- 0 TS errors, 1,531 tests passing

### Session B (Claude B — DataTable + Theme)

- `208e828`: 11 CRM7 pages migrated to EnhancedDataTable (Batches 2-3)
- `2c1430b`: Conduit Phase 8B theme system (next-themes)
- 0 TS errors in both projects

---

## Red-Team Findings (4 Critical Discoveries)

| ID | Finding | Severity | Impact |
|----|---------|----------|--------|
| **RT-1** | `visa_expiry` column never created in ANY table | CRITICAL | Visa expiry compliance scanning has never worked. Both scanners silently return `[]`. Regulatory blind spot for GTO. |
| **RT-2** | `workers` table missing 7+ columns (`display_name`, `xero_employee_id`, `first_name`, etc.) | HIGH | Charge-rate worker dropdowns broken (empty). Xero `syncEmployees()` is dead code. |
| **RT-3** | `alertScanner.ts:416` also reads `from('apprentices')` — missed in PR A | HIGH | Second migration site. Must fix before PR C table drop. |
| **RT-4** | Conduit has zero RBAC — every authenticated user has full access | CRITICAL | No role checks, no RLS on `r7_*` tables, no middleware guards. Security hole. |

---

## Tier 0: Emergency Fixes (Pre-Requisite for Everything)

### Session A Scope

#### T0-A1. Add `visa_expiry` column to `people` table

**New file:** `crm7/supabase/migrations/20260304030000_add_visa_expiry_to_people.sql`

```sql
ALTER TABLE people ADD COLUMN IF NOT EXISTS visa_expiry DATE;
-- If apprentices table still exists (dual-write period), add there too
ALTER TABLE apprentices ADD COLUMN IF NOT EXISTS visa_expiry DATE;
```

**Verify:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'visa_expiry'` returns 1 row.

#### T0-A2. Migrate compliance-scanner edge function

**File:** `crm7/supabase/functions/compliance-scanner/index.ts`

- Line 261: `from('apprentices')` → `from('people').in('employment_type', ['apprentice', 'trainee'])`
- Update visa expiry scan to use new `visa_expiry` column

**Verify:** `supabase functions serve compliance-scanner` → test endpoint returns data.

#### T0-A3. Migrate client-side alertScanner

**File:** `crm7/src/lib/compliance/alertScanner.ts`

- Line 416: `safeQuery(client, 'apprentices', ...)` → `safeQuery(client, 'people', ...)`
- Add employment_type filter

**Verify:** `pnpm tsc --noEmit` passes. Manual test: compliance alerts page loads.

### Session B Scope

#### T0-B1. Fix TODO(B4) form-entity bugs — Critical forms first

Each form needs a `mapFormToEntity()` function converting camelCase form fields to snake_case entity fields. Fix in priority order:

1. **`crm7/src/pages/people/new.tsx:63`** — Cast `employment_type` properly:

   ```ts
   store.create({ ...result.data, employment_type: result.data.employment_type as EmploymentType })
   ```

2. **`crm7/src/pages/compliance/create.tsx:79`** — Map form fields:
   - `entity_type` → `type`, `entity_id` → `related_id`, `compliance_type` → already matches?, `document_url` → `document_url`
   - Read ComplianceRecord interface to confirm exact field names

3. **`crm7/src/pages/hosts/agreements/new.tsx:103`** — Map form fields to HostAgreement entity

4. **`crm7/src/pages/hosts/vacancies/new.tsx:178`** — Map form fields to Vacancy entity

5. **`crm7/src/pages/vet/qualifications/create.tsx:61`** + **`[id]/edit.tsx:320`** — Map to Qualification

6. **`crm7/src/pages/vet/units/create.tsx:85`** + **`[id]/edit.tsx:120`** — Map to UnitOfCompetency

**Verify:** For each form: `pnpm tsc --noEmit` passes. Remove all `as any` casts. Forms should have zero `TODO(B4)` comments remaining.

---

## Tier 1: Security — Conduit RBAC (Phase 8C)

### Session A Scope (Core RBAC Infrastructure)

#### T1-A1. Extend `useTenantId` to fetch role

**File:** `conduit/src/hooks/useTenantId.ts`

- Change query from `select('tenant_id')` to `select('tenant_id, role')`
- Return `{ tenantId, role }` tuple
- Handle null role (default to `viewer`)

**Reference:** `crm7/src/hooks/usePermissions.ts` for pattern

#### T1-A2. Create Conduit role mapping service

**New file:** `conduit/src/lib/roleMappingService.ts`

Map portal roles → Conduit operational roles:

- `owner` / `admin` → `conduit_admin`
- `manager` / `staff` → `recruiter`
- `guest` → `viewer`
- `host_employer` → `employer`
- `apprentice` → `candidate`
- `training_provider` → `viewer`

**Reference:** `crm7/src/lib/roleMappingService.ts`

#### T1-A3. Create Conduit permission constants

**New file:** `conduit/src/lib/permissionConstants.ts`

Domains: candidates, jobs, pipeline, offers, interviews, onboarding, compliance, analytics, settings, ai

**Reference:** `crm7/src/lib/permissionConstants.ts`

#### T1-A4. Create `usePermissions` hook

**New file:** `conduit/src/hooks/usePermissions.ts`

Must handle `developer` / `tester` platform role bypass.

**Reference:** `crm7/src/hooks/usePermissions.ts`

#### T1-A5. Create `PermissionGate` component

**New file:** `conduit/src/components/common/PermissionGate.tsx`

**Reference:** `crm7/src/components/common/PermissionGate.tsx`

#### T1-A6. Add middleware route authorization

**File:** `conduit/src/lib/supabase/middleware.ts`

- After session check, fetch user role
- Check against route permission map
- Admin-only routes: `/settings`
- Recruiter+ routes: write operations

#### T1-A7. Wire PermissionGate into navigation

**File:** `conduit/src/components/DashboardShell.tsx`

- Filter nav items by current user's permissions
- Hide Settings from non-admin users

#### T1-A8. Add RLS policies to `r7_*` tables

**New file:** `conduit/supabase/migrations/20260304040000_add_rls_to_r7_tables.sql`

Tables: `r7_candidates`, `r7_jobs`, `r7_applications`, `r7_pipeline_entries`, `r7_offers`, `r7_interviews`, `r7_documents`, `r7_compliance_checks`, `r7_communications`, `r7_onboarding_*`, `r7_talent_pools`, `r7_job_distributions`, `r7_pipeline_stages`

Policy: `tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active' LIMIT 1)`

### Session B Scope (Tests + Settings)

#### T1-B1. Set up Vitest infrastructure for Conduit

- `conduit/vitest.config.ts` (Next.js 16 compatible)
- Test utilities: mock Supabase client, mock stores
- Target: 70% coverage on RBAC critical path

#### T1-B2. Write RBAC tests

Once Session A completes T1-A4:

- Test `usePermissions` hook with all role combinations
- Test middleware auth redirect logic
- Test `PermissionGate` render/hide behavior

#### T1-B3. Add User Management Settings tab

**File:** `conduit/src/app/(dashboard)/settings/page.tsx`

- New tab: "Team" — list members, roles, invite
- Role assignment UI (admin, recruiter, viewer)

---

## Tier 2: PR C Gate — Eliminate Old Table Dependencies

**BLOCKED UNTIL:** Tier 0 complete + 1-week soak on `people` table in production.

### Session A Scope

#### T2-A1. Migrate charge-rates from `workers` to `people`

**Files:**

- `crm7/src/pages/charge-rates/create.tsx:199` — `from('workers').select('id, display_name')` → `from('people').select('id, first_name, last_name')` + construct display name in JS
- `crm7/src/pages/charge-rates/[id]/edit.tsx:238` — same pattern

#### T2-A2. Migrate Xero adapter from `workers` to `people`

**File:** `crm7/src/lib/payroll/xeroAdapter.ts`

- Lines 367, 392: `from('workers')` → `from('people')`
- Map Xero fields to `people` columns
- Decision: store `xero_employee_id` in `people.metadata` JSONB or add column

#### T2-A3. Rename DataContext interface

**File:** `crm7/src/contexts/DataContextSupabase.tsx`

- `createApprentice` → `createPerson`, etc.
- Grep all consumers of `useData()` first — if >20 files, use deprecated aliases

### Session B Scope

#### T2-B1. `apprentice_id` → `person_id` app-code rename (79 files)

This is the big one. Systematic rename across:

- All schemas in `crm7/src/schemas/`
- All stores referencing `apprentice_id`
- All pages using `apprentice_id`
- 4 RESTRICT tables already have `person_id` (migration `20260304010000`)

**Strategy:** Use TypeScript compiler errors as guide. Remove `apprentice_id` from entity types → fix all errors → verify.

#### T2-B2. Delete old page directories

- `crm7/src/pages/apprentices/` — confirm empty (already cleaned in PR B)
- `crm7/src/pages/labour-hire/workers/` — confirm empty
- `crm7/src/pages/external-employees/` — confirm empty

If already cleaned, skip. If files remain, delete them.

### PR C Execution (SEQUENTIAL — both sessions coordinate)

**Pre-flight checklist:**

- [ ] Zero `from('apprentices')` in entire codebase (including edge functions)
- [ ] Zero `from('workers')` in entire codebase
- [ ] `visa_expiry` column exists on `people` table
- [ ] 1-week soak period complete
- [ ] DB snapshot taken

**New file:** `crm7/supabase/migrations/20260304050000_contract_drop_old_tables.sql`

```sql
-- 1. Drop dual-write triggers
DROP TRIGGER IF EXISTS sync_apprentice_to_people ON apprentices;
DROP TRIGGER IF EXISTS sync_worker_to_people ON workers;
DROP FUNCTION IF EXISTS sync_apprentice_to_people();
DROP FUNCTION IF EXISTS sync_worker_to_people();

-- 2. Drop old FK constraints on RESTRICT tables
ALTER TABLE rto_assignments DROP CONSTRAINT IF EXISTS rto_assignments_apprentice_id_fkey;
ALTER TABLE training_schedules DROP CONSTRAINT IF EXISTS training_schedules_apprentice_id_fkey;
ALTER TABLE escalation_log DROP CONSTRAINT IF EXISTS escalation_log_apprentice_id_fkey;
ALTER TABLE welfare_reports DROP CONSTRAINT IF EXISTS welfare_reports_apprentice_id_fkey;

-- 3. Drop old tables
DROP TABLE IF EXISTS apprentices CASCADE;
DROP TABLE IF EXISTS workers CASCADE;

-- 4. Add NOT NULL + indexes on person_id
ALTER TABLE rto_assignments ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE training_schedules ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE escalation_log ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE welfare_reports ALTER COLUMN person_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rto_assignments_person_id ON rto_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_training_schedules_person_id ON training_schedules(person_id);
CREATE INDEX IF NOT EXISTS idx_escalation_log_person_id ON escalation_log(person_id);
CREATE INDEX IF NOT EXISTS idx_welfare_reports_person_id ON welfare_reports(person_id);
```

---

## Tier 3: Quality + Cleanup

### Session A Scope

#### T3-A1. Fix zodResolver `as any` pattern (21 sites in CRM7)

Root cause: `react-hook-form` `FieldValues` type doesn't match Zod inferred types.

**Solution:** Create typed wrapper:

```ts
// crm7/src/lib/typedZodResolver.ts
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodSchema } from 'zod';
export function typedZodResolver<T extends ZodSchema>(schema: T) {
  return zodResolver(schema) as any; // single cast location
}
```

Replace 21 `zodResolver(schema) as any` with `typedZodResolver(schema)`.

#### T3-A2. EnhancedDataTable Batch 4

Remaining pages: hosts, settings, awards, charge-rates.
Follow same pattern from Batches 1-3.

### Session B Scope

#### T3-B1. Fix AI upgrade flow (Conduit)

**File:** `conduit/src/components/ai/AIAssistant.tsx:77`

- Replace `console.info` with redirect to BSU billing page
- Wire into BSU's Stripe integration URL

#### T3-B2. Conduit documentation

- Phase 8B theme design doc (retroactive)
- Phase 8C RBAC architecture doc
- Update `conduit/docs/README.md` index

#### T3-B3. Fix `@bsuite/charge-calc` test failures

9 pre-existing failures from module resolution (`Cannot find module ... dist/types`).
Fix in `packages/charge-calc/` — likely a tsconfig paths issue.

---

## Tier 4: Deferred (Backlog — Not in This Sprint)

| Item | Reason | When |
|------|--------|------|
| `workerTypes.ts` shim deletion | Keep until all imports migrated | After PR C |
| Store sub-directory reorganization | Low priority, high blast radius | Phase 5D |
| 20+ WHS database tables | Feature gap, not migration blocker | WHS feature sprint |
| 15+ Supabase query wiring TODOs | Feature gap | Per-domain sprints |
| 7 STA adapter stubs (NSW, VIC, QLD, etc.) | Need per-state API access | Phase 2 |
| R80.3 Fair Work API (stale rates) | Separate workstream | R80.3 sprint |
| R80.3 dual calc engine cleanup | Bridge pattern working | P3 cleanup |
| `development` → `main` merge | Pure superset, FF safe | Do before starting Tier 1 |

---

## Session Delegation Summary

### Session A (This Session): CRM7 Schema + Conduit RBAC

| Tier | Tasks | Files |
|------|-------|-------|
| 0 | T0-A1, T0-A2, T0-A3 | compliance-scanner edge fn, alertScanner.ts, migration |
| 1 | T1-A1 through T1-A8 | Conduit RBAC (8 new/modified files + migration) |
| 2 | T2-A1, T2-A2, T2-A3 | charge-rates, Xero adapter, DataContext rename |
| 3 | T3-A1, T3-A2 | zodResolver wrapper, EnhancedDataTable Batch 4 |

### Session B (Other Claude): CRM7 Forms + Conduit Quality

| Tier | Tasks | Files |
|------|-------|-------|
| 0 | T0-B1 | 8 form-entity mapping fixes |
| 1 | T1-B1, T1-B2, T1-B3 | Jest setup, RBAC tests, User Management tab |
| 2 | T2-B1, T2-B2 | apprentice_id → person_id rename (79 files), delete old dirs |
| 3 | T3-B1, T3-B2, T3-B3 | AI upgrade flow, docs, charge-calc tests |

### Coordination Points (Sessions Must Sync)

1. **Before Tier 1:** Session B waits for Session A to complete T1-A4 (`usePermissions` hook) before writing RBAC tests (T1-B2)
2. **Before PR C:** Both sessions must verify zero `from('apprentices')` and `from('workers')` calls
3. **PR C execution:** Coordinate on single migration file — one session writes, other reviews

---

## Verification Checklist (Per Tier)

### Tier 0 Exit Criteria

- [ ] `visa_expiry` column exists on `people` table
- [ ] `grep -rn "from('apprentices')" crm7/src/ crm7/supabase/functions/` returns 0
- [ ] Zero `TODO(B4)` comments remain
- [ ] `pnpm tsc --noEmit` — 0 errors (CRM7)
- [ ] `pnpm test --run` — no new failures

### Tier 1 Exit Criteria

- [ ] Conduit: non-admin user cannot access `/settings`
- [ ] Conduit: `viewer` role cannot create/edit candidates
- [ ] Conduit: RLS policies active on all `r7_*` tables
- [ ] Conduit: Jest test suite passes with >=70% coverage on RBAC paths
- [ ] `pnpm tsc --noEmit` — 0 errors (Conduit)

### Tier 2 Exit Criteria

- [ ] `grep -rn "from('workers')" crm7/src/` returns 0
- [ ] `grep -rn "apprentice_id" crm7/src/` returns 0 (in non-test, non-migration files)
- [ ] PR C migration tested against staging DB
- [ ] DB snapshot taken before production execution

### Tier 3 Exit Criteria

- [ ] Zero `zodResolver(schema) as any` casts (replaced with `typedZodResolver`)
- [ ] EnhancedDataTable Batch 4 complete
- [ ] Conduit AI upgrade flow works end-to-end
- [ ] Phase 8B + 8C documentation committed
- [ ] `@bsuite/charge-calc` tests passing
