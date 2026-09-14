---
kind: record
authority: none
owner: bsuite
---

# "Create a claim" is misleading when the claim actually lives on CTF's portal — only federal claims connect via ADMS

https://github.com/GaryOcean428/crm7/issues/1690

Snapshot updatedAt: 2026-08-26T12:22:09Z. Open at capture; re-read live.

Operator observed: How does the system "create a claim" when the claim actually lives on CTF's (Construction Training Fund's) portal? Only federal claims have a direct system connection, via ADMS (Australian Apprenticeship Data Management System). A "create claim" action that implies the claim is submitted end-to-end through crm7 is misleading for any state/CTF-administered funding source.

**Route/surface:** funding / claims creation flow (wherever "create a claim" is offered)

Directive: D-80 (2026-08-13)

## Acceptance criteria
- The "create a claim" action is scoped correctly per funding source: for federal ADMS-connected claims, it can genuinely submit/track via the ADMS connection; for CTF or other portal-administered funding, the UI is explicit that this only prepares/records the claim locally and does not submit it — the operator still has to lodge it on CTF's own portal.
- No UI copy implies a direct system-to-system submission exists where it does not.
- The distinction between "federal (ADMS-connected)" and "state/CTF (portal-only)" claim types is visible to the user making the claim.

## Mandatory before merge
- **Validation loop:** §9.2 visual-equivalence — the UI copy/flow must correctly represent which claim types are truly connected vs. portal-only.
- **Equivalence target:** UI framing matches the real integration boundary: ADMS = federal apprenticeship data connection; CTF and equivalent state funds = no direct submission, portal-only.
- **Cross red-team:** bsuite-user-advocate
- **Skills to load:** biz-au-apprenticeship, reference: `reference_adms_is_linked_not_registered_by_the_gto`

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
