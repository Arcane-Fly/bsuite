# Plans

Implementation plans for BSuite features and enhancements. Each plan follows the `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` naming convention.

**Note:** The bulk of historical implementation plans live in the top-level `docs/` folder (not in this subdirectory). This `plans/` folder contains the most recent active plans.

**Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen

## Canonical Cross-Links

- [`../20260504-bsuite-documentation-hub-v1.00W.md`](../20260504-bsuite-documentation-hub-v1.00W.md) — Cross-submodule documentation hub (top-level index)
- [`../20260504-bsuite-tech-stack-alignment-v1.00W.md`](../20260504-bsuite-tech-stack-alignment-v1.00W.md) — Canonical tech-stack baseline
- [`../00-roadmap/20260112-master-roadmap-1.00W.md`](../00-roadmap/20260112-master-roadmap-1.00W.md) — Master roadmap (SSoT) *(repointed 2026-07-28; previous v5 file archived 2026-07-08)*
- [`../20260425-bsuite-finish-line-roadmap-v1.00W.md`](../20260425-bsuite-finish-line-roadmap-v1.00W.md) — Finish-line execution order
- [`../20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md) — Active phase-ordered queue

## Active Plans

| File | Status | Description |
|------|--------|-------------|
| `20260729-qa-backlog-execution-v1.00W.md` | W | QA backlog execution plan — full red-team completion of the unified-authoring audit findings |
| `20260729-unified-authoring-redteam-refined-v1.00W.md` | W | Refined prompt for the unified authoring surface red-team + execution plan (prompt-enhancer output) |
| `20260423-gto-billing-reporting-refined-plan-v1.00A.md` | A | Production billing, STP Phase 2, Payday Super, regulatory reporting (Approved; Xero lane blocked on app registration) |
| `20260501-universal-wysiwyg-schema-ux-v1.00W.md` | W | Universal WYSIWYG + schema-driven UX (Phase 0 + Schema Builder Phase 1a/1b + schema-builder-specific Phase 3 complete; page/form/custom authoring phases active) |
| `20260506-codehouse-parity-and-platform-360-v1.00W.md` | W | Codehouse Workforce-One parity + Platform-360 capability spec (index plan + 9 portal sub-plans + 1 visual feature builder spec under `20260506-codehouse-parity/`; refined-prompt provenance under `inputs/`). Permissions remain AUTH_CANONICAL.md + Supabase RLS + BSuite SSO — no new RBAC/ABAC framework. |
| `20260507-feature-builder-ux-red-team-v1.00W.md` | W | Visual Feature Builder UX red-team + Phase 0.5 plan (FF-FB-UX-REDTEAM-20260507) |
| `20260510-universal-canvas-capability-implementation-v1.00W.md` | W | Universal canvas capability implementation (red-team amendments applied; not yet executed) |
| `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` | W | Part O.11 theme centralisation + enterprise white-label POC, O.12 feature-placement audit, and O.13 docs-coherence handoff |
| `20260513-bsuite-consolidated-hardening-v1.00W.md` | W | Consolidated hardening multi-cycle plan (open tails tracked via bsuite#1505 et al.) |
| `20260521-reports-w2-uplift-implementation-v1.00W.md` | W | Reports W2 uplift — Phase 1 shipped (crm7 PRs #840–#844 merged 2026-05-22); Phases 3a/3b/4/6/7 outstanding |
| `20260609-production-readiness-next-steps-plan-v1.00W.md` | W | **Umbrella production-readiness plan** — package consumer rollout, visual smoke triage, TCID/WAAMS, placement identity bridge, block-release calendar, workstreams E–H; remains active until bsuite#1506, crm7#1066, storage phases, and E–H tails close |
| `20260701-docs-plans-closure-audit-v1.00W.md` | W | Current closure audit across parent + six submodules; records archive candidates, stale status corrections, and remaining work by repo |

### Completed Plans (re-marked A, retained in place)

| File | Completed | Evidence |
|------|-----------|----------|
| `20260227-boot-compliance-engine-specification-v1.00A.md` | 2026-05-08 | BOOT engine shipped in `@bsuite/charge-calc` + CRM7 integration — evidence trail `../archive/2026-06/20260508-boot-engine-shipped-evidence-v1.00W.md` |
| `20260302-r80-crm7-integration-audit-v1.00A.md` | 2026-05-14 | Shared calc engine delivered — `@bsuite/charge-calc@^0.5.0` consumed by both crm7 and R80.3 `package.json`; R80.3#248 closed |
| `20260504-typescript-6-migration-evaluation-v1.00A.md` | 2026-05-12 | Tracking issue bsuite#211 CLOSED 2026-05-12; TS 6.0 playbook at `../20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` |
| `20260513-hf4-pgtap-rls-harness-v1.00A.md` | 2026-05-19 | Tracking issue bsuite#866 CLOSED 2026-05-19; header already marked Approved/completed |
| `20260513-ws4-timesheet-state-vocab-alignment-v1.00A.md` | 2026-06-03 | crm7 PR #948 MERGED 2026-06-03 (commit `bf97acf9`); plan header marked COMPLETED |

### Archived Plans (moved to `docs/archive/`)

| File | Archived | Reason |
|------|----------|--------|
| `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | 2026-06-11 | Superseded by uplift design language doctrine `uplift/20260507-bsuite-uplift-design-language-v1.00A.md` + Reports W2 uplift; moved to `../archive/2026-06/` |
| `20260423-bsuite-production-plan-v1.00W.md` | 2026-06-11 | Superseded by the 2026-06-09 production-readiness umbrella plan (Phase 6 re-verified 2026-05-12 with 8/9 items landed); moved to `../archive/2026-06/` |
| `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` | 2026-06-11 | Execution ledger archived 2026-04-30 (`../archive/parent/2026-04-30-phase-0-closure/`); superseded by `20260501-universal-wysiwyg-schema-ux-v1.00W.md`; moved to `../archive/2026-06/` |
| `20260605-production-spec-completion-plan-v1.00W.md` | 2026-06-11 | Superseded by `20260609-production-readiness-next-steps-plan-v1.00W.md` (operator-designated umbrella); moved to `../archive/2026-06/` |
| `20260311-d2c-theme-remediation-plan-v1.00W.md` | 2026-04-07 | All theme remediation items confirmed complete in gap report v2 |
| `20260316-bsuite-entity-reconciliation-plan-v1.00W.md` | 2026-04-07 | SP-4 entity crosswalk delivered (gap report v2 Section 9) |
| `20260316-crm7-dashboard-grid-fix-plan-v1.00W.md` | 2026-04-07 | PageGridLayout wired on all apps (gap report v2 Section 2) |
| `20260316-crm7-ui-fix-plan-v1.00W.md` | 2026-04-07 | All UI fix items confirmed done (gap report v2 Section 2) |
| `20260422-entity-linkage-schema-builder-uplift-v1.02W.md` | 2026-05-01 | Superseded by v1.05W `20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6 + §3.9 (strict superset — field-level handles, SchemaRelationSchema, dagre, crow's-foot) |
| `20260428-codex-phase-2-shared-packages-plan-v1.00W.md` | 2026-05-04 | All 5 workstreams (2A–2E) complete with PR evidence; see `../archive/2026-05-04-doc-unification/README.md` |

## Data Files

| File | Description |
|------|-------------|
| `CRM7_entity_inventory_v2.xlsx` | CRM7 entity inventory spreadsheet (v2) |
