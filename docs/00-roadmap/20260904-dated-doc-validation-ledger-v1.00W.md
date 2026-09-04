---
kind: record
authority: none
owner: bsuite
---

# Dated-document genuine-validation ledger — 202608/202609, interim iteration 5

## Scope and method

This is an interim iteration-5 artefact for the genuine-validation audit. The authoritative
filesystem inventory is the deduplicated output of:

`find docs docs/plans -type f \( -name '202608*' -o -name '202609*' \) -print | sort -u`

That command returns **128** paths, not the goal's historical 126. The extra paths are
the later registry audit and this ledger itself, which matches the filename glob. I have
not silently dropped either. Each row below
has exactly one permitted verdict. `UNVERIFIABLE` means the document was opened and
triaged, but its claims need a focused source walk before they can be promoted; the
row states the precise next verification target rather than inheriting the document's
own checkboxes.

Fresh evidence captured for this pass:

- `node scripts/generate-component-registry.mjs --check` → `component-registry: in sync (174 components)`.
- Source grep for React Flow/xyflow across all six app source trees → **21** matching
	source files.
- Source grep for `@dnd-kit` → **26** matching source files.
- Source grep for `react-grid-layout` → **21** matching source files.
- Reviewed implementation anchors: `business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx`, `business-suite-unified/src/lib/schemaBuilderService.ts`, `business-suite-unified/src/lib/xyflowThemeTokens.ts`, `business-suite-unified/src/lib/feature-builder/types.ts`, `business-suite-unified/src/lib/feature-builder/index.ts`, `business-suite-unified/src/stores/featureBuilderStore.ts`, `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx`, `SortableColumnList.tsx`, `PreviewPane.tsx`, and `SchemaVisualizer.tsx`.

The source grep counts are footprint checks, not proof that every consumer is wired.
The world-class bar therefore remains conditional: a claim is not current merely
because a package or component exists.

## Conflict rulings

| Capability | Winner and evidence | Loser disposition |
|---|---|---|
| Page authoring renderer | The consolidated authoring direction wins: live page-builder components plus the existing customization validation record. Evidence: `EntityTableWidget.tsx` and `docs/audits/20260904-customization-authoring-genuine-validation-v1.00W.md`. | Earlier competing renderer proposals should carry a superseded pointer to `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`; do not maintain parallel renderer contracts. |
| Schema relationship canvas | React Flow/xyflow is the supported interactive canvas substrate: `RelationshipCanvas.tsx` has connectable nodes and `xyflowThemeTokens.ts` provides the token seam. This does **not** establish a functional persistence winner: `RelationshipCanvas.tsx` has no direct save call. Relationship edits flow through `EntityPanel.tsx` → `featureBuilderStore.ts` → `saveDraft()`. | `SchemaVisualizer.tsx` is read-only (`nodesConnectable={false}`), so static/diagram-only alternatives cannot evidence editable persistence. Retain the live canvas direction, but do not claim the canvas itself persists until that path is separately wired and validated. |
| Data surface | No editable Airtable-class winner is evidenced by `EntityTableWidget`: `business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx:176-177` only performs `.from(entityType).select('*')`. The genuine editable-grid winner for the verified admin path is `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254`, which enables editable columns, maps `CellEdit` objects, awaits `commitBrowseCellEdits`, invalidates the browse query, and throws on failed/partial persistence; `crm7/src/services/browseDataService.ts:801-839` groups those edits into `commitBulkUpdate` calls. The shared contract is async at `packages/data-grid/src/types.ts:181-188`, with rejection rollback/error handling in `packages/data-grid/src/DataGrid.tsx:440-452`. | `EntityTableWidget` remains the validated read/display widget, not an editable winner. Read-listing/report proposals remain separate; any document claiming that widget provides inline editing must be corrected or superseded. |
| Grid/layout | Per-card grid behavior wins only where `react-grid-layout` is wired with persisted layout state; a whole-page drag abstraction loses on independent resize/drag semantics. | Competing whole-block layouts are `DUPLICATE-CLUSTER` and should point at the persisted page-grid contract. |
| Branding | Three-tier branding/inheritance wins over local palette literals; role-token evidence is required. | Literal-colour specifications are `VALIDATED-DRIFTED` where source has moved to role tokens, and should be corrected by owners. |

## Complete inventory

Verdict evidence codes: `E-CARRY` cites the prior narrow audit and its named source
anchors; `E-REG` cites the fresh registry command; `E-OPEN` records the bounded file
opening plus the exact source walk still required. No `E-OPEN` row is presented as
validated.

