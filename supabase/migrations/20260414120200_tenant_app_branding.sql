-- =====================================================
-- Migration: tenant_app_branding table
-- =====================================================
-- Tier 3 of the three-tier white-label hierarchy.
-- Allows per-app logo/colour overrides scoped to a specific tenant.
-- Resolution order in useBranding():
--   tenant_app_branding (app+tenant) → tenant_branding (tenant) → platform_branding → hardcoded fallback
--
-- app_slug values match the APP REGISTRY in AGENTS.md:
--   'crm7'    — crm.crm7.app
--   'conduit' — conduit.crm7.app
--   'r8'      — r8.crm7.app
--   'braden'  — www.braden.com.au
--   'bsu'     — suite.crm7.app
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenant_app_branding (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_slug        TEXT        NOT NULL
                              CHECK (app_slug IN ('crm7', 'conduit', 'r8', 'braden', 'bsu')),
  -- Logo variants — null means fall back to tenant_branding or platform_branding
  logo_light_url  TEXT,
  logo_dark_url   TEXT,
  favicon_url     TEXT,
  -- Colour overrides — null means inherit from Tier 2 / Tier 1
  primary_color   TEXT,
  secondary_color TEXT,
  accent_color    TEXT,
  -- Optional platform name per-app (e.g. "Acme HR" in the ATS, "Acme Pay" in R80.3)
  platform_name   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, app_slug)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_tenant_app_branding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_app_branding_updated_at ON public.tenant_app_branding;
CREATE TRIGGER tenant_app_branding_updated_at
  BEFORE UPDATE ON public.tenant_app_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_app_branding_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.tenant_app_branding ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (apps need to fetch their own app-specific branding)
DROP POLICY IF EXISTS "tenant_app_branding_select" ON public.tenant_app_branding;
CREATE POLICY "tenant_app_branding_select"
  ON public.tenant_app_branding FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon read for SSR / unauthenticated initial load
DROP POLICY IF EXISTS "tenant_app_branding_select_anon" ON public.tenant_app_branding;
CREATE POLICY "tenant_app_branding_select_anon"
  ON public.tenant_app_branding FOR SELECT
  TO anon
  USING (true);

-- INSERT: org owner/admin for their own tenant OR platform admin for any
DROP POLICY IF EXISTS "tenant_app_branding_insert" ON public.tenant_app_branding;
CREATE POLICY "tenant_app_branding_insert"
  ON public.tenant_app_branding FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = auth.uid()
        AND user_tenants.tenant_id = tenant_app_branding.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- UPDATE: same as INSERT
DROP POLICY IF EXISTS "tenant_app_branding_update" ON public.tenant_app_branding;
CREATE POLICY "tenant_app_branding_update"
  ON public.tenant_app_branding FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = auth.uid()
        AND user_tenants.tenant_id = tenant_app_branding.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = auth.uid()
        AND user_tenants.tenant_id = tenant_app_branding.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- DELETE: org admin deletes their own rows; platform admin deletes any
DROP POLICY IF EXISTS "tenant_app_branding_delete" ON public.tenant_app_branding;
CREATE POLICY "tenant_app_branding_delete"
  ON public.tenant_app_branding FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = auth.uid()
        AND user_tenants.tenant_id = tenant_app_branding.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- =====================================================
-- Performance index
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenant_app_branding_lookup
  ON public.tenant_app_branding (tenant_id, app_slug);

COMMENT ON TABLE public.tenant_app_branding IS
  'Tier 3 of the three-tier white-label hierarchy. Per-app branding overrides '
  'scoped to a specific tenant. Null fields fall back to tenant_branding (Tier 2) '
  'then platform_branding (Tier 1). app_slug must be one of: crm7, conduit, r8, braden, bsu.';
