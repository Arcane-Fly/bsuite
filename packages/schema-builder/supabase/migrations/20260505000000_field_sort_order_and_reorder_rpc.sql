-- 20260505000000_field_sort_order_and_reorder_rpc.sql
-- Phase 3 Workstream A per docs/20260504-schema-builder-phase-3-plan-v1.00W.md §3.A.
--
-- Adds:
--   1. NOT NULL constraint on tenant_field_definitions.sort_order (backfilled)
--   2. Composite index (entity_id, sort_order) for ordered reads
--   3. SECURITY DEFINER RPC `reorder_entity_fields(p_entity_id, p_field_ids)`
--      — atomic, auth-checked, completeness-validated
--   4. Realtime publication membership for tenant_field_definitions (idempotent)
--
-- The existing Phase 5 migration (20260304090002_phase5_create_tenant_field_definitions.sql)
-- added `sort_order INT DEFAULT 0` as a NULLABLE column; this migration enforces NOT NULL
-- after a per-entity row_number() backfill for rows still at the default 0.
--
-- ⚠️  DEV-FIXTURE COPY — DO NOT EDIT HERE.
-- Canonical location: business-suite-unified/supabase/migrations/20260505000000_field_sort_order_and_reorder_rpc.sql
-- This copy exists only so `pnpm --filter @bsuite/schema-builder test` can spin up a
-- self-contained Supabase fixture. See README.md in this directory for the hard rule
-- and sync workflow.
--
-- -----------------------------------------------------------------------
-- ROLLBACK (for reference — DO NOT apply automatically):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.reorder_entity_fields(uuid, uuid[]);
--   DROP INDEX IF EXISTS public.idx_tfd_entity_sort;
--   ALTER TABLE public.tenant_field_definitions ALTER COLUMN sort_order DROP NOT NULL;
--   -- sort_order column is retained for backward compatibility; dropping it would
--   -- break existing `.order('sort_order')` queries in the package service layer.
--   -- Realtime membership is also retained — removing tables from a publication
--   -- requires `alter publication supabase_realtime drop table ...` and is
--   -- generally reversible without impact.
--   COMMIT;
-- -----------------------------------------------------------------------

-- @sync-boundary-below
-- Everything below this line MUST be byte-identical with the BSU canonical copy.
-- CI parity check (.github/workflows/schema-builder-migration-parity.yml) enforces it.

BEGIN;

-- 1. Backfill any NULL or default-0 sort_order values deterministically per entity.
--    We scope the backfill to rows whose sort_order is either NULL or 0, to avoid
--    clobbering any sort_order values already set by consumers that implemented
--    a local reorder path.
--
--    row_number() is partitioned by entity_id so each entity's fields get a
--    contiguous 0..N-1 sequence. The ORDER BY (created_at, id) is deterministic
--    for rows created at identical timestamps.
UPDATE public.tenant_field_definitions tfd
SET sort_order = t.rn - 1
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY entity_id
      ORDER BY created_at, id
    ) AS rn
  FROM public.tenant_field_definitions
) t
WHERE tfd.id = t.id
  AND (tfd.sort_order IS NULL OR tfd.sort_order = 0);

-- 2. Promote sort_order to NOT NULL (defaults remain DEFAULT 0 for new rows).
ALTER TABLE public.tenant_field_definitions
  ALTER COLUMN sort_order SET DEFAULT 0;

DO $$
BEGIN
  UPDATE public.tenant_field_definitions SET sort_order = 0 WHERE sort_order IS NULL;
  ALTER TABLE public.tenant_field_definitions
    ALTER COLUMN sort_order SET NOT NULL;
EXCEPTION WHEN others THEN
  -- Swallow "already NOT NULL" drift (42P16 = invalid_table_definition) so the
  -- migration stays idempotent across environments where someone manually
  -- applied the constraint ahead of this migration.
  IF SQLSTATE NOT IN ('42P16') THEN RAISE; END IF;
END $$;

-- 3. Composite index for the canonical ordered read pattern
--    (SELECT ... WHERE entity_id = ? AND is_active = true ORDER BY sort_order).
CREATE INDEX IF NOT EXISTS idx_tfd_entity_sort
  ON public.tenant_field_definitions (entity_id, sort_order)
  WHERE is_active = true;

-- 4. Realtime publication — idempotent ADD TABLE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tenant_field_definitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_field_definitions;
  END IF;
END $$;

