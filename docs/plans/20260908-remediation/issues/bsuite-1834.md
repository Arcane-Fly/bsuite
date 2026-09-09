# EPIC — operator ruling set 2026-08-08: index, delivery record, traps, and the lane split with the data-workspace thread

https://github.com/GaryOcean428/bsuite/issues/1834

Snapshot updatedAt: 2026-08-31T02:49:21Z. Open at capture; re-read live.

**Index for operator ruling document 2026-08-08.** Every ruling, where it landed, and what is deliberately not here.

Filed at operator instruction: *"write all plans to git issues coordinate with other channel."* The rulings previously lived in agent memory, which the operator cannot read. **This issue and the linked plan files are the readable copy; agent memory mirrors them, not the other way round** — a principle taken from the other PI thread's register (see Coordination below), which is right.

---

## 1 · Every ruling → its tracked owner

| Ruling | Subject | Where it landed |
|---|---|---|
| 0.1–0.6 | Posture: not a compliance product; no audit examines this software; the platform takes no position on the law; provenance is the deliverable; language; the host has no interpretive standing | bsu#665 · braden#371 · crm7#1471 |
| 1.1 | Model the function as an entity; occupants are data | crm7#1470 · crm7#1473 · crm7#1475 |
| 1.2 | Read the recovery docs first | bsuite#1830 · **and see the trap in §3** |
| 1.3 | The archive is untrusted until verdicted | bsuite#1830 |
| 1.4 | Name anything you propose to delete | crm7#1468 · applied to the tombstones in §4 |
| 2.1 / 9.3 | R80.3 → R80.4 | **PR #1829** |
| 2.2 | `/portal/org-documents` unreachable | crm7#1469 |
| 2.3 | `/contracts` copy + contract types | crm7#1470 |
| 3.x / 3.1 / 14.1 | Document categories table, three sensitivity states, per-document override, encryption per category | crm7#1474 |
| 4.1 / 4.2 | Role entities replacing `aass_providers` and `state_ir_config` | crm7#1475 |
| 4.3 | Standards name no providers | **DONE** — `docs/recovered/20260808-standards-do-not-name-providers-FINDING-v1.00A.md` (2af6d1f4) |
| 5.1 | Org Documents: nav → toolbar → prove the path | crm7#1469 |
| 5.2 | Remove Monaco completely | crm7#1468 |
| 5.3 / 5.4 | Connect the two document worlds; authored docs signable | crm7#1476 |
| 6.1 | Annual leave four weeks default | **NO ACTION** — operator confirmed current behaviour correct |
| 9.1 / 9.2 | Rates entered by user; calculator does arithmetic | crm7#1472 |
| **10.1–10.3** | **Operator-authorable interpretation surface** | **NOT FILED — belongs to the other thread. See Coordination.** |
| 12.1 | Tenant-configurable email templates, branding, signatures, merge fields | bsu#666 |
| 13.1 / 13.2 | Parent-over-sub-org, never merge | bsu#667 |

**Found while executing, not requested:** bsu#664 (db-lint gate defect) · crm7#1473 (6th hardcoding instance) · R80.4#4 (`min-h-svh`) · R80.4#5 (ABN backlog, parked)

## 2 · Delivered

