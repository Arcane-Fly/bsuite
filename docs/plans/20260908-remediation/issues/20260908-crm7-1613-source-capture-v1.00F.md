---
kind: record
authority: none
owner: bsuite
---

# [P2][domain] Pay-rate hierarchy incomplete: School-Based apprentices missing from codebase

https://github.com/GaryOcean428/crm7/issues/1613

Snapshot updatedAt: 2026-08-26T12:21:59Z. Open at capture; re-read live.

## Issue

The Australian apprenticeship system distinguishes between **Standard** and **School-Based** (SAE — school-based apprenticeships and traineeships) apprentices. The crm7 pay-rate hierarchy **does not model School-Based apprentices at all**. The "Standard" label is overloaded to mean both forms, making it impossible to correctly configure rates for SAE cohorts.

## Impact

- Incorrect rate calculations for school-based apprentices
- No way to differentiate SAE rules (e.g., minimum earnings, superannuation treatment) from Standard rules
- Potentially non-compliant with Fair Work obligations

## Evidence

- **Register**: operator-ux-bug-register-v1.00W.md §P1, item #9b (§113)
- **Verification**: 2026-07-28 — identified as missing domain model
- **Status**: Not just a label issue; missing feature in pay-rate hierarchy

## Suggested fix direction

1. Add School-Based as a distinct apprenticeship_type in the data model
2. Update pay-rate configuration to branch rules by type
3. Update UI to display and allow configuration of School-Based rules separately
4. Verify against Fair Work Pay Guide and PACT for any SAE-specific adjustments

## Related

- Related to R80.3 wage calculation, which may need per-type overrides
- Compliance gap: AUS apprenticeship law distinguishes these cohorts; codebase does not

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: Wage calculation for Standard vs School-Based apprentice at same rate → should differ per Fair Work rules
- **Cross red-team**: copilot verifies domain model against Fair Work Pay Guide §2 School-Based treatment
- **Skills to load**: biz-au-award-modelling, web-forms-validation, architecture
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