| # | Path | Verdict | Evidence / exact remaining check |
|---:|---|---|---|
| 1 | docs/00-roadmap/20260808-data-workspace-implementation-plan-v1.00W.md | UNVERIFIABLE | E-OPEN; verify claimed workspace routes, tables, and persistence against `business-suite-unified/src`. |
| 2 | docs/00-roadmap/20260808-intake-and-onboarding-findings-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each onboarding finding against the owning page and Supabase query. |
| 3 | docs/00-roadmap/20260808-operator-decision-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each decision has a current consumer and no superseding ruling. |
| 4 | docs/00-roadmap/20260809-autonomous-run-report-v1.00W.md | UNVERIFIABLE | E-OPEN; verify reported commands, commits, and outputs from git and source. |
| 5 | docs/00-roadmap/20260809-class-a-baseline-before-the-batch-1.00W.json | UNVERIFIABLE | E-OPEN; parse JSON and replay every measured baseline against current source. |
| 6 | docs/00-roadmap/20260809-class-a-baseline-before-the-batch-v1.00F.md | UNVERIFIABLE | E-OPEN; compare frozen baseline claims with current source and registry. |
| 7 | docs/00-roadmap/20260809-pre-apply-capture-bsuite-1845-v1.00F.md | UNVERIFIABLE | E-OPEN; verify captured migration/apply state against git and live schema evidence. |
| 8 | docs/00-roadmap/20260809-shipped-to-production-v1.00W.md | UNVERIFIABLE | E-OPEN; verify deployment SHA and live URL for each shipped claim. |
| 9 | docs/00-roadmap/20260810-crm7-audit-remediation-decision-record-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each remediation in `crm7/src` and its current issue state. |
| 10 | docs/00-roadmap/20260810-dashboard-scope-ruling-v1.00F.md | UNVERIFIABLE | E-OPEN; compare scope with current dashboard files and routes. |
| 11 | docs/00-roadmap/20260810-document-provenance-who-creates-what-v1.00F.md | UNVERIFIABLE | E-OPEN; verify producer/consumer ownership from scripts and docs tooling. |
| 12 | docs/00-roadmap/20260810-four-axis-identity-model-and-backlog-sequence-v1.00W.md | UNVERIFIABLE | E-OPEN; verify identity fields and sequence consumers across apps. |
| 13 | docs/00-roadmap/20260810-r804-carryover-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify R80.4 carryover against `R80.4/src` and current package version. |
| 14 | docs/00-roadmap/20260810-theme-ui-ux-outstanding-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each outstanding theme item against role-token source. |
| 15 | docs/00-roadmap/20260811-crm7-full-spectrum-review-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each finding against `crm7/src` and tests. |
| 16 | docs/00-roadmap/20260811-financial-reports-retire-recommendation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify report routes, imports, and live data consumers. |
| 17 | docs/00-roadmap/20260811-persona-review-v1.00W.md | UNVERIFIABLE | E-OPEN; verify persona claims against route guards and rendered navigation. |
| 18 | docs/00-roadmap/20260811-retention-operator-rulings-v1.00W.md | UNVERIFIABLE | E-OPEN; verify retention implementation and policy references. |
| 19 | docs/00-roadmap/20260811-scheduled-job-coverage-investigation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify cron definitions and deployed jobs. |
| 20 | docs/00-roadmap/20260811-security-signal-analysis-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each signal with current security configuration and source. |
| 21 | docs/00-roadmap/20260812-estate-remaining-work-register-v1.00F.md | UNVERIFIABLE | E-OPEN; reconcile every item against live issues and source. |
| 22 | docs/00-roadmap/20260812-pi-orchestration-brief-v1.00W.md | UNVERIFIABLE | E-OPEN; verify agent/PI routing and referenced artifacts. |
| 23 | docs/00-roadmap/20260812-pi-run-handback-v1.00W.md | UNVERIFIABLE | E-OPEN; verify handback claims against commits and inbox records. |
| 24 | docs/00-roadmap/20260813-colour-gate-operator-items-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each colour item against computed theme tokens and rendered CSS. |
| 25 | docs/00-roadmap/20260827-one-row-one-truth-alignment-process-v1.00W.md | UNVERIFIABLE | E-OPEN; verify entity ownership and duplicate writes across apps. |
| 26 | docs/00-roadmap/20260903-corrective-run-commencement-prompt-v1.00W.md | UNVERIFIABLE | E-OPEN; verify referenced run entry points and outputs. |
| 27 | docs/00-roadmap/20260903-main-lane-continuation-prompt-v1.00W.md | UNVERIFIABLE | E-OPEN; verify current lane state and all referenced work items. |
| 28 | docs/20260802-d2c-theme-compliance-audit-v1.00A.md | UNVERIFIABLE | E-OPEN; verify each token and contrast claim against `packages/theme` and consumers. |
| 29 | docs/20260806-schema-authoring-and-tenancy-scope-v1.00A.md | UNVERIFIABLE | E-OPEN; verify schema ownership, tenant predicates, and authoring APIs. |
| 30 | docs/20260810-plan-dashboard-retirement-v1.00F.md | VALIDATED-CURRENT | Opened; current `AGENTS.md` and `CLAUDE.md` identify the plan dashboard as retired. |
| 31 | docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md | UNVERIFIABLE | E-OPEN; verify each directive against current issue/source state. |
| 32 | docs/20260813-portals-redesign-brainstorm-v1.00D.md | UNVERIFIABLE | E-OPEN; the document's route review identifies 14/20 curated destinations pointing to internal staff pages and correctly questions the portal-shell model, but it explicitly leaves product/security decisions open and has no live validation. Verify every portal destination, role guard, tenant-scoped data path, and authenticated browser flow before promotion. |
| 33 | docs/20260814-notes-backlog-verification-register-v1.00F.md | UNVERIFIABLE | E-OPEN; reconcile each note with current issue and source evidence. |
| 34 | docs/20260814-phase0-scope-remediation-delivery-v1.00W.md | UNVERIFIABLE | E-OPEN; verify delivery claims against commits and deployed route. |
| 35 | docs/20260814-portals-operator-rulings-v1.00A.md | UNVERIFIABLE | E-OPEN; verify ruling consumers and portal authorization. |
| 36 | docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md | UNVERIFIABLE | E-OPEN; verify Vercel settings and RES evidence against deployment data. |
| 37 | docs/20260817-au-compliance-audit-v1.00W.md | UNVERIFIABLE | E-OPEN; verify statutory claims and linked implementation boundaries. |
| 38 | docs/20260817-award-coverage-real-placement-scope-v1.00W.md | UNVERIFIABLE | E-OPEN; verify award/placement claims against `R80.4` and owning records. |
| 39 | docs/20260817-built-unlanded-and-unwired-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify every item by import, route, and runtime reachability. |
| 40 | docs/20260817-completion-proof-v1.00W.md | UNVERIFIABLE | E-OPEN; replay every claimed proof command and deployment observation. |
| 41 | docs/20260817-coverage-gap-closure-v1.00W.md | UNVERIFIABLE | E-OPEN; verify coverage claims against tests and source census. |
| 42 | docs/20260817-estate-completion-ledger-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile status rows with current issues, branches, and source. |
| 43 | docs/20260817-estate-remaining-work-register-v3.00W.md | UNVERIFIABLE | E-OPEN; verify all remaining-work rows against live issue state. |
| 44 | docs/20260817-operator-notes-backlog-d59-d92-status-v1.00W.md | UNVERIFIABLE | E-OPEN; verify D59–D92 status against source and issues. |
| 45 | docs/20260817-po-portal-verification-v1.00W.md | UNVERIFIABLE | E-OPEN; verify portal flows with authenticated browser evidence. |
| 46 | docs/20260817-recovered-verdict-backlog-v1.00W.md | UNVERIFIABLE | E-OPEN; verify recovered verdicts against primary records. |
| 47 | docs/20260819-estate-session-evidence-v1.00F.md | UNVERIFIABLE | E-OPEN; verify session evidence paths and commit SHAs. |
| 48 | docs/20260820-datum-directive-to-bsuite-lane-v1.00W.md | UNVERIFIABLE | E-OPEN; verify datum directive consumers and current lane output. |
| 49 | docs/20260821-airtable-class-data-surface-plan-v1.00F.md | VALIDATED-DRIFTED | Focused re-check: `business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx:176-177` proves the widget reads rows with `.select('*')` but contains no insert/update/edit/save/mutation path. The editable admin path is instead `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254` → `crm7/src/services/browseDataService.ts:801-839` → `commitBulkUpdate`; the plan's editable-widget claim has drifted and must not be treated as current. |
| 50 | docs/20260821-atmosphere-evaluation-v1.00F.md | UNVERIFIABLE | E-OPEN; verify atmosphere claims against current product and source. |
| 51 | docs/20260822-border-elevation-token-system-spec-v1.00F.md | VALIDATED-DRIFTED | Focused read confirms the shadow ramp, surface ladder, and resting accent-ring defects were implemented and the cited deployed/gate checks reportedly pass. The document's “verified” visual claim has drifted from its own acceptance bar: `scripts/visual-probe.js` is absent and many theme/consumer matrix cells were not inspected. Re-run the complete computed-style and visual matrix before treating the frozen spec as fully current. |
| 52 | docs/20260822-data-surface-consolidation-decision-v1.00D.md | DUPLICATE-CLUSTER | E-CARRY + corrected source ruling: the verified editable Airtable-class admin winner is `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254` → `crm7/src/services/browseDataService.ts:801-839` → `commitBulkUpdate`. `EntityTableWidget.tsx:176-177` is read/display only (`.from(entityType).select('*')`) and is not an editable winner. The verified path is limited to the admin browse surface and its DataGrid commit/rollback contract; it does not prove every data surface is editable. |
| 53 | docs/20260822-estate-doc-inventory-v1.00W.md | VALIDATED-DRIFTED | Inventory claim is 126; fresh `sort -u` inventory is 128 because the 20260904 registry audit and this ledger were added later. |
| 54 | docs/20260822-knowledge-classification-standard-v1.00A.md | UNVERIFIABLE | E-OPEN; verify classification consumers and generated indexes. |
| 55 | docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md | DUPLICATE-CLUSTER | Focused source walk: `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx:492` enables connectable nodes, but the canvas has no direct save call. `business-suite-unified/src/pages/Developer/FeatureBuilder/index.tsx:63-68` invokes `saveDraft()`, and `business-suite-unified/src/stores/featureBuilderStore.ts:107-137` obtains the authenticated user then performs Supabase `.update(payload)` or `.insert(payload)`. `SchemaVisualizer.tsx` is read-only (`nodesConnectable={false}`), so it is not evidence of editable relationships. Keep the interactive canvas plus verified store save path as the winner; competing schema-canvas specs should point here. |
| 56 | docs/20260822-session-findings-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify every finding against source and session evidence. |
| 57 | docs/20260824-doc-completion-bar-measured-v1.00F.md | UNVERIFIABLE | E-OPEN; replay its measurement commands and compare current docs. |
| 58 | docs/20260824-estate-execution-backlog-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile backlog with live issues and branches. |
| 59 | docs/20260824-preview-canary-publishing-standard-v1.00A.md | UNVERIFIABLE | E-OPEN; verify deployment configuration and canary route behavior. |
| 60 | docs/20260824-role-capabilities-merged-not-applied-root-cause-v1.00F.md | UNVERIFIABLE | E-OPEN; verify role capability reads/writes and deployment state. |
| 61 | docs/20260824-role-capabilities-zero-consumer-finding-v1.00F.md | UNVERIFIABLE | E-OPEN; verify consumers with source import census. |
| 62 | docs/20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md | UNVERIFIABLE | E-OPEN; verify product/library and licence claims against package manifests. |
| 63 | docs/20260825-braden-group-duplicated-documents-v1.00D.md | VALIDATED-CURRENT | Focused read records reproducible evidence of 162 byte-identical duplicate rows, including 10 sensitive rows, 29 unique rows protected from deletion, and no current third-party exposure. `scripts/remediate-duplicated-documents.mjs` is the named remediation path. The measured finding is current as an audit result; deletion remains intentionally pending operator approval and is not represented as completed remediation. |
| 64 | docs/20260825-consolidation-assessment-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each consolidation recommendation against current imports. |
| 65 | docs/20260825-estate-consolidated-findings-v1.00W.md | UNVERIFIABLE | E-OPEN; replay cited checks and reconcile findings. |
| 66 | docs/20260825-full-surface-clearance-prompt-v1.00A.md | UNVERIFIABLE | E-OPEN; verify each surface in route/source census. |
| 67 | docs/20260825-limb-a-is-detectable-limb-b-is-not-v1.00A.md | UNVERIFIABLE | E-OPEN; verify both limbs with source and runtime paths. |
| 68 | docs/20260825-operator-intent-lock-v1.00A.md | UNVERIFIABLE | E-OPEN; verify intent constraints against current governing instructions. |
| 69 | docs/20260825-operator-notes-register-d1-d103-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile D1–D103 with live issues and implementation. |
| 70 | docs/20260825-overnight-autonomous-run-v1.00A.md | UNVERIFIABLE | E-OPEN; verify run outputs and commit evidence. |
| 71 | docs/20260825-overnight-ninety-item-clearance-directive-v1.00A.md | UNVERIFIABLE | E-OPEN; verify all 90 items against current primary state. |
| 72 | docs/20260825-remeasured-clearance-brief-v1.00A.md | UNVERIFIABLE | E-OPEN; replay measurements and compare current results. |
| 73 | docs/20260826-backend-surface-asymmetries-v1.00D.md | UNVERIFIABLE | E-OPEN; verify API/database asymmetries against source and schema. |
| 74 | docs/20260826-bsuite-open-findings-register-v1.00W.json | UNVERIFIABLE | E-OPEN; parse JSON and reconcile every finding with current issues. |
| 75 | docs/20260826-doc-completion-verdict-v1.00A.md | UNVERIFIABLE | E-OPEN; replay its document-completion checks. |
| 76 | docs/20260826-four-decisions-for-braden-v1.00D.md | UNVERIFIABLE | E-OPEN; verify each decision's consumer and current status. |
| 77 | docs/20260826-futurebuild-production-acceptance-v1.00D.md | UNVERIFIABLE | E-OPEN; verify acceptance claims with deployed evidence. |
| 78 | docs/20260826-morning-brief-v1.00W.md | UNVERIFIABLE | E-OPEN; verify dated operational facts against current state. |
| 79 | docs/20260826-morning-ledger-v1.00A.md | UNVERIFIABLE | E-OPEN; reconcile rows with primary source state. |
| 80 | docs/20260826-page-builder-2x-layout-in-production-measured-v1.00A.md | VALIDATED-DRIFTED | The implementation mechanics are current: `packages/page-builder/src/canvasCardLayout.tsx:140-164` derives independent child slots and defaults cards to width 6; `packages/page-builder/src/DraggableCardPage.tsx:121,171` uses that builder; `packages/page-builder/src/usePageGridLayout.ts:71,103,159-170` versions persisted layouts and invalidates stale versions; `packages/page-builder/src/PageGridLayout.tsx:1612-1621` persists responsive drag/resize changes. The document's production measurements remain bounded historical evidence (20 pages, worst CLS 0.0155, and 1,068/1,729 omitted-width usages), not an estate-wide current measurement; re-run the production sample before using those numbers as present-day performance claims. |
| 81 | docs/20260826-route-surface-map-v1.00W.md | UNVERIFIABLE | E-OPEN; replay route census across all six apps. |
| 82 | docs/20260826-supabase-advisor-posture-measured-v1.00A.md | UNVERIFIABLE | E-OPEN; re-run advisors/live catalog checks. |
| 83 | docs/20260826-the-seven-anon-security-definer-functions-v1.00A.md | UNVERIFIABLE | E-OPEN; verify functions with `pg_get_functiondef` and source callers. |
| 84 | docs/20260828-messaging-platform-design-v1.00W.md | UNVERIFIABLE | E-OPEN; verify messaging routes, tables, and realtime wiring. |
| 85 | docs/20260828-unearned-completion-markers-triage-plan-v1.00W.md | UNVERIFIABLE | E-OPEN; replay each marker check against current records. |
| 86 | docs/20260829-enhanceddatatable-is-not-a-one-edit-conversion-v1.00W.md | VALIDATED-DRIFTED | Current source supports the architectural warning but not a blanket conversion: `crm7/src/components/common/DataTable/EnhancedDataTable.tsx:597-599` consumes `row.original` for display/click behaviour, while the document's cited footprint was historical. The verified persistence-capable alternative is the separate `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254` path backed by `crm7/src/services/browseDataService.ts:801-839`; shared `packages/data-grid/src/types.ts:53-104,181-188` requires host edit configuration/renderers and an async callback. Verdict: retain the separation between read-listing tables and editable grids, but re-measure the document's numeric usage counts before treating them as current. |
| 87 | docs/20260829-what-the-capability-denials-actually-do-v1.00D.md | UNVERIFIABLE | E-OPEN; verify denial behavior through guards, RLS, and tests. |
| 88 | docs/20260829-why-a-good-speed-score-and-a-slow-app-v1.00D.md | UNVERIFIABLE | E-OPEN; reproduce performance evidence and inspect network/render paths. |
| 89 | docs/20260830-nav-route-reachability-across-the-five-non-crm7-apps-v1.00D.md | VALIDATED-CURRENT | Focused read documents corrected app-specific instrumentation and positive controls: zero unreachable nav entries in BSU, throughput, conduit, and braden; R80.4 is correctly `n/a`. The prior failures were instrumentation errors, and the bounded applicable-app result is supported by the corrected route audit. |
| 90 | docs/20260830-text-contrast-across-the-estate-v1.00D.md | VALIDATED-DRIFTED | Focused read confirms three measured AA failures were fixed/recorded and the P7 instrumentation defects were corrected. It also states that 104 app-local claims remain unverified, so the document cannot support a complete estate-wide current claim. Re-run the computed-style contrast sweep across the remaining surfaces before promoting the broad audit. |
| 91 | docs/20260903-visual-authoring-consolidation-decision-v1.00D.md | VALIDATED-CURRENT | E-CARRY; prior narrow audit confirmed the consolidated authoring direction and source anchors. |
| 92 | docs/20260904-component-registry-and-storybook-consumer-audit-v1.00W.md | VALIDATED-DRIFTED | E-REG; generator is in sync at 174 components, but Storybook consumer claims require the pending focused consumer walk. |
| 93 | docs/archive/20260805-stash-cleanup-manifest-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each manifest path and whether the archived object still exists. |
| 94 | docs/audits/20260813-bsuite-world-class-brainstorm-v1.00D.md | UNVERIFIABLE | E-OPEN; verify each world-class claim against actual component source and UX evidence. |
| 95 | docs/audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md | VALIDATED-CURRENT | E-CARRY; prior audit is the accepted in-depth carry-forward for estate remediation evidence. |
| 96 | docs/audits/20260904-customization-authoring-genuine-validation-v1.00W.md | VALIDATED-CURRENT | E-CARRY; this pass extends its source-backed customization, canvas, schema, and table evidence. |
| 97 | docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json | UNVERIFIABLE | E-OPEN; parse JSON and verify every journey node against onboarding routes. |
| 98 | docs/intake/20260903-operator-week-in-review-audit-brief-v1.00F.md | UNVERIFIABLE | E-OPEN; verify brief claims against current primary records. |
| 99 | docs/plans/20260802-d2c-theme-compliance-audit-refined-v1.00W.md | UNVERIFIABLE | E-OPEN; verify refined claims against shared theme and all consumers. |
| 100 | docs/plans/20260803-theme-conformance-dod-v1.00W.md | UNVERIFIABLE | E-OPEN; replay conformance checks against current CSS/source. |
| 101 | docs/plans/20260805-operator-register-completion-program-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile program rows with live issue state. |
| 102 | docs/plans/20260805-plan-triage-open-work-register-v1.00W.json | UNVERIFIABLE | E-OPEN; parse JSON and compare all rows with current issues. |
| 103 | docs/plans/20260805-plan-triage-open-work-register-v1.00W.md | UNVERIFIABLE | E-OPEN; compare Markdown register with its JSON companion and live issues. |
| 104 | docs/plans/20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md | UNVERIFIABLE | E-OPEN; verify reporting schema, bulk data paths, and tenant scope. |
| 105 | docs/plans/20260807-data-platform-completion-program-v1.00D.md | UNVERIFIABLE | E-OPEN; verify platform completion claims against source and schema. |
| 106 | docs/plans/20260810-people-organisations-onboarding-design-v1.00D.md | UNVERIFIABLE | E-OPEN; verify design against onboarding forms, entities, and routes. |
| 107 | docs/plans/20260810-people-organisations-onboarding-implementation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify implementation claims with imports, writes, and tests. |
| 108 | docs/plans/20260811-award-engine-to-zero-refined-v1.00W.md | UNVERIFIABLE | E-OPEN; verify award-engine claims against R80.4 calculations and known values. |
| 109 | docs/plans/20260811-dataplatform-completion-refined-v1.00W.md | UNVERIFIABLE | E-OPEN; verify refined completion claims against current source/schema. |
| 110 | docs/plans/20260811-feature-builder-world-class-refined-v1.00W.md | VALIDATED-DRIFTED | E-CARRY + source anchors; feature-builder exists, but “world class/fewest clicks” remains unproven until interaction and persistence gaps are closed. |
| 111 | docs/plans/20260811-post-persona-execution-refined-v1.00W.md | UNVERIFIABLE | E-OPEN; verify persona execution against current routes and guards. |
| 112 | docs/plans/20260814-nav-route-remediation-v1.00D.md | UNVERIFIABLE | E-OPEN; replay navigation route checks across apps. |
| 113 | docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md | UNVERIFIABLE | E-OPEN; verify every portal/surface class against source and route map. |
| 114 | docs/plans/20260817-estate-completion-plan-v1.00D.md | UNVERIFIABLE | E-OPEN; reconcile plan completion claims with current issues and branches. |
| 115 | docs/plans/20260824-agent-compliance-enforcement-refined-v1.00W.md | UNVERIFIABLE | E-OPEN; verify enforcement hooks and instruction-file consumers. |
| 116 | docs/plans/20260827-estate-lifecycle-process-refined-v1.00D.md | UNVERIFIABLE | E-OPEN; verify lifecycle process against scripts and live records. |
| 117 | docs/plans/20260901-workflow-canvas-implementation-v1.00A.md | DUPLICATE-CLUSTER | Focused source walk confirms the live shared implementation: `useWorkflowController.ts` schedules graph changes with a 900 ms debounce, saves through `saveVersionGraph`, flushes pending edits on unmount, and exposes draft/publish/rename/duplicate flows. `service.ts` updates `workflow_definition_versions.graph` only for draft rows; `crm7/src/components/workflows/WorkflowCanvasInner.tsx` is the crm7 adapter. This is direct persistence evidence, not the former `E-OPEN` inference; consolidate competing proposals on this shared controller/service path. |
| 118 | docs/plans/20260903-jodie-automation-notifications-design-v1.00W.md | UNVERIFIABLE | E-OPEN; verify notification design against routes, API handlers, and data writes. |
| 119 | docs/plans/20260903-jodie-automation-notifications-implementation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify implementation with source imports, tests, and runtime calls. |
| 120 | docs/plans/codehouse-parity/20260817-parity-569-pay-item-groups-spec-v1.00W.md | UNVERIFIABLE | E-OPEN; verify parity claims against R80.4 and source-backed pay-item groups. |
| 121 | docs/plans/inputs/20260807-document-authoring-audit-raw.json | UNVERIFIABLE | E-OPEN; parse raw input and verify each cited authoring claim against source. |
| 122 | docs/plans/inputs/20260814-portals-lane-kickoff-prompt-v1.00W.md | UNVERIFIABLE | E-OPEN; verify prompt assumptions against portal source and routes. |
| 123 | docs/plans/loop-contracts/20260817-recruitment-comms-rams-loop-contract-v1.00F.md | UNVERIFIABLE | E-OPEN; verify loop contract against recruitment communications implementation. |
| 124 | docs/recovered/20260808-standards-do-not-name-providers-finding-v1.00A.md | UNVERIFIABLE | E-OPEN; verify provider-neutrality claim against current AI configuration and docs. |
| 125 | docs/runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md | UNVERIFIABLE | E-OPEN; replay rehearsal commands locally without applying a migration. |
| 126 | docs/validation/20260804-plans-closure-audit-v1.00W.md | UNVERIFIABLE | E-OPEN; replay closure audit against current plans and issues. |
| 127 | docs/validation/20260805-operator-notes-defect-register-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile every defect with current source and issue state. |
| 128 | docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md | VALIDATED-CURRENT | E-REG; this ledger is present in the exact mandated `find docs docs/plans -type f \( -name '202608*' -o -name '202609*' \) -print \| sort -u` inventory and is represented once here. Its interim status and remaining gap are stated below. |

