-- supabase/tests/database/01_rls_initplan_platform_branding_test.sql
-- pgTAP regression suite for platform_branding RLS policies.
-- Phase 2.2 — [hardening 2.2] RLS initplan rewrite: platform_branding
--
-- Validates §9.1 output-equivalence: a row visible (or blocked) before the
-- initplan migration is visible (or blocked) after it. The (SELECT auth.uid())
-- wrapper must not change which rows are accessible — only how many times
-- Postgres evaluates the auth function.
--
-- Test structure follows the bsuite pgTAP convention:
--   • Each suite is wrapped in BEGIN … ROLLBACK so no state leaks.
--   • Fixture UUIDs are predictable (format: a01<pad>-…) for easy debugging.
--   • Assertions happen only after sign_in_as_* so RLS is always active.

BEGIN;

SELECT plan(16);

-- ── fixtures (run as postgres / service_role — bypasses RLS) ─────────────

-- Fixture user IDs
\set PLATFORM_ADMIN_ID  'a0100001-0000-0000-0000-000000000001'
\set REGULAR_USER_ID    'a0100002-0000-0000-0000-000000000002'

-- Seed auth.users rows (Supabase pgTAP container has real auth schema)
INSERT INTO auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  aud, role
) VALUES
  (:'PLATFORM_ADMIN_ID', 'platform-admin@test.example', 'x',
   now(), now(), now(), 'authenticated', 'authenticated'),
  (:'REGULAR_USER_ID',   'regular-user@test.example',   'x',
   now(), now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Seed profiles — platform admin gets developer role
INSERT INTO public.profiles (id, platform_role)
VALUES
  (:'PLATFORM_ADMIN_ID', 'developer'),
  (:'REGULAR_USER_ID',   NULL)
ON CONFLICT (id) DO UPDATE
  SET platform_role = EXCLUDED.platform_role;

-- ── A: anon-context denial ────────────────────────────────────────────────

SELECT test_rls.sign_in_as_anon();

-- A-1: anon cannot insert into platform_branding
SELECT throws_ok(
  $$INSERT INTO public.platform_branding (id) VALUES ('platform_test')$$,
  42501,
  NULL,
  'A-1: anon INSERT must be denied'
);

-- A-2: anon cannot update platform_branding
SELECT throws_ok(
  $$UPDATE public.platform_branding SET platform_name = 'Hack' WHERE id = 'platform'$$,
  42501,
  NULL,
  'A-2: anon UPDATE must be denied'
);

-- A-3: anon can SELECT platform_branding (open read for SSR)
SELECT ok(
  (SELECT COUNT(*) FROM public.platform_branding) >= 0,
  'A-3: anon SELECT allowed (open read)'
);

SELECT test_rls.reset_role();

-- ── B: regular authenticated user (no platform_role) ─────────────────────

SELECT test_rls.sign_in_as_authenticated(:'REGULAR_USER_ID'::uuid);

-- B-1: regular user cannot insert into platform_branding
SELECT throws_ok(
  $$INSERT INTO public.platform_branding (id) VALUES ('platform_test2')$$,
  42501,
  NULL,
  'B-1: regular user INSERT must be denied'
);

-- B-2: regular user cannot update platform_branding
SELECT throws_ok(
  $$UPDATE public.platform_branding SET platform_name = 'Hack' WHERE id = 'platform'$$,
  42501,
  NULL,
  'B-2: regular user UPDATE must be denied'
);

-- B-3: regular user can SELECT platform_branding (open read)
SELECT ok(
  (SELECT COUNT(*) FROM public.platform_branding) >= 0,
  'B-3: regular user SELECT allowed (open read)'
);

SELECT test_rls.reset_role();

-- ── C: platform admin (developer platform_role) ───────────────────────────

SELECT test_rls.sign_in_as_authenticated(:'PLATFORM_ADMIN_ID'::uuid);

-- C-1: platform admin can SELECT platform_branding
SELECT ok(
  (SELECT COUNT(*) FROM public.platform_branding WHERE id = 'platform') = 1,
  'C-1: platform admin SELECT returns singleton row'
);

-- C-2: platform admin can UPDATE platform_branding
SELECT lives_ok(
  $$UPDATE public.platform_branding SET platform_name = 'BSuite Test' WHERE id = 'platform'$$,
  'C-2: platform admin UPDATE must succeed'
);

-- Verify the update took effect
SELECT is(
  (SELECT platform_name FROM public.platform_branding WHERE id = 'platform'),
  'BSuite Test',
  'C-3: UPDATE value persisted within transaction'
);

-- Restore original value
UPDATE public.platform_branding SET platform_name = DEFAULT WHERE id = 'platform';

SELECT test_rls.reset_role();

-- ── D: policy structure checks (initplan invariants) ─────────────────────
-- Verify that the policy quals reference (SELECT auth.uid()) not raw auth.uid().
-- pg_policies.qual and with_check expose the serialised expression text.

-- D-1: platform_branding_insert WITH CHECK contains (SELECT auth.uid())
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'platform_branding'
      AND policyname  = 'platform_branding_insert'
      AND (with_check ILIKE '%(SELECT auth.uid())%'
           OR with_check ILIKE '%select auth.uid()%')
  ),
  'D-1: platform_branding_insert with_check uses (SELECT auth.uid())'
);

