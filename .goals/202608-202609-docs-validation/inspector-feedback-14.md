# Inspector Feedback — Iteration 14

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Registry and feature-index generator checks — verified independently: component-registry self-test reports 14 cases, component-registry check reports 174 components, feature-index self-test reports 12 cases, and feature-index check reports 661 rows.
- [x] Feature-index arithmetic and drift — verified independently by parsing `docs/00-roadmap/bsuite-feature-index.json`: 661 rows, 28 modules, and 57 capability areas. The Markdown prose still says 662, so `VALIDATED-DRIFTED` remains the correct bounded verdict.
- [x] Five-component classifications — verified against package exports, registry JSON, and direct app imports: `AppShell` has 4 direct consumers across 4 apps; shared `Button` has 0 direct app consumers; `DataGrid` has 22 direct consumers in CRM7; `DraggableCardPage` belongs to the `@bsuite/page-builder` row with 10 direct consumers across 4 apps; and app-local `RelationshipCanvas` is outside the shared-package registry contract.
- [x] Inventory, arithmetic, and prior rulings — verified mechanically: 128 unique inventory paths map bijectively to 128 sequential ledger rows with no missing, extra, or duplicate paths; verdict totals are `5/7/3/0/113`. The read-only `EntityTableWidget` boundary, persisted CRM7 Browse/DataGrid winner, and non-direct-save `RelationshipCanvas` caveat remain intact.
- [x] Scope and claim boundaries — verified: Builder commit `2d39c385a` changes only the ledger, preserves `status: building`, promotes no dated-document verdict, and expressly excludes runtime reachability, authenticated navigation, RLS enforcement, live catalogue state, deployment state, rendered contrast, and remaining claim-level checks.
- [ ] Exact evidence trail — FAILED: acceptance criterion 6 requires a genuinely reviewed claim to show the command or file read that verified it. The ledger records exact commands/results for the four generator checks, but the feature-JSON parse is only described as “Parsing ... and counting” with no executable command. The five component comparisons likewise give conclusions and source anchors without the exact source/import comparison commands and their results. The Inspector could independently reproduce the claims, but independent reproducibility does not repair the missing evidence trail in the artefact of record.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --self-test`
- Result: PASS — `component-registry --self-test: OK (14 cases)`.
- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS — `component-registry: in sync (174 components)`.
- Command: `node scripts/generate-feature-index.mjs --self-test`
- Result: PASS — `generate-feature-index --self-test: OK (12 cases)`.
- Command: `node scripts/generate-feature-index.mjs --check`
- Result: PASS — `feature-index: in sync (661 rows)`.
- Additional checks: parsed feature JSON; recomputed the dated-document inventory-to-ledger bijection and verdict totals; inspected the named source anchors and direct package imports; checked Builder commit scope.
- Result: PASS — all factual findings reproduced, but the required commands/results are not fully recorded in the ledger.

## Issues Found

The iteration's factual conclusions are correct, but its evidence section is not fully replayable from the ledger. It substitutes prose for the exact JSON parse command and omits the exact commands/results used to distinguish package definitions, direct application imports, package-internal references, Storybook/tests, local same-name components, and the app-local `RelationshipCanvas`.

## What Must Be Fixed

1. Add the exact command and result used to parse `bsuite-feature-index.json` and establish 661 rows, 28 modules, and 57 capability areas.
2. Add exact replayable source/import comparison commands and their results for all five component classifications, with the six-app scope and exclusions explicit.
3. Keep the current numerical conclusions, prior rulings, `building` status, 113 `UNVERIFIABLE` rows, and ledger-only scope unchanged unless fresh evidence requires a correction.
