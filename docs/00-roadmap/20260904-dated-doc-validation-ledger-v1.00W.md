---
kind: record
authority: none
owner: bsuite
status: building
iteration: 23
---

# Dated-document genuine-validation ledger — 202608/202609, interim iteration 23

## Scope and method

This is an interim iteration-23 artefact for the genuine-validation audit. The authoritative
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
- `bash scripts/theme-gates.sh --quick` → `10 passed, 1 failed`; `G11 -> 2 convertible inline colour style(s)`; outstanding gate: `G11 — no NEW convertible inline colour styles`.
- `node scripts/audit-role-capability-divergence.mjs` → stdout exactly `self-tests passed (17 roles, 91 permissions)`; stderr exactly `::error::Provide ROLE_CAPABILITIES_JSON (CI, via psql) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local). Refusing to report a divergence of zero against a database I never reached.`; exit 2.
- `bash scripts/audit-routes.sh --inventory` → **47 routes across 6 apps (18 public, 29 authenticated)**; this is an inventory check, not authenticated reachability proof.
- `node scripts/check-route-surface-map.mjs` → **1,157 items checked, 0 problems**; inventory 558 and mapped rows 558. This is static map consistency, not runtime reachability, table reachability, or RLS proof.
- `node scripts/check-content-contrast-tier.mjs` → **457 source files examined; 0 violations**. This is a static source scan, not rendered browser contrast evidence.
- Source grep for React Flow/xyflow across all six app source trees → **21** matching
  source files.
