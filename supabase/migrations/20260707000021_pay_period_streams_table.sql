-- 20260707000021_pay_period_streams_table.sql
-- ROW 43: Pay period streams (multi-stream definitions per cycle)

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

CREATE INDEX idx_pay_period_streams_tenant_active ON pay_period_streams (tenant_id, active, display_order);

COMMENT ON TABLE pay_period_streams IS
  'Pay period stream definition. Links to pay_periods.stream_id. AUTH_CANONICAL.md compliant.';
