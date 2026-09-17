---
kind: record
authority: none
owner: bsuite
---

# Pages do not respect the columns assigned in the page editor — Communication Centre will not stay at 1 column, and the operator reports the drag layer as buggy on every page

https://github.com/GaryOcean428/crm7/issues/2488

Snapshot updatedAt: 2026-09-07T10:51:31Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (8).docx`, dated 06/09/2026, third notes file this week on the same surface):

> ALL PAges still not respecting columns assigned for dnd layer. E.g. communication centre wont stay when i try to shrink to 1 column. Overal dnd-kit is buggy.

**What this is.** V-C6 (canvas columns ≠ available columns) reported by the person who uses the pages every day. The accountability lane's production matrix could never evaluate V-C6 — the columns control is four clicks inside the page editor and changing it persists a layout, so a read-only probe reports UNKNOWN on every one of 104 signed-in cells (`evidence/2026-09-06/visual-gate-3102/`), and the PI's own 56-cell run left the same 32 cells INCOMPLETE. The operator has now done the interaction test for us and it fails: set Communication Centre to 1 column, and it does not stay.

**Scope.** "ALL pages" — every route with a `react-grid-layout` canvas and a columns preset (bsuite#2334 counts 385 surfaces across 5 apps). Related, not duplicates: crm7#2487 (every CanvasCard is `w={12}`), crm7#2445 (the page editor is an unmeasured state), crm7#2084 (dashboard defects), bsuite#2334 (per-card drag/resize estate-wide).

**Done means:** the interaction test in `bsuite-ship-visual-promote/references/visual-inspection-protocol.md` §5 V-C6 steps 0–7 passes on `d.crm.crm7.app` for Communication Centre and for every route in the class — set each columns preset, confirm the layout changes, reload, confirm it persisted, at 1440 and at a width below 1200px — with the probe output and screenshots on the PR; a failing case first (a test that sets 1 column and reloads); D8 stated. The operator's sentence must be false on the deployed host before this closes. Filed by the accountability lane; PI names the owner.
