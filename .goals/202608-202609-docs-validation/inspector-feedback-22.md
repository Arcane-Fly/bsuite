# Inspector Feedback — Iteration 22

## Verdict: FAIL

## Acceptance Criteria Check

- [x] **Full-set index and arithmetic** — verified: the ledger has an exact 128-path dated-document bijection with no missing or duplicate paths. Verdict totals are 5 `VALIDATED-CURRENT`, 7 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 113 `UNVERIFIABLE`, summing to 128.
- [x] **Registries/indexes checked** — verified: `node scripts/generate-component-registry.mjs --check` reports 174 components, and the feature index independently parses to 661 entries.
- [x] **Customisation claims are bounded by source** — verified: `EntityTableWidget` is read-only; `RelationshipCanvas` is interactive but persistence belongs to `featureBuilderStore.saveDraft`; CRM7 Browse Data owns the editable-grid path through `commitBrowseCellEdits` / `commitBulkUpdate`.
- [x] **Conflict rulings preserved** — verified: the accepted page-builder, relationship-canvas, and Airtable-class data-surface rulings remain consistent with current source.
- [x] **Goal remains honestly incomplete** — verified: top-level status remains `building`; unsupported live Supabase catalog/advisor, authenticated browser, deployment, runtime RLS, and rendered-contrast claims remain `UNVERIFIABLE`.
- [ ] **No false completion / evidence trails** — FAILED: all ten target rows changed, but most replaced generic `E-OPEN` wording with generic “opened/replay later” prose. The ledger does not retain the concrete, document-specific source or command outcomes required by acceptance criterion 6.

## Quality Gate

- Command: exact dated-path inventory/bijection replay
- Result: PASS
- Details: 128 unique dated-document paths; no missing or duplicate ledger rows.
- Command: verdict arithmetic replay
- Result: PASS
- Details: 5 + 7 + 3 + 113 = 128.
- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: 174 components.
- Command: feature-index JSON parse/count
- Result: PASS
- Details: 661 entries.
- Command: `node scripts/check-document-completion.mjs --self-test`
- Result: PASS
- Details: 38/38 checks passed.
- Command: `node scripts/audit-doc-supersession.mjs --self-test`
- Result: PASS
- Details: 5/5 checks passed.
- Command: `node scripts/check-content-contrast-tier.mjs`
- Result: PASS within its static boundary
- Details: 457 package source files examined; 0 static violations. This does not prove rendered contrast.
- Command: `node scripts/check-speed-insights-route.mjs`
- Result: PASS within its static boundary
- Details: six apps scanned, six mounts found, zero React entrypoints missing the route prop. This does not prove deployed performance.
- Command: Builder commit scope/signature inspection for `559e04fa1024454138b293ce70e4bf92bd368332`
- Result: PASS
- Details: good GPG signature from Braden Lang; only the ledger was modified.

## Issues Found

1. **Row 74 lacks the explicitly required concrete JSON parse/count evidence.** Independent replay parsed `docs/20260826-bsuite-open-findings-register-v1.00W.json` successfully and found: `generated=2026-09-02`; 5 `rls_ownership` rows; security 2 attributable + 3 unattributable; 4 journey gaps; 3 config-without-editor findings; 1 bulk gap; 1 seam gap; 4 journeys walked and 4 not yet walked; 142 declared and 142 actual operator findings; 26 declared repeat offences; 11 themes; and 4 top-level `issues_filed` keys. The ledger records none of this and says only that the JSON was opened.
2. **Rows 20, 39, 40, 82, 83, and 88 do not retain a concrete local source/script result.** They correctly avoid unsupported live promotion, but “opened” plus instructions for a future replay is not evidence that the row was genuinely reviewed. Available bounded evidence includes the two production audit workflows and Dependabot configs for row 20; current `award_classifications` and `award_rate_cache` source readers for row 40; advisor/SECURITY DEFINER audit scripts and the parsed advisor allowlist shape for row 82; migration references to `is_developer_admin` for row 83; and the six-app Speed Insights route result plus CRM7 `PageEditorLauncher` source wiring for row 88.
3. **Rows 57 and 75 cite generic checker mechanics, not their own document-specific claims.** The 128-path inventory, 38/38 completion self-test, and 5/5 supersession self-test are useful bounded evidence, but the ledger must state which claims in each cited document those results establish and which claims remain unverified.
4. **Row 39 has no item-level replay.** A bounded check of its historical lint-config anchors produced no current matches. That outcome itself should be recorded and reconciled rather than replaced by a generic instruction to verify every item later.
5. **Row 90 is the strongest target row.** It records the concrete 457/0 static result, states the exact boundary, and correctly leaves rendered browser contrast unverified. The other target rows should follow this pattern.

## What Must Be Fixed

1. For rows 20, 39, 40, 57, 74, 75, 82, 83, and 88, record at least one concrete document-specific command or source-read outcome directly in the ledger, including exact counts, paths/symbols, or stdout where applicable.
2. For row 74, include the successful parse and concrete structural/count transcript listed above, while retaining `UNVERIFIABLE` for current tracker/deployment status.
3. For rows 57 and 75, map the 128-path, 38/38, and 5/5 results to specific claims in each document; do not imply that checker mechanics prove the documents’ broader completion verdicts.
4. Preserve `UNVERIFIABLE` for every claim requiring fresh live Supabase catalogs/advisors, authenticated deployed-browser observations, runtime RLS behaviour, deployment identity, current Core Web Vitals, or rendered contrast unless that live evidence is actually captured.
5. Keep the next Builder commit ledger-only and preserve the accepted 128-row arithmetic, registry/feature counts, architecture rulings, and `building` status.