-- 5. SECURITY DEFINER RPC — atomic reorder with auth + completeness checks.
--
--    Hardening:
--     - SET search_path = '' (strictest, per
--       crm7/supabase/migrations/20260427010341_security_definer_hardening.sql)
--     - All object references are fully schema-qualified (`public.*`, `auth.*`)
--     - No dynamic SQL / no `EXECUTE` — only parameterised static UPDATE
--     - Role gate: caller must hold `admin` or `owner` role in `user_tenants`
--       for the entity's tenant (platform-level NULL-tenant entities require
--       `owner` in any tenant — schema-builder is admin-tier)
--     - Array validation: provided p_field_ids MUST be the exact set of active
--       field ids for the entity — no missing, extra, or duplicates. Rejection
--       raises 22023 (invalid_parameter_value).
--     - All inserts/updates happen inside the implicit function transaction
--       so a mid-loop failure rolls back every sort_order change.
create or replace function public.reorder_entity_fields(
  p_entity_id uuid,
  p_field_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_tenant_id uuid;
  v_entity_exists boolean;
  v_expected_ids uuid[];
  v_provided_sorted uuid[];
  v_has_role boolean;
  v_len int;
begin
  if v_caller is null then
    raise exception 'insufficient_privilege: authenticated user required'
      using errcode = '42501';
  end if;

  -- Resolve the entity's tenant (NULL = platform-level / system entity).
  select tenant_id, true
    into v_tenant_id, v_entity_exists
  from public.tenant_entities
  where id = p_entity_id;

  if not coalesce(v_entity_exists, false) then
    raise exception 'invalid_parameter_value: entity % not found', p_entity_id
      using errcode = '22023';
  end if;

  -- Role check:
  --  - Tenant-scoped entity: caller must be admin or owner in that tenant.
  --  - Platform-level entity (tenant_id IS NULL): caller must be owner in at
  --    least one tenant. Schema-builder is strictly admin-tier, and mutating
  --    platform defaults should require the higher "owner" bar.
  if v_tenant_id is null then
    select exists(
      select 1 from public.user_tenants
      where user_id = v_caller
        and role = 'owner'
    ) into v_has_role;
  else
    select exists(
      select 1 from public.user_tenants
      where user_id = v_caller
        and tenant_id = v_tenant_id
        and role in ('admin', 'owner')
    ) into v_has_role;
  end if;

  if not coalesce(v_has_role, false) then
    raise exception 'insufficient_privilege: admin or owner role required for entity %', p_entity_id
      using errcode = '42501';
  end if;

  -- Fetch the current set of active field ids (sorted for deterministic compare).
  select coalesce(array_agg(id order by id), array[]::uuid[])
    into v_expected_ids
  from public.tenant_field_definitions
  where entity_id = p_entity_id
    and is_active = true;

  -- Reject null / empty array up-front only when the entity actually has fields;
  -- an entity with zero active fields accepts an empty array as a legal no-op.
  if p_field_ids is null then
    raise exception 'invalid_parameter_value: p_field_ids must not be null'
      using errcode = '22023';
  end if;

  v_len := coalesce(array_length(p_field_ids, 1), 0);

  -- Length must match.
  if v_len is distinct from coalesce(array_length(v_expected_ids, 1), 0) then
    raise exception 'invalid_parameter_value: p_field_ids length % does not match entity field count %',
        v_len, coalesce(array_length(v_expected_ids, 1), 0)
      using errcode = '22023';
  end if;

  -- No-op when both are empty.
  if v_len = 0 then
    return;
  end if;

  -- No duplicates in the provided array.
  if (select count(distinct x) from unnest(p_field_ids) as x) <> v_len then
    raise exception 'invalid_parameter_value: p_field_ids contains duplicates'
      using errcode = '22023';
  end if;

  -- Exact set match (ordered compare of sorted arrays).
  select array_agg(x order by x) into v_provided_sorted from unnest(p_field_ids) as x;

  if v_provided_sorted is distinct from v_expected_ids then
    raise exception 'invalid_parameter_value: p_field_ids does not match the entity''s active fields'
      using errcode = '22023';
  end if;

  -- Apply — 0-based index matches the package's in-memory convention.
  for i in 1..v_len loop
    update public.tenant_field_definitions
       set sort_order = i - 1,
           updated_at = now()
     where id = p_field_ids[i];
  end loop;
end;
$$;

grant execute on function public.reorder_entity_fields(uuid, uuid[]) to authenticated;

comment on function public.reorder_entity_fields(uuid, uuid[]) is
  'Schema Builder §3.6.5 (Phase 3A) — atomic reorder of tenant_field_definitions.sort_order '
  'for a single entity. Caller must be admin/owner in the entity''s tenant (owner in any '
  'tenant for platform-level entities). The field id array must cover exactly the active '
  'fields of the entity — no missing, extra, or duplicate ids. See '
  'docs/20260504-schema-builder-phase-3-plan-v1.00W.md §3.A.';

COMMIT;
