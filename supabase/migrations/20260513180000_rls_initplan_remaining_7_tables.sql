-- Phase 2.2 sub-PR-4: RLS initplan rewrite for remaining 7 advisor-flagged tables
-- Source: bsuite#951 epic
-- Audit date: 2026-05-13
-- Already applied to prod via Supabase MCP apply_migration at 2026-05-13T12:10Z
-- (workflow auto-apply broken — see bsuite#961). This brings source into parity.
--
-- Covers 22 policies across 7 tables (completing the 25-policy / 9-table EPIC):
--   feature_builder_drafts (4)
--   feature_builder_exported_features (1)
--   role_capabilities (2)
--   super_admin_action_audit (1)
--   team_invitations (5)
--   team_members (5)
--   teams (4)
--
-- Predicates pulled VERBATIM from prod (project ref tuybltdrdefjblnplpqo) via
-- pg_policies query at 2026-05-13T12:08Z.
--
-- Wrapping pattern: auth.uid() → (SELECT auth.uid())
--                  auth.role() → (SELECT auth.role())
--                  auth.email() → (SELECT auth.email())
-- Pure query-plan optimisation. SQL semantics unchanged.

-- ─── feature_builder_drafts (4 policies) ─────────────────────────────────────
DROP POLICY IF EXISTS "feature_builder_drafts_delete_own" ON public.feature_builder_drafts;
CREATE POLICY "feature_builder_drafts_delete_own" ON public.feature_builder_drafts
  FOR DELETE TO authenticated
  USING (dev_user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = 'platform_admin'));

DROP POLICY IF EXISTS "feature_builder_drafts_insert_own" ON public.feature_builder_drafts;
CREATE POLICY "feature_builder_drafts_insert_own" ON public.feature_builder_drafts
  FOR INSERT TO authenticated
  WITH CHECK (dev_user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = ANY (ARRAY['developer', 'platform_admin'])));

DROP POLICY IF EXISTS "feature_builder_drafts_select_own" ON public.feature_builder_drafts;
CREATE POLICY "feature_builder_drafts_select_own" ON public.feature_builder_drafts
  FOR SELECT TO authenticated
  USING (dev_user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = 'platform_admin'));

DROP POLICY IF EXISTS "feature_builder_drafts_update_own" ON public.feature_builder_drafts;
CREATE POLICY "feature_builder_drafts_update_own" ON public.feature_builder_drafts
  FOR UPDATE TO authenticated
  USING (dev_user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = 'platform_admin'))
  WITH CHECK (dev_user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = 'platform_admin'));

-- ─── feature_builder_exported_features (1 policy) ────────────────────────────
DROP POLICY IF EXISTS "feature_builder_exports_select_own" ON public.feature_builder_exported_features;
CREATE POLICY "feature_builder_exports_select_own" ON public.feature_builder_exported_features
  FOR SELECT TO authenticated
  USING (dev_user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.platform_role = 'platform_admin'));

-- ─── role_capabilities (2 policies) ──────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_admins_write_role_capabilities" ON public.role_capabilities;
CREATE POLICY "tenant_admins_write_role_capabilities" ON public.role_capabilities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY (ARRAY['tenant_admin', 'platform_admin', 'owner', 'admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY (ARRAY['tenant_admin', 'platform_admin', 'owner', 'admin'])));

DROP POLICY IF EXISTS "tenant_members_read_role_capabilities" ON public.role_capabilities;
CREATE POLICY "tenant_members_read_role_capabilities" ON public.role_capabilities
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id));

-- ─── super_admin_action_audit (1 policy) ─────────────────────────────────────
DROP POLICY IF EXISTS "Tenant admins can view their tenant audit" ON public.super_admin_action_audit;
CREATE POLICY "Tenant admins can view their tenant audit" ON public.super_admin_action_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_super_admin = true)
    OR (
      tenant_id = (SELECT super_admin_action_audit.tenant_id FROM profiles WHERE profiles.id = (SELECT auth.uid()))
      AND get_current_user_role() = ANY (ARRAY['admin', 'manager'])
    )
  );

-- ─── team_invitations (5 policies — also wraps auth.role() and auth.email()) ─
DROP POLICY IF EXISTS "team_invitations_admin_delete" ON public.team_invitations;
CREATE POLICY "team_invitations_admin_delete" ON public.team_invitations
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invitations_admin_insert" ON public.team_invitations;
CREATE POLICY "team_invitations_admin_insert" ON public.team_invitations
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invitations_admin_select" ON public.team_invitations;
CREATE POLICY "team_invitations_admin_select" ON public.team_invitations
  FOR SELECT TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invitations_admin_update" ON public.team_invitations;
CREATE POLICY "team_invitations_admin_update" ON public.team_invitations
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invitations_invitee_select" ON public.team_invitations;
CREATE POLICY "team_invitations_invitee_select" ON public.team_invitations
  FOR SELECT TO public
  USING ((SELECT auth.role()) = 'authenticated' AND lower(email) = lower((SELECT auth.email())));

-- ─── team_members (5 policies — wraps auth.role()) ───────────────────────────
DROP POLICY IF EXISTS "team_members_admin_delete" ON public.team_members;
CREATE POLICY "team_members_admin_delete" ON public.team_members
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_members_admin_insert" ON public.team_members;
CREATE POLICY "team_members_admin_insert" ON public.team_members
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_members_admin_update" ON public.team_members;
CREATE POLICY "team_members_admin_update" ON public.team_members
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_members_self_select" ON public.team_members;
CREATE POLICY "team_members_self_select" ON public.team_members
  FOR SELECT TO public
  USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "team_members_team_select" ON public.team_members;
CREATE POLICY "team_members_team_select" ON public.team_members
  FOR SELECT TO public
  USING ((SELECT auth.role()) = 'authenticated' AND is_team_admin(team_id, (SELECT auth.uid())));

-- ─── teams (4 policies — wraps auth.role()) ──────────────────────────────────
DROP POLICY IF EXISTS "teams_member_select" ON public.teams;
CREATE POLICY "teams_member_select" ON public.teams
  FOR SELECT TO public
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (
      owner_id = (SELECT auth.uid())
      OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "teams_owner_delete" ON public.teams;
CREATE POLICY "teams_owner_delete" ON public.teams
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "teams_owner_insert" ON public.teams;
CREATE POLICY "teams_owner_insert" ON public.teams
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "teams_owner_update" ON public.teams;
CREATE POLICY "teams_owner_update" ON public.teams
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()));
