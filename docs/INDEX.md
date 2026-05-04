# BSuite Documentation Index

**Generated:** 2026-05-04
**Scope:** Parent `bsuite/docs/` + all six submodule `docs/` trees on each repo's default branch.
**Authority:** This INDEX is a navigation catalog. The canonical truth-of-record lives in:

- [`docs/UNIFIED-ROADMAP.md`](./UNIFIED-ROADMAP.md) — cross-repo single source of truth
- [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) — divergences and remediation
- [`docs/STACK-AUDIT.md`](./STACK-AUDIT.md) — per-app stack version matrix
- [`docs/FEATURE-SURFACE.md`](./FEATURE-SURFACE.md) — feature presence matrix and canonical pattern owner
- [`docs/plans/STATUS.md`](./plans/STATUS.md) — every plan with current status + evidence
- [`docs/20260227-bsuite-master-roadmap-v5.00W.md`](./20260227-bsuite-master-roadmap-v5.00W.md) — long-horizon roadmap
- [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md) — phase-ordered execution queue

> **Sibling docs (per submodule):** [crm7](../crm7/docs/INDEX.md) · [conduit](../conduit/docs/INDEX.md) · [business-suite-unified](../business-suite-unified/docs/INDEX.md) · [R80.3](../R80.3/docs/INDEX.md) · [braden](../braden/docs/INDEX.md) · [throughput](../throughput/docs/INDEX.md)

---

## How this index is organised

1. **Cross-repo unified docs** — Authored 2026-05-04 in the unify-and-archive sweep. Live in this parent under `docs/`.
2. **Per-app like-for-like mapping** — Each row maps an equivalent doc across the apps where it exists.
3. **Per-repo doc trees** — Quick links into each submodule's `docs/`.
4. **Plans ledger** — Pointer to `plans/STATUS.md` (cross-repo aggregated view).

---

## 1. Cross-repo unified docs (parent `docs/`)

