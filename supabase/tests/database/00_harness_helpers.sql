-- supabase/tests/database/00_harness_helpers.sql
-- Shared JWT / role simulation helpers for bsuite parent pgTAP suites.
-- Mirrors the strategy used in the crm7 pgTAP harness (HF-4) so test
-- authoring stays consistent across repos.
--
-- PostgREST, after verifying a JWT, does exactly two things before
-- running your query:
--   1. SET LOCAL request.jwt.claims = '…';  (signed JWT body as JSON)
--   2. SET LOCAL role = <role claim>;        (anon | authenticated)
--
-- These helpers reproduce those side-effects inside a psql/pg_prove
-- session so that RLS policies marked TO authenticated / TO anon
-- evaluate identically to a real HTTP request.

\set ON_ERROR_STOP 1

CREATE SCHEMA IF NOT EXISTS test_rls;

-- ── sign_in_as_authenticated ──────────────────────────────────────────────
-- Simulate an authenticated PostgREST session for a given user UUID.
-- Call before every assertion block that expects row-level access.
CREATE OR REPLACE FUNCTION test_rls.sign_in_as_authenticated(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  p_user_id::text,
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true   -- is_local = true → scoped to current transaction
  );
  SET LOCAL role TO authenticated;
END;
$$;

-- ── sign_in_as_anon ───────────────────────────────────────────────────────
-- Simulate an unauthenticated (anon) PostgREST session.
CREATE OR REPLACE FUNCTION test_rls.sign_in_as_anon()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'anon')::text,
    true
  );
  SET LOCAL role TO anon;
END;
$$;

-- ── reset_role ────────────────────────────────────────────────────────────
-- Restore the session to the superuser / postgres role so fixture INSERTs
-- that bypass RLS can proceed cleanly before the next assertion block.
CREATE OR REPLACE FUNCTION test_rls.reset_role()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RESET role;
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;
