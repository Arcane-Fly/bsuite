-- =====================================================
-- Migration: Stripe FDW baseline for read-only Stripe data paths
-- =====================================================
-- Canonical rule: new Stripe data reads should use Supabase Wrappers Stripe FDW
-- instead of introducing additional edge-function read proxies.
--
-- Secret handling:
--   - This migration NEVER inlines a Stripe key.
--   - Operator must create Vault secret first (outside git history), e.g.:
--       select vault.create_secret('sk_...', 'stripe_api_key', 'Stripe Secret Key');
-- =====================================================

CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

CREATE FOREIGN DATA WRAPPER IF NOT EXISTS stripe_wrapper
  HANDLER extensions.stripe_fdw_handler
  VALIDATOR extensions.stripe_fdw_validator;

CREATE SCHEMA IF NOT EXISTS stripe;

DO $$
DECLARE
  v_stripe_api_key_id uuid;
BEGIN
  SELECT id
  INTO v_stripe_api_key_id
  FROM vault.decrypted_secrets
  WHERE name = 'stripe_api_key'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stripe_api_key_id IS NULL THEN
    RAISE EXCEPTION
      'Missing Vault secret "stripe_api_key". Create it first, e.g. vault.create_secret(''sk_...'',''stripe_api_key'',''Stripe Secret Key'') before applying this migration.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'stripe_server') THEN
    EXECUTE format(
      'ALTER SERVER stripe_server OPTIONS (SET api_key_id %L)',
      v_stripe_api_key_id::text
    );
  ELSE
    EXECUTE format(
      'CREATE SERVER stripe_server FOREIGN DATA WRAPPER stripe_wrapper OPTIONS (api_key_id %L)',
      v_stripe_api_key_id::text
    );
  END IF;
END
$$;

CREATE FOREIGN TABLE IF NOT EXISTS stripe.customers (
  id text,
  email text,
  name text,
  created timestamptz,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'customers',
  rowid_column 'id'
);

CREATE FOREIGN TABLE IF NOT EXISTS stripe.invoices (
  id text,
  customer text,
  subscription text,
  status text,
  total bigint,
  currency text,
  created timestamptz,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'invoices',
  rowid_column 'id'
);

CREATE FOREIGN TABLE IF NOT EXISTS stripe.subscriptions (
  id text,
  customer text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created timestamptz,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'subscriptions',
  rowid_column 'id'
);

CREATE FOREIGN TABLE IF NOT EXISTS stripe.prices (
  id text,
  product text,
  active boolean,
  currency text,
  unit_amount bigint,
  type text,
  recurring jsonb,
  created timestamptz,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'prices',
  rowid_column 'id'
);

CREATE FOREIGN TABLE IF NOT EXISTS stripe.products (
  id text,
  name text,
  active boolean,
  default_price text,
  created timestamptz,
  attrs jsonb
)
SERVER stripe_server
OPTIONS (
  object 'products',
  rowid_column 'id'
);

REVOKE ALL ON SCHEMA stripe FROM PUBLIC;
GRANT USAGE ON SCHEMA stripe TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA stripe FROM PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA stripe TO service_role;

CREATE OR REPLACE FUNCTION public.stripe_customer_by_email(p_email text)
RETURNS TABLE (
  id text,
  email text,
  name text,
  created timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, stripe
AS $$
DECLARE
  caller_role text := coalesce(auth.jwt() ->> 'role', 'none');
BEGIN
  IF caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'stripe_customer_by_email requires service_role (got: %)', caller_role
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT c.id, c.email, c.name, c.created
  FROM stripe.customers c
  WHERE lower(c.email) = lower(p_email)
  ORDER BY c.created DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.stripe_subscription_snapshot(p_customer_id text)
RETURNS TABLE (
  subscription_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  price_ids text[],
  product_ids text[],
  created timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, stripe
AS $$
DECLARE
  caller_role text := coalesce(auth.jwt() ->> 'role', 'none');
BEGIN
  IF caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'stripe_subscription_snapshot requires service_role (got: %)', caller_role
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.status,
    s.current_period_start,
    s.current_period_end,
    (
      SELECT coalesce(array_agg(item -> 'price' ->> 'id'), ARRAY[]::text[])
      FROM jsonb_array_elements(subscription_items.items) item
    ) AS price_ids,
    (
      SELECT coalesce(array_agg(item -> 'price' ->> 'product'), ARRAY[]::text[])
      FROM jsonb_array_elements(subscription_items.items) item
    ) AS product_ids,
    s.created
  FROM stripe.subscriptions s
  CROSS JOIN LATERAL (
    SELECT coalesce(s.attrs #> '{items,data}', '[]'::jsonb) AS items
  ) AS subscription_items
  WHERE s.customer = p_customer_id
  ORDER BY s.created DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_customer_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stripe_subscription_snapshot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_customer_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.stripe_subscription_snapshot(text) TO service_role;

COMMENT ON FUNCTION public.stripe_customer_by_email(text) IS
  'Service-role-only Stripe FDW reader. New Stripe read paths should call this RPC instead of an edge-function read proxy.';

COMMENT ON FUNCTION public.stripe_subscription_snapshot(text) IS
  'Service-role-only Stripe FDW reader for subscription status snapshots (pilot replacement for edge-function Stripe reads). Returns all subscription item price/product ids.';
