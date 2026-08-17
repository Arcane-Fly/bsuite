# SECURITY DEFINER Privilege-Escalation Audit — `public.is_team_admin` + WS-G Helpers

> ## ⚠ POPULATION SUPERSEDED — re-measured 2026-08-17
>
> **This audit covered 59 `SECURITY DEFINER` functions. The live database now has 223.** Measured
> against `tuybltdrdefjblnplpqo`:
>
> ```sql
> SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
> WHERE n.nspname = 'public' AND p.prosecdef;      -- 223
> ```
>
> **164 definer functions have never been through this audit.** Each finding below still holds for
> the function it names; the **coverage** claim does not. This document is not evidence that the
> estate's definer surface is clean.
>
> One thing did get better, and it is worth stating precisely because it narrows what is actually
> outstanding. Every one of the 223 now carries an explicit `search_path` — the highest-risk
> configuration, a definer function with **no** `search_path` at all, is at **zero**:
>
> | `search_path` state | count |
> |---|---|
> | none set (worst case) | **0** |
> | `search_path = ''` (strictest) | 6 |
> | some other explicit value | 217 |
>
> So the search-path-shadowing class this document was written about is contained. What is *not*
> established for the 164 unaudited functions is the other half of the job: whether each one's
> **body** is correctly authorised — that it re-checks the caller rather than trusting that being
> `SECURITY DEFINER` is itself permission. A definer function with a tight `search_path` and a
> missing tenant predicate still returns another tenant's rows. Re-running the sweep over all 223
> is the outstanding work.

- **Doc id:** `20260427-security-definer-audit-v1.00W.md`
- **Date:** 2026-04-27
- **Auditor:** Claude Opus 4.7 (sub-agent run)
- **Project:** Supabase `tuybltdrdefjblnplpqo` (BSuite shared backend)
- **Scope:** `public.is_team_admin(uuid,uuid)` (WS-G, migration `20260426000000_team_members_admin_rls.sql`) + sweep of all `public` SECURITY DEFINER functions added during the 2026-04-25 finish-line session and earlier.
- **Status:** Working draft — pending sign-off.

---

## 1. Executive verdict

| Verdict | Function(s) | Action |
|---|---|---|
| **PASS** | `public.is_team_admin(uuid,uuid)` plus 56 other `SECURITY DEFINER` functions in `public` with explicit search_path | None required. Tightening recommended (see §5). |
| **WARN** | `public.is_team_admin` and ~14 helpers using `search_path = public, pg_temp` (functional, body fully-qualified, but not strictest) | Tighten to `SET search_path = ''` — provided as proposal §5 + applied via migration §6. Safe because every body fully-qualifies. |
| **FAIL** | `public.set_payroll_super_due_date()` — `search_path_config = NULL` (canonical RLS-bypass / search-path-injection vector) | **Hardening migration §6 applied.** |

**Aggregate counts (59 SECURITY DEFINER functions in `public`):**

- PASS: 58 (all have explicit `search_path` set, owner=`postgres`)
- WARN: subset of the 58 still using `public, pg_temp` rather than the strictest `''` — primarily `is_team_admin` and the GTO/branding helpers
- FAIL: **1** — `public.set_payroll_super_due_date` (NULL search_path)

---

## 2. `public.is_team_admin(p_team_id uuid, p_user_id uuid)` — PASS

### 2.1 Definition (live database)

```sql
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.team_members tm
     WHERE tm.team_id = p_team_id
       AND tm.user_id = p_user_id
       AND tm.role IN ('owner', 'admin')
  );
$function$
```

### 2.2 Audit checklist

