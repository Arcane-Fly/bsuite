-- Document service-role-only intent on 3 xero_* webhook ingestion tables
-- Source: Supabase advisor `rls_enabled_no_policy` INFO (×3).
-- Audit date: 2026-05-25 (DB rotation, bsuite#1259).
--
-- The three xero_* tables (owner=postgres, RLS enabled, 0 rows) are backend-only
-- surfaces written by service_role from edge functions handling Xero OAuth +
-- webhook callbacks. They have no client-facing SELECT/INSERT paths.
--
-- Today they have NO RLS policies, which means PostgreSQL denies anon +
-- authenticated by default (service_role bypasses RLS in Supabase). That's the
-- correct security posture, but the advisor flags it as ambiguous because the
-- intent is implicit. Adding a single explicit `service_role`-scoped policy
-- AND a table comment documents the intent and silences the lint.
--
-- Tables affected:
--   - public.xero_rate_buckets       (Xero API rate-limit token buckets)
--   - public.xero_request_idempotency (Xero webhook idempotency keys)
--   - public.xero_webhook_events     (raw webhook payload audit log)
--
-- Per supabase/migrations/README.md "service-role only" template.

-- xero_rate_buckets
CREATE POLICY xero_rate_buckets_service_role_only
  ON public.xero_rate_buckets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.xero_rate_buckets
  IS 'Service-role only: Xero API rate-limit token buckets. Written by edge functions; never exposed to anon/authenticated clients.';

-- xero_request_idempotency
CREATE POLICY xero_request_idempotency_service_role_only
  ON public.xero_request_idempotency
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.xero_request_idempotency
  IS 'Service-role only: Xero webhook idempotency keys. Written by edge functions; never exposed to anon/authenticated clients.';

-- xero_webhook_events
CREATE POLICY xero_webhook_events_service_role_only
  ON public.xero_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.xero_webhook_events
  IS 'Service-role only: raw Xero webhook payload audit log. Written by edge functions; never exposed to anon/authenticated clients.';