- Dependency footprint command (run from the bsuite root): `find business-suite-unified/src crm7/src conduit/src braden/src R80.4/src throughput/src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 grep -l -F '@dnd-kit' | sort -u | wc -l` → **@dnd-kit=25**. The scope is exactly those six app source roots and TypeScript files; tests are not excluded, and `sort -u` deduplicates paths before counting matching files.
- Dependency footprint command (same six-root, TypeScript scope): `find business-suite-unified/src crm7/src conduit/src braden/src R80.4/src throughput/src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 grep -l -F 'react-grid-layout' | sort -u | wc -l` → **react-grid-layout=19**. Tests are not excluded; `grep -l` selects each matching file and `sort -u` ensures each path contributes at most once.
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
| 1 | docs/00-roadmap/20260808-data-workspace-implementation-plan-v1.00W.md | UNVERIFIABLE | Source walk confirms bounded editable-admin mechanics at `crm7/src/components/admin/BrowseDataTab.tsx:5-17` and `crm7/src/services/browseDataService.ts:801-839`; this supports route/RPC mechanics only. No live entity/field census, usage coverage, persistence replay, authentication, or RLS proof was produced. |
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
| 14 | docs/00-roadmap/20260810-theme-ui-ux-outstanding-register-v1.00W.md | UNVERIFIABLE | `bash scripts/theme-gates.sh --quick` returned `10 passed, 1 failed`; G11 reports `2 convertible inline colour style(s)`. Role-token anchors remain `packages/theme/src/css/vars.css:152`, `:154`, and `:165-166`. No codemod, authenticated browser replay, or deployed-domain proof was produced; the G11 failure remains open. |
| 15 | docs/00-roadmap/20260811-crm7-full-spectrum-review-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each finding against `crm7/src` and tests. |
| 16 | docs/00-roadmap/20260811-financial-reports-retire-recommendation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify report routes, imports, and live data consumers. |
| 17 | docs/00-roadmap/20260811-persona-review-v1.00W.md | UNVERIFIABLE | E-OPEN; verify persona claims against route guards and rendered navigation. |
| 18 | docs/00-roadmap/20260811-retention-operator-rulings-v1.00W.md | UNVERIFIABLE | E-OPEN; verify retention implementation and policy references. |
| 19 | docs/00-roadmap/20260811-scheduled-job-coverage-investigation-v1.00W.md | UNVERIFIABLE | E-OPEN; verify cron definitions and deployed jobs. |
| 20 | docs/00-roadmap/20260811-security-signal-analysis-v1.00W.md | UNVERIFIABLE | The document was opened and its security-signal claims were not promoted from prose. Verify each signal against current security configuration, live catalog evidence, source callers, and an authenticated/deployed observation; static source checks cannot establish active exposure or remediation. |
| 21 | docs/00-roadmap/20260812-estate-remaining-work-register-v1.00F.md | UNVERIFIABLE | E-OPEN; reconcile every item against live issues and source. |
| 22 | docs/00-roadmap/20260812-pi-orchestration-brief-v1.00W.md | UNVERIFIABLE | E-OPEN; verify agent/PI routing and referenced artifacts. |
| 23 | docs/00-roadmap/20260812-pi-run-handback-v1.00W.md | UNVERIFIABLE | E-OPEN; verify handback claims against commits and inbox records. |
| 24 | docs/00-roadmap/20260813-colour-gate-operator-items-v1.00W.md | UNVERIFIABLE | E-OPEN; verify each colour item against computed theme tokens and rendered CSS. |
| 25 | docs/00-roadmap/20260827-one-row-one-truth-alignment-process-v1.00W.md | UNVERIFIABLE | E-OPEN; verify entity ownership and duplicate writes across apps. |
| 26 | docs/00-roadmap/20260903-corrective-run-commencement-prompt-v1.00W.md | UNVERIFIABLE | E-OPEN; verify referenced run entry points and outputs. |
| 27 | docs/00-roadmap/20260903-main-lane-continuation-prompt-v1.00W.md | UNVERIFIABLE | E-OPEN; verify current lane state and all referenced work items. |
| 28 | docs/20260802-d2c-theme-compliance-audit-v1.00A.md | UNVERIFIABLE | E-OPEN; verify each token and contrast claim against `packages/theme` and consumers. |
| 29 | docs/20260806-schema-authoring-and-tenancy-scope-v1.00A.md | UNVERIFIABLE | Focused source/schema check: platform entities and field definitions are system-owned with nullable `tenant_id` values; normal writes are blocked by existing RLS, and `tenant_schema_layout` is the intended per-tenant overlay. Exact migration anchors in `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql` are `:18256` (`tenant_schema_layout`), `:18280` (`save_schema_layout_position`), `:20353` (`tenant_subtree_ids`), and `:21744` (`update_platform_entity_label`). Platform/enterprise/org-authority distinctions and the authoring API remain only partly implemented; live catalogue/RLS/authenticated authoring validation remains open, so these anchors are source evidence rather than replayable live proof. |
| 30 | docs/20260810-plan-dashboard-retirement-v1.00F.md | VALIDATED-CURRENT | Opened; current `AGENTS.md` and `CLAUDE.md` identify the plan dashboard as retired. |
| 31 | docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md | UNVERIFIABLE | E-OPEN; verify each directive against current issue/source state. |
| 32 | docs/20260813-portals-redesign-brainstorm-v1.00D.md | UNVERIFIABLE | E-OPEN; the document's route review identifies 14/20 curated destinations pointing to internal staff pages and correctly questions the portal-shell model, but it explicitly leaves product/security decisions open and has no live validation. Verify every portal destination, role guard, tenant-scoped data path, and authenticated browser flow before promotion. |
| 33 | docs/20260814-notes-backlog-verification-register-v1.00F.md | UNVERIFIABLE | E-OPEN; reconcile each note with current issue and source evidence. |
| 34 | docs/20260814-phase0-scope-remediation-delivery-v1.00W.md | UNVERIFIABLE | E-OPEN; verify delivery claims against commits and deployed route. |
| 35 | docs/20260814-portals-operator-rulings-v1.00A.md | UNVERIFIABLE | E-OPEN; verify ruling consumers and portal authorization. |
| 36 | docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md | UNVERIFIABLE | E-OPEN; verify Vercel settings and RES evidence against deployment data. |
| 37 | docs/20260817-au-compliance-audit-v1.00W.md | UNVERIFIABLE | E-OPEN; verify statutory claims and linked implementation boundaries. |
| 38 | docs/20260817-award-coverage-real-placement-scope-v1.00W.md | UNVERIFIABLE | E-OPEN; verify award/placement claims against `R80.4` and owning records. |
| 39 | docs/20260817-built-unlanded-and-unwired-register-v1.00W.md | UNVERIFIABLE | The register was opened, but no complete item-by-item replay was retained. Verify every item by source import, route registration, saved-state/read-back, authenticated browser reachability, deployment identity, and live data/RLS behaviour; an import or route inventory alone is insufficient. |
| 40 | docs/20260817-completion-proof-v1.00W.md | UNVERIFIABLE | The proof document was opened, but its historical assertions were not treated as current evidence. Replay each named command and deployment observation with captured output, then test the claimed user flow through the deployed authenticated surface; source inspection cannot substitute for those observations. |
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
| 51 | docs/20260822-border-elevation-token-system-spec-v1.00F.md | UNVERIFIABLE | E-OPEN; current source inspection is still insufficient to validate the document's deployment/gate claims. `scripts/visual-probe.js` is absent, and no current computed-style or deployed visual matrix was replayed. Re-run the named gates and the complete theme/consumer matrix before promotion. |
| 52 | docs/20260822-data-surface-consolidation-decision-v1.00D.md | DUPLICATE-CLUSTER | E-CARRY + corrected source ruling: the verified editable Airtable-class admin winner is `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254` → `crm7/src/services/browseDataService.ts:801-839` → `commitBulkUpdate`. `EntityTableWidget.tsx:176-177` is read/display only (`.from(entityType).select('*')`) and is not an editable winner. The verified path is limited to the admin browse surface and its DataGrid commit/rollback contract; it does not prove every data surface is editable. |
| 53 | docs/20260822-estate-doc-inventory-v1.00W.md | VALIDATED-DRIFTED | Inventory claim is 126; fresh `sort -u` inventory is 128 because the 20260904 registry audit and this ledger were added later. |
| 54 | docs/20260822-knowledge-classification-standard-v1.00A.md | UNVERIFIABLE | E-OPEN; verify classification consumers and generated indexes. |
| 55 | docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md | DUPLICATE-CLUSTER | Focused source walk: `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx:492` enables connectable nodes, but the canvas has no direct save call. `business-suite-unified/src/pages/Developer/FeatureBuilder/index.tsx:63-68` invokes `saveDraft()`, and `business-suite-unified/src/stores/featureBuilderStore.ts:107-137` obtains the authenticated user then performs Supabase `.update(payload)` or `.insert(payload)`. `SchemaVisualizer.tsx` is read-only (`nodesConnectable={false}`), so it is not evidence of editable relationships. Keep the interactive canvas plus verified store save path as the winner; competing schema-canvas specs should point here. |
| 56 | docs/20260822-session-findings-register-v1.00W.md | UNVERIFIABLE | E-OPEN; verify every finding against source and session evidence. |
| 57 | docs/20260824-doc-completion-bar-measured-v1.00F.md | UNVERIFIABLE | The completion-bar document was opened. Replay its measurement commands against the current dated-document inventory and compare each result with the ledger; the existing 128-path inventory and 38/38 completion self-test validate tooling/counts only, not every document claim or closure state. |
| 58 | docs/20260824-estate-execution-backlog-v1.00W.md | UNVERIFIABLE | E-OPEN; reconcile backlog with live issues and branches. |
| 59 | docs/20260824-preview-canary-publishing-standard-v1.00A.md | UNVERIFIABLE | E-OPEN; verify deployment configuration and canary route behavior. |
| 60 | docs/20260824-role-capabilities-merged-not-applied-root-cause-v1.00F.md | UNVERIFIABLE | Source/baseline evidence only: the document and migration/source references were opened, but no replayable catalogue SQL/result transcript is retained for migration application, policies, or functions. Local replay via `node scripts/audit-role-capability-divergence.mjs` produced stdout exactly `self-tests passed (17 roles, 91 permissions)` and stderr exactly `::error::Provide ROLE_CAPABILITIES_JSON (CI, via psql) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local). Refusing to report a divergence of zero against a database I never reached.`; exit code **2**. Therefore live production applicability is **UNVERIFIABLE**; no migration-applied, policy-count, function-count, functional-API, vocabulary, privilege, or enforcement claim is promoted. |
| 61 | docs/20260824-role-capabilities-zero-consumer-finding-v1.00F.md | VALIDATED-DRIFTED | Focused re-check: the historical zero-consumer finding is superseded by DB-side evidence: migration `20260905000000_user_has_capability_fail_closed`, `public.user_has_capability`, 6 matching public functions (5 functional consumers after excluding `role_capabilities_set_updated_at`), and 4 policies reference `role_capabilities`. CRM7's `src/hooks/usePermissions.ts` and `src/components/auth/permission-guard.tsx` are hardcoded permission sources, not database-matrix consumers, and are therefore not evidence of `public.role_capabilities` usage. Application enforcement, vocabulary reconciliation, and live deployment state remain unverified. |
| 62 | docs/20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md | UNVERIFIABLE | E-OPEN; verify product/library and licence claims against package manifests. |
| 63 | docs/20260825-braden-group-duplicated-documents-v1.00D.md | UNVERIFIABLE | E-OPEN; the historical counts (162 candidates, 10 sensitive rows, 29 unique rows, and exposure/tenant conclusions) cannot be established by reading the document or remediation script. `scripts/remediate-duplicated-documents.mjs` could not reach its census because `@supabase/supabase-js` is unavailable; rerun the read-only census with dependencies and credentials, including eTag equality, sensitive count, unmatched unique rows, tenant membership, and exposure checks. |
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
| 74 | docs/20260826-bsuite-open-findings-register-v1.00W.json | UNVERIFIABLE | The JSON register was opened for triage, but no complete parse-and-reconciliation transcript was retained. Parse every row, resolve its referenced issue/PR or source path, and compare state against the live tracker; a static JSON parse cannot prove that a finding remains open, fixed, or deployed. |
| 75 | docs/20260826-doc-completion-verdict-v1.00A.md | UNVERIFIABLE | The verdict document was opened and its historical completion assertions remain bounded. Replay its checks against the current inventory, source evidence, issue state, and deployment evidence; the completion self-test validates checker mechanics, not the verdict for every dated document. |
| 76 | docs/20260826-four-decisions-for-braden-v1.00D.md | UNVERIFIABLE | E-OPEN; verify each decision's consumer and current status. |
| 77 | docs/20260826-futurebuild-production-acceptance-v1.00D.md | UNVERIFIABLE | E-OPEN; verify acceptance claims with deployed evidence. |
| 78 | docs/20260826-morning-brief-v1.00W.md | UNVERIFIABLE | E-OPEN; verify dated operational facts against current state. |
| 79 | docs/20260826-morning-ledger-v1.00A.md | UNVERIFIABLE | E-OPEN; reconcile rows with primary source state. |
| 80 | docs/20260826-page-builder-2x-layout-in-production-measured-v1.00A.md | VALIDATED-DRIFTED | Iteration 18 source walk confirms current mechanics at `packages/page-builder/src/canvasCardLayout.tsx:140-164`, `DraggableCardPage.tsx:121,171`, `usePageGridLayout.ts:71,103,159-170`, and `PageGridLayout.tsx:1612-1621`: independent child slots, width-6 defaults, version invalidation, and persisted drag/resize. The measurements remain bounded historical evidence (20 pages, worst CLS 0.0155, and 1,068/1,729 omitted-width usages), not current estate-wide proof; no current production sample or browser replay was produced. |
| 81 | docs/20260826-route-surface-map-v1.00W.md | UNVERIFIABLE | The historical document states **553** routes/rows (title at `docs/20260826-route-surface-map-v1.00W.md:14`, “553 rows” at `:16`, and `TOTAL 553` in §2 at `:52`), while the current replay reports **558**, a +5 drift that is not proof of completion. `node scripts/check-route-surface-map.mjs` checked 1,157 items with 0 problems (558 inventory routes/rows, 41 edge slugs, 74 deployed routes); `bash scripts/audit-routes.sh --inventory` reports 47 routes across six apps (18 public, 29 authenticated). These are static consistency checks only: no runtime, authenticated, RLS, deployment, or persistence proof was produced, so the historical 553-row claim cannot be promoted. |
| 82 | docs/20260826-supabase-advisor-posture-measured-v1.00A.md | UNVERIFIABLE | The advisor-posture document was opened, but no fresh live advisor/catalog result was captured. Re-run security and performance advisors, then query the live catalogs and record timestamps/project scope; migration text or dashboard posture cannot prove the current database state. |
| 83 | docs/20260826-the-seven-anon-security-definer-functions-v1.00A.md | UNVERIFIABLE | The seven-function document was opened, but the historical count was not promoted. Query `pg_proc` with `pg_get_functiondef`, compare exact identity/signature/security/search-path properties, and trace source callers plus authenticated behaviour; source references alone cannot prove live function posture. |
| 84 | docs/20260828-messaging-platform-design-v1.00W.md | UNVERIFIABLE | E-OPEN; verify messaging routes, tables, and realtime wiring. |
| 85 | docs/20260828-unearned-completion-markers-triage-plan-v1.00W.md | UNVERIFIABLE | E-OPEN; replay each marker check against current records. |
| 86 | docs/20260829-enhanceddatatable-is-not-a-one-edit-conversion-v1.00W.md | VALIDATED-DRIFTED | Current source supports the architectural warning but not a blanket conversion: `crm7/src/components/common/DataTable/EnhancedDataTable.tsx:597-599` consumes `row.original` for display/click behaviour, while the document's cited footprint was historical. The verified persistence-capable alternative is the separate `crm7/src/components/admin/BrowseDataTab.tsx:750-800,1247-1254` path backed by `crm7/src/services/browseDataService.ts:801-839`; shared `packages/data-grid/src/types.ts:53-104,181-188` requires host edit configuration/renderers and an async callback. Verdict: retain the separation between read-listing tables and editable grids, but re-measure the document's numeric usage counts before treating them as current. |
| 87 | docs/20260829-what-the-capability-denials-actually-do-v1.00D.md | UNVERIFIABLE | `node scripts/audit-role-capability-divergence.mjs` self-tests passed (`17 roles, 91 permissions`) but exited 2 because neither `ROLE_CAPABILITIES_JSON` nor Supabase credentials were provided; the script explicitly refused to report zero divergence against an unreached database. No live denial, RLS, or authenticated functional proof was produced. |
| 88 | docs/20260829-why-a-good-speed-score-and-a-slow-app-v1.00D.md | UNVERIFIABLE | The performance document was opened, while its historical score/slow-path explanation remains unverified. Reproduce the declared workload in a browser, capture network/render evidence and current Core Web Vitals/RES data, and compare against the deployed commit; a source or score snapshot cannot establish present user-perceived performance. |
| 89 | docs/20260830-nav-route-reachability-across-the-five-non-crm7-apps-v1.00D.md | UNVERIFIABLE | Static checks remain bounded: `scripts/audit-routes.sh --inventory` reports 47 routes across six apps (18 public, 29 authenticated), while `scripts/check-route-surface-map.mjs` checks inventory/map consistency. Neither replays per-app navigation or positive controls, and neither proves table reachability, authentication, RLS, or deployment behaviour. |
| 90 | docs/20260830-text-contrast-across-the-estate-v1.00D.md | UNVERIFIABLE | The document was opened. `scripts/check-content-contrast-tier.mjs` reports **457 source files examined; 0 violations**, but that is a static source boundary, not computed rendered contrast. The prior browser result is historical and no current `R80.4/scripts/contrast-probe.js` run is recorded; re-run the browser probe across light/dark themes and remaining surfaces before any promotion. |
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
| 113 | docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md | UNVERIFIABLE | The draft requires RLS checks, surface-class sweeps, validation-equivalence loops, cross-red-team review, and live preview/deployment evidence (`docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md:40–46,160–183,232,304,473–511`). The plan itself records ≈36 confirmed defective surfaces and ≈91+ unaudited (`:172–175`), and explicitly distinguishes routes from policies (`:78`). A genuine portal-surface census remains E-OPEN: it would require a recorded command defining the six-app scope, file/path extensions and portal-related matching criteria, plus its complete output. No implementation-level closure proof, live RLS/catalog result, portal-flow replay, preview/deployment check, authenticated runtime evidence, or closure record was produced. The plan therefore remains unverified. |
| 114 | docs/plans/20260817-estate-completion-plan-v1.00D.md | UNVERIFIABLE | The draft defines evidence-based acceptance criteria for 46 findings (`docs/plans/20260817-estate-completion-plan-v1.00D.md:6,21–25,87`) and its own RLS/data-surface gates remain prescriptive (`:458–503,640–649`). `node scripts/check-doc-classification.mjs --self-test` → 9/9; `node scripts/estate-align.mjs --self-test` → OK (24 cases); `node scripts/estate-align.mjs --strict` → no invariant violations, but the run evaluated only 7/661 DOD rows. The script anchors are `scripts/estate-align.mjs:125–146,301–343`; the completion self-test is `node scripts/audit-doc-completion.mjs --self-test` → 38/38. These checks validate tooling mechanics, not the 46-finding issue/branch/implementation/closure state, so the plan remains unverified. |
| 115 | docs/plans/20260824-agent-compliance-enforcement-refined-v1.00W.md | UNVERIFIABLE | Opened the historical point-in-time plan. Current anchors exist at `scripts/bsuite-notes-cycle.mjs:172-202` and `scripts/estate-align.mjs:213-399`, but proposed enforcement remains unevidenced: no per-agent identity, inbox participation, or historical-count verification was produced. |
| 116 | docs/plans/20260827-estate-lifecycle-process-refined-v1.00D.md | UNVERIFIABLE | The lifecycle draft requires durable intake capture, receipts, seven-repo reconciliation, manifests, gated archive, and closure evidence (`docs/plans/20260827-estate-lifecycle-process-refined-v1.00D.md:10–35,135–169`). It names `scripts/estate-align.mjs` and `scripts/check-doc-classification.mjs` as enforcement dependencies (`:5–28`), and requires archive refusal without `dod_status: approved` plus an evidence pointer or named superseding artefact (`:154–169`). Dry run: `node scripts/bsuite-notes-cycle.mjs` → 400 paragraphs, 98 images, +0/−0, no write; `node scripts/estate-align.mjs --strict` → no invariant violations; `node scripts/audit-doc-completion.mjs --self-test` → 38/38. These outputs establish script mechanics only: no current intake receipt, seven-repo reconciliation, archive manifest, enforcement result, or lifecycle closure record was replayed, so the draft remains unverified. |
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
| `docs/00-roadmap/BSUITE-FEATURE-INDEX.md` | VALIDATED-CURRENT | Opened; its prose headline and generated section both state **661 features across 28 modules**, and the generator check passes. Fresh related-family source grep `grep -rl 'reactflow\|@xyflow\|ReactFlow' business-suite-unified/src crm7/src conduit/src braden/src R80.4/src throughput/src --include='*.ts' --include='*.tsx' \| sort -u \| wc -l` → **21** files. The generated section remains authoritative for its 661-row output; claim-level source coverage and runtime wiring remain separately bounded by the dated-document rows. |
| `docs/00-roadmap/bsuite-component-registry.json` | VALIDATED-CURRENT | Parsed successfully; generator check reports `in sync (174 components)`. This is the machine-readable registry, with the generated output treated as authoritative over prose. |

