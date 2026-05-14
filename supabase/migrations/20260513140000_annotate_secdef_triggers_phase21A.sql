-- Phase 2.1A — Annotate 14 trigger SECURITY DEFINER functions
-- Source issue: bsuite#953 (epic) + bsuite#954 (sub-issue, this migration)
-- Audit date: 2026-05-13
--
-- All 14 function bodies are pulled VERBATIM from prod
-- (project ref: tuybltdrdefjblnplpqo) via:
--   SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE p.prosecdef = true AND n.nspname = 'public'
--     AND p.proname IN (...)
--
-- Annotation overlay format (3-line comment block at top of $function$ body):
--   -- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
--   -- @SD-CATEGORY: 2.1A
--   -- @SD-AUDIT: 2026-05-13
--
-- ZERO behavioural change. Body byte-equivalent except for the comment block.
-- search_path values preserved EXACTLY as in prod (some are 'public', some 'public, pg_temp', one 'pg_catalog').

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. create_user_profile
CREATE OR REPLACE FUNCTION public.create_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. guard_profiles_privileged_columns
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_jwt_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_jwt_role text := v_jwt_claims ->> 'role';
  v_jwt_sub text := v_jwt_claims ->> 'sub';
  v_old_is_super boolean := coalesce(old.is_super_admin, false);
  v_platform_role_changed boolean := (new.platform_role IS DISTINCT FROM old.platform_role);
  v_super_admin_changed boolean := (new.is_super_admin IS DISTINCT FROM old.is_super_admin);
  v_bypass_reason text := NULL;
BEGIN
  IF v_jwt_role = 'service_role' THEN
    v_bypass_reason := 'jwt_service_role';
  ELSIF current_user = 'postgres' THEN
    v_bypass_reason := 'postgres_session';
  ELSIF v_old_is_super THEN
    v_bypass_reason := 'existing_super_admin';
  END IF;

  IF v_bypass_reason IS NULL THEN
    IF v_platform_role_changed THEN
      RAISE EXCEPTION 'permission denied: cannot modify platform_role (RLS-PROFILES-001)'
        USING errcode = '42501';
    END IF;
    IF v_super_admin_changed THEN
      RAISE EXCEPTION 'permission denied: cannot modify is_super_admin (RLS-PROFILES-002)'
        USING errcode = '42501';
    END IF;
  END IF;

  IF v_platform_role_changed OR v_super_admin_changed THEN
    INSERT INTO public.profiles_privileged_audit (
      profile_id, session_user_name, current_user_name,
      jwt_role, jwt_sub,
      old_platform_role, new_platform_role,
      old_is_super_admin, new_is_super_admin,
      bypass_reason
    )
    VALUES (
      new.id, session_user, current_user,
      v_jwt_role, v_jwt_sub,
      old.platform_role, new.platform_role,
      old.is_super_admin, new.is_super_admin,
      coalesce(v_bypass_reason, 'denied_would_have_raised')
    );
  END IF;

  RETURN new;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
        BEGIN
            INSERT INTO public.profiles (id, email)
            VALUES (NEW.id, NEW.email)
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. handle_new_user_tenant
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_domain text;
  v_tenant_id uuid;
