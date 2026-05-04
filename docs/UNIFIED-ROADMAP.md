# BSuite Unified Roadmap

**Date:** 2026-05-04
**Status:** Working — single, raised-level roadmap covering parent + 6 submodules + shared packages.
**Authoring pass:** docs unify-and-archive 2026-05-04.
**Audience:** parent agent + per-app agents need a single page that links every active plan, audit, and roadmap.

> **Sibling docs (per submodule mirrors):** [crm7](../crm7/docs/UNIFIED-ROADMAP.md) · [conduit](../conduit/docs/UNIFIED-ROADMAP.md) · [business-suite-unified](../business-suite-unified/docs/UNIFIED-ROADMAP.md) · [R80.3](../R80.3/docs/UNIFIED-ROADMAP.md) · [braden](../braden/docs/UNIFIED-ROADMAP.md) · [throughput](../throughput/docs/UNIFIED-ROADMAP.md)
> **Parent index:** [`docs/INDEX.md`](./INDEX.md)

This document is a navigation layer. **Authoritative content lives in the deep-dive docs cited below; do not duplicate scope here.**

---

## How to read this roadmap

1. Items are grouped by workstream, not by repo. A workstream may touch multiple repos.
2. Each row links its **canonical plan/audit doc** for detail. Status is mirrored from that doc, not re-asserted here.
3. Cross-doc rolls-up: items already verified complete in [`docs/20260317-bsuite-gap-report-v2.00W.md`](./20260317-bsuite-gap-report-v2.00W.md) §11 or [`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`](./20260425-bsuite-finish-line-roadmap-v1.00W.md) "shipped" rows are not relisted here.
4. The phase-ordered execution queue is [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md). When this roadmap conflicts with the backlog, the backlog wins.

---

## A. Foundations workstream (shared packages + design tokens)

| Item | Repos | Canonical | Status |
|------|-------|-----------|--------|
| `@bsuite/page-builder` consolidation (replace per-app `PageGridLayout` duplicates) | bsuite (pkg) → BSU, crm7, conduit, R80.3 | [`docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md`](./plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md) | ✅ shipped (0.1.0 published; consumers thinned) |
| `@bsuite/schema-registry` 0.2.x with browser-safe React helpers | bsuite (pkg) → all D2C apps | same plan | ✅ shipped |
| `@bsuite/theme` 0.3.x — platform logo + OKLCH tokens | bsuite (pkg) → all 6 apps | same plan | ✅ shipped |
| `@bsuite/dry-lint` 0.2.0 — error-level enforcement | bsuite (pkg) | same plan | ✅ shipped |
| `@bsuite/auth` 0.1.0 — OAuth client SSO; `startBSTokenRefresh` | bsuite (pkg) → 5 client apps | same plan + parent CLAUDE.md §Auth | ✅ shipped |
| `@bsuite/charge-calc` 0.2.2 — single canonical calc engine | bsuite (pkg) → crm7, R80.3 | [`docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`](./plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md) WS-1 | ✅ shipped (consumers via package) |
| `@bsuite/schema-builder` Phase 3 — field reorder + RENAME COLUMN + E2E tenant | bsuite (pkg) → crm7 (consumer) | [`docs/20260504-schema-builder-phase-3-plan-v1.00W.md`](./20260504-schema-builder-phase-3-plan-v1.00W.md) | 🟡 active (Phase 3 in flight 2026-05-04) |

## B. Universal WYSIWYG + Schema UX workstream

Master plan: [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](./plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) (v1.05W).

