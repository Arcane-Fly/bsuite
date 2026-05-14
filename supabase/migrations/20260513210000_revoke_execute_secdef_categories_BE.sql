-- Phase 2.1B + 2.1E + 2.1D EXECUTE lockdown
-- Per bsuite#953 + Supabase advisor authenticated_security_definer_function_executable.
-- Already applied to prod via Supabase MCP apply_migration at 2026-05-13T13:40Z-13:50Z.

-- ─── Category B: 25 RLS helpers (called from policies, NOT app RPC) ─────────
REVOKE EXECUTE ON FUNCTION public.auth_tenant_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_tenant_id_with_role(text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_module_access(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_portal_role(uuid, uuid, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_tenant_access(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_apprentice_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_gto_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_host_employer_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_context(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visible_tenant_ids(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_parent_admin_access(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_dev_mode() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_demo_write_blocked() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_staff() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gto_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_admin(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.platform_is_developer_or_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.r7_candidate_id_for_auth_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_bs_oauth_subject_portal_role(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.show_demo_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tenant_branding_is_force_overridden(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_org_access(uuid, uuid) FROM anon, authenticated;

-- ─── Category E: 7 utility functions with zero app-code RPC callers ────────
REVOKE EXECUTE ON FUNCTION public.ancestors_of(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.descendants_of(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.branding_json_for_platform() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_descendant_tenant_ids(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sharing_level(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visible_fields(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reflect_entity_schema(text, text) FROM anon, authenticated;

-- ─── Category D: anon-callable lockdown ────────────────────────────────────
-- find_orphan_owned_tenants_for_caller: meaningful only for authenticated callers
REVOKE EXECUTE ON FUNCTION public.find_orphan_owned_tenants_for_caller() FROM anon;
