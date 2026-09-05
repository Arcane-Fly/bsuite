# Inspector Feedback — Iteration 15

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Feature-index parse evidence — verified: the exact recorded `node -e` command prints `{ rows: 661, modules: 28, capabilityAreas: 57 }`.
- [x] Four shared-component counts — verified independently across the six committed app source trees: `AppShell` is 4 files/4 apps, shared `Button` is 0 files/0 apps, `DataGrid` is 22 files/1 app (`crm7`), and `DraggableCardPage` is 10 files/4 apps. The live generator check reports 174 components.
- [x] Scope and distinctions — verified: the generator scans the six named app `src` roots, only `.ts`/`.tsx`, and excludes `node_modules`, `__tests__`, `.test.`, `.spec.`, and `.d.` files. Package-internal, app-local same-name, Storybook/test-only, prose/comment, and non-direct-import distinctions remain stated.
- [x] Inventory, arithmetic, prior rulings, and scope — verified: 128 unique filesystem paths map bijectively to 128 sequential ledger rows; totals remain `5/7/3/0/113`; the read-only `EntityTableWidget`, persisted CRM7 `BrowseDataTab`/`DataGrid`, and non-direct-save `RelationshipCanvas` rulings remain intact; status remains `building`; Builder commit `9da2c1fb7` changes only the ledger.
- [x] Unsupported live claims — verified absent from the new section: it explicitly excludes live deployment, authenticated reachability, RLS enforcement, visual rendering/contrast, and runtime behaviour.
- [ ] Exact genuine evidence trail — FAILED: the recorded component command computes only the first four registry rows, then unconditionally prints `RelationshipCanvas: local / absent from shared registry`. It never queries the registry for `RelationshipCanvas`, so the output would remain identical even if that classification became false. The separate existence command proves only that the app-local file exists. In addition, the claimed shared-definition/export existence check points `DraggableCardPage` at `packages/page-builder/src/canvasCardLayout.tsx`; the actual definition/export is `packages/page-builder/src/DraggableCardPage.tsx:163` and its barrel export is `packages/page-builder/src/index.ts:28`. Correct conclusions do not satisfy acceptance criterion 6 when the artefact's purported evidence command does not compute them.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --self-test`
- Result: PASS — `component-registry --self-test: OK (14 cases)`.
- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS — `component-registry: in sync (174 components)`.
- Command: `node scripts/generate-feature-index.mjs --self-test`
- Result: PASS — `generate-feature-index --self-test: OK (12 cases)`.
- Command: `node scripts/generate-feature-index.mjs --check`
- Result: PASS — `feature-index: in sync (661 rows)`.
- Additional checks: exact feature parse command, independent six-app committed-source import census, inventory-to-ledger bijection, verdict totals, prior-ruling search, Builder diff scope, GPG signature, and computed `RelationshipCanvas` distinction.
- Result: PASS mechanically; acceptance criterion 6 remains FAIL for the non-computing evidence command and incorrect export anchor.

## Issues Found

The iteration repairs most replayability, but one of the five required classifications is echoed rather than measured. The same section also describes an existence check as covering shared definitions/exports while using a supporting layout-helper file instead of the `DraggableCardPage` definition/export path.

## What Must Be Fixed

1. Replace the hardcoded `RelationshipCanvas` output with a command that computes both facts: the app-local file exists and the shared registry contains zero `RelationshipCanvas` rows.
2. Change the `DraggableCardPage` definition/export anchor to `packages/page-builder/src/DraggableCardPage.tsx` (and preferably verify `packages/page-builder/src/index.ts` exports it); retain `canvasCardLayout.tsx` only as a supporting layout-mechanics anchor.
3. Preserve the verified counts, six-root scope/exclusions, prior rulings, 128-row inventory, `5/7/3/0/113` totals, 174-component gate, `building` status, and ledger-only scope.
