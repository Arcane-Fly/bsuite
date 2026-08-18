# Tenant Switching & Branding Tiers — Operator Runbook

**Status:** W (Working)
**Audience:** Platform operator (Braden), not an agent
**Owning app:** business-suite-unified (BSU) authors branding; all six apps consume it via `@bsuite/theme`'s `BrandingProvider`
**Key source files:** `crm7/src/services/tenantSwitcherService.ts` (client), `crm7/supabase/migrations/20260717090100_log_tenant_switch_grant_and_broaden.sql` (RPC), `business-suite-unified/supabase/migrations/20260703010000_platform_branding_per_app_and_precedence.sql` (branding RPC, current full precedence doctrine)

## Branding tiers

Runtime branding for every D2C app (business-suite-unified, crm7, conduit, R80.4, throughput) resolves through a layered override stack, most-specific tier wins:

| Tier | Table | Scope | Who authors it | Resolved by |
|---|---|---|---|---|
| 3 | `tenant_app_branding` | Per-tenant **and** per-app (composite key `tenant_id, app_slug`) | Tenant admin, per app | **Client-side**: `src/hooks/useBranding.ts`'s `mergeBranding()` (app → tenant → platform, first-non-null wins) |
| 2 | `tenant_branding` | Per-tenant (enterprise/org/sub-org), with `parent_tenant_id` inheritance walk (max depth 5, cycle-guarded) | Tenant admin at `/branding` | The `branding_json_for_tenant()` RPC |
| 1b | `platform_branding` (id = an app slug, e.g. `crm7`) | Developer's per-app default | Platform developer at `/developer/branding` → "Apply to: This app" | **Not yet wired** — see gap below |
| 1a | `platform_branding` (id = `'platform'`) | Developer's global default (the master row) | Platform developer at `/developer/branding` → "Apply to: Platform" | The `branding_json_for_tenant()` RPC |
| — | D2C Neon Electric hard-coded defaults | Fallback | `@bsuite/theme` package | Client, when every field above the fallback is null |

A developer-authored platform default **never** overrides a tenant's own custom brand — the merge is per-field `COALESCE(tenant_value, platform_value)`, so platform values only fill gaps the tenant left null.

