-- migration: 20260513100000_rls_initplan_platform_branding.sql
-- Phase 2.2 — [hardening 2.2] RLS initplan rewrite: platform_branding
-- Epic: https://github.com/GaryOcean428/bsuite/issues/XXX (hardening 2.2 EPIC)
--
-- Replaces raw auth.uid() with (SELECT auth.uid()) in every policy expression on
-- public.platform_branding so Postgres can hoist the auth call as an initplan
-- (evaluated once per query, not once per row). Behaviour is semantically identical
-- — only the query-plan cost changes (~10-100× faster on large tables).
--
-- Policies affected:
--   platform_branding_insert  (WITH CHECK)
--   platform_branding_update  (USING + WITH CHECK)
--
-- Policies NOT changed (no auth.uid() / no predicate):
--   platform_branding_select      (USING true)
--   platform_branding_select_anon (USING true)
--   platform_branding_delete      (USING false)

-- ── INSERT ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "platform_branding_insert" ON public.platform_branding;

CREATE POLICY "platform_branding_insert"
  ON public.platform_branding FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

-- ── UPDATE ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "platform_branding_update" ON public.platform_branding;

CREATE POLICY "platform_branding_update"
  ON public.platform_branding FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND platform_role IN ('developer', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND platform_role IN ('developer', 'platform_admin')
    )
  );
