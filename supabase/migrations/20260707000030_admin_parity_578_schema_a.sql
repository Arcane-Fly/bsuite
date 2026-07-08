-- Admin parity schema A: Hiring/Placements/Imports
-- Closes bsuite#578 (matrix rows 68, 70, 72-73, 98, 106)
-- Creates: hiring_divisions, public_holiday_groups, public_holiday_dates,
--          ots_rules, ots_streams, classifications, purchase_orders, employee_imports
-- Adds columns to placements: hiring_division_id, ots_rule_id, ots_stream_id, public_holiday_group_id

-- Hiring divisions (tenant-scoped, with super guarantee rate)
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

-- Public holiday groups + dates
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

-- OTS (Over Time Scheme) rules + streams
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

-- Unified classifications (parent-child hierarchy)
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

-- Purchase orders (placement-scoped)
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

-- Employee imports (import-job tracking)
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

-- Add columns to placements
ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS hiring_division_id uuid REFERENCES public.hiring_divisions(id),
  ADD COLUMN IF NOT EXISTS ots_rule_id uuid REFERENCES public.ots_rules(id),
  ADD COLUMN IF NOT EXISTS ots_stream_id uuid REFERENCES public.ots_streams(id),
  ADD COLUMN IF NOT EXISTS public_holiday_group_id uuid REFERENCES public.public_holiday_groups(id);

-- Enable RLS on all new tables
ALTER TABLE public.hiring_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holiday_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holiday_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ots_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ots_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_imports ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (AUTH_CANONICAL.md §5)
CREATE POLICY tenant_isolation ON public.hiring_divisions FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.public_holiday_groups FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_via_group ON public.public_holiday_dates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.public_holiday_groups g
                 WHERE g.id = public_holiday_dates.group_id
                   AND g.tenant_id = public.current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.public_holiday_groups g
                      WHERE g.id = public_holiday_dates.group_id
                        AND g.tenant_id = public.current_tenant_id()));

CREATE POLICY tenant_isolation ON public.ots_rules FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.ots_streams FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.classifications FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.purchase_orders FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.employee_imports FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Admin write policies (only org_admin / gto_admin)
CREATE POLICY admin_write ON public.hiring_divisions FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.hiring_divisions FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.public_holiday_groups FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.public_holiday_groups FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.ots_rules FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.ots_rules FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.ots_streams FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.ots_streams FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.classifications FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.classifications FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.purchase_orders FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.purchase_orders FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE POLICY admin_write ON public.employee_imports FOR INSERT
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
CREATE POLICY admin_update ON public.employee_imports FOR UPDATE
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));
