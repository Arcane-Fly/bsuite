# Inspector Feedback — Iteration 9

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Exact inventory and arithmetic — verified: the current deduplicated dated-document inventory and ledger are an exact 128-path bijection with zero differences. Inventory verdicts replay to 5 `VALIDATED-CURRENT`, 6 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 114 `UNVERIFIABLE`.
- [x] Registry evidence — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`.
- [x] Page-builder row 80 — verified: `canvasCardLayout.tsx`, `DraggableCardPage.tsx`, `usePageGridLayout.ts`, and `PageGridLayout.tsx` support the cited independent-card, layout-version, and persisted drag/resize mechanics. Historical production measurements remain explicitly bounded.
- [x] EnhancedDataTable row 86 — verified: `EnhancedDataTable.tsx` consumes TanStack `row.original`; `BrowseDataTab.tsx` and `browseDataService.ts` provide the separate editable persistence path. The fresh 43-file and 35-non-test counts are stated as non-comparable with the document's historical scope rather than used as false proof.
- [x] Border, route, and contrast rows 51/89/90 — verified: all remain `UNVERIFIABLE`. Static route-map and source-contrast commands are correctly bounded from authenticated reachability and rendered contrast, and the absent visual/browser evidence is named.
- [x] Workflow-canvas row 117 — verified: `useWorkflowController.ts` schedules graph persistence with a 900 ms debounce and flushes pending edits; `service.ts` writes through `saveVersionGraph` with a draft-status guard; the CRM7 adapter is identified.
- [ ] Theme row 14 — FAILED: the row remains a generic `E-OPEN` instruction. Builder did not replay the current theme gates or cite the concrete role-token sources named by the document.
- [ ] Schema-authoring/tenancy row 29 — FAILED: the row remains generic despite available source definitions for `tenant_schema_layout`, `tenant_subtree_ids`, authoring RPCs, and tenant predicates. It neither records those source reads nor distinguishes source/baseline presence from live-schema deployment proof.
- [ ] Role-capabilities rows 60/61 — FAILED: both remain generic. Current migration/baseline source and the available consumer-census scripts were not recorded, while the documents' historical live counts correctly remain unproven without live catalogue checks.
- [x] No unsafe promotion — verified: no changed priority row was promoted from `UNVERIFIABLE` merely by repeating historical prose. Rows 89 and 90 remain unverified, and row 86 was already `VALIDATED-DRIFTED` with its new measurement carefully bounded.
- [x] Builder scope and overall state — verified: commit `b98495d05` changes only the ledger. Overall status remains `building`, with 114 `UNVERIFIABLE` rows.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional checks: current inventory comparison returned 128 live paths, 128 unique ledger paths, and zero differences; inventory-table arithmetic returned `5/6/3/114`.

## Issues Found

1. The iteration-9 focused table does not match the assigned ten-row set. It substitutes rows 32, 52, 55, and 63 for explicitly assigned rows 14, 29, 60, and 61.
2. Rows 14, 29, 60, and 61 were not substantively reviewed even though concrete source files, migrations, and replayable scripts are available.
3. The omitted role-capability work needs two evidence tiers kept separate: repository source/consumer census versus live Supabase catalogue state. Historical live counts cannot bridge that gap.

## What Must Be Fixed

1. Perform and record focused source/command checks for rows 14, 29, 60, and 61.
2. Update the iteration-focused table to enumerate the actual assigned ten rows.
3. Keep deployment/count claims `UNVERIFIABLE` unless current live catalogue evidence is obtained; source and baseline SQL may establish implementation presence only.
4. Preserve the already-correct bounded rulings and the overall `building` state.
