---
kind: record
authority: none
owner: bsuite
---

# No mechanism to continuously validate funding as priorities and sources change over time

https://github.com/GaryOcean428/crm7/issues/1693

Snapshot updatedAt: 2026-08-26T12:22:07Z. Open at capture; re-read live.

Operator observed: How is funding continuously validated as priorities and sources change over time?

**Route/surface:** funding record lifecycle (ongoing validation, not just entry)

Directive: D-80 (2026-08-13)

## Acceptance criteria
- Funding records have a defined revalidation mechanism (scheduled check, or triggered by a known event) rather than being entered once and left static as external priorities/sources change.
- The system surfaces when a funding record may be stale relative to current scheme rules (cross-reference: federal funding is date-effective and grandfathering splits schemes — see `reference_federal_funding_is_date_effective_never_hardcode`).
- There is a visible owner/workflow for acting on a flagged-stale funding record (not just a silent flag nobody sees).

## Mandatory before merge
- **Validation loop:** §9.1 output-equivalence — a funding record's validity state must reflect the current scheme rules at time of check, not the rules in force when it was entered.
- **Equivalence target:** A funding record's displayed validity state matches what the current (date-effective) funding scheme rules say about that record, re-derived rather than cached indefinitely.
- **Cross red-team:** bsuite-user-advocate
- **Skills to load:** biz-au-apprenticeship, general-dry-one-shot-architecture

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
