---
kind: record
authority: none
owner: bsuite
---

# [POSSIBLE REGRESSION] /pipeline/kanban still isolated from conduit despite crm7#1268 closed COMPLETED — pipeline_cards has no FK to conduit_*

https://github.com/GaryOcean428/crm7/issues/1687

Snapshot updatedAt: 2026-08-26T12:21:46Z. Open at capture; re-read live.

Operator observed: `/pipeline/kanban` should pull from conduit rather than holding its own data.

**Route/surface:** `/pipeline/kanban`

Directive: D-80 (2026-08-13)

> D-62: "Fix the class, not the page."

## Possible regression, not a fresh finding
crm7#1268 ("[architecture] /pipeline/kanban uses crm7's own pipeline_cards table with no link to conduit — one-shot violation (register #22)") reported this EXACT defect and was closed as **COMPLETED on 2026-07-28**. The operator is re-reporting the identical problem on 2026-08-13 as still present. Either the fix never actually shipped to the surface the operator is using, or it has regressed. This issue exists to make the CURRENT, observed state visible and trackable (D-60) — it does not assume #1268's fix was wrong, only that the defect is observably still there. Whoever picks this up should first verify whether #1268's merged change reached production before re-deriving a fix (see "merged is not applied" as a known failure class in this codebase).

## Acceptance criteria
- `/pipeline/kanban` reads and writes through `conduit_*` tables (or conduit's API), with no independent `pipeline_cards` store as the source of truth.
- Verify in the LIVE/production database (not just the migration files) that crm7's pipeline board and conduit's data are the same rows, not parallel copies.
- Confirm whether #1268's fix shipped to production; if it did and this has regressed, note the regression point (e.g. a later PR that reintroduced the local table).

## Mandatory before merge
- **Validation loop:** §9.1 output-equivalence — a card change made in conduit must be visible on `/pipeline/kanban` and vice versa, with no independent state.
- **Equivalence target:** `/pipeline/kanban` and conduit's own pipeline view render from the identical underlying rows — verified live, not just via code review.
- **Cross red-team:** bsuite-platform
- **Skills to load:** general-dry-one-shot-architecture, supabase:supabase

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue. Related: crm7#1268 (closed COMPLETED, same defect, apparently recurring).*
