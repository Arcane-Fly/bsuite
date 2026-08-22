# Workforce One OTS Parity — Implementation Plan

> # VERDICT: DELIVERED — recorded 2026-08-22
>
> A seven-phase Workforce One parity plan. Every phase's central artefact is present in
> crm7 today, spot-checked rather than assumed:
>
> - **Phase 1 (schema)** — `pay_periods` is live;
>   `20260716110000_timesheets_attachments_and_pay_period_id.sql` and
>   `20260716140000_fix_pay_periods_admin_write_role_check.sql` are in the migration set
> - **Phase 2 (timesheet entry)** — `src/lib/timesheetValidation.ts` + its test suite
> - **Phase 3–4 (pay periods, missing timesheets)** — both surfaces present in `src/`
> - **Phase 6 (workflow)** — `timesheetWorkflow` present
>
> **Read the file paths as a suggestion, never as a contract.** This plan names specific
> destinations and the logic did not always land at them — `timesheetStateMachine.ts` was
> planned, `timesheetWorkflow.ts` shipped. Grep for the SYMBOL, not the path.
>
> Retained as a record of what was planned and why, not as instruction. Anything still
> wanted from it belongs in a live register, not here.
>
> The original document is unchanged below this banner.


> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Close the 14 timesheet/payroll gaps identified in `docs/plans/20260306-workforce-one-parity-analysis-v1.00W.md` across schema, migration, workflow, and UI layers in CRM7, with strict one-shot data entry, DRY wiring, red-team checkpoints, and cross-cutting quality gates.

---

## Cross-Cutting Principles (apply to EVERY step)

### One-Shot Data Entry (from `DRY-ONE-SHOT-ARCHITECTURE.md`)

- **Timesheets owned by CRM7.** R80.3 reads approved timesheets for charge calculations. No duplicate timesheet forms in any other app.
- **Pay periods owned by CRM7.** R80.3 reads `pay_periods` to scope charge-rate calculations per period.
- **RCTIs owned by CRM7.** Generated from approved timesheets + placements. R80.3 reads for financial reporting.
- **Entity selectors, not free-text fields.** Worker and host employer pickers must use searchable combobox backed by Supabase queries (existing `command.tsx` + Popover pattern). Never a raw UUID `<Input>`.
- **Auto-population.** When worker is selected, auto-fill: placement, host employer, supervisor, award rate, work type default. When host employer is selected, auto-fill: sites, active placements count.

### DRY Wiring Checklist (every new file)

| Check | Enforcement |
|-------|-------------|
| **Barrel exports** | Every new schema → re-exported from `schemas/index.ts`. Every new store → re-exported from `stores/index.ts`. Every new type → added to `types/entities.ts` (single source). |
| **`createEntityStore` pattern** | New stores (payPeriodStore, rctiStore) use the factory. No custom Zustand boilerplate. |
| **Zod convention** | `createXxxSchema` / `updateXxxSchema` / `xxxStatusEnum` naming. BaseEntity fields excluded. |
| **Constants pattern** | New status/action maps follow `timesheetConstants.ts` pattern: `STATUS_VARIANT_MAP`, `STATUS_LABEL_MAP`, `STATUS_TABS`. |
| **Shared components** | Use existing `StatusBadge`, `AutoStatusBadge`, `Card`, `Table`, `Dialog`, `PermissionGate`, `DashboardShell`, `PageHeader`. No ad-hoc status rendering. |
| **RLS** | Every new table gets a tenant-scoped RLS policy in the same migration. |
| **Permissions** | New pages gated by `PermissionGate` with appropriate permission string. |

### Red-Team Protocol (per-phase)

After each phase implementation:

