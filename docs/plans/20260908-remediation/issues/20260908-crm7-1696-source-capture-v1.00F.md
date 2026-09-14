---
kind: record
authority: none
owner: bsuite
---

# Training-provider records leave TGA-available fields empty; qualification scope (what the RTO delivers) is missing entirely

https://github.com/GaryOcean428/crm7/issues/1696

Snapshot updatedAt: 2026-09-06T09:16:09Z. Open at capture; re-read live.

Operator observed: Training-provider records leave TGA-available fields empty. Qualification scope — what the RTO actually delivers — is missing entirely.

**Route/surface:** training-provider records

Directive: D-80 (2026-08-13)

## Acceptance criteria
- Training-provider records populate the fields that TGA (training.gov.au) actually publishes for that provider, rather than leaving them empty.
- A qualification-scope field/section exists on the training-provider record, listing what the RTO is actually registered to deliver (not just its name/ABN).
- Where TGA does not supply a field, the record clearly distinguishes "not available from TGA" from "not yet entered".

## Mandatory before merge
- **Validation loop:** §9.1 output-equivalence — populated fields must match what TGA's public data actually publishes for that provider (not fabricated or guessed).
- **Equivalence target:** Training-provider record fields match the current TGA record for that RTO, including its qualification scope.
- **Cross red-team:** bsuite-user-advocate
- **Skills to load:** biz-au-apprenticeship

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
