---
kind: record
authority: none
owner: bsuite
---

# Privilege escalations rose 28 → 34 — role_capabilities grants writes the code denies

https://github.com/GaryOcean428/bsuite/issues/2411

Snapshot updatedAt: 2026-08-31T02:49:30Z. Open at capture; re-read live.

The `measure` gate went red on bsuite#2409: **privilege escalations rose from 28 to 34**. Filed rather than re-banked, because re-banking a rise is how a ratchet quietly stops ratcheting.

## What an escalation is here

`scripts/audit-role-capability-divergence.mjs` compares the `role_capabilities` table against crm7%27s hardcoded `rolePermissions` map. An **escalation** is a write-shaped capability the **table grants** and the **code denies** — a privilege the table would hand out on the day it stops being inert.

## The +6

`field_manager` rows, added when that role was seeded:

```
Braden Group  field_manager  conduit.pipeline.write
Braden Group  field_manager  crm.contacts.write
Braden Group  field_manager  crm.placements.write
Braden Group  field_manager  training.assessments.write
Braden Group  field_manager  training.qualifications.write
```

**Which side is wrong is a genuine question, not a defect.** The operator%27s description of the role — *"oversees field officers, sees every caseload and decides which field officer carries which apprentices, trainees, workers and host employers"* — argues the **code** is what is behind, and a field manager editing a caseload plausibly needs `crm.placements.write` and `crm.contacts.write`. But granting privileges is not something to do as a side effect of clearing a red check, and the seed data belongs to another lane.

The audit%27s own doctrine says exactly this: *"It does not decide which side is right… Deciding that cell by cell is the reconciliation work this measurement exists to make possible, and it is not a script%27s call."*

## The pre-existing 28 deserve attention independently

Among them:

```
Braden Group  viewer  crm.contacts.write
Braden Group  viewer  crm.placements.write
Lookn         viewer  crm.contacts.write
```

**A role named `viewer` holding write capabilities** is worth someone looking at regardless of this rise. It is inert today because `role_capabilities` enforces nothing — 1,296 rows, zero consumers. The day something reads it, these become real.

## What closing this looks like

For each of the 34, decide table-or-code and change the losing side. Then re-bank the baseline downward — the script already errors when escalations *fall* without re-banking, which is the right instinct.

## Not blocking

`measure` is not a required status check. bsuite#2409 merged with this red and the reason stated in its QA sign-off, because it carried a live user-facing 400 fix (inviting an owner or viewer returned 400 in production) that the operator had explicitly instructed be shipped.
