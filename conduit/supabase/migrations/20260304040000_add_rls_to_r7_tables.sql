-- =============================================================================
-- Add Row-Level Security policies to all r7_* tables
--
-- Policy: Users can only access rows matching their active tenant membership.
-- Relies on user_tenants table (shared across BSuite apps) for tenant resolution.
-- =============================================================================

BEGIN;

-- Helper function: resolve current user's tenant_id
CREATE OR REPLACE FUNCTION r7_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM user_tenants
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all r7_* tables
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS r7_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_pipeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_candidate_pool_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_job_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS r7_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Tenant isolation policies — one per table
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'r7_candidates',
      'r7_jobs',
      'r7_applications',
      'r7_pipeline_stages',
      'r7_pipeline_entries',
      'r7_offers',
      'r7_interviews',
      'r7_communications',
      'r7_compliance_checks',
      'r7_talent_pools',
      'r7_candidate_pool_memberships',
      'r7_job_distributions',
      'r7_onboarding_templates',
      'r7_onboarding_instances',
      'r7_onboarding_tasks',
      'r7_documents'
    ])
  LOOP
    -- Skip if table doesn't exist yet
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    -- Drop existing policy if any (idempotent)
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      tbl || '_tenant_isolation',
      tbl
    );

    -- Create tenant isolation policy for all operations
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = r7_current_tenant_id()) WITH CHECK (tenant_id = r7_current_tenant_id())',
      tbl || '_tenant_isolation',
      tbl
    );
  END LOOP;
END
$$;

COMMIT;
