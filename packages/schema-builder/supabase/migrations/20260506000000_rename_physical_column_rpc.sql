-- 20260506000000_rename_physical_column_rpc.sql
-- Phase 3 Workstream B per docs/20260504-schema-builder-phase-3-plan-v1.00W.md §3.B.
--
-- Adds:
--   1. public.schema_mutations_audit — per-tenant audit log for destructive
--      schema mutations initiated from the Schema Builder UI
--   2. public.rename_physical_column(p_entity_id, p_field_id, p_new_name,
--      p_dry_run) SECURITY DEFINER RPC — dry-run/wet-run two-phase path for
--      ALTER TABLE … RENAME COLUMN against the physical table behind a
--      tenant_entities row. Writes an audit row BEFORE execution so failed
--      attempts are recorded.
--
-- The physical table name is derived from `tenant_entities.name` (snake_case
-- identifier — see `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql`).
-- `tenant_entities` has NO `physical_table_name` column. Non-system entities
-- without a matching `public.<name>` table are handled gracefully via
-- `to_regclass` — the RPC returns `{ executed: false, reason: 'no_physical_table' }`
-- without writing audit or executing DDL.
--
-- ⚠️  DEV-FIXTURE COPY — DO NOT EDIT HERE.
-- Canonical location: business-suite-unified/supabase/migrations/20260506000000_rename_physical_column_rpc.sql
-- This copy exists only so `pnpm --filter @bsuite/schema-builder test` can spin up a
-- self-contained Supabase fixture. See README.md in this directory for the hard rule
-- and sync workflow.
--
-- -----------------------------------------------------------------------
-- ROLLBACK (for reference — DO NOT apply automatically):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.rename_physical_column(uuid, uuid, text, boolean);
--   DROP TABLE IF EXISTS public.schema_mutations_audit;
--   COMMIT;
-- -----------------------------------------------------------------------
--
-- SECURITY POSTURE
-- ----------------
-- This RPC is the ONLY path from client code to `ALTER TABLE … RENAME COLUMN`
-- in the BSuite product. Defence-in-depth:
--   (a) SECURITY DEFINER with `SET search_path = ''` so function body cannot
--       be hijacked by a per-session search_path rewrite
--   (b) All object references fully schema-qualified (`public.*`, `auth.*`,
--       `information_schema.*`, `pg_catalog.*`)
--   (c) Role gate: caller must be `admin` or `owner` in the entity's tenant
--       (owner-only for NULL-tenant platform entities)
--   (d) Identifier regex: `p_new_name ~ '^[a-z][a-z0-9_]{0,62}$'` — BEFORE
--       reaching any `format('%I', …)` call
--   (e) All dynamic DDL uses `format('ALTER TABLE %I RENAME COLUMN %I TO %I', …)` —
--       NEVER string concatenation for identifiers
--   (f) Audit row written BEFORE the ALTER TABLE so failed attempts are still
--       recorded. The audit row is updated with `executed=true` on success or
--       `error_code`/`error_message` on failure.
--
-- @sync-boundary-below
-- Everything below this line MUST be byte-identical with the BSU canonical copy.
-- CI parity check (.github/workflows/schema-builder-migration-parity.yml) enforces it.


-- 1. Audit log table — one row per attempted schema mutation (dry-run or wet-run).
CREATE TABLE IF NOT EXISTS public.schema_mutations_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mutation_type text NOT NULL CHECK (mutation_type IN ('rename_column')),
  entity_id uuid,
  field_id uuid,
  old_identifier text,
  new_identifier text,
  dry_run boolean NOT NULL,
  executed boolean NOT NULL DEFAULT false,
  -- DRY exemption: SQLSTATE/sqlerrm diagnostic payload from failed ALTER TABLE attempts; not an FK. Relational anchors are tenant_id/actor_id/entity_id/field_id (all *_id FKs above).
  error_code text,
  error_message text,
  would_execute text,
  affected_views jsonb NOT NULL DEFAULT '[]'::jsonb,
  affected_policies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_mutations_audit IS
  'Schema Builder §3.6.6 (Phase 3B) — audit log of destructive schema mutations '
  'initiated from the Schema Builder UI. Written EXCLUSIVELY by SECURITY DEFINER '
  'RPCs (see rename_physical_column). Clients have SELECT only, scoped to their '
  'tenant via user_tenants membership.';