| Doc | Purpose |
|-----|---------|
| [`UNIFIED-ROADMAP.md`](./UNIFIED-ROADMAP.md) | Single, raised-level roadmap covering all six apps + shared packages. Mirrors into each submodule. |
| [`CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) | Cross-app divergences (allowed and not), remediation plan, and "canonical pattern" pointers. |
| [`STACK-AUDIT.md`](./STACK-AUDIT.md) | Versions per app: React, Zustand, shadcn, React Flow, TanStack, dnd-kit, Framer Motion, RHF/Zod, Tailwind. |
| [`FEATURE-SURFACE.md`](./FEATURE-SURFACE.md) | Every UX feature found in any app, which apps have it, the canonical implementation, and adopt-plan pointers. |
| [`plans/STATUS.md`](./plans/STATUS.md) | Plan ledger: every plan across parent + 6 submodules with status + evidence. |

## 2. Like-for-like mapping (canonical doc per topic)

Where one repo holds the source-of-truth doc and others reference it, the canonical column wins. Sibling rows link the equivalent doc in each repo where it exists.

| Topic | Canonical (parent) | crm7 | conduit | bsu | R80.3 | braden | throughput |
|-------|--------------------|------|---------|-----|-------|--------|------------|
| Master roadmap | [`docs/20260227-bsuite-master-roadmap-v5.00W.md`](./20260227-bsuite-master-roadmap-v5.00W.md) | [archived stub](../crm7/docs/00-roadmap/20260226-crm7-master-roadmap-v1.00WA.md) | — | — | [archived stub](../R80.3/docs/20260304-r80-roadmap-v1.00W.md) | [archived stub](../braden/docs/20260316-braden-roadmap-v1.00W.md) | [`20250320-throughput-roadmap-v1.00W.md`](../throughput/docs/20250320-throughput-roadmap-v1.00W.md) |
| Outstanding work index | [`docs/OUTSTANDING.md`](./OUTSTANDING.md) | [`docs/OUTSTANDING.md`](../crm7/docs/OUTSTANDING.md) | [`docs/OUTSTANDING.md`](../conduit/docs/OUTSTANDING.md) | [`docs/OUTSTANDING-PLANS.md`](../business-suite-unified/docs/OUTSTANDING-PLANS.md) | [`docs/OUTSTANDING.md`](../R80.3/docs/OUTSTANDING.md) | n/a | n/a |
| Auth map / OAuth topology | [`docs/20260227-auth-map-reference-v1.00A.md`](./20260227-auth-map-reference-v1.00A.md) | references parent | references parent | references parent | references parent | references parent | references parent |
| D2C theme spec | [`docs/20260228-d2c-theme-specification-v1.00A.md`](./20260228-d2c-theme-specification-v1.00A.md) | references parent | references parent | references parent | references parent | n/a (corporate) | references parent |
| Corporate theme (braden) | n/a | n/a | n/a | n/a | n/a | [`docs/20260316-braden-corporate-theme-reference-v1.00W.md`](../braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md) | n/a |
| Contributing standards | [`docs/20260227-contributing-standards-guide-v1.01W.md`](./20260227-contributing-standards-guide-v1.01W.md) | references parent | references parent | references parent | references parent | references parent | references parent |
| DRY / one-shot architecture | [`docs/20260227-dry-one-shot-architecture-v1.02A.md`](./20260227-dry-one-shot-architecture-v1.02A.md) | references parent | references parent | references parent | references parent | references parent | references parent |
| Gap report (current) | [`docs/20260317-bsuite-gap-report-v2.00W.md`](./20260317-bsuite-gap-report-v2.00W.md) | rolled-up here | rolled-up here | rolled-up here | rolled-up here | rolled-up here | rolled-up here |
| Finish-line roadmap | [`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`](./20260425-bsuite-finish-line-roadmap-v1.00W.md) | items cited by ID | items cited by ID | items cited by ID | items cited by ID | items cited by ID | items cited by ID |
| Merged execution backlog | [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md) | items cited by ID | items cited by ID | items cited by ID | items cited by ID | items cited by ID | items cited by ID |
| Schema builder Phase 3 | [`docs/20260504-schema-builder-phase-3-plan-v1.00W.md`](./20260504-schema-builder-phase-3-plan-v1.00W.md) | adopt via package consumer pattern | adopt via package consumer pattern | adopt via package consumer pattern | n/a | n/a | n/a |
| WYSIWYG / Schema UX master | [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](./plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) | mirrors via consumer adapter | mirrors via consumer adapter | mirrors via consumer adapter | n/a | n/a | n/a |
| GTO billing/payroll plan | [`docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`](./plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md) | [`docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md`](../crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md) | n/a | n/a | shared calc engine consumer | n/a | n/a |
| BOOT compliance | [`docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md`](./plans/20260227-boot-compliance-engine-specification-v1.00W.md) | engine consumer | n/a | n/a | engine consumer | n/a | n/a |
| Entity crosswalk | [`docs/20260319-entity-crosswalk-v1.00D.md`](./20260319-entity-crosswalk-v1.00D.md) | applied | applied | applied | applied | n/a | n/a |
| RBAC matrix | [`docs/20260301-crm7-rbac-matrix-v1.00A.md`](./20260301-crm7-rbac-matrix-v1.00A.md) | applied | [`docs/20260303-rbac-architecture-design-v1.00W.md`](../conduit/docs/20260303-rbac-architecture-design-v1.00W.md) | applied | applied | n/a | n/a |
| Page inventory | [`docs/20260301-crm7-page-inventory-v1.00A.md`](./20260301-crm7-page-inventory-v1.00A.md) | applied | n/a | n/a | n/a | n/a | n/a |
| Brand system / OKLCH | [`docs/20260228-d2c-theme-specification-v1.00A.md`](./20260228-d2c-theme-specification-v1.00A.md) (D2C) + [`braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md`](../braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md) (corporate) | consumer | consumer | consumer | consumer | corporate | consumer |
| WCAG / a11y audits | [`docs/20260407-d2c-wcag-contrast-audit-v1.00A.md`](./20260407-d2c-wcag-contrast-audit-v1.00A.md) | rolls up | [`docs/20260421-wcag-aa-audit-v1.00W.md`](../business-suite-unified/docs/20260421-wcag-aa-audit-v1.00W.md) (BSU companion) | as-left | as-left | corporate | as-left |
| Env var audit | [`docs/20260424-env-var-audit-findings-v1.00A.md`](./20260424-env-var-audit-findings-v1.00A.md) + matrix | applied | applied | applied | applied | applied | applied |

---

## 3. Per-repo doc trees

| Repo | Doc root | Plans | Archive | Outstanding |
|------|----------|-------|---------|-------------|
| Parent (`bsuite`) | [`docs/`](./README.md) | [`docs/plans/`](./plans/README.md) | [`docs/archive/`](./archive/README.md) | [`docs/OUTSTANDING.md`](./OUTSTANDING.md) |
| crm7 | [`crm7/docs/`](../crm7/docs/) | [`crm7/docs/plans/`](../crm7/docs/plans/README.md) | [`crm7/docs/archive/`](../crm7/docs/archive/) | [`crm7/docs/OUTSTANDING.md`](../crm7/docs/OUTSTANDING.md) |
| conduit | [`conduit/docs/`](../conduit/docs/) | n/a (use `docs/OUTSTANDING.md`) | [`conduit/docs/archive/`](../conduit/docs/archive/) | [`conduit/docs/OUTSTANDING.md`](../conduit/docs/OUTSTANDING.md) |
| business-suite-unified | [`business-suite-unified/docs/`](../business-suite-unified/docs/) | n/a | [`business-suite-unified/docs/archive/`](../business-suite-unified/docs/archive/) | [`business-suite-unified/docs/OUTSTANDING-PLANS.md`](../business-suite-unified/docs/OUTSTANDING-PLANS.md) |
| R80.3 | [`R80.3/docs/`](../R80.3/docs/) | [`R80.3/docs/plans/`](../R80.3/docs/plans/README.md) | [`R80.3/docs/archive/`](../R80.3/docs/archive/) | [`R80.3/docs/OUTSTANDING.md`](../R80.3/docs/OUTSTANDING.md) |
| braden | [`braden/docs/`](../braden/docs/) | n/a | [`braden/docs/archive/`](../braden/docs/archive/) | n/a |
| throughput | [`throughput/docs/`](../throughput/docs/) | n/a | [`throughput/docs/archive/`](../throughput/docs/archive/) | n/a |

## 4. Plans aggregator

See [`docs/plans/STATUS.md`](./plans/STATUS.md) for the cross-repo plans ledger with per-plan status (open / in-progress / done-verified / archived) and evidence column.

---

**Maintenance rule:** Whenever you add a doc that has an equivalent in another repo, add it as a row in §2 above and add a `> **Sibling docs:**` block at the top of the new doc linking the siblings. The unify sweep (2026-05-04) seeded this index; subsequent additions must keep it current.
