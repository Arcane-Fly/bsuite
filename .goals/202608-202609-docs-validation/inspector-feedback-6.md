# Inspector Feedback — Iteration 6

## Verdict: FAIL

The remediation correctly returns rows 51, 63, 89, and 90 to `UNVERIFIABLE`, preserves the bounded data-grid and relationship-canvas rulings, and keeps the full goal explicitly incomplete at 114 `UNVERIFIABLE` rows. It nevertheless fails the iteration's evidence-accuracy requirement: two source-footprint outputs labelled “Fresh evidence captured for this pass” do not match independent replay.

## Acceptance Criteria Check

- [x] Rows 51, 63, 89, and 90 — verified `UNVERIFIABLE` with exact missing evidence. Row 51 names the absent `scripts/visual-probe.js` and missing current computed-style/deployed matrix; row 63 requires a live read-only duplicate census including eTag, sensitive, unmatched, tenant-membership, and exposure checks; row 89 requires authenticated per-app reachability with positive controls; row 90 requires current rendered light/dark browser evidence. None presents its historical document assertions as current.
- [ ] Iteration 6 evidence accuracy — FAILED. Independent replay found 25 `@dnd-kit` source files, not the stated 26, and 19 `react-grid-layout` source files, not the stated 21. These claims appear under “Fresh evidence captured for this pass”, so stale carry-forward values are represented as current outputs.
- [x] Inventory and arithmetic — verified: the deduplicated filesystem inventory contains 128 unique paths; the ledger has 128 sequential, unique rows with no missing or extra paths. Totals replay to 5 `VALIDATED-CURRENT`, 6 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 114 `UNVERIFIABLE`.
- [x] Registry check — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`.
- [x] Data-surface ruling — verified by source: `EntityTableWidget.tsx` only selects rows; `BrowseDataTab.tsx` supplies editable columns and an awaited `onCellsEdited` handler, while `browseDataService.ts` persists through `commitBulkUpdate` and the shared DataGrid reverts rejected optimistic edits.
- [x] Relationship-canvas caveat — verified by source: `RelationshipCanvas.tsx` invokes `onSetForeignKey` and contains no direct save; `pages/Developer/FeatureBuilder/panels/EntityPanel.tsx` mutates the draft entity; the page-level Save action calls `featureBuilderStore.saveDraft()`, which performs Supabase update/insert. The ledger does not claim direct canvas persistence.
- [x] Commit hygiene — verified: cumulative iteration-6 range `ae8448399..0ee70ad59` changes only `docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md`; no source, migration, or unrelated file was committed. Both Builder commits are GPG-valid (`G`).
- [x] Overall state boundary — verified: the ledger and `status.json` remain `building`; this verdict does not claim overall completion, and 114 rows remain `UNVERIFIABLE`.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional replay: route inventory PASS at 47 routes across 6 apps (18 public, 29 authenticated); source contrast PASS at 457 package source files and 0 violations; duplicate census blocked before execution by missing `@supabase/supabase-js`, as the ledger states.

## Issues Found

1. The iteration evidence block says a fresh `@dnd-kit` source grep found 26 files. Replaying the documented six-app source scope and TypeScript extensions returns 25.
2. The same block says a fresh `react-grid-layout` source grep found 21 files. Replaying that scope returns 19.

## What Must Be Fixed

1. Re-run the two six-app source-footprint commands and replace the stale 26/21 figures with their exact current outputs, including the commands if the values are retained as iteration evidence.
2. Keep rows 51, 63, 89, and 90 `UNVERIFIABLE`, retain the corrected `EntityTableWidget` and non-direct-save `RelationshipCanvas` rulings, preserve the 128-row bijection and `5/6/3/114` totals, and leave overall status `building`.
