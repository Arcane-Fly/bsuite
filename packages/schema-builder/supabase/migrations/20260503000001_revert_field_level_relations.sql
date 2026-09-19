-- 20260503000001_revert_field_level_relations.sql
-- Rollback twin for 20260503000000_add_field_level_relations.sql.
-- Safe because target columns were all nullable — legacy entity-level rows
-- remain intact when the FK cols are dropped.
--
-- ⚠️  DEV-FIXTURE COPY — DO NOT EDIT HERE.
-- Canonical location: business-suite-unified/supabase/migrations/20260503000001_revert_field_level_relations.sql
-- See README.md in this directory for the hard rule and sync workflow.

-- @sync-boundary-below
-- Everything below this line MUST be byte-identical with the BSU canonical copy.


DROP INDEX IF EXISTS public.idx_ter_source_field;
DROP INDEX IF EXISTS public.idx_ter_target_field;

ALTER TABLE public.tenant_entity_relations
  DROP CONSTRAINT IF EXISTS chk_field_level_pair,
  DROP CONSTRAINT IF EXISTS tenant_entity_relations_source_field_id_fkey,
  DROP CONSTRAINT IF EXISTS tenant_entity_relations_target_field_id_fkey;

ALTER TABLE public.tenant_entity_relations
  DROP COLUMN IF EXISTS source_field_id,
  DROP COLUMN IF EXISTS target_field_id,
  DROP COLUMN IF EXISTS on_delete,
  DROP COLUMN IF EXISTS on_update;

