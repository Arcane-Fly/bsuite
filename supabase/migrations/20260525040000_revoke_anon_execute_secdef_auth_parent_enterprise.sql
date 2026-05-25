-- Phase 2.1B+C extension: lock down 2 SECURITY DEFINER functions still anon-callable
-- Source: Supabase advisor `anon_security_definer_function_executable` (2 WARN findings).
-- Audit date: 2026-05-25 (DB rotation, bsuite#1259).
--
-- Both functions are referenced ONLY by `report_templates` policies scoped to
-- `{authenticated}` (verified via pg_policies join — see audit log in bsuite#1259).
-- Neither is invoked from any anon-scoped RLS predicate, so revoking anon EXECUTE
-- cannot break anonymous SELECT paths.
--
--   - public.auth_parent_tenant_id()  — returns parent tenant from JWT; anon has no JWT
--   - public.is_enterprise_admin()    — admin role check; always false for anon
--
-- This closes the remaining 2 anon-callable SECURITY DEFINER findings that were
-- left out of the 20260513210000 Category B/D/E lockdown batch.

REVOKE EXECUTE ON FUNCTION public.auth_parent_tenant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_enterprise_admin() FROM anon;