## Named registries and indexes

| Path | Verdict | Genuine check |
|---|---|---|
| `docs/00-roadmap/BSUITE-COMPONENT-REGISTRY.md` | VALIDATED-DRIFTED | Opened and compared with `node scripts/generate-component-registry.mjs --check`: generated registry is synchronised at 174 components. Any prose count differing from 174 is drift; the generator is authoritative. |
| `docs/00-roadmap/BSUITE-FEATURE-INDEX.md` | VALIDATED-DRIFTED | Opened; its prose headline says **662 features**, while the generated section says **661 features**. Fresh related-family source grep `grep -rl 'reactflow\|@xyflow\|ReactFlow' business-suite-unified/src crm7/src conduit/src braden/src R80.4/src throughput/src --include='*.ts' --include='*.tsx' \| sort -u \| wc -l` → **21** files. The generated section remains authoritative for its own 661-row output; the one-feature discrepancy and rows lacking a source/route/test require reconciliation. |
| `docs/00-roadmap/bsuite-component-registry.json` | VALIDATED-CURRENT | Parsed successfully; generator check reports `in sync (174 components)`. This is the machine-readable registry, with the generated output treated as authoritative over prose. |

## Iteration 5 focused source findings

Iteration 5 reviewed rows **32, 51, 63, 89, and 90**, while carrying forward the
focused evidence for rows **52, 55, 80, 86, and 117**. The ten-row pass is explicit:

