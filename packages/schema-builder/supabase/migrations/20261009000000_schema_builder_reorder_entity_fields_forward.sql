-- 20261009000000_schema_builder_reorder_entity_fields_forward.sql
--
-- ⚠️  DEV-FIXTURE COPY — DO NOT EDIT HERE.
-- Canonical location: business-suite-unified/supabase/migrations/20261009000000_schema_builder_reorder_entity_fields_forward.sql
-- This copy exists only so `pnpm --filter @bsuite/schema-builder test` can spin
-- up a self-contained Supabase fixture. See README.md in this directory for the
-- hard rule and sync workflow.
--
-- REHEARSAL: this file is a byte-identical copy of a BSU migration that sorts
-- ahead of it in a whole-estate replay, so every object it declares already
-- exists by the time it runs and its catalog census cannot move. That is not a
-- broken migration — it is what a dev-fixture copy IS. The claim below is the
-- accurate one, and it sits ABOVE the sync boundary because the BSU canonical
-- copy must NOT carry it: there the migration really does move the census.
--
-- RESTORED 2026-09-04 (FOLLOW 87): the 2026-09-04 gitlink mirror
-- (2137caec) copied the BSU canonical file in verbatim, including the header
-- above this boundary, which silently deleted this marker. The parity gate
-- did not catch it — Check 3 only compares content BELOW the boundary, and a
-- full-file copy trivially matches itself there. README.md's documented sync
-- step ("cp ... verbatim") is corrected in the same PR to say so explicitly.
-- rehearsal: already-enforced
-- @sync-boundary-below
-- Everything below this line MUST be byte-identical with the BSU canonical copy.
-- CI parity check (.github/workflows/schema-builder-migration-parity.yml) enforces it.
--
-- FOLLOW 57 class: no begin;/commit; here — the shared applier already wraps
-- every migration file in --single-transaction, and a file-local COMMIT
-- would end that outer transaction early. Already applied and recorded in
-- production (version-keyed ledger), so this is file hygiene only.

-- 1. Backfill NULL / default-0 sort_order deterministically per entity.
UPDATE public.tenant_field_definitions tfd
SET sort_order = t.rn - 1
FROM (
  SELECT id, row_number() OVER (PARTITION BY entity_id ORDER BY created_at, id) AS rn
  FROM public.tenant_field_definitions
) t
WHERE tfd.id = t.id
  AND (tfd.sort_order IS NULL OR tfd.sort_order = 0);

ALTER TABLE public.tenant_field_definitions ALTER COLUMN sort_order SET DEFAULT 0;

DO $$
BEGIN
  UPDATE public.tenant_field_definitions SET sort_order = 0 WHERE sort_order IS NULL;
  ALTER TABLE public.tenant_field_definitions ALTER COLUMN sort_order SET NOT NULL;
EXCEPTION WHEN others THEN
  -- Swallow "already NOT NULL" drift (42P16) so the migration stays idempotent.
  IF SQLSTATE NOT IN ('42P16') THEN RAISE; END IF;
END $$;

-- 2. Composite index for the canonical ordered read.
CREATE INDEX IF NOT EXISTS idx_tfd_entity_sort
  ON public.tenant_field_definitions (entity_id, sort_order)
  WHERE is_active = true;

-- 3. Realtime publication — idempotent ADD TABLE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'tenant_field_definitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_field_definitions;
  END IF;
END $$;

