# Storage RLS reserved-prefix policy — M.6 state

**Status:** W (Working)  **Date:** 2026-04-21  **Part:** M.6 of the 2026 world-class audit

## Intent

Formalise the "reserved prefix" concept for the `tenant-logos` bucket so the `/branding` security fix (PR #136) is codified in RLS, not only in the UI layer.

Reserved prefixes are **platform-owned asset paths** that only developers / platform_admins may write to:

- `hero/**` — corporate landing-page hero images (braden.com.au + BSU portal).
- `platform/**` — BSU portal static assets.
- `global/**` — any cross-tenant shared asset.

## Current state (2026-04-21)

### What's already protecting these paths

1. **`storage.objects` RLS on `tenant-logos`** — existing policies `tenant_logos_{insert,update,delete}` match `storage.foldername(name)[1]` against `user_tenants.tenant_id`. The first folder in `hero/{tenant_id}/{app}.{ext}` is `hero`, not a tenant_id, so the tenant-admin clause **never matches** for hero paths. Only the developer / platform_admin clause admits writes. Effectively: only developers can write to any `hero/**` path today.
2. **UI gate** shipped in PR #136 (commit `03996dfb`): `Branding.tsx` hides the "BSU Portal Hero Image" + "braden.com.au Hero" upload sections from any user whose `platform_role` is not `developer` or `platform_admin`. Enterprise white-label users see a read-only notice explaining why.
3. **Hero storage path is tenant-scoped** — `hero/${tenantId}/${app}.${ext}` instead of the pre-PR-#136 `hero/${app}.${ext}`. Every tenant gets their own folder; no cross-tenant file overwrite is possible.

### What we tried to add and why it didn't land this cycle

Attempted to codify the reserved-prefix rule in RLS (via either a `DROP POLICY … CREATE POLICY` rewrite or an additive `AS RESTRICTIVE` policy). Both failed with:

```
ERROR:  42501: must be owner of relation objects
```

The Supabase Management API MCP runs as the `postgres` role — which is **not** the owner of `storage.objects`. That table is owned by `supabase_storage_admin`. Only operations from the Supabase Dashboard (which uses an internal privileged role) can rewrite or add policies to it.

This is a **Supabase platform constraint**, not a BSuite gap. The MCP documented toolset does not expose a "dashboard RLS edit" endpoint.

## Defence in depth today

The combination in place is stronger than a single AS RESTRICTIVE policy on its own:

| Layer | Defends against | Current state |
|---|---|---|
| UI gate (Branding.tsx) | Accidental click by enterprise tenant admin | ✅ Live (PR #136) |
| Storage RLS foldername-match | Unauthorised write by any non-developer | ✅ Live (pre-existing, validated via MCP) |
| Tenant-scoped storage path (`hero/{tenantId}/...`) | Cross-tenant file overwrite | ✅ Live (PR #136) |
| Route-level `AccessGuard serviceKey="white_label"` | Non-white-label tenant reaching the page at all | ✅ Live (pre-existing) |
| `platform_role` DB check in AuthContext | Session with a developer-bypass role | ✅ Live |

For an enterprise tenant to write to `hero/**`:

1. They'd have to bypass the route-level AccessGuard (white-label only allows Enterprise + Developer).
2. They'd have to bypass the UI gate that hides the BSU/Braden upload for non-developers.
3. They'd have to construct a direct storage API call (no SDK would; they'd have to craft it themselves).
4. The request would still be rejected by RLS because `foldername[1] = 'hero'` never matches their `tenant_id`.

The attacker surface for the reserved-prefix category is therefore **developer/platform_admin accounts only** — exactly where the spec wants it.

## Follow-up (NOT a deferral, an operational task)

To codify the rule in RLS for auditability (belt-and-braces):

1. Open the Supabase Dashboard → Authentication → Policies → `storage.objects` → `tenant_logos_insert`/`update`/`delete`.
2. In each of the three permissive policies, replace the second `OR` branch (tenant-admin clause) with:
   ```sql
   (
     (storage.foldername(name))[1] NOT IN ('hero', 'platform', 'global')
     AND EXISTS (
       SELECT 1 FROM public.user_tenants
       WHERE user_tenants.user_id = auth.uid()
         AND (user_tenants.tenant_id)::text = (storage.foldername(name))[1]
         AND user_tenants.role IN ('owner', 'admin')
         AND user_tenants.status = 'active'
     )
   )
   ```
3. Save. The first clause (developer/platform_admin EXISTS on public.profiles) stays unchanged.

Estimated click-through time: 5 minutes. Post-change, run the four-persona `execute_sql` matrix from the Supabase SQL editor to confirm:

| Caller | Path | Expected |
|---|---|---|
| anon | `hero/x.png` | ❌ rejected (no auth) |
| tenant A owner | `hero/{tenant-A}/x.png` | ❌ rejected (foldername[1] is 'hero', not tenant_id) |
| tenant A owner | `{tenant-A}/logo.png` | ✅ allowed |
| tenant A owner | `platform/x.png` | ❌ rejected |
| tenant A owner | `hero/{tenant-A}/x.png` | ❌ rejected |
| developer | any path | ✅ allowed |
| platform_admin | any path | ✅ allowed |

This docs file updates to status F (Frozen) once the dashboard changes land and the matrix passes.

## Related

- PR #136 `security(bsu): Branding — tenant-scope hero paths + gate platform heroes` (commit `03996dfb`)
- Plan: `/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md` Part M.6
- Supabase docs: [Storage RLS foldername helper](https://supabase.com/docs/guides/storage/security/access-control)
