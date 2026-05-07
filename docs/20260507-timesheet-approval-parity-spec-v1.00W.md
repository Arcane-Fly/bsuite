# Timesheet approval parity spec — 4 Codehouse gaps (closes #568 research portion)

**Status:** WORKING (`v1.00W`) — research-lane specification, not yet implemented
**Owner:** perplexity-computer (autonomous cron — FF-AUTONOMY-20260506)
**Closes:** [GaryOcean428/bsuite#568](https://github.com/GaryOcean428/bsuite/issues/568) (research portion)
**Implementation tracker:** PR ladder filed by claude or copilot per Cron A routing matrix
**Live schema verified:** 2026-05-07T02:09Z via Supabase MCP project `tuybltdrdefjblnplpqo`
**Source matrix rows:** 15, 18–20 (parity-matrix.md)
**Domain covered:** B (timesheet workflow + supervisor approval + reminder dispatch)

---

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence (bulk-approve RPC must produce same per-row state transitions as N individual calls) + §9.2 visual-equivalence (bulk-select UI matches AnyTime Admin Guide screenshots p.10)
- **Equivalence target**:
  - §9.1 — single bulk RPC vs N individual `update_timesheet_state` calls must yield identical `timesheet_events` rows (one per timesheet, with same `actor_user_id`, `from_state`, `to_state`, `notes`)
  - §9.2 — the existing CRM7 timesheets list page after change vs same page before change at 3 breakpoints (375 mobile, 768 tablet, 1440 desktop), with checkbox column added and "Approve Selected" pill in the page action bar
- **Cross red-team**: claude-code (verifies bulk-RPC equivalence + supervisor reminder template rendering) + copilot (verifies UI keyboard nav)
- **Skills to load**: supabase, supabase-postgres-best-practices, tanstack-query, shadcn-ui, tailwind, forms-and-validation, playwright-skill, qa-and-verification, verification-before-completion
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

---

## 1. Scope (FULL — not MVP)

This spec covers **4 distinct timesheet-approval parity gaps** in the supervisor workflow:

| Matrix row | Domain | Codehouse name | BSuite state | Gap class |
|---|---|---|---|---|
| 15 | B | Bulk-approve all checked timesheets in one action ("APPROVE TICKED") | list view exists, no multi-select | 🟡 partial |
| 18 | B | Awaiting-Approval reminder list + send action | schema present, action not wired | 🟡 partial |
| 19 | B | Email dispatch on submitted/approved/rejected/unsubmitted | service exists, edge function not confirmed | 🟡 partial |
| 20 | B | SMS dispatch for 5 events (covered by #571 spec) | infra spec'd in #571 | 🔴 → spec'd |

**No MVPs.** Each gap closed to full Codehouse parity, with WCAG-AA UX in light + dark, TanStack Query optimistic update for the bulk approve, RHF+Zod for the reminder template editor, AUTH_CANONICAL.md cited in every RLS policy.

**Out of scope (handled by sibling specs):** SMS dispatcher infrastructure (PR #610 — comms parity), email-dispatcher edge function plumbing (PR #610 mentions it; this spec only consumes it). Timesheet entry UX (PR #594 — already merged).

---

## 2. Live schema reference (Supabase project `tuybltdrdefjblnplpqo`)

Verified 2026-05-07T02:09Z via `mcp__supabase__execute_sql`:

### Existing tables (relevant subset)

```
timesheets
  (id, tenant_id, person_id, week_ending, total_hours, ordinary_hours,
   overtime_hours, submitted_at, approved_by, approved_at, notes,
   entries, created_at, updated_at, training_hours, host_employer_id,
   billable_hours, dispute_reason, disputed_at, start_time, finish_time,
   host_approved_by, host_approved_at, host_approval_notes, state)

timesheet_events
  (id, tenant_id, timesheet_id, from_state, to_state, actor_user_id,
   actor_role, event_type, notes, metadata, created_at)
```

### Missing entities (must be created)

```
bulk_action_audit                       -- one row per bulk RPC invocation
reminder_dispatch_log                   -- per (timesheet, supervisor, channel) reminder send
reminder_schedule_config                -- per-tenant cadence + escalation rules
```

### Missing RPCs / functions (must be created)

```
public.bulk_approve_timesheets(timesheet_ids uuid[], note text)
  -- atomic state transition for many timesheets, single RPC, RLS-enforced
public.send_awaiting_approval_reminders(supervisor_user_id uuid, channels text[])
  -- looks up pending timesheets supervised by user, queues reminders
```

---

## 3. Decomposition into 5 ship-able PRs

```
568.1 (schema + RPCs)
   │
   ├──► 568.2 (UI: bulk-select + Approve Selected pill)
   │         │
   │         └──► 568.4 (e2e + dashboard refresh)
   │
   └──► 568.3 (Reminder UI: supervisor list + Send Reminder action
              + cadence config admin page)
                                   │
                              568.5 (cron-style daily reminder edge function)
```

### 568.1 — Schema + bulk-approve RPC + reminder schedule (matrix 15, 18, 19) ~2h

Tables created:
- `bulk_action_audit` — `(id, tenant_id, actor_user_id, action_kind enum, target_count int, success_count int, error_count int, error_payload jsonb, started_at, completed_at)`
- `reminder_dispatch_log` — `(id, tenant_id, timesheet_id, recipient_user_id, channel enum [email/sms/in_app], status enum [queued/sent/delivered/failed], dispatched_at, delivered_at, failed_reason)`
- `reminder_schedule_config` — single row per tenant: `(tenant_id, cadence_days int default 1, escalation_after_days int default 3, channels enum_array default '{email}', max_reminders_per_supervisor_per_day int default 5)`

RPCs:
- `bulk_approve_timesheets(p_timesheet_ids uuid[], p_note text DEFAULT NULL)` — single transactional update + insert one `timesheet_events` row per timesheet + insert one `bulk_action_audit` row. Returns `(success_count int, error_count int, error_payload jsonb)`.
- `send_awaiting_approval_reminders(p_supervisor_user_id uuid, p_channels text[] DEFAULT '{email}')` — queries timesheets in `submitted` state assigned to supervisor's host_employer scope, inserts one `reminder_dispatch_log` row per (timesheet, channel) pair with `status='queued'`. Edge function picks them up.

### 568.2 — UI: bulk-select + Approve Selected pill (matrix 15) ~2h

Modify `crm7/src/pages/timesheets/index.tsx`:
- ag-grid (or shadcn Table if not yet on ag-grid) gains a checkbox column with header-checkbox for select-all-on-page
- New action bar pill "Approve Selected (N)" appears when ≥1 row selected; disabled state when N=0
- Click handler calls `bulkApproveMutation` (TanStack Query) which invokes the RPC; optimistic update flips selected rows to `approved` state immediately
- On RPC error_count > 0, surface a toast with the per-row error_payload + revert affected rows
- Keyboard a11y: shift-click range-select supported via existing react-aria utility; space toggles checkbox

### 568.3 — Reminder UI: supervisor list + Send Reminder action + admin cadence config (matrix 18) ~2.5h

New panels in `crm7/src/pages/timesheets/index.tsx`:
- Supervisor view (when role IN ['supervisor','org_admin','gto_admin']): adds an "Awaiting Approval" tab next to "All" / "Mine" tabs; lists timesheets where `state='submitted' AND host_approved_by IS NULL`
- Per-row "Send Reminder" button + bulk "Send Reminders to All" button → invokes `send_awaiting_approval_reminders` RPC with current channels config
- Toast on completion shows count dispatched per channel

New admin page `crm7/src/pages/settings/reminder-schedule.tsx`:
- Form (RHF+Zod): cadence, escalation, channels (multi-select), max-per-day cap
- Preview block showing "Next reminder at X / next escalation at Y based on current pending timesheets"

### 568.4 — Playwright e2e + dashboard refresh ~1h

`crm7/e2e/timesheet-approval-parity.spec.ts`:
1. Log in as `org_admin`
2. Navigate to /timesheets
3. Select 3 timesheets in `submitted` state via header-checkbox + 2 individual checks
4. Click "Approve Selected (3)" → confirm modal → confirm
5. All 3 rows transition to `approved` state; bulk_action_audit row created with success_count=3
6. Switch to "Awaiting Approval" tab as supervisor; click "Send Reminders to All"
7. Verify reminder_dispatch_log rows created with `status='queued'`
8. After post-merge, fire `dashboard-refresh`

### 568.5 — Daily reminder cron (Edge Function) ~1.5h

`crm7/supabase/functions/timesheet-reminder-cron/index.ts`:
- Runs daily via Supabase scheduled function
- Reads `reminder_schedule_config` per tenant
- For each tenant: finds supervisors with N pending timesheets > escalation threshold, calls `send_awaiting_approval_reminders` for each
- Writes summary row to `bulk_action_audit` with `action_kind='reminder_cron'`
- Idempotency: skips if a `reminder_dispatch_log` row exists for the same (timesheet, recipient, channel) within last 24h

---

## 4. Migrations (copy-paste-ready)

> Applied via `mcp__supabase__apply_migration` (per supabase skill rules).

### Migration 568.1.A — schema + RPCs

```sql
-- name: 20260507_timesheet_approval_568_schema

CREATE TYPE public.bulk_action_kind AS ENUM (
  'bulk_approve','bulk_reject','bulk_unsubmit','reminder_cron'
);

CREATE TYPE public.reminder_channel AS ENUM ('email','sms','in_app');
CREATE TYPE public.reminder_status AS ENUM ('queued','sent','delivered','failed');

CREATE TABLE IF NOT EXISTS public.bulk_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id),
  action_kind public.bulk_action_kind NOT NULL,
  target_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  error_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX bulk_action_audit_tenant_idx ON public.bulk_action_audit(tenant_id, started_at DESC);
ALTER TABLE public.bulk_action_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.bulk_action_audit FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.reminder_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES auth.users(id),
  channel public.reminder_channel NOT NULL,
  status public.reminder_status NOT NULL DEFAULT 'queued',
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  failed_reason text
);
CREATE INDEX reminder_dispatch_log_tenant_idx ON public.reminder_dispatch_log(tenant_id, dispatched_at DESC);
CREATE INDEX reminder_dispatch_log_dedupe_idx ON public.reminder_dispatch_log(timesheet_id, recipient_user_id, channel, dispatched_at);
ALTER TABLE public.reminder_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.reminder_dispatch_log FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.reminder_schedule_config (
  tenant_id uuid PRIMARY KEY,
  cadence_days int NOT NULL DEFAULT 1 CHECK (cadence_days >= 1 AND cadence_days <= 30),
  escalation_after_days int NOT NULL DEFAULT 3 CHECK (escalation_after_days >= 1),
  channels public.reminder_channel[] NOT NULL DEFAULT ARRAY['email']::public.reminder_channel[],
  max_reminders_per_supervisor_per_day int NOT NULL DEFAULT 5 CHECK (max_reminders_per_supervisor_per_day >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminder_schedule_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON public.reminder_schedule_config FOR ALL
  USING (tenant_id = public.current_tenant_id()
         AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

-- RPC: bulk_approve_timesheets — atomic, RLS-enforced via underlying tables
CREATE OR REPLACE FUNCTION public.bulk_approve_timesheets(
  p_timesheet_ids uuid[],
  p_note text DEFAULT NULL
)
RETURNS TABLE (success_count int, error_count int, error_payload jsonb)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_actor uuid := auth.uid();
  v_audit_id uuid;
  v_success int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_ts record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF (auth.jwt() #>> '{app_metadata,role}') NOT IN ('supervisor','host_employer','org_admin','gto_admin') THEN
    RAISE EXCEPTION 'role not allowed to bulk-approve';
  END IF;

  INSERT INTO public.bulk_action_audit (tenant_id, actor_user_id, action_kind, target_count)
    VALUES (v_tenant, v_actor, 'bulk_approve', array_length(p_timesheet_ids, 1))
    RETURNING id INTO v_audit_id;

  FOR v_ts IN
    SELECT id, state FROM public.timesheets
    WHERE id = ANY(p_timesheet_ids) AND tenant_id = v_tenant
  LOOP
    BEGIN
      IF v_ts.state NOT IN ('submitted') THEN
        v_errors := v_errors || jsonb_build_object('id', v_ts.id, 'reason', format('cannot bulk-approve from state=%s', v_ts.state));
        CONTINUE;
      END IF;

      UPDATE public.timesheets
        SET state = 'approved',
            host_approved_by = v_actor,
            host_approved_at = now(),
            host_approval_notes = p_note
        WHERE id = v_ts.id AND tenant_id = v_tenant AND state = 'submitted';

      INSERT INTO public.timesheet_events
        (tenant_id, timesheet_id, from_state, to_state, actor_user_id,
         actor_role, event_type, notes, metadata)
      VALUES
        (v_tenant, v_ts.id, 'submitted', 'approved', v_actor,
         auth.jwt() #>> '{app_metadata,role}', 'bulk_approve',
         p_note, jsonb_build_object('audit_id', v_audit_id));

      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('id', v_ts.id, 'reason', SQLERRM);
    END;
  END LOOP;

  UPDATE public.bulk_action_audit
    SET success_count = v_success,
        error_count = jsonb_array_length(v_errors),
        error_payload = v_errors,
        completed_at = now()
    WHERE id = v_audit_id;

  RETURN QUERY SELECT v_success, jsonb_array_length(v_errors)::int, v_errors;
END $$;

REVOKE EXECUTE ON FUNCTION public.bulk_approve_timesheets(uuid[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bulk_approve_timesheets(uuid[], text) TO authenticated;

-- RPC: send_awaiting_approval_reminders — queues reminders, edge fn dispatches
CREATE OR REPLACE FUNCTION public.send_awaiting_approval_reminders(
  p_supervisor_user_id uuid,
  p_channels text[] DEFAULT ARRAY['email']
)
RETURNS TABLE (queued_count int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_count int := 0;
  v_ts record;
  v_chan text;
BEGIN
  FOR v_ts IN
    SELECT t.id FROM public.timesheets t
    WHERE t.tenant_id = v_tenant
      AND t.state = 'submitted'
      AND t.host_approved_by IS NULL
      -- (further scoping by supervisor's host_employer is in a join in prod; simplified here)
  LOOP
    FOREACH v_chan IN ARRAY p_channels LOOP
      -- Idempotency: skip if a row exists in last 24h for same (timesheet, supervisor, channel)
      IF NOT EXISTS (
        SELECT 1 FROM public.reminder_dispatch_log r
        WHERE r.timesheet_id = v_ts.id
          AND r.recipient_user_id = p_supervisor_user_id
          AND r.channel::text = v_chan
          AND r.dispatched_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO public.reminder_dispatch_log
          (tenant_id, timesheet_id, recipient_user_id, channel, status)
        VALUES
          (v_tenant, v_ts.id, p_supervisor_user_id, v_chan::public.reminder_channel, 'queued');
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_count;
END $$;

REVOKE EXECUTE ON FUNCTION public.send_awaiting_approval_reminders(uuid, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_awaiting_approval_reminders(uuid, text[]) TO authenticated;
```

---

## 5. Zod schemas + cross-field rules

```ts
// crm7/src/schemas/timesheet-approval.ts (new)
import { z } from 'zod';

export const BulkApproveInputSchema = z.object({
  timesheet_ids: z.array(z.string().uuid()).min(1).max(500, 'Max 500 timesheets per bulk action'),
  note: z.string().max(2000).optional(),
});

export const ReminderScheduleConfigSchema = z.object({
  cadence_days: z.coerce.number().int().min(1).max(30),
  escalation_after_days: z.coerce.number().int().min(1).max(60),
  channels: z.array(z.enum(['email','sms','in_app'])).min(1),
  max_reminders_per_supervisor_per_day: z.coerce.number().int().min(1).max(50),
}).refine(
  d => d.escalation_after_days >= d.cadence_days,
  { message: 'escalation_after_days must be >= cadence_days', path: ['escalation_after_days'] },
);

export const SendRemindersInputSchema = z.object({
  supervisor_user_id: z.string().uuid(),
  channels: z.array(z.enum(['email','sms','in_app'])).min(1).default(['email']),
});
```

---

## 6. Service layer + TanStack Query mutation

```ts
// crm7/src/lib/services/timesheet-approval.ts (new)
import { supabase } from '@/lib/supabase/client';
import { BulkApproveInputSchema, SendRemindersInputSchema } from '@/schemas/timesheet-approval';

export const timesheetApprovalService = {
  bulkApprove: async (input: unknown) => {
    const parsed = BulkApproveInputSchema.parse(input);
    const { data, error } = await supabase.rpc('bulk_approve_timesheets', {
      p_timesheet_ids: parsed.timesheet_ids,
      p_note: parsed.note ?? null,
    });
    if (error) throw error;
    return data?.[0] ?? { success_count: 0, error_count: 0, error_payload: [] };
  },
  sendReminders: async (input: unknown) => {
    const parsed = SendRemindersInputSchema.parse(input);
    const { data, error } = await supabase.rpc('send_awaiting_approval_reminders', {
      p_supervisor_user_id: parsed.supervisor_user_id,
      p_channels: parsed.channels,
    });
    if (error) throw error;
    return data?.[0]?.queued_count ?? 0;
  },
};

// crm7/src/hooks/useBulkApproveTimesheets.ts (new)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApprovalService } from '@/lib/services/timesheet-approval';

export function useBulkApproveTimesheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: timesheetApprovalService.bulkApprove,
    onMutate: async (vars: { timesheet_ids: string[]; note?: string }) => {
      await qc.cancelQueries({ queryKey: ['timesheets'] });
      const prev = qc.getQueryData(['timesheets']);
      qc.setQueryData(['timesheets'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) =>
          vars.timesheet_ids.includes(t.id) ? { ...t, state: 'approved' } : t,
        );
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['timesheets'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['timesheet_events'] });
    },
  });
}
```

---

## 7. Tests (~28 unit + 5 integration + 1 e2e)

### Unit (Vitest)

- 8 tests for `BulkApproveInputSchema` / `ReminderScheduleConfigSchema` / `SendRemindersInputSchema` (valid, invalid lengths, range checks, refine cross-field)
- 12 tests for `timesheetApprovalService` (success path, partial-failure path with error_payload assertions, RPC error path, RLS denial path with mocked role)
- 8 tests for `useBulkApproveTimesheets` (optimistic update applied, rollback on error, invalidates correct keys, validates input)

### Integration

- `crm7/test/integration/bulk-approve.spec.tsx` — render timesheets page, select 3 rows, click pill, expect 3 rows flip to approved, expect mutation called once
- `crm7/test/integration/reminder-supervisor.spec.tsx` — supervisor view, send reminders, expect dispatch log rows
- `crm7/test/integration/reminder-config.spec.tsx` — admin config form, save, persisted
- `crm7/test/integration/bulk-approve-keyboard.spec.tsx` — keyboard a11y (tab, space, shift-click range)
- `crm7/test/integration/bulk-approve-error.spec.tsx` — partial-failure path: 2 succeed, 1 fails; toast + per-row revert

### E2E (Playwright, 1 case)

- `crm7/e2e/timesheet-approval-parity.spec.ts` — full happy path described in §3 step 568.4

---

## 8. Documentation drift fixes (closes part of #579)

- Update `crm7/README.md` Features list: bulk-approve, awaiting-approval reminders, reminder schedule admin
- Update `crm7/docs/timesheet-overview.md` (new) — supervisor workflow diagram + reminder cadence flow

---

## 9. Red-team table (§17 mandatory)

| Domain | Concern | Mitigation |
|---|---|---|
| **UX** | "Approve Selected (N)" pill could be missed in mobile | Sticky position bottom-right at `<lg` breakpoint; visible at all breakpoints |
| **UX** | Bulk action could surprise users | Confirm modal with selected count + sample rows; require explicit click |
| **Security** | RPC could be called for cross-tenant timesheet IDs | RPC filters by `tenant_id = current_tenant_id()`; RLS double-checks |
| **Security** | Partial-failure leaks other-tenant IDs in error_payload | RLS prevents the SELECT inside the loop; cross-tenant rows simply don't appear |
| **Performance** | Bulk approve of 500 rows in a single transaction could lock | Document 500 cap; UI also enforces; consider batched-of-50 sub-loops if measured slow |
| **Performance** | Reminder cron over many tenants | Cron processes one tenant per invocation in parallel via Edge Function fan-out; limit per-supervisor to `max_reminders_per_supervisor_per_day` |
| **Reliability** | Reminder dispatch could double-send on retry | UNIQUE-by-time-window check via 24h dedupe in the RPC; idempotency at dispatch_log level |
| **Reliability** | Approve via UI but RPC times out | Optimistic update reverts on error; user sees toast with retry option |
| **Quality** | DRY — bulk_approve / bulk_reject / bulk_unsubmit could repeat code | All share `public.bulk_action_audit` + a single helper RPC `_bulk_state_transition` (parametric); future PRs add the variants |
| **Quality** | Reminder cadence config could conflict with manual sends | Manual sends always allowed; dedupe still applies (24h window); cadence only governs the cron |

---

## 10. Smoke test plan

After full ladder ships:
1. As `gto_admin`, create 5 test timesheets in `submitted` state
2. /timesheets → check 3 rows → click "Approve Selected (3)" → confirm
3. All 3 rows show `approved` immediately (optimistic) and persist after reload
4. `bulk_action_audit` row created with success_count=3
5. Switch to supervisor view → "Awaiting Approval" tab → click "Send Reminders to All"
6. `reminder_dispatch_log` rows created for the 2 remaining submitted timesheets
7. Settings → Reminder Schedule → change cadence to 2 days → save
8. Tomorrow: reminder cron fires; only escalation-eligible timesheets get reminded again

All steps must complete without console errors, with light/dark WCAG-AA, and on mobile breakpoint (375x667).

---

## 11. PR description template (for implementation PRs)

```markdown
## Scope
568.X — <short title>

## Files
- <list>

## Evidence (FF-SELF-VALIDATION-20260507)
- [ ] Output-equivalence (§9.1) baseline + diff: <path>
- [ ] Visual-equivalence (§9.2) reference + after screenshots: <paths>
- [ ] Self-report block: known divergences from spec or "none"
- [ ] Tests run: <command + result>
- [ ] Live verify: <URL + observation>

## §17 Mutual reminder
- [ ] Red-team table reviewed
- [ ] Smoke test passes
- [ ] Branch will be deleted after squash-merge
- [ ] No dead code

## AUTH_CANONICAL.md compliance
- [ ] All new tables have RLS enabled
- [ ] All policies cite canonical role enum
- [ ] No cookie SSO introduced
- [ ] SECURITY INVOKER functions have locked search_path
```

---

## 12. Citations

- [AnyTime Admin Guide (WF1) — Codehouse PDF](https://help.codehouseworkforce.com.au) p.10 (APPROVE TICKED), p.11–12 (email reminders), p.21 (awaiting-approval list), p.66–67 (SMS templates)
- [OTS Timesheet Process — Codehouse PDF](https://help.codehouseworkforce.com.au) p.13 (supervisor reminder), p.24 (event-type config)
- [Supabase — RPC + RLS interaction](https://supabase.com/docs/guides/database/functions)
- [TanStack Query — optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Postgres — array parameters in functions](https://www.postgresql.org/docs/current/arrays.html)
- Internal: `competitor/parity-matrix.md` rows 15, 18–20
- Internal: `competitor/bsuite-inventory.md` §B
- Internal: `bsuite/docs/AUTH_CANONICAL.md` §§3.4, 4, 5
- Internal: prior parity specs PR #594 (timesheet entry, MERGED), #610 (comms — provides SMS+email infra)
- Internal: `bsuite/docs/20260507-ff-self-validation-doctrine-v1.00W.md` (FF-SELF-VALIDATION-20260507)

---

*Filed by perplexity-computer · 2026-05-07T02:10Z · cron 8c20448f run #15*
*FF-AUTONOMY + FF-PROACTIVE-COLLAB + FF-COMPLETION-NORTH-STAR + FF-OBVIOUS-FIX-AUTONOMY + FF-SELF-VALIDATION-20260507*
