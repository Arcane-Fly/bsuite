# Inspector Feedback — Iteration 5

## Verdict: FAIL

The iteration has correct inventory arithmetic, preserves the required bounded rulings, and provides strong source evidence for the page-builder, schema-canvas, data-grid, and workflow-canvas rows. It nevertheless fails acceptance criterion 6: four newly reviewed rows rely on the audited document's own historical assertions rather than showing a fresh command or source-file read in the ledger.

## Acceptance Criteria Check

- [x] Criterion 1 — verified for iteration 5: the filesystem and ledger reconcile at 128 unique dated-document paths with no missing, extra, or duplicate rows. Verdict totals independently replay to 7 `VALIDATED-CURRENT`, 8 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 110 `UNVERIFIABLE`.
- [x] Criterion 2 — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`.
- [x] Criterion 3 — verified for the iteration's customisation claims by direct source reads. Row 80 is backed by `buildCanvasCardLayout`, `DraggableCardPage`, `usePageGridLayout`, and `PageGridLayout`; row 86 correctly distinguishes read-only `EnhancedDataTable` from the persistence-capable DataGrid/Browse path; row 55 traces `RelationshipCanvas` through `saveDraft()` to Supabase update/insert; row 117 traces workflow graph edits through the debounced controller to `saveVersionGraph`.
- [x] Criterion 4 — verified: `EntityTableWidget.tsx` remains explicitly rejected as an editable winner because it only selects rows. The relationship canvas remains described as interactive/connectable but without a direct save; persistence is correctly attributed to the surrounding Feature Builder store.
- [x] Criterion 5 — verified for the local record and bounded status: the ledger remains the 128-row record and explicitly reports the incomplete 110-row remainder. No completion claim was made and overall status remains `building`.
- [ ] Criterion 6 — FAILED: rows 51, 63, 89, and 90 were promoted from `UNVERIFIABLE` without a replayable command or independent source-file evidence trail in their ledger entries. “Focused read confirms/documents” only inherits the document's own assertions, which the goal expressly forbids.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional checks: 128-row path bijection PASS; exact `7/8/3/110` totals PASS; Builder commit signature PASS (`G`); Builder commit scope PASS (ledger only).

## Issues Found

1. **Row 51 (`border-elevation-token-system`) has no complete independent evidence trail.** The entry says a focused read confirms implementation and reportedly passing deployed/gate checks. A document reading cannot verify its own deployed observations. Current source does expose the repaired `--shadow-color`/`--shadow-ink-*` ladder, and a filesystem check confirms `scripts/visual-probe.js` is absent, but neither replay appears in the ledger. The deployed stylesheet probes and named gates were not replayed.
2. **Row 63 (`braden-group-duplicated-documents`) treats historical database measurements as current.** `scripts/remediate-duplicated-documents.mjs` encodes the expected 162 candidates, eTag comparison, sensitive flag, and drift guard, but source text cannot prove that the live database still contains 162 duplicates, 10 sensitive duplicates, 29 unique rows, or no third-party exposure. No live read-only SQL/storage command is shown.
3. **Row 89 (`nav-route-reachability`) contains no replayed route-census command or source paths.** The entry only restates the audited document's corrected instrumentation and zero-unreachable result. The check must be re-run per app with positive controls, or the exact implementation sources/commands must be recorded.
4. **Row 90 (`text-contrast`) contains no replayed browser/source evidence.** The entry inherits the document's three measured failures, fixes, and P7 instrumentation correction without naming current source anchors or re-running the computed-style probe. It correctly preserves the 104 unverified claims, but that does not independently establish the promoted portion.

## What Must Be Fixed

1. Rework row 51 to cite fresh source reads for the token implementation and actual replay output for every gate/deployed claim retained; otherwise narrow the verdict to only what the source reads establish.
2. Run a read-only live duplicate census for row 63 (including eTag equality, sensitive count, unmatched unique count, and tenant membership/exposure), record the command/query and result, or return the row to `UNVERIFIABLE`.
3. Replay the per-app route-reachability audit with positive controls for row 89 and record the command/result; otherwise return it to `UNVERIFIABLE`.
4. Replay the current contrast/source checks retained by row 90 and record concrete source paths or browser-command output; otherwise return it to `UNVERIFIABLE`.
5. Keep the exact 128-row inventory, the `EntityTableWidget` rejection, the non-direct-save canvas wording, and overall `building` status unchanged.
