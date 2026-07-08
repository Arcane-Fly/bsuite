-- 20260707000020_pay_periods_table.sql
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
