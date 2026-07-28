-- Enterprise licence seat events (master roadmap EPIC 2026-07-27).
-- Tracks over-cap invites under enterprise annual grace, future Xero invoice
-- linkage (xero_invoice_id), and paid reconciliation via webhook later.
--
-- RLS: tenant members can read own tenant rows; insert for authenticated
-- tenant admins; platform admins full access for developer-portal invoicing.

CREATE TABLE IF NOT EXISTS public.enterprise_licence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  team_id uuid NULL,
  event_type text NOT NULL
    CHECK (event_type IN (
      'grace_invite',
      'grace_add_member',
      'invoiced',
      'paid',
      'expired',
      'seats_increased'
    )),
  seats_delta integer NOT NULL DEFAULT 1
    CHECK (seats_delta <> 0),
  seat_count_at_event integer NOT NULL DEFAULT 0
    CHECK (seat_count_at_event >= 0),
  occupied_at_event integer NOT NULL DEFAULT 0
    CHECK (occupied_at_event >= 0),
  invite_email text NULL,
  invitation_id uuid NULL,
  grace_until timestamptz NULL,
  notified_at timestamptz NULL,
  invoiced_at timestamptz NULL,
  paid_at timestamptz NULL,
  xero_invoice_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_licence_events_tenant_created_idx
  ON public.enterprise_licence_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS enterprise_licence_events_grace_open_idx
  ON public.enterprise_licence_events (tenant_id, grace_until)
  WHERE event_type = 'grace_invite' AND paid_at IS NULL AND invoiced_at IS NULL;

COMMENT ON TABLE public.enterprise_licence_events IS
  'Additional-seat / grace-invite audit for enterprise annual plans. Xero fields filled when developer portal invoices and webhooks reconcile.';

ALTER TABLE public.enterprise_licence_events ENABLE ROW LEVEL SECURITY;

-- Tenant read
DROP POLICY IF EXISTS enterprise_licence_events_tenant_select ON public.enterprise_licence_events;
CREATE POLICY enterprise_licence_events_tenant_select
  ON public.enterprise_licence_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT public.auth_tenant_id())
    OR public.is_platform_admin()
  );

-- Tenant insert (grace invite path from BSU admin UI)
DROP POLICY IF EXISTS enterprise_licence_events_tenant_insert ON public.enterprise_licence_events;
CREATE POLICY enterprise_licence_events_tenant_insert
  ON public.enterprise_licence_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_id())
    OR public.is_platform_admin()
  );

-- Platform admin update (invoice / paid stamps)
DROP POLICY IF EXISTS enterprise_licence_events_platform_update ON public.enterprise_licence_events;
CREATE POLICY enterprise_licence_events_platform_update
  ON public.enterprise_licence_events
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR tenant_id IN (SELECT public.auth_tenant_id())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR tenant_id IN (SELECT public.auth_tenant_id())
  );

GRANT SELECT, INSERT, UPDATE ON public.enterprise_licence_events TO authenticated;
