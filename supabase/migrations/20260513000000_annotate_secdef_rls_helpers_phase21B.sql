-- =============================================================================
-- Migration: annotate_secdef_rls_helpers_phase21B
-- Category:  2.1B — Documenting annotation only, NO behaviour change
-- Parent:    bsuite#953 (Phase 2 SECURITY DEFINER audit)
-- Date:      2026-05-13
-- =============================================================================
-- Annotates 25 legitimate SECURITY DEFINER RLS-helper functions with
-- @SD-JUSTIFICATION comments.  These functions are intentionally SECURITY
-- DEFINER because they are called from RLS USING/WITH-CHECK clauses; running
-- them as INVOKER would defeat the policy purpose.
--
-- This migration is a pure annotation overlay:
--   • It reads each function's current definition via pg_get_functiondef at
--     migration time, so the body is preserved byte-for-byte.
--   • It injects the three-line comment block immediately after the opening
--     dollar-quote delimiter.
--   • It is idempotent — functions that already carry the @SD-JUSTIFICATION
--     marker are skipped.
--
-- Functions covered (25 total — is_gto_staff is overloaded → 26 pg_proc rows):
--   auth_tenant_id, auth_tenant_id_with_role, check_module_access,
--   check_user_portal_role, check_user_tenant_access, get_user_apprentice_id,
--   get_user_gto_role, get_user_host_employer_id, get_user_id_by_email,
--   get_user_tenant_context, get_visible_tenant_ids, has_parent_admin_access,
--   is_dev_mode, is_demo_write_blocked, is_gto_admin,
--   is_gto_staff (no-arg), is_gto_staff (uuid arg),
--   is_platform_admin, is_team_admin, platform_is_developer_or_admin,
--   r7_candidate_id_for_auth_user, resolve_bs_oauth_subject_portal_role,
--   show_demo_data, tenant_branding_is_force_overridden, user_has_org_access
--
-- Out of scope (Phase 2.2 — bsuite#951):
--   • Wrapping auth.uid() as (SELECT auth.uid()) inside helper bodies
--   • Changes to RLS policies that call these helpers
--   • search_path changes (already pinned)
-- =============================================================================

DO $$
DECLARE
  -- The three-line annotation block injected at the top of every body.
  -- @SD-AUDIT date is intentionally the migration date (2026-05-13), not
  -- the current date — it records WHEN this function was first annotated
  -- as part of Phase 2.1B of the bsuite#953 SECURITY DEFINER audit.
  v_comment_block text :=
    '-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose' || E'\n' ||
    '-- @SD-CATEGORY: 2.1B' || E'\n' ||
    '-- @SD-AUDIT: 2026-05-13' || E'\n';

  -- Matched groups from pg_get_functiondef:
  --   [1] = everything up to & including the opening dollar-quote + trailing newline
  --   [2] = body + closing dollar-quote + trailing semicolon (if any)
  v_parts  text[];
  v_def    text;
  v_new_def text;
  v_fn     record;
  v_count  int := 0;
BEGIN
  -- -------------------------------------------------------------------------
  -- Iterate over every matching SECURITY DEFINER function in public schema.
  -- The IN list covers all 25 distinct names; the overloaded is_gto_staff pair
  -- is handled automatically because both oids match the same proname.
  -- -------------------------------------------------------------------------
  FOR v_fn IN
    SELECT p.oid, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS arg_sig
    FROM   pg_catalog.pg_proc p
    JOIN   pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE  p.prosecdef = true
      AND  n.nspname   = 'public'
      AND  p.proname   IN (
             'auth_tenant_id',
             'auth_tenant_id_with_role',
             'check_module_access',
             'check_user_portal_role',
             'check_user_tenant_access',
             'get_user_apprentice_id',
             'get_user_gto_role',
             'get_user_host_employer_id',
             'get_user_id_by_email',
             'get_user_tenant_context',
             'get_visible_tenant_ids',
             'has_parent_admin_access',
             'is_dev_mode',
             'is_demo_write_blocked',
             'is_gto_admin',
             'is_gto_staff',
             'is_platform_admin',
             'is_team_admin',
             'platform_is_developer_or_admin',
             'r7_candidate_id_for_auth_user',
             'resolve_bs_oauth_subject_portal_role',
             'show_demo_data',
             'tenant_branding_is_force_overridden',
             'user_has_org_access'
           )
    ORDER BY p.proname, p.oid
  LOOP
    -- Fetch the canonical definition for this specific overload.
    SELECT pg_catalog.pg_get_functiondef(v_fn.oid) INTO v_def;

    -- -----------------------------------------------------------------------
    -- Idempotency guard: skip if @SD-JUSTIFICATION is already present.
    -- -----------------------------------------------------------------------
    IF v_def ~ '-- @SD-JUSTIFICATION:' THEN
      RAISE NOTICE '[2.1B] % (%) — already annotated, skipping',
                   v_fn.proname, v_fn.arg_sig;
      CONTINUE;
    END IF;

    -- -----------------------------------------------------------------------
    -- Parse the definition into two halves around the opening dollar-quote.
    --
    -- pg_get_functiondef always emits the body as:
    --   ... AS $<tag>$\n<body>\n$<tag>$
    -- where <tag> may be empty (→ $$) or a word (→ $function$, $body$, etc.)
    --
    -- Pattern (single-line mode 's', so '.' matches newlines):
    --   ^(.*?\bAS \$[a-zA-Z0-9_]*\$[ \t]*\n)(.*)$
    --   Non-greedy .*? ensures we match the FIRST (and only) AS $tag$\n in
    --   the header.  Tag chars restricted to [a-zA-Z0-9_] per PostgreSQL
    --   dollar-quote identifier rules.
    --   Group 1 = header including AS $tag$\n
    --   Group 2 = body text + closing $tag$
    --
    -- pg_get_functiondef in PostgreSQL 12+ always ends the AS $tag$ line with
    -- a newline before the body, so the \n here is reliable.  The fallback
    -- RAISE WARNING below handles the (theoretical) case where it is absent.
    -- -----------------------------------------------------------------------
    v_parts := regexp_match(v_def, '^(.*?\bAS \$[a-zA-Z0-9_]*\$[ \t]*\n)(.*)$', 's');

    IF v_parts IS NULL THEN
      RAISE WARNING '[2.1B] % (%) — could not locate AS $...$\\n boundary; skipping',
                    v_fn.proname, v_fn.arg_sig;
      CONTINUE;
    END IF;

    -- Assemble the annotated definition.
    v_new_def := v_parts[1] || v_comment_block || v_parts[2];

    -- Re-create the function with the annotation added.
    -- Wrap in a nested exception block so a failure names the offending function.
    BEGIN
      EXECUTE v_new_def;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '[2.1B] Failed to annotate function % (%): %',
                      v_fn.proname, v_fn.arg_sig, SQLERRM;
    END;

    v_count := v_count + 1;
    RAISE NOTICE '[2.1B] % (%) — annotated (%/26)',
                 v_fn.proname, v_fn.arg_sig, v_count;
  END LOOP;

  RAISE NOTICE '[2.1B] Done. % function(s) annotated this run.', v_count;
END;
$$;