| Check | Expected | Observed | Result |
|---|---|---|---|
| Owner is `postgres` (or `service_role`), NOT calling role | `postgres` | `postgres` | PASS |
| `prosecdef` (SECURITY DEFINER) | `true` | `true` | PASS |
| `provolatile` | `s` (STABLE) — read-only & deterministic per snapshot | `s` | PASS |
| `proconfig` (search_path) | NOT NULL; explicit | `search_path=public, pg_temp` | PASS (WARN — could tighten to `''`) |
| Args | `p_team_id uuid, p_user_id uuid` | identical | PASS |
| Returns | `boolean` | `boolean` | PASS |
| Language | `sql` (preferred; no PL/pgSQL injection surface) | `sql` | PASS |
| auth.uid() validated via JOIN, not text/substring | JOIN on `tm.user_id = p_user_id` (typed `uuid`) | JOIN-based, type-safe | PASS |
| Body fully-qualifies tables | `public.team_members` | `public.team_members` | PASS — see §5 |

### 2.3 Privileges (`information_schema.routine_privileges`)

| Grantee | Privilege | Notes |
|---|---|---|
| `postgres` | EXECUTE | Owner, expected |
| `service_role` | EXECUTE | Expected — server-side admin |
| `authenticated` | EXECUTE | Expected — RLS predicate caller |
| `anon` | (none) | PASS — anon cannot call directly |
| `public` | (none) | PASS — `REVOKE ALL ... FROM PUBLIC` honored |

Verification SQL:

```sql
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'is_team_admin'
ORDER BY grantee, privilege_type;
-- → authenticated|EXECUTE, postgres|EXECUTE, service_role|EXECUTE
```

### 2.4 Recursion-break verification

The whole point of WS-G (`20260426000000_team_members_admin_rls.sql`) is to break the policy self-recursion that would otherwise occur if `team_members` policies tried to read `team_members` directly. Confirmed live policies that call `is_team_admin`:

| Table | Policy | Cmd | Predicate uses |
|---|---|---|---|
| `team_members` | `team_members_team_select` | SELECT | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_members` | `team_members_admin_insert` | INSERT | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_members` | `team_members_admin_update` | UPDATE | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_members` | `team_members_admin_delete` | DELETE | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_invitations` | `team_invitations_admin_select` | SELECT | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_invitations` | `team_invitations_admin_insert` | INSERT | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_invitations` | `team_invitations_admin_update` | UPDATE | `is_team_admin(team_id, (SELECT auth.uid()))` |
| `team_invitations` | `team_invitations_admin_delete` | DELETE | `is_team_admin(team_id, (SELECT auth.uid()))` |

`teams.teams_member_select` does retain a direct `EXISTS (SELECT 1 FROM team_members ...)` join, but this is **safe** because `team_members` policies are themselves non-recursive after WS-G (they delegate to `is_team_admin`, which is SECURITY DEFINER and therefore bypasses RLS during evaluation). No self-recursion risk.

RLS is enabled on all three tables (`relrowsecurity = true` for `teams`, `team_members`, `team_invitations`).

**Recursion-break status: PASS.**

### 2.5 Use of `(SELECT auth.uid())` wrapper

All policies wrap `auth.uid()` and `auth.email()` in `(SELECT ...)` subqueries. This is the Supabase-recommended init-plan optimisation that hoists the function call to a per-statement evaluation rather than per-row. Confirmed across all 14 policies on the three tables. **Performance: PASS.**

---

## 3. Full SECURITY DEFINER inventory in `public`

59 functions. Below is the heat-map by `search_path_config`. Full list captured by query:

```sql
SELECT n.nspname || '.' || p.proname AS function,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef, p.provolatile,
       COALESCE(array_to_string(p.proconfig, ', '), 'NULL — UNSAFE') AS search_path_config,
       pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;
```

### 3.1 Functions with `search_path = NULL` (FAIL — must remediate)

| Function | Volatility | Args | Note |
|---|---|---|---|
| `public.set_payroll_super_due_date` | `v` (VOLATILE — trigger) | `()` | **FAIL.** PL/pgSQL trigger on `public.payroll_records BEFORE INSERT`. Calls `public.business_days_after(...)`. With NULL search_path, an attacker who can `CREATE FUNCTION` in a schema earlier in the resolution path could shadow `business_days_after` and execute arbitrary SQL in the trigger context (which is `postgres` thanks to SECURITY DEFINER). **Remediated** in `20260427000000_security_definer_hardening.sql`. |