1. **{CODE_REVIEWER}** — Scan for DRY violations: duplicated queries, inline status colors, free-text entity fields, missing barrel exports.
2. **{SECURITY_SPECIALIST}** — Check RLS policies on new tables, ensure no secrets in client code, validate file upload MIME/size restrictions.
3. **{TECHNICAL_ARCHITECT}** — Verify one-shot ownership (CRM7 owns all new entities), no cross-app form duplication, `createEntityStore` used correctly.
4. **{TESTING_SPECIALIST}** — Ensure Vitest coverage for new pure functions (`timesheetValidation`, `rctiGenerator`, `advanceTimesheetStatus` additions).
5. **{UX_ADVOCATE}** — Verify new UI follows D2C Neon Electric theme, Radix UI + Lucide icons, responsive grid, keyboard-accessible.

---

## Phase 0 — Shared Foundation Components

Before touching timesheets, build the reusable primitives that multiple phases need.

### Step 0.1: Build `EntityCombobox` component

**File:** `crm7/src/components/common/EntityCombobox.tsx`

Generic searchable entity picker using existing `command.tsx` + Popover:

- Props: `table`, `displayColumns`, `searchColumn`, `value`, `onChange`, `placeholder`
- Queries Supabase `.from(table).select(displayColumns).ilike(searchColumn, '%{term}%').limit(20)`
- Renders in a Popover with Command list (matching existing shadcn patterns)
- **Reusable across:** timesheet create (person + host employer), leave request (person), RCTI (host employer), pay period (payroll batch)

> **One-shot enforcement:** This component replaces ALL raw UUID `<Input>` fields for entity references. No exceptions.

### Step 0.2: Build `FileUploadZone` component

**File:** `crm7/src/components/common/FileUploadZone.tsx`

Generic drag-and-drop file uploader backed by Supabase Storage:

- Props: `bucket`, `folder`, `accept`, `maxSizeMb`, `value` (attachment[]), `onChange`
- Uploads to `supabase.storage.from(bucket).upload(path, file)`
- Returns `{url, filename, mime_type, size}` objects
- File list with remove button
- **Reusable across:** timesheet attachments, document uploads, compliance evidence

### Step 0.3: Build `WorkTypeSelect` component

**File:** `crm7/src/components/timesheets/WorkTypeSelect.tsx`

Dedicated work-type dropdown (shared between entry grid and any future shift views):

- Uses `timesheetWorkTypeEnum` from schema
- Maps to display labels via `WORK_TYPE_LABEL_MAP` constant
- Default value configurable (falls back to `'ordinary'`)

### 🔴 Red-Team Gate 0

- [ ] `EntityCombobox` works with at least `people` and `host_employers` tables
- [ ] `FileUploadZone` enforces MIME whitelist and max file size at both client and upload level
- [ ] `WorkTypeSelect` renders all enum values with correct labels
- [ ] All three components exported from barrel files
- [ ] `pnpm typecheck` passes

---

## Phase 1 — Schema & Migration (foundation for everything else)

### Step 1.1: Supabase migration — `pay_periods` table + timesheet columns

**File:** `crm7/supabase/migrations/20260306000001_ots_parity_schema.sql`

- Create `pay_periods` table:
  - `id uuid PK DEFAULT gen_random_uuid()`
  - `tenant_id uuid NOT NULL REFERENCES tenants(id)` — RLS-scoped
  - `period_type text NOT NULL CHECK (period_type IN ('weekly', 'fortnightly', 'monthly'))`
  - `start_date date NOT NULL`
  - `end_date date NOT NULL`
  - `status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed'))`
  - `payroll_batch_id uuid` — FK to payroll_runs (if exists)
  - `notes text`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- RLS policy: `USING (tenant_id = get_current_tenant_id())` — read/write for staff+
- Add columns to `timesheets`:
  - `attachments jsonb DEFAULT '[]'`
  - `pay_period_id uuid REFERENCES pay_periods(id)`
  - `payroll_flagged boolean DEFAULT false`
  - `payroll_flagged_at timestamptz`
  - `validation_warnings jsonb DEFAULT '[]'`
