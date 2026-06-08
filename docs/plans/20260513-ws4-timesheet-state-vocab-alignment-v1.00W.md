# WS-4 Timesheet State Vocabulary Alignment (HF-2) — Implementation Plan

> **Status: COMPLETED** — Merged to development via [CRM7 PR #948](https://github.com/GaryOcean428/crm7/pull/948) at commit `bf97acf9`. All tests passing (57 vitest + typecheck + eslint). Evidence: CI checks passed (build-and-test, e2e, drift scan, DOM layout, OAuth sync, gitleaks).

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Align the TypeScript `TimesheetState` type, Zod schema, workflow state machine, UI components, and tests with the canonical 7-state DB `timesheet_state` ENUM shipped in commit `4baea942` / migration `20260423150000_ws4_timesheet_state_machine.sql`, resolving HF-2 (issue #863).

**Architecture:** The live DB enum defines a **two-tier role-based approval workflow** (apprentice → host supervisor → GTO officer → payroll export → archive). The current TS code defines a **payroll-lifecycle workflow** (dispute/process/lock/pay) that is runtime-broken against the DB enum — any post-approval state transition throws a Postgres invalid-enum-value error. Option A (align TS → DB) was chosen per user direction 2026-05-13. Because the new workflow replaces `dispute → resubmit` with `host-reject → back-to-submitted` and `pending_gto_review → bounce-back`, the TS workflow, UI buttons, tests, and some DB columns all change. No data migration is needed for in-flight rows because the migration backfill only ever wrote `draft | submitted | approved`.

**Tech Stack:** TypeScript 5.x strict, Zod v4, Vitest, React 19, Supabase Postgres, pnpm workspace, crm7 submodule.

---

## Canonical 7-state DB ENUM (source of truth)

```sql
-- crm7/supabase/migrations/20260423150000_ws4_timesheet_state_machine.sql:13
CREATE TYPE public.timesheet_state AS ENUM (
  'draft',
  'submitted',
  'pending_host_approval',
  'pending_gto_review',
  'approved',
  'exported',
  'archived'
);
```

## Canonical action verbs (derived from plan docs)

Per `crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md` and `20260423-bsuite-gto-master-plan-v1.00W.md`:

- `submit` (apprentice): `draft → submitted`
- `sendToHost` (system, auto-trigger on submit): `submitted → pending_host_approval`
- `hostApprove` (host supervisor): `pending_host_approval → pending_gto_review`
- `hostReject` (host supervisor): `pending_host_approval → submitted` (bounces back to apprentice with reason)
- `gtoApprove` (gto_staff/gto_admin): `pending_gto_review → approved`
- `gtoBounce` (gto_staff/gto_admin): `pending_gto_review → pending_host_approval` (bounce back to host)
- `exportToPayroll` (payroll role): `approved → exported`
- `archive` (gto_admin/payroll/system-cron): `exported → archived`

`submit` + `sendToHost` can be collapsed into a single `submitTimesheet()` public fn that advances directly `draft → pending_host_approval` — plan doc §125 says this is "system auto" after apprentice submits. **Decision: collapse into single transition to match plan doc intent.** Final transition table:

```
draft                  →  pending_host_approval   (submit)      [apprentice]
pending_host_approval  →  pending_gto_review      (hostApprove) [host supervisor]
pending_host_approval  →  submitted               (hostReject)  [host supervisor, needs reason]
submitted              →  pending_host_approval   (resubmit)    [apprentice, after rejection]
pending_gto_review     →  approved                (gtoApprove)  [gto_staff/gto_admin]
pending_gto_review     →  pending_host_approval   (gtoBounce)   [gto_staff/gto_admin, needs reason]
approved               →  exported                (exportToPayroll) [payroll]
exported               →  archived                (archive)     [gto_admin/payroll/cron]
```

**Note:** `submitted` is an interstitial state only entered after `hostReject`. Fresh apprentice drafts go directly from `draft → pending_host_approval` on submit; they only end up at `submitted` if the host sends the timesheet back. The DB enum includes `submitted` explicitly for this purpose.

---

## Semantic mapping (old TS → new TS = DB)

| Old TS state | New state | Notes |
|---|---|---|
| `draft` | `draft` | Identical |
| `submitted` | `pending_host_approval` on submit; `submitted` still exists for host-rejected rebounds | Changes meaning. **No in-flight data** so safe. |
| `approved` | `approved` | Identical label but different entry path (now via GTO approve, not direct). |
| `disputed` | (removed) — modelled as `submitted` + populated `dispute_reason` col | Renamed concept |
| `processed` | `exported` | Renamed |
| `payroll_locked` | (removed) — enforced purely by RLS on `state IN ('exported','archived')` | No separate state; lock = RLS denies edits |
| `paid` | `archived` (loose; `paid_at` tracked on `payroll_records`, not timesheet) | Payment tracking moves out of `timesheets` table — already true per migration which created `payroll_records` with `super_paid_at` / derived payment_date. **Timesheet `archived` just means "closed out, post-export"**. |

| Old TS action | New action | Notes |
|---|---|---|
| `submit` | `submit` (new target: `pending_host_approval`) | |
| `approve` | Split into `hostApprove` + `gtoApprove` | Two-tier approval |
| `dispute` | `hostReject` (requires `reason`) | Rejection reason retained as-was on `dispute_reason` col |
| `resubmit` | `resubmit` (from `submitted` back to `pending_host_approval`) | |
| `process` | `exportToPayroll` | |
| `lock` | (removed) | RLS handles |
| `markPaid` | `archive` (loose map; actual payment is a `payroll_records` concern) | |
| (new) | `gtoBounce` | Sends `pending_gto_review` back to `pending_host_approval` |

---

## Supabase column audit for `public.timesheets`

Currently present (from migration history audit):

- `disputed_at` (timestamptz, NULL) — **KEEP**, repurpose as `host_rejected_at` semantics via renaming
- `dispute_reason` (text, NULL) — **KEEP**, rename to `rejection_reason`
- `processed_at` (timestamptz, NULL) — **RENAME** → `exported_at`
- `overtime_approved` (boolean, default false) — **KEEP** as-is (not tied to state machine)
- `host_approved_at` (timestamptz, NULL) — **KEEP**
- `host_approved_by` (text, NULL) — should be `UUID REFERENCES auth.users(id)` — **FIX TYPE**
- `approver_id` (uuid, FK auth.users) — **KEEP** (used by GTO approval)
- `approved_at` (timestamptz, NULL) — **KEEP** (set by `gtoApprove`)
- `approved_by` (uuid, FK auth.users) — **KEEP** (set by `gtoApprove`)
- `submitted_at` (timestamptz, NULL) — **KEEP**
- `payroll_flagged` (boolean) — **KEEP** (orthogonal to state)
- `status` (text) — already **DROPPED** by WS-4 migration, do not re-reference

Missing columns to ADD:

- `exported_at` (timestamptz, NULL) — set by `exportToPayroll`
- `archived_at` (timestamptz, NULL) — set by `archive`
- `gto_reviewer_id` (uuid, FK auth.users, NULL) — who did `gtoApprove`/`gtoBounce`
- `host_rejected_at` (timestamptz, NULL) — rename target for `disputed_at`

**Data preservation decision:** perform a **column RENAME** (`disputed_at → host_rejected_at`, `dispute_reason → rejection_reason`, `processed_at → exported_at`) rather than add-new + drop-old, because the columns have consistent semantics under the new name and no production rows are at risk per the migration backfill guarantee.

**Orphaned columns to DROP (or leave nullable):** none. The above rename covers all affected columns.

---

## PR boundary

**Single PR** into `bsuite/development`, sequenced commits:

1. **DB migration** (new file `crm7/supabase/migrations/20260513120000_ws4_timesheet_state_column_rename.sql`) — column renames + add exported_at/archived_at/gto_reviewer_id + fix host_approved_by type + documentation comment. Runs first so DB matches next commit's TS expectations.
2. **TS type alignment** — `entities.ts` + `schemas/timesheet.ts` — new vocabulary, deprecated old type names re-exported as aliases with `@deprecated` for 1-release grace period where type-compatible (only `draft/submitted/approved` overlap — `disputed/processed/payroll_locked/paid` cannot alias and are simply removed).
3. **Workflow rewrite** — `lib/timesheetWorkflow.ts` — new TRANSITIONS table, new action verbs, new public fns. Keep legacy fn names as `@deprecated throw()`-stubs that guide callers to the new API.
4. **UI alignment** — `TimesheetStateBadge.tsx` + `pages/timesheets/index.tsx` + `pages/timesheets/[id]/index.tsx` — new `STATE_META`, new `STATE_LABELS`, new button visibility rules.
5. **Tests rewrite** — `timesheetWorkflow.v2.test.ts` + `timesheet-state-ui.test.tsx` — all 7 states + all transitions under the new vocabulary.
6. **Doc update** — mark issue #863 action recipe Option A as executed; close issue on merge.

**Why single PR not split:** Types, schemas, workflow, UI, and tests are lockstep — splitting would leave `main` in a broken intermediate state on any partial merge (e.g. type alone would break workflow typecheck). Migration goes first as a DB change but lands in the same PR so CI runs the app against the renamed columns.

---

## Task breakdown (sequential steps for executor)

### Task 1: Create feature branch off development

**Files:**
- N/A (branch creation)

**Step 1: Fetch + branch**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
git fetch origin --quiet
git checkout development
git pull --ff-only origin development
git checkout -b fix/ws4-timesheet-state-vocab-alignment-20260513
```

**Step 2: Verify branch**

```bash
git branch --show-current
# Expected: fix/ws4-timesheet-state-vocab-alignment-20260513
```

**Step 3: Commit checkpoint** — skip until first real change.

---

### Task 2: Write DB migration for column renames + additions

**Files:**
- Create: `crm7/supabase/migrations/20260513120000_ws4_timesheet_state_column_rename.sql`

**Step 1: Write migration**

```sql
-- WS-4 follow-up (HF-2): align timesheets columns with canonical 7-state workflow
-- Ref: docs/plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00W.md
--
-- Renames:
--   disputed_at      → host_rejected_at
--   dispute_reason   → rejection_reason
--   processed_at     → exported_at
-- Additions:
--   archived_at       timestamptz NULL
--   gto_reviewer_id   uuid NULL FK auth.users(id)
-- Type fix:
--   host_approved_by  text → uuid FK auth.users(id)
--
-- No data backfill required — migration 20260423150000 only ever populated
-- state IN ('draft','submitted','approved'), none of the removed states
-- (disputed/processed/payroll_locked/paid) ever hit production rows.

-- ============================================================
-- 1. Column renames
-- ============================================================
ALTER TABLE public.timesheets RENAME COLUMN disputed_at    TO host_rejected_at;
ALTER TABLE public.timesheets RENAME COLUMN dispute_reason TO rejection_reason;
ALTER TABLE public.timesheets RENAME COLUMN processed_at   TO exported_at;

-- ============================================================
-- 2. New columns
-- ============================================================
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gto_reviewer_id UUID REFERENCES auth.users(id);

-- ============================================================
-- 3. Fix host_approved_by type text → uuid
--    Safe because migration 20260304000010 added it as text with no production
--    writes outside GTO staff context.
-- ============================================================
ALTER TABLE public.timesheets
  ALTER COLUMN host_approved_by TYPE UUID USING host_approved_by::UUID,
  ADD CONSTRAINT timesheets_host_approved_by_fkey
    FOREIGN KEY (host_approved_by) REFERENCES auth.users(id);

-- ============================================================
-- 4. Column comments for documentation
-- ============================================================
COMMENT ON COLUMN public.timesheets.host_rejected_at IS
  'Set when host supervisor rejects a pending_host_approval timesheet — state reverts to submitted.';
COMMENT ON COLUMN public.timesheets.rejection_reason IS
  'Reason text supplied by host/GTO on hostReject or gtoBounce action.';
COMMENT ON COLUMN public.timesheets.exported_at IS
  'Set when timesheet is exported to payroll (state: approved → exported).';
COMMENT ON COLUMN public.timesheets.archived_at IS
  'Set when timesheet is archived post-export (state: exported → archived).';
COMMENT ON COLUMN public.timesheets.gto_reviewer_id IS
  'UUID of GTO officer who approved or bounced the timesheet (pending_gto_review → approved|pending_host_approval).';
COMMENT ON COLUMN public.timesheets.host_approved_by IS
  'UUID of host supervisor who approved (pending_host_approval → pending_gto_review).';
```

**Step 2: Verify SQL compiles (dry-run via psql syntax check or Supabase MCP)**

```bash
# Preferred: via Supabase MCP list_tables + apply_migration dry-run on a staging branch
# Fallback: run psql against local dev DB if available; otherwise code-review is the gate
```

**Step 3: Commit**

```bash
git add crm7/supabase/migrations/20260513120000_ws4_timesheet_state_column_rename.sql
git commit -m "feat(crm7): WS-4 HF-2 — rename timesheets columns for DB↔TS state vocab alignment

Renames disputed_at→host_rejected_at, dispute_reason→rejection_reason,
processed_at→exported_at. Adds archived_at, gto_reviewer_id. Fixes
host_approved_by type text→uuid with FK to auth.users.

No data backfill needed: migration 20260423150000 backfill only wrote
draft/submitted/approved states, so no rows carry the removed vocab.

Refs: issue #863, plan docs/plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00W.md"
```

---

### Task 3: Update `TimesheetState` type + `Timesheet` interface

**Files:**
- Modify: `crm7/src/types/entities.ts:412-462`

**Step 1: Replace the TimesheetState type block + Timesheet fields**

Target old block (lines 412-428):

```ts
/**
 * TimesheetState — 7-state ENUM (WS-4.3).
 * Matches the `timesheet_state` Postgres ENUM added in migration 4baea94.
 */
export type TimesheetState =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'disputed'
  | 'processed'
  | 'payroll_locked'
  | 'paid';

/**
 * @deprecated Use `TimesheetState` instead.
 * Legacy 5-state type kept for backwards compatibility during migration.
 */
export type TimesheetStatus = TimesheetState;
```

Replace with:

```ts
/**
 * TimesheetState — canonical 7-state ENUM aligned with the `timesheet_state`
 * Postgres ENUM (migration 20260423150000_ws4_timesheet_state_machine.sql).
 *
 * Workflow:
 *   draft → pending_host_approval (submit)
 *   pending_host_approval → pending_gto_review (hostApprove)
 *   pending_host_approval → submitted (hostReject)   [rebound]
 *   submitted → pending_host_approval (resubmit)
 *   pending_gto_review → approved (gtoApprove)
 *   pending_gto_review → pending_host_approval (gtoBounce)
 *   approved → exported (exportToPayroll)
 *   exported → archived (archive)
 */
export type TimesheetState =
  | 'draft'
  | 'submitted'
  | 'pending_host_approval'
  | 'pending_gto_review'
  | 'approved'
  | 'exported'
  | 'archived';

/** @deprecated Use `TimesheetState`. Removed states (disputed/processed/payroll_locked/paid) have no direct alias — see plan 20260513. */
export type TimesheetStatus = TimesheetState;
```

**Step 2: Update `Timesheet` interface (lines 443-480 region)**

Rename fields to match renamed DB columns:
- `disputed_at?: string` → `host_rejected_at?: string`
- `dispute_reason?: string` → `rejection_reason?: string`
- `processed_at?: string` → `exported_at?: string`

Add new fields:
- `archived_at?: string`
- `gto_reviewer_id?: string`

Leave `overtime_approved`, `approver_id`, `approved_at`, `approved_by`, `host_approved_at`, `host_approved_by` intact.

**Step 3: typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: many errors in `timesheetWorkflow.ts`, `schemas/timesheet.ts`, UI pages, tests — all of which are addressed in subsequent tasks.

**Step 4: commit checkpoint — SKIP, bundle with Task 4.**

---

### Task 4: Update Zod schemas

**Files:**
- Modify: `crm7/src/schemas/timesheet.ts:56-75`

**Step 1: Replace state + action enums**

```ts
/**
 * WS-4.3 — canonical 7-state ENUM (matches `timesheet_state` Postgres ENUM).
 */
export const timesheetStateSchema = z.enum([
  'draft',
  'submitted',
  'pending_host_approval',
  'pending_gto_review',
  'approved',
  'exported',
  'archived',
]);

/** @deprecated Use `timesheetStateSchema` instead. */
export const timesheetStatusSchema = timesheetStateSchema;

export const timesheetActionSchema = z.enum([
  'submit',
  'hostApprove',
  'hostReject',
  'resubmit',
  'gtoApprove',
  'gtoBounce',
  'exportToPayroll',
  'archive',
]);
```

**Step 2: Commit Tasks 3 + 4 together**

```bash
git add crm7/src/types/entities.ts crm7/src/schemas/timesheet.ts
git commit -m "refactor(crm7): align TimesheetState type + Zod schema with canonical DB ENUM (HF-2)

Replaces old payroll-lifecycle vocab (disputed/processed/payroll_locked/paid)
with canonical two-tier approval vocab (pending_host_approval /
pending_gto_review / exported / archived) per migration 20260423150000
and plan docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md §238.

TimesheetStatus alias kept for 1-release grace period; no runtime fallback
for removed states — they were never written to prod rows.

Refs: issue #863, plan docs/plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00W.md"
```

---

### Task 5: Rewrite `timesheetWorkflow.ts` transitions + actions

**Files:**
- Modify: `crm7/src/lib/timesheetWorkflow.ts` (entire file; ~400 LOC rewrite)

**Step 1: New TRANSITIONS table**

```ts
export type TimesheetAction =
  | 'submit'
  | 'hostApprove'
  | 'hostReject'
  | 'resubmit'
  | 'gtoApprove'
  | 'gtoBounce'
  | 'exportToPayroll'
  | 'archive';

const TRANSITIONS: Record<TimesheetState, Partial<Record<TimesheetAction, TimesheetState>>> = {
  draft:                 { submit: 'pending_host_approval' },
  submitted:             { resubmit: 'pending_host_approval' },
  pending_host_approval: { hostApprove: 'pending_gto_review', hostReject: 'submitted' },
  pending_gto_review:    { gtoApprove: 'approved', gtoBounce: 'pending_host_approval' },
  approved:              { exportToPayroll: 'exported' },
  exported:              { archive: 'archived' },
  archived:              {},
};
```

**Step 2: Rewrite `advanceTimesheetState` auto-field population**

- `submit`/`resubmit`: set `submitted_at = now`, clear `rejection_reason` + `host_rejected_at`
- `hostApprove`: require `host_approver_id` option, set `host_approved_at = now`, `host_approved_by = host_approver_id`
- `hostReject`: require `reason` option, set `host_rejected_at = now`, `rejection_reason = reason`
- `gtoApprove`: require `gto_reviewer_id` option, set `approved_at = now`, `approved_by = gto_reviewer_id`, `gto_reviewer_id = gto_reviewer_id`, `overtime_approved = options.overtime_approved ?? false`
- `gtoBounce`: require `reason` option, set `rejection_reason = reason`, `gto_reviewer_id = options.gto_reviewer_id`, clear `approved_at`+`approved_by`
- `exportToPayroll`: set `exported_at = now`
- `archive`: set `archived_at = now`

**Step 3: Rewrite public fns**

- `submitTimesheet(id, options)` — unchanged signature
- `hostApproveTimesheet(id, hostApproverId, options)` — new
- `hostRejectTimesheet(id, reason, options)` — new (replaces `disputeTimesheet`)
- `resubmitTimesheet(id, options)` — unchanged signature
- `gtoApproveTimesheet(id, gtoReviewerId, overtimeApproved, options)` — new (replaces old `approveTimesheet`)
- `gtoBounceTimesheet(id, gtoReviewerId, reason, options)` — new
- `exportTimesheetToPayroll(id, options)` — new (replaces `processTimesheet`)
- `archiveTimesheet(id, options)` — new (replaces `lockTimesheetForPayroll` + `markTimesheetPaid`)
- `batchHostApprove(ids, hostApproverId)` — new (replaces `batchApproveTimesheets`)

**Step 4: Deprecation stubs**

At end of file, keep the old public fn names as stubs that throw helpful error messages directing to new fn:

```ts
/** @deprecated Use `hostRejectTimesheet` instead. */
export const disputeTimesheet = (): never => {
  throw new Error('disputeTimesheet() was removed in HF-2 (issue #863). Use hostRejectTimesheet() instead.');
};
/** @deprecated Use `gtoApproveTimesheet` instead. */
export const approveTimesheet = (): never => {
  throw new Error('approveTimesheet() was removed in HF-2 (issue #863). Use gtoApproveTimesheet() instead.');
};
/** @deprecated Use `exportTimesheetToPayroll` instead. */
export const processTimesheet = (): never => {
  throw new Error('processTimesheet() was removed in HF-2. Use exportTimesheetToPayroll() instead.');
};
/** @deprecated Use `archiveTimesheet` instead. */
export const lockTimesheetForPayroll = (): never => {
  throw new Error('lockTimesheetForPayroll() was removed in HF-2. Use archiveTimesheet() instead.');
};
/** @deprecated Use `archiveTimesheet` instead. */
export const markTimesheetPaid = (): never => {
  throw new Error('markTimesheetPaid() was removed in HF-2. Timesheet archival no longer tracks payment; see payroll_records.super_paid_at for payment state.');
};
/** @deprecated Use `batchHostApprove` instead. */
export const batchApproveTimesheets = (): never => {
  throw new Error('batchApproveTimesheets() was removed in HF-2. Use batchHostApprove() (host tier) or add batchGtoApprove() as needed.');
};
/** @deprecated Use `advanceTimesheetState` instead. */
export const advanceTimesheetStatus = advanceTimesheetState;
```

**Step 5: typecheck + unit test stub**

```bash
pnpm tsc --noEmit 2>&1 | grep timesheetWorkflow || echo 'timesheetWorkflow clean'
```

---

### Task 6: Update `TimesheetStateBadge.tsx`

**Files:**
- Modify: `crm7/src/components/timesheets/TimesheetStateBadge.tsx:37-75`

**Step 1: New STATE_META**

```ts
const STATE_META: Record<TimesheetState, StateMeta> = {
  draft: {
    label: 'Draft',
    classes: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  },
  submitted: {
    label: 'Returned for Revision',  // shown only post-hostReject
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  pending_host_approval: {
    label: 'Pending Host Approval',
    classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  pending_gto_review: {
    label: 'Pending GTO Review',
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  exported: {
    label: 'Exported to Payroll',
    classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  archived: {
    label: 'Archived',
    classes: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800',
  },
};
```

---

### Task 7: Update `pages/timesheets/index.tsx`

**Files:**
- Modify: `crm7/src/pages/timesheets/index.tsx:46-68` (ALL_STATES + STATE_LABELS)
- Modify: same file lines 117-147 (role-based filter logic)
- Modify: same file lines 260-400 (action button visibility — `Approve`, `Dispute`, `Process`, `Lock`, `Mark Paid`)

**Step 1: ALL_STATES + STATE_LABELS**

```ts
const ALL_STATES: TimesheetState[] = [
  'draft',
  'submitted',
  'pending_host_approval',
  'pending_gto_review',
  'approved',
  'exported',
  'archived',
];

const STATE_LABELS: Record<TimesheetState, string> = {
  draft: 'Draft',
  submitted: 'Returned for Revision',
  pending_host_approval: 'Pending Host Approval',
  pending_gto_review: 'Pending GTO Review',
  approved: 'Approved',
  exported: 'Exported to Payroll',
  archived: 'Archived',
};
```

**Step 2: Role-based filter logic**

```ts
// apprentice: own drafts + submitted (rebound rows that need resubmission)
if (role === 'apprentice') {
  if (effectiveState !== 'draft' && effectiveState !== 'submitted') return false;
} else if (role === 'host_employer') {
  if (effectiveState !== 'pending_host_approval') return false;
} else if (role === 'payroll') {
  if (effectiveState !== 'approved' && effectiveState !== 'exported' && effectiveState !== 'archived') return false;
}
// gto_staff / gto_admin / super_admin / field_officer → see all
```

**Step 3: Action buttons**

Replace the old action button block with:

- Edit button: visible for `draft` OR `submitted` (rebounds are editable by apprentice)
- Host Approve / Host Reject: visible with `approve_timesheets` permission on `pending_host_approval` state
- GTO Approve / GTO Bounce: visible for gto_staff+ on `pending_gto_review` state
- Export button: visible for payroll role on `approved` state
- Archive button: visible for payroll/gto_admin on `exported` state

---

### Task 7b: Update `lib/timesheetConstants.ts` (full rewrite)

**Files:**
- Modify: `crm7/src/lib/timesheetConstants.ts:16-73` (status + action maps, ~60 lines)

**Step 1: Rewrite status maps for new 7-state vocab**

```ts
export const TIMESHEET_STATUS_VARIANT_MAP: Record<TimesheetState, BadgeVariant> = {
  draft: 'neutral',
  // `submitted` is semantically error-coded here because the NEW workflow only
  // lands a row at `submitted` via `hostReject` (rebound from host supervisor).
  // Fresh apprentice submits auto-advance `draft → pending_host_approval`, so
  // `submitted` in the wild always means "returned for revision". Do not
  // "fix" to 'info' without also changing the state machine in timesheetWorkflow.ts.
  submitted: 'error',
  pending_host_approval: 'warning',
  pending_gto_review: 'info',
  approved: 'success',
  exported: 'purple',
  archived: 'neutral',
};

export const TIMESHEET_STATUS_LABEL_MAP: Record<TimesheetState, string> = {
  draft: 'Draft',
  submitted: 'Returned for Revision',
  pending_host_approval: 'Pending Host Approval',
  pending_gto_review: 'Pending GTO Review',
  approved: 'Approved',
  exported: 'Exported to Payroll',
  archived: 'Archived',
};

export const TIMESHEET_STATUS_TABS: { value: TimesheetState | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_host_approval', label: 'Pending Host' },
  { value: 'pending_gto_review', label: 'Pending GTO' },
  { value: 'approved', label: 'Approved' },
  { value: 'exported', label: 'Exported' },
  { value: 'archived', label: 'Archived' },
];
```

**Step 2: Rewrite action maps for new 8-action vocab**

```ts
export const TIMESHEET_ACTION_LABEL_MAP: Record<TimesheetAction, string> = {
  submit: 'Submit',
  hostApprove: 'Approve',
  hostReject: 'Reject',
  resubmit: 'Resubmit',
  gtoApprove: 'Approve (GTO)',
  gtoBounce: 'Bounce Back',
  exportToPayroll: 'Export to Payroll',
  archive: 'Archive',
};

export const TIMESHEET_ACTION_VARIANT_MAP: Record<TimesheetAction, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  submit: 'default',
  hostApprove: 'default',
  hostReject: 'destructive',
  resubmit: 'outline',
  gtoApprove: 'default',
  gtoBounce: 'destructive',
  exportToPayroll: 'secondary',
  archive: 'secondary',
};
```

**Step 3: Update import**

```ts
import type { TimesheetState } from '@/types/entities';
// remove: import type { TimesheetStatus } ...
```

---

### Task 7c: Fix `lib/ai/tools/timesheet-tools.ts` (AI tool surface)

**Files:**
- Modify: `crm7/src/lib/ai/tools/timesheet-tools.ts` (entire file, ~450 LOC)

**Context:** This file has **two pre-existing bugs** (surfaced during HF-2 audit) that must be fixed atomically because they'll all turn into runtime errors the moment any AI chat tries to approve/reject a timesheet against the post-migration DB:

1. Writes `status: 'approved'` and `status: 'rejected'` — but the `status` TEXT column was **dropped** by migration `20260423150000`. These writes already fail silently (PostgREST returns 400) against prod.
2. Reads `status.eq.pending` in `get_pending_timesheets` — never matched the old vocab either (was `'submitted'`), still doesn't match new vocab (should be `'pending_host_approval'`).

**Step 1: Fix all state reads + writes to use `state` column + new vocab**

- `TimesheetSummaryRow.status?` → `state?: TimesheetState`
- `approve_timesheet` tool: change body to `{ state: 'pending_gto_review', host_approved_by: context.userId, host_approved_at: ... }`. Rename tool to `host_approve_timesheet`. Add new `gto_approve_timesheet` tool that advances `pending_gto_review → approved` with `approved_by`/`approved_at`/`gto_reviewer_id`.
- `reject_timesheet` tool: change body to `{ state: 'submitted', host_rejected_at: ..., rejection_reason: params.reason }`. Rename tool to `host_reject_timesheet`. Add new `gto_bounce_timesheet` tool.
- `bulk_approve_timesheets` → `bulk_host_approve_timesheets`, write `{ state: 'pending_gto_review', ... }`
- `get_pending_timesheets` filter: change `status.eq.pending` → `state.eq.pending_host_approval` (or parameterise to accept any of the two pending states)
- `get_timesheet_summary` stats: change property names + filter literals from `{draft, submitted, approved, disputed, processed}` to `{draft, submitted, pending_host_approval, pending_gto_review, approved, exported, archived}`
- `calculate_timesheet_billing` — no state mutation, but triple-check it still works against the new schema (it doesn't read `status`/`state` so is safe)

**Step 2: Update tool descriptions** to match new action semantics ("Host-supervisor approval — advances pending_host_approval → pending_gto_review" etc.)

**Step 3: Typecheck + test (if tests exist for this file)**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm tsc --noEmit 2>&1 | grep -E 'timesheet-tools|timesheetConstants' | head -30
pnpm vitest run src/lib/ai/tools 2>&1 | tail -15
```

**Note:** This is technically a P0 bug fix piggy-backing on HF-2. Call it out prominently in the commit message + PR body. Without this fix, the AI chat timesheet approval flow is and has been broken since migration 20260423150000 shipped.

---

### Task 8: Update `pages/timesheets/[id]/index.tsx`

**Files:**
- Modify: `crm7/src/pages/timesheets/[id]/index.tsx:94-95` (event from_state/to_state types) — no change needed, `TimesheetState` type already threaded
- Modify: same file wherever `status` field or action buttons are referenced

**Step 1: Grep for removed field names + replace**

```bash
grep -nE 'disputed_at|dispute_reason|processed_at' crm7/src/pages/timesheets/\[id\]/index.tsx
# Replace all hits: disputed_at → host_rejected_at, dispute_reason → rejection_reason, processed_at → exported_at
```

**Step 2: Update action button block** with same pattern as Task 7 Step 3 (host/gto/export/archive).

---

### Task 9: Rewrite `timesheetWorkflow.v2.test.ts`

**Files:**
- Modify: `crm7/src/lib/__tests__/timesheetWorkflow.v2.test.ts` (entire file)

**Step 1: Update imports**

Swap imports to new fn names: `hostApproveTimesheet`, `hostRejectTimesheet`, `gtoApproveTimesheet`, `gtoBounceTimesheet`, `exportTimesheetToPayroll`, `archiveTimesheet`, `batchHostApprove`.

**Step 2: Rewrite transition tests**

Cover all 8 valid transitions:
```
it('draft → pending_host_approval via submit', ...)
it('pending_host_approval → pending_gto_review via hostApprove', ...)
it('pending_host_approval → submitted via hostReject (requires reason)', ...)
it('submitted → pending_host_approval via resubmit', ...)
it('pending_gto_review → approved via gtoApprove (requires gto_reviewer_id)', ...)
it('pending_gto_review → pending_host_approval via gtoBounce (requires reason)', ...)
it('approved → exported via exportToPayroll', ...)
it('exported → archived via archive', ...)
```

**Step 3: Invalid transition tests**

```
it('throws when trying to gtoApprove a draft', ...)
it('throws when trying to exportToPayroll a submitted timesheet', ...)
it('throws when trying to submit an archived timesheet', ...)
it('throws when reason is missing for hostReject action', ...)
it('throws when reason is missing for gtoBounce action', ...)
it('throws when host_approver_id is missing for hostApprove action', ...)
it('throws when gto_reviewer_id is missing for gtoApprove action', ...)
```

**Step 4: `getAvailableActions` tests — update all 7 per new transition map**

**Step 5: Deprecated-stub smoke tests**

```ts
it('disputeTimesheet throws helpful migration error', () => {
  expect(() => disputeTimesheet()).toThrow('Use hostRejectTimesheet');
});
// and similar for approveTimesheet, processTimesheet, lockTimesheetForPayroll, markTimesheetPaid
```

---

### Task 10: Rewrite `timesheet-state-ui.test.tsx`

**Files:**
- Modify: `crm7/src/pages/timesheets/__tests__/timesheet-state-ui.test.tsx` (entire file)

**Step 1: Badge tests — update `states` array to new 7 states**

```ts
const states: TimesheetState[] = [
  'draft',
  'submitted',
  'pending_host_approval',
  'pending_gto_review',
  'approved',
  'exported',
  'archived',
];
```

Update label assertions: `'Payroll Locked'` test → `'Exported to Payroll'`; `'Paid'` test → `'Archived'`.

**Step 2: Role-visibility tests — update to new vocabulary**

```ts
it('apprentice sees draft and submitted (rebound) rows', () => { ... });
it('host_employer sees only pending_host_approval rows', () => { ... });
it('gto_staff sees all rows', () => { ... });
it('payroll role sees approved, exported, archived rows only', () => { ... });
```

**Step 3: Action button tests — update testid assertions**

Replace old testids (`lock-btn`, `mark-paid-btn`, `process-btn`) with new ones (`host-approve-btn`, `host-reject-btn`, `gto-approve-btn`, `gto-bounce-btn`, `export-btn`, `archive-btn`).

---

### Task 11: Run full validation suite

**Step 1: typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm tsc --noEmit 2>&1 | tail -30
```
Expected: clean.

**Step 2: run all timesheet tests**

```bash
pnpm vitest run src/lib/__tests__/timesheetWorkflow.v2.test.ts src/pages/timesheets/__tests__/timesheet-state-ui.test.tsx 2>&1 | tail -30
```
Expected: all pass.

**Step 3: lint**

```bash
pnpm lint --fix 2>&1 | tail -20
```

**Step 4: full crm7 test suite smoke**

```bash
pnpm test 2>&1 | tail -20
```
Expected: no test regressions outside the timesheet-related files.

---

### Task 12: Final commit + PR

**Step 1: Spawn code-reviewer in parallel with validation in Task 11**

**Step 2: Address any reviewer concerns, commit as amendments**

**Step 3: Push + open PR**

```bash
cd /home/braden/Desktop/Dev/bsuite
git add crm7  # submodule pointer bump
git commit -m "chore(bsuite): bump crm7 submodule — WS-4 HF-2 timesheet state vocab alignment"
git push -u origin fix/ws4-timesheet-state-vocab-alignment-20260513

gh pr create --repo GaryOcean428/bsuite --base development \
  --head fix/ws4-timesheet-state-vocab-alignment-20260513 \
  --title "fix(crm7): WS-4 HF-2 — align TS TimesheetState with canonical DB ENUM (issue #863)" \
  --body "<prepared body referencing plan + semantic mapping + column audit + issue #863>"
```

**Step 4: In parallel** — also open crm7 submodule PR against `GaryOcean428/crm7:development` with the TS + migration + test + UI changes.

---

## Post-merge actions

1. Close issue #863 as completed with link to merged PR.
2. Annotate PR #861 Phase 6 Evidence Refresh row for WS-4 noting HF-2 is now resolved.
3. No consumer-submodule bumps needed (no @bsuite/* package changes).
4. Delete feature branch.

---

## Out of scope — intentionally NOT changed

The audit surfaced old-vocab literals in other files that look related but are **not** part of timesheet state. Leave these untouched:

| File | Literal | Actual meaning |
|---|---|---|
| `supabase/functions/mapd-sync/index.ts` | `'processed'` | `mapd_webhook_queue.status` — webhook-handled flag, unrelated to timesheets |
| `src/lib/billingEngine.ts` | `'paid'` | `invoices.status` — invoice payment state |
| `src/lib/fundingWorkflow.ts` | `'paid'` | `claims.status` — claim terminal state |
| `src/lib/statusVariants.ts` | `'paid'` | `expenses.status` — expense reimbursement state |

Do not grep-replace these as a batch operation. Use exact-file targeted edits only.

---

## Risk register

| Risk | Probability | Mitigation |
|---|---|---|
| Production rows carry disputed/processed/paid state values | Very Low | Migration 20260423150000 backfill only ever wrote draft/submitted/approved. Confirmed by reading the backfill SQL. |
| Old fn names still called by un-searched code paths | Low | Deprecation stubs `throw` with explicit error — turns silent runtime drift into loud fail-fast errors. Full repo grep for old fn names (Step pre-commit) catches 100% of call sites. |
| host_approved_by type change breaks existing rows | Very Low | Field was only written by GTO staff post-migration 20260304000010; any row has either NULL or a valid UUID string. `USING host_approved_by::UUID` cast succeeds. |
| RLS policies still reference old state values | Low | Current migration RLS does NOT reference specific state values — only tenant + role helpers. Verified via reading migration §8. |
| UI labels shock existing users | Medium | Labels are descriptive ("Pending Host Approval", "Exported to Payroll"). Coordinate with product for release notes. |
| AI tool regressions outside the approve/reject path | Low | Task 7c changes only state-manipulating tools. `calculate_timesheet_billing` + `get_charge_rates` + `update_charge_rate` are untouched. |
| Grep-replacing `'paid'` catches invoice/claim/expense literals by accident | Medium | Explicit out-of-scope table (above). Only use per-file targeted str_replace, never project-wide find/replace. |
| AI tool rename orphans in-flight `tool_calls` in persisted chat threads | Low | Task 7c renames `approve_timesheet`→`host_approve_timesheet` etc. Before merge: grep `crm7/src/lib/ai/tools/index.ts` registry for tool name references, check any saved chat snapshots (`ai_chat_sessions` table) for `tool_name IN ('approve_timesheet','reject_timesheet','bulk_approve_timesheets')`, and add a one-time backfill if any found. Also confirm tool dispatch in chat UI falls back gracefully on unknown tool names. |

---

## Execution handoff

Plan complete and saved to `docs/plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00W.md`. Two execution options:

1. **Subagent-Driven (this session)** — I dispatch fresh subagents for Tasks 2-10, review between each, fast iteration. Est. 5-8 tool-call rounds.
2. **Parallel Session (separate)** — open new Codebuff session with `executing-plans`, batch execution with checkpoints. Est. one continuous session.

**Which approach?**