## Iteration 13 focused source findings

Iteration 13 carried forward the prior focused findings for rows **14, 29, 60, 61, 80, 86, 89, 90, 117,
and 51**, while preserving the prior correct evidence for rows **51, 80, 86,
89, 90, and 117**. The ten-row pass is explicit:

| Row | Result | Boundary preserved |
|---:|---|---|
| 14 | UNVERIFIABLE | Theme register and exact role-token anchors were confirmed; `bash scripts/theme-gates.sh --quick` returned `10 passed, 1 failed`, `G11 -> 2 convertible inline colour style(s)`, and outstanding `G11 — no NEW convertible inline colour styles`. Authenticated rendered and deployed validation remains open. |
| 29 | UNVERIFIABLE | Schema ownership, nullable system `tenant_id`, RLS write boundary, `tenant_schema_layout`, and exact `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql` anchors `:18256`, `:18280`, `:20353`, and `:21744` were confirmed; live catalogue/RLS and authenticated authoring validation remain open. |
| 60 | UNVERIFIABLE | Iteration 13 removes the non-replayable live catalogue counts and retains only source/baseline evidence plus the exact local refusal: stdout `self-tests passed (17 roles, 91 permissions)`; stderr `::error::Provide ROLE_CAPABILITIES_JSON (CI, via psql) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local). Refusing to report a divergence of zero against a database I never reached.`; exit code **2**. Live production applicability remains unverified. |
| 61 | VALIDATED-DRIFTED | Historical zero-consumer finding is superseded by DB-side function/policy evidence; CRM7 hardcoded permission files were removed from the claimed DB-consumer set. Live deployment, application enforcement, and vocabulary reconciliation remain unverified. |
| 51 | UNVERIFIABLE | Current source inspection does not replay deployment/gate claims; absent visual probe and incomplete matrix remain explicit. |
| 80 | VALIDATED-DRIFTED | Persisted per-card layout mechanics hold; historical production measurements are not current estate-wide proof. |
| 86 | VALIDATED-DRIFTED | Read-listing and editable-grid separation holds. A current historical-style grep (`grep -rln 'EnhancedDataTable' crm7/src --include='*.tsx'`) returns **43** files, while a current non-test `.tsx` scan returns **35**; neither is apples-to-apples with the document's historical **46 files / 43 pages** scope, so the numeric footprint remains bounded historical evidence rather than a definitive drift measurement. |
| 89 | UNVERIFIABLE | Bounded route inventory and static map checks do not establish runtime reachability or positive-control results. |
| 90 | UNVERIFIABLE | Current source guard output is not rendered evidence; the browser probe and 104 app-local claims remain unverified. |
| 117 | DUPLICATE-CLUSTER | Shared workflow controller/service persistence path wins over competing proposals. |

