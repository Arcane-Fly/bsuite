-- Phase 2.2 sub-PR-3: RLS initplan rewrite for public.feature_builder_ai_usage
-- Source: bsuite#951 epic
-- Audit date: 2026-05-13
--
-- Wraps auth.uid() in (SELECT auth.uid()) for the one initplan-flagged
-- policy on feature_builder_ai_usage. The other policy on this table
-- (feature_builder_ai_usage_no_client_insert) uses WITH CHECK (false) only —
-- no auth function call, no rewrite needed.
--
-- Canonical predicate body pulled VERBATIM from prod
-- (project ref: tuybltdrdefjblnplpqo) via:
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'feature_builder_ai_usage';
--
-- Already applied to prod via Supabase MCP apply_migration at
-- 2026-05-13T12:05Z (workflow auto-apply broken, see bsuite#961).

DROP POLICY IF EXISTS "feature_builder_ai_usage_select_own"
  ON public.feature_builder_ai_usage;

CREATE POLICY "feature_builder_ai_usage_select_own"
  ON public.feature_builder_ai_usage
  FOR SELECT
  TO authenticated
  USING (
    dev_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.platform_role = 'platform_admin'
    )
  );