- Indexes: `pay_period_id`, `payroll_flagged WHERE payroll_flagged = true`
- Create Supabase Storage bucket `timesheet-attachments` (if not exists) with 10MB limit

### Step 1.2: Update TypeScript types — `entities.ts`

**File:** `crm7/src/types/entities.ts`

- Add `PayPeriod` interface (extends `BaseEntity`)
- Add `TimesheetAttachment` interface: `{url: string, filename: string, mime_type: string, size: number}`
- Add `TimesheetValidationWarning` interface: `{code: string, message: string, severity: 'warning' | 'error', field?: string}`
- Extend `Timesheet` with: `attachments?: TimesheetAttachment[]`, `pay_period_id?: string`, `payroll_flagged?: boolean`, `payroll_flagged_at?: string`, `validation_warnings?: TimesheetValidationWarning[]`

### Step 1.3: Update Zod schemas — `timesheet.ts` + new `payPeriod.ts`

**Files:**

- `crm7/src/schemas/timesheet.ts` — Add `timesheetWorkTypeEnum`, `timesheetAttachmentSchema`, `timesheetValidationWarningSchema`. Add `work_type` to `timesheetEntrySchema`. Add `attachments` to `timesheetSubmitSchema`.
- `crm7/src/schemas/payPeriod.ts` (new) — `payPeriodStatusEnum`, `payPeriodTypeEnum`, `createPayPeriodSchema`, `updatePayPeriodSchema`
- `crm7/src/schemas/index.ts` — Re-export all new schemas (barrel)

### Step 1.4: Add Zustand stores

**Files:**

- `crm7/src/stores/payPeriodStore.ts` — `createEntityStore<PayPeriod>('pay_periods', { defaultSort: { column: 'start_date', direction: 'desc' } })`
- `crm7/src/stores/index.ts` — Add `export { usePayPeriodStore } from './payPeriodStore'`

### Step 1.5: Add constants

**File:** `crm7/src/lib/timesheetConstants.ts`

- Add `WORK_TYPE_LABEL_MAP`, `WORK_TYPE_OPTIONS` for the work type enum
- Add `PAY_PERIOD_STATUS_VARIANT_MAP`, `PAY_PERIOD_STATUS_LABEL_MAP`, `PAY_PERIOD_TYPE_LABEL_MAP`

### 🔴 Red-Team Gate 1

- [ ] Migration is idempotent (`IF NOT EXISTS`, `DO $$ ... $$` blocks)
- [ ] RLS policy uses `get_current_tenant_id()` (matches existing pattern)
- [ ] All new types in `entities.ts`, not scattered across files
- [ ] All new schemas in barrel `schemas/index.ts`
- [ ] New store uses `createEntityStore` factory (no custom boilerplate)
- [ ] `pnpm typecheck` passes

---

## Phase 2 — Timesheet Entry UI Overhaul (P0 items 1–4)

### Step 2.1: Build `TimesheetEntryGrid` component

**File:** `crm7/src/components/timesheets/TimesheetEntryGrid.tsx`

Core new component — a 7-day grid replacing the simple hours-summary card:

- Props: `weekEnding: string`, `entries: TimesheetEntryFormData[]`, `onChange: (entries) => void`
- Each day row: date label (Mon–Sun), shift rows with start/end time, break, `<WorkTypeSelect>`, auto-calculated hours, notes
- "+Shift" button per day — adds another entry for that date
- Auto-sum ordinary/overtime/training hours from entries into totals
- Uses `timesheetEntrySchema` for per-row validation
- Hours auto-calculated: `(end - start - break)` rounded to nearest 0.25

### Step 2.2: Build `CopyHoursToolbar` component

**File:** `crm7/src/components/timesheets/CopyHoursToolbar.tsx`

