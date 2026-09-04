-- 20261009000100_schema_builder_rename_physical_column_hardened.sql
--
-- ⚠️  DEV-FIXTURE COPY — DO NOT EDIT HERE.
-- Canonical location: business-suite-unified/supabase/migrations/20261009000100_schema_builder_rename_physical_column_hardened.sql
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
-- would end that outer transaction early. This file is already applied and
-- recorded in production (version-keyed ledger), so this is file hygiene
-- only, not a re-run.

-- ---------------------------------------------------------------------------
-- 1. THE REGISTRY. This is the fix for the escalation described in the header.
--
-- `tenant_entities.name` is caller-controlled: `tenant_entities_insert` admits
-- any ACTIVE owner/admin/manager to insert a row with `is_system = false` and
-- ANY `name`, and no CHECK constraint restricts it (measured 2026-08-31 — the
-- only CHECK on that table is `chk_tenant_entities_app_scope`).
--
-- The 20260506 draft derived its ALTER TABLE target straight from that column,
-- so tenant scoping applied to the METADATA ROW while the effect landed on a
-- GLOBAL object. There is one `public.user_tenants` for the whole estate, not
-- one per tenant.
--
-- This table is the allowlist of physical tables the Schema Builder may touch.
-- It has NO client write policy — inserts come from a platform developer or
-- service_role only — and it ships EMPTY. Measured 2026-08-31: 0 of 45
-- tenant_entities rows resolve to a physical `public.<name>` table, so an empty
-- registry removes exactly zero working behaviour while closing the hole by
-- construction.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_builder_physical_tables (
  table_name text PRIMARY KEY
    CHECK (table_name ~ '^[a-z][a-z0-9_]{0,62}$'),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registered_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_builder_physical_tables IS
  'Allowlist of physical public.<table> objects the Schema Builder may run DDL '
  'against, and the tenant that owns each. rename_physical_column refuses any '
  'table absent from this table. Populated by platform developers only — there '
  'is deliberately no client write policy. Ships empty.';

CREATE INDEX IF NOT EXISTS idx_sbpt_tenant
  ON public.schema_builder_physical_tables (tenant_id);

-- pgTAP A1 / R1: every FK column leads an index, in the migration that creates it.
-- ON DELETE SET NULL makes Postgres scan this column whenever an auth.users row
-- is deleted; without the index that is a sequential scan of the whole table.
CREATE INDEX IF NOT EXISTS idx_sbpt_registered_by
  ON public.schema_builder_physical_tables (registered_by)
  WHERE registered_by IS NOT NULL;

ALTER TABLE public.schema_builder_physical_tables ENABLE ROW LEVEL SECURITY;

-- SELECT for members of the owning tenant; developers see everything.
-- No INSERT/UPDATE/DELETE policy exists = implicit deny for every client.
DROP POLICY IF EXISTS schema_builder_physical_tables_select ON public.schema_builder_physical_tables;
CREATE POLICY schema_builder_physical_tables_select
  ON public.schema_builder_physical_tables
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_developer()
    OR EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = public.schema_builder_physical_tables.tenant_id
        AND ut.status = 'active'
    )
  );

GRANT SELECT ON public.schema_builder_physical_tables TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit log — one row per attempted schema mutation (dry-run or wet-run).
-- ---------------------------------------------------------------------------
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
  'Schema Builder §3.6.6 — audit log of destructive schema mutations initiated '
  'from the Schema Builder UI. Written EXCLUSIVELY by SECURITY DEFINER RPCs. '
  'Clients have SELECT only, scoped to their tenant via an ACTIVE user_tenants '
  'membership; NULL-tenant rows are developer-only.';

CREATE INDEX IF NOT EXISTS idx_sma_tenant_created
  ON public.schema_mutations_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sma_entity
  ON public.schema_mutations_audit (entity_id)
  WHERE entity_id IS NOT NULL;

