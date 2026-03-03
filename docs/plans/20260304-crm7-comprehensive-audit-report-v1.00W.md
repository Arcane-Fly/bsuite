# CRM7 Comprehensive Audit Report

**Document ID:** 20260304-crm7-comprehensive-audit-report-v1.00W.md
**Status:** Working Draft
**Date:** 2026-03-04
**Author:** Cascade (Windsurf Agent)
**Scope:** Full CRM7 codebase audit — routes, stores, theme, DRY compliance, regulatory gaps, competitor analysis

---

## Executive Summary

CRM7 is a **mature but incomplete** GTO CRM with exceptional breadth (~195 protected routes, 60+ stores, 46 page directories) but critical gaps in regulatory compliance (AVETMISS, USI, STP), mobile capability, and UX polish. Its AI integration is a **unique competitive advantage** — no other GTO CRM offers integrated AI assistants.

### Overall Score: 5.8/10

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Feature Breadth | 9/10 | 195+ routes across all GTO domains |
| Regulatory Compliance | 4/10 | Missing AVETMISS, USI, STP — dealbreakers for sales |
| DRY Architecture | 7/10 | Strong EntitySelector system, 1 violation found |
| Theme Consistency | 6/10 | CSS var system excellent, but 11 color mismatches + 6 pages hardcoded |
| AI Capabilities | 8/10 | Grok + Claude via AI Gateway, plugins, workflows |
| Mobile/Offline | 2/10 | No PWA, no service worker, no offline |
| UX Modernization | 5/10 | No Kanban, no bulk actions, no saved views |
| Testing | 4/10 | Below 70% target coverage |
| Integration | 5/10 | No Xero/MYOB, no public API |
| Security/Auth | 8/10 | Supabase Auth + RLS, ProtectedRoute system |

---

## Critical Findings

### CF-1: No AVETMISS NAT File Export (P0)

Every competitor (ReadyTech, aXcelerate, VETtrak, Workforce One) provides AVETMISS NAT file generation. Without this, CRM7 **cannot be sold to any Australian GTO**. This is the single most important gap.

**Action:** Implement NAT file generation (NAT00010-NAT00130) + AVS validation workflow.
**Effort:** 1 week. **Assignee:** Claude Code.

### CF-2: No USI Verification (P0)

NCVER requires USI capture and verification at enrolment. The USI Registry API must be integrated.

**Action:** Add USI field to people forms + verification API call.
**Effort:** 3 days. **Assignee:** Cascade.

### CF-3: Neon Color Hex Mismatch (P1)

All 11 neon-electric colors in `tailwind.config.js` differ from `theme.css` CSS vars. Using `bg-neon-electric-blue` produces `#00D4FF` while `var(--neon-electric-blue)` produces `#2563eb`. This creates visual inconsistency.

**Action:** Change Tailwind config to reference CSS vars: `'neon-electric-blue': 'var(--neon-electric-blue)'`.
**Effort:** 30 minutes. **Assignee:** Any agent.

### CF-4: ~30% Routes Missing Permission Guards (P1)

Routes for Leads detail, People, Leave, Funding Sources, Competencies, Enrichment, Mentors, Placements, and Skills lack `permission` props on `ProtectedRoute`. This means any authenticated user can access them.

**Action:** Systematic audit of all routes, add appropriate permission guards.
**Effort:** 2 hours. **Assignee:** Any agent.

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

### 5. Regulatory Compliance

**Score: 4/10**

| Requirement | Status |
|------------|--------|
| AVETMISS NAT Export | ❌ Missing |
| USI Verification | ❌ Missing |
| STP Phase 2 | ❌ Missing |
| Training Plan E-Signatures | ❌ Missing |
| Record Retention (30yr QLD) | ❌ Missing |
| GTO Standards Coverage | ⚠️ 11/18 full, 7/18 partial |
| Fair Work Award Compliance | ⚠️ Via @bsuite/charge-calc |
| ASQA 2025 Standards | ⚠️ Partial |

### 6. Competitor Position

**Advantages over ReadyTech/aXcelerate/VETtrak/Workforce One:**

1. AI Assistant (unique in GTO market)
2. Dark mode (unique)
3. Modern React stack
4. Custom fields admin UI
5. Field Officer module (most comprehensive)

**Disadvantages vs all competitors:**

1. No AVETMISS (dealbreaker)
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
| No AVETMISS = can't sell to GTOs | Critical | Certain | Phase 1 priority |
| Color mismatch = inconsistent UI | Medium | Active (happening now) | Immediate fix |
| Permission gaps = unauthorized access | High | Medium | Immediate fix |
| No mobile = field officers use paper | High | High | Phase 2 PWA |
| Legacy stores = developer confusion | Medium | Medium | Deprecation notices |
| Font mismatch = off-brand appearance | Low | Active | Install Inter/JetBrains Mono |

---

## Companion Documents

- **Gap Analysis:** `20260304-crm7-comprehensive-gap-analysis-v1.00W.md` (detailed with 28 gaps, competitor matrix, GTO standards audit, One-Shot compliance, theme audit)
- **Feature Parity Plan:** `20260228-crm7-feature-parity-implementation-plan-v1.00W.md`
- **D2C Theme Spec:** `20260228-d2c-theme-specification-v1.00W.md`
- **DRY Architecture:** `DRY-ONE-SHOT-ARCHITECTURE.md`
- **GTO Standards:** `20260228-gto-standards-reference-v1.00W.md`
- **Master Roadmap:** `00-master-roadmap.md`