- "Copy Monday → all weekdays" — clones Mon entry to Tue–Fri
- "Copy last week" — queries `supabase.from('timesheets').select('entries').eq('person_id', pid).lt('week_ending', currentWeekEnding).order('week_ending', {ascending: false}).limit(1)` and pre-fills
- Both operate on parent's `entries` state (lifted state pattern, not internal)

### Step 2.3: Rewrite `create.tsx` using new components

**File:** `crm7/src/pages/timesheets/create.tsx`

- Replace raw UUID inputs with `<EntityCombobox table="people" ...>` and `<EntityCombobox table="host_employers" ...>`
- Replace inline hours-summary with `<TimesheetEntryGrid>`
- Add `<CopyHoursToolbar>` above the grid
- Add `<FileUploadZone bucket="timesheet-attachments" ...>` card
- Auto-populate: when person selected, fetch active placement → set host employer, supervisor, default work type
- On submit: aggregate entries into `ordinary_hours`/`overtime_hours`/`training_hours`/`total_hours` for the parent row, store `entries` as JSONB
- Support `?copyFrom=<timesheetId>` for "copy last week" deep link from worker portal

### 🔴 Red-Team Gate 2

- [ ] **One-shot:** No free-text UUID fields — all entity refs use `EntityCombobox`
- [ ] **Auto-populate:** Selecting worker auto-fills host employer from active placement
- [ ] **DRY:** `TimesheetEntryGrid` uses `timesheetEntrySchema` for validation (not ad-hoc checks)
- [ ] **DRY:** Work type uses shared `WorkTypeSelect`, not inline `<Select>`
- [ ] **DRY:** File upload uses shared `FileUploadZone`, not custom upload code
- [ ] **Theme:** D2C Neon Electric (Radix UI + Lucide icons + TailwindCSS)
- [ ] **Accessibility:** Keyboard navigation in grid, ARIA labels on controls
- [ ] `pnpm typecheck && pnpm lint` passes

---

## Phase 3 — Pay Period Management (P0 item 5)

### Step 3.1: Build pay period list page

**File:** `crm7/src/pages/payroll/pay-periods/index.tsx`

- Uses `usePayPeriodStore()` (from `createEntityStore`)
- Table with `AutoStatusBadge` for status, date formatting, # timesheets (computed from join)
- "Create Pay Period" opens `<PayPeriodDialog>`
- Filters by status + period type
- Wrapped in `<PermissionGate permission="manage_payroll">`

### Step 3.2: Build `PayPeriodDialog` component

**File:** `crm7/src/components/payroll/PayPeriodDialog.tsx`

- Form using `createPayPeriodSchema` for Zod validation
- Period type select → auto-calculates end date from start date
- "Generate Next" button — auto-fills start/end from the last closed period

### Step 3.3: Add pay period filter to timesheet list pages

**Files:**

- `crm7/src/pages/timesheets/index.tsx` — Add `<EntityCombobox table="pay_periods">` filter
- `crm7/src/pages/payroll/timesheets/index.tsx` — Add same filter, adjust `setFilters({ pay_period_id })`

### 🔴 Red-Team Gate 3

- [ ] Pay period store uses `createEntityStore` (DRY)
- [ ] Dialog validates via `createPayPeriodSchema` (Zod convention)
- [ ] Status badges use `AutoStatusBadge` (not inline color logic)
- [ ] Both timesheet list pages share the same filter pattern (no divergence)
- [ ] `pnpm typecheck` passes

---

## Phase 4 — Missing Timesheets View (P0 item 6)

### Step 4.1: Build `MissingTimesheets` component

**File:** `crm7/src/components/timesheets/MissingTimesheets.tsx`

- Props: `payPeriodId?: string` (defaults to current open period)
- Cross-reference query: active placements NOT IN timesheets for the period
- Display as table: person name, host employer, placement start date, "Send Reminder" + "Create Timesheet" buttons
- "Send Reminder" creates a `communications` row using existing template system
- "Create Timesheet" navigates to `/timesheets/create?personId=X&hostEmployerId=Y`

