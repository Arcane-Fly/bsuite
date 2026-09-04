---
kind: plan
authority: operator
owner: bsuite
evidence:
  - .github/workflows/app-quality-checks.yml
  - scripts/check-exported-not-mounted.mjs
  - crm7/api/ai/chat.ts
  - crm7/src/lib/ai/automation-level.ts
  - crm7/src/lib/ai/query-quota.ts
  - crm7/supabase/migrations/20261118000000_ai_quotas_and_query_usage.sql
---

# Jodie automation levels, query overages, and email notices

**Date:** 2026-09-03 | **Version:** 1.00W | **Status:** Working (operator-approved)

**Approved:** 2026-09-03 — “sounds good. go.”

> **Still the plan as of 2026-09-04.** The dial, the query meter and the notices are built to
> this design; the automation levels it defines are the contract crm7#2396 implements and
> crm7#2399 fails closed against. Task 4b of the 2026-09-04 scoping plan will change the
> no-row DEFAULT from the licence ceiling to `suggest`, which is a change to this document's
> defaults rather than to its shape.

Companion: [`20260903-jodie-automation-notifications-implementation-v1.00W.md`](./20260903-jodie-automation-notifications-implementation-v1.00W.md).

SMS billing this copies: [`2026-08-28-messaging-platform-design.md`](./2026-08-28-messaging-platform-design.md) and `docs/20260828-messaging-platform-design-v1.00W.md`.

---

## Purpose

AI-subscribed tenants can set **one tenant-wide Jodie automation level**. Usage is metered in **queries**, with the AI addon’s included volume, then **overages at a slight platform markup**, with a cap, on the same machinery as SMS. Inbound mail can be **raised into the Notifications manager** from the reading pane, and by Jodie/rules when the dial allows it.

## Locked decisions

| Topic | Decision |
|---|---|
| Reading pane | HTML mail fills the pane; the pane, not the iframe, is the scroller |
| Who may use Jodie | `hasAiAccess` (addon or professional/enterprise/developer tier) |
| Dial | **Per tenant.** Not per mailbox, not per user |
| Meter | **Jodie queries** — Essentials 100 / Professional 500 / Enterprise unlimited |
| Overages | Included, then overage, with `overage_cap_cents`. Enable inline on `NO_QUOTA` (D8) |
| Markup | **1500 bps (15%)** on actual gateway cost, **overage queries only**. Platform-owned. Never from the request body |
| Margin | `charged_cents − cost_cents` visible only behind `is_platform_developer()` |
| Vercel credits | **`cost_cents` is paid as Vercel AI Gateway credits** so the query can actually run. The 15% markup is **not** sent to Vercel. Purchases are whole US dollars; remainder stays in `ai_quotas.vercel_credit_pending_cents` |
| Raise a notice | Reading-pane action (no AI required) **and** Jodie/rules at Raise-and-notify or Auto-act |
| Notice table | `public.notifications` (what `/notifications` reads). Not `app_notifications` |
| Deep link | `/communications?message=<id>` opens that mail in the reading pane |

## Automation levels

| Level | Jodie may |
|---|---|
| `off` | Answer. No state-changing tools |
| `suggest` | Propose; a person clicks |
| `draft` | Write replies, workflow drafts, queued notices. Does not send |
| `raise_and_notify` | Raise notifications, assign, file. Does not send mail or money |
| `auto_act` | Send and run workflows, still inside query + overage caps |

**Addon ceiling** (tenant may set down, never up):

| Licence | Ceiling |
|---|---|
| none | `off` |
| `ai_essentials` | `draft` |
| `ai_professional` or plan `professional` | `raise_and_notify` |
| `ai_enterprise` or plan `enterprise` / `developer` | `auto_act` |

Workflows honour the same ceiling. A send node cannot fire on `draft`.

## Billing shape

Do **not** reuse `message_quotas` (SMS unit). Sibling tables:

- `ai_quotas` — one row per tenant. `included_monthly`, `overage_cap_cents` (null = uncapped, 0 = overages off), `markup_bps` (server default 1500; client cannot set it), `automation_level`, `is_active`.
- `ai_query_usage` — one row per query. `cost_cents` (gateway), `charged_cents` (0 if included, else cost + 15%), `model`, `user_id`.

`ai_usage_metrics` stays the period-estimate rollup it already is. It is not the ledger.

Enable overages sets `overage_cap_cents` from 0 to a default ($50 = 5000 cents) unless the tenant picks another cap. Same “a mistake cannot run away” idea as SMS.

`NO_QUOTA` / `OVERAGE_CAP` return **402** with an inline Enable-overages control. Do not bounce to Settings.

