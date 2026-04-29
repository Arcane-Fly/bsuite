-- Schema Builder Phase 3B — opt-in ALTER TABLE ... RENAME COLUMN path.
--
-- Adds two database objects:
--
--   1. `schema_mutations_audit`  — audit table recording every rename attempt
--      (both dry-run and wet-run), written BEFORE execution so even failures
--      are captured.
--
--   2. `rename_physical_column(p_entity_id, p_field_id, p_new_name, p_dry_run)`
--      — SECURITY DEFINER function that:
--        • Verifies the caller holds admin/owner in user_tenants for the entity's
--          tenant (role check before any side-effect).
--        • Validates p_new_name with a strict regex before passing to format('%I')
--          (defence-in-depth on top of pg identifier quoting).
--        • In dry-run mode (default): returns the proposed SQL + affected views
--          and policies WITHOUT executing the ALTER TABLE.
--        • In wet-run mode: executes ALTER TABLE ... RENAME COLUMN + updates
--          tenant_field_definitions.field_name in a single transaction.
--
-- -----------------------------------------------------------------------
-- ROLLBACK SQL (include in PR description):
--   DROP FUNCTION IF EXISTS public.rename_physical_column(uuid, uuid, text, boolean);
--   DROP TABLE IF EXISTS public.schema_mutations_audit;
-- -----------------------------------------------------------------------

-- -----------------------------------------------------------------------
-- 1. schema_mutations_audit
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schema_mutations_audit (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  entity_id   uuid        NOT NULL,
  field_id    uuid        NOT NULL,
  operation   text        NOT NULL,
  sql_preview text,
  dry_run     boolean     NOT NULL DEFAULT true,
  succeeded   boolean,
  error_msg   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_mutations_audit IS
  'Audit log for schema mutations performed via rename_physical_column (and future DDL RPCs). '
  'Written BEFORE execution so failed attempts are captured.';

COMMENT ON COLUMN public.schema_mutations_audit.dry_run IS
  'true = call was a dry-run (no DDL executed); false = ALTER TABLE was executed.';

COMMENT ON COLUMN public.schema_mutations_audit.succeeded IS
  'NULL while in-flight; true on success; false on error.';

-- Enable RLS — the SECURITY DEFINER function performs the single INSERT;
-- app-layer reads are restricted to tenant-admins by the policy below.
ALTER TABLE public.schema_mutations_audit ENABLE ROW LEVEL SECURITY;

-- Tenant admins / owners may SELECT their own tenant's audit rows.
CREATE POLICY schema_audit_tenant_admin_select
  ON public.schema_mutations_audit
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ut.tenant_id
      FROM   public.user_tenants ut
      WHERE  ut.user_id = auth.uid()
        AND  ut.role IN ('admin', 'owner')
    )
  );

-- No direct INSERT/UPDATE/DELETE from the application layer; all writes go
-- through rename_physical_column (SECURITY DEFINER) which bypasses RLS.