This pass therefore promotes only bounded claims. “Current” means the measured or
source-backed claim itself is supported; it does not convert an unresolved operator
decision or an incomplete estate-wide sweep into completion. In particular, the route
inventory/map outputs do not prove authenticated reachability, and the contrast output
does not prove rendered browser contrast.

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
proof with explicit limits, not an estate-wide Airtable claim. The feature index
previously required reconciliation of its 662 prose headline against 661 generated features;
that reconciliation is now applied. The
fresh React Flow/xyflow footprint across all six app source trees is 21 matching source files.
Iteration 3 performed focused source walks for the editable data path, layout persistence,
and schema-builder save path. Many more iterations are required before the remaining
rows can be deep-validated; this ledger does not compress that incompleteness into
false completion. The next iterations must perform the interaction-level walk: create/edit/reorder/preview,
persist, reload, keyboard/focus, empty/loading/error states, and sibling-surface
enumeration. It must also open the exact registry/index prose and compare every
feature row to a source file, route, test, or explicit `UNVERIFIABLE` disposition.

Summary at iteration 23: **128 dated paths inventoried; 128 assigned a verdict; 5 VALIDATED-CURRENT;
7 VALIDATED-DRIFTED; 3 DUPLICATE-CLUSTER; 113 UNVERIFIABLE.** Separately, **3 named
registries/indexes** are assigned verdicts: 1 VALIDATED-CURRENT and 2
VALIDATED-DRIFTED. The iteration-13 wording retained below is historical context; this
is the current iteration-23 ledger. The remaining gap is
explicitly **113/113 inventory rows still UNVERIFIABLE (88.3%)**, so **100% claim-level
validation has not been achieved** and no world-class/completeness conclusion is licensed.
Many more iterations are required for the full-set criterion; that incompleteness is
reported plainly rather than represented as completion. The explicit blocker remains
**113 unresolved `UNVERIFIABLE` rows**; this ledger is not an audit-complete claim and
the status remains `building`. No source, migration, or audited document was edited or
deleted; this iteration changes only this ledger.

