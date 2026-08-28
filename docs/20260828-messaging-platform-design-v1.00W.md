# Messaging Platform — Design

**Status:** W (working draft) · **Date:** 2026-08-28 · **Operator:** Braden
**Scope:** CRM7 + business-suite-unified · **Supersedes:** the USB-modem gateway spec (withdrawn)

---

## 1. Decision

Send SMS through **Mobile Message**, behind a provider adapter, on **dedicated numbers
segregated by purpose**. Meter per tenant and per user against the provider's own returned
cost. Bill at **7c prepaid / 6c recurring**.

The operator's own figures set the scale: **250 apprentices, $2,500–$4,500/month at ~30c
per message** through a platform-locked provider. That is **8,000–15,000 messages/month**
for one GTO. At Mobile Message's 3c tier the same traffic costs **$360**. Charged at 6c it
bills **$720**. The client's spend drops by roughly **$2,900/month** and BSuite keeps
**$360**.

### Withdrawn

| Option | Reason |
|---|---|
| USB modem gateway (Gammu) | Caps near 4,300 messages/month. Below one client's floor. |
| Android per-user gateway | Same ceiling. |
| Telstra Messaging API | Flat 6c, no volume relief. 4× the cost at 50,000/month. |
| Optus API Connect | Vonage white-label. No published rates at any volume. |

---

## 2. Number taxonomy

Segregation happens at the **number**, not at a per-message flag. This is what makes
overriding an unsubscribe legitimate for operational traffic rather than a dodge.

| Number | Provisioning | Purpose | STOP | ACMA | Hours |
|---|---|---|---|---|---|
| **Core business** | Automatic on activation, free | Timesheets, welfare, safety, payroll | Not offered | Not required | Quiet hours + logged override |
| **Additional dedicated** | On request, fee | Per division or purpose | Per purpose | Not required | Per purpose |
| **Own mobile** | Client supplies | Field officer, manager | n/a | Not required | Personal |
| **Custom sender ID** | Deferred — see §9 | Marketing only | **Honoured** | **Required** | Marketing hours |

Dedicated numbers are free and exempt from the ACMA register. Only alphanumeric sender IDs
require registration, and unregistered ones fall back to a number rather than failing.

`GET /v1/inbound` returns opt-out replies scoped to dedicated numbers, so a STOP on a
marketing number never silences a timesheet notice.

---

## 3. Right to disconnect

The Fair Work Act amendment (Closing Loopholes No. 2, 2024) **does not prohibit contacting
employees outside their hours**. It protects an employee's refusal to respond. A hard block
would be wrong — it would stop a legitimate welfare check.

The reasonableness test weighs the reason for contact, its disruption, the employee's role
and their circumstances. Modern awards now carry their own right-to-disconnect clauses, so
the rule can vary per award.

### Contactable window — resolved, never entered twice

CRM7 already holds this data. Resolution order, most specific first:

1. `timesheets.start_time` / `finish_time` — the person's own worked pattern
2. `pay_item_rules.shift_start_time` / `shift_end_time` — the award's shift window
3. Tenant default
4. Manual override on the person

A new client gets sensible quiet hours on day one without configuring anything.

### Interrupt tiers

| Tier | Behaviour | Example |
|---|---|---|
| `deferred` | Auto-schedules to the next contactable window via `scheduled_for` | Training reminder, event invite |
| `interrupt` | Sends now, **records the reason** | "Timesheet not submitted — you're at risk of not being paid" |
| `emergency` | Sends now, no hours check | Site safety, welfare escalation |

The recorded reason is not bureaucracy. It is the evidence the reasonableness test asks for.

---

## 4. Identity — three fields, not one

| Field | Meaning |
|---|---|
| **Author** | Who composed it. A GTO admin manager, not necessarily the responder. |
| **From** | Which dedicated number it leaves on. |
| **Reply-to** | Where responses route: the author, a nominated field officer, or **both**. |

Selected from dropdowns matching the existing entity-selector pattern. Every message threads
onto the CRM7 record it concerns — person, placement, host, client, payroll — using the
`communications` entity-link pattern already in place.

---

## 5. Data model