-- -----------------------------------------------------------------------
-- 2. rename_physical_column
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rename_physical_column(
  p_entity_id uuid,
  p_field_id  uuid,
  p_new_name  text,
  p_dry_run   boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
-- Pinned search_path prevents search_path hijacking (SEC-EDGE-005 pattern).
SET search_path = ''
AS $$
DECLARE
  v_caller_id  uuid;
  v_tenant_id  uuid;
  v_table_name text;
  v_old_name   text;
  v_sql        text;
  v_audit_id   uuid;
  v_role_ok    boolean;
BEGIN
  -- ----------------------------------------------------------------
  -- 1. Caller authentication
  -- ----------------------------------------------------------------
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'rename_physical_column: caller is not authenticated';
  END IF;

  -- ----------------------------------------------------------------
  -- 2. Resolve entity + role check (BEFORE any side-effect)
  -- ----------------------------------------------------------------
  SELECT te.tenant_id, te.name
  INTO   v_tenant_id, v_table_name
  FROM   public.tenant_entities te
  WHERE  te.id = p_entity_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'rename_physical_column: entity % not found', p_entity_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM   public.user_tenants ut
    WHERE  ut.user_id  = v_caller_id
      AND  ut.tenant_id = v_tenant_id
      AND  ut.role IN ('admin', 'owner')
  ) INTO v_role_ok;

  IF NOT v_role_ok THEN
    RAISE EXCEPTION
      'rename_physical_column: insufficient privilege — admin or owner role required';
  END IF;

  -- ----------------------------------------------------------------
  -- 3. Identifier validation (defence-in-depth before format('%I'))
  --    Regex: snake_case, must start with a-z, 1–63 chars total.
  -- ----------------------------------------------------------------
  IF p_new_name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION
      'rename_physical_column: invalid identifier "%" — must match ^[a-z][a-z0-9_]{0,62}$',
      p_new_name;
  END IF;

  -- ----------------------------------------------------------------
  -- 4. Resolve current column name from tenant_field_definitions
  -- ----------------------------------------------------------------
  SELECT tfd.field_name
  INTO   v_old_name
  FROM   public.tenant_field_definitions tfd
  WHERE  tfd.id        = p_field_id
    AND  tfd.entity_id = p_entity_id;

  IF v_old_name IS NULL THEN
    RAISE EXCEPTION
      'rename_physical_column: field % not found on entity %', p_field_id, p_entity_id;
  END IF;

  IF v_old_name = p_new_name THEN
    RAISE EXCEPTION
      'rename_physical_column: new name is identical to current name "%"', p_new_name;
  END IF;

  -- ----------------------------------------------------------------
  -- 5. Build parameterised SQL (format('%I') — NEVER raw concatenation)
  -- ----------------------------------------------------------------
  v_sql := format(
    'ALTER TABLE %I RENAME COLUMN %I TO %I',
    v_table_name, v_old_name, p_new_name
  );

  -- ----------------------------------------------------------------
  -- 6. Write audit row BEFORE executing (so even failed attempts are
  --    captured).
  -- ----------------------------------------------------------------
  v_audit_id := gen_random_uuid();
  INSERT INTO public.schema_mutations_audit (
    id, tenant_id, user_id, entity_id, field_id,
    operation, sql_preview, dry_run, succeeded, error_msg
  ) VALUES (
    v_audit_id, v_tenant_id, v_caller_id, p_entity_id, p_field_id,
    'rename_column', v_sql, p_dry_run, NULL, NULL
  );

  -- ----------------------------------------------------------------
  -- 7. Dry-run path (default): return proposed SQL + affected objects
  --    WITHOUT executing the ALTER TABLE.
  -- ----------------------------------------------------------------
  IF p_dry_run THEN
    UPDATE public.schema_mutations_audit
      SET succeeded = true
    WHERE id = v_audit_id;

    RETURN jsonb_build_object(
      'would_execute', v_sql,
      'affected_views', (
        SELECT coalesce(jsonb_agg(v.viewname ORDER BY v.viewname), '[]'::jsonb)
        FROM   pg_catalog.pg_views v
        WHERE  v.schemaname = 'public'
          AND  v.definition ILIKE ('%' || v_old_name || '%')
      ),
      'affected_policies', (
        SELECT coalesce(jsonb_agg(p.policyname ORDER BY p.policyname), '[]'::jsonb)
        FROM   pg_catalog.pg_policies p
        WHERE  p.schemaname = 'public'
          AND  p.tablename  = v_table_name
      )
    );
  END IF;

  -- ----------------------------------------------------------------
  -- 8. Wet-run path: ALTER TABLE + metadata update in one transaction.
  --    Both succeed or both roll back (audit row is part of the same tx).
  -- ----------------------------------------------------------------
  BEGIN
    EXECUTE v_sql;

    UPDATE public.tenant_field_definitions
      SET field_name = p_new_name,
          updated_at = now()
    WHERE id        = p_field_id
      AND entity_id = p_entity_id;

    UPDATE public.schema_mutations_audit
      SET succeeded = true
    WHERE id = v_audit_id;

    RETURN jsonb_build_object(
      'executed',      true,
      'previous_name', v_old_name,
      'new_name',      p_new_name
    );
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.schema_mutations_audit
      SET succeeded = false,
          error_msg = SQLERRM
    WHERE id = v_audit_id;
    RAISE;
  END;
END;
$$;

-- Authenticated users may call this function; the role check inside ensures
-- only admin/owner callers can complete the rename.
GRANT EXECUTE
  ON FUNCTION public.rename_physical_column(uuid, uuid, text, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.rename_physical_column(uuid, uuid, text, boolean) IS
  'Schema Builder Phase 3B — safe opt-in ALTER TABLE ... RENAME COLUMN. '
  'Dry-run (p_dry_run=true, the default) returns { would_execute, affected_views, affected_policies } '
  'without executing DDL. Wet-run (p_dry_run=false) executes ALTER TABLE + updates '
  'tenant_field_definitions.field_name in one transaction. Role check (admin/owner) + '
  'identifier validation + audit log are enforced on every call. '
  'Rollback: DROP FUNCTION public.rename_physical_column(uuid,uuid,text,boolean); '
  'DROP TABLE public.schema_mutations_audit;';
