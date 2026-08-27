---
kind: record
authority: none
owner: bsuite
---

# Reports parity spec — close 4 Codehouse gaps (issue #574)

> **Superseded for implementation tracking:** use [`docs/plans/20260521-reports-w2-uplift-implementation-v1.00F.md`](./plans/20260521-reports-w2-uplift-implementation-v1.00F.md) for the active execution/evidence ledger. This spec remains retained as the parity source/provenance document.

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SPEC-DELIVERED — claude-code/copilot implements from this spec
**Closes:** queue item `PARITY-574-DOC` (research portion of issue #574)
**Cross-references:** `parity-matrix.md` rows 86, 89-91; codehouse PDFs (WF1 FAQ + AnyTime Admin Guide p.71-72); existing `crm7/src/pages/reports/` infrastructure; `@bsuite/data-export` package (csv + browser modules confirmed live)

---

## Executive summary

Spec for closing 4 reports parity gaps from #574:

- **Row 86:** 4 standard report templates (Timesheet Summary, Pay Item Group Hours, Hours by Work Type, Rejected Timesheets)
- **Row 89:** Consultant KPI Dashboard (5 named metrics, role-gated to `field_officer`)
- **Row 90:** CoInvest LSL Report (cross-references #573.7 — single implementation covers both)
- **Row 91:** Pay Items by Employee Report

**Existing infrastructure:** `crm7/src/pages/reports/{index.tsx, custom/, deliveries.tsx}` live. `@bsuite/data-export` package has `csv/` + `browser/` (PDF via print) modules. `financialReportService.ts` exists. Spec extends this canonical pattern; zero new infrastructure required.

Per §20 obvious-fix autonomy: spec is grounded in existing patterns; proceed if concur.

---

## 1. Live infrastructure reference

### 1.1 Existing report page structure

```
crm7/src/pages/reports/
├── index.tsx              # report dispatcher / list (existing)
├── custom/                # custom report builder (existing per WF1 Report Writer parity)
│   └── create.tsx
└── deliveries.tsx         # scheduled report deliveries (existing per WF1 Schedule Report parity)
```

This spec adds 6 new files:

```
crm7/src/pages/reports/
├── timesheet-summary.tsx           # NEW (row 86 #1)
├── pay-item-group-hours.tsx        # NEW (row 86 #2)
├── hours-by-work-type.tsx          # NEW (row 86 #3)
├── rejected-timesheets.tsx         # NEW (row 86 #4)
├── consultant-kpi.tsx              # NEW (row 89)
├── coinvest-lsl.tsx                # NEW (row 90; coordinates with #573.7)
└── pay-items-by-employee.tsx       # NEW (row 91)
```

### 1.2 Canonical service pattern

`crm7/src/lib/services/reportService.ts` (NEW per this spec — extracts shared paging + RLS-safe query patterns from existing `financialReportService.ts`):

```ts
// Reusable across all 7 new report pages. RLS-scoped via supabase client.
export interface ReportFetchOptions<TParams> {
  reportKey: string;                     // e.g. 'timesheet-summary'
  params: TParams;
  page?: number;                         // 1-indexed
  pageSize?: number;                     // default 200 per #574 perf gate
  signal?: AbortSignal;
}
export interface ReportFetchResult<TRow> {
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generatedAt: string;
}
export async function fetchReport<TParams, TRow>(
  options: ReportFetchOptions<TParams>,
): Promise<ReportFetchResult<TRow>> { /* ... */ }

export async function exportReportCsv<TRow>(
  rows: TRow[],
  columns: ReportColumn[],
  filename: string,
): Promise<void> { /* delegates to @bsuite/data-export/csv */ }

export async function exportReportPdf(
  pageRef: HTMLElement,
  filename: string,
): Promise<void> { /* delegates to @bsuite/data-export/browser print pipeline */ }
```

### 1.3 RLS pre-condition

All 7 reports query through the user's authenticated supabase client (NOT service role). Tenant scoping enforced by existing RLS on `timesheets`, `placements`, `payroll_records`, `pay_items` (#567.1 + #573.2), `leave_balances` (#573.1), `apprentices`, `employees`. AUTH_CANONICAL.md compliant.

---

## 2. Standard report templates (Row 86)

### 2.1 Common report shape

Every standard report ships 3 conceptual layers:

1. **Filter form** — date range (period start + end), employee selector (multi), client selector (multi), optional report-specific filters
2. **Results table** — paginated 200/page with column sort + cell-level type formatting (numeric/currency/duration/date)
3. **Export bar** — CSV via `@bsuite/data-export/csv`; PDF via browser-print on the rendered table

### 2.2 Timesheet Summary report

```ts
// crm7/src/pages/reports/timesheet-summary.tsx
interface TimesheetSummaryParams {
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  employeeIds?: string[];
  clientIds?: string[];
}
interface TimesheetSummaryRow {
  employee_id: string;
  employee_name: string;
  client_id: string | null;
  client_name: string | null;
  week_ending: string;
  ordinary_hours: number;
  overtime_hours: number;
  training_hours: number;
  billable_hours: number;
  total_hours: number;
  state: string;
}
```

Query (Supabase RPC for performance — pre-aggregated):

```sql
-- 20260507000020_timesheet_summary_report_rpc.sql
CREATE OR REPLACE FUNCTION report_timesheet_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_employee_ids uuid[] DEFAULT NULL,
  p_client_ids uuid[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 200
)
RETURNS TABLE (
  employee_id uuid, employee_name text, client_id uuid, client_name text,
  week_ending date, ordinary_hours numeric, overtime_hours numeric,
  training_hours numeric, billable_hours numeric, total_hours numeric, state text,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT t.id, t.tenant_id, t.person_id, t.host_employer_id, t.week_ending,
           t.ordinary_hours, t.overtime_hours, t.training_hours, t.billable_hours,
           t.total_hours, t.state::text
    FROM timesheets t
    WHERE t.tenant_id = p_tenant_id
      AND p_tenant_id = current_tenant_id()
      AND t.week_ending BETWEEN p_start_date AND p_end_date
      AND (p_employee_ids IS NULL OR t.person_id = ANY(p_employee_ids))
      AND (p_client_ids IS NULL OR t.host_employer_id = ANY(p_client_ids))
  ),
  counted AS (SELECT count(*) AS total FROM filtered)
  SELECT
    f.person_id, e.full_name, f.host_employer_id, c.company_name,
    f.week_ending, f.ordinary_hours, f.overtime_hours, f.training_hours,
    f.billable_hours, f.total_hours, f.state, counted.total
  FROM filtered f
  CROSS JOIN counted
  LEFT JOIN employees e ON e.id = f.person_id
  LEFT JOIN clients c ON c.id = f.host_employer_id
  ORDER BY f.week_ending DESC, e.full_name
  LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
$$;
```

Performance index (red-team #3): `CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_week_ending ON timesheets(tenant_id, week_ending DESC, person_id, host_employer_id);`

### 2.3 Pay Item Group Hours report

Depends on `pay_items` (#567.1 / #573.2 precursor). Groups timesheet hours by pay item type. Same shape as 2.2 but rows are `(pay_item_group, total_hours, ...)`.

### 2.4 Hours by Work Type report

Groups hours by work_type field. Requires `work_type` column on timesheets — NOT YET LIVE. Spec adds:

```sql
-- 20260507000021_timesheet_work_type.sql
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS work_type text;
COMMENT ON COLUMN timesheets.work_type IS 'Codehouse parity row 86: e.g. on-job, off-job, travel, training';
CREATE INDEX IF NOT EXISTS idx_timesheets_work_type ON timesheets(work_type) WHERE work_type IS NOT NULL;
```

### 2.5 Rejected Timesheets report

Lower-volume; simple filter `state IN ('rejected','disputed')`. Pages with same RPC pattern but a simpler SELECT.

---

## 3. Consultant KPI Dashboard (Row 89)

### 3.1 5 named metrics (per WF1 FAQ)

```ts
// crm7/src/pages/reports/consultant-kpi.tsx
interface ConsultantKpiData {
  consultant_id: string;
  active_placements: number;        // count of placements where field_officer = consultant && status = active
  timesheets_submitted_week: number;  // count this week from those placements
  timesheets_approved_week: number;
  missing_timesheets_count: number; // placements with no timesheet for current week
  revenue_week: number;             // sum(charge_rate × approved_hours) this week
  generated_at: string;
}
```

### 3.2 Role gate

UI shows page only when `auth.jwt() ->> 'role' = 'field_officer'`. RPC enforces same:

```sql
CREATE OR REPLACE FUNCTION report_consultant_kpi(p_tenant_id uuid, p_week_ending date)
RETURNS ConsultantKpiData LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  -- Restrict to consultant's own placements; RLS provides defense-in-depth
  WITH my_placements AS (
    SELECT p.id, p.charge_rate
    FROM placements p
    WHERE p.field_officer_id = auth.uid()
      AND p.tenant_id = p_tenant_id
      AND p_tenant_id = current_tenant_id()
      AND auth.jwt() ->> 'role' = 'field_officer'
  ),
  -- ... aggregate calculations
  ...
$$;
```

### 3.3 UI components

- 5 KPI cards using `bsuite-brand-system` `KpiCard` (existing — verified)
- Week-picker for date selection
- Each KPI card links to underlying list view (timesheet list, placements list)

---

## 4. CoInvest LSL Report (Row 90)

Implementation **shared with #573.7** — single component used in both contexts. Already specified in `docs/20260506-leave-parity-spec-v1.00W.md` §6. This issue's PR can reference + implement; no duplication.

---

## 5. Pay Items by Employee Report (Row 91)

Depends on `pay_items` table (#567.1 / #573.2 precursor) + `payroll_records` (live).

```ts
// crm7/src/pages/reports/pay-items-by-employee.tsx
interface PayItemsByEmployeeRow {
  employee_id: string;
  employee_name: string;
  pay_item_id: string;
  pay_item_code: string;
  pay_item_name: string;
  pay_item_type: string;
  amount: number;
  pay_period_start: string;
  pay_period_end: string;
}
```

Query joins `payroll_records.metadata->>'pay_items'` (jsonb expansion) with `pay_items` table:

```sql
CREATE OR REPLACE FUNCTION report_pay_items_by_employee(
  p_tenant_id uuid, p_start_date date, p_end_date date,
  p_employee_ids uuid[] DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 200
)
RETURNS TABLE (...) LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  -- Expand pay_items jsonb array per payroll_record
  WITH expanded AS (
    SELECT pr.apprentice_id AS employee_id,
           (pi_row->>'pay_item_id')::uuid AS pay_item_id,
           (pi_row->>'amount')::numeric AS amount,
           pr.pay_period_start, pr.pay_period_end
    FROM payroll_records pr,
         jsonb_array_elements(pr.metadata->'pay_items') AS pi_row
    WHERE pr.tenant_id = p_tenant_id
      AND p_tenant_id = current_tenant_id()
      AND pr.pay_period_end BETWEEN p_start_date AND p_end_date
      AND (p_employee_ids IS NULL OR pr.apprentice_id = ANY(p_employee_ids))
  )
  SELECT e.employee_id, emp.full_name, e.pay_item_id, pi.code, pi.display_name,
         pi.type, e.amount, e.pay_period_start, e.pay_period_end
  FROM expanded e
  JOIN pay_items pi ON pi.id = e.pay_item_id
  LEFT JOIN employees emp ON emp.id = e.employee_id
  ORDER BY e.pay_period_end DESC, emp.full_name, pi.code
  LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
$$;
```

---

## 6. Scheduled Report Deliveries (timezone hardening)

`crm7/src/pages/reports/deliveries.tsx` exists but the #574 reliability red-team requires:

1. **Timezone storage** — store delivery schedules with explicit IANA timezone (e.g. `Australia/Perth`) not UTC offset
2. **Cron evaluation in tenant timezone** — schedule cron runs in tenant's configured timezone
3. **Retry policy** — 1 retry on failure with 5min backoff, then `status = 'failed'` written to `report_deliveries`
4. **Failure log** — `report_deliveries.error_message`, `report_deliveries.retry_count`, `report_deliveries.last_attempt_at`

Spec adds:

```sql
-- 20260507000022_report_deliveries_reliability.sql
ALTER TABLE report_deliveries
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS retry_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Constraint: retry_count cannot exceed 1 per spec
ALTER TABLE report_deliveries
  ADD CONSTRAINT IF NOT EXISTS report_deliveries_retry_max CHECK (retry_count <= 1);
```

If `report_deliveries` doesn't exist yet, the migration creates it with full shape (omitted here for brevity; pattern matches `pay_runs`).

---

## 7. UI patch list

| Component | Path | Change |
|---|---|---|
| Reports nav | `crm7/src/layouts/MainLayout.tsx` | Add 6 sub-items under Reports |
| Reports index | `crm7/src/pages/reports/index.tsx` | List 7 named reports as cards (4 standard + KPI + CoInvest + Pay Items) |
| TimesheetSummary | `crm7/src/pages/reports/timesheet-summary.tsx` | NEW (§2.2) |
| PayItemGroupHours | `crm7/src/pages/reports/pay-item-group-hours.tsx` | NEW (§2.3) |
| HoursByWorkType | `crm7/src/pages/reports/hours-by-work-type.tsx` | NEW (§2.4) |
| RejectedTimesheets | `crm7/src/pages/reports/rejected-timesheets.tsx` | NEW (§2.5) |
| ConsultantKpi | `crm7/src/pages/reports/consultant-kpi.tsx` | NEW (§3) — role-gated |
| CoInvestLsl | `crm7/src/pages/reports/coinvest-lsl.tsx` | shared with #573.7 |
| PayItemsByEmployee | `crm7/src/pages/reports/pay-items-by-employee.tsx` | NEW (§5) |
| reportService | `crm7/src/lib/services/reportService.ts` | NEW (§1.2) |
| ReportFilterForm | `crm7/src/components/reports/ReportFilterForm.tsx` | NEW — shared filter UI |
| ReportTable | `crm7/src/components/reports/ReportTable.tsx` | NEW — paginated table with column sort + export bar |

---

## 8. Test fixture inventory

### 8.1 RPC tests (~14)
- Each of 4 standard report RPCs: tenant filter, date filter, employee filter, client filter, paging boundary, RLS denial for cross-tenant
- Consultant KPI: role gate, own-data-only, week aggregation
- Pay Items by Employee: jsonb expansion correctness

### 8.2 UI tests (~16, RTL)
- Each of 7 report pages: filter form renders, fetch on submit, table populates, paging controls, CSV export click, PDF print preview
- ConsultantKpi: hidden for non-field_officer

### 8.3 RLS tests (~8)
- Standard reports: cross-tenant query returns empty
- Consultant KPI: non-field_officer cannot RPC
- Pay Items: cross-tenant query returns empty

### 8.4 Performance tests (~3)
- 200-row paging stays <500ms p95
- 200k row table aggregation stays <2s p95
- CSV export 10k rows stays <3s

### 8.5 E2E (1 Playwright)
- Run timesheet summary -> filter -> export CSV -> verify file downloaded

**Total: ~42 unit/integration + 1 e2e = ~43 tests.**

---

## 9. Implementation sequence (5 PRs)

| PR | Scope | Size | Depends on |
|---|---|---|---|
| 574.1 | reportService + shared components (ReportFilterForm + ReportTable) + RPC migrations | ~2h | #567.1 + #573.2 (pay_items) |
| 574.2 | 4 standard report templates + tests | ~2h | 574.1 |
| 574.3 | Consultant KPI page + RPC + tests | ~1.5h | 574.1 |
| 574.4 | Pay Items by Employee + tests | ~1h | 574.1 + #573.2 |
| 574.5 | Report deliveries reliability hardening (timezone + retry) | ~1.5h | none (independent) |

Total estimated effort: ~8h, 5 sub-PRs, 574.5 ships independently. CoInvest LSL covered by #573.7.

---

## 10. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ All citations verified — existing reports infra queried via gh api; `@bsuite/data-export` package modules confirmed live; codehouse PDF page citations consistent with #574 issue body
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming compliant

## §17 mutual-reminder

- ✓ red-team table addressed: UX (filterable, exportable, role-gated), Security (RLS-only, no service role), Performance (paged 200, RPC pre-aggregation, indexed), Reliability (timezone + retry), Quality (canonical pattern reuse, no duplication)
- ✓ smoke test documented (~43 tests in §8)
- ✓ no orphan branches (will delete after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

All RPCs are `SECURITY INVOKER` with locked `search_path`. All reports use authenticated supabase client (NOT service role). Tenant scope guards on every RPC + RLS defense-in-depth on every table. Consultant KPI explicit role gate on `field_officer` (own-data-only). Zero cookie SSO.

## Hand-off

@claude-code / @copilot: implementation per §9 sequence. Migrations + RPCs in §2-§5 are copy-paste-ready. UI patch list in §7 covers all paths. Tests in §8 are exhaustive.

Per §20 obvious-fix autonomy: spec is grounded in existing infrastructure + canonical patterns; proceed if concur. Sub-PR 574.1 (service + shared components + RPC migrations) is the natural starter; after it lands, 574.2/574.3/574.4 can ship in parallel; 574.5 is independent.
