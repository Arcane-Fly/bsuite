-- 20260503000000_add_field_level_relations.sql
-- Phase 1a prereq per docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md §2.6.
-- Adds field-level FK columns to tenant_entity_relations + confirms Realtime.
--
-- This file is a reference copy shipped with the @bsuite/schema-builder package.
-- Ops application path: copy to business-suite-unified/supabase/migrations/ and
-- land via a BSU-owned PR before Phase 1b begins. See README.md in this dir.

BEGIN;

-- 1. Field-level FK columns (nullable — entity-to-entity rows stay valid)
ALTER TABLE public.tenant_entity_relations
  ADD COLUMN IF NOT EXISTS source_field_id uuid
    REFERENCES public.tenant_field_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_field_id uuid
    REFERENCES public.tenant_field_definitions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tenant_entity_relations.source_field_id IS
  'Field-level FK source column. NULL = entity-to-entity relation (legacy). '
  'Set by Schema Builder when the user drags from a field-row handle per §3.9.';

COMMENT ON COLUMN public.tenant_entity_relations.target_field_id IS
  'Field-level FK target column. Almost always the primary key of the target entity.';

-- 1b. Referential-action columns for field-level FKs
ALTER TABLE public.tenant_entity_relations
  ADD COLUMN IF NOT EXISTS on_delete text
    CHECK (on_delete IS NULL OR on_delete IN ('CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION')),
  ADD COLUMN IF NOT EXISTS on_update text
    CHECK (on_update IS NULL OR on_update IN ('CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'));

COMMENT ON COLUMN public.tenant_entity_relations.on_delete IS
  'ON DELETE referential action for field-level FKs. NULL for entity-level rows.';
COMMENT ON COLUMN public.tenant_entity_relations.on_update IS
  'ON UPDATE referential action for field-level FKs. NULL for entity-level rows.';

-- 2. Integrity guard — both field IDs present or both NULL (never mismatched)
ALTER TABLE public.tenant_entity_relations
  DROP CONSTRAINT IF EXISTS chk_field_level_pair;
ALTER TABLE public.tenant_entity_relations
  ADD CONSTRAINT chk_field_level_pair
  CHECK (
    (source_field_id IS NULL AND target_field_id IS NULL)
    OR
    (source_field_id IS NOT NULL AND target_field_id IS NOT NULL)
  );

-- 3. Performance indexes for the typical Schema Builder queries
CREATE INDEX IF NOT EXISTS idx_ter_source_field
  ON public.tenant_entity_relations (source_field_id)
  WHERE source_field_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ter_target_field
  ON public.tenant_entity_relations (target_field_id)
  WHERE target_field_id IS NOT NULL;

-- 4. Realtime publication — idempotent add
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tenant_entity_relations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_entity_relations;
  END IF;
END $$;

COMMIT;
