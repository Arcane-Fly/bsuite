-- Schema Builder §3.6 item 4 — live Postgres schema reflection.
--
-- Consumers call `reflect_entity_schema(table_name)` to introspect the actual
-- column list + PK/FK metadata of a table rather than relying solely on
-- `tenant_field_definitions`. This powers the "Airtable / dbdiagram look"
-- of the Schema Builder canvas — users see the same columns that Postgres
-- actually has.
--
-- The function is optional infrastructure: the package's `useSchemaReflection`
-- hook detects a 42883 (undefined_function) error and falls back gracefully
-- to the tenant_field_definitions path.
--
-- -----------------------------------------------------------------------
-- SECURITY POSTURE (read before deploying)
-- -----------------------------------------------------------------------
-- `SECURITY DEFINER` + `GRANT EXECUTE ... TO authenticated` means any
-- logged-in user can introspect the column list and FK graph of ANY table
-- in the target schema (default: `public`). The SECURITY DEFINER bypasses
-- the role-based filtering that `information_schema` normally applies at
-- the caller's privilege level.
--
-- This is an INTENTIONAL trust decision: schema-builder users in BSuite
-- are admin-tier (gated at the application layer by route guards on
-- /settings/schema-builder). Column metadata is not itself sensitive data.
--
-- If your deployment needs per-tenant or per-role isolation of schema
-- introspection, either:
--   1. Drop SECURITY DEFINER and rely on information_schema's native
--      role-based filtering (the caller's role will only see columns they
--      have SELECT privilege on); OR
--   2. Keep SECURITY DEFINER but restrict `p_schema` to a whitelist inside
--      the function body (e.g. reject anything but 'public'); OR
--   3. Require the target table to exist in `tenant_entities` for the
--      caller's tenant before returning rows.
-- -----------------------------------------------------------------------

create or replace function public.reflect_entity_schema(
  p_table_name text,
  p_schema     text default 'public'
)
returns table (
  column_name      text,
  data_type        text,
  is_nullable      boolean,
  is_primary       boolean,
  is_foreign_key   boolean,
  fk_table         text,
  fk_column        text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    c.column_name::text                                      as column_name,
    c.data_type::text                                        as data_type,
    (c.is_nullable = 'YES')::boolean                         as is_nullable,
    coalesce(pk.is_primary, false)                           as is_primary,
    coalesce(fk.is_foreign_key, false)                       as is_foreign_key,
    fk.fk_table,
    fk.fk_column
  from information_schema.columns c
  left join (
    select kcu.column_name, true as is_primary
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema    = kcu.table_schema
    where tc.constraint_type = 'PRIMARY KEY'
      and tc.table_schema    = p_schema
      and tc.table_name      = p_table_name
  ) pk on pk.column_name = c.column_name
  left join (
    select
      kcu.column_name,
      true                                as is_foreign_key,
      ccu.table_name::text                as fk_table,
      ccu.column_name::text               as fk_column
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema    = kcu.table_schema
    join information_schema.referential_constraints rc
      on rc.constraint_name   = tc.constraint_name
     and rc.constraint_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name   = rc.unique_constraint_name
     and ccu.constraint_schema = rc.unique_constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema    = p_schema
      and tc.table_name      = p_table_name
  ) fk on fk.column_name = c.column_name
  where c.table_schema = p_schema
    and c.table_name   = p_table_name
  order by c.ordinal_position;
$$;

grant execute on function public.reflect_entity_schema(text, text) to authenticated;

comment on function public.reflect_entity_schema(text, text) is
  'Schema Builder §3.6.4 — returns column metadata (name, type, nullable, PK, FK) for the given table from information_schema. Used by @bsuite/schema-builder useSchemaReflection() hook.';
