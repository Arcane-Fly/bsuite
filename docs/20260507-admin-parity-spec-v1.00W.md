# Admin parity spec — 14 Codehouse gaps (closes #578 research portion)

**Status:** WORKING (`v1.00W`) — research-lane specification, not yet implemented
**Owner:** perplexity-computer (autonomous overnight cron — FF-AUTONOMY-20260506)
**Closes:** [GaryOcean428/bsuite#578](https://github.com/GaryOcean428/bsuite/issues/578) (research portion)
**Implementation tracker:** PR ladder filed by claude or copilot per Cron A routing matrix
**Live schema verified:** 2026-05-07 via Supabase MCP project `tuybltdrdefjblnplpqo`
**Source matrix rows:** 68–70, 72–73, 98, 102–103, 106–108, 111–114 (parity-matrix.md)
**Domains covered:** H (placements + hiring), L (imports), M (admin/settings), N (payroll-tax)

---

## 1. Scope (FULL — not MVP)

This single spec covers **14 distinct admin/settings parity gaps** spanning three Codehouse-Workforce-One domains:

| Matrix row | Domain | Codehouse name | BSuite state | Gap class |
|---|---|---|---|---|
| 68 | H | Hiring Division (per-org with super guarantee rate) | placements lacks `hiring_division_id` | 🟡 partial |
| 69 | H | COA template type | document_templates exists, COA category not enumerated | 🟡 partial |
| 70 | H | Pay-Item Rule + Stream + PH-Group on placement | placements has none | 🔴 gap |
| 72 | H | Public Holiday Group (per-placement/client) | no entity | ⛔ missing |
| 73 | H | Purchase Orders on hiring (with bulk import) | no entity | 🔴 gap |
| 98 | L | Employee CSV bulk import (preview + row errors) | generic importExportService only | 🟡 partial |
| 102 | M | Business Rules (named admin entity) | workflow_triggers exists, not surfaced | 🟡 partial |
| 103 | M | Dynamic Forms (named admin UI) | form_layouts + @bsuite/schema-builder live, not surfaced | 🟡 partial |
| 106 | M | Classification + Sub-Classification (CRUD with parent/child) | award_classifications + picklists, not unified | 🟡 partial |
| 108 | M | CITB Levy config | no entity | ⛔ missing |
| 111 | N | TFN Declaration form | apprentices has none | 🟡 partial |
| 112 | N | ETP (Employment Termination Payment) pay item type | no pay_items table at all | ⛔ missing |
| 113 | N | Lump Sum pay item type (A/B/D/E per ATO) | no pay_items table | ⛔ missing |
| 114 | N | FBT (Fringe Benefits Tax) per employee | apprentices has none | ⛔ missing |

**No MVPs.** Per operator directive (2026-05-06): each gap closed to full Codehouse parity, with WCAG-AA UX in light + dark, RHF+Zod + cross-field rules, RLS-enforced auth, Supabase migrations honoring AUTH_CANONICAL.md.

**Out of scope for this spec:** STP Phase-2 wire-up of ETP/Lump Sum/FBT to ATO submission payload (separate ticket — covered by #570 MYOB+Astute adapter spec).

---

## 2. Live schema reference (Supabase project `tuybltdrdefjblnplpqo`)

Verified 2026-05-07T00:09Z via `mcp__supabase__execute_sql`:

### Existing tables (relevant subset)

```
placements
  (id, tenant_id, apprentice_id, employer_id, client_id, position_title,
   award_code, classification, employment_type, start_date, end_date,
   expected_completion, hourly_rate, charge_rate, margin_rate, status,
   notes, custom_fields, created_by, created_at, updated_at,
   workforceone_placement_id, supervisor_name, supervisor_phone,
   supervisor_email, supervisor_contact_id, award_rate_id,
   award_rate_resolution_status)

apprentices
  (id, tenant_id, contact_id, first_name, last_name, email,
   current_host_employer_id, qualification_code, start_date, status,
   created_at, updated_at, custom_fields, phone, date_of_birth, end_date,
   usi, usi_verified_at, qualification_id)

award_classifications
  (id, award_id, name, level, aqf_level, description, is_active)

picklists
  (id, tenant_id, scope, name, label, description, is_active, is_system,
   is_locked, created_by, created_at, updated_at)

picklist_options
  (id, picklist_id, value, label, color, icon, sort_order, is_active,
   metadata, created_at)

document_templates
  (id, tenant_id, name, description, document_type, body, variables,
   category, version, is_active, custom_fields, created_at, updated_at)

form_layouts
  (id, tenant_id, scope, entity_type, context, name, version, is_active,
   is_locked, layout, created_by, created_at, updated_at)

workflow_triggers
  (id, org_id, name, trigger_type, conditions, actions, is_active,
   created_at)

pay_runs
  (id, tenant_id, pay_period_start, pay_period_end, payment_date, status,
   total_gross, total_tax, total_super, total_net, timesheet_count,
   xero_payrun_id, xero_synced_at, stp_submitted_at, notes, created_by,
   created_at, updated_at)

apprentice_placements
  (id, apprentice_id, host_employer_id, mentor_id, mentor_contact_id,
   start_date, end_date, is_current, status, termination_reason,
   termination_category, performance_rating, attendance_rating, notes,
   created_at, updated_at)

organizations
  (id, name, tier, created_at, kind)
```

### Missing tables (must be created)

```
hiring_divisions, public_holiday_groups, public_holiday_dates,
purchase_orders, ots_rules, ots_streams, classifications (unified),
citb_levy_config, tfn_declarations, pay_item_types, pay_items,
employee_payroll_extensions, business_rules (view), dynamic_forms (view),
employee_imports
```

> **Critical implementation gate:** the `current_tenant_id()` SQL function is referenced throughout this spec. Implementation step 578.0 must verify it exists in production schema (per #602 red-team finding) and create it if missing — `RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid; $$` is the canonical pattern (AUTH_CANONICAL.md §3.4).

---

## 3. Decomposition into 7 ship-able PRs

Each PR sized 1.5h–3h. Order matters: schema-only PRs first, then UI rollups. Implementation should follow the dependency arrow.

```
578.1 (schema A, H+M)         578.2 (schema B, N)
   │                              │
   ├──► 578.3 (UI: hiring/PH/PO)  ├──► 578.5 (UI: TFN/FBT/ETP/Lump Sum)
   │                              │
   ├──► 578.4 (UI: import wizard) │
   │                              │
   └──► 578.6 (UI: admin nav surfacing — Business Rules, Dynamic Forms,
                                   Classifications, CITB)
                                   │
                              578.7 (e2e + dashboard refresh)
```

### 578.1 — Schema A: Hiring/Placements/Imports (matrix 68, 70, 72–73, 98, 106) ~2h

Tables created:
- `hiring_divisions` — tenant-scoped, with `super_guarantee_rate` numeric(5,4) default 0.115
- `public_holiday_groups` + `public_holiday_dates` (group_id, date, name)
- `purchase_orders` — placement-scoped, `po_number text`, `amount numeric`, `status enum`, `expires_at`
- `ots_rules` (id, name, description) + `ots_streams` (id, name, description)
- `classifications` — unified, parent-child via `parent_id self-FK`, replaces ad-hoc `award_classifications.name` use
- `employee_imports` — import-job table (id, tenant_id, status enum [queued|processing|done|failed|partial], total_rows int, success_rows int, error_rows jsonb, source_filename text, created_by, started_at, completed_at)

Columns added to `placements`:
- `hiring_division_id uuid REFERENCES hiring_divisions(id)`
- `ots_rule_id uuid REFERENCES ots_rules(id)`
- `ots_stream_id uuid REFERENCES ots_streams(id)`
- `public_holiday_group_id uuid REFERENCES public_holiday_groups(id)`
- `purchase_order_id uuid REFERENCES purchase_orders(id)` (nullable; placement may have multiple POs over its lifetime — see comment below)

> **Design note:** an alternative is `purchase_orders.placement_id` FK pointing back to placement, not the other way around. Codehouse PDF (WF1_Admin_Purchase_Orders) shows POs *belong to* a hiring; multiple POs per placement supported. Implementation should choose the latter — placement → many POs — and migrate the FK accordingly.

### 578.2 — Schema B: Payroll-tax extensions (matrix 111–114) ~2h

Tables created:
- `pay_item_types` — seed data (ordinary, overtime, allowance, leave, ETP-R, ETP-O, lump-sum-A, lump-sum-B, lump-sum-D, lump-sum-E, FBT-reportable)
- `pay_items` — full table (id, tenant_id, code, name, type_id FK, gl_account, taxable bool, super_eligible bool, stp_category text [per ATO STP Phase 2 disaggregated gross], is_active, created_at)
- `tfn_declarations` — per employee (id, apprentice_id FK, tfn_encrypted text, residency_status enum, tax_free_threshold_claimed bool, help_debt bool, vsl_debt bool, medicare_levy_exemption enum, declared_date date, signed_pdf_url text, created_at)

Columns added to `apprentices`:
- `fbt_reportable_amount numeric(12,2) default 0`
- `etp_eligible bool default false` (computed flag based on termination_reason + tenure)
- `lump_sum_eligible bool default false` (similar)
- `termination_date date` (currently only on `apprentice_placements.end_date`; pulled forward for ETP gating)

Constraints:
- `pay_items.code UNIQUE PER tenant_id`
- `tfn_declarations.tfn_encrypted` must use `pgcrypto` `pgp_sym_encrypt` with key from `vault.secrets.tfn_encryption_key` (AUTH_CANONICAL §6 — secrets in Vault, not env)
- TFN format check before encryption: ATO Mod-10 algorithm (pure JS in `@bsuite/payroll-validators` package — see §5)

CITB:
- Table `citb_levy_config` (id, tenant_id, is_active, levy_rate numeric(5,4), threshold_amount numeric, effective_from date, created_at, updated_at). Single-row-per-tenant enforced via partial UNIQUE index `WHERE is_active=true`.

### 578.3 — UI: Hiring Division + PH Group + PO + Placement detail (matrix 68, 70, 72–73) ~3h

New crm7 routes:
- `src/pages/settings/hiring-divisions.tsx` — `DraggableCardPage` of divisions; CRUD via TanStack Query mutations; `RHF + Zod` form on edit
- `src/pages/settings/public-holiday-groups.tsx` — list + nested `PublicHolidayDateEditor` modal
- `src/pages/placements/[id]/purchase-orders.tsx` — sub-route for PO list + add modal
- Updated `src/pages/placements/[id].tsx` — add 4 selectors (hiring division, OTS rule, OTS stream, PH group) using `shadcn/ui Select` + TanStack Query for option loading

### 578.4 — UI: Employee CSV import wizard (matrix 98) ~2.5h

Replace stub in `src/pages/settings/import-export.tsx` with a proper wizard:
- Step 1 — Upload CSV (`react-dropzone` already in deps)
- Step 2 — Column mapping (drag-and-drop columns to BSuite fields via `@dnd-kit/sortable`)
- Step 3 — Preview (first 5 rows rendered as ag-grid with type-coerced values + per-cell validation badges)
- Step 4 — Commit (POST to `/api/imports/employees` which queues a Supabase Edge Function `process-employee-import`; live progress via Supabase Realtime subscription on `employee_imports.status`)
- Step 5 — Result (download error CSV with row + reason; success rows linked to created employee profiles)

Edge Function `process-employee-import` processes in batches of 50, writes per-row errors to `employee_imports.error_rows` JSONB, returns final summary.

### 578.5 — UI: TFN/FBT/ETP/Lump Sum on employee profile (matrix 111–114) ~2.5h

In `src/pages/placements/[id].tsx` (already the de-facto employee detail page), add:
- **Payroll tab** (new shadcn `Tabs` value="payroll")
  - TFN Declaration card (form: TFN, residency_status, tax_free_threshold, help_debt, vsl_debt, medicare_levy_exemption; "Sign + save" button → upload PDF + write `tfn_declarations` row + encrypt TFN via Supabase RPC `encrypt_tfn`)
  - FBT card (single numeric field `fbt_reportable_amount`, fiscal-year selector)
  - ETP eligibility banner (auto-shown if `apprentices.termination_date IS NOT NULL`; click-through opens "Create ETP pay item" modal)
  - Lump-sum payments table (list of pay_items where type IN lump-sum-*; "Add lump-sum" button)

RLS: TFN, FBT, ETP, Lump-sum read+write require role `org_admin` OR `gto_admin` (verify via `auth.jwt() -> 'app_metadata' -> 'role'` per AUTH_CANONICAL §4). Field-level masking on read (last 4 digits of TFN unless full reveal claim).

### 578.6 — Admin nav surfacing: Business Rules, Dynamic Forms, Classifications, CITB ~2h

New routes in crm7:
- `src/pages/settings/business-rules.tsx` — wraps existing `WorkflowBuilder.tsx` filtered to `trigger_type IN ('business_rule_*')` set
- `src/pages/settings/dynamic-forms.tsx` — wraps `@bsuite/schema-builder` exposing form_layouts CRUD
- `src/pages/settings/classifications.tsx` — TreeView (using `@dnd-kit/sortable` for reordering siblings) backed by unified `classifications` table; parent → child via `parent_id`
- `src/pages/settings/citb.tsx` — single-row-per-tenant config form (RHF+Zod)

Update `src/components/SettingsNav.tsx` to add 4 new entries under "Admin" group with appropriate icons (Lucide `Workflow`, `FileText`, `ListTree`, `Building2`).

### 578.7 — End-to-end test + dashboard refresh ~1.5h

- Playwright test `e2e/admin-parity.spec.ts` — happy path that:
  1. Logs in as org_admin
  2. Creates hiring division
  3. Creates PH group with 3 dates
  4. Creates classification with sub-classification
  5. Imports 3 employees via CSV (with one validation error row)
  6. Opens employee → adds TFN declaration → adds FBT amount → adds ETP pay item
  7. Verifies all entities appear on placement detail and STP-ready columns are populated

- After PR merge, fire `gh api repos/GaryOcean428/bsuite/dispatches -X POST --field event_type='dashboard-refresh'` (Step 9 of cron A spec) to refresh the live dashboard at https://garyocean428.github.io/bsuite/.

---

## 4. Migrations (copy-paste-ready)

> All migrations applied via `mcp__supabase__apply_migration` (per Cron C and supabase skill rules — never raw `execute_sql` for DDL).

### Migration 578.1.A — hiring_divisions, OTS, classifications, employee_imports

```sql
-- name: 20260507_admin_parity_578_schema_a

CREATE TABLE IF NOT EXISTS public.hiring_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  super_guarantee_rate numeric(5,4) NOT NULL DEFAULT 0.115,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.public_holiday_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  state_code text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.public_holiday_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.public_holiday_groups(id) ON DELETE CASCADE,
  ph_date date NOT NULL,
  name text NOT NULL,
  UNIQUE (group_id, ph_date)
);

CREATE TABLE IF NOT EXISTS public.ots_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active bool NOT NULL DEFAULT true,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.ots_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active bool NOT NULL DEFAULT true,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parent_id uuid REFERENCES public.classifications(id) ON DELETE RESTRICT,
  award_id uuid REFERENCES public.award_classifications(id),
  name text NOT NULL,
  code text,
  level int,
  description text,
  is_active bool NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, parent_id, name)
);
CREATE INDEX classifications_parent_idx ON public.classifications(parent_id);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  placement_id uuid REFERENCES public.placements(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_used','closed','cancelled')),
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, po_number)
);
CREATE INDEX purchase_orders_placement_idx ON public.purchase_orders(placement_id);

CREATE TABLE IF NOT EXISTS public.employee_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed','partial')),
  total_rows int NOT NULL DEFAULT 0,
  success_rows int NOT NULL DEFAULT 0,
  error_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_filename text,
  created_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS hiring_division_id uuid REFERENCES public.hiring_divisions(id),
  ADD COLUMN IF NOT EXISTS ots_rule_id uuid REFERENCES public.ots_rules(id),
  ADD COLUMN IF NOT EXISTS ots_stream_id uuid REFERENCES public.ots_streams(id),
  ADD COLUMN IF NOT EXISTS public_holiday_group_id uuid REFERENCES public.public_holiday_groups(id);

-- RLS: tenant isolation across all 7 new tables
ALTER TABLE public.hiring_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holiday_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holiday_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ots_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ots_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_imports ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy template (AUTH_CANONICAL.md §5):
CREATE POLICY tenant_isolation ON public.hiring_divisions FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
-- Repeat the template above for each table.

-- (PH dates inherit via group_id chain — separate policy uses join.)
CREATE POLICY tenant_isolation_via_group ON public.public_holiday_dates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.public_holiday_groups g
                 WHERE g.id = public_holiday_dates.group_id
                   AND g.tenant_id = public.current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.public_holiday_groups g
                      WHERE g.id = public_holiday_dates.group_id
                        AND g.tenant_id = public.current_tenant_id()));

-- Admin write policy on settings tables (only org_admin / gto_admin):
CREATE POLICY admin_write ON public.hiring_divisions FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.hiring_divisions FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
-- Repeat for the other settings tables.
```

### Migration 578.2.A — payroll-tax (TFN, FBT, ETP, Lump Sum, CITB)

```sql
-- name: 20260507_admin_parity_578_schema_b

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.pay_item_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('ordinary','overtime','allowance','leave','etp','lump_sum','fbt','other')),
  stp_phase2_code text,                       -- ATO STP Phase 2 disaggregated gross category
  is_taxable bool NOT NULL DEFAULT true,
  is_super_eligible bool NOT NULL DEFAULT true
);
INSERT INTO public.pay_item_types (code,label,category,stp_phase2_code,is_taxable,is_super_eligible) VALUES
  ('ordinary','Ordinary time earnings','ordinary','GROSS',true,true),
  ('overtime','Overtime','overtime','OVERTIME',true,false),
  ('allowance','Allowance','allowance','ALLOW',true,false),
  ('leave','Leave','leave','PAID_LEAVE',true,true),
  ('etp_r','ETP Type R (genuine redundancy)','etp','ETP_R',true,false),
  ('etp_o','ETP Type O (other)','etp','ETP_O',true,false),
  ('lump_a','Lump Sum A (long service)','lump_sum','LUMP_A',true,false),
  ('lump_b','Lump Sum B (pre-1983 leave)','lump_sum','LUMP_B',false,false),
  ('lump_d','Lump Sum D (tax-free redundancy)','lump_sum','LUMP_D',false,false),
  ('lump_e','Lump Sum E (back pay >12mo)','lump_sum','LUMP_E',true,false),
  ('fbt','Reportable Fringe Benefit','fbt','RFBA',false,false)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pay_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type_id uuid NOT NULL REFERENCES public.pay_item_types(id),
  gl_account text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
ALTER TABLE public.pay_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.pay_items FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.tfn_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprentice_id uuid NOT NULL REFERENCES public.apprentices(id) ON DELETE CASCADE,
  tfn_encrypted bytea NOT NULL,
  residency_status text NOT NULL CHECK (residency_status IN ('resident','foreign_resident','working_holiday')),
  tax_free_threshold_claimed bool NOT NULL DEFAULT false,
  help_debt bool NOT NULL DEFAULT false,
  vsl_debt bool NOT NULL DEFAULT false,
  medicare_levy_exemption text CHECK (medicare_levy_exemption IN ('none','half','full')),
  declared_date date NOT NULL,
  signed_pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tfn_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tfn_admin_only ON public.tfn_declarations FOR ALL
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin')
         AND EXISTS (SELECT 1 FROM public.apprentices a
                     WHERE a.id = tfn_declarations.apprentice_id
                       AND a.tenant_id = public.current_tenant_id()))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin')
              AND EXISTS (SELECT 1 FROM public.apprentices a
                          WHERE a.id = tfn_declarations.apprentice_id
                            AND a.tenant_id = public.current_tenant_id()));

ALTER TABLE public.apprentices
  ADD COLUMN IF NOT EXISTS fbt_reportable_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS termination_date date;

CREATE TABLE IF NOT EXISTS public.citb_levy_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  levy_rate numeric(5,4) NOT NULL CHECK (levy_rate >= 0 AND levy_rate <= 1),
  threshold_amount numeric(12,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX citb_one_active_per_tenant
  ON public.citb_levy_config(tenant_id) WHERE is_active = true;
ALTER TABLE public.citb_levy_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.citb_levy_config FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

-- Encrypted TFN helpers — SECURITY DEFINER to access vault, locked search_path:
CREATE OR REPLACE FUNCTION public.encrypt_tfn(plain text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'tfn_encryption_key';
  IF k IS NULL THEN RAISE EXCEPTION 'tfn_encryption_key missing in vault'; END IF;
  RETURN extensions.pgp_sym_encrypt(plain, k);
END $$;

CREATE OR REPLACE FUNCTION public.decrypt_tfn_last4(enc bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  k text;
  p text;
BEGIN
  -- only org_admin/gto_admin allowed
  IF (auth.jwt() #>> '{app_metadata,role}') NOT IN ('org_admin','gto_admin') THEN
    RETURN '****';
  END IF;
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'tfn_encryption_key';
  p := extensions.pgp_sym_decrypt(enc, k);
  RETURN repeat('*', greatest(length(p)-4, 0)) || right(p, 4);
END $$;

REVOKE EXECUTE ON FUNCTION public.encrypt_tfn(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_tfn(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.decrypt_tfn_last4(bytea) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrypt_tfn_last4(bytea) TO authenticated;
```

> **AUTH_CANONICAL.md compliance:** Every policy above checks `auth.jwt() #>> '{app_metadata,role}'` against the canonical role enum (`gto_admin`, `org_admin`, `org_manager`, `org_user`, `apprentice`). No cookie SSO. RLS is the source of truth.

---

## 5. Zod schemas + cross-field rules

```ts
// packages/payroll-validators/src/index.ts (new)
import { z } from 'zod';

/** ATO Mod-10 TFN check */
export function validateTFN(tfn: string): boolean {
  const cleaned = tfn.replace(/\s/g, '');
  if (!/^\d{8,9}$/.test(cleaned)) return false;
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  const offset = 9 - cleaned.length;
  const sum = cleaned.split('').reduce((acc, d, i) => acc + Number(d) * weights[i + offset], 0);
  return sum % 11 === 0;
}

export const TfnDeclarationSchema = z.object({
  apprentice_id: z.string().uuid(),
  tfn: z.string().refine(validateTFN, 'Invalid TFN — Mod-10 check failed'),
  residency_status: z.enum(['resident','foreign_resident','working_holiday']),
  tax_free_threshold_claimed: z.boolean(),
  help_debt: z.boolean(),
  vsl_debt: z.boolean(),
  medicare_levy_exemption: z.enum(['none','half','full']).optional(),
  declared_date: z.coerce.date(),
}).refine(
  d => !(d.residency_status === 'foreign_resident' && d.tax_free_threshold_claimed),
  { message: 'Foreign residents cannot claim the tax-free threshold', path: ['tax_free_threshold_claimed'] },
);

export const HiringDivisionSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20).optional(),
  super_guarantee_rate: z.coerce.number().min(0).max(1),
  is_active: z.boolean().default(true),
});

export const PublicHolidayGroupSchema = z.object({
  name: z.string().min(2).max(120),
  state_code: z.enum(['NSW','VIC','QLD','SA','WA','TAS','ACT','NT','NATIONAL']).optional(),
  dates: z.array(z.object({
    ph_date: z.coerce.date(),
    name: z.string().min(2).max(120),
  })).min(1, 'At least one date required'),
});

export const PurchaseOrderSchema = z.object({
  placement_id: z.string().uuid().nullable().optional(),
  po_number: z.string().min(2).max(60),
  amount: z.coerce.number().positive(),
  status: z.enum(['open','partially_used','closed','cancelled']),
  expires_at: z.coerce.date().optional(),
});

export const ClassificationSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  award_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  code: z.string().max(20).optional(),
  level: z.coerce.number().int().min(0).max(20).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
}).superRefine((d, ctx) => {
  if (d.parent_id && d.level === 0) {
    ctx.addIssue({ code:'custom', message:'Sub-classifications must have level >= 1', path:['level'] });
  }
});

export const PayItemSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, digits, and underscores'),
  name: z.string().min(2).max(120),
  type_id: z.string().uuid(),
  gl_account: z.string().max(40).optional(),
  is_active: z.boolean().default(true),
});

export const EmployeeImportRowSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  qualification_code: z.string().optional(),
  start_date: z.coerce.date().optional(),
});

export const CITBLevyConfigSchema = z.object({
  is_active: z.boolean().default(true),
  levy_rate: z.coerce.number().min(0).max(1),
  threshold_amount: z.coerce.number().min(0),
  effective_from: z.coerce.date(),
});
```

> **Why a new package `@bsuite/payroll-validators`:** keeps Mod-10 TFN check and STP-related validators reusable across crm7 (UI) and Edge Functions (server). DRY principle (rulebook §7).

---

## 6. Service functions / RPCs

```ts
// crm7/src/lib/services/admin/hiring-divisions.ts
import { supabase } from '@/lib/supabase/client';
import { HiringDivisionSchema } from '@bsuite/payroll-validators';

export const hiringDivisionsService = {
  list: () => supabase.from('hiring_divisions').select('*').order('name'),
  create: async (input: unknown) => {
    const parsed = HiringDivisionSchema.parse(input);
    return supabase.from('hiring_divisions').insert(parsed).select().single();
  },
  update: async (id: string, input: unknown) => {
    const parsed = HiringDivisionSchema.partial().parse(input);
    return supabase.from('hiring_divisions').update(parsed).eq('id', id).select().single();
  },
  delete: (id: string) =>
    supabase.from('hiring_divisions').update({ is_active: false }).eq('id', id),
};

// Same shape repeated for: phGroupsService, otsRulesService, otsStreamsService,
// purchaseOrdersService, classificationsService, payItemsService,
// citbLevyConfigService, tfnDeclarationsService.
```

Edge Function `process-employee-import` (TS, Deno):

```ts
// crm7/supabase/functions/process-employee-import/index.ts (new)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EmployeeImportRowSchema } from '@bsuite/payroll-validators';
// (deno-compatible publish path required — placeholder for impl PR)

Deno.serve(async (req) => {
  const { import_id, csv_text } = await req.json();
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  await sb.from('employee_imports').update({ status:'processing', started_at: new Date().toISOString() }).eq('id', import_id);

  const lines = csv_text.split(/\r?\n/).filter((l: string) => l.trim());
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((l: string) => Object.fromEntries(l.split(',').map((v,i)=>[header[i], v])));

  let success = 0;
  const errors: Array<{ row_number:number; reason:string }> = [];

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const validated = batch.map((r, j) => {
      const parsed = EmployeeImportRowSchema.safeParse(r);
      if (!parsed.success) {
        errors.push({ row_number: i + j + 2, reason: parsed.error.errors[0].message });
        return null;
      }
      return parsed.data;
    }).filter(Boolean);

    if (validated.length) {
      const { error } = await sb.from('apprentices').insert(validated);
      if (error) {
        errors.push({ row_number: i + 2, reason: `Batch insert failed: ${error.message}` });
      } else {
        success += validated.length;
      }
    }
  }

  await sb.from('employee_imports').update({
    status: errors.length === 0 ? 'done' : (success === 0 ? 'failed' : 'partial'),
    success_rows: success,
    error_rows: errors,
    completed_at: new Date().toISOString(),
  }).eq('id', import_id);

  return new Response(JSON.stringify({ success, errors_count: errors.length }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

---

## 7. Tests

### Unit tests (Vitest, ~50 cases)

`packages/payroll-validators/test/tfn.test.ts`:
1. Valid 9-digit TFN — passes Mod-10 (`123456782` example)
2. Valid 8-digit TFN — passes Mod-10
3. Invalid TFN — fails Mod-10
4. Empty/non-numeric — fails
5. TFN with spaces — accepted, normalised
6. Foreign resident + threshold-claimed — Zod refine fails
7. Working holiday — Zod refine accepts threshold not claimed

`packages/payroll-validators/test/schemas.test.ts`:
8. HiringDivisionSchema — valid → ok
9. HiringDivisionSchema — super_guarantee_rate > 1 → fails
10. PublicHolidayGroupSchema — empty dates → fails
11. PurchaseOrderSchema — negative amount → fails
12. ClassificationSchema — sub-class with level=0 → superRefine fails
13. PayItemSchema — lowercase code → fails regex
14. EmployeeImportRowSchema — missing first_name → fails
15. CITBLevyConfigSchema — negative levy_rate → fails

`crm7/test/services/admin.test.ts` (24 tests, one per service × 3-4 scenarios — list / create-success / create-fail / soft-delete).

### Integration tests (Playwright Component + Vitest, ~25 cases)

`crm7/test/admin/hiring-divisions.spec.tsx` — render page, fill form, submit, expect optimistic update.
`crm7/test/admin/ph-groups.spec.tsx` — same with date sub-form.
`crm7/test/admin/import-wizard.spec.tsx` — upload sample CSV, expect mapping step, expect preview, expect success summary.
`crm7/test/admin/tfn-card.spec.tsx` — type invalid TFN → red badge; type valid → green; submit → encrypted store.
`crm7/test/admin/classifications-tree.spec.tsx` — expand parent → child appears; drag reorder → sort_order updates.

### E2E (Playwright, 1 case)

`crm7/e2e/admin-parity.spec.ts` — full happy path described in §3 step 578.7.

---

## 8. Documentation drift fixes (closes part of #579)

- Update `crm7/README.md` Features list to mention: hiring divisions, public-holiday groups, purchase orders on placements, employee CSV import wizard, TFN declarations, FBT/ETP/Lump-Sum pay items, CITB levy config, classifications hierarchy, business rules, dynamic forms.
- Update `crm7/docs/admin-overview.md` (new) — admin domain entity diagram + workflow.
- Update `bsuite/docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` — 14 rows (68–70, 72–73, 98, 102–103, 106–108, 111–114) move from 🔴/🟡/⛔ to ✅ once 578.1–578.7 ship.

---

## 9. PR description template (for implementation PRs)

```markdown
## Scope
578.X — <short title>

## Files
- <list>

## Evidence
- Migration applied: <name> at <timestamp>
- Live verify: `select * from <table> where ...` returns expected
- crm7/src/<file>.tsx:<line> — UI surface
- crm7/test/<file>.spec.ts:<line> — test
- e2e/admin-parity.spec.ts:<line> — passes locally

## §17 Mutual reminder

- [ ] Red-team table reviewed (UX/Security/Perf/Reliability/Quality)
- [ ] Smoke test passes locally + in CI
- [ ] Branch will be deleted after squash-merge
- [ ] No dead code left behind (full feature, no stubs)

## AUTH_CANONICAL.md compliance
- [ ] All new tables have RLS enabled
- [ ] All policies cite canonical role enum
- [ ] No cookie SSO introduced
- [ ] SECURITY DEFINER functions have locked search_path
- [ ] TFN encrypted via Vault key, never stored in plain text
```

---

## 10. Red-team table (§17 mandatory)

| Domain | Concern | Mitigation |
|---|---|---|
| **UX** | Import wizard 5 steps could feel heavy | Show progress bar; allow back-step; remember mapping per file pattern |
| **UX** | Tree view of classifications could be slow with deep hierarchy | Lazy load children only on expand; virtualize if >200 visible |
| **Security** | TFN in plain text in client form before submit | Submit via HTTPS; never log; clear from React state on unmount; field type=password with reveal toggle |
| **Security** | CITB levy_rate >1 could DoS payroll calc | DB CHECK + Zod min/max + UI numeric input with step=0.0001 |
| **Security** | Bulk import could insert into wrong tenant | Edge Function uses service-role but stamps `tenant_id` from import row owner via `employee_imports.tenant_id` lookup |
| **Performance** | Classifications tree N+1 on parent_id resolution | Single query with recursive CTE; React Query caches by `['classifications', tenant_id]` |
| **Performance** | TFN decrypt-last4 on every list render | Memoize per-row; only call when row is visible (intersection observer) |
| **Reliability** | Import fails mid-batch — orphan rows | Edge Function batches with explicit transaction per batch; `error_rows` records failed batches for retry |
| **Reliability** | Migration 578.1.A column-add on placements could lock for large tables | Use `ALTER TABLE … ADD COLUMN` (safe in PG ≥11 for nullable adds); no data backfill needed |
| **Quality** | Risk of duplicate "Business Rules" entity if Codehouse adds it later as a real feature | Wrap WorkflowBuilder rather than duplicate it; align trigger_type taxonomy with potential future Codehouse change |
| **Quality** | DRY — TFN validator should not be duplicated client + server | Single package `@bsuite/payroll-validators` consumed by both |
| **Quality** | DraggableCardPage pattern not used | Implementation must use it for hiring-divisions, ph-groups, classifications, ots-rules, ots-streams |

---

## 11. Smoke test plan

After full ladder ships:
1. As `gto_admin`, log into crm7
2. Settings → Hiring Divisions → New → "Apprentices Division" + 0.115 rate → save
3. Settings → Public Holiday Groups → New → "WA Standard" + 3 dates → save
4. Placements → pick one → assign hiring_division + ph_group → save → verify on detail
5. Settings → Import-Export → upload `sample-3-employees.csv` → map → preview → commit → verify 3 employees created
6. One of those employees → Payroll tab → TFN form → enter `123456782` (valid) → save → verify last 4 visible only
7. Same employee → FBT field → 1500 → save → verify
8. Settings → Pay Items → New → "ETP Genuine Redundancy" → type ETP-R → save
9. Settings → CITB → enable + 0.002 levy → save → verify
10. Settings → Business Rules → opens existing WorkflowBuilder filtered list
11. Settings → Dynamic Forms → opens schema-builder
12. Settings → Classifications → create parent + 2 sub-classes → drag reorder
13. Pay-run preview shows ETP and FBT fields surfaced (visual check only — STP wire-up out of scope)

All 13 steps must complete without console errors, with light/dark WCAG-AA, on mobile breakpoint (375×667).

---

## 12. Citations

- [AnyTime Admin Guide (WF1_Admin_*) — Codehouse PDF](https://help.codehouseworkforce.com.au) — pp. 21, 26, 37, 58 (admin entities)
- [WF1 FAQ — TFN Declaration](https://help.codehouseworkforce.com.au) — TFN form per employee
- [WF1 FAQ — ETP Payment](https://help.codehouseworkforce.com.au) — Employment Termination Payment
- [WF1 FAQ — Employee FBT](https://help.codehouseworkforce.com.au) — Fringe Benefits Tax per employee
- [WF1 FAQ — CITB Logo / Levy Config](https://help.codehouseworkforce.com.au) — CITB construction levy
- [ATO — STP Phase 2 Disaggregated Gross 2026](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/stp-phase-2)
- [ATO — TFN Mod-10 Algorithm](https://www.ato.gov.au/individuals-and-families/tax-file-number)
- [Supabase — Vault & secret encryption](https://supabase.com/docs/guides/database/vault)
- [Supabase — Edge Functions](https://supabase.com/docs/guides/functions)
- [Postgres — pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
- Internal: `competitor/parity-matrix.md` rows 68–70, 72–73, 98, 102–103, 106–108, 111–114
- Internal: `competitor/bsuite-inventory.md` §§H, L, M, N
- Internal: `bsuite/docs/AUTH_CANONICAL.md` §§3.4, 4, 5, 6
- Internal: prior parity specs PR #594 (timesheet), #596 (leave), #598 (reports), #600 (pay-periods), #602 (file-export), #603 (integrations)

---

*Filed by perplexity-computer · 2026-05-07T00:14Z · cron 8c20448f run #13*
*FF-AUTONOMY-20260506 + FF-PROACTIVE-COLLAB-20260506 + FF-COMPLETION-NORTH-STAR-20260506 + FF-OBVIOUS-FIX-AUTONOMY-20260506*
