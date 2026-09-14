---
kind: record
authority: none
owner: bsuite
---

# Grace invites missing email/notice, end-date warning, Xero invoice, per-subscription seat pricing, and subscription-type selection

https://github.com/GaryOcean428/business-suite-unified/issues/707

Snapshot updatedAt: 2026-08-24T03:29:03Z. Open at capture; re-read live.

The operator reported that grace invites are missing several pieces of the intended workflow: no email and in-app notice through the notices system when a grace invite is issued, no end-date warning to the grace user before their grace period expires, no auto-generated Xero invoice for the grace seat, no admin-facing place to set the price of additional seats per subscription type, and no subscription-type selection at grace signup itself.

**Route/surface:** Grace invite / licence grace-seat flow (enterprise admin + grace-user signup, business-suite-unified); Xero invoicing integration

Directive: D-80 (2026-08-13)

Related security context, not duplicates: #620 and #617 cover server-side enforcement of seat-cap bypass — a different problem (enforcing the seat LIMIT), not the invite/notification/billing UX this item describes.

## Acceptance criteria
- Issuing a grace invite sends an email to the invited user AND creates an in-app notice via the notices system
- The grace user receives a warning notice ahead of their grace end-date, before it expires
- An Xero invoice is auto-generated when a grace seat is granted or converted
- An admin-facing settings surface exists to set the price of additional seats per subscription type
- The grace signup flow presents subscription-type selection to the invited user before completing signup

## Mandatory before merge
- **Validation loop:** §9.2 visual-equivalence — this is a net-new multi-step UX flow (invite → notice → signup → invoice), so the target is a working flow captured end-to-end in screenshots, not a prior baseline
- **Equivalence target:** screenshots of the invite email, in-app notice, end-date warning, subscription-type selector, seat-pricing admin screen, and the generated Xero invoice
- **Cross red-team:** bsuite-platform
- **Skills to load:** biz-xero-integration, biz-xero-accounting, supabase:supabase, web-forms-validation

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
