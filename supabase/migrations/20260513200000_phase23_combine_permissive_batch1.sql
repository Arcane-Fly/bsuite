-- Phase 2.3 batch 1: combine PERMISSIVE policies on 3 tables
-- Per bsuite#963 epic.
-- Audit date: 2026-05-13
-- Already applied to prod via Supabase MCP apply_migration at
--   12:55Z (team_members), 12:56Z (team_invitations), 12:58Z (org_members).
-- (Workflow auto-apply broken — see bsuite#961.)
--
-- All 3 combines are clean OR-unions of identical-access-class PERMISSIVE
-- policies. SQL semantics preserved. Pure perf optimization.
--
-- Advisor effect (verified post-application):
--   multiple_permissive_policies: 56 → 41 (-15 from these 3 tables)

-- ─── team_members: 2 SELECT policies → 1 ─────────────────────────────────────
DROP POLICY IF EXISTS "team_members_self_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_team_select" ON public.team_members;

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT
  TO public
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (
      user_id = (SELECT auth.uid())
      OR is_team_admin(team_id, (SELECT auth.uid()))
    )
  );

-- ─── team_invitations: 2 SELECT policies → 1 ─────────────────────────────────
DROP POLICY IF EXISTS "team_invitations_admin_select" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_invitee_select" ON public.team_invitations;

CREATE POLICY "team_invitations_select" ON public.team_invitations
  FOR SELECT
  TO public
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (
      is_team_admin(team_id, (SELECT auth.uid()))
      OR lower(email) = lower((SELECT auth.email()))
    )
  );

-- ─── org_members: 3 (overlapping ALL + redundant SELECT subset) → 1 + drop ───
-- BEFORE:
--   org_members_admin_write (ALL, gto_admin AND tenant)
--   org_members_platform_admin_all (ALL, is_platform_admin())
--   org_members_admin_select (SELECT, gto_admin AND tenant) — STRICT SUBSET of admin_write's ALL
-- AFTER:
--   org_members_authenticated_write (ALL, OR-union of original two)
--   admin_select dropped (its qual is identical to admin_write's, which covers SELECT)
DROP POLICY IF EXISTS "org_members_admin_write" ON public.org_members;
DROP POLICY IF EXISTS "org_members_platform_admin_all" ON public.org_members;
DROP POLICY IF EXISTS "org_members_admin_select" ON public.org_members;

CREATE POLICY "org_members_authenticated_write" ON public.org_members
  FOR ALL
  TO authenticated
  USING (
    (is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id()))
    OR is_platform_admin()
  )
  WITH CHECK (
    (is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id()))
    OR is_platform_admin()
  );
