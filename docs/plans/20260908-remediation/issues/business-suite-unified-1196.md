# [P1][billing] Invoiced enterprise tenants read as Stripe customers: subscription check must never key on userId, Billing CTA must say 'Billed by invoice', and a Xero-paid invoice has no column to land on

https://github.com/GaryOcean428/business-suite-unified/issues/1196

Snapshot updatedAt: 2026-09-08T00:52:40Z. Open at capture; re-read live.

## Why (operator, 2026-09-08 — FutureBuild / Caris meeting)
FutureBuild is a paying enterprise client on an annual Xero invoice, not Stripe. Live `subscriptions` (6 rows): `user_id` NULL 6/6, `stripe_customer_id` NULL 6/6, `stripe_subscription_id` NULL 6/6, **zero `xero_*` columns**. Licences are keyed by `tenant_id`. The owner signs in and the product still talks to her as a Stripe customer.

Measured 2026-09-08 (takeover lane; no writes, no role flips; structural twin `e2e@crm7.app` + grok code walk of `origin/development`):

| Gate | File | Behaviour on her rows |
|---|---|---|
| Subscription check falls back to `tenant_id = userId` | `src/contexts/AuthContext.tsx:279` (also `325-332`, `361-362`) | fires only when the `user_tenants` read is empty/errors; on a single active membership it does not fire — but the design is wrong: a per-user fallback can never match a tenant-keyed licence, so any transient error turns an enterprise owner into `free` |
| Header chip initialises `free` | `AuthContext.tsx:141` → `Header.tsx:272` | sub-second Free flash before the first subscription read |
| Billing CTA | `src/pages/Billing.tsx:439` `isActive \|\| stripeCustomerId ? 'Manage in Stripe' : 'Choose a Plan'`; `:210-215` | entitled + NULL `stripe_customer_id` → label "Manage in Stripe", click scrolls to plans + toasts "Choose a plan below". No invoice branch exists (`:403`, `:758`) |
| Itemised charges copy | `Billing.tsx` "held by Stripe… open the customer portal" | false for every invoiced tenant |

## Ship (feat → development, after the meeting — not a hotfix)
1. **Never use `userId` as `tenant_id` for a subscription check.** On unresolved tenant: `isActive=false` with `tier='unresolved'` (or keep the last known), never a user-keyed query. Remove lines 279/325-332/361-362 fallbacks.
2. **Billing source on the licence row.** Add `subscriptions.billing_source text not null default 'stripe' check (billing_source in ('stripe','invoice'))` and `xero_invoice_id text null` (or a `licence_ledger` table if a row must carry many invoices). Seeded/manual enterprise rows get `billing_source='invoice'`.
3. **CTA + copy:** `billing_source='invoice'` → "Billed by invoice" (renewal date, seats, contact), never the Stripe portal or plan grid.
4. **Xero ACCINV paid → keep `status='active'`** for that customer tenant without requiring `stripe_customer_id` — the crm7 side (round-trip via `collection-policy.ts`, platform Xero resolver) is crm7#<see linked issue>.
5. Do **not** write a user id into `subscriptions.user_id` — the licence is the org's, not one person's. Do not flip `platform_role`/`is_super_admin` (see #727).

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.2 visual on `d.suite.crm7.app` signed in as the e2e twin (`e2e@crm7.app`, same row shape) — chip Enterprise with no Free flash; `/billing` shows "Billed by invoice", no Stripe CTA; plus §9.1 unit test on `useSubscription`/`AuthContext` with an erroring `user_tenants` read → never queries `tenant_id=<user id>`.
- **Equivalence target**: live `d.suite` after merge + test output.
- **Cross red-team**: takeover lane (claude-code) verifies evidence rows.
- **Skills to load**: `biz-stripe`, `biz-xero-integration`, `bsuite-production-debugging`, `bsuite-supabase-migrations`, `bsuite-rls-authz-red-team`, `test-systematic-debugging`
- **Self-report on divergence**: yes
