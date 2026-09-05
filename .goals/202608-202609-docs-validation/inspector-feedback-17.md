# Inspector Feedback — Iteration 17

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Authoritative inventory and ledger arithmetic — verified independently: the mandated deduplicated `find` inventory returns 128 paths; the ledger has 128 sequential rows, 128 unique paths, no missing or extra path, and exact verdict totals `5 VALIDATED-CURRENT / 7 VALIDATED-DRIFTED / 3 DUPLICATE-CLUSTER / 0 SUPERSEDED / 113 UNVERIFIABLE`.
- [x] Registry and index gates — verified: component-registry self-test passes 14 cases and `--check` reports 174 components; feature-index self-test passes 12 cases and `--check` reports 661 rows.
- [x] Prior architecture rulings — verified preserved: CRM7 `BrowseDataTab` plus `commitBulkUpdate` remains the bounded editable-grid winner; `EntityTableWidget` remains read-only; `RelationshipCanvas` remains interactive with no direct save call; page-builder source retains independent child slots, responsive drag/resize callbacks, and versioned layout persistence.
- [x] Status, signature, and commit scope — verified: goal status remains `building`; Builder commit `2db045b632b1c36b6066396debc75bb69588bb53` has a good GPG signature and changes only `docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md`.
- [ ] Assigned focused-row validation — FAILED: none of rows 1, 14, 80, 81, 87, 89, 113, 114, 115, or 116 changed in the Builder commit. Rows 1, 81, 87, and 113–116 still contain generic `E-OPEN` or future-check prose rather than the direct source reads or replayable commands required by acceptance criterion 6. Rows 14, 80, and 89 merely retain earlier evidence. Broad iteration-17 prose elsewhere in the ledger does not satisfy the assigned row-level reconciliation.
- [ ] No false completion/evidence trail — FAILED for this iteration: direct reads show the assigned documents contain substantive factual and completion claims, but the corresponding rows were not reconciled against those claims. In particular, current route commands are available for row 81, capability source/baseline references are available for row 87, and the plan documents in rows 113–116 require claim-by-claim primary-source reconciliation rather than generic future instructions.
- [x] No false overall completion — verified: 113 rows remain `UNVERIFIABLE`, and overall status correctly remains `building`.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --self-test && node scripts/generate-component-registry.mjs --check`
- Result: PASS — self-test reports 14 cases; registry is in sync at 174 components.
- Command: `node scripts/generate-feature-index.mjs --self-test && node scripts/generate-feature-index.mjs --check`
- Result: PASS — self-test reports 12 cases; feature index is in sync at 661 rows.
- Command: `bash scripts/audit-routes.sh --inventory`
- Result: PASS — 47 routes across 6 apps (18 public, 29 authenticated); inventory valid.
- Command: `node scripts/check-route-surface-map.mjs`
- Result: PASS — 558 inventory routes, 558 mapped rows, and 1,157 checks with 0 problems.
- Command: `bash scripts/theme-gates.sh --quick`
- Result: FAIL — 10 passed, 1 failed; G11 reports 2 convertible inline colour styles and exits 1. This current drift is already present in retained row-14 evidence, but the target Builder commit did not perform the assigned focused-row update.
- Additional checks: exact 128-path ledger bijection/arithmetic parser, direct reads of all ten assigned source documents, target-commit diff, GPG signature, preserved-ruling markers, and page-builder source anchors.

## Issues Found

1. The Builder substituted a general customisation/source narrative for the explicitly assigned ten-row pass. The patch contains no change to any assigned row.
2. Rows 1, 81, 87, and 113–116 remain generic placeholders. They do not identify or record the actual claims read from their documents, the files/commands used to test those claims, or the resulting bounded findings.
3. Rows 14, 80, and 89 retain useful prior evidence, but retaining prior text is not evidence that iteration 17 completed its assigned revalidation.
4. The current theme quick gate remains red on G11. This does not invalidate the ledger's conservative row-14 verdict, but it confirms that no completion claim is licensed.

## What Must Be Fixed

1. Perform the assigned focused validation for every one of rows 1, 14, 80, 81, 87, 89, and 113–116. For each row, enumerate the document's material claims and record the direct source read or exact replayable command/result used to test them.
2. Replace generic `E-OPEN` text with precise bounded findings. Where a claim cannot be tested, state the exact unavailable primary evidence or runtime action needed; do not use broad phrases such as “verify against source”.
3. Preserve the existing architecture rulings and conservative verdict arithmetic unless new primary evidence justifies a change.
4. Do not treat general ledger prose, a document's own assertions, or unchanged evidence from prior iterations as completion of the focused-row assignment.
