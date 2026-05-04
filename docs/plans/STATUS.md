# BSuite Plans — Status Ledger

**Generated:** 2026-05-04 (docs unify-and-archive sweep)
**Authority:** Cross-repo plans inventory with verified status + evidence column.

> **Sibling docs:** [crm7](../../crm7/docs/plans/README.md) · [conduit](../../conduit/docs/OUTSTANDING.md) · [BSU](../../business-suite-unified/docs/OUTSTANDING-PLANS.md) · [R80.3](../../R80.3/docs/plans/README.md) · [braden](../../braden/docs/) · [throughput](../../throughput/docs/)
> **Parent index:** [`docs/INDEX.md`](../INDEX.md) · [`docs/UNIFIED-ROADMAP.md`](../UNIFIED-ROADMAP.md)

---

## Status legend

- **OPEN** — actively scoped, not started
- **IN-PROGRESS** — work in flight (PRs open, branches active)
- **DONE-VERIFIED** — completion verified by code/tests/PR/runtime
- **ARCHIVED** — moved to `archive/`; verification recorded inline at top of file
- **REFERENCE** — long-lived spec or audit; not a closeable plan
- **OPERATOR-BLOCKED** — code-side complete, requires a tenant/operator action

---

## Parent (`bsuite/docs/plans/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| [`20260227-boot-compliance-engine-specification-v1.00W.md`](./20260227-boot-compliance-engine-specification-v1.00W.md) | REFERENCE | BOOT engine spec — describes future engine; consumed by GTO Phase 2 (WS-8). Not a closeable plan. |
| [`20260302-r80-crm7-integration-audit-v1.00W.md`](./20260302-r80-crm7-integration-audit-v1.00W.md) | REFERENCE | R80↔CRM7 integration audit; informs charge-calc convergence (WS-1, ✅ shipped) and BOOT (WS-8). |
| [`20260316-crm7-broad-ui-refresh-plan-v1.00W.md`](./20260316-crm7-broad-ui-refresh-plan-v1.00W.md) | OPEN | Many surfaces shipped; tail of magicui catalogue is aspirational. Leave open until explicitly closed by a successor "Polished CRM7 UI v2" plan. |
| [`20260423-bsuite-production-plan-v1.00W.md`](./20260423-bsuite-production-plan-v1.00W.md) | IN-PROGRESS | Phase 5 / 6c rows mostly ✅ DONE in plan body; conduit SSR fix outstanding (PR #98 follow-up). |
| [`20260423-gto-billing-reporting-refined-plan-v1.00A.md`](./20260423-gto-billing-reporting-refined-plan-v1.00A.md) | IN-PROGRESS | WS-1 ✅ shipped; WS-2/3 in flight; WS-4..9 scoped. See `crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md` for task detail. |
| [`20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`](./20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md) | IN-PROGRESS | Phase 0 ✅ Completed (PRs #335 / #332 / #228). Subsequent phases now superseded by the Universal WYSIWYG plan (2026-05-01). |
| [`20260428-codex-phase-2-shared-packages-plan-v1.00W.md`](./20260428-codex-phase-2-shared-packages-plan-v1.00W.md) | DONE-VERIFIED | All 4 shared-package workstreams ✅ shipped per the plan's "Current shared-package inventory" table (10 published + page-builder extracted). Phase 2 complete; status string in body says "Phase 2 implementation complete on development". Candidate for archival in next sweep after a final verification of consumer adapter cleanup. |
| [`20260501-universal-wysiwyg-schema-ux-v1.00W.md`](./20260501-universal-wysiwyg-schema-ux-v1.00W.md) | IN-PROGRESS | Phase 0 ✅ Completed; Phase 1a/1b active. v1.05W per 2026-05-01 revision. |

### Parent docs/ root (roadmaps + audits, not under `plans/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| [`../20260227-bsuite-master-roadmap-v5.00W.md`](../20260227-bsuite-master-roadmap-v5.00W.md) | REFERENCE | Long-horizon roadmap; defers to merged-execution-backlog post-Phase-0 ratification. |
| [`../20260317-bsuite-gap-report-v2.00W.md`](../20260317-bsuite-gap-report-v2.00W.md) | REFERENCE | Living gap register; §11 contains 2026-04-25 archive-pass reconciliation. |
| [`../20260425-bsuite-finish-line-roadmap-v1.00W.md`](../20260425-bsuite-finish-line-roadmap-v1.00W.md) | REFERENCE | Cross-cutting action queue; items have stable IDs (P0-*/P1-*/P2-*/WS-*). |
| [`../20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md) | REFERENCE | Phase-ordered execution queue (current truth-of-record for what's next). |
| [`../20260504-schema-builder-phase-3-plan-v1.00W.md`](../20260504-schema-builder-phase-3-plan-v1.00W.md) | IN-PROGRESS | Phase 3 (Workstreams A/B/C/D) — active 2026-05-04. |

## crm7 (`crm7/docs/plans/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| `archive/2026-05/2026-03-09-hr-routing-disciplinary-owner-flow.md` | ARCHIVED 2026-05-04 | All HR routes exist on `main` — see archive header. |
| `archive/2026-05/2026-03-09-vet-assessment-dedicated-routes.md` | ARCHIVED 2026-05-04 | VET assessment routes exist on `main` — see archive header. |
| [`20260423-bsuite-gto-master-plan-v1.00W.md`](../../crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md) | IN-PROGRESS | CRM7 companion to parent's GTO refined plan. |
| [`20260423-ws3-to-ws9-implementation-plan.md`](../../crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md) | IN-PROGRESS | Task detail for WS-3 to WS-9. |

## crm7 (`crm7/docs/00-roadmap/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| `20260226-crm7-master-roadmap-v1.00WA.md` | ARCHIVED (existing) | Marked archived in body header; superseded by parent master roadmap. Forward-pointers added 2026-04-23 and 2026-04-24 to combined plans. |
| `20260423-crm7-schema-page-builder-audit-1.00W.md` | REFERENCE | Audit + plan; superseded for execution by the `20260424-bsuite-combined-foundations-and-gto-1.00W.md`. |
| `20260424-bsuite-combined-foundations-and-gto-1.00W.md` | IN-PROGRESS | Combined foundations + GTO; 5-phase plan; Phase 0 ✅, Phase 1+ in flight. |

## conduit (`conduit/docs/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| [`OUTSTANDING.md`](../../conduit/docs/OUTSTANDING.md) | REFERENCE | "No INCOMPLETE plans" per 2026-04-23 audit; only LIVE-REFERENCE architecture docs remain. |
| `20260303-rbac-architecture-design-v1.00W.md` | REFERENCE | RBAC architecture spec. |
| `20260303-theme-system-design-v1.00W.md` | REFERENCE | Theme system spec for conduit consumer. |

## business-suite-unified (`business-suite-unified/docs/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| [`OUTSTANDING-PLANS.md`](../../business-suite-unified/docs/OUTSTANDING-PLANS.md) | REFERENCE | Lists current INCOMPLETE plans inline. |
| `20260418-auth-dashboard-hardening-v1.00W.md` | OPERATOR-BLOCKED | Both items in status table unchecked; require operator (Braden) actions in Azure + Supabase Auth. |
| `20260421-platform-kit-admin-v1.00W.md` | OPEN | See OUTSTANDING-PLANS §2. |
| `20260421-wcag-aa-audit-v1.00W.md` | REFERENCE | Audit — findings rolled into per-app remediation. |

## R80.3 (`R80.3/docs/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| [`OUTSTANDING.md`](../../R80.3/docs/OUTSTANDING.md) | REFERENCE | Live-reference + active items index. |
| `20260304-r80-roadmap-v1.00W.md` | REFERENCE (deprecated) | Body marked archived → superseded by parent master roadmap. |
| `plans/README.md` | REFERENCE | Notes that historical wiring plans were never created locally; defers to OUTSTANDING. |

## braden (`braden/docs/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| `20260316-braden-roadmap-v1.00W.md` | REFERENCE (deprecated) | Body marked archived → superseded by parent master roadmap. Phase 1 fully ticked; Phase 2 visual editing partial. |
| `20260316-braden-architecture-v1.00W.md` | REFERENCE | Architecture spec. |
| `20260316-braden-corporate-theme-reference-v1.00W.md` | REFERENCE | Canonical corporate theme spec. |

## throughput (`throughput/docs/`)

| File | Status | Evidence / Notes |
|------|--------|------------------|
| `20250320-throughput-roadmap-v1.00W.md` | REFERENCE | Roadmap — describes shipped MVP + future phases. |

---

## Cross-repo plans (created in this sweep — Phase 6 mirrors)

These adopt-plans were authored 2026-05-04 in the unify sweep. Implementation belongs to follow-up PRs (per CONSISTENCY-REPORT §C):

| Plan | Repo | Pointer |
|------|------|---------|
| Throughput stack modernization (React 19, Vite 8, Zod 4, TanStack Query, shadcn) | throughput | `throughput/docs/plans/2026-05-04-stack-modernization.md` |
| R80.3 ThemeToggle adoption | R80.3 | `R80.3/docs/plans/2026-05-04-add-theme-toggle.md` |
| BSU dashboard dnd-kit adoption | BSU | `business-suite-unified/docs/plans/2026-05-04-adopt-dnd-dashboard.md` |
| Conduit shadcn init | conduit | `conduit/docs/plans/2026-05-04-shadcn-init.md` |
| Braden Zod 4 migration | braden | `braden/docs/plans/2026-05-04-zod-4-migration.md` |

---

## What was NOT archived (and why)

This sweep stayed deliberately conservative. The following plans look complete on the surface but were left **OPEN** because verification evidence was insufficient or the plan body still scopes future work:

- `20260227-boot-compliance-engine-specification-v1.00W.md` — REFERENCE (engine not yet built; this is the spec).
- `20260302-r80-crm7-integration-audit-v1.00W.md` — REFERENCE (workstream phase timeline still aspirational; some phases shipped, others not).
- `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` — Many surfaces shipped, but the magicui-component catalogue tail is open-ended scope. Leave OPEN until a successor plan explicitly closes it.
- `20260423-bsuite-production-plan-v1.00W.md` — Most rows ✅ but the conduit SSR PR #98 follow-up is still cited as outstanding.
- `20260423-gto-billing-reporting-refined-plan-v1.00A.md` — WS-1 ✅; WS-2..9 scoped. Active plan, not a candidate for archival.
- `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` — Phase 0 ✅; later phases superseded by the WYSIWYG master plan but not yet formally retired.
- `20260428-codex-phase-2-shared-packages-plan-v1.00W.md` — DONE-VERIFIED per plan body, **but** consumer adapter cleanup verification was not completed in this sweep. **Recommendation:** archive in the next sweep after running consumer-adapter-presence checks across all four D2C apps.

---

## Maintenance

- After each archival, append the row in the relevant per-repo §, then move it to a "Recently archived" bucket at the bottom (separate sub-section).
- New plans land first as OPEN; transition to IN-PROGRESS when a branch/PR is associated; transition to DONE-VERIFIED only with cited evidence.
- The submodule mirrors at `<app>/docs/plans/STATUS.md` (where applicable) summarise this ledger filtered to that repo and link back here.