### Step 4.2: Add "Missing" tab to payroll timesheets page

**File:** `crm7/src/lib/timesheetConstants.ts` — Add `{ value: 'missing', label: 'Missing' }` to `TIMESHEET_STATUS_TABS`
**File:** `crm7/src/pages/payroll/timesheets/index.tsx` — When "Missing" tab active, render `<MissingTimesheets>` instead of standard table

### 🔴 Red-Team Gate 4

- [ ] Missing query is efficient (NOT IN subquery, or LEFT JOIN WHERE NULL)
- [ ] "Send Reminder" reuses existing `Communication` entity (not a custom email call)
- [ ] "Create Timesheet" uses query params (one-shot — no re-entering person data)
- [ ] `pnpm typecheck` passes

---

## Phase 5 — Automated Notifications (P0 item 7)

### Step 5.1: Supabase Edge Function — `timesheet-reminders`

**File:** `crm7/supabase/functions/timesheet-reminders/index.ts`

- Invoked via cron (pg_cron) or manual trigger
- Queries missing timesheets for current open pay period
- For each missing person: creates `communications` row (channel=email, template=`timesheet_reminder`)
- Also: timesheets in `submitted` status >24h → supervisor notification
- Uses Deno `serve()` pattern (existing edge function pattern)

### Step 5.2: Communication templates migration

**File:** `crm7/supabase/migrations/20260306000003_timesheet_comm_templates.sql`

Insert templates (idempotent `ON CONFLICT DO NOTHING`):

- `timesheet_reminder` — "Your timesheet for {{week_ending}} has not been submitted"
- `timesheet_approval_pending` — "{{worker_name}}'s timesheet is awaiting your approval"
- `timesheet_approved` — "Your timesheet for {{week_ending}} has been approved"

### 🔴 Red-Team Gate 5

- [ ] Edge function follows existing pattern (see `generate-document/index.ts`)
- [ ] Templates use existing `communication_templates` table (DRY — not a new table)
- [ ] No secrets hardcoded (env vars only)
- [ ] Idempotent migration
- [ ] `pnpm typecheck` passes

---

## Phase 6 — Timesheet Workflow Enhancements (P1 items 8–13)

### Step 6.1: Wire bulk approval UI

**File:** `crm7/src/pages/payroll/timesheets/index.tsx`

The page ALREADY has `selectedIds`, `batchApproveTimesheets()`, and a batch action bar (lines 286-310). Just ensure it's visible and accessible:

- Verify "Select All" checkbox toggles all submitted timesheets
- Verify "Approve Selected" button calls existing `handleBatchApprove()`
- Add "Flag for Payroll" button alongside "Approve Selected" (see 6.4)

### Step 6.2: Timesheet validation engine

**File:** `crm7/src/lib/timesheetValidation.ts` (new)

Pure function: `validateTimesheet(entries: TimesheetEntryFormData[], placement?: Placement): TimesheetValidationWarning[]`

Rules:

- `EXCESSIVE_HOURS` — any day >12h total
- `MISSING_WEEKDAY` — weekday with zero entries
- `OVERLAPPING_SHIFTS` — start/end time overlap on same date
- `SHORT_BREAK` — <30min break for >5h shift (Fair Work Act s.109)
- `RATE_MISMATCH` — work_type doesn't align with placement employment_type

Co-located test file: `crm7/src/lib/timesheetValidation.test.ts`

### Step 6.3: Hook validation into workflow

**File:** `crm7/src/lib/timesheetWorkflow.ts`

- Before `submitTimesheet()`: run `validateTimesheet()`, store warnings on row
- In approval UI: display warnings with severity badges (warning=yellow, error=red)
- Warnings don't block submission (soft validation) but errors block approval

### Step 6.4: "Flag for Payroll" workflow action

**File:** `crm7/src/lib/timesheetWorkflow.ts`

