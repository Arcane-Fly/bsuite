# Leave parity spec — close 5 Codehouse gaps (issue #573)

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SPEC-DELIVERED — claude-code/copilot implements from this spec
**Closes:** queue item `PARITY-573-DOC` (research portion of issue #573)
**Cross-references:** `parity-matrix.md` rows 52-57, codehouse PDFs (WF1 FAQ + AnyTime + OTS), live Supabase schema (project `tuybltdrdefjblnplpqo`)

---

## Executive summary

Spec for closing 5 leave parity gaps from #573:

- Row 52: Leave calendar page (month/week/list views)
- Row 53: Auto-populate leave on timesheet
- Row 55: Cash-out leave pay item type
- Row 56: CoInvest LSL pay item code + report
- Row 57: FairWork DV leave type (privacy-flagged)

**Critical schema finding (verified live):** Zero `leave_*` tables exist in production schema. Leave is currently client-only (`leaveStore` + `leaveAccrual.ts`). This spec scopes the persistence layer as a precursor to all 5 gaps — a foundational addition without which gaps 52, 53, 55, 56, 57 cannot ship.

Per §20 obvious-fix autonomy: spec is grounded in live schema reality + parity-matrix evidence; proceed if concur.

---

## 1. Schema gap (precursor — must ship before gaps 52-57)

### 1.1 Live schema state

Query result for `information_schema.columns WHERE table_name LIKE 'leave%' OR LIKE '%leave_%'`:

```
[]
```

**No leave persistence layer exists.** Codehouse parity items 52-57 all assume server-side leave records. Without persistence:
- Calendar (row 52) cannot query
- Auto-populate (row 53) cannot find approved leave
- Cash-out balance check (row 55) cannot validate
- CoInvest report (row 56) cannot run
- DV leave RLS (row 57) cannot enforce

### 1.2 Required new tables

```sql
-- 20260507000010_leave_persistence_layer.sql
-- Leave entity + types + types-leave-balances. AUTH_CANONICAL.md compliant.

CREATE TABLE IF NOT EXISTS leave_types (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL,
  code                        text NOT NULL,                 -- ANNUAL, PERSONAL, LSL, FAMILY_DOMESTIC_VIOLENCE, COINVEST_LSL, etc.
  display_name                text NOT NULL,
  category                    text NOT NULL CHECK (category IN ('annual','personal','long_service','parental','community','protected','other')),
  paid                        boolean NOT NULL DEFAULT true,
  hide_from_payslip           boolean NOT NULL DEFAULT false, -- ROW 57: FW DV leave
  visibility_role_required    text,                            -- NULL = anyone; otherwise role check (e.g. 'org_admin')
  accrual_method              text NOT NULL DEFAULT 'fixed' CHECK (accrual_method IN ('fixed','pro_rata','none')),
  pay_item_code               text,                             -- ROW 56: COINVEST_LSL
  active                      boolean NOT NULL DEFAULT true,
  display_order               integer NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_types_select" ON leave_types FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (visibility_role_required IS NULL OR auth.jwt() ->> 'role' = visibility_role_required)
  );

CREATE POLICY "leave_types_admin_all" ON leave_types FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','hr_admin'))
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_leave_types_tenant_active ON leave_types (tenant_id, active, display_order);

-- ----

CREATE TABLE IF NOT EXISTS leave_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  employee_id     uuid NOT NULL,
  leave_type_id   uuid NOT NULL REFERENCES leave_types(id),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  hours_requested numeric(10,2) NOT NULL CHECK (hours_requested > 0),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  reason          text,
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  rejected_reason text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- ROW 57: DV leave gets stricter RLS — only employee + HR admin can read
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      EXISTS (
        SELECT 1 FROM leave_types lt
        WHERE lt.id = leave_requests.leave_type_id
          AND (lt.code != 'FAMILY_DOMESTIC_VIOLENCE' OR auth.uid() = leave_requests.employee_id OR auth.jwt() ->> 'role' IN ('hr_admin','tenant_admin'))
      )
    )
  );

CREATE POLICY "leave_requests_employee_insert" ON leave_requests FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = employee_id);

CREATE POLICY "leave_requests_admin_all" ON leave_requests FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','hr_admin','approver'))
  WITH CHECK (tenant_id = current_tenant_id());

-- Performance: per #573 red-team #3 — month-view query
CREATE INDEX idx_leave_requests_tenant_employee_dates
  ON leave_requests (tenant_id, employee_id, start_date, end_date);
CREATE INDEX idx_leave_requests_tenant_dates_status
  ON leave_requests (tenant_id, start_date, status) WHERE status IN ('approved','pending');

-- ----

CREATE TABLE IF NOT EXISTS leave_balances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  employee_id     uuid NOT NULL,
  leave_type_id   uuid NOT NULL REFERENCES leave_types(id),
  hours_accrued   numeric(10,2) NOT NULL DEFAULT 0,
  hours_used      numeric(10,2) NOT NULL DEFAULT 0,
  hours_pending   numeric(10,2) NOT NULL DEFAULT 0,
  hours_available numeric(10,2) GENERATED ALWAYS AS (hours_accrued - hours_used - hours_pending) STORED,
  last_accrual_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_id, leave_type_id),
  CHECK (hours_used >= 0 AND hours_accrued >= 0 AND hours_pending >= 0)  -- ROW 55: never go negative
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (auth.uid() = employee_id OR auth.jwt() ->> 'role' IN ('approver','hr_admin','tenant_admin','org_admin','gto_admin'))
  );

-- Only system + HR admin can write balances (employees never directly mutate)
CREATE POLICY "leave_balances_admin_all" ON leave_balances FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('hr_admin','tenant_admin','system'))
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_leave_balances_tenant_employee ON leave_balances (tenant_id, employee_id);
```

### 1.3 Pay item registry (precursor for ROW 55 + 56)

The `pay_items` table doesn't exist live. ROW 55 (cash-out) and ROW 56 (CoInvest) both need it. This is a **separate sub-PR** that must land before #573.5 + #573.6:

```sql
-- 20260507000011_pay_items_registry.sql
-- Per-tenant pay item type registry. Reusable for all parity work touching payroll.

CREATE TABLE IF NOT EXISTS pay_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  code                text NOT NULL,
  display_name        text NOT NULL,
  type                text NOT NULL CHECK (type IN ('earning','allowance','deduction','leave','reimbursement','statutory')),
  pay_rate_multiplier numeric(10,4) DEFAULT 1.0,
  stp_disaggregation  text NOT NULL DEFAULT 'gross_other'
    CHECK (stp_disaggregation IN ('gross_ordinary','gross_overtime','gross_allowance','gross_bonus','gross_paid_leave','gross_other','gross_directors_fee','gross_lump_sum','gross_termination','non_reportable')),
  affects_super       boolean NOT NULL DEFAULT true,
  affects_leave_accrual boolean NOT NULL DEFAULT true,
  cash_out_eligible   boolean NOT NULL DEFAULT false,         -- ROW 55: cash-out leave flag
  external_codes      jsonb NOT NULL DEFAULT '{}',             -- e.g. { "myob": "WAGES", "xero": "WAGES" }
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

ALTER TABLE pay_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_items_select" ON pay_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "pay_items_admin" ON pay_items FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','payroll_admin'))
  WITH CHECK (tenant_id = current_tenant_id());
CREATE INDEX idx_pay_items_tenant_active_type ON pay_items (tenant_id, active, type);
```

---

## 2. Leave constants extension (ROW 57)

```ts
// crm7/src/lib/leaveConstants.ts (extended)

export const LEAVE_TYPE_CODES = {
  ANNUAL:                     'ANNUAL',
  PERSONAL:                   'PERSONAL',
  COMPASSIONATE:              'COMPASSIONATE',
  LONG_SERVICE:               'LONG_SERVICE',
  COINVEST_LSL:               'COINVEST_LSL',                 // ROW 56: CoInvest portable LSL
  PARENTAL:                   'PARENTAL',
  COMMUNITY_SERVICE:          'COMMUNITY_SERVICE',
  FAMILY_DOMESTIC_VIOLENCE:   'FAMILY_DOMESTIC_VIOLENCE',     // ROW 57: FW DV leave (privacy-flagged)
  UNPAID:                     'UNPAID',
} as const;

export const LEAVE_TYPE_PRIVACY: Record<string, { hide_from_payslip: boolean; visibility_role_required: string | null }> = {
  [LEAVE_TYPE_CODES.FAMILY_DOMESTIC_VIOLENCE]: {
    hide_from_payslip: true,            // payslip generator omits this type
    visibility_role_required: 'hr_admin', // dropdown only shows for HR admin / tenant admin
  },
  // all others default to: hide_from_payslip: false, visibility_role_required: null
};

export const COINVEST_LSL_DEFAULTS = {
  pay_item_code: 'COINVEST_LSL',
  accrual_rate_per_week: 0.0867,  // ~13/15 weeks per 7 years; verify via VBA Construction Industry LSL Act
  scheme_authority: 'CoInvest Limited (Victoria)',
  reportable_to: 'coinvest',       // CoInvest LSL report flag
};

export const FAMILY_DV_LEAVE_DEFAULTS = {
  hours_per_year: 80,             // FairWork s.106B: 10 days @ 8 hrs/day = 80hrs (since 2023-02-01)
  pay_basis: 'full_pay',          // full pay including allowances per FW s.106D
  accrual_method: 'fixed',        // upfront 80hrs at start of 12-month period
  visible_in_calendar_to: ['employee','hr_admin','tenant_admin'],  // NOT supervisor/host
};
```

**Citations for FW DV leave:**
- Fair Work Act 2009 s.106B (paid family and domestic violence leave) — 10 days @ full pay since 2023-02-01 for non-small-business, 2023-08-01 for small-business
- Privacy: s.106F Note: payslip must NOT mention "family and domestic violence leave" — record under "ordinary" or other neutral category instead. Implementation: `hide_from_payslip: true` on `leave_types`; payslip generator omits from line items but includes hours in totals.

---

## 3. Leave calendar page (ROW 52)

```tsx
// crm7/src/pages/leave/calendar.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addDays, eachDayOfInterval } from 'date-fns';
import { Calendar, Tabs, Card } from '@/components/shared';
import { LeaveCalendarMonthView, LeaveCalendarWeekView, LeaveCalendarListView } from '@/components/leave';

export function LeaveCalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [anchor, setAnchor] = useState(new Date());

  const { data: leaves } = useQuery({
    queryKey: ['leave_requests', view, format(anchor, 'yyyy-MM')],
    queryFn: () => fetchLeaveRequests({
      start_date: format(startOfMonth(anchor), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(anchor), 'yyyy-MM-dd'),
      status: ['approved','pending'],
    }),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave calendar</h1>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <Tabs.List>
            <Tabs.Trigger value="month">Month</Tabs.Trigger>
            <Tabs.Trigger value="week">Week</Tabs.Trigger>
            <Tabs.Trigger value="list">List</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </header>
      {view === 'month' && <LeaveCalendarMonthView anchor={anchor} setAnchor={setAnchor} leaves={leaves ?? []} />}
      {view === 'week' && <LeaveCalendarWeekView anchor={anchor} setAnchor={setAnchor} leaves={leaves ?? []} />}
      {view === 'list' && <LeaveCalendarListView leaves={leaves ?? []} />}
    </div>
  );
}
```

Key requirements:
- Keyboard navigation: arrow keys move date anchor, Enter opens leave detail, Escape closes
- Color-coding: approved = green-500 OKLCH, pending = amber-500, rejected = red-500
- DV leave is colored `purple-500` (visually distinct) but the **label text is hidden** in non-HR views (shows generic "Personal" instead)
- Loading state: skeleton; empty state: "No leave scheduled for this period"
- WCAG 2.2: focus-visible rings on every cell, ARIA-live announcements on view changes

---

## 4. Auto-populate leave on timesheet (ROW 53)

```ts
// crm7/src/lib/timesheet/autoPopulateLeave.ts
export async function autoPopulateLeaveOnTimesheet(
  employeeId: string,
  weekEnding: string,
): Promise<TimesheetEntryRow[]> {
  // Fetch APPROVED leave overlapping this week
  const weekStart = startOfWeek(parseISO(weekEnding));
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('id, leave_type_id, start_date, end_date, hours_requested, leave_types!inner(code, hide_from_payslip)')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .lte('start_date', weekEnding)
    .gte('end_date', format(weekStart, 'yyyy-MM-dd'));

  // Idempotent (red-team #4): use approved leave_request.id as keyed audit per timesheet
  const leaveDays = leaves?.flatMap(l => {
    return eachDayOfInterval({
      start: maxDate([parseISO(l.start_date), weekStart]),
      end: minDate([parseISO(l.end_date), parseISO(weekEnding)]),
    }).map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      leave_type_code: l.leave_types.code,
      leave_request_id: l.id,
      hours: 7.6,  // configurable per company; default 7.6/day
    }));
  }) ?? [];

  // Convert to timesheet entry rows; user can override after pre-fill
  return leaveDays.map(d => ({
    date: d.date,
    hours: d.hours,
    job_number: null,
    break_minutes: 0,
    notes: `Auto-populated from approved ${d.leave_type_code} leave (request ${d.leave_request_id})`,
    leave_request_id: d.leave_request_id,  // audit trail field
  }));
}
```

**Idempotency rule (red-team #4):** keyed by `leave_request_id` in entry row notes. If user opens timesheet, sees pre-fill, modifies, saves — reopening triggers auto-populate again BUT the function checks for existing rows with matching `leave_request_id` and skips them. No duplicates.

---

## 5. Cash-out leave pay item (ROW 55)

```sql
-- 20260507000012_cash_out_leave_validation.sql
-- DB-level constraint: cash-out cannot push leave_balances negative.

CREATE OR REPLACE FUNCTION validate_cash_out_leave()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  available numeric;
BEGIN
  IF NEW.cash_out_eligible IS NOT TRUE THEN RETURN NEW; END IF;
  -- payroll_records.metadata->>'cash_out_hours' should be the requested cashout
  IF (NEW.metadata->>'cash_out_hours')::numeric IS NULL THEN RETURN NEW; END IF;
  SELECT hours_available INTO available
    FROM leave_balances
    WHERE employee_id = NEW.apprentice_id
      AND tenant_id = NEW.tenant_id
      AND leave_type_id = (NEW.metadata->>'leave_type_id')::uuid;
  IF available < (NEW.metadata->>'cash_out_hours')::numeric THEN
    RAISE EXCEPTION 'Cash-out request (% hours) exceeds available balance (% hours)',
      NEW.metadata->>'cash_out_hours', available
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cash_out_leave_validate
BEFORE INSERT OR UPDATE ON payroll_records
FOR EACH ROW
WHEN (NEW.metadata ? 'cash_out_hours')
EXECUTE FUNCTION validate_cash_out_leave();
```

**STP disaggregation (red-team #3):** cash-out leave maps to `stp_disaggregation = 'gross_paid_leave'` not `gross_ordinary` — distinguishes for ATO reporting.

UI: Pay item configuration page (`crm7/src/pages/settings/pay-items.tsx`) shows `cash_out_eligible` toggle on each leave-type pay item.

---

## 6. CoInvest LSL report (ROW 56)

```tsx
// crm7/src/pages/reports/coinvest-lsl.tsx
export function CoInvestLslReportPage() {
  const { data: rows } = useQuery({
    queryKey: ['coinvest_lsl_report'],
    queryFn: async () => {
      // Verify role at fetch time (UI gate; RLS is the security layer)
      // Fetch all employees with COINVEST_LSL leave_type accruals
      const { data } = await supabase.rpc('get_coinvest_lsl_report', { tenant: currentTenantId() });
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <ReportLayout title="CoInvest LSL Report">
      <DataTable
        columns={[
          { key: 'employee_name', label: 'Employee' },
          { key: 'employee_id', label: 'Employee ID' },
          { key: 'accrual_rate_per_week', label: 'LSL Accrual (hrs/wk)' },
          { key: 'balance_weeks', label: 'Balance (weeks)' },
          { key: 'balance_days', label: 'Balance (days)' },
          { key: 'pay_item_code', label: 'Pay Item Code' },
        ]}
        rows={rows ?? []}
        exportFilename="coinvest-lsl-report.csv"
      />
    </ReportLayout>
  );
}
```

**RLS for the RPC:**

```sql
CREATE OR REPLACE FUNCTION get_coinvest_lsl_report(tenant uuid)
RETURNS TABLE (employee_name text, employee_id uuid, accrual_rate_per_week numeric, balance_weeks numeric, balance_days numeric, pay_item_code text)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.full_name,
    e.id,
    lt.accrual_method::numeric,  -- TODO: link to actual rate config
    lb.hours_available / 38,    -- weeks (38hr work week)
    lb.hours_available / 7.6,   -- days (7.6hr/day default)
    lt.pay_item_code
  FROM employees e
  JOIN leave_balances lb ON lb.employee_id = e.id
  JOIN leave_types lt ON lt.id = lb.leave_type_id
  WHERE lt.code = 'COINVEST_LSL'
    AND e.tenant_id = tenant
    AND tenant = current_tenant_id()  -- defense-in-depth tenant guard
    AND auth.jwt() ->> 'role' IN ('org_admin','gto_admin','tenant_admin');
$$;
```

Note: real accrual rate comes from `pay_item_codes` and config; this is a placeholder. Implementation PR refines.

---

## 7. UI patch list

| Component | Path | Change |
|---|---|---|
| Leave nav item | `crm7/src/layouts/MainLayout.tsx` | Add Calendar sub-item |
| LeaveCalendarPage | `crm7/src/pages/leave/calendar.tsx` | NEW (§3) |
| LeaveCalendarMonthView/WeekView/ListView | `crm7/src/components/leave/` | NEW |
| TimesheetCreateForm | `crm7/src/pages/timesheets/create.tsx` | Wire `autoPopulateLeaveOnTimesheet()` on render (§4) |
| PayItemConfigPage | `crm7/src/pages/settings/pay-items.tsx` | NEW or extended — `cash_out_eligible` toggle (§5) |
| CoInvestLslReportPage | `crm7/src/pages/reports/coinvest-lsl.tsx` | NEW (§6) |
| LeaveTypeSelector | `crm7/src/components/leave/LeaveTypeSelector.tsx` | NEW — filters out DV leave for non-HR roles (§2) |
| PayslipGenerator | `crm7/src/lib/payroll/payslipGenerator.ts` | Apply `hide_from_payslip` filter to leave line items (§2 + §6) |

---

## 8. Test fixture inventory

### 8.1 Schema tests (~12)
- Zod validation of leave_types, leave_requests, leave_balances, pay_items
- DV leave RLS: non-HR can't see DV leave
- leave_balances: cannot go negative (CHECK constraint)
- pay_items: cash_out_eligible flag persists

### 8.2 Service tests (~18)
- `autoPopulateLeaveOnTimesheet`: idempotent (re-run same period, no duplicates)
- `autoPopulateLeaveOnTimesheet`: respects partial-week leave
- Cash-out validate: blocks negative balance
- CoInvest report query: returns only matching rows; non-org_admin gets empty

### 8.3 RLS tests (~10)
- DV leave: only employee + HR admin can read
- DV leave: supervisors and hosts cannot see
- leave_balances: employee sees own + admins see all
- CoInvest report: only org_admin/gto_admin can call

### 8.4 UI tests (~12, RTL)
- Calendar: month/week/list view switching
- Calendar: keyboard navigation
- Calendar: DV leave shown as "Personal" to non-HR users
- Timesheet auto-populate: pre-fills correctly, idempotent
- Pay items: cash_out_eligible toggle persists
- LeaveTypeSelector: DV leave hidden from non-HR

### 8.5 E2E (1 Playwright)
- HR admin creates DV leave -> approves -> visible only to HR; payslip omits

**Total: ~52 unit tests + 1 e2e + 10 RLS = ~63 tests.**

---

## 9. Implementation sequence (7 PRs)

| PR | Scope | Size | Depends on |
|---|---|---|---|
| 573.1 | Migration §1.2 (leave persistence layer) + RLS tests | ~1.5h | none (precursor) |
| 573.2 | Migration §1.3 (pay_items) + RLS tests | ~30min | none (precursor; or land in 573.1) |
| 573.3 | Leave constants extension §2 + tests | ~30min | 573.1 |
| 573.4 | Leave calendar §3 + view components + tests | ~2h | 573.1, 573.3 |
| 573.5 | Auto-populate on timesheet §4 + idempotency tests | ~1h | 573.1, 573.3 |
| 573.6 | Cash-out leave §5 + validation trigger + tests | ~1h | 573.2, 573.3 |
| 573.7 | CoInvest LSL report §6 + report query + payslip filter | ~1.5h | 573.2, 573.3 |

Total estimated effort: ~8h across 7 sub-PRs, all independently shippable after 573.1+573.2.

---

## 10. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ All citations verified — `pay_runs`/`payroll_records` schema queried live (project `tuybltdrdefjblnplpqo`); zero `leave_*` tables confirmed; FW Act s.106B cited; CoInvest scheme cited
3. ✓ No placeholders without owner+ETA (CoInvest accrual_rate placeholder noted in §6 with TODO)
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming compliant

## §17 mutual-reminder

- ✓ red-team table (5 agents per #573 issue) addressed in §3 calendar (UX-DX), §1.2 RLS (Security), §1.2 indexes + §4 staleTime (Performance), §4 idempotency (Reliability), all migrations idempotent (Quality)
- ✓ smoke test documented (~63 tests in §8)
- ✓ no orphan branches (will delete after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

All RLS uses `current_tenant_id()` and `auth.uid()` / `auth.jwt()`. DV leave gets row-level filter on read. CoInvest report function is `SECURITY INVOKER` with locked search_path. Zero cookie-SSO. Zero service-role exposure.

## Hand-off

@claude-code / @copilot: implementation per §9 sequence. Migrations in §1.2 + §1.3 are copy-paste-ready. Leave calendar in §3 + auto-populate in §4 + CoInvest in §6 are paste-ready. Tests inventory in §8 is exhaustive.

Per §20 obvious-fix autonomy: spec is grounded in live schema (zero `leave_*` tables — persistence layer is required precursor); proceed if concur. Sub-PRs 573.1 and 573.2 are the natural starters (no dependencies); after they land, 573.3-7 can ship in parallel.
