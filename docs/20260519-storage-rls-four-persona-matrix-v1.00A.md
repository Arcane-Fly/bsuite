# Storage RLS Four-Persona Audit Matrix

**Issue:** BSU#315  
**Date:** 2026-05-19  
**Status:** A (Approved — findings resolved via migrations)  
**Supabase Project:** `tuybltdrdefjblnplpqo`

---

## Scope

17 storage buckets on `storage.objects` (RLS enabled: `relrowsecurity = true`).

Four personas tested:
1. **anon** — unauthenticated, no JWT
2. **tenant_user** — authenticated, `user_tenants.role = 'user'`
3. **tenant_admin** — authenticated, `user_tenants.role IN ('owner','admin')`
4. **platform_admin** — authenticated, `profiles.platform_role IN ('developer','platform_admin')`

---

## storage_authz_check Function (Policy Delegate)

```sql
CREATE OR REPLACE FUNCTION public.storage_authz_check(p_object_name text, p_allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = (SELECT auth.uid())
      AND ut.tenant_id::text = (storage.foldername(p_object_name))[1]
      AND ut.status = 'active'
      AND ut.role = ANY(p_allowed_roles)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.platform_role = ANY(ARRAY['developer','platform_admin'])
  );
$$;
```

Already uses `(SELECT auth.uid())` init-plan optimization.

---

## Bucket Inventory (17 buckets)

| Bucket | MIME Types | Size Limit | Policy Style |
|--------|-----------|-----------|--------------|
| platform-logos | image/* | 10MB (F4 fix) | Direct profiles check |
| tenant-logos | image/* | 5MB | Direct user_tenants check |
| apprentice-documents | application/pdf,image/* | 10MB | storage_authz_check |
| employee-documents | application/pdf,image/* | 10MB | storage_authz_check |
| host-employer-documents | application/pdf,image/* | 10MB | storage_authz_check |
| marketing-communications | image/*,application/pdf,video/* | 100MB | storage_authz_check |
| payroll-documents | application/pdf | 10MB | storage_authz_check |
| placement-documents | application/pdf,image/* | 10MB | storage_authz_check |
| training-documents | application/pdf,image/* | 10MB | storage_authz_check |
| whs-incidents-documents | application/pdf,image/* | 10MB | storage_authz_check (F1 fix) |
| compliance-documents | application/pdf | 10MB | storage_authz_check |
| financial-documents | application/pdf | 10MB | storage_authz_check |
| contracts | application/pdf | 10MB | storage_authz_check |
| reports | application/pdf | 10MB | storage_authz_check |
| avatars | image/* | 5MB | storage_authz_check |
| exports | application/csv,text/csv | 50MB | storage_authz_check |
| imports | application/csv,text/csv | 50MB | storage_authz_check |

---

## Four-Persona Matrix

Legend: ✅ correct deny | ✅ correct allow | 🟥 security issue | 🟦 usability/perf issue

### platform-logos

| Verb | anon | tenant_user | tenant_admin | platform_admin |
|------|------|-------------|--------------|----------------|
| SELECT | ✅ deny | ✅ deny | ✅ deny | ✅ allow |
| INSERT | ✅ deny | ✅ deny | ✅ deny | ✅ allow |
| UPDATE | ✅ deny | ✅ deny | ✅ deny | ✅ allow |
| DELETE | ✅ deny | ✅ deny | ✅ deny | ✅ allow |

### tenant-logos

| Verb | anon | tenant_user | tenant_admin | platform_admin |
|------|------|-------------|--------------|----------------|
| SELECT | ✅ deny | ✅ allow (active member) | ✅ allow | ✅ allow |
| INSERT | ✅ deny | ✅ deny | ✅ allow | ✅ allow |
| UPDATE | ✅ deny | ✅ deny | ✅ allow | ✅ allow |
| DELETE | ✅ deny | ✅ deny | ✅ allow | ✅ allow |

### document buckets (storage_authz_check delegate)

All 15 document buckets use `storage_authz_check()`. Behavioural matrix is identical across all:

| Verb | anon | tenant_user | tenant_admin | platform_admin |
|------|------|-------------|--------------|----------------|
| SELECT | ✅ deny | ✅ deny (role='user' not in list) | ✅ allow | ✅ allow |
| INSERT | ✅ deny | ✅ deny | ✅ allow | ✅ allow |
| UPDATE | ✅ deny | ✅ deny | ✅ allow | ✅ allow |
| DELETE | ✅ deny | ✅ deny | ✅ allow | ✅ allow |

*Note: `whs-incidents-documents` had a `marketing` role included before F1 fix (below).*

---

## Findings

### F1 — Security: `marketing` role in `whs_incidents_documents` policies 🟥

**Severity:** High (security)  
**Finding:** All four `whs_incidents_documents_*` policies included `'marketing'` in the allowed_roles array. WHS incident documents are sensitive safety/legal records. Marketing has no operational need.  
**Root cause:** Copy-paste error from `marketing-communications` bucket policy.  
**Fix:** Migration `20260519110000_fix_whs_marketing_role_in_storage_policy.sql`  
**Corrected roles:** `owner, admin, hr, manager, whs_officer`  
**Four-persona impact:** None (marketing role is tenant_user-level — already denied by corrected array)

### F2 — N/A (no finding)

### F3 — Perf: `tenant_logos_*` missing init-plan optimization 🟦

**Severity:** Low (performance)  
**Finding:** The four `tenant_logos_*` policies used raw `auth.uid()` instead of `(SELECT auth.uid() AS uid)`, causing per-row re-evaluation of the volatile function.  
**All other storage policies** (platform_logos_*, storage_authz_check) already used the init-plan pattern.  
**Fix:** Migration `20260519110001_tenant_logos_initplan_optimization.sql`  
**Behavioural change:** None — performance-only fix.

### F4 — Ops: `platform-logos` bucket had `file_size_limit = NULL` 🟦

**Severity:** Low (operational risk)  
**Finding:** The `platform-logos` bucket had `file_size_limit = NULL` (unlimited). All 16 other buckets had explicit size limits. Unlimited upload size is an operational risk.  
**Fix:** Migration `20260519110002_platform_logos_file_size_limit.sql`  
**Limit set:** 10485760 bytes (10 MB) — matches small-asset bucket default.

---

## Migration Summary

All three migrations are idempotent (DROP POLICY IF EXISTS / WHERE file_size_limit IS NULL).

| Migration | Finding | Applied |
|-----------|---------|---------|
| `20260519110000_fix_whs_marketing_role_in_storage_policy.sql` | F1 | 2026-05-19 |
| `20260519110001_tenant_logos_initplan_optimization.sql` | F3 | 2026-05-19 |
| `20260519110002_platform_logos_file_size_limit.sql` | F4 | 2026-05-19 |

---

## Verification

Post-migration verification queries run against `tuybltdrdefjblnplpqo`:

```sql
-- F1 verified: marketing not in any whs policy
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%whs%';
-- confirmed: no 'marketing' in any qual

-- F3 verified: tenant_logos policies use (SELECT auth.uid())
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%tenant_logos%';
-- confirmed: all four policies use (SELECT auth.uid() AS uid)

-- F4 verified: file_size_limit set
SELECT id, file_size_limit FROM storage.buckets WHERE id = 'platform-logos';
-- confirmed: file_size_limit = 10485760
```

---

## Doctrine Compliance

- No `cookieStorage`, no `business_suite_auth`, no `.crm7.app` domain cookies
- Per-domain Supabase clients only
- BS OAuth 2.1 PKCE — see AUTH_CANONICAL.md for doctrine
