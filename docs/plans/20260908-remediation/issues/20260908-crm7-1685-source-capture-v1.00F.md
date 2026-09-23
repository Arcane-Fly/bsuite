---
kind: record
authority: none
owner: bsuite
---

# Training-plan units are associated to the apprentice instead of the training contract — DRY one-shot violation

https://github.com/GaryOcean428/crm7/issues/1685

Snapshot updatedAt: 2026-08-26T12:21:44Z. Open at capture; re-read live.

Operator observed: Training-plan units appear associated to the apprentice — cross-cutting, and the DRY one-shot policy also applies.

**Route/surface:** training-plan / units-of-competency association (surfaces: training-plan record, apprentice profile)

Directive: D-80 (2026-08-13)

> D-62: "Fix the class, not the page."

This affects at least 2 surfaces: the training-plan record and the apprentice profile page (units render/associate on both). The fix must correct the underlying entity association (units belong to the training contract / qualification, not the person), not just hide the symptom on one page.

## Related-but-distinct existing issues (not duplicates)
crm7#1569 (UX duplication of units, doesn't pull from TGA), crm7#662 (feature: assign units to training periods + competency-based progression), crm7#1385 (training catalogue RTO scope) all touch "units of competency" but none addresses this specific defect: units are wired to the apprentice (a person) as the owning entity, when the correct DRY owner is the training contract / qualification record. This is a data-model/entity-ownership defect, not a UX-duplication, feature-scope, or catalogue-scope issue.

## Acceptance criteria
- Units of competency are associated to the training contract / qualification entity, not directly to the apprentice person record.
- Anywhere units currently render "off" the apprentice record is updated to read through the training-contract/qualification association instead.
- No mirror/duplicate unit-association table is introduced — one owning relationship, read everywhere else.

## Mandatory before merge
- **Validation loop:** §9.1 output-equivalence — unit data displayed via the apprentice profile and via the training-plan record must resolve from the same underlying association, not two separate reads.
- **Equivalence target:** Matches the DRY one-shot architecture doctrine (`docs/20260227-dry-one-shot-architecture-v1.02A.md`) — one owning entity for units-of-competency association, read (not duplicated) everywhere else.
- **Cross red-team:** bsuite-platform
- **Skills to load:** general-dry-one-shot-architecture, check-dry-one-shot, biz-au-apprenticeship

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
