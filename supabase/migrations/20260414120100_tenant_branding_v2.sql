-- =====================================================
-- Migration: tenant_branding v2 additions
-- =====================================================
-- Tier 2 of the three-tier white-label hierarchy.
-- tenant_branding already exists (20260321000000 + 20260324000000).
-- This migration adds:
--   1. platform_name override (org can rename the platform for their users)
--   2. force_platform_brand flag (org admin requests reset to Tier 1 defaults)
--   3. Ensures the NULL-row platform default seed still exists
--      (backward compat — useBranding() falls back to this row if
--      platform_branding table is unavailable)
-- =====================================================

-- Add platform_name override column (org can white-label the platform name)
ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS platform_name   TEXT,
  ADD COLUMN IF NOT EXISTS font_family     TEXT;   -- unified shorthand alongside header_font/body_font

-- Ensure the NULL-row (Tier 1 compat seed) still exists
INSERT INTO public.tenant_branding (tenant_id)
VALUES (NULL)
ON CONFLICT DO NOTHING;

-- Add a helper function: given a tenant_id, returns whether the platform
-- owner has force-overridden their branding back to platform defaults.
-- Used by useBranding() to skip Tier 2 when force_override is active.
CREATE OR REPLACE FUNCTION public.tenant_branding_is_force_overridden(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_tenant_id = ANY(force_override_tenant_ids)
  FROM public.platform_branding
  WHERE id = 'platform';
$$;

COMMENT ON FUNCTION public.tenant_branding_is_force_overridden IS
  'Returns true if the platform owner has force-overridden this tenant''s '
  'branding back to Tier 1 platform defaults via the BSU super-admin panel.';