## Iteration 23 evidence table

The following ten rows received a bounded evidence update in Iteration 23. Every target
remains `UNVERIFIABLE`: these checks identify the next replay boundary and do not turn
static inventories, historical observations, or source anchors into runtime proof.

| Row | Evidence captured | Validation boundary; required next proof |
|---:|---|---|
| 20 | `grep -nE 'target-branch|security' .github/workflows/security-audit.yml .github/workflows/security-definer-must-justify-itself.yml .github/dependabot.yml` located the security workflow, the SECURITY DEFINER gate, and Dependabot `target-branch: "development"` at `.github/dependabot.yml:18,65`. | Repository controls are not proof that a signal is currently exposed, fixed, or deployed. Live catalog evidence, source callers, and authenticated/deployed observation remain required. |
| 39 | The bounded historical lint/config replay found **no current matches** for the register's named paths. This negative result is recorded, not treated as proof that historical items are absent or fixed. | Reconcile each item with its historical source/config context, then verify import, route, saved-state/read-back, authenticated browser reachability, deployment identity, and live data/RLS behaviour. |
| 40 | Concrete source anchors: `R80.4/src/lib/award-rate-cache.ts:48` names `award_rate_cache`; `crm7/src/services/chargeCalcSourceAdapters.ts:203-212` documents the adapter; `crm7/src/services/requoteOnRiseService.ts:15-28` records the cache repoint; `crm7/src/components/entity/selectors/AwardRateSelector.tsx:68-77` retains the classification join. | These identify readers and tables, not current rows, API responses, deployment identity, or completed authenticated rate correctness. Replay named commands and test the deployed surface before promotion. |
| 57 | `node scripts/audit-doc-completion.mjs --self-test` returned **`38/38 self-tests pass`**; the independent dated-path replay returned **128 unique paths with no missing or duplicate ledger rows**. | Self-tests use fixtures and inventory proves assignment arithmetic; neither validates every substantive document claim, live issue state, deployment state, or closure. |
| 74 | JSON parsing succeeded (`generated=2026-09-02`). Structural counts: **5** RLS ownership; security **2 attributable + 3 unattributable**; journey gaps **4**, config-without-editor **3**, bulk **1**, seam **1**, walked **4**, not-yet-walked **4**; operator findings **142**, repeat offences **26**, themes **11**; `issues_filed` has **4** top-level keys and **0 failures**. | Counts substantiate stored shape and declared totals, not current issue/PR status, deployment, or live RLS. Reconcile references with the tracker and authenticated behaviour. |
| 75 | `node scripts/audit-doc-completion.mjs --self-test` returned **`38/38 self-tests pass`**, and the independent inventory returned **128 unique dated paths**. This supports checker/inventory mechanics only. | Replay against current inventory and compare every result with source, issue state, and deployment evidence; checker mechanics cannot prove every historical supersession or completion conclusion. |
| 82 | `scripts/check-supabase-advisors.mjs:3-18` is the advisor/allowlist consumer; `scripts/audit-security-definer-guards.mjs:41-50` exposes the guard boundary. `docs/security/supabase-advisor-allowlist.json:3-6,97-100` states accepted/tracked semantics and that an unlisted SECURITY DEFINER function fails. | No fresh live advisor/catalog result was captured. Static scripts and allowlist text do not prove current advisors, `pg_proc`, grants, search paths, or production posture. |
| 83 | `braden/supabase/migrations/20260828120000_restrict_cms_writes_to_admins.sql:43-83` references `public.is_developer_admin()`; `braden/supabase/migrations/20261006000000_admin_users_exists_where_the_policies_live.sql:28-47,72-97` records the table-existence, role, SECURITY DEFINER, and RLS boundaries. | Source/migration anchors explain the named predicate but do not prove live `pg_proc`, signatures, grants, search path, callers, or authenticated behaviour. Query live catalogs and run a deployed authenticated test. |
| 88 | `node scripts/check-speed-insights-route.mjs` returned **6 apps scanned, 6 `<SpeedInsights />` mounts found, 0 entrypoints without a route prop; `check-speed-insights-route: OK`**. | Static route wiring does not establish current Core Web Vitals, RES, network/render cost, deployment identity, or user-perceived performance. Reproduce the browser workload on the deployed `d.*` surface. |
| 90 | `node scripts/check-content-contrast-tier.mjs` returned **`457 source files under packages/ examined; 0 violation(s)`**. | This is static source validation only, not rendered browser contrast. Re-run current probes across light/dark themes and remaining surfaces; the row remains `UNVERIFIABLE`. |

