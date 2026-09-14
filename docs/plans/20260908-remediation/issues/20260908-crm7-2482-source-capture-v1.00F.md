---
kind: record
authority: none
owner: bsuite
---

# [D-156] A one-line Name cell, the slug as its own column or tooltip, and a way for the user to correct it

https://github.com/GaryOcean428/crm7/issues/2482

Snapshot updatedAt: 2026-09-06T09:15:20Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-156, route/surface: /reports templates grid):

> https://crm.crm7.app/reports Name column in reports has double lines and no way to correct. (screenshot image88: title and slug on two cramped lines in the Templates gri

**The ask:** A one-line Name cell, the slug as its own column or tooltip, and a way for the user to correct it

**Register verdict at filing:** PARTIAL — PARTIAL (fixed on development, not promoted; no user correction) - reports/index.tsx:361-397 one-line Name + separate Key column (956cdeb97, 2 Sept 22:02) on development only; main 1fd4fd829 (2 Sept 18:17) lacks it; live reports-DrGm63jq.js still stacks name and templateKey in one cell. No user column-width/row-height control

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-156.
