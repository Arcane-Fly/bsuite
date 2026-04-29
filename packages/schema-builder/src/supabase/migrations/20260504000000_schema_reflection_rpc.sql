-- =============================================================================
-- Phase 1: Schema reflection RPCs for @bsuite/schema-builder
-- Migration: 20260504000000_schema_reflection_rpc.sql
-- =============================================================================
-- Provides SECURITY DEFINER functions for reading and writing
-- tenant_field_definitions. All callers must be authenticated members
-- of the entity's tenant (validated via user_tenants join).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_entity_fields: read all fields for a given entity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_entity_fields(p_entity_id uuid)
RETURNS TABLE (
  id          uuid,
  entity_id   uuid,
  tenant_id   uuid,
  field_name  text,
  field_type  text,
  nullable    boolean,
  sort_order  integer,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Role check: caller must be an authenticated member of the entity's tenant
  SELECT te.tenant_id INTO v_tenant_id
  FROM   public.tenant_entities  te
  JOIN   public.user_tenants     ut ON ut.tenant_id = te.tenant_id
  WHERE  te.id       = p_entity_id
    AND  ut.user_id  = auth.uid()
    AND  ut.role     IN ('owner', 'admin', 'member')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: entity not found or access denied';
  END IF;

  RETURN QUERY
    SELECT
      tfd.id,
      tfd.entity_id,
      tfd.tenant_id,
      tfd.field_name,
      tfd.field_type,
      tfd.nullable,
      -- sort_order column does not exist yet (added in 20260505000000_tenant_field_definitions_sort_order.sql).
      -- Return 0 as a placeholder; Phase 3A migration replaces this function with a version
      -- that reads the actual sort_order column.
      0::integer AS sort_order,
      tfd.created_at
    FROM   public.tenant_field_definitions tfd
    WHERE  tfd.entity_id = p_entity_id
      AND  tfd.tenant_id = v_tenant_id
    ORDER  BY tfd.created_at ASC;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_entity_field: insert a new field definition
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_entity_field(
  p_entity_id  uuid,
  p_field_name text,
  p_field_type text,
  p_nullable   boolean DEFAULT true
)
RETURNS public.tenant_field_definitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
  v_result    public.tenant_field_definitions;
BEGIN
  -- Role check: caller must have admin or owner role
  SELECT te.tenant_id INTO v_tenant_id
  FROM   public.tenant_entities  te
  JOIN   public.user_tenants     ut ON ut.tenant_id = te.tenant_id
  WHERE  te.id       = p_entity_id
    AND  ut.user_id  = auth.uid()
    AND  ut.role     IN ('owner', 'admin')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be tenant admin or owner to create fields';
  END IF;

  -- Validate field_name (snake_case, 1–63 chars)
  IF p_field_name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'invalid field_name: must match ^[a-z][a-z0-9_]{0,62}$';
  END IF;

  INSERT INTO public.tenant_field_definitions
    (entity_id, tenant_id, field_name, field_type, nullable)
  VALUES
    (p_entity_id, v_tenant_id, p_field_name, p_field_type, p_nullable)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- update_entity_field: modify an existing field definition
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_entity_field(
  p_field_id   uuid,
  p_field_name text    DEFAULT NULL,
  p_field_type text    DEFAULT NULL,
  p_nullable   boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Role check: caller must have admin or owner role for the field's tenant
  SELECT tfd.tenant_id INTO v_tenant_id
  FROM   public.tenant_field_definitions tfd
  JOIN   public.user_tenants             ut  ON ut.tenant_id = tfd.tenant_id
  WHERE  tfd.id       = p_field_id
    AND  ut.user_id   = auth.uid()
    AND  ut.role      IN ('owner', 'admin')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: field not found or access denied';
  END IF;

  -- Validate field_name if provided
  IF p_field_name IS NOT NULL AND p_field_name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'invalid field_name: must match ^[a-z][a-z0-9_]{0,62}$';
  END IF;

  UPDATE public.tenant_field_definitions
  SET
    field_name = COALESCE(p_field_name, field_name),
    field_type = COALESCE(p_field_type, field_type),
    nullable   = COALESCE(p_nullable,   nullable)
  WHERE id = p_field_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- delete_entity_field: remove a field definition
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_entity_field(
  p_entity_id uuid,
  p_field_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Role check: caller must have admin or owner role
  SELECT te.tenant_id INTO v_tenant_id
  FROM   public.tenant_entities  te
  JOIN   public.user_tenants     ut ON ut.tenant_id = te.tenant_id
  WHERE  te.id       = p_entity_id
    AND  ut.user_id  = auth.uid()
    AND  ut.role     IN ('owner', 'admin')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: entity not found or access denied';
  END IF;

  DELETE FROM public.tenant_field_definitions
  WHERE  id        = p_field_id
    AND  entity_id = p_entity_id
    AND  tenant_id = v_tenant_id;
END;
$$;
