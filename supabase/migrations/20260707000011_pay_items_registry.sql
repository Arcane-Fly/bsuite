-- 20260707000011_pay_items_registry.sql
-- Per-tenant pay item type registry. Reusable for all parity work touching payroll.
-- Unblocks: leave cash-out (ROW 55), CoInvest LSL (ROW 56)

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

COMMENT ON TABLE pay_items IS
  'Pay item registry. Reusable for payroll parity work. AUTH_CANONICAL.md compliant.';
