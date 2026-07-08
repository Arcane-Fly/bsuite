-- 20260707000010_leave_persistence_layer.sql
-- Leave entity + types + balances. AUTH_CANONICAL.md compliant.
-- Closes: docs/20260506-leave-parity-spec-v1.00W.md (rows 52-57)
-- Unblocks: leave calendar, auto-populate on timesheet, cash-out, CoInvest LSL, DV leave

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