### 3.2 Functions with `search_path = public, pg_temp` (PASS, WARN-tighten-to-empty)

These are functional and safe today (body fully-qualifies all `public.*` references), but the strictest hardening is `SET search_path = ''`. Tightening these is OPTIONAL and only blocked if any internal call relies on implicit name resolution. Spot-check: `is_team_admin` body uses `public.team_members` — eligible.

- `public.is_team_admin` — **tighten in §6 (applied)**
- `public.branding_json_for_platform`
- `public.branding_json_for_tenant`
- `public.cleanup_apprentice_handoff_tokens`
- `public.create_apprentice_from_candidate`
- `public.email_integration_get_decrypted_token` (*search_path = `public, vault, pg_temp`* — `vault` schema is intentional, do not tighten without re-reading body)
- `public.email_integration_set_encrypted_token` (same)
- `public.get_user_apprentice_id`
- `public.get_user_gto_role`
- `public.get_user_host_employer_id`
- `public.invoice_line_tenant_default`
- `public.is_gto_admin`
- `public.is_gto_staff` (both overloads)
- `public.is_platform_admin`
- `public.recalc_invoice_paid`
- `public.recalc_invoice_totals`

The two `email_integration_*_encrypted_token` functions deliberately include `vault` in their `search_path` so the body can call `vault.create_secret(...)`/`vault.decrypted_secrets`. Do not tighten those without a body audit and rewrite to `vault.<symbol>`.

### 3.3 Functions with `search_path = public` (PASS)

40+ functions including all the WS-3..WS-8 helpers (`auth_tenant_id`, `check_module_access`, `check_user_portal_role`, `check_user_tenant_access`, `get_descendant_tenant_ids`, `get_visible_tenant_ids`, `get_visible_fields`, `get_sharing_level`, `has_parent_admin_access`, `user_has_org_access`, `create_organization_with_owner`, `convert_tester_to_paid`, `grant_tester_license`, `revoke_tester_license`, `log_super_admin_action`, `log_tenant_switch`, `handle_new_user_tenant`, `handle_tester_license_on_signup`, `guard_profiles_privileged_columns`, `track_idea_status_transition`, `set_updated_at`, `set_platform_branding_updated_at`, `set_tenant_app_branding_updated_at`, `tenant_branding_is_force_overridden`, `show_demo_data`, `is_demo_write_blocked`, `is_dev_mode`, `platform_is_developer_or_admin`, `ping`, `ancestors_of`, `descendants_of`, `calculate_launch_readiness`, `check_auth`, `create_user_profile`, `get_user_analytics_summary`, `get_user_id_by_email`, `get_user_tenant_context`, `send_inspection_reminders`).

All `pg_get_userbyid(proowner) = 'postgres'`. All have explicit `search_path`. All PASS.

### 3.4 Function with non-standard `search_path = pg_catalog` (PASS, intentional)

- `public.rls_auto_enable` — admin tooling. `pg_catalog` is needed because the body is reading system catalogues. PASS.

### 3.5 Function with `search_path = public, auth` (PASS, intentional)

- `public.r7_candidate_id_for_auth_user` — needs `auth` schema. PASS.

---

## 4. Policy + RLS posture summary

- `team_members`, `team_invitations`, `teams`: RLS enabled (`relrowsecurity = true`). Force-RLS not enabled — service_role can bypass via the dedicated `*_service_role_bypass` policies created in `20260410000000_enable_rls_all_unprotected_tables.sql`. Acceptable.
- `payroll_records`: RLS enabled. The `set_payroll_super_due_date` trigger fires regardless of RLS (BEFORE INSERT triggers run after RLS WITH CHECK), so the search_path fix is purely about preventing schema-shadowing attacks against the trigger body, not about RLS bypass.
- `pay_runs`: RLS enabled. Owner of `business_days_after` is `postgres`. After hardening, the trigger body's `public.business_days_after(...)` resolves unambiguously.

