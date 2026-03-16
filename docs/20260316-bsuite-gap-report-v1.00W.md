# BSuite Gap Report

**Version:** 1.01W
**Date:** 2026-03-16 (revised after codebase audit)
**Status:** Working
**Scope:** All 5 BSuite projects — CRM7, Conduit, BSU, Braden, R80.3
**Source inputs:** `docs/20260309-bsuite-completeness-matrix-v1.00W.md`, `docs/00-master-roadmap.md`, `crm7/docs/20260228-crm7-feature-gap-audit-v1.00W.md`, `crm7/docs/20260309-crm7-gto-owner-flow-completeness-matrix-v1.00W.md`, `~/.windsurf/plans/bsuite-reconciliation-07fa37.md`, direct codebase audit (2026-03-16 session 2)

---

## Audit Corrections (v1.00W → v1.01W)

Direct codebase inspection in session 2 (2026-03-16) revealed the following v1.00W items were **incorrect**:

| v1.00W Claim | Actual State |
|---|---|
| P0-2: Dead route `/contacts/:id` | ✅ EXISTS — `src/pages/contacts/[id]/index.tsx` + wired in `App.tsx` |
| P0-3: Dead route `/contacts/:id/edit` | ✅ EXISTS — `src/pages/contacts/[id]/edit.tsx` + wired |
| P0-4: Dead route `/placements/:id` | ✅ EXISTS — `src/pages/placements/[id].tsx` + wired |
| P0-5: Dead route `/placements/create` | ✅ EXISTS — `src/pages/placements/create.tsx` + wired |
| P1-1: EntitySelectors missing | ✅ EXISTS — 6 selectors in `src/components/entity/selectors/` |
| P1-2: DataContextSimple on active pages | ✅ Only in demo components (`demos/OneShotEntryDemo.tsx`); no production pages affected |
| P1-3: Training plan sign-off missing | ✅ EXISTS — `src/pages/contracts/training/e-signatures.tsx` + `signatureQueries.ts` |
| P1-4: Host employer agreement missing | ✅ EXISTS — `src/stores/hostAgreementStore.ts` + `src/pages/hosts/agreements/index.tsx` |

---

## Priority Legend

| Level | Meaning |
|---|---|
| **P0** | Data integrity blocker or broken user-facing flow — fix before next release |
| **P1** | Missing critical route or workflow — high business impact |
| **P2** | Incomplete feature — partial implementation, scope not fully met |
| **P3** | Coverage gap — entity/feature exists in spec, DB, or store but no UI surface |

---

## P0 — Blockers

### CRM7

| # | Issue | Location | Notes |
|---|-------|----------|-------|
| P0-1 | **Awards section `createEntityStore` queries wrong columns** — `award_classifications` always returns empty | `src/stores/useAwardStore.ts` | Column name mismatch between store query and actual DB schema; classifications UI shows nothing |
| P0-6 | **CRM7 sync schema/query mismatch** — some sync queries reference columns that no longer exist after migration drift | `src/lib/sync-service.ts` | Active runtime blocker; surfaces as silent empty data or console errors |

---

## P1 — Missing Critical Features

### CRM7

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P1-5 | **GTO evidence field-level parity** — 198-entity inventory not fully mapped to DB + page fields | All GTO owner flows | `crm7/docs/20260309-crm7-gto-owner-flow-completeness-matrix-v1.00W.md` documents current gaps |

### Conduit

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P1-6 | **Candidate documents tab** | ✅ **Implemented 2026-03-16** — `candidates/[id]/documents/` route + tab nav | `r7_documents` table (entity_type='candidate') |

### business-suite-unified

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P1-7 | **Idea Hub** | ✅ **Implemented 2026-03-16** — `/ideas` route + nav entry | Uses `ideas` DB table |
| P1-8 | **Cross-app notifications (Supabase Realtime)** — notification center UI + preferences incomplete | Scaffolding only | `NotificationPreferences.tsx` exists but pub/sub wiring unconfirmed |

---

## P2 — Partial Implementations

### CRM7

| # | Feature | What Exists | What's Missing |
|---|---------|-------------|----------------|
| P2-1 | **Tier 3–4 pages** (financial, compliance, WHS, comms, reports) | Routes and shell pages | Full store wiring, real data queries, form submission |
| P2-2 | **AI cost tracking per tenant** | `ai_sessions` + `ai_messages` tables exist | No UI surface showing cost/usage per tenant |
| P2-3 | **Document storage** | Storage buckets + upload flows exist | QA gaps documented in `docs/archive/crm7/20260226-document-storage-qa-report.md` |
| P2-4 | **`@bsuite/charge-calc` convergence** | Package imported in charge-rate and BOOT flows | 3 independent calc engines not yet fully converged |
| P2-5 | **Data management beyond wipe flow** | `settings/data-management.tsx` has tenant wipe | Import, export, bulk-reassign flows not built |
| P2-6 | **Compliance automation workflows** | Individual compliance pages exist | No rule-based automation or scheduled job triggers |

### Conduit

| # | Feature | What Exists | What's Missing |
|---|---------|-------------|----------------|
| P2-7 | **Analytics depth** | Route + server fetch exist | Full metric parity, chart visualizations, export |
| P2-8 | **Secondary settings / edit routes** | Some exist | Not all entity detail/edit pairs confirmed complete |

### business-suite-unified