- `flagForPayroll(id: string): Promise<Timesheet>` — sets `payroll_flagged=true, payroll_flagged_at=now()`
- `batchFlagForPayroll(ids: string[]): Promise<number>` — bulk variant
- Only valid on `approved` status timesheets (enforced in function)

### Step 6.5: Supervisor notification on submit

**File:** `crm7/src/lib/timesheetWorkflow.ts`

- After `submitTimesheet()` succeeds: lookup placement supervisor → create notification row
- Uses existing `supabase.from('communications').insert(...)` pattern
- Template: `timesheet_approval_pending`

### Step 6.6: Leave balance inline display

**File:** `crm7/src/pages/leave/request.tsx`

- When person selected via `EntityCombobox`, fetch `supabase.from('leave_balances').select('*').eq('person_id', pid)`
- Display balances as inline cards above the leave request form
- Already has `LeaveBalance` entity and `leaveBalanceSchema` — just needs query + UI

### Step 6.7: Termination timesheet dialog

**File:** `crm7/src/components/timesheets/TerminationTimesheetDialog.tsx` (new)

- Triggered from placement detail page when terminating
- Pre-fills final pay period, pro-rated hours based on termination date
- Creates timesheet flagged as `is_termination: true` (metadata)

### 🔴 Red-Team Gate 6

- [ ] `validateTimesheet()` is a **pure function** with 100% Vitest coverage
- [ ] `flagForPayroll()` follows existing workflow pattern (fetch → validate → update)
- [ ] Supervisor notifications reuse `communications` table (not a custom notification system)
- [ ] Leave balance query is a single Supabase call (DRY — not duplicated per page)
- [ ] Termination dialog uses `EntityCombobox` for person selection (one-shot)
- [ ] All new workflow functions exported from `timesheetWorkflow.ts` (single file, single concern)
- [ ] `pnpm typecheck && pnpm test` passes

---

## Phase 7 — RCTI Generation (P1 item 14)

### Step 7.1: RCTI schema + migration

**File:** `crm7/supabase/migrations/20260306000004_rcti_schema.sql`

- Create `rcti_invoices` table: `id uuid PK, tenant_id uuid FK, host_employer_id uuid FK, pay_period_id uuid FK, invoice_number text UNIQUE, issue_date date, due_date date, subtotal numeric(12,2), gst numeric(12,2), total numeric(12,2), status text CHECK (draft/issued/paid/void), line_items jsonb, pdf_url text, created_at/updated_at`
- RLS: tenant-scoped
- Index on `host_employer_id`, `pay_period_id`, `status`

### Step 7.2: RCTI types + schema + store

**Files:**

- `crm7/src/types/entities.ts` — Add `RctiInvoice`, `RctiLineItem` interfaces
- `crm7/src/schemas/rcti.ts` (new) — `createRctiSchema`, `rctiStatusEnum`, `rctiLineItemSchema`
- `crm7/src/schemas/index.ts` — Re-export
- `crm7/src/stores/rctiStore.ts` — `createEntityStore<RctiInvoice>('rcti_invoices', ...)`
- `crm7/src/stores/index.ts` — Re-export

### Step 7.3: RCTI generation service

**File:** `crm7/src/lib/rctiGenerator.ts` (new)

- `generateRcti(hostEmployerId: string, payPeriodId: string): Promise<RctiInvoice>`
- Queries approved + payroll-flagged timesheets for that host employer + period
- Groups by worker, calculates: `hours × placement.charge_rate` per line
- Sequential invoice numbering: `RCTI-{YYYYMM}-{NNN}`
- Creates `rcti_invoices` row with `line_items` JSONB
- PDF generation via existing Google Docs merge (WIF) — template: "RCTI Template"

Co-located test: `crm7/src/lib/rctiGenerator.test.ts`

### Step 7.4: RCTI list page

**File:** `crm7/src/pages/payroll/rcti/index.tsx` (new)