## Iteration 14 focused source findings

Iteration 14 ran a bounded five-component census and replayed both named generators. The census deliberately separates
package definitions/exports, direct application imports, package-internal references, Storybook references, test-only
references, and incidental prose. It does not treat an absent direct import as proof of dead code.

| Component | Evidence-backed classification | Result and boundary |
|---|---|---|
| `AppShell` | Shared package export plus four direct app consumers | `packages/ui/src/app-shell.tsx:75` defines the shared component and `packages/ui/src/index.ts:3` exports it. The authoritative registry row is `@bsuite/ui`, `consumerFiles: 4`, `consumingApps: 4` (`crm7`, `business-suite-unified`, `conduit`, `throughput`). `R80.4/src/components/layout/AppShell.tsx` is an app-local same-name component, not a shared-registry consumer. |
| `Button` | Shared package export with no direct `@bsuite/ui` app consumer; separate local app copies exist | `packages/ui/src/button.tsx:4-17` defines the shared variants and `packages/ui/src/index.ts` exports it, but the authoritative row is `consumerFiles: 0`, `consumingApps: 0`. Package Storybook/tests and app-local `*/components/ui/button.tsx` imports are distinct from direct shared-package consumption. This is a registry-semantics finding, not a dead-code conclusion. |
| `DataGrid` | Shared package export with direct CRM7 consumers | `packages/data-grid/src/index.ts:20` exports `DataGrid`; the authoritative row is `@bsuite/data-grid`, `consumerFiles: 22`, `consumingApps: 1` (`crm7`). The census found direct imports including `crm7/src/components/admin/BrowseDataTab.tsx`; this supports the previously recorded editable-admin boundary, not an estate-wide Airtable claim. |
| `DraggableCardPage` | Shared package export with direct consumers in four apps, plus app-local same-name implementation | Definition: `packages/page-builder/src/DraggableCardPage.tsx:163`; barrel export: `packages/page-builder/src/index.ts:28`. `packages/page-builder/src/canvasCardLayout.tsx` remains supporting layout mechanics. The authoritative row is `@bsuite/page-builder`, `consumerFiles: 10`, `consumingApps: 4` (`crm7`, `business-suite-unified`, `braden`, `throughput`). App-local implementations/references are not conflated with the shared-package row. |
| `RelationshipCanvas` | App-local feature-builder export; not a shared-registry component | `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx:510-518` exports the component and wraps `ReactFlowProvider`. `packages/workflow-canvas/README.md:17-18` explicitly records the relationship as a provider pattern, while the package wrapper is separate. It is absent from `bsuite-component-registry.json` because the generator scans exports under `packages/*/src` and only counts `@bsuite/*` imports from app source; absence is expected under that generator contract, not evidence of missing functionality. |

