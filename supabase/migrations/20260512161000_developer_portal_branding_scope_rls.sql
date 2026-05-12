-- =====================================================
-- Migration: developer portal branding scope alignment
-- =====================================================
-- Aligns Tier 2/Tier 3 branding RLS with AUTH_CANONICAL.md
-- Developer-Portal-Scope matrix:
--   - platform developer/admin: all tenants
--   - enterprise_super_admin / enterprise_admin: enterprise tenant + descendants
--   - sub_org_admin: own tenant only
--   - owner/admin: own tenant only (backward compatibility)
--
-- NOTE:
-- This migration intentionally resets and recreates tenant_branding and
-- tenant_app_branding policies to avoid permissive legacy-policy overlap.
-- can_manage_tenant_branding() is SECURITY DEFINER so policy checks can read
-- membership + hierarchy tables consistently even when caller RLS is tighter.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_tenant_branding(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_platform_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND platform_role IN ('developer', 'platform_admin')
  )
  INTO is_platform_role;

  IF is_platform_role THEN
    RETURN TRUE;
  END IF;

  -- Null tenant_id is the Tier 1 compatibility row in tenant_branding.
  -- Non-platform users must never mutate this row.
  IF p_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE id = p_tenant_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Direct tenant-scoped admins (legacy + sub-org explicit role)
  IF EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.status = 'active'
      AND ut.role IN ('owner', 'admin', 'sub_org_admin')
      AND ut.tenant_id = p_tenant_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Enterprise-level admins inherit from their membership tenant downward only.
  RETURN EXISTS (
    WITH RECURSIVE
    enterprise_memberships AS (
      SELECT DISTINCT ut.tenant_id
      FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.status = 'active'
        AND ut.role IN ('enterprise_super_admin', 'enterprise_admin')
    ),
    tenant_descendants AS (
      SELECT t.id, t.parent_tenant_id, 1 AS depth
      FROM public.tenants t
      INNER JOIN enterprise_memberships em ON em.tenant_id = t.id
      UNION ALL
      SELECT c.id, c.parent_tenant_id, d.depth + 1
      FROM public.tenants c
      INNER JOIN tenant_descendants d ON c.parent_tenant_id = d.id
      WHERE d.depth < 16
    )
    SELECT 1
    FROM tenant_descendants
    WHERE id = p_tenant_id
  );
END;
$$;

COMMENT ON FUNCTION public.can_manage_tenant_branding IS
  'Returns true when auth.uid() can mutate tenant_branding/tenant_app_branding for target tenant. '
  'Allows platform developer/admin globally; enterprise_super_admin/enterprise_admin for enterprise+descendants; '
  'sub_org_admin/owner/admin for direct tenant only. See AUTH_CANONICAL.md Developer-Portal-Scope.';

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT polname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_branding'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_branding', policy_name);
  END LOOP;

  FOR policy_name IN
    SELECT polname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_app_branding'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_app_branding', policy_name);
  END LOOP;
END;
$$;

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_app_branding ENABLE ROW LEVEL SECURITY;

-- tenant_branding policies (Tier 2)
CREATE POLICY "tenant_branding_select"
  ON public.tenant_branding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tenant_branding_select_anon"
  ON public.tenant_branding FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tenant_branding_insert"
  ON public.tenant_branding FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tenant_branding(tenant_id));

CREATE POLICY "tenant_branding_update"
  ON public.tenant_branding FOR UPDATE
  TO authenticated
  USING (public.can_manage_tenant_branding(tenant_id))
  WITH CHECK (public.can_manage_tenant_branding(tenant_id));

CREATE POLICY "tenant_branding_delete"
  ON public.tenant_branding FOR DELETE
  TO authenticated
  USING (public.can_manage_tenant_branding(tenant_id));

-- tenant_app_branding policies (Tier 3)
CREATE POLICY "tenant_app_branding_select"
  ON public.tenant_app_branding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tenant_app_branding_select_anon"
  ON public.tenant_app_branding FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tenant_app_branding_insert"
  ON public.tenant_app_branding FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tenant_branding(tenant_id));

CREATE POLICY "tenant_app_branding_update"
  ON public.tenant_app_branding FOR UPDATE
  TO authenticated
  USING (public.can_manage_tenant_branding(tenant_id))
  WITH CHECK (public.can_manage_tenant_branding(tenant_id));

CREATE POLICY "tenant_app_branding_delete"
  ON public.tenant_app_branding FOR DELETE
  TO authenticated
  USING (public.can_manage_tenant_branding(tenant_id));

-- Recursive descendant checks in can_manage_tenant_branding() traverse this edge.
CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant_id_id
  ON public.tenants (parent_tenant_id, id);
