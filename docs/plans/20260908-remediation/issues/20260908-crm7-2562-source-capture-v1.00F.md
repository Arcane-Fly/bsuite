---
kind: record
authority: none
owner: bsuite
---

# [P1][billing] Platform Xero resolver looks up tenant slug=platform (no connection) — the operator's Xero landed on braden-group; ACCINV-paid cannot close the licence loop

https://github.com/GaryOcean428/crm7/issues/2562

Snapshot updatedAt: 2026-09-08T00:52:39Z. Open at capture; re-read live.

## Why (operator, 2026-09-08)
Enterprise **service** invoices (how tenants pay us) live in **platform** Xero; tenant Xero connections are how a tenant bills its own hosts. Live `xero_connections` (active): `platform` → **none**; `braden-group` (enterprise) → yes (where the operator's connect landed); `futurebuild-academy` → yes (**their** Xero — never use it for how they pay us).

`supabase/functions/_shared/xero-platform-lane.ts:125` `getPlatformXeroAccessToken` resolves the platform tenant and finds no connection, so `src/lib/collection-policy.ts` (Stripe event → platform ledger → Xero payment, keyed by payment intent) has no platform Xero to write to, and the reverse (Xero ACCINV paid → licence stays active) has no column to stamp — `subscriptions` has zero `xero_*` columns (BSU side: GaryOcean428/business-suite-unified#1196).

## Ship (feat → development, after the meeting)
1. Platform Xero resolver: use the connection already on `braden-group` **or** require the operator to connect Xero while the **platform** tenant is selected — a deliberate, documented choice; never fall through to a customer tenant's connection.
2. Round-trip: Xero `ACCINV` paid for a customer tenant → `subscriptions.status='active'` + `xero_invoice_id` for that `tenant_id`, without `stripe_customer_id`. Keyed by tenant, never by user.
3. Test: `_shared/__tests__/xero-platform-lane.test.ts` covers the chosen resolution + a customer-tenant connection is refused.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 — resolver unit test + a dry-run against live `xero_connections` (read-only) naming the tenant it picks.
- **Equivalence target**: resolver returns the platform-designated connection; FutureBuild's connection is never selected.
- **Cross red-team**: takeover lane (claude-code).
- **Skills to load**: `biz-xero-integration`, `biz-stripe`, `bsuite-edge-functions`, `bsuite-rls-authz-red-team`
- **Self-report on divergence**: yes
