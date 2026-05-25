-- Phase 2.2 sub-PR: RLS initplan rewrite for public.page_drafts
-- Source: Supabase advisor `auth_rls_initplan` WARN.
-- Audit date: 2026-05-25 (DB rotation, bsuite#1259).
--
-- The single policy `page_drafts_owner_all` was created without an explicit
-- `TO <role>` clause (defaults to `public`) and called `auth.uid()` directly in
-- both USING and WITH CHECK, forcing PostgreSQL to re-evaluate the auth function
-- on every row instead of hoisting it to an initplan.
--
-- Two changes:
--   1. Wrap `auth.uid()` in `(SELECT auth.uid())` — documented PG idiom that
--      yields IDENTICAL row sets (output-equivalent per §9.1) while letting
--      the planner cache the value once per query.
--   2. Tighten `TO public` → `TO authenticated`. Anon's `auth.uid()` returns
--      NULL, so `(NULL = created_by)` was already evaluating to NULL → row
--      filtered out — but stating intent explicitly is hygiene and matches
--      the established pattern across the codebase.
--
-- Canonical predicate body pulled VERBATIM from prod (project ref
-- `tuybltdrdefjblnplpqo`) via:
--   SELECT policyname, cmd, qual, with_check, roles
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'page_drafts';

DROP POLICY IF EXISTS page_drafts_owner_all ON public.page_drafts;

CREATE POLICY page_drafts_owner_all
  ON public.page_drafts
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);
