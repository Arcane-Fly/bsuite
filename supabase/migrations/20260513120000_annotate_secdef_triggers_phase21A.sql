-- ============================================================
-- Migration: annotate_secdef_triggers_phase21A
-- Phase 2.1A of bsuite#953 — SECURITY DEFINER trigger hardening
-- ============================================================
-- Category A — Trigger Functions (and one event-trigger function).
-- All 14 functions below are LEGITIMATE-SECURITY-DEFINER-by-design:
--   trigger context, write-path requires bypass-RLS-on-cascading-
--   row-mutations.  NO behaviour change — pure annotation overlay.
--
-- Each function receives an @SD-JUSTIFICATION block at the top of its
-- body.  The rest of the body is preserved byte-for-byte relative to
-- the definition recorded via pg_get_functiondef at 2026-05-13.
--
-- Cross-references:
--   Parent epic  : bsuite#953
--   Phase 2.2    : bsuite#951 (RLS initplan — separate sub-issue)
--   AUTH_CANONICAL.md §RLS patterns
-- ============================================================

-- ── 1. create_user_profile ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. guard_profiles_privileged_columns ─────────────────────
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  -- Only platform admins / developers may update platform_role.
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    ) THEN
      NEW.platform_role := OLD.platform_role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. handle_new_user ───────────────────────────────────────
-- Note: re-defined in 20260506000100_bootstrap_profile_for_existing_users
--       to use ON CONFLICT (id) DO NOTHING for idempotency.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 4. handle_new_user_tenant ────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.id
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.user_tenants (user_id, tenant_id, role, status)
  VALUES (NEW.id, v_tenant_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── 5. handle_tester_license_on_signup ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_tester_license_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  IF NEW.email LIKE '%@crm7.app' OR NEW.email LIKE '%+test%@%' THEN
    INSERT INTO public.tester_licenses (user_id, granted_at, expires_at)
    VALUES (NEW.id, now(), now() + INTERVAL '1 year')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 6. invoice_line_tenant_default ───────────────────────────
CREATE OR REPLACE FUNCTION public.invoice_line_tenant_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT i.tenant_id INTO NEW.tenant_id
    FROM public.invoices i
    WHERE i.id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 7. recalc_invoice_paid ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  UPDATE public.invoices
  SET paid_at = CASE
    WHEN amount_paid >= total THEN COALESCE(paid_at, now())
    ELSE NULL
  END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN NEW;
END;
$$;

-- ── 8. recalc_invoice_totals ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  UPDATE public.invoices
  SET subtotal = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.invoice_line_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND NOT voided
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN NEW;
END;
$$;

-- ── 9. rls_auto_enable (event trigger — MUST be SD; owns DDL) ─
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF r.command_tag = 'CREATE TABLE' AND r.schema_name = 'public' THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.object_identity);
    END IF;
  END LOOP;
END;
$$;

-- ── 10. set_payroll_super_due_date ───────────────────────────
-- Note: proconfig verified at 2026-04-28 as search_path=public, pg_temp
--       (migration 20260427000000_security_definer_hardening).
CREATE OR REPLACE FUNCTION public.set_payroll_super_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  IF NEW.pay_period_end IS NOT NULL THEN
    -- Australian SGA: super due 28 days after end of the SG quarter.
    NEW.super_due_date := (
      date_trunc('quarter', NEW.pay_period_end) + INTERVAL '3 months 28 days'
    )::date;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 11. set_platform_branding_updated_at ─────────────────────
-- Body preserved verbatim from 20260414120000_platform_branding.sql.
CREATE OR REPLACE FUNCTION public.set_platform_branding_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 12. set_tenant_app_branding_updated_at ───────────────────
-- Body preserved verbatim from 20260414120200_tenant_app_branding.sql.
CREATE OR REPLACE FUNCTION public.set_tenant_app_branding_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 13. set_updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 14. track_idea_status_transition ─────────────────────────
CREATE OR REPLACE FUNCTION public.track_idea_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- @SD-JUSTIFICATION: trigger-context, write-path requires bypass-RLS-on-cascading-row-mutations
-- @SD-CATEGORY: 2.1A
-- @SD-AUDIT: 2026-05-13
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.idea_status_history (
      idea_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;
