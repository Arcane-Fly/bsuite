# Plans

Implementation plans for BSuite features and enhancements. Each plan follows the `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` naming convention.

**Note:** The bulk of historical implementation plans live in the top-level `docs/` folder (not in this subdirectory). This `plans/` folder contains the most recent active plans.

**Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen

## Canonical Cross-Links

- [`../20260504-bsuite-documentation-hub-v1.00W.md`](../20260504-bsuite-documentation-hub-v1.00W.md) — Cross-submodule documentation hub (top-level index)
- [`../20260504-bsuite-tech-stack-alignment-v1.00W.md`](../20260504-bsuite-tech-stack-alignment-v1.00W.md) — Canonical tech-stack baseline
- [`../20260227-bsuite-master-roadmap-v5.00W.md`](../20260227-bsuite-master-roadmap-v5.00W.md) — Master roadmap (SSoT)
- [`../20260425-bsuite-finish-line-roadmap-v1.00W.md`](../20260425-bsuite-finish-line-roadmap-v1.00W.md) — Finish-line execution order
- [`../20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md) — Active phase-ordered queue

## Active Plans

| File | Status | Description |
|------|--------|-------------|
| `20260227-boot-compliance-engine-specification-v1.00W.md` | W | BOOT compliance engine specification (C8-tier competitive differentiator) |
| `20260302-r80-crm7-integration-audit-v1.00W.md` | W | R80.3 ↔ CRM7 integration audit and shared calc engine plan |
| `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | W | CRM7 broad UI refresh (D2C Neon theme) — active CRM7 page/chrome work tracked through merged backlog |
| `20260423-bsuite-production-plan-v1.00W.md` | W | Refreshed audit + full production plan (Phases 6-15); authoritative P0/P1/P2 register |
| `20260423-gto-billing-reporting-refined-plan-v1.00A.md` | A | Production billing, STP Phase 2, Payday Super, regulatory reporting (Approved) |
| `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` | W | Full-7 audit + UX upgrade orchestration plan |
| `20260501-universal-wysiwyg-schema-ux-v1.00W.md` | W | Universal WYSIWYG + schema-driven UX (Phase 0 + Schema Builder Phase 1a/1b + schema-builder-specific Phase 3 complete; page/form/custom authoring phases active) |
| `20260506-codehouse-parity-and-platform-360-v1.00W.md` | W | Codehouse Workforce-One parity + Platform-360 capability spec (index plan + 9 portal sub-plans + 1 visual feature builder spec under `20260506-codehouse-parity/`; refined-prompt provenance under `inputs/`). Permissions remain AUTH_CANONICAL.md + Supabase RLS + BSuite SSO — no new RBAC/ABAC framework. |
| `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` | W | Part O.11 theme centralisation + enterprise white-label POC, O.12 feature-placement audit, and O.13 docs-coherence handoff |

### Archived Plans (moved to `docs/archive/`)

| File | Archived | Reason |
|------|----------|--------|
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