-- pgTAP A1 / R1: actor_id is an FK to auth.users with ON DELETE SET NULL, so a
-- user deletion scans this audit table. It is append-only and grows without
-- bound, which is exactly where an unindexed FK scan hurts most.
CREATE INDEX IF NOT EXISTS idx_sma_actor
  ON public.schema_mutations_audit (actor_id)
  WHERE actor_id IS NOT NULL;

ALTER TABLE public.schema_mutations_audit ENABLE ROW LEVEL SECURITY;

-- SELECT only. The 20260506 draft used `tenant_id IS NULL OR EXISTS(...)`,
-- which made every platform-scope mutation row — actor id, table name, DDL
-- text — readable by EVERY authenticated user in EVERY tenant. RC6: state a
-- verdict for all four commands. INSERT/UPDATE/DELETE have no policy, which is
-- an implicit deny; the SECURITY DEFINER RPC bypasses RLS for its own writes.
DROP POLICY IF EXISTS schema_mutations_audit_select ON public.schema_mutations_audit;
CREATE POLICY schema_mutations_audit_select
  ON public.schema_mutations_audit
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN public.schema_mutations_audit.tenant_id IS NULL
        THEN public.is_platform_developer()
      ELSE EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = public.schema_mutations_audit.tenant_id
          AND ut.status = 'active'
      )
    END
  );