**Vercel AI Gateway credits.** Jodie already runs through the gateway (OIDC / `AI_GATEWAY_API_KEY`). Vercel bills at provider list with **zero gateway markup**. Our 15% is BSuite’s, not Vercel’s. On every overage query:

1. Tenant is charged `applyMarkup(cost_cents)` (`charged_cents`).
2. `cost_cents` is accrued as `vercel_credit_pending_cents` on `ai_quotas`.
3. When pending ≥ $1, buy **whole dollars** of `creditType: gateway` (Vercel `buy_credits`). Remainder stays pending.
4. The markup never enters that purchase. Sending Vercel the marked-up amount would buy more gateway credit than the query cost, and we would lose the margin.

Included queries’ gateway cost is covered by the AI addon, not by this top-up.

Invoicing of tenant overage follows `message-billing-run`: **not armed** until the operator arms SMS billing. Record the ledger now. Vercel credit top-up is a **separate** settlement, because the gateway will 402 if the team’s credit is empty — a ledger row does not run the model.

## Email notices

`notifications` row:

- `type`: `info`
- `priority`: `medium` (Jodie may set `high` when triaging as urgent)
- `entity_type`: `email_message`
- `entity_id`: the mail id
- `action_url`: `/communications?message=<id>`

Clicking the row marks it read and opens that URL (already the manager’s `onRowClick`).

## Two Xeros (do not mix)

| Whose Xero | What it bills | Table / path |
|---|---|---|
| **Platform Xero** (the operator) | Tenants paying *us* for BSuite | `tenants.tier = 'platform'` connection in `xero-platform-connection.ts` |
| **Tenant Xero** (FutureBuild, etc.) | That GTO billing *its* hosts | `xero_connections` for that `tenant_id`; `xero-invoice-submit` |

A payment, invoice, or Stripe customer on the tenant path must never settle a platform bill, and the reverse. Same Stripe *account* for platform charges; tenant Stripe (if they connect one) is theirs.

Operator lock (2026-09-03): "platform xero for me, and their own billing integration" — not to be confused with a tenant's own Xero and the billing they run to their clients while using the platform as intended. Settings → Integrations "Your Xero" is that tenant integration. `xero_invoice` as a platform payment method is operator Xero.

**Payment methods are unified.** Card, PayPal, bank transfer, Xero invoice, and direct debit are offered to every plan — not an enterprise-only invoice path. Collection path (immediate cutoff vs 21-day Xero grace) follows the *method*, not the plan.

## Collection, Stripe, Xero

One Stripe account (`STRIPE_SECRET_KEY` in local `.env.local` — same keys the platform and the operator Xero-Stripe path use). Keys are local; this doc does not repeat them.

| Charge | Where it is collected | Cutoff if unpaid |
|---|---|---|
| CRM service, enterprise (FutureBuild) | Xero ACCINV on the operator org; still requires a card/payment method at signup | **21 days after due.** Warn owners from due. Check Xero payments on the related invoice (and the company account) before cutting off |
| CRM service, non-enterprise | In-app Stripe | **Immediate** at due |
| AI overages | In-app Stripe (never the Xero service invoice) | Immediate at failed payment |
| SMS overages | In-app Stripe (never the Xero service invoice) | Immediate at failed payment |

**Round trip (no double count).** Stripe `payment_intent` is the identity. Platform webhook applies it once to the tenant ledger. If the charge is a Xero-collected service invoice, the same intent is posted as a Xero Payment on that invoice (`accounting.payments`, idempotency key = intent id). If Xero already recorded the payment (bank feed / Stripe-in-Xero), `paymentAlreadyApplied` skips the second apply. Bank-reconciliation rule: do not treat the Stripe payout statement line and the invoice payment as two receipts.

Owner warnings for late Xero bills go to the platform operators, not the tenant’s Xero.

## Out of scope

- Per-mailbox or per-user dials
- A second meter (tokens / actions-only)
- Merging `notifications` and `app_notifications`
- Arming `message-billing-run`
- Changing AI Gateway list prices (the “no markup on token costs” comment is us vs the provider)

## Surfaces (class, not page)

| Surface | Role |
|---|---|
| `EmailBody` | The only HTML-mail renderer (reading pane + EntityCorrespondence) |
| `/communications` reading pane | Raise notice; full-height body |
| `/notifications` | Lists raised mail |
| Settings → Configuration → Notifications | Tenant dial + overage cap |
| Jodie chat (`api/ai/chat.ts`) | Entitlement, query quota, tool ceiling |
| `/workflows` | Honour the same ceiling |