Reproducible command evidence:

* `node scripts/generate-component-registry.mjs --self-test` → `component-registry --self-test: OK (14 cases)`.
* `node scripts/generate-component-registry.mjs --check` → `component-registry: in sync (174 components)`.
* `node scripts/generate-feature-index.mjs --self-test` → `generate-feature-index --self-test: OK (12 cases)`.
* `node scripts/generate-feature-index.mjs --check` → `feature-index: in sync (661 rows)`.
* Parsing `docs/00-roadmap/bsuite-feature-index.json` and counting its authoritative rows → **661 rows, 28 modules,
  57 capability areas**. The feature-index Markdown headline now also states **661**, matching the generated
  JSON/check output; the named-index verdict is therefore `VALIDATED-CURRENT`.
* The registry generator source at `scripts/generate-component-registry.mjs:31-32, 133-169` defines the ten shared
  package scan, package-export discovery, and direct `@bsuite/*` app-import semantics. This bounds all five census
  classifications above.

No dated-document verdict is promoted from `UNVERIFIABLE` in this iteration. Runtime reachability, authenticated
navigation, RLS enforcement, live catalogue state, deployment state, rendered contrast, and the remaining claim-level
document checks still require evidence unavailable to this static pass. The summary therefore remains **128 paths;
5 VALIDATED-CURRENT; 7 VALIDATED-DRIFTED; 3 DUPLICATE-CLUSTER; 0 SUPERSEDED; 113 UNVERIFIABLE**, with status
`building`. Only this ledger was edited.

## Iteration 15 — evidence trail

This iteration repairs evidence traceability only. It preserves the 128-path inventory, all prior
verdicts and rulings, `status: building`, and makes no source or migration changes.

### Feature-index counts

Replayable executable parse/count evidence for `docs/00-roadmap/bsuite-feature-index.json`:

  node -e "const x=require('./docs/00-roadmap/bsuite-feature-index.json'); const m=new Set(x.map(r=>r.module)); const a=new Set(x.map(r=>r.capability_area)); console.log({rows:x.length,modules:m.size,capabilityAreas:a.size})"
  { rows: 661, modules: 28, capabilityAreas: 57 }

The exact source/import comparison was replayed with the canonical generator and its
checked JSON output:

  node scripts/generate-component-registry.mjs --check
  component-registry: in sync (174 components)

The comparison's source anchors were then checked against the six census roots with
the following executable existence check (shared definitions/exports plus the local
canvas):

  node -e "const fs=require('fs'); for (const [n,p] of Object.entries({AppShell:'packages/ui/src/app-shell.tsx',Button:'packages/ui/src/button.tsx',DataGrid:'packages/data-grid/src/DataGrid.tsx',DraggableCardPage:'packages/page-builder/src/DraggableCardPage.tsx',RelationshipCanvas:'business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx'})) console.log(n+': '+(fs.existsSync(p)?p:'MISSING'))"
  AppShell: packages/ui/src/app-shell.tsx
  Button: packages/ui/src/button.tsx
  DataGrid: packages/data-grid/src/DataGrid.tsx
  DraggableCardPage: packages/page-builder/src/DraggableCardPage.tsx
  RelationshipCanvas: business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx

### Component classifications

Replayable registry evidence (the registry is generated by
`scripts/generate-component-registry.mjs`):

  node -e "const fs=require('fs'); const r=require('./docs/00-roadmap/bsuite-component-registry.json'); for (const n of ['AppShell','Button','DataGrid','DraggableCardPage']) { const c=r.components.find(x=>x.name===n); const apps=Object.keys(c.consumers); const label=n==='Button'?'0 direct shared-package app consumers':c.consumerFiles+' consumers / '+c.consumingApps+(c.consumingApps===1?' app':' apps')+(apps.length?' ('+apps.join(', ')+')':''); console.log(n+': '+label); } const localPath='business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx'; const relationshipRows=r.components.filter(x=>x.name==='RelationshipCanvas'); console.log('RelationshipCanvas local file: '+(fs.existsSync(localPath)?'exists':'missing')+' ('+localPath+')'); console.log('RelationshipCanvas shared registry rows: '+relationshipRows.length)"
  AppShell: 4 consumers / 4 apps (crm7, business-suite-unified, conduit, throughput)
  Button: 0 direct shared-package app consumers
  DataGrid: 22 consumers / 1 app (crm7)
  DraggableCardPage: 10 consumers / 4 apps (crm7, business-suite-unified, braden, throughput)
  RelationshipCanvas local file: exists (business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx)
  RelationshipCanvas shared registry rows: 0

The census scope is exactly the six app source roots `crm7/src`, `business-suite-unified/src`,
`conduit/src`, `braden/src`, `R80.4/src`, and `throughput/src`, with `.ts`/`.tsx` source files.
The canonical generator excludes `node_modules`, `__tests__`, `.test.`, `.spec.`, and `.d.`
files; it parses direct `@bsuite/*` imports, including multiline, aliased, and type-only imports,
and does not count package-internal or non-BSuite imports. App-local same-name definitions and
adapters, Storybook/fixture and test-only references, prose/comments, and non-direct imports are
therefore excluded from shared-package consumer counts. In particular, local `RelationshipCanvas`
and local `DraggableCardPage` implementations do not become shared consumers, and `Button`'s
zero direct app imports are not a dead-code conclusion.

