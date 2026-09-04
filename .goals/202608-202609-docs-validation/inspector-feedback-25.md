# Inspector Feedback — Iteration 25

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Criterion 1 — verified structurally: an independent filesystem/ledger replay found 128 dated paths, 128 sequential ledger rows, 128 unique ledger paths, and no missing or extra paths. The correct current verdict arithmetic is 5 `VALIDATED-CURRENT`, 7 `VALIDATED-DRIFTED`, 2 `SUPERSEDED`, 3 `DUPLICATE-CLUSTER`, and 111 `UNVERIFIABLE`; the overall audit correctly remains `building`.
- [x] Criterion 2 — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`; `node scripts/generate-feature-index.mjs --check` reports `feature-index: in sync (661 rows)`; direct parsing confirms 174 components and 661 feature rows across 28 modules and 57 capability areas.
- [x] Criterion 3 — verified for the preserved architecture rulings: `RelationshipCanvas.tsx` is interactive and updates draft foreign-key state through `onSetForeignKey`, but has no direct persistence call; `EntityTableWidget.tsx` performs `.select('*')` and exposes no edit/mutation/save path.
- [x] Criterion 4 — verified: rows 21 and 33 are genuinely superseded. Each source document explicitly declares itself superseded and names the successor recorded in the ledger.
- [x] Criterion 5 — verified only as preserved prior state: the complete local ledger and prior full-ledger PI handoff remain recorded; this Builder made no new unsupported handoff claim.
- [ ] Criterion 6 — FAILED: seven of the ten assigned rows (3, 42, 43, 46, 56, 58, and 79) still contain generic `E-OPEN` prose rather than direct source or replayable-command evidence. Row 74 has concrete evidence, but that evidence predates Builder commit `fc5d9ce48`; the Builder did not complete that assigned row. The Builder changed only rows 21, 33, 39, and 74, with rows 39 and 74 being refinements of prior evidence rather than completion of the remaining assigned set.

## Quality Gate

- Command: independent dated-path/ledger bijection and verdict parse
- Result: PASS
- Details: 128 filesystem paths; 128 rows; 128 unique paths; sequential numbering; no missing/extra paths; correct live split 5/7/2/3/111.
- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Command: `node scripts/generate-feature-index.mjs --check`
- Result: PASS
- Details: `feature-index: in sync (661 rows)`; direct parse confirmed 28 modules and 57 capability areas.
- Command: direct reads of rows 21 and 33 source documents and their named successors
- Result: PASS
- Details: both source documents explicitly declare supersession and name the same successor paths recorded in the ledger.
- Builder commit: `fc5d9ce48`
- Result: PASS
- Details: good GPG signature; exactly one ledger file changed; no product source, migration, registry, goal, or status file changed.

## Issues Found

1. **Seven assigned rows remain generic.** Rows 3, 42, 43, 46, 56, 58, and 79 still use `E-OPEN` without a concrete command result or direct source evidence. This violates the focused assignment and acceptance criterion 6.
2. **Row 74 was not completed by this Builder.** Its bounded structural evidence already existed before `fc5d9ce48`; this commit only refined the stored-versus-derived repeat-offence discrepancy.
3. **Ledger verdict summaries are stale.** Rows 21 and 33 now correctly read `SUPERSEDED`, but the summary sections still report 0 `SUPERSEDED` and 113 `UNVERIFIABLE`. The row-derived totals are 2 and 111 respectively.

## What Must Be Fixed

1. Replace generic `E-OPEN` text for rows 3, 42, 43, 46, 56, 58, and 79 with document-specific direct-source evidence or exact replayable commands and bounded results; retain `UNVERIFIABLE` where the evidence does not prove live behaviour.
2. Reconcile every ledger summary/count statement to the row-derived 5/7/2/3/111 arithmetic and total 128.
3. Preserve the valid supersession evidence for rows 21 and 33 and the conservative architecture/live-evidence boundaries.