- Uses `useRctiStore()`
- Table with host employer name, period, total, status badge, PDF download
- "Generate RCTI" button opens dialog: select host employer + pay period → calls `generateRcti()`
- Wrapped in `<PermissionGate permission="manage_billing">`

### 🔴 Red-Team Gate 7

- [ ] `generateRcti()` pure-ish (reads from Supabase, writes once — testable with mocks)
- [ ] Invoice numbering is sequential and collision-safe (DB UNIQUE constraint)
- [ ] PDF generation uses existing WIF pattern (no new auth mechanism)
- [ ] One-shot: host employer selected via `EntityCombobox`, not typed
- [ ] RLS on `rcti_invoices`
- [ ] `pnpm typecheck && pnpm test` passes

---

## Phase 8 — SMS Provider Wiring (P1 item 15)

### Step 8.1: SMS adapter interface

**File:** `crm7/src/lib/sms/smsAdapter.ts` (new)

```typescript
export interface SmsResult { success: boolean; messageId?: string; error?: string }
export interface SmsAdapter { send(to: string, body: string): Promise<SmsResult> }
```

- `TwilioSmsAdapter` — uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` env vars
- `MockSmsAdapter` — for dev/test (logs to console)
- `getSmsAdapter()` factory — returns Twilio in prod, Mock in dev

### Step 8.2: Wire SMS into communication sending

**File:** `crm7/src/lib/communicationSender.ts` (new or extend existing)

- When `Communication.channel === 'sms'`, route through `getSmsAdapter().send()`
- Fallback to email if SMS fails (configurable)
- Log delivery status back to `communications` row

### 🔴 Red-Team Gate 8

- [ ] No API keys in client code (SMS adapter runs server-side / edge function only)
- [ ] Adapter interface is clean (easy to swap Twilio → Message Media)
- [ ] Mock adapter exists for local dev
- [ ] `pnpm typecheck` passes

---

## Dependency Order

```
Phase 0 (shared components) ─┐
                              ├→ Phase 1 (schema) → Phase 2 (entry UI) → Phase 3 (pay periods)
                              │                                          → Phase 4 (missing)
                              │                                          → Phase 5 (notifications)
                              │                                          → Phase 6 (workflow)
                              │
                              └→ Phase 1 (schema) → Phase 7 (RCTI)
                                                    Phase 8 (SMS) — independent