BEGIN
  v_domain := split_part(NEW.email, '@', 2);

  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE v_domain = ANY(allowed_domains)
    AND status = 'active'
  ORDER BY
    CASE tier
      WHEN 'enterprise' THEN 1
      WHEN 'division' THEN 2
      WHEN 'team' THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO user_tenants (user_id, tenant_id, role, status)
    VALUES (NEW.id, v_tenant_id, 'viewer', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO user_tenants (user_id, tenant_id, role, status, invited_by)
  SELECT NEW.id, ti.tenant_id, ti.role, 'active', ti.invited_by
  FROM tenant_invitations ti
  WHERE ti.email = NEW.email
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  ON CONFLICT DO NOTHING;

  UPDATE tenant_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE email = NEW.email AND status = 'pending';

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user_tenant for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. handle_tester_license_on_signup
CREATE OR REPLACE FUNCTION public.handle_tester_license_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_license_id uuid;
BEGIN
  SELECT id INTO v_license_id
  FROM public.tester_licenses
  WHERE email = new.email
    AND user_id IS NULL
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_license_id IS NULL THEN
    RETURN new;
  END IF;

  UPDATE public.tester_licenses
  SET user_id = new.id, updated_at = now()
  WHERE id = v_license_id;

  UPDATE public.profiles
  SET platform_role = 'tester'
  WHERE id = new.id
    AND (platform_role IS NULL OR platform_role = 'user');

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_tester_license_on_signup error for %: %', new.email, SQLERRM;
    RETURN new;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. invoice_line_tenant_default (note: search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.invoice_line_tenant_default()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. recalc_invoice_paid (note: search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.recalc_invoice_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE target_invoice_id UUID;
BEGIN
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices i SET
    amount_paid = COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = target_invoice_id), 0),
    status = CASE
      WHEN COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = target_invoice_id), 0) >= i.total THEN 'paid'::public.invoice_status
      WHEN COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = target_invoice_id), 0) > 0      THEN 'partial'::public.invoice_status
      ELSE i.status END,
    paid_at = CASE
      WHEN COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = target_invoice_id), 0) >= i.total AND i.paid_at IS NULL THEN now()
      ELSE i.paid_at END,
    updated_at = now()
  WHERE i.id = target_invoice_id;
  RETURN NEW;
END; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. recalc_invoice_totals (note: search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE target_invoice_id UUID;
BEGIN
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices i SET
    subtotal   = COALESCE((SELECT SUM(amount) FROM public.invoice_line_items WHERE invoice_id = target_invoice_id), 0),
    gst_amount = COALESCE((SELECT SUM(gst_amount) FROM public.invoice_line_items WHERE invoice_id = target_invoice_id), 0),
    total      = COALESCE((SELECT SUM(amount_incl_gst) FROM public.invoice_line_items WHERE invoice_id = target_invoice_id), 0),
    updated_at = now()
  WHERE i.id = target_invoice_id;
  RETURN NEW;
END; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. rls_auto_enable (event trigger; search_path = pg_catalog NOT public)
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- @SD-JUSTIFICATION: event-trigger, owns DDL — MUST be SD per Postgres event-trigger requirements
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. set_payroll_super_due_date (note: search_path = public, pg_temp)
CREATE OR REPLACE FUNCTION public.set_payroll_super_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_payment_date DATE;
BEGIN
  IF NEW.super_due_date IS NULL AND NEW.super_paid_at IS NULL THEN
    SELECT payment_date INTO v_payment_date
    FROM public.pay_runs
    WHERE id = NEW.pay_run_id;

    NEW.super_due_date := public.business_days_after(v_payment_date, 7);
  END IF;
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. set_platform_branding_updated_at
CREATE OR REPLACE FUNCTION public.set_platform_branding_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. set_tenant_app_branding_updated_at
CREATE OR REPLACE FUNCTION public.set_tenant_app_branding_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. track_idea_status_transition
CREATE OR REPLACE FUNCTION public.track_idea_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
-- If status changed, update time tracking
IF OLD.status IS DISTINCT FROM NEW.status THEN
-- Calculate time in previous status
DECLARE
time_diff INTEGER;
BEGIN
time_diff := EXTRACT(EPOCH FROM (NOW() - OLD.updated_at))::INTEGER;

-- Update analytics based on old status
IF OLD.status = 'capture' THEN
UPDATE idea_analytics
SET time_in_capture_seconds = time_in_capture_seconds + time_diff
WHERE idea_id = NEW.id;
ELSIF OLD.status = 'refine' THEN
UPDATE idea_analytics
SET time_in_refine_seconds = time_in_refine_seconds + time_diff
WHERE idea_id = NEW.id;
ELSIF OLD.status = 'launch' THEN
UPDATE idea_analytics
SET time_in_launch_seconds = time_in_launch_seconds + time_diff
WHERE idea_id = NEW.id;
END IF;

-- If moving to completed, mark completion
IF NEW.status = 'launch' AND OLD.status != 'launch' THEN
UPDATE idea_analytics
SET completed_at = NOW()
WHERE idea_id = NEW.id AND completed_at IS NULL;
END IF;
END;
END IF;

RETURN NEW;
END;
$function$;
