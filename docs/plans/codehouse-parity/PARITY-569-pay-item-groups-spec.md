# Pay Item Groups parity spec — 11 Codehouse gaps domain C (closes #569 research portion)

**Status:** WORKING (`v1.00W`) — PR-A through PR-F implemented on `development`; PR-G remains active
**Owner:** perplexity-computer (autonomous cron — FF-AUTONOMY-20260506)
**Closes:** [GaryOcean428/bsuite#569](https://github.com/GaryOcean428/bsuite/issues/569) (research portion)
**Implementation tracker:** PR ladder filed by claude or copilot per Cron A routing matrix
**Latest implementation evidence:** PR-A merged in [GaryOcean428/crm7#950](https://github.com/GaryOcean428/crm7/pull/950); PR-B merged in [GaryOcean428/crm7#951](https://github.com/GaryOcean428/crm7/pull/951); PR-C merged in [GaryOcean428/crm7#952](https://github.com/GaryOcean428/crm7/pull/952); PR-D merged in [GaryOcean428/crm7#953](https://github.com/GaryOcean428/crm7/pull/953); PR-E merged in [GaryOcean428/crm7#954](https://github.com/GaryOcean428/crm7/pull/954); PR-F merged in [GaryOcean428/crm7#955](https://github.com/GaryOcean428/crm7/pull/955) on `development`
**Live schema verified:** 2026-05-07 via Supabase MCP project `tuybltdrdefjblnplpqo`
**Source matrix rows:** 21–29, 31–32 (parity-matrix.md domain C)
**Domain covered:** C (Pay Items — groups, rules, type extensions, sort priority)
**Auth canonical:** [`AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) — every RLS policy below cites this file

---

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop:** §10 red-team table must be addressed before any implementation PR ladder merges to `main`.
- **Self-report on divergence:** yes (mandatory; do not rationalise gaps).
- **Skills to load:** `supabase`, `supabase-postgres-best-practices`, `forms-and-validation` (RHF + Zod), `tanstack-query`, `dnd-kit`, `qa-and-verification`, `playwright-skill`.
- **Cross red-team:** claude-code (DB + service layer) + copilot (UI keyboard a11y + Playwright smoke).

---

## 1. Scope

### Covered by this spec

| Matrix row | Domain | Codehouse name | BSuite state | Gap class |
|---|---|---|---|---|
| 21 | C | Pay Item Groups (named groups linking pay items) | CRM7-owned schema + CRUD/reorder UI merged to `development`; PR-F extended category/type metadata | 🟢 dev-merged |
| 22 | C | Timesheet Groups (link Pay Item Groups to coded timesheet columns) | CRM7-owned schema + CRUD/reorder UI merged to `development` | 🟢 dev-merged |
| 23 | C | Penalty Groups (additional penalty rate on top of timesheet group) | CRM7-owned schema + CRUD/reorder UI merged to `development` | 🟢 dev-merged |
| 24 | C | Allowance Groups (link allowances to pay item groups) | CRM7-owned schema + CRUD/reorder UI merged to `development` | 🟢 dev-merged |
| 25 | C | Pay Item Rules (award interpretation engine per placement) | CRM7-owned rule CRUD + placement UUID assignment merged to `development`; downstream calc integration remains in PR-G | 🟢 dev-merged |
| 26 | C | Salary Sacrifice pay items | CRM7-owned `pay_item_groups` has `salary_sacrifice` category + `is_salary_sacrifice` UI/payroll schema support | 🟢 dev-merged |
| 27 | C | Child Support Deduction pay items | CRM7-owned `pay_item_groups` has `child_support` category + `is_child_support` UI/payroll schema support | 🟢 dev-merged |
| 28 | C | RDO Accrual pay items | CRM7-owned `pay_item_groups` has `rdo_accrual` category + `is_rdo_accrual` UI/payroll schema support | 🟢 dev-merged |
| 29 | C | Back Pay pay items | CRM7-owned `pay_item_groups` has `back_pay` category + `is_back_pay` UI/payroll schema support | 🟢 dev-merged |
| 31 | C | Reimbursement pay items | CRM7-owned `pay_item_groups` has `reimbursement` category + `is_reimbursement` UI/payroll schema support | 🟢 dev-merged |
| 32 | C | Pay Item Category Priority (`sort_priority`) | `pay_item_groups.sort_priority` and payroll category priority schema landed in PR-F | 🟢 dev-merged |

**Evidence source:** [AnyTime Admin Guide WF1_Pay_027](https://help.codehouseworkforce.com.au) pp.39–58; [OTS Set Up WF1_OTS_001](https://help.codehouseworkforce.com.au) pp.1–18; [parity-matrix.md rows 21–29, 31–32](../../../competitor/parity-matrix.md); [bsuite-inventory.md §C](../../../competitor/bsuite-inventory.md).

### Not covered by this spec

- Row 30 (client rates per pay item) — already at parity (`crm7/src/pages/charge-rates/create/`).
- SMS/email notification dispatch — covered by PARITY-571 (comms spec).
- Public holiday groups — tracked as row 72 (domain H, PARITY-572 future issue).
- Leave calendar and leave auto-populate — covered by leave-parity spec.
- MYOB/Astute payroll export adapters — covered by export-parity spec.
- Any changes to `@bsuite/auth` (frozen; see [`AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md)).

---

## 2. Live Supabase schema

**Project:** `tuybltdrdefjblnplpqo` — verified 2026-05-07 via `mcp__supabase__list_tables`.

### Existing relevant tables

```
timesheets
  (id, tenant_id, person_id, week_ending, total_hours, ordinary_hours,
   overtime_hours, submitted_at, approved_by, approved_at, notes,
   entries, created_at, updated_at, training_hours, host_employer_id,
   billable_hours, dispute_reason, disputed_at, start_time, finish_time,
   host_approved_by, host_approved_at, host_approval_notes, state)
  RLS: ✅ enabled

timesheet_events
  (id, tenant_id, timesheet_id, from_state, to_state, actor_user_id,
   actor_role, event_type, notes, metadata, created_at)
  RLS: ✅ enabled

placements
  (id, ...) -- apprentice placements; PR-E added ots_rule_id FK
  RLS: ✅ enabled

apprentice_rate_configs
  (id, tenant_id, ...)  -- year-of-trade wage percentages; exists; charge-calc consumes
  RLS: ✅ enabled

custom_pay_rates
  (id, ...) -- custom pay rates per apprentice; exists
  RLS: ✅ enabled
```

### Entities created by this spec's PR ladder

```
pay_item_groups          -- CREATED in PR-A; EXTENDED in PR-F (rows 21, 26-29, 31-32)
timesheet_groups         -- CREATED in PR-A (row 22)
penalty_groups           -- CREATED in PR-B (row 23)
allowance_groups         -- CREATED in PR-B (row 24)
pay_item_rules           -- CREATED in PR-E (row 25)
```

**RLS expectation:** Every new table must use the tenant helpers already present in CRM7 (`public.auth_tenant_id()` for active tenant membership and `public.is_gto_staff(tenant_id)` for staff writes), consistent with [`AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) §"Verification preferences". The `service_role` bypass is never exposed to client code; all client mutations go through RLS-respecting client calls or `SECURITY INVOKER` RPCs.

---

## 3. Decomposition into 7 ship-able PRs

```
PR-A (pay_item_groups + timesheet_groups schema)
  │
  ├──► PR-B (penalty_groups + allowance_groups schema)
  │
  ├──► PR-C (pay-item-groups CRUD + timesheet-groups CRUD pages)
  │         │
  │         └──► PR-D (penalty-groups CRUD + allowance-groups CRUD pages)
  │
  ├──► PR-E (pay-item-rules CRUD + placements/[id].tsx rule assignment)
  │
  ├──► PR-F (pay item type extensions + sort_priority)
  │
  └──► PR-G (optional: charge-calc package named-entity IDs)
```

**Stack:** React 19, TanStack Query v5, shadcn/ui, Tailwind v4 (OKLCH), dnd-kit v6 (sortable preset), RHF v7 + Zod v3, Supabase JS v2.

### PR-A — `pay_item_groups` + `timesheet_groups` migrations + Zod schemas (DB-only, no UI)

**Target:** `crm7/supabase/migrations/20260603010000_pay_item_timesheet_groups.sql`
**Status:** ✅ merged to CRM7 `development` via [crm7#950](https://github.com/GaryOcean428/crm7/pull/950)
**Evidence:** 10-suite pgTAP workflow pattern passed (135 tests), including `09_pay_item_groups_rls.sql` with 19 assertions for anon lockout, tenant read, GTO-staff writes, DB/Zod code parity, and cross-tenant composite FK enforcement.
**Independently mergeable:** yes (no UI; no consumer code changes beyond new Zod exports)
**Closes rows:** 21 (schema), 22 (schema)

### PR-B — `penalty_groups` + `allowance_groups` migrations + Zod schemas

**Target:** `crm7/supabase/migrations/20260603020000_penalty_allowance_groups.sql`
**Status:** ✅ merged to CRM7 `development` via [crm7#951](https://github.com/GaryOcean428/crm7/pull/951)
**Evidence:** CI passed build/test, e2e, pgTAP RLS, dry-lint, DB migration lint, RLS JWT lint, OAuth sync, drift scan, DOM layout, and gitleaks. Local pgTAP replay passed 11 suites / 158 assertions, including `09_penalty_allowance_groups_rls.sql` with 23 assertions for anon lockout, tenant read, GTO-staff writes, DB/Zod code parity, composite FK enforcement, and cross-tenant isolation.
**Independently mergeable:** yes (depends on PR-A for `pay_item_group_id` FK)
**Closes rows:** 23 (schema), 24 (schema)

### PR-C — pay-item-groups CRUD page + timesheet-groups CRUD page

**Target:** `crm7/src/pages/settings/pay-item-groups.tsx`, `crm7/src/pages/settings/timesheet-groups.tsx`
**Status:** ✅ merged to CRM7 `development` via [crm7#952](https://github.com/GaryOcean428/crm7/pull/952)
**Evidence:** CI passed build/test, e2e, pgTAP RLS, dry-lint, DB migration lint, RLS JWT lint, OAuth sync, drift scan, DOM layout, and gitleaks. Local validation passed targeted placement schema tests, typecheck, lint, full Vitest, production build, 42 affected pgTAP assertions, and browser smoke for `/settings/pay-item-groups` + `/settings/timesheet-groups`.
**Stack:** RHF + Zod, dnd-kit sortable, TanStack Query mutations, shadcn `DataTable`
**LOC estimate:** ~180 TSX
**Independently mergeable:** depends on PR-A
**Closes rows:** 21 (UI), 22 (UI)

### PR-D — penalty-groups + allowance-groups CRUD pages

**Target:** `crm7/src/pages/settings/penalty-groups.tsx`, `crm7/src/pages/settings/allowance-groups.tsx`
**Status:** ✅ merged to CRM7 `development` via [crm7#953](https://github.com/GaryOcean428/crm7/pull/953)
**Evidence:** CI passed build/test, e2e, drift scan, DOM layout, OAuth sync, and gitleaks. Local validation passed schema tests, typecheck, lint, full Vitest, production build, formatting check for PR-D files/service, no raw colour scan, design-sheriff review, code review, and browser smoke for `/settings/penalty-groups` + `/settings/allowance-groups`.
**Stack:** same as PR-C
**LOC estimate:** ~160 TSX
**Independently mergeable:** depends on PR-B; PR-C can merge first
**Closes rows:** 23 (UI), 24 (UI)

### PR-E — pay-item-rules CRUD page + `placements/[id].tsx` rule assignment dropdown

**Target:** `crm7/src/pages/settings/pay-item-rules.tsx`, `crm7/src/pages/placements/[id].tsx`
**Status:** ✅ merged to CRM7 `development` via [crm7#954](https://github.com/GaryOcean428/crm7/pull/954)
**Evidence:** CI passed build/test, e2e, pgTAP RLS, dry-lint, DB migration lint, RLS JWT lint, OAuth sync, drift scan, DOM layout, and gitleaks. Local validation passed targeted schema tests, route contract tests, typecheck, lint, full Vitest, production build, CI-style pgTAP baseline replay for `09_pay_item_rules_rls.sql` (20/20), and browser smoke for `/settings/pay-item-rules`.
**Stack:** RHF + Zod multi-step form; TanStack Query; shadcn `Select` for placement dropdown
**LOC estimate:** ~190 TSX
**Independently mergeable:** depends on PR-A (for group references)
**Closes rows:** 25

### PR-F — pay item type extensions + `sort_priority`

**Target:** `crm7/supabase/migrations/20260603050000_pay_item_type_extensions.sql`, `crm7/src/schemas/payroll.ts`, `crm7/src/pages/settings/pay-item-groups.tsx` (type extension UI)
**Status:** ✅ merged to CRM7 `development` via [crm7#955](https://github.com/GaryOcean428/crm7/pull/955)
**Evidence:** CI passed build/test, e2e, pgTAP RLS, dry-lint, DB migration lint, RLS JWT lint, OAuth sync, drift scan, DOM layout, and gitleaks. Local validation passed targeted pay-item/payroll schema tests, typecheck, lint, production build, browser smoke for `/settings/pay-item-groups`, and forbidden raw-hex/auth scan on touched files.
**LOC estimate:** ~100 SQL + ~250 TS = ~350 LOC
**Independently mergeable:** depends on PR-A (pay_item_groups table)
**Closes rows:** 26, 27, 28, 29, 31, 32

### PR-G (optional) — charge-calc package update to use named entity IDs

**Target:** `packages/charge-calc/src/types.ts`, `packages/charge-calc/src/calculate.ts`
**Status:** ⚠️ package source implemented and locally verified; npm publish blocked by missing registry auth ([bsuite#1363](https://github.com/GaryOcean428/bsuite/issues/1363))
**Evidence:** Local `@bsuite/charge-calc@0.5.0` source passed 728/728 Vitest tests, typecheck, build, and `pnpm pack --dry-run --json`. `npm view` confirmed 0.5.0 is not published; `npm whoami` returned `E401 Unauthorized`; `npm publish --access public` returned a registry permission error. CRM7/R80 consumer bumps remain intentionally blocked until 0.5.0 is published.
**LOC estimate:** ~180 TS
**Independently mergeable:** depends on PR-A through PR-F; implement last
**Closes rows:** row 21 (removes enum-only group references in favour of named entity UUIDs)

---

## 4. Migrations

> Apply via `mcp__supabase__apply_migration`. Follow [`AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) for RLS pattern: `public.current_tenant_id()` in every USING + WITH CHECK predicate; `SECURITY INVOKER` on all RPCs.

### Migration 4.A — `pay_item_groups` + `timesheet_groups`

```sql
-- name: 20260507001000_pay_item_groups

-- ── pay_item_groups ──────────────────────────────────────────────────────────
-- Represents named pay-item groups as a first-class entity.
-- Codehouse evidence: AnyTime Admin Guide p.39 (NT, OT1.5, OT2.0, AL, SL, RDO, PH, etc.)
-- RLS pattern: AUTH_CANONICAL.md §"Verification preferences" → use current_tenant_id()

CREATE TABLE IF NOT EXISTS public.pay_item_groups (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  name           text NOT NULL,
  code           text NOT NULL,                     -- short abbreviation, e.g. "NT", "OT1.5"
  description    text,
  sort_order     int  NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX pay_item_groups_tenant_sort_idx
  ON public.pay_item_groups (tenant_id, sort_order);

ALTER TABLE public.pay_item_groups ENABLE ROW LEVEL SECURITY;

-- RLS: tenant-scoped isolation per AUTH_CANONICAL.md §"Verification preferences"
CREATE POLICY pay_item_groups_tenant_isolation
  ON public.pay_item_groups FOR ALL
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── timesheet_groups ─────────────────────────────────────────────────────────
-- Links a Pay Item Group to a coded timesheet column with ordering.
-- Codehouse evidence: AnyTime Admin Guide p.40; OTS Set Up p.3

CREATE TABLE IF NOT EXISTS public.timesheet_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  pay_item_group_id   uuid NOT NULL
    REFERENCES public.pay_item_groups (id) ON DELETE RESTRICT,
  name                text NOT NULL,
  code                text NOT NULL,                -- e.g. "TS-NT", "TS-OT"
  sort_order          int  NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX timesheet_groups_tenant_sort_idx
  ON public.timesheet_groups (tenant_id, sort_order);
CREATE INDEX timesheet_groups_pig_idx
  ON public.timesheet_groups (tenant_id, pay_item_group_id);

ALTER TABLE public.timesheet_groups ENABLE ROW LEVEL SECURITY;

-- RLS: per AUTH_CANONICAL.md §"Verification preferences"
CREATE POLICY timesheet_groups_tenant_isolation
  ON public.timesheet_groups FOR ALL
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── RPC: reorder_pay_item_groups ─────────────────────────────────────────────
-- Transactional bulk-reorder; client sends array of {id, sort_order} pairs.
-- SECURITY INVOKER so RLS on pay_item_groups is respected; per AUTH_CANONICAL.md.

CREATE OR REPLACE FUNCTION public.reorder_pay_item_groups(
  p_items jsonb          -- [{id: uuid, sort_order: int}, ...]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (auth.jwt() ->> 'tenant_id')::uuid;
  v_item   jsonb;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'auth required — no tenant_id in JWT (AUTH_CANONICAL.md)';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.pay_item_groups
      SET sort_order = (v_item ->> 'sort_order')::int,
          updated_at = now()
    WHERE id = (v_item ->> 'id')::uuid
      AND tenant_id = v_tenant;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_pay_item_groups(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.reorder_pay_item_groups(jsonb) TO authenticated;

-- Same RPC pattern for timesheet_groups:
CREATE OR REPLACE FUNCTION public.reorder_timesheet_groups(
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (auth.jwt() ->> 'tenant_id')::uuid;
  v_item   jsonb;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'auth required — no tenant_id in JWT (AUTH_CANONICAL.md)';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.timesheet_groups
      SET sort_order = (v_item ->> 'sort_order')::int,
          updated_at = now()
    WHERE id = (v_item ->> 'id')::uuid
      AND tenant_id = v_tenant;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_timesheet_groups(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.reorder_timesheet_groups(jsonb) TO authenticated;
```

### Migration 4.B — `penalty_groups` + `allowance_groups`

```sql
-- name: 20260507002000_penalty_allowance_groups

-- ── penalty_groups ───────────────────────────────────────────────────────────
-- Additional penalty rate applied on top of a timesheet group.
-- Codehouse evidence: AnyTime Admin Guide p.41; OTS Set Up p.4
-- RLS: per AUTH_CANONICAL.md §"Verification preferences"

CREATE TABLE IF NOT EXISTS public.penalty_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  pay_item_group_id   uuid NOT NULL
    REFERENCES public.pay_item_groups (id) ON DELETE RESTRICT,
  name                text NOT NULL,
  code                text NOT NULL,
  sort_order          int  NOT NULL DEFAULT 0,
  hours_round_up      boolean NOT NULL DEFAULT false,  -- AnyTime Admin Guide p.41 "Hours Round Up flag"
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX penalty_groups_tenant_sort_idx
  ON public.penalty_groups (tenant_id, sort_order);
CREATE INDEX penalty_groups_pig_idx
  ON public.penalty_groups (tenant_id, pay_item_group_id);

ALTER TABLE public.penalty_groups ENABLE ROW LEVEL SECURITY;

-- RLS: per AUTH_CANONICAL.md §"Verification preferences"
CREATE POLICY penalty_groups_tenant_isolation
  ON public.penalty_groups FOR ALL
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── allowance_groups ─────────────────────────────────────────────────────────
-- Links allowances to pay item groups on the timesheet.
-- Codehouse evidence: AnyTime Admin Guide p.42; OTS Set Up p.5
-- RLS: per AUTH_CANONICAL.md §"Verification preferences"

CREATE TABLE IF NOT EXISTS public.allowance_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  pay_item_group_id   uuid NOT NULL
    REFERENCES public.pay_item_groups (id) ON DELETE RESTRICT,
  name                text NOT NULL,
  code                text NOT NULL,
  sort_order          int  NOT NULL DEFAULT 0,
  use_pay_rates       boolean NOT NULL DEFAULT false,  -- AnyTime Admin Guide p.42 "Use Pay Rates toggle"
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX allowance_groups_tenant_sort_idx
  ON public.allowance_groups (tenant_id, sort_order);
CREATE INDEX allowance_groups_pig_idx
  ON public.allowance_groups (tenant_id, pay_item_group_id);

ALTER TABLE public.allowance_groups ENABLE ROW LEVEL SECURITY;

-- RLS: per AUTH_CANONICAL.md §"Verification preferences"
CREATE POLICY allowance_groups_tenant_isolation
  ON public.allowance_groups FOR ALL
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Reorder RPCs (same pattern as 4.A; per AUTH_CANONICAL.md)
CREATE OR REPLACE FUNCTION public.reorder_penalty_groups(p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_tenant uuid := (auth.jwt() ->> 'tenant_id')::uuid; v_item jsonb;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'auth required (AUTH_CANONICAL.md)'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.penalty_groups SET sort_order=(v_item->>'sort_order')::int, updated_at=now()
    WHERE id=(v_item->>'id')::uuid AND tenant_id=v_tenant;
  END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reorder_penalty_groups(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.reorder_penalty_groups(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_allowance_groups(p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_tenant uuid := (auth.jwt() ->> 'tenant_id')::uuid; v_item jsonb;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'auth required (AUTH_CANONICAL.md)'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.allowance_groups SET sort_order=(v_item->>'sort_order')::int, updated_at=now()
    WHERE id=(v_item->>'id')::uuid AND tenant_id=v_tenant;
  END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reorder_allowance_groups(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.reorder_allowance_groups(jsonb) TO authenticated;
```

### Migration 4.C — `pay_item_rules` + placement FK + pay item type extensions

```sql
-- name: 20260507003000_pay_item_rules_and_type_extensions

-- ── pay item type enum extension ─────────────────────────────────────────────
-- Adds explicit types for rows 26-29, 31 (salary-sacrifice, child-support,
-- RDO accrual, back-pay, reimbursement) per WF1 FAQ evidence.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_item_category') THEN
    CREATE TYPE public.pay_item_category AS ENUM (
      'ordinary_time',         -- NT
      'overtime_1_5',          -- OT1.5
      'overtime_2_0',          -- OT2.0
      'annual_leave',
      'sick_leave',
      'rdo',                   -- Rostered Day Off (row 28 — WF1 FAQ "RDO Accrual")
      'public_holiday',
      'shift_allowance',
      'tool_allowance',
      'meal_allowance',
      'salary_sacrifice',      -- row 26 — WF1 FAQ "Salary Sacrifice"
      'child_support',         -- row 27 — WF1 FAQ "Child Support Deduction"
      'rdo_accrual',           -- row 28 — explicit accrual tracking variant
      'back_pay',              -- row 29 — WF1 FAQ "Back Pay Pay Item"
      'reimbursement',         -- row 31 — WF1 FAQ "Payroll – Pay Item – Reimbursement"
      'other'
    );
  END IF;
END $$;

-- ── pay_item_groups type + sort_priority columns ─────────────────────────────
-- Adds category (row 32 sort_priority) to pay_item_groups.

ALTER TABLE public.pay_item_groups
  ADD COLUMN IF NOT EXISTS category       public.pay_item_category,
  ADD COLUMN IF NOT EXISTS sort_priority  int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_salary_sacrifice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_child_support    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rdo_accrual      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_back_pay         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reimbursement    boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS pay_item_groups_sort_priority_idx
  ON public.pay_item_groups (tenant_id, sort_priority);

-- ── pay_item_rules ───────────────────────────────────────────────────────────
-- Per-placement award interpretation rules referencing Pay Item Groups.
-- Codehouse evidence: AnyTime Admin Guide pp.45-58; OTS Set Up pp.7-18
-- RLS: per AUTH_CANONICAL.md §"Verification preferences"

CREATE TABLE IF NOT EXISTS public.pay_item_rules (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL,
  name                    text NOT NULL,
  pay_item_group_id       uuid NOT NULL
    REFERENCES public.pay_item_groups (id) ON DELETE RESTRICT,
  rule_type               text NOT NULL CHECK (rule_type IN (
                            'daily','weekly','fortnightly')),  -- OTS Set Up p.7
  shift_start_time        time,
  shift_end_time          time,
  penalty_multiplier      numeric(5,4) NOT NULL DEFAULT 1.0,
  allowance_threshold_hrs numeric(5,2),                        -- trigger allowance after N hours
  max_hours_without_break numeric(4,2),                        -- OTS Set Up p.14
  is_active               boolean NOT NULL DEFAULT true,
  sort_order              int NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pay_item_rules_tenant_sort_idx
  ON public.pay_item_rules (tenant_id, sort_order);
CREATE INDEX pay_item_rules_pig_idx
  ON public.pay_item_rules (tenant_id, pay_item_group_id);

ALTER TABLE public.pay_item_rules ENABLE ROW LEVEL SECURITY;

-- RLS: per AUTH_CANONICAL.md §"Verification preferences"
CREATE POLICY pay_item_rules_tenant_isolation
  ON public.pay_item_rules FOR ALL
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── placements.ots_rule_id FK ─────────────────────────────────────────────────
-- Per-placement pay-item rule assignment (row 25; also matrix row 70 domain H).
ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS ots_rule_id uuid
    REFERENCES public.pay_item_rules (id) ON DELETE SET NULL;
```

---

## 5. Zod schemas

```typescript
// crm7/src/schemas/pay-item-groups.ts  (new file)
import { z } from 'zod';

// ── Pay Item Category ─────────────────────────────────────────────────────────
export const PayItemCategoryEnum = z.enum([
  'ordinary_time', 'overtime_1_5', 'overtime_2_0',
  'annual_leave', 'sick_leave', 'rdo',
  'public_holiday', 'shift_allowance', 'tool_allowance', 'meal_allowance',
  'salary_sacrifice',  // row 26 — WF1 FAQ "Salary Sacrifice"
  'child_support',     // row 27 — WF1 FAQ "Child Support Deduction"
  'rdo_accrual',       // row 28 — RDO Accrual
  'back_pay',          // row 29 — WF1 FAQ "Back Pay Pay Item"
  'reimbursement',     // row 31 — WF1 FAQ "Reimbursement"
  'other',
]);

// ── Pay Item Group ────────────────────────────────────────────────────────────
export const PayItemGroupSchema = z.object({
  id:             z.string().uuid().optional(),
  tenant_id:      z.string().uuid(),
  name:           z.string().min(1).max(120),
  code:           z.string().min(1).max(20).regex(/^[A-Z0-9_.-]+$/, 'Code must be uppercase alphanumeric'),
  description:    z.string().max(500).optional(),
  category:       PayItemCategoryEnum.optional(),
  sort_order:     z.coerce.number().int().min(0).default(0),
  sort_priority:  z.coerce.number().int().min(0).default(0),  // row 32 — Category Priority
  is_active:      z.boolean().default(true),
  is_salary_sacrifice: z.boolean().default(false),  // row 26
  is_child_support:    z.boolean().default(false),  // row 27
  is_rdo_accrual:      z.boolean().default(false),  // row 28
  is_back_pay:         z.boolean().default(false),  // row 29
  is_reimbursement:    z.boolean().default(false),  // row 31
});
export type PayItemGroup = z.infer<typeof PayItemGroupSchema>;

export const PayItemGroupCreateSchema = PayItemGroupSchema
  .omit({ id: true })
  .required({ tenant_id: true, name: true, code: true });

export const ReorderItemSchema = z.object({
  id:         z.string().uuid(),
  sort_order: z.coerce.number().int().min(0),
});
export const ReorderPayloadSchema = z.array(ReorderItemSchema).min(1).max(500);

// ── Timesheet Group ───────────────────────────────────────────────────────────
// Codehouse: AnyTime Admin Guide p.40; OTS Set Up p.3
export const TimesheetGroupSchema = z.object({
  id:                 z.string().uuid().optional(),
  tenant_id:          z.string().uuid(),
  pay_item_group_id:  z.string().uuid(),
  name:               z.string().min(1).max(120),
  code:               z.string().min(1).max(20).regex(/^[A-Z0-9_.-]+$/),
  sort_order:         z.coerce.number().int().min(0).default(0),
  is_active:          z.boolean().default(true),
});
export type TimesheetGroup = z.infer<typeof TimesheetGroupSchema>;

// ── Penalty Group ─────────────────────────────────────────────────────────────
// Codehouse: AnyTime Admin Guide p.41 — has Code, Order, Hours Round Up flag
export const PenaltyGroupSchema = z.object({
  id:                 z.string().uuid().optional(),
  tenant_id:          z.string().uuid(),
  pay_item_group_id:  z.string().uuid(),
  name:               z.string().min(1).max(120),
  code:               z.string().min(1).max(20).regex(/^[A-Z0-9_.-]+$/),
  sort_order:         z.coerce.number().int().min(0).default(0),
  hours_round_up:     z.boolean().default(false),
  is_active:          z.boolean().default(true),
});
export type PenaltyGroup = z.infer<typeof PenaltyGroupSchema>;

// ── Allowance Group ───────────────────────────────────────────────────────────
// Codehouse: AnyTime Admin Guide p.42 — has Code, Order, Use Pay Rates toggle
export const AllowanceGroupSchema = z.object({
  id:                 z.string().uuid().optional(),
  tenant_id:          z.string().uuid(),
  pay_item_group_id:  z.string().uuid(),
  name:               z.string().min(1).max(120),
  code:               z.string().min(1).max(20).regex(/^[A-Z0-9_.-]+$/),
  sort_order:         z.coerce.number().int().min(0).default(0),
  use_pay_rates:      z.boolean().default(false),
  is_active:          z.boolean().default(true),
});
export type AllowanceGroup = z.infer<typeof AllowanceGroupSchema>;

// ── Pay Item Rule ─────────────────────────────────────────────────────────────
// Codehouse: AnyTime Admin Guide pp.45-58; OTS Set Up pp.7-18
export const PayItemRuleSchema = z.object({
  id:                       z.string().uuid().optional(),
  tenant_id:                z.string().uuid(),
  name:                     z.string().min(1).max(120),
  pay_item_group_id:        z.string().uuid(),
  rule_type:                z.enum(['daily', 'weekly', 'fortnightly']),
  shift_start_time:         z.string().regex(/^\d{2}:\d{2}$/).optional(),
  shift_end_time:           z.string().regex(/^\d{2}:\d{2}$/).optional(),
  penalty_multiplier:       z.coerce.number().min(1.0).max(4.0).default(1.0),
  allowance_threshold_hrs:  z.coerce.number().min(0).max(24).optional(),
  max_hours_without_break:  z.coerce.number().min(0).max(24).optional(),
  sort_order:               z.coerce.number().int().min(0).default(0),
  is_active:                z.boolean().default(true),
}).refine(
  d => !(d.shift_start_time && d.shift_end_time) ||
       d.shift_start_time < d.shift_end_time,
  { message: 'shift_start_time must be before shift_end_time', path: ['shift_end_time'] },
);
export type PayItemRule = z.infer<typeof PayItemRuleSchema>;
```

---

## 6. Service / RPC layer

### 6.1 `payItemGroupService.ts`

```typescript
// crm7/src/services/payItemGroupService.ts  (new)
import { supabase } from '@/lib/supabase/client';
import {
  PayItemGroupCreateSchema, PayItemGroup, ReorderPayloadSchema,
} from '@/schemas/pay-item-groups';

export const payItemGroupService = {
  list: async (tenantId: string): Promise<PayItemGroup[]> => {
    const { data, error } = await supabase
      .from('pay_item_groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  create: async (input: unknown): Promise<PayItemGroup> => {
    const parsed = PayItemGroupCreateSchema.parse(input);
    const { data, error } = await supabase
      .from('pay_item_groups')
      .insert(parsed)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, input: unknown): Promise<PayItemGroup> => {
    const parsed = PayItemGroupCreateSchema.partial().parse(input);
    const { data, error } = await supabase
      .from('pay_item_groups')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('pay_item_groups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  reorder: async (items: unknown): Promise<void> => {
    const parsed = ReorderPayloadSchema.parse(items);
    const { error } = await supabase.rpc('reorder_pay_item_groups', {
      p_items: JSON.stringify(parsed),
    });
    if (error) throw error;
  },
};
```

### 6.2 `timesheetGroupService.ts`, `penaltyGroupService.ts`, `allowanceGroupService.ts`

Mirror the same 5-method pattern as `payItemGroupService` with their respective table names and reorder RPC names (`reorder_timesheet_groups`, `reorder_penalty_groups`, `reorder_allowance_groups`). Omit for brevity — implementing agent generates from this template.

### 6.3 `payItemRuleService.ts`

```typescript
// crm7/src/services/payItemRuleService.ts  (new)
import { supabase } from '@/lib/supabase/client';
import { PayItemRuleSchema, PayItemRule } from '@/schemas/pay-item-groups';

export const payItemRuleService = {
  list: async (tenantId: string): Promise<PayItemRule[]> => {
    const { data, error } = await supabase
      .from('pay_item_rules')
      .select('*, pay_item_group:pay_item_groups(id, name, code)')
      .eq('tenant_id', tenantId)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },

  create: async (input: unknown): Promise<PayItemRule> => {
    const parsed = PayItemRuleSchema.omit({ id: true }).parse(input);
    const { data, error } = await supabase
      .from('pay_item_rules')
      .insert(parsed)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  assignToPlacement: async (placementId: string, ruleId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('placements')
      .update({ ots_rule_id: ruleId, updated_at: new Date().toISOString() })
      .eq('id', placementId);
    if (error) throw error;
  },
};
```

### 6.4 TanStack Query hooks (pattern)

```typescript
// crm7/src/hooks/usePayItemGroups.ts  (new)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payItemGroupService } from '@/services/payItemGroupService';
import { useTenantId } from '@/hooks/useTenantId';

export function usePayItemGroups() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['pay_item_groups', tenantId],
    queryFn:  () => payItemGroupService.list(tenantId),
    enabled:  Boolean(tenantId),
  });
}

export function useReorderPayItemGroups() {
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn:  payItemGroupService.reorder,
    onSuccess:   () => qc.invalidateQueries({ queryKey: ['pay_item_groups', tenantId] }),
  });
}
```

---

## 7. Tests

### 7.1 pgTAP — migration contract tests

```sql
-- crm7/supabase/tests/pay_item_groups_rls.sql
BEGIN;
SELECT plan(8);

-- 1. tenant A cannot read tenant B rows
SELECT results_eq(
  $$SELECT count(*) FROM public.pay_item_groups$$,
  $$VALUES (0::bigint)$$,
  'anon sees no pay_item_groups rows'
);

-- 2. RLS blocks cross-tenant write
-- (full pgTAP suite: set_config tenant_id to fixture A, assert fixture B row hidden)
-- ... (implementing agent expands to 8 tests covering SELECT/INSERT/UPDATE/DELETE × 2 tenants)

SELECT finish();
ROLLBACK;
```

### 7.2 Vitest — service unit tests

```typescript
// crm7/src/services/__tests__/payItemGroupService.test.ts  (new)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { payItemGroupService } from '../payItemGroupService';

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

describe('payItemGroupService', () => {
  it('rejects create with invalid code characters', async () => {
    await expect(
      payItemGroupService.create({ tenant_id: 'x', name: 'NT', code: 'nt lower' })
    ).rejects.toThrow();
  });
  it('reorder sends correct RPC payload', async () => { /* ... */ });
});
```

### 7.3 Playwright smoke tests

```typescript
// crm7/e2e/pay-item-groups-parity.spec.ts  (new)
import { test, expect } from '@playwright/test';

test.describe('Pay Item Groups settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/pay-item-groups');
  });

  test('creates a new Pay Item Group', async ({ page }) => {
    await page.click('[data-testid="add-pay-item-group"]');
    await page.fill('[name="name"]', 'Ordinary Time');
    await page.fill('[name="code"]', 'NT');
    await page.click('[data-testid="save-group"]');
    await expect(page.locator('text=Ordinary Time')).toBeVisible();
  });

  test('drag-to-reorder updates sort_order', async ({ page }) => { /* dnd-kit reorder */ });
  test('delete blocked when group referenced by a rule (shows confirmation)', async ({ page }) => { /* */ });
  test('keyboard accessible — tab + space to toggle, enter to save', async ({ page }) => { /* */ });
});
```

### 7.4 RLS contract test (Playwright + service_role probe)

```typescript
// crm7/e2e/pay-item-groups-rls-contract.spec.ts  (new)
// Logs in as Tenant A, creates a group, then logs in as Tenant B and verifies
// the Tenant A group is not visible.  Uses supabase service_role only in the
// setup phase; all assertions use the anon/authenticated client.
test('tenant isolation: Tenant B cannot see Tenant A pay_item_groups', async ({ page }) => {
  // ... fixture setup + assertion
});
```

---

## 8. Doc drift

The following documents require updates when each implementation PR merges:

| Document | Section | Change required |
|---|---|---|
| [`competitor/bsuite-inventory.md`](../../../competitor/bsuite-inventory.md) | §C (Pay items, work types) | Change status to ✅ for rows 21–29, 31–32; update "named pay-item group entity absent" item 7 |
| [`competitor/parity-matrix.md`](../../../competitor/parity-matrix.md) | Rows 21–29, 31–32 | Update status column from 🔴/🟡 to ✅; update "Current BSuite state" cell for each row |
| ~~`crm7/OUTSTANDING.md`~~ | N/A — removed 2026-05-19 (bsuite#488); the parent `docs/OUTSTANDING.md` row below covers it |
| [`docs/OUTSTANDING.md`](../../OUTSTANDING.md) | Domain C outstanding | Tick off domain C gaps (SSoT for all submodules per bsuite#488) |
| [`packages/charge-calc/README.md`](../../../packages/charge-calc/README.md) | Named group types | Add: `pay_item_groups` table is now the canonical source for group IDs; enum aliases remain for backward compat |
| [`crm7/src/pages/settings/README.md`](../../../crm7/src/pages/settings/README.md) (if exists) | Settings pages | Add: pay-item-groups, timesheet-groups, penalty-groups, allowance-groups, pay-item-rules |

---

## 9. PR template

Use this body template for each PR in the ladder:

### PR-A: pay_item_groups + timesheet_groups schema

```
**Title:** feat(crm7): PARITY-569-A — pay_item_groups + timesheet_groups schema + reorder RPCs

**Body:**
## Summary
Ships `pay_item_groups` and `timesheet_groups` tables with RLS and transactional reorder RPCs.
Closes matrix rows 21 (schema) and 22 (schema) from [bsuite#569](https://github.com/GaryOcean428/bsuite/issues/569).

## Changes
- `crm7/supabase/migrations/20260507001000_pay_item_groups.sql` — new
- `crm7/src/schemas/pay-item-groups.ts` — new (Zod schemas)

## Auth / RLS
- RLS enabled on both tables per [AUTH_CANONICAL.md](../../../AUTH_CANONICAL.md) §"Verification preferences"
- RPCs are SECURITY INVOKER — service_role never exposed to client

## Test
- pgTAP: `crm7/supabase/tests/pay_item_groups_rls.sql`
- Vitest: `crm7/src/services/__tests__/payItemGroupService.test.ts`

## Doc drift
- [ ] bsuite-inventory.md §C (update after merge)
- [ ] parity-matrix.md rows 21, 22

## Checklist
- [ ] Migration applied to dev branch via `mcp__supabase__apply_migration`
- [ ] RLS policies verified with pgTAP
- [ ] No `cookieStorage` / `domain=.crm7.app` patterns (AUTH_CANONICAL.md)
- [ ] Conventional commit: `feat(crm7): PARITY-569-A …`

Closes research portion of bsuite#569 (schema step).
```

Repeat pattern for PR-B through PR-G substituting the relevant rows, files, and closes references.

---

## 10. Red-team table

| Sub-agent | Specific concern | How this spec addresses it |
|---|---|---|
| **UX-DX** | Four new settings pages must follow `DraggableCardPage` pattern; dnd-kit reorder must be keyboard accessible (WCAG 2.2 SC 2.1.1). Sort order must persist optimistically so drag feels instant. | §3 mandates dnd-kit v6 sortable preset. Reorder RPC is transactional — optimistic update via TanStack Query `onMutate`. Keyboard: dnd-kit sortable keyboard sensor built-in. |
| **Security** | Cross-tenant group data leakage; `service_role` exposure in client code; unsanitised `code` field used as abbreviation. | §4 RLS on all 5 new tables use `(auth.jwt() ->> 'tenant_id')::uuid`, per [AUTH_CANONICAL.md](../../../AUTH_CANONICAL.md). All RPCs `SECURITY INVOKER`. Zod `code` field regex `/^[A-Z0-9_.-]+$/` blocks injection. §7.4 RLS contract Playwright test. |
| **Performance** | Group list queries on large tenants; reorder causing N individual updates. | §4 defines `(tenant_id, sort_order)` composite index on all 5 tables. Reorder RPCs batch all updates in a single PL/pgSQL loop — one RPC call, not N. TanStack Query `staleTime` avoids redundant refetches. |
| **Reliability** | Deleting a group referenced by a `timesheet_groups`, `penalty_groups`, `allowance_groups`, or `pay_item_rules` row must not leave orphaned FK violations. UI must confirm and list affected entities before delete. | §4 migration uses `ON DELETE RESTRICT` on all FKs into `pay_item_groups`. Service `delete()` must catch `23503` FK violation code and surface a user-readable error with the constraint name. UI shows confirmation dialog listing referencing rows. |
| **Quality** | `@bsuite/charge-calc` enum arrays continue to be used alongside new named entity IDs, creating dual-source-of-truth. Conventional commits. No dead code. | §3 PR-G explicitly migrates charge-calc to reference named entity UUIDs. PR-F is gated to ship before PR-G. Zod enums in §5 are canonical; charge-calc imports from `crm7/src/schemas/pay-item-groups.ts` or a promoted shared package. |

---

## 11. Smoke test plan

Operator-runnable steps to verify each PR ships correctly.

### PR-A / PR-B verification

1. Open Supabase dashboard → Table Editor for project `tuybltdrdefjblnplpqo`.
2. Confirm tables `pay_item_groups`, `timesheet_groups`, `penalty_groups`, `allowance_groups` are visible.
3. Run `SELECT * FROM public.pay_item_groups LIMIT 1` as `anon` role — expect 0 rows (RLS blocks unauthenticated reads).
4. Run pgTAP suite: `supabase test db`.

### PR-C / PR-D verification

1. Log into crm7 as `org_admin`.
2. Navigate to **Settings → Pay Item Groups**.
3. Click **Add Group** → fill Name="Ordinary Time", Code="NT" → Save. Confirm row appears.
4. Drag "Ordinary Time" to a different sort position. Reload page — confirm order persisted.
5. Navigate to **Settings → Timesheet Groups** → Add a group linked to "Ordinary Time". Confirm FK relationship visible.
6. Repeat for Penalty Groups (set Hours Round Up = true) and Allowance Groups (set Use Pay Rates = true).

### PR-E verification

1. Navigate to **Settings → Pay Item Rules** → Create a rule (type=daily, group=NT, penalty_multiplier=1.5).
2. Navigate to a **Placement** detail page → confirm "OTS Rule" dropdown shows the newly created rule.
3. Assign the rule → Save. Reload placement page → confirm rule still assigned.

### PR-F verification

1. Navigate to **Settings → Pay Item Groups**.
2. Edit "Ordinary Time" → confirm checkboxes for salary-sacrifice, child-support, RDO-accrual, back-pay, reimbursement are visible.
3. Set `sort_priority` field to 1 → save.
4. Confirm that a group created with `is_back_pay = true` appears in the "back-pay" category filter.

### PR-G verification

1. Run `@bsuite/charge-calc` test suite: `pnpm --filter @bsuite/charge-calc test`.
2. Confirm `calculate()` accepts `pay_item_group_id` UUID and maps to named group entity (not enum string).
3. No TypeScript errors: `pnpm --filter @bsuite/charge-calc tsc --noEmit`.

---

## 12. Citations

| Reference | URL |
|---|---|
| AnyTime Admin Guide (WF1_Pay_027) — Codehouse PDF | [https://help.codehouseworkforce.com.au](https://help.codehouseworkforce.com.au) (pp.39–58) |
| OTS Set Up (WF1_OTS_001) — Codehouse PDF | [https://help.codehouseworkforce.com.au](https://help.codehouseworkforce.com.au) (pp.1–18) |
| Supabase Row Level Security 2026 | [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Supabase PL/pgSQL functions | [https://supabase.com/docs/guides/database/functions](https://supabase.com/docs/guides/database/functions) |
| dnd-kit sortable preset | [https://dndkit.com/docs/presets/sortable](https://dndkit.com/docs/presets/sortable) |
| dnd-kit keyboard sensor (WCAG 2.1.1) | [https://dndkit.com/docs/sensors/keyboard](https://dndkit.com/docs/sensors/keyboard) |
| TanStack Query v5 mutations | [https://tanstack.com/query/latest/docs/framework/react/guides/mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) |
| React Hook Form v7 | [https://react-hook-form.com/docs](https://react-hook-form.com/docs) |
| Zod v3 | [https://zod.dev](https://zod.dev) |
| shadcn/ui DataTable | [https://ui.shadcn.com/docs/components/data-table](https://ui.shadcn.com/docs/components/data-table) |
| Tailwind v4 (OKLCH colors) | [https://tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) |
| React 19 | [https://react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19) |
| Zustand v5 | [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |
| pgTAP — PostgreSQL unit testing | [https://pgtap.org](https://pgtap.org) |
| Playwright test | [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro) |
| AUTH_CANONICAL.md (internal) | [`AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) |
| parity-matrix.md (internal) | [`competitor/parity-matrix.md`](../../../competitor/parity-matrix.md) |
| bsuite-inventory.md §C (internal) | [`competitor/bsuite-inventory.md`](../../../competitor/bsuite-inventory.md) |
| WCAG 2.2 SC 2.1.1 Keyboard | [https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) |

---

*Spec authored by perplexity-computer, cron run-16, 2026-05-07. Implementation lane (PR-A through PR-G) can be claimed independently by claude-code-local or codebuff.*