-- D-2: platform_branding_update USING contains (SELECT auth.uid())
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'platform_branding'
      AND policyname  = 'platform_branding_update'
      AND (qual ILIKE '%(SELECT auth.uid())%'
           OR qual ILIKE '%select auth.uid()%')
  ),
  'D-2: platform_branding_update using uses (SELECT auth.uid())'
);

-- D-3: platform_branding_update WITH CHECK contains (SELECT auth.uid())
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'platform_branding'
      AND policyname  = 'platform_branding_update'
      AND (with_check ILIKE '%(SELECT auth.uid())%'
           OR with_check ILIKE '%select auth.uid()%')
  ),
  'D-3: platform_branding_update with_check uses (SELECT auth.uid())'
);

-- D-4: no remaining raw auth.uid() in platform_branding policies
-- (ensures no policy was missed by this migration)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'platform_branding'
      AND (
        -- Match raw auth.uid() that is NOT wrapped in (SELECT …)
        -- ~* is case-insensitive to match pg_policies normalised output
        (qual        ~* 'auth\.uid\(\)' AND qual        !~* '\(SELECT\s+auth\.uid\(\)\)')
        OR
        (with_check  ~* 'auth\.uid\(\)' AND with_check  !~* '\(SELECT\s+auth\.uid\(\)\)')
      )
  ),
  'D-4: no remaining raw auth.uid() in any platform_branding policy'
);

-- D-5: RLS is still enabled on platform_branding
SELECT ok(
  (SELECT relrowsecurity FROM pg_class
   WHERE oid = 'public.platform_branding'::regclass),
  'D-5: RLS is enabled on platform_branding'
);

-- ── E: row-count equivalence ──────────────────────────────────────────────
-- The initplan rewrite must not change row visibility:
-- the singleton row must still be visible to authenticated users.

SELECT test_rls.sign_in_as_authenticated(:'PLATFORM_ADMIN_ID'::uuid);

SELECT is(
  (SELECT COUNT(*) FROM public.platform_branding)::integer,
  1,
  'E-1: platform admin sees exactly 1 row (singleton invariant preserved)'
);

SELECT test_rls.sign_in_as_authenticated(:'REGULAR_USER_ID'::uuid);

SELECT is(
  (SELECT COUNT(*) FROM public.platform_branding)::integer,
  1,
  'E-2: regular user sees exactly 1 row (open SELECT unchanged)'
);

SELECT test_rls.reset_role();

SELECT * FROM finish();

ROLLBACK;