GRANT SELECT ON public.schema_mutations_audit TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER RPC — dry-run / wet-run ALTER TABLE RENAME COLUMN.
--
-- THREAT MODEL (this function executes DDL; read this before changing it).
--
--   ASSET      Every table in `public`. The function runs as its owner, so a
--              successful call is unrestricted DDL authority.
--   ATTACKER   Any authenticated user holding an ACTIVE owner/admin membership
--              in ANY ONE tenant — including a self-served trial tenant.
--
--   T1 IDENTIFIER INJECTION via p_new_name.
--      Mitigated twice: `p_new_name ~ '^[a-z][a-z0-9_]{0,62}$'` is checked
--      BEFORE any use, and the DDL is built with format('%I'), never string
--      concatenation. The regex admits no quote, semicolon, backslash or space,
--      so there is no payload for %I to have to escape.
--
--   T2 ARBITRARY-TABLE DDL via a forged tenant_entities.name.  <-- THE BIG ONE
--      An attacker inserts an entity named `user_tenants` in their own tenant
--      (permitted: is_system=false, their tenant_id), inserts a field named
--      `role` (permitted by tenant_insert_field_defs), and calls this RPC. The
--      20260506 draft's role gate passes — they ARE admin of that entity's
--      tenant — and it then renamed a column on the estate's authorisation
--      table. Every RLS policy reading `user_tenants.role` breaks at once.
--      Mitigated by requiring the target to be registered in
--      public.schema_builder_physical_tables AND registered to the SAME tenant
--      as the entity. Tenant scoping now binds the OBJECT, not just the
--      metadata row that names it.
--
--   T3 PLATFORM-ENTITY PIVOT. A NULL-tenant entity has no owning tenant to
--      scope against, so it cannot satisfy T2's same-tenant requirement and is
--      refused outright rather than falling back to a weaker test.
--
--   T4 SYSTEM ENTITIES. `is_system = true` rows are estate-managed and are
--      refused; the draft never checked the flag.
--
--   T5 REVOKED ADMIN. Role checks require `status = 'active'`, matching every
--      policy on tenant_entities. The draft omitted it.
--
--   T6 search_path HIJACK. `SET search_path = ''` plus fully-qualified
--      references throughout. `quote_ident`/`format`/`to_regclass` resolve from
--      pg_catalog, which is always implicitly searched and cannot be shadowed.
--
--   T7 ANON EXECUTE. PostgreSQL grants EXECUTE to PUBLIC (which includes anon)
--      on creation; revoked below before the grant to authenticated.
--
--   T8 IMPACT-ANALYSIS FEEDBACK. affected_views / affected_policies are
--      advisory strings returned to the caller and are NEVER interpolated into
--      any SQL.
--
--   RESIDUAL, ACCEPTED. A platform developer who registers a core table into
--      schema_builder_physical_tables re-opens T2 for that table. That is a
--      deliberate, audited, developer-only action requiring service_role or
--      is_platform_developer(); it is not reachable by a tenant admin.
-- ---------------------------------------------------------------------------
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
-- @SD-JUSTIFICATION: executes ALTER TABLE ... RENAME COLUMN; INVOKER cannot run
--   DDL under RLS-scoped roles. The target is constrained to the
--   schema_builder_physical_tables allowlist (ships empty) rather than taken from
--   caller-controlled tenant_entities.name, and every attempt is written to
--   schema_mutations_audit.
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-08-31 (bsuite#2862 — added-security-definer gate)
declare
  v_caller uuid := auth.uid();
  v_entity_tenant uuid;
  v_entity_is_system boolean;
  v_table_name text;
  v_old_field_name text;
  v_has_role boolean;
  v_registered boolean;
  v_column_exists boolean;
  v_duplicate_column boolean;
  v_affected_views jsonb;
  v_affected_policies jsonb;
  v_would_execute text;
  v_audit_id uuid;
  v_result jsonb;
begin
  -- (1) Auth.
  if v_caller is null then
    raise exception 'insufficient_privilege: authenticated user required'
      using errcode = '42501';
  end if;

  -- (2) T1 — identifier validation BEFORE any format('%I', ...).
  if p_new_name is null or p_new_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid_parameter_value: p_new_name must match ^[a-z][a-z0-9_]{0,62}$ (got %)', p_new_name
      using errcode = '22023';
  end if;

  -- (3) Resolve entity.
  select tenant_id, name, coalesce(is_system, false)
    into v_entity_tenant, v_table_name, v_entity_is_system
  from public.tenant_entities
  where id = p_entity_id;

  if v_table_name is null then
    raise exception 'invalid_parameter_value: entity % not found', p_entity_id
      using errcode = '22023';
  end if;

  -- (4) T3/T4 — platform and system entities never drive DDL.
  if v_entity_tenant is null or v_entity_is_system then
    raise exception 'insufficient_privilege: entity % is platform-level or system-managed and cannot drive a physical rename', p_entity_id
      using errcode = '42501';
  end if;

  -- (5) T5 — ACTIVE admin/owner in the entity's tenant.
  select exists(
    select 1 from public.user_tenants
    where user_id = v_caller
      and tenant_id = v_entity_tenant
      and status = 'active'
      and role in ('admin', 'owner')
  ) into v_has_role;

  if not coalesce(v_has_role, false) then
    raise exception 'insufficient_privilege: active admin or owner role required for entity %', p_entity_id
      using errcode = '42501';
  end if;

  -- (6) Resolve field -> current name, and prove it belongs to this entity.
  select field_name
    into v_old_field_name
  from public.tenant_field_definitions
  where id = p_field_id
    and entity_id = p_entity_id;

  if v_old_field_name is null then
    raise exception 'invalid_parameter_value: field % not found on entity %', p_field_id, p_entity_id
      using errcode = '22023';
  end if;

  if v_old_field_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid_parameter_value: stored field_name % is not a safe identifier', v_old_field_name
      using errcode = '22023';
  end if;

  -- (7) T2 — THE GATE. The physical table must be registered to THIS tenant.
  --     Anything else — a core table, another tenant's table, a table that
  --     merely happens to exist — is reported as having no physical table, the
  --     same marker a metadata-only entity returns. The UI already falls back
  --     to the metadata-only rename on that marker, so an unregistered entity
  --     behaves exactly as it does today and nothing user-visible regresses.
  select exists(
    select 1 from public.schema_builder_physical_tables r
    where r.table_name = v_table_name
      and r.tenant_id  = v_entity_tenant
  ) into v_registered;

  if not coalesce(v_registered, false)
     or pg_catalog.to_regclass('public.' || quote_ident(v_table_name)) is null then
    return jsonb_build_object(
      'executed', false,
      'reason', 'no_physical_table',
      'detail', 'the entity has no Schema-Builder-managed table registered to its tenant',
      'old_field_name', v_old_field_name,
      'new_field_name', p_new_name
    );
  end if;

  -- (8) Column pre-flight.
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = v_table_name
      and column_name = v_old_field_name
  ) into v_column_exists;

  if not coalesce(v_column_exists, false) then
    raise exception 'invalid_parameter_value: column %.% does not exist', v_table_name, v_old_field_name
      using errcode = '22023';
  end if;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = v_table_name
      and column_name = p_new_name
  ) into v_duplicate_column;

  if coalesce(v_duplicate_column, false) then
    raise exception 'invalid_parameter_value: duplicate_column — %.% already exists', v_table_name, p_new_name
      using errcode = '22023';
  end if;

  -- (9) T8 — impact analysis. Advisory only; never fed back into SQL.
  select coalesce(jsonb_agg(distinct v.table_schema || '.' || v.table_name), '[]'::jsonb)
    into v_affected_views
  from information_schema.view_column_usage v
  where v.table_schema = 'public' and v.table_name = v_table_name
    and v.column_name = v_old_field_name;

  select coalesce(jsonb_agg(distinct pp.policyname), '[]'::jsonb)
    into v_affected_policies
  from pg_catalog.pg_policies pp
  where pp.schemaname = 'public' and pp.tablename = v_table_name
    and (
      coalesce(pp.qual, '') like '%' || v_old_field_name || '%'
      or coalesce(pp.with_check, '') like '%' || v_old_field_name || '%'
    );

  -- (10) T1 — safe identifier quoting.
  v_would_execute := format(
    'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
    v_table_name, v_old_field_name, p_new_name
  );

  -- (11) Audit BEFORE execution so failed wet-runs are still recorded.
  insert into public.schema_mutations_audit (
    tenant_id, actor_id, mutation_type, entity_id, field_id,
    old_identifier, new_identifier, dry_run, executed,
    would_execute, affected_views, affected_policies
  )
  values (
    v_entity_tenant, v_caller, 'rename_column', p_entity_id, p_field_id,
    v_old_field_name, p_new_name, p_dry_run, false,
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

  -- (12) Wet-run.
  begin
    execute format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      v_table_name, v_old_field_name, p_new_name
    );

    update public.tenant_field_definitions
       set field_name = p_new_name, updated_at = now()
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
       set error_code = sqlstate, error_message = sqlerrm
     where id = v_audit_id;
    raise;
  end;
end;
$$;

-- T7 — revoke the implicit PUBLIC/anon grant before granting to authenticated.
REVOKE EXECUTE ON FUNCTION public.rename_physical_column(uuid, uuid, text, boolean) FROM public;
REVOKE EXECUTE ON FUNCTION public.rename_physical_column(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.rename_physical_column(uuid, uuid, text, boolean) TO authenticated;

comment on function public.rename_physical_column(uuid, uuid, text, boolean) is
  'Schema Builder §3.6.6 — two-phase (dry-run/wet-run) ALTER TABLE RENAME COLUMN. '
  'THREAT MODEL: executes DDL as its owner, so the target table is constrained by '
  'public.schema_builder_physical_tables (registered to the entity''s own tenant) — '
  'NOT by tenant_entities.name, which is caller-controlled and named a GLOBAL '
  'object. Refuses platform-level and is_system entities; requires an ACTIVE '
  'admin/owner membership; identifiers validated by regex and emitted via '
  'format(%I); search_path pinned to ''''; anon/PUBLIC execute revoked. Returns '
  '{ executed:false, reason:''no_physical_table'' } for any unregistered entity, '
  'which the UI already handles by falling back to the metadata-only rename.';
