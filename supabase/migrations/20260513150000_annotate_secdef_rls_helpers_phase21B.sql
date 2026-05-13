-- Phase 2.1B — Annotate 25 RLS-helper SECURITY DEFINER functions
-- Source issue: bsuite#953 (epic) + bsuite#955 (sub-issue, this migration)
-- Audit date: 2026-05-13
--
-- All 25 function bodies are pulled VERBATIM from prod
-- (project ref: tuybltdrdefjblnplpqo) via:
--   SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE p.prosecdef = true AND n.nspname = 'public'
--     AND p.proname IN (...);
--
-- Annotation overlay format (3-line comment block at top of $function$ body):
--   -- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses;
--   --                    INVOKER would defeat the policy purpose
--   -- @SD-CATEGORY: 2.1B
--   -- @SD-AUDIT: 2026-05-13
--
-- ZERO behavioural change. search_path values preserved EXACTLY as in prod.
-- Note the diversity of search_path values in this category:
--   - 'public' (most)
--   - 'public', 'pg_temp' (apprentice + gto helpers)
--   - 'public', 'auth' (r7_candidate_id_for_auth_user)
--   - '' (empty, search_path-less SQL helpers — is_team_admin, resolve_bs_oauth_subject_portal_role)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. auth_tenant_id
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid() AND status = 'active';
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. auth_tenant_id_with_role
CREATE OR REPLACE FUNCTION public.auth_tenant_id_with_role(allowed_roles text[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = ANY(allowed_roles);
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. check_module_access
CREATE OR REPLACE FUNCTION public.check_module_access(p_user_id uuid, p_tenant_id uuid, p_module text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
DECLARE
has_access BOOLEAN;
BEGIN
SELECT
COALESCE((sp.module_access->p_module)::BOOLEAN, false)
INTO has_access
FROM user_tenants ut
LEFT JOIN subscription_plans sp ON sp.id = ut.subscription_plan_id
WHERE ut.user_id = p_user_id
AND ut.tenant_id = p_tenant_id
AND ut.status = 'active';

RETURN COALESCE(has_access, false);
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. check_user_portal_role
CREATE OR REPLACE FUNCTION public.check_user_portal_role(p_user_id uuid, p_tenant_id uuid, p_required_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND status = 'active'
      AND (
        portal_role = ANY(p_required_roles)
        OR role IN ('owner', 'admin')  -- owner/admin always pass
      )
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. check_user_tenant_access
CREATE OR REPLACE FUNCTION public.check_user_tenant_access(p_user_id uuid, p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND status = 'active'
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_user_apprentice_id (search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.get_user_apprentice_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT apprentice_id FROM public.org_members
  WHERE user_id = (SELECT auth.uid()) AND gto_role = 'apprentice' LIMIT 1;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. get_user_gto_role (search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.get_user_gto_role()
 RETURNS gto_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT gto_role FROM public.org_members
  WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. get_user_host_employer_id (search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.get_user_host_employer_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT host_employer_id FROM public.org_members
  WHERE user_id = (SELECT auth.uid()) AND gto_role = 'host_supervisor' LIMIT 1;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. get_user_id_by_email (NOT STABLE — function call into auth schema)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. get_user_tenant_context (TABLE-returning, plpgsql)
CREATE OR REPLACE FUNCTION public.get_user_tenant_context(p_user_id uuid)
 RETURNS TABLE(tenant_id uuid, tenant_name text, role text, subscription_plan_id uuid, module_access jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
BEGIN
RETURN QUERY
SELECT
ut.tenant_id,
t.name AS tenant_name,
ut.role,
ut.subscription_plan_id,
sp.module_access
FROM user_tenants ut
JOIN tenants t ON t.id = ut.tenant_id
LEFT JOIN subscription_plans sp ON sp.id = ut.subscription_plan_id
WHERE ut.user_id = p_user_id AND ut.status = 'active';
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. get_visible_tenant_ids (complex recursive plpgsql)
CREATE OR REPLACE FUNCTION public.get_visible_tenant_ids(p_user_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_tenant_ids uuid[];
  v_is_platform_admin boolean := false;
  v_admin_tenant_ids uuid[];
BEGIN
  SELECT array_agg(tenant_id) INTO v_tenant_ids
  FROM user_tenants
  WHERE user_id = p_user_id AND status = 'active';

  IF v_tenant_ids IS NULL THEN
    RETURN '{}';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_tenants ut
    JOIN tenants t ON t.id = ut.tenant_id
    WHERE ut.user_id = p_user_id
      AND t.tier = 'platform'
      AND ut.role IN ('admin', 'owner')
      AND ut.status = 'active'
  ) INTO v_is_platform_admin;

  IF v_is_platform_admin THEN
    SELECT array_agg(id) INTO v_tenant_ids FROM tenants;
    RETURN COALESCE(v_tenant_ids, '{}');
  END IF;

  SELECT array_agg(ut.tenant_id) INTO v_admin_tenant_ids
  FROM user_tenants ut
  WHERE ut.user_id = p_user_id
    AND ut.role IN ('admin', 'owner')
    AND ut.status = 'active';

  IF v_admin_tenant_ids IS NOT NULL THEN
    WITH RECURSIVE tree AS (
      SELECT id FROM tenants WHERE id = ANY(v_admin_tenant_ids)
      UNION ALL
      SELECT t.id FROM tenants t JOIN tree ON t.parent_tenant_id = tree.id
    )
    SELECT array_agg(DISTINCT combined_id) INTO v_tenant_ids
    FROM (
      SELECT unnest(v_tenant_ids) AS combined_id
      UNION
      SELECT id AS combined_id FROM tree
    ) sub;
  END IF;

  RETURN COALESCE(v_tenant_ids, '{}');
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. has_parent_admin_access (recursive CTE)
CREATE OR REPLACE FUNCTION public.has_parent_admin_access(target_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_tenant_id
      FROM public.tenants
     WHERE id = target_tenant_id
    UNION ALL
    SELECT t.id, t.parent_tenant_id
      FROM public.tenants t
      JOIN ancestors a ON t.id = a.parent_tenant_id
  )
  SELECT EXISTS (
    SELECT 1
      FROM public.user_tenants ut
      JOIN ancestors a ON a.id = ut.tenant_id
     WHERE ut.user_id = auth.uid()
       AND ut.status = 'active'
       AND ut.role IN ('owner', 'admin')
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. is_demo_write_blocked
CREATE OR REPLACE FUNCTION public.is_demo_write_blocked()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT COALESCE(
    (
      SELECT (t.settings->>'demo_tenant')::boolean = true
        AND (t.settings->>'persist_demo_data')::boolean = false
      FROM user_tenants ut
      JOIN tenants t ON t.id = ut.tenant_id
      WHERE ut.user_id = auth.uid()
      LIMIT 1
    ),
    false
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. is_dev_mode
CREATE OR REPLACE FUNCTION public.is_dev_mode()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT COALESCE(
    (SELECT is_dev_mode FROM public.profiles WHERE id = auth.uid()),
    false
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. is_gto_admin (search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.is_gto_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = (SELECT auth.uid()) AND gto_role = 'gto_admin'
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. is_gto_staff (no-arg overload, search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.is_gto_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = (SELECT auth.uid())
      AND gto_role IN ('gto_admin', 'gto_staff', 'field_officer')
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. is_gto_staff (uuid-arg overload, search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.is_gto_staff(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = (SELECT auth.uid())
      AND tenant_id = p_tenant_id
      AND gto_role IN ('gto_admin','gto_staff','field_officer')
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. is_platform_admin (DEFAULT auth.uid(), search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT COALESCE(
    (
      SELECT p.is_super_admin = true
             OR p.platform_role IN ('platform_admin', 'developer', 'super_admin')
        FROM public.profiles p
       WHERE p.user_id = uid
       LIMIT 1
    ),
    false
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. is_team_admin (search_path = '', fully-qualified refs)
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1
      FROM public.team_members tm
     WHERE tm.team_id = p_team_id
       AND tm.user_id = p_user_id
       AND tm.role IN ('owner', 'admin')
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. platform_is_developer_or_admin
CREATE OR REPLACE FUNCTION public.platform_is_developer_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.platform_role IN ('developer', 'platform_admin')
        OR p.is_super_admin = true
      )
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. r7_candidate_id_for_auth_user (search_path = public, auth)
CREATE OR REPLACE FUNCTION public.r7_candidate_id_for_auth_user()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT c.id
  FROM public.r7_candidates c
  INNER JOIN auth.users u
    ON lower(u.email) = lower(c.email)
  WHERE u.id = auth.uid()
    AND c.email IS NOT NULL
  LIMIT 1
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. resolve_bs_oauth_subject_portal_role (search_path = '', fully-qualified)
CREATE OR REPLACE FUNCTION public.resolve_bs_oauth_subject_portal_role(p_subject text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  WITH candidate_users AS (
    SELECT
      u.id AS user_id,
      1 AS priority
    FROM auth.users AS u
    WHERE u.id::text = p_subject

    UNION ALL

    SELECT
      i.user_id,
      2 AS priority
    FROM auth.identities AS i
    WHERE i.id::text = p_subject
       OR i.provider_id = p_subject
       OR i.identity_data ->> 'sub' = p_subject
       OR i.identity_data ->> 'user_id' = p_subject
  ),
  resolved_user AS (
    SELECT user_id
    FROM candidate_users
    ORDER BY priority
    LIMIT 1
  )
  SELECT ut.role
  FROM public.user_tenants AS ut
  INNER JOIN resolved_user AS ru ON ru.user_id = ut.user_id
  WHERE ut.status = 'active'
  ORDER BY
    CASE ut.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'staff' THEN 4
      WHEN 'guest' THEN 5
      ELSE 6
    END,
    ut.joined_at DESC NULLS LAST
  LIMIT 1;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. show_demo_data
CREATE OR REPLACE FUNCTION public.show_demo_data()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT COALESCE(
    (SELECT show_demo_data FROM public.profiles WHERE id = auth.uid()),
    true
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. tenant_branding_is_force_overridden
CREATE OR REPLACE FUNCTION public.tenant_branding_is_force_overridden(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT COALESCE(
    (SELECT p_tenant_id = ANY(force_override_tenant_ids)
     FROM public.platform_branding
     WHERE id = 'platform'),
    false
  );
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. user_has_org_access
CREATE OR REPLACE FUNCTION public.user_has_org_access(p_user_id uuid, p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: rls-helper, called from policy USING/WITH-CHECK clauses; INVOKER would defeat the policy purpose
-- @SD-CATEGORY: 2.1B
-- @SD-AUDIT: 2026-05-13
  SELECT EXISTS (
    SELECT 1
    FROM tenants t
    JOIN organization_members om ON om.org_id = t.organization_id
    WHERE t.id = p_tenant_id
      AND om.user_id = p_user_id
      AND om.role IN ('owner', 'admin')
  );
$function$;