**`branding_json_for_tenant()`** is a zero-argument `SECURITY INVOKER` RPC every app's `BrandingProvider` calls with no arguments — it cannot know which app is asking, which is why Tier 1b (the per-app platform default) is authored and stored today but **not yet consumed by any resolver** — it's a known, deliberate, documented gap (see the migration's own `TODO(bsu-branding-app-context)` comment), not a bug. If you set a per-app platform default and don't see it take effect anywhere, this is why — it's staged for a future app-scoped RPC overload, not broken.

There is also a **force-override escape hatch**: if a tenant's ID is listed in `platform_branding.force_override_tenant_ids`, Tier 2 (and once wired, Tier 3) is skipped entirely and that tenant is pinned to the Tier 1a platform master defaults regardless of its own custom branding rows.

**Kill switch:** `VITE_ENABLE_BRANDING_OVERRIDE=false` disables runtime tenant white-labelling entirely and falls every app back to hard-coded D2C defaults. Use this if a branding regression is live and you need every app back to a known-good look immediately while you investigate, rather than trying to reconcile branding rows under pressure.

**Root-level constraint that is never tenant-overridable:** `--role-error` and `--role-destructive` are Electric Purple in the D2C theme. Enterprise white-labelling through `BrandingProvider` can override every other role alias, but not those two — coral/red must never become the semantic error/destructive colour, in any tenant's override. This is enforced by convention in the theme package, not by a DB constraint — if you're reviewing a branding change and see red/coral proposed for error/destructive roles, that's a rejection, not a preference.

**Access:** `platform_branding` itself carries an `INSERT`/`UPDATE` policy gated to `profiles.platform_role IN ('developer', 'platform_admin')` — anyone else attempting to write any row (including a per-app one) is rejected by RLS, not just by the UI. Reads are broader: `authenticated` sees every row via the `platform_branding_select` policy (`USING (true)`, no column restriction — an authenticated caller querying the table directly gets every column, including `force_override_tenant_ids`); `anon` is restricted to the `'platform'` master row by a separate **table** RLS policy, `platform_branding_select_anon` (`USING (id = 'platform')`), not by a view. There is also a `platform_branding_public` view that projects a safe column subset (it omits `force_override_tenant_ids`), but that column exclusion only applies to callers who go through the view by convention (the client's read path per BSU `CLAUDE.md`) — it is not an RLS-enforced boundary, so don't rely on it as one if you're ever reviewing a new caller that queries the base table directly.

## Tenant switching — who can switch, and to what

Enforced inside the `log_tenant_switch(p_from_tenant_id, p_to_tenant_id, p_reason, p_ip_address, p_user_agent)` `SECURITY DEFINER` RPC — the authoritative check, and the RPC re-derives authorization independently rather than trusting the client. The client's `checkSuperAdminStatus()` does more than gate UI visibility, though: `TenantSwitcherService.switchTenant()` calls it first and returns an `Unauthorized` error **without ever calling the RPC** for anyone who isn't a platform developer/admin — so today the client itself also hard-blocks the action, not merely its visibility, for any caller outside that group (see the note on tenant-owner/admin sub-org switching in the checklist below):

- **Platform developer / platform_admin** (or the legacy `profiles.is_super_admin = true` flag) → switch to **any** tenant.
- **Tenant owner or admin** (`user_tenants.role IN ('owner', 'admin')`) → switch to a tenant they own/administer, **or** to any tenant whose `parent_tenant_id` points at a tenant they own/administer (i.e. their own sub-organisations).
- Everyone else → `RAISE EXCEPTION 'Unauthorized...'`.

Every successful switch (regardless of who performed it) writes one row to `tenant_switch_audit` (`user_id, from_tenant_id, to_tenant_id, switch_reason, ip_address, user_agent, switched_at`) **before** updating `profiles.current_tenant_id` — this is the client-transparency guarantee: a client org admin can see every time a platform developer switched into their tenant, via `TenantSwitcherService.getTenantSwitchAudit()` (`SELECT * FROM tenant_switch_audit ORDER BY switched_at DESC`).

**Known, deliberate gap:** `ip_address` is always recorded as `null`. A browser cannot see its own public IP without calling a third-party echo service, and the app's CSP correctly blocks exactly that kind of call (a real incident — every switch used to log a CSP violation trying to reach `api.ipify.org`). The audit row still fully captures who switched, from/to which tenant, when, and the user-agent string; only the IP column is intentionally left blank. If a real client IP is ever required for the audit trail, it has to be captured server-side (an edge function reading the `x-forwarded-for` header), not by widening the CSP to an external IP-echo host.

There is a second, broader audit surface for transparency: `super_admin_action_audit`, logged via `log_super_admin_action()` for arbitrary actions a platform developer takes while impersonating a tenant (not just the switch itself) — queried via `TenantSwitcherService.getSuperAdminActionAudit(tenantId?)`.

## Operator checklist — verifying a tenant switch or branding change is behaving

1. **Branding not showing up for a tenant** → check which tier the value was set at (`/developer/branding` = Tier 1, `/branding` = Tier 2, per-app override = Tier 3) and confirm a *higher*-precedence tier isn't already set for that field on that tenant (Tier 2 always wins over Tier 1 per field; Tier 3 wins client-side over both). Confirm the tenant isn't in `force_override_tenant_ids` — that skips Tier 2 entirely.
2. **A sub-org isn't inheriting its parent's branding** → confirm `tenants.parent_tenant_id` is actually set for the sub-org, and that the parent tenant's `tenant_branding` row has at least one non-null identity field (a completely empty `tenant_branding` row for the parent is treated as "no branding here," and the walk continues up the chain rather than stopping).
3. **Someone reports an unexpected tenant switch** → query `tenant_switch_audit` for that `user_id`/tenant pair; it will show exactly who switched, when, and the reason string passed by the client (default `'Manual tenant switch'`).
4. **Verifying an authorization boundary** (e.g. "can this org admin switch into a tenant that isn't their sub-org?") → test against the live RPC directly (or via Supabase MCP `execute_sql` as a read/verify step, never as the way to bypass the RLS/RPC check) rather than trusting the client UI. **Note:** crm7's `TenantSwitcherService.switchTenant()` currently hard-refuses any caller that isn't a platform developer/admin (`checkSuperAdminStatus()`) **before it ever calls the RPC** — it returns `Unauthorized: Super admin access required` client-side, not just a hidden button. So the owner/admin → sub-org switching path documented above is real and enforced at the RPC (live-verified), but it is not reachable through the crm7 switcher UI today — test it directly against the RPC, not by trying to drive it from the product.

## Related

- Root `CLAUDE.md` "Theme System" section — D2C Neon Electric role tokens, the five-tier anti-glare text scale, brand baselines for braden vs D2C apps
- `crm7/CLAUDE.md` "Theme & Colour Tokens" — token mapping, `@bsuite/theme` import pattern
- `business-suite-unified/CLAUDE.md` "Known Security Risks (Phase 4)" — SEC-002/003/004 tracked branding hardening items (CSS injection via `font_stack`/`logo_url`, no TTL on the localStorage branding cache) — still open at time of writing, check current state before assuming resolved
