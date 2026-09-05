# Inspector Feedback — Iteration 18

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Authoritative inventory and arithmetic — independently replayed: 128 inventory paths map bijectively to 128 sequential, unique ledger rows; totals remain `5 VALIDATED-CURRENT / 7 VALIDATED-DRIFTED / 3 DUPLICATE-CLUSTER / 0 SUPERSEDED / 113 UNVERIFIABLE`.
- [x] Registry and index gates — independently replayed: component registry self-test/check passes at 174 components; feature-index self-test/check passes at 661 rows across 28 modules and 57 capability areas.
- [x] Focused rows 1, 14, 80, 87, 89, and 115 — verified as bounded and conservative. Row 1 cites CRM7 editable-grid source; row 14 records the current G11 failure; row 80 cites page-builder source while retaining historical-measurement bounds; rows 87 and 89 accurately distinguish static checks from live proof; row 115 supplies concrete source line ranges and states what remains unevidenced.
- [ ] Focused row 81 — FAILED evidence reconciliation: the ledger records the current checker result of 558 inventory routes/rows, but the source document claims 553 routes. The row neither names nor explains that five-route drift, so it does not genuinely validate the document's numeric claim.
- [ ] Focused rows 113, 114, and 116 — FAILED acceptance criterion 6. Row 113 only summarises the plan and says no implementation evidence was produced, with no concrete source path/file:line or exact command/output. Row 114 names two scripts without line anchors or replayed output. Row 116 confirms artifact names exist but gives no line anchors or exact command/results validating what those artifacts enforce. Artifact existence and document summaries are not replayable evidence trails.
- [x] Accepted architecture rulings — preserved: CRM7 `BrowseDataTab` remains the bounded editable-grid winner; `EntityTableWidget` remains read-only; `RelationshipCanvas` remains interactive with persistence owned outside the canvas; page-builder retains independent child slots, version invalidation, and persisted drag/resize mechanics; role-token branding remains the accepted hierarchy.
- [x] Status, signature, and scope — verified: overall state remains `building`; Builder commit `52fb901ed697b11f9612a37b68019198a9cd3831` has a good GPG signature and changes only the ledger.
- [x] No false overall completion — verified: 113 rows remain `UNVERIFIABLE`.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --self-test && node scripts/generate-component-registry.mjs --check`
- Result: PASS — 174 components.
- Command: `node scripts/generate-feature-index.mjs --self-test && node scripts/generate-feature-index.mjs --check`
- Result: PASS — 661 rows, 28 modules, 57 capability areas.
- Command: `node scripts/check-route-surface-map.mjs`
- Result: PASS — 558 inventory routes, 558 mapped rows, 1,157 checks, 0 problems. This also exposes unrecorded drift from row 81's source document, which claims 553 routes.
- Command: `bash scripts/audit-routes.sh --inventory`
- Result: PASS — 47 routes across six apps: 18 public and 29 authenticated.
- Command: `node scripts/audit-role-capability-divergence.mjs`
- Result: expected fail-closed exit 2 — self-tests pass for 17 roles and 91 permissions, then the script refuses to claim zero divergence without live DB input.
- Command: `bash scripts/theme-gates.sh --quick`
- Result: FAIL — 10 passed, 1 failed; G11 reports 2 convertible inline colour styles. Row 14 records this honestly, so it does not license completion.
- Additional checks: exact inventory/ledger bijection and verdict arithmetic, direct reads of focused source anchors, all row-114/116 named-artifact existence checks, preserved-ruling grep, Builder diff scope, and GPG signature.

## Issues Found

1. Row 81 records current route-check output but omits the direct comparison to the document's 553-route claim. Current source measures 558, a five-route drift that must be stated explicitly.
2. Row 113 contains no replayable evidence at all: no file:line anchors and no exact command/output.
3. Row 114 names `scripts/check-doc-classification.mjs` and `scripts/estate-align.mjs`, but does not identify relevant lines or record command results. Merely naming scripts does not test the plan's 46-finding completion claims.
4. Row 116 lists scripts and a workflow that exist, but does not inspect their relevant lines or replay their checks. Existence does not establish current intake, reconciliation, archive, or lifecycle behavior.

## What Must Be Fixed

1. Amend row 81 to state that its source document's 553-route count has drifted to the current replayed 558-route result, while preserving the static-only/runtime boundary.
2. For row 113, cite the exact plan/source lines inspected and at least one concrete implementation/search command with its result, or state the exact unavailable evidence tied to those anchors.
3. For row 114, add relevant `file:line` anchors from the named scripts and exact command/output where replayable; do not treat script existence as validation of the 46 findings.
4. For row 116, add relevant `file:line` anchors and exact lifecycle/check command results. Keep the row `UNVERIFIABLE` for any intake, seven-repo, archive, or evidence-record behavior not actually replayed.
5. Preserve the exact 128-row inventory, current verdict arithmetic, accepted architecture rulings, and `building` status unless new primary evidence justifies a change.
