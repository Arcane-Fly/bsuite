-- =====================================================
-- Migration: platform_branding table
-- =====================================================
-- Tier 1 of the three-tier white-label hierarchy.
-- Stores developer/owner-level platform defaults applied to ALL apps
-- and ALL tenants that have not set their own override.
--
-- Relationship to tenant_branding:
--   - tenant_branding rows with tenant_id IS NULL previously served as
--     Tier 1. This table replaces that pattern with a dedicated schema.
--   - The NULL row in tenant_branding is preserved for backward compat
--     but useBranding() should prefer platform_branding going forward.
--
-- force_override_tenant_ids:
--   - Array of tenant UUIDs whose org-level branding is forcibly reset
--     to platform defaults. Managed via BSU super-admin "Force platform
--     brand" UI action. Set a tenant's UUID in this array to override
--     their Tier 2 settings; remove it to restore their autonomy.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_branding (
  id                        TEXT        PRIMARY KEY DEFAULT 'platform'
                                        CHECK (id = 'platform'),  -- singleton row
  platform_name             TEXT        NOT NULL DEFAULT 'BSuite',
  -- Logo variants (light/dark per slot)
  logo_light_url            TEXT,
  logo_dark_url             TEXT,
  favicon_url               TEXT,
  -- Colour tokens
  primary_color             TEXT,
  secondary_color           TEXT,
  accent_color              TEXT,
  surface_color             TEXT,
  bg_base                   TEXT,
  -- Typography
  header_font               TEXT        NOT NULL DEFAULT 'Inter',
  body_font                 TEXT        NOT NULL DEFAULT 'Inter',
  -- Visual FX (Neon Electric theme defaults)
  glow_color                TEXT,
  glow_intensity            NUMERIC,
  shadow_style              TEXT,
  gradient_from             TEXT,
  gradient_to               TEXT,
  gradient_direction        TEXT,
  heading_gradient          TEXT,
  card_gradient             TEXT,
  border_radius_preset      TEXT,
  -- Custom CSS applied globally when no tenant override exists
  custom_css                TEXT,
  -- Platform owner force-override: tenants in this array cannot use
  -- their own Tier 2 branding — platform defaults are enforced for them
  force_override_tenant_ids UUID[]      NOT NULL DEFAULT '{}',
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single platform row
INSERT INTO public.platform_branding (id)
VALUES ('platform')
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_platform_branding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_branding_updated_at ON public.platform_branding;
CREATE TRIGGER platform_branding_updated_at
  BEFORE UPDATE ON public.platform_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_branding_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (all apps need to read platform defaults)
DROP POLICY IF EXISTS "platform_branding_select" ON public.platform_branding;
CREATE POLICY "platform_branding_select"
  ON public.platform_branding FOR SELECT
  TO authenticated
  USING (true);

-- Also allow public/anon read for SSR / unauthenticated branding load
DROP POLICY IF EXISTS "platform_branding_select_anon" ON public.platform_branding;
CREATE POLICY "platform_branding_select_anon"
  ON public.platform_branding FOR SELECT
  TO anon
  USING (true);

-- INSERT: platform admin only (singleton row seeded above, but allow re-seed)
DROP POLICY IF EXISTS "platform_branding_insert" ON public.platform_branding;
CREATE POLICY "platform_branding_insert"
  ON public.platform_branding FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

-- UPDATE: platform admin only
DROP POLICY IF EXISTS "platform_branding_update" ON public.platform_branding;
CREATE POLICY "platform_branding_update"
  ON public.platform_branding FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

-- DELETE: nobody (singleton row should never be deleted)
DROP POLICY IF EXISTS "platform_branding_delete" ON public.platform_branding;
CREATE POLICY "platform_branding_delete"
  ON public.platform_branding FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE public.platform_branding IS
  'Tier 1 of the three-tier white-label hierarchy. Single row (id=''platform'') '
  'storing developer/owner branding defaults. Applied everywhere unless a tenant has '
  'set a Tier 2 (tenant_branding) or Tier 3 (tenant_app_branding) override, '
  'unless the tenant UUID appears in force_override_tenant_ids.';
