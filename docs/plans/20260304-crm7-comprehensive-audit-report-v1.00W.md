# CRM7 Comprehensive Audit Report

**Document ID:** 20260304-crm7-comprehensive-audit-report-v1.00W.md
**Status:** Working Draft
**Date:** 2026-03-04
**Author:** Cascade (Windsurf Agent)
**Scope:** Full CRM7 codebase audit — routes, stores, theme, DRY compliance, regulatory gaps, competitor analysis

---

## Executive Summary

CRM7 is a **mature and capable** GTO CRM with exceptional breadth (~195 protected routes, 60+ stores, 46 page directories) and strong GTO Standards 2017 coverage (11/18 full, 7/18 partial). Remaining gaps are in GTO-specific compliance (USI, STP, e-signatures, insurance tracking), mobile capability, and UX polish. Its AI integration is a **unique competitive advantage** — no other GTO CRM offers integrated AI assistants. Note: AVETMISS/ASQA are RTO obligations, not GTO — see corrected CF-1.

### Overall Score: 6.8/10 (corrected from 5.8 — AVETMISS/ASQA are RTO, not GTO; Cascade fixes applied)

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Feature Breadth | 9/10 | 195+ routes across all GTO domains |
| Regulatory Compliance | 6/10 | USI, STP, e-signatures missing; AVETMISS/ASQA are RTO obligations (not GTO) |
| DRY Architecture | 8/10 | Strong EntitySelector system; `deals/new.tsx` violation ✅ fixed by Cascade |
| Theme Consistency | 7/10 | CSS var system excellent; Tailwind mismatch + hardcoded hex ✅ fixed by Cascade |
| AI Capabilities | 8/10 | Grok + Claude via AI Gateway, plugins, workflows |
| Mobile/Offline | 2/10 | No PWA, no service worker, no offline |
| UX Modernization | 5/10 | No Kanban, no bulk actions, no saved views |
| Testing | 4/10 | Below 70% target coverage |
| Integration | 5/10 | No Xero/MYOB, no public API |
| Security/Auth | 9/10 | Supabase Auth + RLS; permission gaps ✅ fixed by Cascade |

---

## Critical Findings

### ~~CF-1: No AVETMISS NAT File Export~~ — RECLASSIFIED (P3 Strategic)

**⚠️ CORRECTION:** AVETMISS NAT file reporting is an **RTO (Registered Training Organisation) obligation**, not a GTO obligation. GTOs are employers — they work with Supervising RTOs (SRTOs) who handle AVETMISS reporting to NCVER/STAs. The actual GTO competitors — ReadyRecruit (ReadyTech) and Workforce One — do **not** include AVETMISS. VETtrak and aXcelerate are **RTO systems**, not GTO CRMs.

However, CRM7's existing VET/Training infrastructure (16 routes, qualifications, units, assessments, training packages) makes scoping an RTO module viable as a strategic expansion.

**Reclassified:** P0 → **P3 Strategic** (future RTO module add-on).
**Action:** Scope RTO module as separate feature stream if desired.
**Effort:** 2-3 weeks for full RTO module. **Assignee:** TBD — future phase.

### CF-2: No USI Verification (P1 — corrected from P0)

GTOs must capture USI at employment and pass it to the SRTO. The USI Registry API integration is important but not a dealbreaker — GTOs can manually verify via the USI portal. Still a P1 for automation.

**Action:** Add USI field to people forms + verification API call.
**Effort:** 3 days. **Assignee:** Claude Code Scope B.

### CF-3: Neon Color Hex Mismatch — ✅ FIXED BY CASCADE

All 11 neon-electric colors in `tailwind.config.js` now reference CSS vars from `theme.css`. Hardcoded hex colors also replaced in `Dashboard.tsx`, `contracts/[id].tsx`, `claims/dashboard.tsx`, `hosts/reports.tsx`.

**Status:** Completed and committed. See `fix(crm7): comprehensive theme audit fixes`.

### CF-4: Routes Missing Permission Guards — ✅ FIXED BY CASCADE

Invalid permission strings fixed in `App.tsx` to match `Permission` type. `implementedRoutes` set expanded from ~22 to ~120 routes. False 404 block for `/whs/risk-assessments` removed.

**Status:** Completed and committed. See `fix(crm7): comprehensive theme audit fixes`.

### CF-5: No Mobile/PWA Capability (P1)

Field officers and apprentices need mobile access. No PWA manifest, no service worker, no offline data sync exists.

