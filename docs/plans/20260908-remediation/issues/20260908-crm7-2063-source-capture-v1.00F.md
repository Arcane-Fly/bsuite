---
kind: record
authority: none
owner: bsuite
---

# [P1][caseload] Complete shared assignments and bulk transfer/add/remove through one canonical assignment model

https://github.com/GaryOcean428/crm7/issues/2063

Snapshot updatedAt: 2026-09-08T05:23:18Z. Open at capture; re-read live.

Any subscribed user of a tenant should be assignable a caseload of apprentices by the admin, including shared/multiple assignment for supervisors over field staff. Operator: "Any subscribed user of a tenant should be able to be afforded permissions by the admin and assigned a caseload of apprentices." (note.129)

## Done means

- An admin can assign a caseload of apprentices to any subscribed tenant user.
- A supervisor can hold shared/multiple caseload assignment across the field staff they oversee (not a strict one-apprentice-one-owner model).

## September 8 operator remediation clarification

The individual caseload assignment path now exists (`src/pages/field-officers/caseload.tsx`, `src/lib/caseload.ts`); verify it before adding a duplicate. The September 8 report specifically requires bulk assignment. `field_officer_assignments` is canonical; `people.assigned_field_officer_id` is a projection, not an independent second writer.

- [ ] Select people by current caseload/host/filter and preview bulk transfer, add co-officer, remove or unassign; show affected records, ineligible users, conflicts and exceptions before committing.
- [ ] Support shared supervision/multiple assignments according to existing policy. Eligible subscribed users/delegates are selected by identity and authority, not a hardcoded field-officer label.
- [ ] Authorized bulk operations are atomic or expose explicit per-record recoverable results; concurrent edits and retries cannot duplicate assignments or leave projections inconsistent.
- [ ] Link assignment/transfer triggers and actions into the visual workflow catalog, with responsible officer, notices, deadlines and visible audit history.
- [ ] Enforce tenant/host/caseload authority server-side; test tampered person/user IDs and read-only roles. Retain selections and drafts on failed submit.
- [ ] Prove single and bulk assignment, reload, resulting caseload views and workflow history on deployed d.*; enumerate all assignment entry points before closing.

Visual-authoring programme: https://github.com/GaryOcean428/bsuite/issues/3204
