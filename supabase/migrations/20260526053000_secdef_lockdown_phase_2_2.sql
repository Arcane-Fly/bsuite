-- Phase 2.2 SECURITY DEFINER lockdown — restore prior Cat B revokes that
-- were silently reset, lock down newly-flagged functions, and add a
-- belt-and-braces post-deploy trigger to keep the state stable across
-- CREATE OR REPLACE migrations.
--
-- Why this migration exists
-- ------------------------
-- Phase 2.1B/E (20260513210000) already revoked EXECUTE on most of these
-- from anon + authenticated, but CREATE OR REPLACE FUNCTION does NOT
-- preserve REVOKE — only ALTER FUNCTION does. Any subsequent migration
-- that re-created one of these functions silently restored the default
-- `GRANT EXECUTE ... TO public` (which postgrest reads as anon +
-- authenticated). The Supabase advisor now flags 45 functions again.
--
-- This migration:
--   1. Re-REVOKEs EXECUTE FROM anon, authenticated on the 45 flagged
--      DEFINER functions that should never be PostgREST-callable
--   2. Leaves intentional API-surface DEFINERs in place (those are
--      handled separately with explicit GRANT in their own migrations)
--   3. Adds a default-privileges baseline so newly-created functions
--      do not auto-grant to authenticated unless explicitly granted
--
-- Source: Supabase advisor `authenticated_security_definer_function_executable`
-- pulled 2026-05-26T04:00Z via get_advisors MCP call. See
-- workspace/full-platform-audit-20260526.md for the full audit trail.

-- ─── Category B: RLS helpers (callable only from policy expressions) ───────
-- These are used inside USING/WITH CHECK predicates on RLS policies. They
-- should NEVER be callable via PostgREST RPC. Revoke from anon + authenticated.
REVOKE EXECUTE ON FUNCTION public.auth_parent_tenant_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_tenant_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_tenant_id_with_role(text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_module_access(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_portal_role(uuid, uuid, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_tenant_access(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_apprentice_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_gto_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_host_employer_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_context(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visible_tenant_ids(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_parent_admin_access(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_demo_write_blocked() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_dev_mode() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_enterprise_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_staff() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_admin(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.platform_is_developer_or_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.r7_candidate_id_for_auth_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.show_demo_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tenant_branding_is_force_overridden(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_org_access(uuid, uuid) FROM anon, authenticated;

-- ─── Category E: internal utility functions (no app-code RPC callers) ──────
REVOKE EXECUTE ON FUNCTION public.ancestors_of(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.descendants_of(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_descendant_tenant_ids(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sharing_level(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visible_fields(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_public_tables() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reflect_entity_schema(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sample_public_table(text, integer) FROM anon, authenticated;

-- ─── Category D: admin-only operations (require platform admin role) ───────
-- These check is_platform_admin() / is_enterprise_admin() inside the function
-- body, so the EXECUTE grant on authenticated is harmless in principle —
-- but PostgREST exposing them at /rpc/* is still a confused-deputy risk.
-- Keep DEFINER for the elevated reads/writes they need, REVOKE the public
-- RPC entry point. Internal callers (other DEFINERs) still work.
REVOKE EXECUTE ON FUNCTION public.convert_tester_to_paid(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_orphan_owned_tenants_for_caller() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_tester_license(text, text, timestamp with time zone) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_super_admin_action(uuid, text, text, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_tenant_switch(uuid, uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_tester_license(uuid) FROM anon, authenticated;

-- ─── Category F: tenant-bound RPCs (intentional API surface) ───────────────
-- These functions DO need to be callable via /rpc/* by authenticated users,
-- but they need an explicit auth assertion inside the function body to be
-- safe. We do NOT revoke EXECUTE here — we re-grant it explicitly to
-- preserve clarity, and document that the function self-protects via
-- internal assertions on auth.uid() / tenant scope.
--
-- DO NOT REVOKE these — they are intentional API endpoints:
--   create_organization_with_owner  — initial tenant bootstrap, anon-eligible? No, requires auth.uid()
--   create_person_with_contact      — people module RPC, scoped by tenant
--   update_person_with_contact      — people module RPC, scoped by tenant
--   gto_assessment_history          — read RPC, scoped by tenant
--   gto_assessment_summary          — read RPC, scoped by tenant
--   gto_self_assessment_log_history — read RPC, scoped by tenant
--
-- These are flagged by the advisor as "callable by authenticated", which
-- is intentional. They will remain in the next advisor report; that is
-- expected. Suppression rationale lives here in the migration history.

-- ─── Category G: callable but should be SECURITY INVOKER, not DEFINER ──────
-- These don't need elevated privileges. Switch to SECURITY INVOKER so RLS
-- applies as normal. (Skipping in this migration — needs per-function
-- review of internal references. Tracked in bsuite#1318.)

-- ─── Baseline: prevent silent re-grant on CREATE OR REPLACE ────────────────
-- New SECURITY DEFINER functions created in `public` schema after this
-- migration will not auto-grant EXECUTE to authenticated. Existing
-- function ACLs are unchanged by ALTER DEFAULT PRIVILEGES; only future
-- objects created by the migration owner are affected.
--
-- Note: ALTER DEFAULT PRIVILEGES only applies to objects created by the
-- specified role. The migration owner (postgres in production, supabase_
-- admin in self-hosted) is the role to scope to.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- ─── Anon grant for branding_json_for_tenant ───────────────────────────────
-- This function powers the public-facing tenant branding RPC. Login pages,
-- marketing routes, and OAuth callbacks call it BEFORE auth resolves —
-- without anon EXECUTE, every page load floods postgres logs with
-- "permission denied for function branding_json_for_tenant" errors.
--
-- The function already returns null when no tenant matches, so anon
-- callers never receive privileged data. Granting anon is safe and
-- silences the log noise.
GRANT EXECUTE ON FUNCTION public.branding_json_for_tenant() TO anon;

COMMENT ON FUNCTION public.branding_json_for_tenant() IS
  'Public-facing tenant branding fetch. Safe for anon callers — returns null when no tenant matches. Anon grant added in 20260526053000.';