CREATE INDEX IF NOT EXISTS idx_sma_tenant_created
  ON public.schema_mutations_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sma_entity
  ON public.schema_mutations_audit (entity_id)
  WHERE entity_id IS NOT NULL;

ALTER TABLE public.schema_mutations_audit ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see rows for tenants they belong to.
DROP POLICY IF EXISTS schema_mutations_audit_select ON public.schema_mutations_audit;
CREATE POLICY schema_mutations_audit_select
  ON public.schema_mutations_audit
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = public.schema_mutations_audit.tenant_id
    )
  );

-- INSERT/UPDATE/DELETE: deny to clients. The SECURITY DEFINER RPC bypasses RLS
-- for writes. No policies created for these operations = implicit deny.

-- 2. SECURITY DEFINER RPC — dry-run / wet-run two-phase ALTER TABLE RENAME COLUMN.
create or replace function public.rename_physical_column(
  p_entity_id uuid,
  p_field_id uuid,
  p_new_name text,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_entity_tenant uuid;
  v_table_name text;
  v_old_field_name text;
  v_has_role boolean;
  v_table_exists boolean;
  v_column_exists boolean;
  v_duplicate_column boolean;
  v_affected_views jsonb;
  v_affected_policies jsonb;
  v_would_execute text;
  v_audit_id uuid;
  v_result jsonb;
begin
  -- (1) Auth — must be signed in.
  if v_caller is null then
    raise exception 'insufficient_privilege: authenticated user required'
      using errcode = '42501';
  end if;

  -- (2) Identifier validation — defence-in-depth BEFORE any format('%I', …).
  --     Regex: start with lowercase letter, up to 63 chars total
  --     (Postgres identifier limit), lowercase + digits + underscore only.
  if p_new_name is null or p_new_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid_parameter_value: p_new_name must match ^[a-z][a-z0-9_]{0,62}$ (got %)', p_new_name
      using errcode = '22023';
  end if;

  -- (3) Resolve entity → tenant + physical table name (= tenant_entities.name).
  select tenant_id, name
    into v_entity_tenant, v_table_name
  from public.tenant_entities
  where id = p_entity_id;

  if v_table_name is null then
    raise exception 'invalid_parameter_value: entity % not found', p_entity_id
      using errcode = '22023';
  end if;

  -- (4) Role check — admin/owner in entity's tenant, or owner anywhere for
  --     platform (NULL-tenant) entities.
  if v_entity_tenant is null then
    select exists(
      select 1 from public.user_tenants
      where user_id = v_caller
        and role = 'owner'
    ) into v_has_role;
  else
    select exists(
      select 1 from public.user_tenants
      where user_id = v_caller
        and tenant_id = v_entity_tenant
        and role in ('admin', 'owner')
    ) into v_has_role;
  end if;

  if not coalesce(v_has_role, false) then
    raise exception 'insufficient_privilege: admin or owner role required for entity %', p_entity_id
      using errcode = '42501';
  end if;

  -- (5) Resolve field → its current metadata name + parent-entity match.
  select field_name
    into v_old_field_name
  from public.tenant_field_definitions
  where id = p_field_id
    and entity_id = p_entity_id;

  if v_old_field_name is null then
    raise exception 'invalid_parameter_value: field % not found on entity %', p_field_id, p_entity_id
      using errcode = '22023';
  end if;

  -- (6) Physical-table check. Metadata-only entities (no public.<name> table)
  --     return early WITHOUT writing audit or executing — the caller can still
  --     use the metadata-only `updateField` path for the rename.
  v_table_exists := (
    pg_catalog.to_regclass('public.' || quote_ident(v_table_name)) is not null
  );
  if not v_table_exists then
    return jsonb_build_object(
      'executed', false,
      'reason', 'no_physical_table',
      'old_field_name', v_old_field_name,
      'new_field_name', p_new_name
    );
  end if;

  -- (7) Column-exists + duplicate-column pre-flight.
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = v_table_name
      and column_name  = v_old_field_name
  ) into v_column_exists;

  if not coalesce(v_column_exists, false) then
    raise exception 'invalid_parameter_value: column %.% does not exist', v_table_name, v_old_field_name
      using errcode = '22023';
  end if;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = v_table_name
      and column_name  = p_new_name
  ) into v_duplicate_column;

  if coalesce(v_duplicate_column, false) then
    raise exception 'invalid_parameter_value: duplicate_column — %.% already exists', v_table_name, p_new_name
      using errcode = '22023';
  end if;

  -- (8) Impact analysis — views and policies that textually reference the old
  --     column name. Advisory only; NEVER fed back into SQL construction.
  select coalesce(jsonb_agg(distinct v.table_schema || '.' || v.table_name), '[]'::jsonb)
    into v_affected_views
  from information_schema.view_column_usage v
  where v.table_schema = 'public'
    and v.table_name   = v_table_name
    and v.column_name  = v_old_field_name;

  select coalesce(jsonb_agg(distinct pp.policyname), '[]'::jsonb)
    into v_affected_policies
  from pg_catalog.pg_policies pp
  where pp.schemaname = 'public'
    and pp.tablename  = v_table_name
    and (
      coalesce(pp.qual, '')       like '%' || v_old_field_name || '%'
      or coalesce(pp.with_check, '') like '%' || v_old_field_name || '%'
    );

  -- (9) Compute the DDL via `format('%I', …)` — mandatory safe identifier
  --     quoting per Phase 3 safety constraint §4.
  v_would_execute := format(
    'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
    v_table_name, v_old_field_name, p_new_name
  );

  -- (10) Audit row BEFORE execution — captures dry-runs + failed wet-runs.
  insert into public.schema_mutations_audit (
    tenant_id, actor_id, mutation_type,
    entity_id, field_id,
    old_identifier, new_identifier,
    dry_run, executed,
    would_execute, affected_views, affected_policies
  )
  values (
    v_entity_tenant, v_caller, 'rename_column',
    p_entity_id, p_field_id,
    v_old_field_name, p_new_name,
    p_dry_run, false,
    v_would_execute, v_affected_views, v_affected_policies
  )
  returning id into v_audit_id;

  v_result := jsonb_build_object(
    'executed', false,
    'audit_id', v_audit_id,
    'would_execute', v_would_execute,
    'affected_views', v_affected_views,
    'affected_policies', v_affected_policies,
    'old_field_name', v_old_field_name,
    'new_field_name', p_new_name
  );

  if p_dry_run then
    return v_result;
  end if;

  -- (11) Wet-run. Any exception is caught and recorded on the audit row
  --      before re-raising so the client observes the original error.
  begin
    execute format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      v_table_name, v_old_field_name, p_new_name
    );

    update public.tenant_field_definitions
       set field_name = p_new_name,
           updated_at = now()
     where id = p_field_id;

    update public.schema_mutations_audit
       set executed = true
     where id = v_audit_id;

    return jsonb_set(
      jsonb_set(v_result, '{executed}', 'true'::jsonb),
      '{audit_id}', to_jsonb(v_audit_id)
    );
  exception when others then
    update public.schema_mutations_audit
       set error_code    = sqlstate,
           error_message = sqlerrm
     where id = v_audit_id;
    raise;
  end;
end;
$$;

grant execute on function public.rename_physical_column(uuid, uuid, text, boolean) to authenticated;

comment on function public.rename_physical_column(uuid, uuid, text, boolean) is
  'Schema Builder §3.6.6 (Phase 3B) — two-phase (dry-run/wet-run) ALTER TABLE '
  'RENAME COLUMN. Returns jsonb with { executed, would_execute, affected_views, '
  'affected_policies, audit_id, old_field_name, new_field_name } or { executed: '
  'false, reason: ''no_physical_table'' } when the entity has no matching '
  'public.<name> table. See docs/20260504-schema-builder-phase-3-plan-v1.00W.md §3.B.';