| Row | Result | Boundary preserved |
|---:|---|---|
| 32 | UNVERIFIABLE | Substantial portal route analysis, but no authenticated live validation and open product/security decisions. |
| 51 | VALIDATED-DRIFTED | Implementation and reported deployment checks hold; the complete visual matrix does not. |
| 52 | DUPLICATE-CLUSTER | Editable admin browse/DataGrid path wins; `EntityTableWidget` is read/display only. |
| 55 | DUPLICATE-CLUSTER | Interactive relationship canvas plus store save path wins; read-only visualizer is not an editor. |
| 63 | VALIDATED-CURRENT | Duplicate measurements are reproducible; operator-controlled deletion is pending, not falsely marked remediated. |
| 80 | VALIDATED-DRIFTED | Persisted per-card layout mechanics hold; historical production measurements are not current estate-wide proof. |
| 86 | VALIDATED-DRIFTED | Read-listing and editable-grid separation holds; historical usage counts require remeasurement. |
| 89 | VALIDATED-CURRENT | Corrected positive-control route audit supports zero unreachable entries in applicable apps; R80.4 is `n/a`. |
| 90 | VALIDATED-DRIFTED | Three measured failures/fixes hold, but 104 app-local claims remain unverified. |
| 117 | DUPLICATE-CLUSTER | Shared workflow controller/service persistence path wins over competing proposals. |

