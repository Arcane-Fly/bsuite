---
kind: record
authority: none
owner: bsuite
---

# [D-109] Person detail lists all placements + engagements

https://github.com/GaryOcean428/crm7/issues/2472

Snapshot updatedAt: 2026-09-06T09:14:24Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-109, route/surface: /people/:id):

> Person record should have a list of all placements and engagements we have records for.

**The ask:** Person detail lists all placements + engagements

**Register verdict at filing:** PARTIAL — `people/[id].tsx` has `usePersonPlacements` wired to a tab + bottom table (:906-1129). `grep -ni engagement crm7/src/pages/people/\[id\].tsx` = 0 hits — engagements are not shown at all.

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-109.