---

## 5. `search_path` tightening recommendation for `is_team_admin`

The body fully-qualifies the only relation it touches (`public.team_members`). It calls no other function. Therefore the strictest possible search_path is empty (`''`), which means **no schema is implicitly resolvable** — every identifier must be schema-qualified. This eliminates the entire class of search-path-shadowing attacks even in adversarial multi-extension environments.

### Proposed tightening DDL (idempotent, dependency-safe)

```sql
ALTER FUNCTION public.is_team_admin(uuid, uuid)
  SET search_path = '';
```

Note: `ALTER FUNCTION ... SET search_path = ''` is safer than `CREATE OR REPLACE FUNCTION ...` because it does not regenerate the function OID and therefore does not invalidate the prepared-statement plans of dependent RLS policies. Dependent policies continue to work without re-creation.

This tightening is **applied** in §6 alongside the `set_payroll_super_due_date` fix.

---

## 6. Hardening migration applied

**File:** `business-suite-unified/supabase/migrations/20260427000000_security_definer_hardening.sql`

Two changes:

1. **FAIL fix:** `public.set_payroll_super_due_date` — add `SET search_path = public, pg_temp`. This is a `CREATE OR REPLACE FUNCTION` because `ALTER FUNCTION ... SET search_path` works for adding a config but the cleanest, idempotent way to express the body+config jointly is the full `CREATE OR REPLACE`. The new body is bit-identical to the old except for the `SET search_path` clause and an explicit `public.business_days_after`/`public.pay_runs` qualification (defence-in-depth — already implicit but now explicit).
2. **WARN tightening:** `public.is_team_admin(uuid, uuid)` — `ALTER FUNCTION ... SET search_path = ''`. Body already fully-qualifies, so this is purely a hardening tightening with zero behavioural change.

Both wrapped in a single `BEGIN; ... COMMIT;` transaction.

---

## 7. Verification SQL (run after migration)

```sql
-- 1. is_team_admin tightened to ''
SELECT proname,
       array_to_string(proconfig, ', ') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'is_team_admin';
-- expected: search_path=

-- 2. set_payroll_super_due_date no longer NULL
SELECT proname,
       array_to_string(proconfig, ', ') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'set_payroll_super_due_date';
-- expected: search_path=public, pg_temp  (no longer NULL)

-- 3. Sweep — should now return ZERO rows
SELECT n.nspname || '.' || p.proname AS function
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proconfig IS NULL;
-- expected: (no rows)
```

---

## 8. Outstanding items / future hardening

- **Optional:** tighten the rest of the `public, pg_temp` cohort to `''` once each body has been verified to fully-qualify. This is OPTIONAL — `public, pg_temp` is the Supabase Postgres-best-practice baseline and already passes the linter. Do NOT do this in bulk without per-function body audit.
- **Audit advisor:** consider running `mcp__claude_ai_Supabase__get_advisors` to surface any other `function_search_path_mutable` warnings the platform linter raises.
- **Force RLS:** consider `ALTER TABLE ... FORCE ROW LEVEL SECURITY` on `team_members` / `team_invitations` to apply policies even to the table owner (defence-in-depth against future SECURITY DEFINER functions that might forget the search_path pin). Currently service_role bypasses via dedicated policies, so this would not break the existing flow but is a slightly larger change — left as future work.

---

## 9. Sign-off

- [x] `is_team_admin` is correctly hardened (PASS — owner postgres, search_path explicit, STABLE, JOIN-based, recursion broken, anon revoked).
- [x] One FAIL (`set_payroll_super_due_date`) discovered and remediated.
- [x] One WARN (`is_team_admin` tightening to `''`) applied.
- [x] No other unexpected SECURITY DEFINER functions discovered — all 59 are accounted for and owned by `postgres`.

End of audit.