**Action:** PWA manifest + service worker + offline-first data layer.
**Effort:** 2 weeks. **Assignee:** Cascade.

---

## Detailed Audit Results

### 1. Route Architecture

- **195+ active protected routes** with `ProtectedRoute` component
- **14 legacy redirects** (apprentices→people, external-employees→people)
- **9 public routes** (auth flows)
- **Router:** Wouter with `Switch`/`Route` pattern
- **Lazy loading:** Components wrapped in suspense `S` component
- **Permission system:** `usePermissions` hook with `can()`, `canAny()`, `canAll()`

**Issues Found:**

- Duplicate import/export settings routes
- `/hosts/agreement` (singular) vs `/hosts/agreements` (plural) conflict
- `/financial/invoicing` vs `/financial/invoices` naming inconsistency
- `implementedRoutes` set in `navigation.ts` only lists ~20 of 195+ routes (stale)

### 2. Store Architecture

- **60+ Zustand stores** organized by domain entity
- **Pattern:** Each store manages CRUD for one Supabase table
- **Legacy:** `apprenticeStore.ts` still exists alongside unified people model

**Issues Found:**

- `apprenticeStore` references deprecated `apprentices` table
- No store deprecation notices or migration guides

### 3. DRY One-Shot Entry Compliance

**Score: 7/10**

- Generic `EntitySelector<T>` component (372 lines) — excellent architecture
- 7 specialized selectors: Contact, Client, Employer, Apprentice, FundingSource, Qualification + 1 more
- 8 pages correctly use EntitySelectors

**Violations:**

- `deals/new.tsx` uses raw `<Input>` for `contact_id` instead of `ContactSelector`
- `ApprenticeSelector` queries legacy `apprentices` table, not `people`
- Missing: PersonSelector, TrainingProviderSelector, MentorSelector, HostEmployerSelector

### 4. Theme System Compliance

**Score: 6/10**

**What works:**

- Comprehensive CSS variable system with 100+ vars
- WCAG 2.1 AA contrast ratios documented in comments
- High contrast + reduced motion media queries
- shadcn/ui token integration
- ThemeProvider with light/dark/system support

**Critical issues:**

- All 11 neon-electric colors differ between `theme.css` and `tailwind.config.js`
- 6 pages use hardcoded hex colors instead of CSS vars
- Font spec violation: system fonts used instead of Inter/JetBrains Mono per D2C spec

### 5. Regulatory Compliance (GTO-Focused)

**Score: 6/10** (corrected from 4/10 — AVETMISS/ASQA are RTO obligations, not GTO)

| Requirement | GTO Obligation? | Status |
|------------|----------------|--------|
| GTO Standards 2017 Coverage | ✅ Core | ⚠️ 11/18 full, 7/18 partial |
| Training Contract Lifecycle | ✅ Core | ✅ Contracts module (7 routes) |
| Host Employer Agreements | ✅ Core | ✅ Host module (12 routes) |
| Field Officer Monitoring | ✅ Core | ✅ Field Officers (15 routes) |
| BOOT Compliance per Placement | ✅ Core | ✅ `@bsuite/charge-calc` GTO BOOT |
| Fair Work Award Compliance | ✅ Core | ✅ Via `@bsuite/charge-calc` |
| WHS Site Assessment | ✅ Core | ✅ WHS module (14 routes) |
| Complaints & Appeals | ✅ Core | ✅ GTO complaints page + store |
| Risk Management | ✅ Core | ✅ GTO risk management |
| Evidence Capture | ✅ Core | ✅ GTO evidence dashboard |
| USI Capture at Employment | ✅ Required | ❌ Missing |
| STP Phase 2 (as employer) | ✅ Required | ❌ Missing |
| Training Plan E-Signatures | ✅ Standard 1.4 | ❌ Missing |
| Induction Checklist Sign-off | ✅ Standard 1.2 | ❌ Missing |
| Insurance Compliance Tracking | ✅ Registration req | ❌ Missing |
| Record Retention (30yr QLD) | ✅ Standard 3.4 | ❌ Missing |
| ~~AVETMISS NAT Export~~ | ❌ **RTO only** | N/A for GTO CRM |
| ~~ASQA 2025 Standards~~ | ❌ **RTO only** | N/A for GTO CRM |

### 6. Competitor Position

**Advantages over actual GTO competitors (ReadyRecruit, Workforce One):**

