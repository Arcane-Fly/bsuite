-- =====================================================
-- Migration: Global component symbols (definitions + instances)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.component_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL,
  definition_id UUID NOT NULL REFERENCES public.component_definitions(id) ON DELETE CASCADE,
  override_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_component_definitions_tenant_name
  ON public.component_definitions (tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_component_instances_page
  ON public.component_instances (page_id);

CREATE INDEX IF NOT EXISTS idx_component_instances_definition
  ON public.component_instances (definition_id);

CREATE OR REPLACE FUNCTION public.set_component_symbols_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS component_definitions_set_updated_at ON public.component_definitions;
CREATE TRIGGER component_definitions_set_updated_at
  BEFORE UPDATE ON public.component_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_component_symbols_updated_at();

DROP TRIGGER IF EXISTS component_instances_set_updated_at ON public.component_instances;
CREATE TRIGGER component_instances_set_updated_at
  BEFORE UPDATE ON public.component_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_component_symbols_updated_at();

CREATE OR REPLACE FUNCTION public.is_platform_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND platform_role IN ('developer', 'platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_tenant_membership(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_tenant_symbols(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.component_instance_access_allowed(
  p_page_id UUID,
  p_definition_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  page_tenant_id UUID;
  has_definition_access BOOLEAN;
BEGIN
  -- component_instances inherit tenant access from custom_pages ownership.
  -- Dependency contract: public.custom_pages must expose at least
  --   - id UUID primary key
  --   - tenant_id UUID (tenant owner)
  -- Use dynamic SQL so this helper can be created in environments where
  -- custom_pages has not yet been provisioned.
  IF to_regclass('public.custom_pages') IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    EXECUTE '
    SELECT cp.tenant_id
    FROM public.custom_pages cp
    WHERE cp.id = $1
      AND (
        public.is_platform_admin_user()
        OR public.has_active_tenant_membership(cp.tenant_id)
      )
    LIMIT 1
  '
  INTO page_tenant_id
  USING p_page_id;
  EXCEPTION
    WHEN undefined_table THEN
      RETURN FALSE;
  END;

  IF page_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.component_definitions cd
    WHERE cd.id = p_definition_id
      AND (
        cd.tenant_id IS NULL
        OR cd.tenant_id = page_tenant_id
        OR public.is_platform_admin_user()
      )
  )
  INTO has_definition_access;

  RETURN has_definition_access;
END;
$$;

ALTER TABLE public.component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS component_definitions_select ON public.component_definitions;
CREATE POLICY component_definitions_select
  ON public.component_definitions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR public.has_active_tenant_membership(tenant_id)
    OR public.is_platform_admin_user()
  );

DROP POLICY IF EXISTS component_definitions_insert ON public.component_definitions;
CREATE POLICY component_definitions_insert
  ON public.component_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin_user()
    OR (
      tenant_id IS NOT NULL
      AND public.can_manage_tenant_symbols(tenant_id)
    )
  );

DROP POLICY IF EXISTS component_definitions_update ON public.component_definitions;
CREATE POLICY component_definitions_update
  ON public.component_definitions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin_user()
    OR (
      tenant_id IS NOT NULL
      AND public.can_manage_tenant_symbols(tenant_id)
    )
  )
  WITH CHECK (
    public.is_platform_admin_user()
    OR (
      tenant_id IS NOT NULL
      AND public.can_manage_tenant_symbols(tenant_id)
    )
  );

DROP POLICY IF EXISTS component_definitions_delete ON public.component_definitions;
CREATE POLICY component_definitions_delete
  ON public.component_definitions
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin_user()
    OR (
      tenant_id IS NOT NULL
      AND public.can_manage_tenant_symbols(tenant_id)
    )
  );

DROP POLICY IF EXISTS component_instances_select ON public.component_instances;
CREATE POLICY component_instances_select
  ON public.component_instances
  FOR SELECT
  TO authenticated
  USING (public.component_instance_access_allowed(page_id, definition_id));

DROP POLICY IF EXISTS component_instances_insert ON public.component_instances;
CREATE POLICY component_instances_insert
  ON public.component_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (public.component_instance_access_allowed(page_id, definition_id));

DROP POLICY IF EXISTS component_instances_update ON public.component_instances;
CREATE POLICY component_instances_update
  ON public.component_instances
  FOR UPDATE
  TO authenticated
  USING (public.component_instance_access_allowed(page_id, definition_id))
  WITH CHECK (public.component_instance_access_allowed(page_id, definition_id));

DROP POLICY IF EXISTS component_instances_delete ON public.component_instances;
CREATE POLICY component_instances_delete
  ON public.component_instances
  FOR DELETE
  TO authenticated
  USING (public.component_instance_access_allowed(page_id, definition_id));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'component_definitions'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.component_definitions';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'component_instances'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.component_instances';
    END IF;
  END IF;
END;
$$;

COMMENT ON TABLE public.component_definitions IS
  'Global and tenant-scoped page-builder symbol definitions. tenant_id NULL marks a global symbol.';

COMMENT ON TABLE public.component_instances IS
  'Page-bound symbol instances storing override JSONB merged with definition defaults at render time.';
