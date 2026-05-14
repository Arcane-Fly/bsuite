-- Phase 2.2 sub-PR-2: RLS initplan rewrite for public.apprentice_placements
-- Source: bsuite#951 epic
-- Audit date: 2026-05-13
--
-- Wraps auth.uid() in (SELECT auth.uid()) for both apprentice_placements
-- policies, allowing PostgreSQL's planner to hoist the auth function call
-- as a single initplan executed once per query rather than once per row.
--
-- Canonical predicate body pulled VERBATIM from prod
-- (project ref: tuybltdrdefjblnplpqo) via:
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'apprentice_placements';
--
-- Two policies affected, both PERMISSIVE FOR authenticated:
--   1. "Users can manage placements for their tenant's apprentices" (ALL)
--   2. "Users can view placements for their tenant's apprentices" (SELECT)
--
-- Both predicates are functionally identical — only the auth.uid() call is
-- changed. SQL semantics are unchanged.

DROP POLICY IF EXISTS "Users can manage placements for their tenant's apprentices"
  ON public.apprentice_placements;

CREATE POLICY "Users can manage placements for their tenant's apprentices"
  ON public.apprentice_placements
  FOR ALL
  TO authenticated
  USING (
    apprentice_id IN (
      SELECT a.id
      FROM apprentices a
      WHERE a.tenant_id IN (
        SELECT user_tenants.tenant_id
        FROM user_tenants
        WHERE user_tenants.user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    apprentice_id IN (
      SELECT a.id
      FROM apprentices a
      WHERE a.tenant_id IN (
        SELECT user_tenants.tenant_id
        FROM user_tenants
        WHERE user_tenants.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can view placements for their tenant's apprentices"
  ON public.apprentice_placements;

CREATE POLICY "Users can view placements for their tenant's apprentices"
  ON public.apprentice_placements
  FOR SELECT
  TO authenticated
  USING (
    apprentice_id IN (
      SELECT a.id
      FROM apprentices a
      WHERE a.tenant_id IN (
        SELECT user_tenants.tenant_id
        FROM user_tenants
        WHERE user_tenants.user_id = (SELECT auth.uid())
      )
    )
  );