| Phase | Scope | Repos | Status |
|-------|-------|-------|--------|
| Phase 0 — React 19 + base-stack alignment | All D2C apps | bsuite, crm7, BSU | ✅ Completed (PRs #335 / #332 / #228, 2026-05-01) |
| Phase 1a — Hot-Sync `useSchemaController` extraction + Cmd+K subset | crm7 first | crm7 | 🟡 active |
| Phase 1b — Field-level React Flow handles + dagre auto-layout | bsuite (pkg) | bsuite | 🟡 active |
| Phase 2 — Page Builder direct-manipulation (drag handles, inline edit) | bsuite (pkg) → consumers | bsuite, crm7, BSU, conduit, R80.3 | ⬜ scoped |
| Phase 3 — Color picker stores `var(--accent-primary)` (not resolved hex) | bsuite (pkg) | bsuite, all D2C consumers | ⬜ scoped |
| Phase 4 — Schema relations `tenant_entity_relations` round-trip + crow's-foot | bsuite (pkg) → crm7 | bsuite, crm7 | ⬜ scoped |
| Phase 5 — Migration codegen (ALTER TABLE for renames/relations) | bsuite (pkg) | bsuite | ⬜ scoped |

## C. GTO billing/payroll/reporting workstream

Refined plan: [`docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`](./plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md). CRM7 master companion: [`crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md`](../crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md). Task detail: [`crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md`](../crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan.md).

| Workstream | Scope | Repos | Status |
|-----------|-------|-------|--------|
| WS-1 Calc engine convergence (charge-calc as canonical) | bsuite (pkg) → crm7, R80.3 | bsuite, crm7, R80.3 | ✅ shipped |
| WS-2 Award rate + charge-out engine, MAPD edge function, Payday Super | bsuite, crm7, R80.3 | bsuite, crm7, R80.3 | 🟡 in flight |
| WS-3 Host invoicing | crm7 | crm7 | 🟡 in flight |
| WS-4 Apprentice payroll + STP Phase 2 | crm7 | crm7 | ⬜ scoped |
| WS-5 Funding + WAAMS/STA exports | crm7 | crm7 | ⬜ scoped |
| WS-6 AVETMISS / NCVER NAT export | crm7 | crm7 | ⬜ scoped |
| WS-7 Reports (apprentice progress, billable hrs, comp, payroll) | crm7 | crm7 | ⬜ scoped |
| WS-8 BOOT compliance engine | bsuite (pkg) → crm7, R80.3 | bsuite, crm7, R80.3 | ⬜ scoped (spec at [`docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md`](./plans/20260227-boot-compliance-engine-specification-v1.00W.md)) |
| WS-9 GTO National Standards audit evidence | crm7 | crm7 | ⬜ scoped |

## D. Auth + tenancy workstream

Source of truth: [`docs/20260227-auth-map-reference-v1.00A.md`](./20260227-auth-map-reference-v1.00A.md). Hardening plan: [`business-suite-unified/docs/OUTSTANDING-PLANS.md`](../business-suite-unified/docs/OUTSTANDING-PLANS.md) §1 (auth-dashboard-hardening).

| Item | Repos | Status |
|------|-------|--------|
| All 5 client apps mirror `signInWithBusinessSuite`/`exchangeCodeForTokens`/`startBSTokenRefresh` | crm7, R80.3, braden, throughput, conduit | ✅ shipped |
| Conduit migrated from cookie-SSO carve-out to OAuth client | conduit | ✅ shipped (parent CLAUDE.md §OAuth) |
| Cookie SSO `business_suite_auth` on `.crm7.app` (5/6 apps) | BSU, crm7, R80.3, throughput, conduit | ✅ shipped |
| Azure `xms_edov` claim guard | BSU | 🟠 operator-blocked (Braden must enable claim) |
| Supabase wildcard allowlist removal | BSU | 🟠 operator-blocked |
| WIF for all Google API access (no SA JSON keys) | bsuite | ✅ shipped (parent CLAUDE.md §GCP) |

## E. Cross-app UX consistency workstream

See [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) for divergences and [`docs/FEATURE-SURFACE.md`](./FEATURE-SURFACE.md) for the canonical pattern map.

| Item | Repos | Status |
|------|-------|--------|
| React 19.2 across all D2C apps | crm7, conduit, BSU, R80.3, braden | ✅ shipped |
| **React 18 → 19 upgrade for throughput** | throughput | ⬜ open (last laggard — see [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) §A.1) |
| Zod v4 across all D2C apps | crm7, conduit, BSU, R80.3, throughput | ✅ shipped (Zod 4.3.6) |
| **Zod 3 → 4 upgrade for braden** | braden | ⬜ open (see [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) §A.2) |
| **Zod upgrade for throughput** | throughput | ⬜ open (3.25.76 → 4.x) |
| TanStack Query v5 in all 6 apps | all | 🟡 partial — throughput missing entirely (see CONSISTENCY-REPORT §A.3) |
| shadcn/ui in all D2C + braden | all D2C + braden | 🟡 partial — conduit, R80.3, throughput missing `components.json` (see CONSISTENCY-REPORT §A.4) |
| dnd-kit dashboard pattern (crm7 canonical) | crm7 → BSU, conduit, R80.3, throughput | 🟡 partial — R80.3, throughput have zero dnd-kit usage |
| ThemeToggle + OKLCH tokens | all 6 | ✅ shipped (R80.3 missing — see FEATURE-SURFACE) |
| Cmd+K command palette | all 6 | 🟡 crm7 + conduit only — adopt-plans needed elsewhere |
| `oneship` data entry policy / EntitySelector | all D2C | 🟡 crm7 only — see [`docs/20260227-dry-one-shot-architecture-v1.02A.md`](./20260227-dry-one-shot-architecture-v1.02A.md) for canonical pattern |

## F. Per-app open items

Each row points at the per-app outstanding ledger. **Do not enumerate items here** — that lives in the per-app doc.

| App | Outstanding doc |
|-----|-----------------|
| crm7 | [`crm7/docs/OUTSTANDING.md`](../crm7/docs/OUTSTANDING.md) + [`crm7/docs/plans/`](../crm7/docs/plans/) |
| conduit | [`conduit/docs/OUTSTANDING.md`](../conduit/docs/OUTSTANDING.md) |
| business-suite-unified | [`business-suite-unified/docs/OUTSTANDING-PLANS.md`](../business-suite-unified/docs/OUTSTANDING-PLANS.md) |
| R80.3 | [`R80.3/docs/OUTSTANDING.md`](../R80.3/docs/OUTSTANDING.md) |
| braden | [`braden/docs/`](../braden/docs/) (no OUTSTANDING — see roadmap stub) |
| throughput | [`throughput/docs/20250320-throughput-roadmap-v1.00W.md`](../throughput/docs/20250320-throughput-roadmap-v1.00W.md) |

---

## Allowed divergences (intentional, not gaps)

1. **conduit** uses Next.js 16 App Router; the other five Vite-based D2C apps use React Router/Wouter. Conduit may use `'use client'` and server actions; reconcile only behavioural patterns, not framework primitives.
2. **braden** uses corporate brand colours (Braden Red `#ab233a`, Gold `#cbb26a`); never apply D2C Neon Electric tokens. See [`braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md`](../braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md).

Any other divergence is a gap and must appear as an open row in [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md).

---

## Maintenance

- This roadmap is regenerated by sweeping per-repo OUTSTANDING/finish-line/audit docs. It must not collect content of its own.
- When archiving a plan, update §A–F to remove the row or move it to a `Recently shipped` table at the bottom of the relevant section.
- The submodule mirrors at `<app>/docs/UNIFIED-ROADMAP.md` are pointers back to this doc with the relevant per-app rows highlighted.
