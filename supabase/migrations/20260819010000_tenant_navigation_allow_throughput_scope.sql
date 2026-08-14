-- 20260819010000_tenant_navigation_allow_throughput_scope.sql
--
-- WHY
-- ---
-- `tenant_navigation.app_scope` is gated by a CHECK constraint that enumerates
-- the apps allowed to carry a DB nav overlay. The list was written before
-- throughput joined the suite and still reads:
--
--     CHECK (app_scope = ANY (ARRAY['crm7','conduit','r8','braden','bsu']))
--
-- Verified live 2026-08-14 via pg_get_constraintdef on
-- `tenant_navigation_app_scope_check`.
--
-- Nav plan Phase 4.1 wired `useTenantNavigation(supabase, 'throughput')` into
-- throughput. The READ side degrades quietly (an unmatched scope simply returns
-- zero rows, so the app falls back to its static config and nothing looks
-- broken). The WRITE side does not: authoring a throughput overlay in the BSU
-- Nav Editor at /developer/nav fails with a CHECK violation. The feature was
-- therefore shipped dead — reachable in code, impossible to populate.
--
-- This is the "a guard can police what its own header exempts" shape: the
-- client was taught a vocabulary the database refuses to accept.
--
-- SCOPE OF THIS MIGRATION
-- -----------------------
-- Adds 'throughput' to the permitted set. Nothing else changes — no data is
-- touched, no policy is altered, no grant is issued. `save_tenant_navigation`
-- was inspected (pg_get_functiondef) and does NOT carry its own hardcoded
-- scope list, so this constraint is the only gate and one change closes it.
--
-- braden is deliberately RETAINED in the list even though braden's navigation
-- is platform-only and fully static (Phase 5 §7.4 D-06). Removing it would be
-- an unrelated behaviour change and is not this migration's business.
--
-- IDEMPOTENCY
-- -----------
-- DROP ... IF EXISTS then ADD. Re-running is safe. The constraint is recreated
-- with the same name so the ledger and any tooling keyed on the name still
-- resolve. NOT VALID is deliberately NOT used: the table is small and every
-- existing row already satisfies the widened predicate (widening a set can
-- never invalidate a row that passed the narrower one), so a full validating
-- add is cheap and leaves no unvalidated constraint behind.

BEGIN;

ALTER TABLE public.tenant_navigation
  DROP CONSTRAINT IF EXISTS tenant_navigation_app_scope_check;

ALTER TABLE public.tenant_navigation
  ADD CONSTRAINT tenant_navigation_app_scope_check
  CHECK (app_scope = ANY (ARRAY[
    'crm7'::text,
    'conduit'::text,
    'r8'::text,
    'braden'::text,
    'bsu'::text,
    'throughput'::text
  ]));

COMMENT ON CONSTRAINT tenant_navigation_app_scope_check ON public.tenant_navigation IS
  'Apps permitted to carry a DB nav overlay. throughput added 2026-08-14 — Phase 4.1 '
  'of docs/plans/20260814-nav-route-remediation-v1.00D.md wired useTenantNavigation for '
  'throughput but the constraint rejected every write, shipping the feature dead.';

COMMIT;