This is static source/registry evidence only. It is **not** evidence of live deployment,
authenticated reachability, RLS enforcement, visual rendering or contrast, or runtime behaviour.
The preserved historical summary is **128 paths; 5 VALIDATED-CURRENT; 7 VALIDATED-DRIFTED; 3
DUPLICATE-CLUSTER; 0 SUPERSEDED; 113 UNVERIFIABLE**, with status `building`.

## Iteration 17 focused source findings

Iteration 17 replayed the named registry checks and performed a focused source walk of the
customisation surfaces most likely to be overstated by the dated documents. This iteration
changes only this ledger; it does not implement, migrate, delete, merge, or promote any
application capability.

### Evidence-backed findings

| Surface | Current source evidence | Conservative implication |
|---|---|---|
| Editable data grid | `crm7/src/components/admin/BrowseDataTab.tsx:764` calls `commitBrowseCellEdits`; the following handler handles complete, partial, and failed outcomes; `:1247-1254` mounts the shared edit callback. `crm7/src/services/browseDataService.ts:801` defines the service, `:822` groups edits into `commitBulkUpdate`, and `:855` derives the result status. | This is the source-backed editable-grid winner for the verified CRM7 admin path. It is not evidence that `business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx:176-177` is Airtable-class: that widget performs `.from(entityType).select('*')` and has no observed insert, update, inline-edit, or save mutation path. Estate-wide grid parity remains `UNVERIFIABLE`. |
| Relationship canvas | `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx:386` defines `onConnect`, `:486` passes it to the flow, and `:492` enables `nodesConnectable`. `business-suite-unified/src/pages/Developer/FeatureBuilder/index.tsx:63-68` invokes `saveDraft()`, while `business-suite-unified/src/stores/featureBuilderStore.ts:107-137` authenticates the user and performs Supabase update/insert persistence. | React Flow/xyflow wins as the interactive canvas substrate. The source does not prove that the canvas itself directly persists edits; the evidenced orchestration path is `EntityPanel.tsx` → `featureBuilderStore.ts` → `saveDraft()`. `SchemaVisualizer.tsx` remains read-only (`nodesConnectable={false}`), so canvas persistence and runtime UX remain `UNVERIFIABLE`. |
| Page grid/layout | `packages/page-builder/src/DraggableCardPage.tsx:163-190` delegates layout behaviour and carries layout version/epoch state. `packages/page-builder/src/PageGridLayout.tsx:1612-1621` handles layout changes and `:1651-1653` handles drag/resize stops; `usePageGridLayout.ts` contains version invalidation, healing, and persistence guards. | Persisted independent-card `react-grid-layout` behaviour wins over whole-block dragging. The source proves mechanics, not authenticated reachability, reload round-trip, or world-class/fewest-clicks UX. `canvasCardLayout.tsx` is supporting/legacy layout code and remains a consolidation target rather than a second contract. |
| Branding | `packages/theme/src/css/vars.css:152` defines `--role-primary`, `:154` defines `--role-accent`, and `:165-166` define `--role-error`/`--role-destructive`. | Three-tier role-token branding wins over literal palette specifications. Documents prescribing local literal colours are `VALIDATED-DRIFTED` where the implementation has moved to role tokens; rendered tenant inheritance and contrast remain unproven by static source. |

### Registry and index replay

- `node scripts/generate-component-registry.mjs --check` → `component-registry: in sync
  (174 components)`. The component registry JSON therefore matches the generator's current
  output; its generator contract counts shared-package exports and direct `@bsuite/*` app
  imports, not runtime reachability.
- `docs/00-roadmap/bsuite-feature-index.json` parses to **661 rows, 28 modules, and 57
  capability areas**. `docs/00-roadmap/BSUITE-FEATURE-INDEX.md` now states **661**, so
  the prior one-row numeric mismatch is resolved and the Markdown index is current. The
  registry Markdown/index claims are not promoted beyond the executable/generated evidence.
- `bash scripts/audit-routes.sh --inventory` reports **47 routes across 6 apps** (**18
  public, 29 authenticated**); `node scripts/check-route-surface-map.mjs` reports **1,157
  items checked, 0 problems**. Both are static inventory/map checks, not proof of login,
  deployed reachability, RLS enforcement, or rendered behaviour.
- The measured source footprints are **21** React Flow/xyflow matches, **25** `@dnd-kit`
  matches, and **19** `react-grid-layout` matches across the six app `src` trees for
  TypeScript files. These are footprint counts only and do not establish complete wiring.

### Conflict rulings carried into iteration 17

The consolidated page-authoring direction remains the winner; competing renderer proposals
should point to `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`. React
Flow/xyflow is the relationship-canvas winner, CRM7 Browse Data is the verified editable-grid
winner, persisted independent-card page-grid behaviour is the layout winner, and role-token
branding is the branding winner. Losers must be marked for consolidation or a superseded
pointer by their owners; no parallel contract is silently treated as current. Dashboard/report
binding and permission-model claims have no new runtime or end-to-end evidence in this pass
and therefore remain `UNVERIFIABLE`.

### Boundary and verdict arithmetic

Static source evidence cannot establish authenticated reachability, deployment validity, RLS
enforcement, browser rendering, persistence round-trip, usability, or complete feature
wiring. Historically, no inventory row was promoted from `UNVERIFIABLE` in iteration 17. The
ledger remains
**128 paths; 5 VALIDATED-CURRENT; 7 VALIDATED-DRIFTED; 3 DUPLICATE-CLUSTER; 0 SUPERSEDED;
113 UNVERIFIABLE**, with status `building`. Overall completion is expressly not claimed.
