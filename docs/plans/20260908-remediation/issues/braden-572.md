# tenant_branding: duplicate tenant_id=NULL rows shadow platform_branding's font fix

https://github.com/GaryOcean428/braden/issues/572

Snapshot updatedAt: 2026-09-01T07:59:02Z. Open at capture; re-read live.

## What's wrong

`public.tenant_branding` (project `tuybltdrdefjblnplpqo`, shared across braden/crm7/business-suite-unified/etc.) currently has **two** rows with `tenant_id IS NULL`:

| id | header_font | body_font | updated_at |
|---|---|---|---|
| `88673ece-c927-4e4d-86db-18729b9ec76a` | Inter | Inter | 2026-03-19 01:37:48 |
| `fb5ef2e8-782f-4527-b5b5-d665b3589001` | Inter | Inter | 2026-03-19 05:06:56 |

This is the legacy Tier-1 compat seed described in `supabase/migrations/20260414120000_platform_branding.sql` / `20260414120100_tenant_branding_v2.sql`. Two problems, found while working braden#571 (removing braden's inert font picker):

1. **Duplicate NULL row.** `upsertPlatformBranding()` (braden's `BrandingAdmin.tsx`, and presumably any equivalent elsewhere) does `.is('tenant_id', null).maybeSingle()`, which **errors** when more than one row matches. Any writer using this pattern against the current data is broken until the duplicate is resolved.
2. **Stale shadow of a live fix.** crm7's `useBranding()` (`crm7/src/hooks/useBranding.ts`) resolves each font field `app → tenant → platform`, where "tenant" falls back to this NULL row when a real tenant has no branding of its own. That means these rows' `header_font='Inter'`/`body_font='Inter'` values take priority **over** `platform_branding.header_font`/`body_font`, which was correctly set to `'Geist'` (verified live 2026-09-01, `updated_at` same day). Any crm7 tenant without its own branding row is currently getting shadowed back to `'Inter'` instead of the platform's actual default.

## Evidence

Read-only, via Supabase MCP `execute_sql` against `tuybltdrdefjblnplpqo`:

```sql
SELECT id, tenant_id, header_font, body_font, font_family, company_name, updated_at
FROM public.tenant_branding WHERE tenant_id IS NULL;
-- 2 rows, both header_font/body_font = 'Inter'

SELECT id, header_font, body_font, updated_at FROM public.platform_branding WHERE id = 'platform';
-- header_font/body_font = 'Geist', updated_at = 2026-09-01
```

## Suggested fix (not performed here — needs write access + coordination)

1. Reconcile the duplicate NULL rows into one (delete/merge the older, or add a partial unique index on `tenant_id` treating NULL as a singleton — Postgres doesn't do this by default, hence the duplicate).
2. Either clear `header_font`/`body_font` on the remaining NULL row (`NULL`, letting `firstNonNull` fall through to `platform_branding`), or update it to match `platform_branding`'s current value, so it stops shadowing Tier-1 fixes made on BSU's own admin page.
3. Consider whether `useBranding()`'s tier order (`app → tenant → platform`) should instead check `platform_branding` before falling back to the legacy NULL-row seed, per the original migration's own stated intent ("`useBranding()` should prefer `platform_branding` going forward") — that's a behavioural change belonging to whichever lane owns crm7/BSU's shared branding hook, not this issue alone.

## Why not fixed in braden#571

That PR's task was explicitly read-only / no-production-writes. braden#571 does stop braden's own admin page from writing to `header_font`/`body_font` at all (so it can no longer *reintroduce* a stale shadow), but the existing stale data and the duplicate row are a separate, cross-app data-integrity issue requiring write access this lane didn't have and wasn't authorized to use.

**Cross red-team**: whichever agent/lane next touches `crm7/src/hooks/useBranding.ts` or `business-suite-unified`'s branding admin.
**Skills to load**: `supabase-postgres-best-practices`, `bsuite-branding-inheritance`, `bsuite-rls-authz-red-team`.
**Validation loop**: §9.1 output-equivalence — before/after `SELECT` on `tenant_branding`/`platform_branding` for the NULL row, plus a live crm7 tenant-without-branding render showing the resolved font before/after.
