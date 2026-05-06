# Pay periods parity spec — close 4 Codehouse gaps (issue #575)

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SPEC-DELIVERED — claude-code/copilot implements from this spec
**Closes:** queue item `PARITY-575-DOC` (research portion of issue #575)
**Cross-references:** `parity-matrix.md` rows 43-44, 46-47; codehouse PDFs (AnyTime Admin Guide p.16/35-38, OTS p.10-11/22-23); existing `crm7/src/stores/payPeriodStore.ts` + `crm7/src/pages/payroll/{pay-periods, missing-timesheets}/`; live `communications` + `communication_templates` tables (verified)

---

## Executive summary

Spec for closing 4 pay-periods parity gaps from #575:

- **Row 43:** Pay period streams (multi-stream definitions per cycle)
- **Row 44:** Close/lock pay period + status enforcement
- **Row 46:** Send Reminder bulk action on missing-timesheets list
- **Row 47:** CSV export on missing-timesheets list

**Critical schema findings (verified live via Supabase MCP, project `tuybltdrdefjblnplpqo`):**
- Zero `pay_periods` table exists (despite `payPeriodStore.ts` referencing it client-side)
- `communications` + `communication_templates` tables EXIST and are comprehensive — no new comms tables needed; spec wires existing infra to missing-timesheets page

This means rows 43-44 require schema bootstrapping; rows 46-47 are pure UI wiring against existing infrastructure.

Per §20 obvious-fix autonomy: spec is grounded in live schema gaps + existing comms infra; proceed if concur.

---

## 1. DB migrations (precursor for rows 43-44)

### 1.1 `pay_periods` table (NEW — currently client-only)

```sql
-- 20260507000030_pay_periods_table.sql
-- Creates pay_periods table per #575 row 44 + foundational for stream linking.
-- AUTH_CANONICAL.md compliant: tenant-scoped RLS.

CREATE TABLE IF NOT EXISTS pay_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  stream_id       uuid,                                   -- ROW 43: nullable link to pay_period_streams
  period_start    date NOT NULL,
  period_end      date NOT NULL CHECK (period_end > period_start),
  payment_date    date,
  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closing','closed','locked')),  -- ROW 44
  closed_by       uuid REFERENCES auth.users(id),
  closed_at       timestamptz,
  close_reason    text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_periods_select" ON pay_periods FOR SELECT
  USING (tenant_id = current_tenant_id());

-- ROW 44: Closing requires gto_admin / org_admin role
CREATE POLICY "pay_periods_admin_write" ON pay_periods FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND auth.jwt() ->> 'role' IN ('gto_admin','org_admin','tenant_admin','payroll_admin')
  )
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_pay_periods_tenant_period ON pay_periods (tenant_id, period_start DESC, period_end DESC);
CREATE INDEX idx_pay_periods_tenant_status ON pay_periods (tenant_id, status) WHERE status IN ('open','closing');
CREATE INDEX idx_pay_periods_stream ON pay_periods (stream_id) WHERE stream_id IS NOT NULL;

COMMENT ON TABLE pay_periods IS
  'Pay period record. Status transitions: open -> closing -> closed -> locked. AUTH_CANONICAL.md compliant.';
```

### 1.2 `pay_period_streams` table (NEW — ROW 43)

```sql
-- 20260507000031_pay_period_streams_table.sql

CREATE TABLE IF NOT EXISTS pay_period_streams (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  org_id              uuid,                                       -- nullable: tenant-wide if NULL
  name                text NOT NULL,
  description         text,
  week_ending_day     text NOT NULL CHECK (week_ending_day IN ('mon','tue','wed','thu','fri','sat','sun')),
  cycle_length_weeks  smallint NOT NULL DEFAULT 1 CHECK (cycle_length_weeks IN (1,2,4)),  -- weekly/fortnightly/4-weekly
  active              boolean NOT NULL DEFAULT true,
  display_order       integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

ALTER TABLE pay_period_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_period_streams_select" ON pay_period_streams FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "pay_period_streams_admin_write" ON pay_period_streams FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND auth.jwt() ->> 'role' IN ('gto_admin','org_admin','tenant_admin','payroll_admin')
  )
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_pay_period_streams_tenant_org_active
  ON pay_period_streams (tenant_id, org_id, active, display_order);

-- After creation, add FK from pay_periods.stream_id (deferred to allow ordering)
ALTER TABLE pay_periods
  ADD CONSTRAINT fk_pay_periods_stream
  FOREIGN KEY (stream_id) REFERENCES pay_period_streams(id) ON DELETE SET NULL;
```

### 1.3 Closed-period timesheet enforcement (ROW 44)

```sql
-- 20260507000032_pay_periods_close_enforce_trigger.sql
-- Block timesheet INSERT/UPDATE if its week_ending falls inside a closed pay_period.

CREATE OR REPLACE FUNCTION enforce_closed_pay_period_for_timesheet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  closed_period_id uuid;
BEGIN
  SELECT pp.id INTO closed_period_id
    FROM pay_periods pp
   WHERE pp.tenant_id = NEW.tenant_id
     AND pp.status IN ('closed','locked')
     AND NEW.week_ending BETWEEN pp.period_start AND pp.period_end
   LIMIT 1;
  IF closed_period_id IS NOT NULL THEN
    -- Allow approved -> approved updates (no-op state) but block any change to entries/hours
    IF TG_OP = 'UPDATE'
       AND OLD.entries IS NOT DISTINCT FROM NEW.entries
       AND OLD.state IS NOT DISTINCT FROM NEW.state THEN
      RETURN NEW;  -- system-level no-op metadata update is fine
    END IF;
    RAISE EXCEPTION 'Pay period % is closed/locked; timesheet for week ending % cannot be modified', closed_period_id, NEW.week_ending
      USING ERRCODE = 'check_violation', HINT = 'Reopen the pay period or contact your payroll admin.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_closed_pay_period
BEFORE INSERT OR UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION enforce_closed_pay_period_for_timesheet();
```

---

## 2. Pay period close flow (ROW 44)

### 2.1 Service-layer transition

```ts
// crm7/src/lib/services/payPeriodService.ts
export async function closePayPeriod(
  payPeriodId: string,
  reason?: string,
): Promise<{ closedAt: string; openTimesheetCount: number }> {
  // 1. Pre-flight: count open timesheets in this period (for confirmation modal)
  const openCount = await countOpenTimesheetsInPeriod(payPeriodId);

  // 2. Atomic update: set status=closed; record closed_by + closed_at + close_reason
  const { data, error } = await supabase
    .from('pay_periods')
    .update({
      status: 'closed',
      closed_by: (await supabase.auth.getUser()).data.user?.id,
      closed_at: new Date().toISOString(),
      close_reason: reason ?? null,
    })
    .eq('id', payPeriodId)
    .eq('status', 'open')  // optimistic concurrency: only close if currently open
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {  // no row matched (already closed by someone else)
      throw new PayPeriodAlreadyClosedError(`Pay period ${payPeriodId} already closed`);
    }
    throw error;
  }

  // 3. Log audit event (delegate to existing audit infrastructure if present, else write to analytics_events)
  await logPayPeriodClosed(payPeriodId, openCount, reason);

  return { closedAt: data.closed_at, openTimesheetCount: openCount };
}

async function countOpenTimesheetsInPeriod(payPeriodId: string): Promise<number> {
  const { data: period } = await supabase
    .from('pay_periods')
    .select('tenant_id, period_start, period_end')
    .eq('id', payPeriodId)
    .single();
  if (!period) return 0;
  const { count } = await supabase
    .from('timesheets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', period.tenant_id)
    .gte('week_ending', period.period_start)
    .lte('week_ending', period.period_end)
    .in('state', ['draft','submitted','disputed']);
  return count ?? 0;
}
```

### 2.2 UI — Close Period button + confirmation modal

```tsx
// crm7/src/pages/payroll/pay-periods/index.tsx (extended)
// Adds "Close Period" button (shown only for status=open + role gate).
// Confirmation modal reads from countOpenTimesheetsInPeriod, displays: "{N} timesheets are still open in this period. Closing will block any further edits to those timesheets. Continue?"
// On confirm -> closePayPeriod() -> success toast -> refresh list.
// On error PayPeriodAlreadyClosedError -> info toast "Already closed" -> refresh.
```

WCAG 2.2: confirmation modal uses `<dialog>` element with focus trap; ARIA-live announcement on close success; Close button has `aria-describedby` pointing to the consequence text.

---

## 3. Send Reminder bulk action (ROW 46)

### 3.1 Existing comms infra (verified live)

`communications` table has all required fields: `bulk_batch_id` (group bulk sends), `failed_reason` (per-row failure log), `recipient_email` / `recipient_phone` / `recipient_name` (employee contact), `template_id` (link to template), `tenant_id`, `channel`. No new tables needed.

`communication_templates` — needs ONE new template seeded:

```sql
-- 20260507000033_seed_missing_timesheet_template.sql
INSERT INTO communication_templates (
  tenant_id, name, description, channel, subject, body, variables, category, is_active
)
SELECT
  t.id,
  'missing-timesheet-reminder',
  'Bulk reminder for employees with missing timesheets in a closing pay period',
  'email_and_sms',
  'Reminder: please submit your timesheet for week ending {{week_ending}}',
  E'Hi {{employee_name}},\n\nYour timesheet for the week ending {{week_ending}} has not been submitted yet. Please log in and submit by {{deadline}} to ensure on-time payment.\n\nIf you have already submitted, please disregard this message.\n\nThanks,\n{{tenant_name}} payroll team',
  ARRAY['employee_name','week_ending','deadline','tenant_name'],
  'payroll',
  true
FROM tenants t
ON CONFLICT (tenant_id, name) DO NOTHING;
```

### 3.2 Service function

```ts
// crm7/src/lib/services/missingTimesheetService.ts
export async function sendMissingTimesheetReminders(
  employeeIds: string[],
  weekEnding: string,
): Promise<{
  batchId: string;
  successCount: number;
  failureCount: number;
  failures: Array<{ employee_id: string; reason: string }>;
}> {
  // Per-employee dispatch (ROW 46 reliability red-team #4: NOT a single bulk call)
  const batchId = crypto.randomUUID();
  const template = await fetchTemplateByName('missing-timesheet-reminder');
  const employees = await fetchEmployeesByIds(employeeIds);
  const tenant = await fetchCurrentTenant();

  const results = await Promise.allSettled(
    employees.map(async (emp) => {
      const variables = {
        employee_name: emp.full_name,
        week_ending: weekEnding,
        deadline: addDays(parseISO(weekEnding), 3).toISOString().slice(0,10),
        tenant_name: tenant.name,
      };
      // Invoke comms edge function — RLS-scoped, dispatches one email + one SMS if both contact methods present
      const { error } = await supabase.functions.invoke('communication-dispatch', {
        body: {
          template_id: template.id,
          recipient_id: emp.id,
          recipient_email: emp.email,
          recipient_phone: emp.phone,
          recipient_name: emp.full_name,
          recipient_type: 'employee',
          channel: emp.preferred_channel ?? 'email',
          bulk_batch_id: batchId,
          variables,
        },
      });
      if (error) throw new Error(error.message);
      return emp.id;
    }),
  );

  const failures = results
    .map((r, i) => r.status === 'rejected' ? { employee_id: employees[i].id, reason: String((r as PromiseRejectedResult).reason) } : null)
    .filter((x): x is { employee_id: string; reason: string } => x !== null);

  return {
    batchId,
    successCount: results.filter(r => r.status === 'fulfilled').length,
    failureCount: failures.length,
    failures,
  };
}
```

### 3.3 UI — bulk select + Send Reminder button + progress toast

```tsx
// crm7/src/pages/payroll/missing-timesheets/index.tsx (extended)
// 1. DataTable gains row-checkbox column + select-all
// 2. Toolbar shows "Send Reminder" button when >=1 selected
// 3. Click -> confirmation modal listing selected count + channel breakdown
// 4. Confirm -> shows progress toast: "Sending 0 of N..." -> updates as each Promise.allSettled resolves
// 5. On completion -> success toast "{successCount} sent, {failureCount} failed" with click-through to logs
// 6. Link to /payroll/missing-timesheets/batches/{batchId} to view per-employee outcomes
```

ARIA-live: progress toast uses `aria-live="polite"`; success/failure toast uses `aria-live="assertive"`.

---

## 4. CSV export (ROW 47)

```tsx
// crm7/src/pages/payroll/missing-timesheets/index.tsx (extended further)
import { exportToCsv } from '@bsuite/data-export/csv';

const handleExport = () => {
  exportToCsv({
    rows: filteredEmployees,
    columns: [
      { key: 'full_name', header: 'Employee Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'placement_name', header: 'Placement' },
      { key: 'host_name', header: 'Host' },
      { key: 'week_ending', header: 'Period (week ending)' },
    ],
    filename: `missing-timesheets-${format(new Date(), 'yyyy-MM-dd')}.csv`,
  });
};
```

Test cases (3 per #575 acceptance criteria):
1. Export with 0 missing -> CSV with header row only
2. Export with 50 missing -> CSV with 51 lines, all columns present
3. Export with special characters in names -> properly escaped per RFC 4180

---

## 5. UI patch list

| Component | Path | Change |
|---|---|---|
| Pay periods page | `crm7/src/pages/payroll/pay-periods/index.tsx` | + stream selector column, + Close Period button (gto_admin role gate), + status badge |
| Pay period stream config form | `crm7/src/components/payroll/PayPeriodStreamForm.tsx` | NEW — RHF + Zod CRUD for streams |
| Close Period confirmation modal | `crm7/src/components/payroll/ClosePayPeriodDialog.tsx` | NEW — open-timesheet count + reason textarea |
| Missing timesheets page | `crm7/src/pages/payroll/missing-timesheets/index.tsx` | + checkbox column, + Send Reminder button + dialog, + CSV export button |
| Send Reminder dialog | `crm7/src/components/payroll/SendReminderDialog.tsx` | NEW — selected count + channel split + progress |
| Reminder batches page | `crm7/src/pages/payroll/missing-timesheets/batches/[batchId].tsx` | NEW — per-employee outcome table |
| payPeriodService | `crm7/src/lib/services/payPeriodService.ts` | NEW |
| missingTimesheetService | `crm7/src/lib/services/missingTimesheetService.ts` | NEW |
| Timesheet create form | `crm7/src/pages/timesheets/create.tsx` | + check `pay_periods.status` before allowing submit; show clear error if closed |

---

## 6. Test fixture inventory

### 6.1 Migration / RLS tests (~10)
- `pay_periods` + `pay_period_streams` create OK
- RLS: only same-tenant can read; only gto_admin/org_admin/payroll_admin can write
- Closing trigger: blocks new timesheet INSERT/UPDATE inside closed period
- Closing trigger: allows no-op metadata updates

### 6.2 Service tests (~12)
- `closePayPeriod`: sets status, records closed_by/closed_at, returns correct openTimesheetCount
- `closePayPeriod`: optimistic concurrency — second close call throws PayPeriodAlreadyClosedError
- `sendMissingTimesheetReminders`: per-employee dispatch (NOT bulk call); failures don't abort batch
- `sendMissingTimesheetReminders`: returns successCount + failureCount + failures array
- `sendMissingTimesheetReminders`: uses correct template variables

### 6.3 UI tests (~14, RTL)
- Pay periods page: stream selector renders + filters list
- Close Period button: hidden for non-admin; shown for admin
- Close Period dialog: shows openCount; submit calls closePayPeriod
- Missing-timesheets page: checkbox select + Send Reminder shows progress
- CSV export: triggers download with correct columns
- Closed-period banner on timesheet create blocks submit

### 6.4 E2E (1 Playwright)
- gto_admin closes a pay period -> employee tries to submit timesheet for that week -> rejected with clear error

**Total: ~36 unit/integration + 1 e2e = ~37 tests.**

---

## 7. Implementation sequence (5 PRs)

| PR | Scope | Size | Depends on |
|---|---|---|---|
| 575.1 | Migrations §1.1-§1.3 + RLS tests + migration of existing payPeriodStore data | ~1.5h | none |
| 575.2 | Pay period streams CRUD UI + service (§5 PayPeriodStreamForm) | ~1.5h | 575.1 |
| 575.3 | Close Period flow §2 + confirmation modal + tests | ~1.5h | 575.1 |
| 575.4 | Send Reminder §3 + template seed + service + dialog + batches page | ~2h | none (independent of 575.1-3) |
| 575.5 | CSV export §4 + tests | ~30min | none (independent) |

Total estimated effort: ~7h, 5 sub-PRs, 575.4 + 575.5 ship independently.

---

## 8. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ All citations verified — `pay_periods` absent verified live; `communications` + `communication_templates` confirmed live (full schema queried); codehouse PDF page citations consistent with #575 issue body
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming compliant

## §17 mutual-reminder

- ✓ red-team table addressed: UX (confirmation modal + open-timesheet count + role gate + WCAG 2.2 ARIA-live), Security (gto_admin/org_admin RLS + RLS-scoped comms dispatch), Performance ((tenant, period_start DESC) index + single JOIN query + Promise.allSettled per-row), Reliability (per-employee dispatch + bulk_batch_id + failure log), Quality (canonical pattern reuse + additive migrations + existing comms infra)
- ✓ smoke test documented (~37 tests in §6)
- ✓ no orphan branches (will delete after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

All RLS policies use `current_tenant_id()` + role check via `auth.jwt() ->> 'role'`. Closing trigger is SECURITY INVOKER with locked search_path. Comms dispatch uses authenticated edge function (existing `communication-dispatch`). Zero cookie SSO. Zero service-role key.

## Hand-off

@claude-code / @copilot: implementation per §7 sequence. Migrations in §1 are copy-paste-ready. Service functions in §2 + §3 are paste-ready. UI patch list in §5 covers all touch points.

Per §20 obvious-fix autonomy: spec is grounded in live schema reality (zero pay_periods table; comms infra exists) + codehouse PDF citations; proceed if concur. Sub-PRs 575.1 (migrations) is the natural starter; 575.4 (Send Reminder) and 575.5 (CSV) are independent and parallel-shippable.
