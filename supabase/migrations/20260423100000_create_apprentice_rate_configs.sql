-- ============================================================
-- Migration: apprentice_rate_configs CREATE TABLE (backfill)
-- ============================================================
-- Provenance: table was created out-of-band via Supabase MCP
-- during the 2026-04-23 WS-2 handoff session ("99 rows seeded,
-- 7 awards"). This migration codifies the schema so fresh
-- provisioning can reproduce it from migration history.
-- Tracks: bsuite#865
--
-- IF NOT EXISTS guards make this safe to apply on any instance
-- where the table already exists (production, staging, local).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.apprentice_rate_configs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants (id) ON DELETE CASCADE,
  award_code      TEXT        NOT NULL,
  award_name      TEXT        NOT NULL,
  trade_name      TEXT        NOT NULL,
  apprentice_type TEXT        NOT NULL
    CHECK (apprentice_type IN ('junior_yr10', 'junior_yr12', 'adult', 'sba_sbt')),
  year_of_trade   INT         NOT NULL CHECK (year_of_trade BETWEEN 1 AND 6),
  wage_percentage NUMERIC(5,2) NOT NULL,
  effective_from  DATE        NOT NULL,
  effective_to    DATE,
  source          TEXT        NOT NULL DEFAULT 'fairwork_award',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explicit grants required per bsuite#964 / Data API change 2026-10-30.
-- anon: public award rates (tenant_id IS NULL rows) must be readable
--       without authentication so R80.3 wage calculator works pre-login.
GRANT SELECT                          ON public.apprentice_rate_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.apprentice_rate_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.apprentice_rate_configs TO service_role;

ALTER TABLE public.apprentice_rate_configs ENABLE ROW LEVEL SECURITY;

-- Partial unique index: prevents duplicate public award records.
-- Tenant-scoped records (tenant_id IS NOT NULL) allow overrides per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_arc_public_unique
  ON public.apprentice_rate_configs (award_code, apprentice_type, year_of_trade, effective_from)
  WHERE tenant_id IS NULL;

-- Performance index: primary query pattern is award_code lookup.
CREATE INDEX IF NOT EXISTS idx_arc_award_code
  ON public.apprentice_rate_configs (award_code, effective_from DESC)
  WHERE effective_to IS NULL OR effective_to >= CURRENT_DATE;

-- updated_at auto-maintenance trigger
CREATE OR REPLACE FUNCTION public.set_apprentice_rate_configs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS for updated_at maintenance
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-04-23
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS arc_updated_at ON public.apprentice_rate_configs;
CREATE TRIGGER arc_updated_at
  BEFORE UPDATE ON public.apprentice_rate_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_apprentice_rate_configs_updated_at();

-- ── RLS policies ────────────────────────────────────────────────────────────
-- anon: read public (Fair Work) rates only
DROP POLICY IF EXISTS "arc_select_anon" ON public.apprentice_rate_configs;
CREATE POLICY "arc_select_anon"
  ON public.apprentice_rate_configs FOR SELECT TO anon
  USING (tenant_id IS NULL);

-- authenticated: read public rates + own tenant's override rates
DROP POLICY IF EXISTS "arc_select_authenticated" ON public.apprentice_rate_configs;
CREATE POLICY "arc_select_authenticated"
  ON public.apprentice_rate_configs FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR (
      tenant_id IS NOT NULL
      AND tenant_id IN (
        SELECT user_tenants.tenant_id
        FROM user_tenants
        WHERE user_tenants.user_id = (SELECT auth.uid())
      )
    )
  );

-- admin/manager/gto_officer: insert tenant-scoped override rates
DROP POLICY IF EXISTS "arc_tenant_admin_insert" ON public.apprentice_rate_configs;
CREATE POLICY "arc_tenant_admin_insert"
  ON public.apprentice_rate_configs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY(ARRAY['admin', 'manager', 'gto_officer'])
    )
  );

DROP POLICY IF EXISTS "arc_tenant_admin_update" ON public.apprentice_rate_configs;
CREATE POLICY "arc_tenant_admin_update"
  ON public.apprentice_rate_configs FOR UPDATE TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY(ARRAY['admin', 'manager', 'gto_officer'])
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY(ARRAY['admin', 'manager', 'gto_officer'])
    )
  );

DROP POLICY IF EXISTS "arc_tenant_admin_delete" ON public.apprentice_rate_configs;
CREATE POLICY "arc_tenant_admin_delete"
  ON public.apprentice_rate_configs FOR DELETE TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY(ARRAY['admin', 'manager', 'gto_officer'])
    )
  );