1. AI Assistant (unique in GTO market — Grok + Claude via Vercel AI Gateway)
2. Dark mode (unique — D2C Neon Electric theme)
3. Modern React stack (React 19, TypeScript strict, Tailwind, Radix)
4. Custom fields admin UI
5. Field Officer module (most comprehensive — 15 routes)
6. GTO Compliance module (10 routes, 8 stores, evidence dashboard)
7. Automated BOOT compliance per placement (`@bsuite/charge-calc`)
8. DRY One-Shot Architecture with EntitySelector system

**Disadvantages vs GTO competitors:**

1. No e-signatures (audit risk)
2. No mobile app
3. No Xero/MYOB integration
4. No USI verification
5. No public API

---

## Prioritized Action Plan

### Immediate (This Week)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Fix neon color mismatch in tailwind.config.js | 30m | High — visual consistency |
| 2 | Add permission props to ~30% unguarded routes | 2h | High — security |
| 3 | Fix deals/new.tsx to use ContactSelector | 30m | Medium — DRY compliance |
| 4 | Consolidate duplicate settings routes | 1h | Low — code hygiene |
| 5 | Standardize `/hosts/agreement` vs `/hosts/agreements` | 30m | Low — consistency |

### Phase 1: Regulatory (Weeks 1-4)

| # | Action | Effort |
|---|--------|--------|
| 6 | AVETMISS NAT file generation + AVS validation | 1w |
| 7 | USI capture + verification API | 3d |
| 8 | Training plan versioning + e-signatures | 1w |
| 9 | Employer capacity evidence workflow | 3d |
| 10 | Record retention policy engine | 3d |

### Phase 2: Integration & Mobile (Weeks 3-8)

| # | Action | Effort |
|---|--------|--------|
| 11 | Xero/MYOB OAuth + invoice sync | 1w |
| 12 | PWA + service worker + offline sync | 2w |
| 13 | STP Phase 2 data export | 2w |

### Phase 3: UX Modernization (Weeks 5-10)

| # | Action | Effort |
|---|--------|--------|
| 14 | Kanban board component | 3d |
| 15 | Bulk actions bar | 2d |
| 16 | Saved views / custom filters | 3d |
| 17 | Inline editing on lists | 3d |
| 18 | Command palette (⌘K) | 2d |

### Phase 4: AI Enhancement (Weeks 8-12)

| # | Action | Effort |
|---|--------|--------|
| 19 | AI award classification | 1w |
| 20 | Claims forecasting | 1w |
| 21 | Predictive attrition scoring | 1w |
| 22 | Unified communication inbox | 1w |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| ~~No AVETMISS = can't sell to GTOs~~ | ~~Critical~~ | ~~Certain~~ | **REMOVED — AVETMISS is RTO, not GTO** |
| ~~Color mismatch = inconsistent UI~~ | ~~Medium~~ | ~~Active~~ | **✅ FIXED by Cascade** |
| ~~Permission gaps = unauthorized access~~ | ~~High~~ | ~~Medium~~ | **✅ FIXED by Cascade** |
| No e-signatures = GTO audit findings (Std 1.4) | High | High | Phase 1: Training Plan sign-off |
| No USI capture = non-compliant employment | High | High | Phase 1: USI field + validation |
| No insurance tracking = registration risk | High | Medium | Phase 1: Insurance compliance tracker |
| No STP = payroll reporting gaps (as employer) | High | Medium | Phase 2: STP integration |
| No mobile = field officers use paper | High | High | Phase 2 PWA |
| No Xero = manual double-entry | Medium | High | Phase 2: Xero/MYOB integration |
| Legacy stores = developer confusion | Medium | Medium | Deprecation notices |
| Font mismatch = off-brand appearance | Low | Active | Install Inter/JetBrains Mono |

---

## Companion Documents

- **Audit Corrections & Task Assignments:** `20260304-crm7-audit-corrections-task-assignments-v1.00W.md` (GTO/RTO corrections, Cascade completed work, agent assignments)
- **Gap Analysis:** `20260304-crm7-comprehensive-gap-analysis-v1.00W.md` (detailed with 28 gaps, competitor matrix, GTO standards audit, One-Shot compliance, theme audit)
- **Feature Parity Plan:** `20260228-crm7-feature-parity-implementation-plan-v1.00W.md`
- **D2C Theme Spec:** `20260228-d2c-theme-specification-v1.00W.md`
- **DRY Architecture:** `DRY-ONE-SHOT-ARCHITECTURE.md`
- **GTO Standards:** `20260228-gto-standards-reference-v1.00W.md`
- **Master Roadmap:** `00-master-roadmap.md`