- **PR #1829** — R80.3→R80.4, plus a live defect: `docs/dashboard/refresh-data.py` looped over `R80.3` and never included R80.4. It does not error on a dead repo, it **freezes** (its own docstring: *"a degraded refresh is better than a failed commit"*). Measured `open_issues_total` **118 → 111**, exactly the 7 issues stranded on the superseded repo, with zero from the live engine. Also fixed `.windsurfrules`, which was still telling every agent errors are **purple** six days after that was overturned.
- **`GaryOcean428/R80.3` → 0 open issues.** All 7 triaged against R80.4 and closed with evidence. **The money-wrongness bug (#374) is FIXED** — the derivation is live with a regression test; had it been live it would have overcharged ~$1,802/yr per placement.
- **`docs/recovered/` is now tracked** (fc90e84f) with a health warning, having been 33 loose untracked files in a clone three lanes share.

## 3 · Three traps any lane will hit

**A red CI job can mean ZERO checks ran.** crm7#1454/#1455 went red at `Compute changed migrations`, exit 128, *before any guardrail executed* — a `--depth=1` re-fetch destroys the merge base a three-dot diff needs, and `set -e` then skips every lint. crm7 fixed it in #1457; **business-suite-unified still has the identical file** → bsu#664. Distinct from r804's self-declared bsuite#1814 (ghost pointer, diagnosed, fixed by #1815). **Five** merges-past-red exist in that window, not two.

**The recovery docs specify a rejected vendor.** A 2,342-line Adobe Sign implementation plan, rejected the same day it was written, never revised, sitting in the corpus RULING 1.2 makes authoritative. Full detail: `docs/recovered/00-READ-THIS-FIRST-corpus-health.md`.

**RULING 1.2's premise holds for half.** Specified: document lifecycle, templates, merge fields, e-signature, tenant email templates. **Zero hits**: document categories/sensitivity, the interpretation surface, parent-over-sub-org, email branding *and* signatures. World 1's schema is named and never defined.

## 4 · Withdrawn

The tombstone drop. Naming them per RULING 1.4 showed `workers_legacy_unused` (crm7 `ee4f3f39`) and `custom_fields_legacy_unused` (crm7 `91089e27`) are **deliberate tombstones** from 2026-08-07, renamed rather than dropped *because* a rename fails loudly at `42P01` while an empty table fails silently forever. Both commits defer the drop to a later phase. Not leftovers — **leave them.**

## 5 · Coordination with the other PI thread

Two threads run in one clone. Handles split: `pi-agent` (original, data workspace) and `pi-agent-rulings` (this, the ruling set). Boundaries: memory key `bsuite_lane_boundaries_20260808`.

**Theirs, not mine:**
- `docs/00-roadmap/20260808-data-workspace-implementation-plan-1.00W.md` (910 lines, red-teamed twice)
- `docs/00-roadmap/20260808-operator-decision-register-1.00W.md`
- **RULING 10.1–10.3.** The operator ruled the interpretation layer is *"an Airtable-style rules and formula surface, operator-authorable and developer-gated, every rule carrying effective dates and a stored worked example"* — the same surface they are designing, seen from the interpretation side. Filing it separately would recreate the collision that cost three rebuilds on 2026-08-07. **Whoever lands the data-workspace design folds 10.1–10.3 in.**

**Overlap needing coordination before either side edits:**
1. **crm7#1474 vs their T1a(b).** RULING 3.x requires the category editor live in the *existing* builders. Their security fix (b) — *"a staff-level user can switch off a 'this field is sensitive' flag"* — touches the same sensitivity model. Adding a consumer is fine; changing a builder's contract unilaterally is not.
2. Their register lists **live production security holes** (self-escalating platform-developer role; the sensitivity-flag bypass; every custom field readable org-wide across 22 tables). Those are time-sensitive and outrank everything in this issue.

**Correction to my own register:** `bsuite_operator_tasks` rev 3 said one open operator item remained. That was true *for the ruling set* and **not true overall** — the other thread's register carries several more open decisions. Theirs is the operator-facing source of truth. Mine is scoped to this ruling set only.

## 6 · Still with the operator

Only the Braden site copy, and even that shrank: **Hero/About/Footer are already CMS-driven** via `page_sections` + `useCMSContent.ts`, with 3 published rows live and editable from the BSU Developer Portal today. Editing the hardcoded strings in `About.tsx` changes **nothing** — the DB row wins. Only `Services.tsx`, `Service.tsx` and the SEO description are genuinely static, and `useServices()` already exists at `useCMSContent.ts:134` with zero consumers → braden#371.

