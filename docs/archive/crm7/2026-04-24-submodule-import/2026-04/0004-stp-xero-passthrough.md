# ADR 0004 — STP Xero Passthrough

> **⚠️ Archive copy — not the source of truth.**
> Canonical location (local path): [`crm7/docs/adr/0004-stp-xero-passthrough.md`](../../../../../crm7/docs/adr/0004-stp-xero-passthrough.md)
> Canonical location (GitHub): <https://github.com/GaryOcean428/crm7/blob/development/docs/adr/0004-stp-xero-passthrough.md>
> This file is retained for submodule-import provenance only. Any updates must be made to the canonical copy.
> Cross-reference added per [HF-3 / issue #862](https://github.com/GaryOcean428/bsuite/issues/862) on 2026-05-13.

---

**Status:** Accepted  
**Date:** 2026-07-14  
**Deciders:** GTO Platform Team  
**Ticket:** WS-4.2

---

## Context

Single Touch Payroll (STP) is an Australian Taxation Office (ATO) mandate requiring
employers to report payroll information — wages, tax withheld, and superannuation —
each time employees are paid. STP Phase 2 (effective from 1 January 2022) extends
reporting to include disaggregated income types and new income streams.

CRM7 manages timesheets, pay runs, and payroll records for apprentices and trainees
placed with host employers. CRM7 does **not** have ATO-registered STP software
certification. Xero holds Xero Payroll's STP certification on behalf of its customers.

The question this ADR answers is: **Who generates and lodges STP events — CRM7 or
Xero?**

---

## Decision

**CRM7 delegates all STP event generation and ATO lodgement to Xero.**

CRM7 acts as a data producer. It pushes completed pay run data to Xero via
`xeroPayrollAdapter`. Xero generates the STP-compliant payroll event, signs it, and
lodges it with the ATO through its accredited STP gateway.

CRM7 persists three passthrough fields on each `pay_runs` row to track the outcome
without owning the STP lifecycle:

| Column | Type | Description |
|---|---|---|
| `xero_pay_run_id` | `text` | Xero's internal pay run UUID, returned after a successful push. Used for idempotency on retries. |
| `stp_status` | `text` | Mirrors the STP lodgement status Xero reports: `pending`, `submitted`, `accepted`, `rejected`. |
| `stp_submitted_at` | `timestamptz` | Timestamp when Xero confirmed the STP event was lodged. |

---

## Rationale

### Why not implement STP directly in CRM7?

1. **Certification cost.** Becoming an ATO-certified STP-enabled software provider
   requires annual recertification, conformance testing, and direct ATO gateway
   integration. This is significant engineering and compliance overhead that
   duplicates capability already in Xero.

2. **Maintenance liability.** STP Phase 2 changes, ATO gateway updates, and tax law
   amendments would require CRM7 to track and implement every change independently.
   By delegating to Xero, CRM7 inherits Xero's investment in compliance maintenance.

3. **Single source of truth for payroll.** Employers already use Xero for payroll.
   Requiring STP to originate from a second system would create reconciliation
   complexity and risk duplicate lodgements.

4. **Audit trail simplicity.** ATO audits follow the STP lodgement chain. Xero
   holds the lodgement records. CRM7 stores cross-references (`xero_pay_run_id`).
   This keeps the audit trail in the certified system.

---

## Payday Super Requirement

Under the Australian government's **Payday Super** reform (applying from
1 July 2026), employers must pay superannuation contributions to employees'
nominated funds within **7 business days** of each pay day.

CRM7 should surface this deadline in the pay run UI to remind payroll operators.
This is a UI/notification concern only — the actual super payment flows through
Xero and the super clearing house.

> **Important:** The deadline is **7 business days**, not 3 calendar days.
> Earlier drafts of this ADR incorrectly stated 3 days.

---

## Consequences

### Positive

- CRM7 avoids STP certification overhead.
- Employers get a single reconciled payroll record in Xero.
- STP compliance is maintained by Xero's dedicated compliance team.
- `pay_runs.stp_status` gives CRM7 enough visibility to surface STP state in the UI.

### Negative

- CRM7 cannot independently verify ATO acceptance without polling Xero.
- If Xero's API is unavailable, pay run data cannot be lodged until connectivity
  is restored. Mitigation: exponential backoff with 48-hour retry window.
- CRM7's STP status field (`stp_status`) may lag Xero by one polling cycle.

### Neutral

- `payroll_records` rows are pushed in batches of 50 per `xeroPayrollAdapter` call
  (Xero API limit), matching the invoice adapter pattern established in WS-3.

---

## Implementation Notes

See `src/lib/pipelines/xeroPayrollAdapter.ts` for the batch push implementation.

Key behaviours:
- Idempotency via `xero_pay_run_id`: if a pay run row already has `xero_pay_run_id`
  set, the adapter skips re-submission.
- Rate limit handling: exponential backoff on HTTP 429, up to 5 retries.
- Batch size: 50 `payroll_records` per Xero API call.
- Status mapping: Xero status strings are normalised to CRM7's `stp_status` enum.

---

## Related ADRs

- ADR 0003 — Xero Invoice Batch Adapter (WS-3.3)

---

## References

- [ATO STP Phase 2 employer guide](https://www.ato.gov.au/businesses-and-organisations/super-for-employers/payday-super)
- [Xero STP lodgement docs](https://developer.xero.com/documentation/payroll-api/au/overview)
- [Payday Super reform — Treasury.gov.au](https://treasury.gov.au/consultation/c2023-431837)
