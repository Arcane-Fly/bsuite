-- =====================================================
-- Migration: branding inheritance + platform marketing separation
-- =====================================================
-- Solves two problems:
--   1. Sub-organisations should inherit parent branding by default
--   2. Platform marketing (landing pages, heroes) should be separate from tenant branding
--
-- Changes:
--   1. Add inherit_branding_from_parent to tenant_branding (default true)
--   2. Create get_effective_branding(tenant_id) function for hierarchy resolution
--   3. Create platform_marketing table for landing page content
--   4. Move hero_image_braden, hero_image_bsu from tenant_branding to platform_marketing
--   5. Update RLS to enforce platform marketing = developer portal only
-- =====================================================

-- ─ 1. Add inheritance flag to tenant_branding ──────────────────────────────

ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS inherit_branding_from_parent BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tenant_branding.inherit_branding_from_parent IS
  'When true (default), this tenant inherits branding from its parent_tenant_id chain. '
  'Set to false to override with custom branding. Sub-organisations inherit by default.';

-- ── 2. Create effective branding resolver ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_effective_branding(p_tenant_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  company_name TEXT,
  logo_url TEXT,
  logo_light_url TEXT,
  logo_dark_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  header_font TEXT,
  body_font TEXT,
  dark_mode BOOLEAN,
  custom_css TEXT,
  glow_color TEXT,
  glow_intensity NUMERIC,
  shadow_style TEXT,
  heading_gradient TEXT,
  card_gradient TEXT,
  gradient_from TEXT,
  gradient_to TEXT,
  gradient_direction TEXT,
  platform_name TEXT,
  font_family TEXT,
  source_tenant_id UUID,
  depth INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tenant_id UUID := p_tenant_id;
  v_depth INTEGER := 0;
  v_max_depth INTEGER := 16;
  v_branding_record RECORD;
BEGIN
  -- Walk up the tenant hierarchy until we find branding with inherit=false
  -- or reach the root (NULL parent_tenant_id)
  WHILE v_current_tenant_id IS NOT NULL AND v_depth < v_max_depth LOOP
    SELECT tb.*, 0 AS depth
    INTO v_branding_record
    FROM public.tenant_branding tb
    WHERE tb.tenant_id = v_current_tenant_id;

    -- If we found branding AND it doesn't inherit from parent, return it
    IF FOUND AND v_branding_record.inherit_branding_from_parent = false THEN
      RETURN QUERY
      SELECT
        v_current_tenant_id,
        v_branding_record.company_name,
        v_branding_record.logo_url,
        v_branding_record.logo_light_url,
        v_branding_record.logo_dark_url,
        v_branding_record.primary_color,
        v_branding_record.accent_color,
        v_branding_record.header_font,
        v_branding_record.body_font,
        v_branding_record.dark_mode,
        v_branding_record.custom_css,
        v_branding_record.glow_color,
        v_branding_record.glow_intensity,
        v_branding_record.shadow_style,
        v_branding_record.heading_gradient,
        v_branding_record.card_gradient,
        v_branding_record.gradient_from,
        v_branding_record.gradient_to,
        v_branding_record.gradient_direction,
        v_branding_record.platform_name,
        v_branding_record.font_family,
        v_current_tenant_id AS source_tenant_id,
        v_depth;
      RETURN;
    END IF;

    -- Move to parent
    SELECT t.parent_tenant_id INTO v_current_tenant_id
    FROM public.tenants t
    WHERE t.id = v_current_tenant_id;

    v_depth := v_depth + 1;
  END LOOP;

  -- Fallback: return platform branding (Tier 1)
  RETURN QUERY
  SELECT
    NULL::UUID AS tenant_id,
    pb.platform_name AS company_name,
    pb.logo_light_url AS logo_url,
    pb.logo_light_url,
    pb.logo_dark_url,
    pb.primary_color,
    pb.secondary_color AS accent_color,
    pb.header_font,
    pb.body_font,
    true AS dark_mode,
    pb.custom_css,
    pb.glow_color,
    pb.glow_intensity,
    pb.shadow_style,
    pb.heading_gradient,
    pb.card_gradient,
    pb.gradient_from,
    pb.gradient_to,
    pb.gradient_direction,
    pb.platform_name,
    NULL::TEXT AS font_family,
    NULL::UUID AS source_tenant_id,
    v_depth
  FROM public.platform_branding pb
  WHERE pb.id = 'platform';
END;
$$;

COMMENT ON FUNCTION public.get_effective_branding IS
  'Resolves effective branding for a tenant by walking up the parent_tenant_id hierarchy. '
  'Returns the first ancestor with inherit_branding_from_parent=false, or platform defaults. '
  'source_tenant_id indicates which tenant in the chain provided the branding.';

-- ── 3. Create platform_marketing table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_marketing (
  id                        TEXT        PRIMARY KEY DEFAULT 'platform'
                                        CHECK (id = 'platform'),
  -- Landing page content
  landing_headline          TEXT        NOT NULL DEFAULT 'Customer Relationships, Reimagined',
  landing_subheadline       TEXT        NOT NULL DEFAULT 'Next-generation customer relationship management with intelligent automation, real-time analytics, and enterprise-grade security.',
  landing_cta_text          TEXT        NOT NULL DEFAULT 'View Dashboard',
  landing_cta_url           TEXT        NOT NULL DEFAULT '/dashboard',
  -- Hero images (platform-owned, not tenant-customizable)
  hero_image_bsu            TEXT,
  hero_image_braden         TEXT,
  hero_image_crm7           TEXT,
  -- Feature sections
  features_json             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Custom CSS for marketing pages
  marketing_css             TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single platform marketing row
INSERT INTO public.platform_marketing (id)
VALUES ('platform')
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_platform_marketing_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_marketing_updated_at ON public.platform_marketing;
CREATE TRIGGER platform_marketing_updated_at
  BEFORE UPDATE ON public.platform_marketing
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_marketing_updated_at();

-- ─ 4. RLS for platform_marketing ───────────────────────────────────────────

ALTER TABLE public.platform_marketing ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (all apps need to read marketing content)
DROP POLICY IF EXISTS "platform_marketing_select" ON public.platform_marketing;
CREATE POLICY "platform_marketing_select"
  ON public.platform_marketing FOR SELECT
  TO authenticated
  USING (true);

-- Also allow public/anon read for unauthenticated landing pages
DROP POLICY IF EXISTS "platform_marketing_select_anon" ON public.platform_marketing;
CREATE POLICY "platform_marketing_select_anon"
  ON public.platform_marketing FOR SELECT
  TO anon
  USING (true);

-- INSERT/UPDATE/DELETE: platform admin only (developer portal)
DROP POLICY IF EXISTS "platform_marketing_insert" ON public.platform_marketing;
CREATE POLICY "platform_marketing_insert"
  ON public.platform_marketing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "platform_marketing_update" ON public.platform_marketing;
CREATE POLICY "platform_marketing_update"
  ON public.platform_marketing FOR UPDATE
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

DROP POLICY IF EXISTS "platform_marketing_delete" ON public.platform_marketing;
CREATE POLICY "platform_marketing_delete"
  ON public.platform_marketing FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE public.platform_marketing IS
  'Platform-owned marketing content (landing pages, hero images). '
  'Only platform developers/admins can modify. Tenants cannot customize this.';

-- ── 5. Migrate existing hero images from tenant_branding to platform_marketing ─

-- For the platform owner (tenant_id IS NULL in tenant_branding), move hero images
UPDATE public.platform_marketing pb
SET
  hero_image_bsu = tb.hero_image_bsu,
  hero_image_braden = tb.hero_image_braden
FROM public.tenant_branding tb
WHERE tb.tenant_id IS NULL
  AND pb.id = 'platform'
  AND (tb.hero_image_bsu IS NOT NULL OR tb.hero_image_braden IS NOT NULL);

-- Note: hero_image_crm7 stays in tenant_branding because each tenant can customize their CRM7 hero

COMMENT ON COLUMN public.tenant_branding.hero_image_crm7 IS
  'CRM7 hero image — tenant-customizable. Each enterprise tenant can set their own CRM7 landing hero.';

-- ── 6. Create helper function for sub-organisation branding preview ──────────

CREATE OR REPLACE FUNCTION public.get_branding_hierarchy(p_tenant_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  parent_tenant_id UUID,
  has_custom_branding BOOLEAN,
  inherit_from_parent BOOLEAN,
  depth INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tenant_chain AS (
    SELECT t.id, t.name, t.parent_tenant_id, 0 AS depth
    FROM public.tenants t
    WHERE t.id = p_tenant_id

    UNION ALL

    SELECT t.id, t.name, t.parent_tenant_id, tc.depth + 1
    FROM public.tenants t
    INNER JOIN tenant_chain tc ON t.id = tc.parent_tenant_id
    WHERE tc.depth < 16
  )
  SELECT
    tc.tenant_id,
    tc.tenant_name,
    tc.parent_tenant_id,
    (tb.tenant_id IS NOT NULL) AS has_custom_branding,
    COALESCE(tb.inherit_branding_from_parent, true) AS inherit_from_parent,
    tc.depth
  FROM tenant_chain tc
  LEFT JOIN public.tenant_branding tb ON tb.tenant_id = tc.tenant_id
  ORDER BY tc.depth;
END;
$$;

COMMENT ON FUNCTION public.get_branding_hierarchy IS
  'Returns the full tenant hierarchy with branding status for each level. '
  'Useful for admin UI to show inheritance chain and override points.';
