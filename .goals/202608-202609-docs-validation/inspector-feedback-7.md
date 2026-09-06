# Inspector Feedback — Iteration 7

## Verdict: FAIL

The corrected dependency-footprint values independently replay to 25 `@dnd-kit` files and 19 `react-grid-layout` files. The iteration still fails the operator's explicit reproducibility requirement because the ledger gives only “Source grep” descriptions for those figures: it does not record either command or enumerate the six app source roots included in their scope.

## Acceptance Criteria Check

- [ ] Dependency-footprint evidence — FAILED: 25 and 19 are correct on replay, but the ledger does not include reproducible six-app source commands/scope for `@dnd-kit` and `react-grid-layout`.
- [x] Inventory and arithmetic — verified: the live deduplicated inventory and ledger are an exact 128-path bijection; verdicts replay to 5 `VALIDATED-CURRENT`, 6 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 114 `UNVERIFIABLE`.
- [x] Rows 51, 63, 89, and 90 — verified: all remain `UNVERIFIABLE` and honestly state the missing visual, live-census, authenticated reachability, or rendered-browser evidence.
- [x] Data-surface ruling — verified: `EntityTableWidget.tsx` only selects rows; the ledger correctly bounds editable persistence to `BrowseDataTab.tsx`, `browseDataService.ts`, and the shared DataGrid callback/rollback contract.
- [x] Relationship-canvas caveat — verified: `RelationshipCanvas.tsx` calls `onSetForeignKey` but has no direct save; the ledger retains the `EntityPanel.tsx` → `featureBuilderStore.saveDraft()` persistence boundary.
- [x] Registry and commit scope — verified: the registry check reports 174 components, and commit `9c677a87c` modifies only the ledger.
- [x] Overall state boundary — verified: this is iteration-remediation review only; the ledger and `status.json` remain `building` with 114 rows unresolved.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional replay: six-app TypeScript source greps returned 25 `@dnd-kit` files and 19 `react-grid-layout` files; exact inventory comparison found 128 paths on both sides with no missing or extra entries.

## Issues Found

1. Lines 31–32 state corrected footprint totals but omit the commands and six-app source-root scope needed for another reviewer to reproduce them from the ledger itself.

## What Must Be Fixed

1. Replace or supplement both prose footprint bullets with the exact commands, including `business-suite-unified/src`, `crm7/src`, `conduit/src`, `braden/src`, `R80.4/src`, and `throughput/src`, TypeScript include filters, deduplication, and count output.
2. Preserve all verified values, caveats, `UNVERIFIABLE` rows, registry evidence, and overall `building` status.