| # | Feature | What Exists | What's Missing |
|---|---------|-------------|----------------|
| P2-9 | **Stripe billing end-to-end** | Billing page, subscription hook, checkout + portal client flows | Edge Function → Stripe → webhook → DB loop unverified end-to-end |
| P2-10 | **Session handoff + AppSwitcher** | `AppSwitcher.tsx` exists in all D2C apps | Full cross-app rollout + token handoff completeness unproven across all 5 apps |
| P2-11 | **Unified settings management** | Settings stubs in some apps | No centralised tenant settings surface in BSU |
| P2-12 | **Usage analytics dashboard** | Speed Insights integrated | BSU-level usage dashboard (per-tenant, per-feature) not built |

### Braden

| # | Feature | What Exists | What's Missing |
|---|---------|-------------|----------------|
| P2-13 | **GA4 rollout** | GA4 script wired | Placeholder measurement ID `G-XXXXXXXXXX` still in use; not a real property ID |
| P2-14 | **SEO / performance optimisation** | Prerender, JSON-LD, head component | Full Lighthouse ≥90 target not verified; image optimisation incomplete |
| P2-15 | **Visual customisation** | Not started | Roadmap item; no design or implementation |

### R80.3

| # | Feature | What Exists | What's Missing |
|---|---------|-------------|----------------|
| P2-16 | **PWA offline maturity** | `vite-plugin-pwa` + manifest + SW hook | Offline-first data strategy, background sync |
| P2-17 | **Wage calc test coverage** | Multiple Vitest suites exist | 70–90% legally-critical path target not proven; no coverage report |
| P2-18 | **`@bsuite/charge-calc` convergence** | Package dependency + bridge layer exist | Convergence goal not fully closed |

---

## P3 — Entity / Spec Coverage Gaps

These entities are defined in the 198-entity inventory (`docs/plans/CRM7_entity_inventory_v2.xlsx`) and partially exist in the DB but have no verified UI surface:

| Entity Group | DB Tables Present | UI Surface | Gap |
|---|---|---|---|
| **Modern award / Pay data (42)** | `award_rates`, `award_rate_cache` | Awards page (broken — P0-1: wrong column query) | Full penalty/allowance/classification hierarchy UI |
| **Training / Progress (3)** | `training_plan_reviews` | No verified page | Review creation + sign-off workflow |
| **VET Assessment (3)** | `vet_assessments` | Partial | Assessment result recording against unit outcomes |
| **Funding / Administration (5)** | `funding_claims`, `funding_sources` | Funding claims page (partial) | CTF/AASN/ASIP-specific field coverage |
| **Technical / Integration (11)** | `mapd_webhook_*` tables | No UI | Webhook log viewer; WorkforceOne ID management |
| **Credentials / Documents (2)** | Tables exist | Upload only | Credential verification workflow |
| **Commercial / Payroll (1)** | `payroll_records` | Payroll page (Tier 3 — partial) | Payroll run + STP submission workflow |
| **Commercial / Billing (1)** | `invoices` | Billing generate page | Invoice approval + send workflow |

---

## Cross-Project Theme Audit

| Project | Expected Theme | Status | Issues |
|---|---|---|---|
| CRM7 | D2C Neon Electric | ✅ Clean | `--text-heading` is valid and defined; no deprecated vars in active use |
| business-suite-unified | D2C Neon Electric | ✅ Clean | No Corporate brand contamination |
| Conduit | D2C Neon Electric | ✅ Clean | No Corporate brand contamination |
| R80.3 | D2C Neon Electric | ✅ Clean | `--text-heading` defined in `R80.3/src/styles/theme.css` |
| Braden | Corporate | ✅ Clean | `--color-sky: #2563eb` is generic utility blue; not D2C neon contamination |

**No cross-brand contamination detected.** All 5 projects use their correct palette.

---

## Stale Doc Status (as of 2026-03-16)

| Document | Action Taken |
|---|---|
| `docs/20260228-crm7-page-inventory-v1.00W.md` | ✅ Moved to `docs/archive/crm7/` |
| `docs/20260228-crm7-rbac-matrix-v1.00W.md` | ✅ Moved to `docs/archive/crm7/` |
| `docs/matrix.md` | ✅ ARCHIVED header added |
| `docs/navigation.md` | ✅ ARCHIVED header added |
| `docs/crm13-docs/` | Reference-only (104 items); no new linking |
| `docs/ui.md` | ✅ Current — updated 2026 cross-suite UI summary; keep |
| `docs/20260228-crm7-page-inventory-v1.00W.md` (superseded) | Archived above |

---

## Recommended Execution Order

1. **P0-1** Fix `useAwardStore` column query — single-line fix, unblocks Awards UI
2. **P0-6** Audit sync queries in `sync-service.ts` against current migrations; fix column mismatches
3. ~~**P1-6**~~ ✅ Conduit candidate documents route — **done 2026-03-16**
4. ~~**P1-7**~~ ✅ BSU Idea Hub — **done 2026-03-16**
5. ~~**P2-13**~~ ✅ Braden GA4 env var — **done 2026-03-16**
6. **P1-5** GTO evidence field-level parity (198-entity inventory)
7. **P2-9** BSU Stripe end-to-end verification
8. **P1-8** BSU cross-app notifications (Supabase Realtime pub/sub)

---

**Last Updated:** 2026-03-16
**Next Review:** 2026-04-16