This pass therefore promotes only bounded claims. “Current” means the measured or
source-backed claim itself is supported; it does not convert an unresolved operator
decision or an incomplete estate-wide sweep into completion.

## Focused source findings and iteration-2 remainder

The customization bar is not inherited from the plans. `RelationshipCanvas.tsx`,
`SortableColumnList.tsx`, `PreviewPane.tsx`, `featureBuilderStore.ts`, and
`SchemaVisualizer.tsx` are real implementation anchors; their existence validates
capability, not the stronger claims “world class”, “highest UX”, or “fewest clicks”.
The relationship canvas is interactive but non-persisting in its own component;
the validated feature-builder save path is `EntityPanel.tsx` →
`featureBuilderStore.ts` → `saveDraft()`. `SchemaVisualizer.tsx` remains read-only.
Iteration 4 corrected the row-52 data-surface ruling: `EntityTableWidget.tsx` is read-only,
while `BrowseDataTab.tsx` is the verified editable admin winner. Its exact path enables
editable columns at lines 750–751, maps and awaits edits at lines 754–764, invalidates
the query at lines 768–771, throws on failed/partial persistence at lines 773–794, and
mounts the shared `DataGrid` edit callback at lines 1247–1254. This is an admin-surface
proof with explicit limits, not an estate-wide Airtable claim. The feature index also
requires reconciliation of its 662 prose headline against 661 generated features; the
fresh React Flow/xyflow footprint across all six app source trees is 21 matching source files.
Iteration 3 performed focused source walks for the editable data path, layout persistence,
and schema-builder save path. Many more iterations are required before the remaining
rows can be deep-validated; this ledger does not compress that incompleteness into
false completion. The next iterations must perform the interaction-level walk: create/edit/reorder/preview,
persist, reload, keyboard/focus, empty/loading/error states, and sibling-surface
enumeration. It must also open the exact registry/index prose and compare every
feature row to a source file, route, test, or explicit `UNVERIFIABLE` disposition.

Summary: **128 dated paths inventoried; 128 assigned a verdict; 7 VALIDATED-CURRENT;
8 VALIDATED-DRIFTED; 3 DUPLICATE-CLUSTER; 110 UNVERIFIABLE.** Separately, **3 named
registries/indexes** are assigned verdicts: 1 VALIDATED-CURRENT and 2
VALIDATED-DRIFTED. This remains an interim iteration-5 artefact. The remaining gap is
explicitly **110/110 inventory rows still UNVERIFIABLE (85.9375%)**, so **100% claim-level
validation has not been achieved** and no world-class/completeness conclusion is licensed.
Many more iterations are required for the full-set criterion; that incompleteness is
reported plainly rather than represented as completion. No source, migration, or audited
document was edited or deleted; only this ledger and its goal status were updated.
