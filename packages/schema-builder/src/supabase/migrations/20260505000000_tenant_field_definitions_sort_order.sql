-- =============================================================================
-- Phase 3A: Sort order + reorder RPC for @bsuite/schema-builder
-- Migration: 20260505000000_tenant_field_definitions_sort_order.sql
-- =============================================================================
-- Adds `sort_order` to tenant_field_definitions, backfills existing rows,
-- creates a composite index, updates get_entity_fields ordering, and
-- introduces the reorder_entity_fields SECURITY DEFINER RPC.
--
-- Rollback SQL:
--   ALTER TABLE tenant_field_definitions DROP COLUMN sort_order;
--   DROP FUNCTION reorder_entity_fields;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add sort_order column (additive, backward-compatible)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_field_definitions
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows: spacing by 10 within each entity, ordered by
--    created_at so the visual order matches the historical insertion order
-- ---------------------------------------------------------------------------
UPDATE public.tenant_field_definitions tfd
SET    sort_order = src.rn * 10
FROM   (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY entity_id
      ORDER BY     created_at ASC
    ) AS rn
  FROM public.tenant_field_definitions
) src
WHERE  tfd.id = src.id;

-- ---------------------------------------------------------------------------
-- 3. Composite index: efficient fetch+sort per entity
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_tfd_entity_sort_order
  ON public.tenant_field_definitions (entity_id, sort_order);

-- ---------------------------------------------------------------------------
-- 4. Replace get_entity_fields: now reads the real sort_order column and
--    orders by sort_order NULLS LAST, created_at (replaces Phase 1 version
--    which used 0 AS sort_order and ordered by created_at only).
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
      tfd.sort_order,
      tfd.created_at
    FROM   public.tenant_field_definitions tfd
    WHERE  tfd.entity_id = p_entity_id
      AND  tfd.tenant_id = v_tenant_id
    ORDER  BY tfd.sort_order NULLS LAST, tfd.created_at ASC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. reorder_entity_fields RPC
--    Validates tenant ownership + array completeness, then bulk-updates
--    sort_order = array_position(p_field_ids, id) * 10 in one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_entity_fields(
  p_entity_id uuid,
  p_field_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id   uuid;
  v_field_count integer;
  v_match_count integer;
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

  -- Validate: array must cover exactly the entity's fields (no missing, no extra)
  SELECT count(*) INTO v_field_count
  FROM   public.tenant_field_definitions
  WHERE  entity_id = p_entity_id
    AND  tenant_id = v_tenant_id;

  SELECT count(*) INTO v_match_count
  FROM   public.tenant_field_definitions tfd
  WHERE  tfd.entity_id = p_entity_id
    AND  tfd.tenant_id = v_tenant_id
    AND  tfd.id        = ANY(p_field_ids);

  IF array_length(p_field_ids, 1) IS DISTINCT FROM v_field_count THEN
    RAISE EXCEPTION
      'reorder_entity_fields: p_field_ids length (%) does not match field count (%)',
      array_length(p_field_ids, 1), v_field_count;
  END IF;

  IF v_match_count <> v_field_count THEN
    RAISE EXCEPTION
      'reorder_entity_fields: p_field_ids contains unknown or cross-tenant field IDs';
  END IF;

  -- Bulk update: sort_order = array_position * 10
  UPDATE public.tenant_field_definitions tfd
  SET    sort_order = array_position(p_field_ids, tfd.id) * 10
  WHERE  tfd.entity_id = p_entity_id
    AND  tfd.tenant_id = v_tenant_id;
END;
$$;