| Table | Purpose |
|---|---|
| `message_quotas` | Per tenant. Plan type, included volume, balance, overage cap, auto-topup, alert thresholds. |
| `message_usage` | Per message. `tenant_id`, `user_id`, `charged_cents`, **`cost_cents`**, `custom_ref`, status, interrupt tier and reason. |
| `message_consent` | Per contact per category. Captured at portal registration. Revocable only for optional categories. |
| `message_categories` | `essential` (timesheet, payroll, safety) vs `optional` (events, marketing). |
| `message_numbers` | Per tenant. Number, type, purpose, provisioning state. |

**Cost is actual, not estimated.** Mobile Message returns `cost` per message and
`total_cost` per batch. `ai_usage_metrics` records `estimated_cost_cents`; this does better,
so margin reconciles against the provider invoice rather than a local count.

`custom_ref` carries `tenant:user:entity` in the provider's own tracking field.

---

## 6. Billing

Two models, chosen per tenant:

- **Prepaid** — 7c. Balance, top-ups, enable/disable auto-topup, overage cap, threshold alerts.
- **Recurring** — 6c. Monthly allowance plus overage.

A send with no quota returns a structured `NO_QUOTA` result. The compose surface offers plan
selection **inline**. It does not bounce the user to a settings page — that is the round-trip
failure D8 exists to catch.

`message_usage` aggregates per period into `invoice_line_items` for Xero recurring invoices
(enterprise, invoice-billed) and Stripe invoice items (direct subscriptions). Both already exist.

**Margin (`charged_cents − cost_cents`) is visible only behind `is_platform_developer()`.**
Owners and delegates see volume and spend. Nobody else sees margin.

---

## 7. Reach — the 46 surfaces

**Method:** `grep -rlE 'selectedRows|selectedIds|rowSelection'` over `crm7/src/pages`.

- **46** pages carry row selection
- **5** offer any bulk action
- **0** can send email or SMS

The fix is **one `<BulkMessageAction>` component and a hook**, adopted per surface — not 46
bespoke implementations. Phase 1 covers the operator's named cases: apprentices, hosts,
timesheets.

---

## 8. Costs

| Item | Cost |
|---|---|
| Dedicated numbers | $0 |
| Scheduled sends | $0 — native `scheduled_for`, no cron or worker |
| Edge invocations, DB growth | ~$0 within existing plans (~48 MB/month at 20 clients) |
| Xero API | $0 |
| Stripe | 1.75% + 30c, card subscriptions only |

Retention is the real cost: seven years of compliance evidence is roughly **4 GB**. Design
the archive now.

---

## 9. Deferred

| Item | Reason |
|---|---|
| **ACMA sender ID registration** | Operator ruling 2026-08-28 — ship working first. Only affects alphanumeric marketing IDs; every operational number is exempt. `POST /v1/acma-registration` returns 403 on test accounts and lodges with the real register, so it cannot be exercised safely in development and ships behind manual confirmation. |
| ACMA fee | Sources conflict: $25 + $1/month (CompleteSMS) vs no fee (Textmagic, GoFax). Confirm with Mobile Message before quoting a client. |

---

## 10. Build order

| Phase | Delivers | Why this order |
|---|---|---|
| **1a** | Adapter, transport routing, config, send path, usage with actual cost | Ends the "writes `queued`, sends nothing" defect |
| **1b** | Contactable window, interrupt tiers, consent at portal registration | Safe before it is wide |
| **1c** | Quota, inline plan selection, developer margin view | Billable before it is broad |
| **1d** | `<BulkMessageAction>`, inbound webhook, record attachment | Reach last, once each send is safe and metered |

---

## 11. Verification

Bound by the estate gates. D1–D7 via `agent-definition-of-done`; **D8 applies to every phase**
— each adds a surface a person touches.

Specific D8 obligations:

- Every control acts. No repeat of the compose screen writing `queued` and sending nothing.
- Inline plan selection, inline number provisioning, inline consent capture. **No round trip.**
- Sibling count is 46, method stated in §7, taken from the index rather than re-derived.
- `dod_status` written back to `docs/00-roadmap/bsuite-feature-index.json` with evidence.

**Branch discipline:** feature branches off `development`, merged back to `development`,
promoted to `main` by PR. Never direct to production.