```

## Files Modified (existing)

| File | Changes |
|------|---------|
| `crm7/src/types/entities.ts` | Add `PayPeriod`, `RctiInvoice`, `RctiLineItem`, `TimesheetAttachment`, `TimesheetValidationWarning`. Extend `Timesheet`. |
| `crm7/src/schemas/timesheet.ts` | Add `timesheetWorkTypeEnum`, `work_type` field, `attachments`, warning schema |
| `crm7/src/schemas/index.ts` | Re-export new schemas (payPeriod, rcti, timesheet additions) |
| `crm7/src/lib/timesheetWorkflow.ts` | Add `flagForPayroll()`, `batchFlagForPayroll()`, supervisor notification hook, validation integration |
| `crm7/src/lib/timesheetConstants.ts` | Add `missing` tab, work type labels/maps, pay period status maps |
| `crm7/src/stores/index.ts` | Export `payPeriodStore`, `rctiStore` |
| `crm7/src/pages/timesheets/create.tsx` | Full rewrite: entry grid + EntityCombobox + copy toolbar + attachments |
| `crm7/src/pages/timesheets/index.tsx` | Add pay period filter |
| `crm7/src/pages/payroll/timesheets/index.tsx` | Add missing tab, validation warnings display, flag-for-payroll button |
| `crm7/src/pages/leave/request.tsx` | Add leave balance inline display |

## Files Created (new)

| File | Purpose |
|------|---------|
| `crm7/supabase/migrations/20260306000001_ots_parity_schema.sql` | pay_periods table + timesheet columns + storage bucket |
| `crm7/supabase/migrations/20260306000003_timesheet_comm_templates.sql` | Communication templates |
| `crm7/supabase/migrations/20260306000004_rcti_schema.sql` | RCTI invoices table |
| `crm7/src/components/common/EntityCombobox.tsx` | Reusable entity search picker |
| `crm7/src/components/common/FileUploadZone.tsx` | Reusable drag-and-drop file uploader |
| `crm7/src/components/timesheets/WorkTypeSelect.tsx` | Work type dropdown |
| `crm7/src/components/timesheets/TimesheetEntryGrid.tsx` | 7-day shift grid |
| `crm7/src/components/timesheets/CopyHoursToolbar.tsx` | Copy Monday / Copy last week |
| `crm7/src/components/timesheets/MissingTimesheets.tsx` | Missing timesheet cross-ref view |
| `crm7/src/components/timesheets/TerminationTimesheetDialog.tsx` | Final pay period flow |
| `crm7/src/components/payroll/PayPeriodDialog.tsx` | Create/edit pay period |
| `crm7/src/pages/payroll/pay-periods/index.tsx` | Pay period management page |
| `crm7/src/pages/payroll/rcti/index.tsx` | RCTI list page |
| `crm7/src/schemas/payPeriod.ts` | Pay period Zod schemas |
| `crm7/src/schemas/rcti.ts` | RCTI Zod schemas |
| `crm7/src/stores/payPeriodStore.ts` | Pay period Zustand store |
| `crm7/src/stores/rctiStore.ts` | RCTI Zustand store |
| `crm7/src/lib/timesheetValidation.ts` | Pre-approval validation engine |
| `crm7/src/lib/timesheetValidation.test.ts` | Vitest coverage for validation |
| `crm7/src/lib/rctiGenerator.ts` | RCTI generation service |
| `crm7/src/lib/rctiGenerator.test.ts` | Vitest coverage for RCTI |
| `crm7/src/lib/sms/smsAdapter.ts` | SMS provider adapter |
| `crm7/src/lib/communicationSender.ts` | Communication dispatch (email/SMS routing) |
| `crm7/supabase/functions/timesheet-reminders/index.ts` | Cron-triggered reminder notifications |

## Estimated Effort

| Phase | Effort | Red-Team |
|-------|--------|----------|
| Phase 0 — Shared Components | 3h | 30min |
| Phase 1 — Schema | 2h | 15min |
| Phase 2 — Entry UI | 5h | 30min |
| Phase 3 — Pay Periods | 3h | 15min |
| Phase 4 — Missing View | 2h | 15min |
| Phase 5 — Notifications | 3h | 15min |
| Phase 6 — Workflow Enhancements | 5h | 30min |
| Phase 7 — RCTI | 5h | 30min |
| Phase 8 — SMS | 2h | 15min |
| **Total** | **~30h** | **~3h** |

## Verification (after EVERY phase)

1. `pnpm typecheck` — must pass (zero errors)
2. `pnpm lint` — must pass
3. `pnpm test` — all new tests pass, no regressions
4. Red-team checklist for that phase (see 🔴 gates above)
5. Barrel exports verified: `schemas/index.ts`, `stores/index.ts`, `types/entities.ts`
6. One-shot audit: no free-text entity fields, no duplicated forms, auto-populate works

## DRY-ONE-SHOT Ownership Update

After implementation, update `docs/DRY-ONE-SHOT-ARCHITECTURE.md` entity map:

| Entity | Owner App | Table |
|--------|-----------|-------|
| **Pay Periods** | CRM7 | `pay_periods` |
| **RCTI Invoices** | CRM7 | `rcti_invoices` |
| **Timesheet Attachments** | CRM7 | `timesheets.attachments` (JSONB) |
| **Communication Templates** | CRM7 | `communication_templates` |