-- 4. SECURITY DEFINER RPC — atomic reorder with auth + completeness checks.
--
--    THREAT MODEL. This function writes only `sort_order` on rows the caller's
--    tenant already owns, and executes NO dynamic SQL. Its exposure is
--    therefore limited to reordering fields the caller can already see.
--      - search_path pinned to '' ; every reference schema-qualified.
--      - No EXECUTE, no format(), no identifier ever interpolated.
--      - Role gate requires an ACTIVE membership. `status` was missing from the
--        20260505 draft, which let a revoked admin keep write authority for as
--        long as their user_tenants row survived; every other policy on this
--        table checks `status = 'active'` and this now matches them.
--      - The id array must be exactly the entity's active field set, so the
--        function cannot be used to probe for ids belonging to another entity.
create or replace function public.reorder_entity_fields(
  p_entity_id uuid,
  p_field_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
-- @SD-JUSTIFICATION: reorders tenant_field_definitions.sort_order atomically for a
--   whole entity. INVOKER cannot hold the row set stable across the rewrite under
--   RLS, and a partial reorder leaves duplicate or gapped sort_order values that the UI
--   reads as lost fields. Gated on tenant membership before any write.
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-08-31 (bsuite#2862 — added-security-definer gate)
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

  select tenant_id, true
    into v_tenant_id, v_entity_exists
  from public.tenant_entities
  where id = p_entity_id;

  if not coalesce(v_entity_exists, false) then
    raise exception 'invalid_parameter_value: entity % not found', p_entity_id
      using errcode = '22023';
  end if;

  if v_tenant_id is null then
    -- Platform-level (NULL-tenant) entities are the estate's shared defaults.
    -- D-66 makes platform scope developer-only, so mirror the DB definition
    -- (`is_platform_developer()`) rather than the looser "owner in any tenant"
    -- test the 20260505 draft used — that admitted every tenant owner in the
    -- estate to the platform's own field ordering.
    select public.is_platform_developer() into v_has_role;
  else
    select exists(
      select 1 from public.user_tenants
      where user_id = v_caller
        and tenant_id = v_tenant_id
        and status = 'active'
        and role in ('admin', 'owner')
    ) into v_has_role;
  end if;

  if not coalesce(v_has_role, false) then
    raise exception 'insufficient_privilege: admin or owner role required for entity %', p_entity_id
      using errcode = '42501';
  end if;

  select coalesce(array_agg(id order by id), array[]::uuid[])
    into v_expected_ids
  from public.tenant_field_definitions
  where entity_id = p_entity_id
    and is_active = true;

  if p_field_ids is null then
    raise exception 'invalid_parameter_value: p_field_ids must not be null'
      using errcode = '22023';
  end if;

  v_len := coalesce(array_length(p_field_ids, 1), 0);

  if v_len is distinct from coalesce(array_length(v_expected_ids, 1), 0) then
    raise exception 'invalid_parameter_value: p_field_ids length % does not match entity field count %',
        v_len, coalesce(array_length(v_expected_ids, 1), 0)
      using errcode = '22023';
  end if;

  if v_len = 0 then
    return;
  end if;

  if (select count(distinct x) from unnest(p_field_ids) as x) <> v_len then
    raise exception 'invalid_parameter_value: p_field_ids contains duplicates'
      using errcode = '22023';
  end if;

  select array_agg(x order by x) into v_provided_sorted from unnest(p_field_ids) as x;

  if v_provided_sorted is distinct from v_expected_ids then
    raise exception 'invalid_parameter_value: p_field_ids does not match the entity''s active fields'
      using errcode = '22023';
  end if;

  for i in 1..v_len loop
    update public.tenant_field_definitions
       set sort_order = i - 1,
           updated_at = now()
     where id = p_field_ids[i];
  end loop;
end;
$$;

-- PostgreSQL attaches `GRANT EXECUTE ... TO PUBLIC` on function creation, and
-- PUBLIC includes `anon`. Revoke BEFORE granting so the window never exists.
REVOKE EXECUTE ON FUNCTION public.reorder_entity_fields(uuid, uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.reorder_entity_fields(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_entity_fields(uuid, uuid[]) TO authenticated;

comment on function public.reorder_entity_fields(uuid, uuid[]) is
  'Schema Builder §3.6.5 — atomic reorder of tenant_field_definitions.sort_order '
  'for a single entity. Caller must hold an ACTIVE admin/owner membership in the '
  'entity''s tenant; platform-level (NULL-tenant) entities require '
  'is_platform_developer() per D-66. The field id array must cover exactly the '
  'active fields of the entity. No dynamic SQL. search_path pinned to ''''.';
