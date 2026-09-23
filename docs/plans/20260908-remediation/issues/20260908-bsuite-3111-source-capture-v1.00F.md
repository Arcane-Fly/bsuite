---
kind: record
authority: none
owner: bsuite
---

# [EPIC] Operator 2026-09-06: 'how have so few of these been actioned' — 18% of 152 notes rows done, 0 of 30 filed issues owned; owners and plans on every item, docs/plans/TODO applied rigidly

https://github.com/GaryOcean428/bsuite/issues/3111

Snapshot updatedAt: 2026-09-08T05:23:22Z. Open at capture; re-read live.

## Operator, 2026-09-06 11:14 AWST, verbatim

> As accountability agent. how have so few of these been actioned when i meantion it several times a day. furious.

> you should continuously be scanning the docs, plans, todo's and ensuring they are rigidly applied. no exceptions.

## The numbers behind the question

| measure | value |
|---|---|
| Operator-notes rows judged in `docs/00-roadmap/operator-notes-verdicts.json` (3 Sep) | 152 |
| … DONE | **28 (18%)** |
| … PARTIAL / NOT-DONE / UNVERIFIABLE | 55 / 64 / 5 |
| Rows from the 25 Aug → 3 Sep notes (D-104+) | 50, DONE **2** |
| Issues those rows cite that closed after 3 Sep | **0** (15 still open, 0 assignees) |
| Issues filed by the accountability lane today from the register and the production visual gate | 30 |
| … with an owner or a comment from anyone but accountability | **0** |
| Notes files this week | (7) 3 Sep, (8) 6 Sep — the bulk editor is now raised for the third time (crm7#1477, unowned since 8 Aug) |

Merging the holds accountability posted on PRs happened within the hour every time. Taking a notes row as work — an owner, a plan, a PR — happened zero times.

## What must be true before this epic closes (no exceptions)

- [x] Every issue below has an assignee and a one-line plan comment: which PR, which `d.*` host, which measured cell proves the operator's sentence false.
- [ ] The three decisions on crm7#2464 are recorded on the issue (field mapping is revertible; not the operator's).
- [ ] The emailService null-tenant unscoped read (accountability SEND_BACK 8c107f60, 5 Sep) has a PR.
- [ ] Every PI STATUS carries: notes rows DONE / total, issues owned / filed, and which operator sentence became false on a deployed host that day.
- [ ] The rigid-application scan of `TODO.md` (28 unchecked items) and `docs/plans/README.md` (29 working plans) reports zero items with no owner, no PR and no production evidence — or each such item is on this list with a reason.

## The list

**From the notes register (filed 2026-09-06 00:5xZ):** crm7#2471 #2472 #2473 #2474 #2475 #2476 #2477 #2478 #2479 #2480 #2481 #2482 · business-suite-unified#1156 #1157 #1158 #1159 #1160 #1161 #1162 #1163 · R80.4#316 · bsuite#3104

**From the production visual gate (2026-09-06):** crm7#2483 (24 dead `useQuery` surfaces; case notes errors on every render in production) · crm7#2484 (density) · business-suite-unified#1164 (/gto empty-tenant 400s ×3) · business-suite-unified#1165 (contrast + clipping) · business-suite-unified#1167 (landing claims)

**From notes (8), 6 Sep:** crm7#2488 (pages ignore assigned columns; Communication Centre will not hold 1 column) · crm7#2489 (widget centre only entities) · bsuite#3110 (typography customisation, every surface) · crm7#1477 (bulk editor, third repetition)

**Register-cited and still open, unowned:** R80.4#231 · crm7#1385 #1477 #1675 #1684 #1691 #1696 #1705 #1721 #2059 #2061 #2062 #2063 · bsuite#2580 · crm7#2541

Ruling of record: `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Accountability re-counts this list every cycle and posts the count here.



## September 8 operator remediation clarification

This is the delivery-accountability parent for the September 8 remediation package. Keep each existing issue canonical, add an accountable claimed lane, dependency, current evidence and next executable action; no duplicate master scoreboard. Programme: https://github.com/GaryOcean428/bsuite/issues/3204.

- [ ] Reconcile all seven repositories' open issues, recent merged/closed fixes, operator notes, feature index and dated plans. Preserve requirement identifiers and record unknown/unverified status explicitly.
- [ ] Each implementation issue has a discrete launch prompt with exact scope, relevant shared skills/paired agents, acceptance evidence and escalation handoff. Claude Code, Grok CLI grok-4.6 and Codex CLI gpt-6-astra are operator-approved options for future launches.
- [ ] Run at most two active lanes by default, one mutation worktree per repository, with one owner for shared migrations/package publication. No cleanup of another lane's files or changes.
- [ ] When a child stops, fails verification or loses context, the parent owns recovery and updates the same issue; repeated empty gate polling is not progress.
- [ ] No closure on code presence, historical green CI or a single happy-path page. Verify current deployment, full authorized journey, failure/retry and all enumerated siblings.

Visual-authoring programme: https://github.com/GaryOcean428/bsuite/issues/3204
