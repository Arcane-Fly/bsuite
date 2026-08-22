---
kind: record
authority: none
owner: bsuite-lane
verdict: superseded
---

<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED
>
> The brainstorm companion to the 2026-03-04 audit report above, drawing on 12+ BSuite documents
> and industry research.
>
> **Superseded by** `docs/20260817-estate-completion-ledger-v1.00W.md` and, for competitor scope
> specifically, by `20260306-workforce-one-parity-analysis-v1.00W.md` in this same directory.
>
> Useful as a record of how the gap set was reasoned about in early 2026. Not a work queue.
> **Marker defect:** `W` on a historical analysis.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

# CRM7 Comprehensive Gap Analysis & Audit Brainstorm

**Document ID:** 20260304-crm7-comprehensive-gap-analysis-v1.00F.md
**Status:** Working Draft
**Date:** 2026-03-04
**Author:** Cascade (Windsurf Agent)
**Sources:** 12+ BSuite docs, full CRM7 codebase inventory, Tavily industry research

---

## Executive Summary

CRM7 is a React + Vite SPA with **~195 active protected routes**, **60+ Zustand stores**, and **46 page directories**. This analysis compares current state against GTO competitors (ReadyRecruit, Workforce One), modern CRM UX (HubSpot, Salesforce, Zoho), and Australian regulatory requirements (GTO National Standards 2017, STP Phase 2, Fair Work). **Note:** AVETMISS/ASQA are RTO obligations, not GTO — see corrections in `20260304-crm7-audit-corrections-task-assignments-v1.00W.md`.

### Overall Maturity: 6.8/10 (corrected from 5.8 — RTO items removed, Cascade fixes applied)

| Category | Score | Notes |
|----------|-------|-------|
| Route Coverage | 9/10 | 200+ routes, comprehensive CRUD |
| Store Coverage | 8/10 | 60+ stores, some legacy |
| GTO Compliance | 6/10 | Module exists, evidence capture partial |
| Financial Pipeline | 7/10 | Billing, invoicing, claims, charge rates |
| AI Capabilities | 7/10 | AI chat, plugins, workflows; AI Gateway live |
| Portal System | 5/10 | 5 portal routes, likely early stage |
| Mobile/Offline | 2/10 | No PWA, no offline sync |
| UX Polish | 5/10 | Functional but missing Kanban, bulk actions |
| Testing | 4/10 | Some store tests, below 70% target |
| Integration | 5/10 | Govt integrations page exists, Xero/MYOB not wired |

---

## 1. Current Inventory Summary

- **Auth:** 9 public routes (Login, Register, SSO, Callback, Reset, Accept Invite)
- **Dashboard:** 1 route
- **Contacts & Clients:** 12 routes (List, Detail, Create, Edit, Groups, Tags, Modern)
- **People (Unified):** 9 routes (replaces legacy apprentice/worker tables)
- **Legacy Redirects:** 14 routes (apprentices→people, external-employees→people, labour-hire→people)
- **Sales Pipeline:** 9 routes (Leads, Opportunities, Pipeline, Deals, Quotes)
- **Analytics & Reporting:** 4 routes
- **Financial:** 8 routes (Budget, Expenses, Invoicing, Payments, Reports)
- **Payroll:** 6 routes + Awards 4 routes
- **Billing:** 3 routes
- **Leave:** 2 routes
- **Charge Rates:** 4 routes
- **Claims:** 5 routes
- **Funding Sources:** 4 routes
- **WHS:** 14 routes (Incidents, Inspections, Reports, Training, Policies, RTW)
- **Compliance + GTO Compliance:** 14 routes (BOOT, Alerts, Evidence, Standards, Risk)
- **Progress Reviews:** 7 routes (Reviews + Templates CRUD)
- **Communications:** 4 routes (Inbox, Compose, Templates, Mail Merge)
- **Documents:** 5 routes + Timesheets 2 + Contracts 7 + Competencies 3
- **Field Officers:** 15 routes (Actions, Case Notes, Competency, Incidents, Site Assessment)
- **Host Employers:** 12 routes (Agreements, Monitoring, Reports, Vacancies)
- **Mentors/Placements:** 6 routes
- **Settings:** 16 routes
- **VET & Training:** 16 routes (Qualifications, Training Packages, Units, Assessments)
- **AI & Workflows:** 2 routes
- **Portal:** 5 routes (Training Provider, Host Employer, Worker, Workplace)
- **60+ Zustand stores** covering all domains
- **46 page directories** under `src/pages/`

---

## 2. Gap Analysis: CRM7 vs Best-in-Class 2026 GTO CRM

### 2.1 MUST-HAVE Gaps (P0/P1)

| # | Gap | Current State | Industry Standard | Pri | Effort |
|---|-----|--------------|-------------------|-----|--------|
| ~~G1~~ | ~~**AVETMISS NAT File Export**~~ | ~~No export found~~ | **RECLASSIFIED: AVETMISS is an RTO obligation, not GTO.** GTOs work with SRTOs who handle AVETMISS. ReadyRecruit & Workforce One don't have it. | ~~P0~~ → **P3** | 2-3w (RTO module) |
| G2 | **USI Capture at Employment** | No USI field/validation | GTOs must capture USI and pass to SRTO. Manual portal fallback exists. | ~~P0~~ → **P1** | 3d |
| G3 | **Training Plan Versioning + E-Signatures** | Plans exist, no versioning/signatures | ACT Standards: versioned plans, electronic signatures, endorsement tracking | P1 | 1w |
| G4 | **STP Phase 2 Data Integration** | No STP integration | ATO requires STP Phase 2 reporting; payroll must integrate | P1 | 2w |
| G5 | **Record Retention Enforcement (30yr QLD)** | No retention policy | QLD: 30-year retention for training records; 5yr financial | P1 | 3d |
| G6 | **Offline Mobile / PWA** | No PWA, no offline | Ready Apprentice has mobile evidence capture; field officers need offline | P1 | 2w |
| G7 | **Payroll/Accounting Integration (Xero/MYOB)** | Settings page stub | Workforce One, aXcelerate, VETtrak all integrate | P1 | 1w |
| G8 | **Employer Capacity Evidence** | Host pages exist, no evidence workflow | GTO Standards: proof of employer capacity, insurance, workers comp | P1 | 3d |

### 2.2 SHOULD-HAVE Gaps (P2)

| # | Gap | Current State | Industry Standard | Pri | Effort |
|---|-----|--------------|-------------------|-----|--------|
| G9 | **Kanban Board Views** | Pipeline page, no drag-drop | HubSpot, Salesforce standard | P2 | 3d |
| G10 | **Inline Editing on Lists** | Standard tables only | HubSpot, Zoho support inline field editing | P2 | 3d |
| G11 | **Bulk Actions** | No bulk action UI | All competitors: multi-select + bulk update/delete/assign | P2 | 2d |
| G12 | **Saved Views / Custom Filters** | Basic filtering | Salesforce saved views, HubSpot custom views | P2 | 3d |
| G13 | **View Toggle (Table/Card/Grid)** | "Modern" contacts variant only | All major CRMs: table/card/Kanban toggle per list | P2 | 2d |
| G14 | **Command Palette (⌘K)** | Planned not shipped | Salesforce, Notion, Linear standard | P2 | 2d |
| G15 | **AI Award Classification** | Award rates page exists | Workforce One automates award progression | P2 | 1w |
| G16 | **Predictive Attrition Scoring** | No predictive analytics | Industry moving to ML-based attrition prediction | P2 | 1w |
| G17 | **Unified Communication Inbox** | Email/SMS pages exist | Best-in-class: unified inbox (email, SMS, in-app, portal) | P2 | 1w |
| G18 | **Document Template Engine** | Template store exists | Generate contracts, letters from templates with merge fields | P2 | 3d |
| G19 | **Audit Trail Dashboard** | Audit log page exists | Comprehensive, searchable, entity-level change history | P2 | 3d |
| G20 | **Claims Forecasting** | Claims dashboard exists | Ready Apprentice: claims forecasting + anomaly detection | P2 | 1w |

### 2.3 COULD-HAVE / Strategic Gaps (P3)

| # | Gap | Current State | Pri | Effort |
|---|-----|--------------|-----|--------|
| G21 | **Multi-Tenant Org Hierarchy** | Single org wizard | P3 | 2w |
| G22 | **Data Warehouse / BI Export** | Analytics page | P3 | 1w |
| G23 | **White-Label Portal** | Portal pages exist | P3 | 1w |
| G24 | **Plugin Marketplace** | AI Plugins page | P3 | 2w |
| G25 | **Multi-Language / i18n** | English only | P3 | 2w |
| G26 | **Public REST API** | No API documented | P3 | 2w |
| G27 | **Apprentice Self-Service Chatbot** | Internal AI chat only | P3 | 1w |
| G28 | **Digital Credentials** | Competency tracking exists | P3 | 1w |

---

## 3. Competitor Comparison Matrix

**⚠️ Note:** aXcelerate and VETtrak are **RTO Student Management Systems**, not GTO CRMs. The actual GTO competitors are **ReadyRecruit** (ReadyTech) and **Workforce One**. Ready Apprentice is RTO-focused with some GTO overlap.

| Feature | CRM7 | ReadyRecruit (ReadyTech) | Workforce One | HubSpot (generic CRM) |
|---------|-------|--------------------------|---------------|------------------------|
| Apprentice Lifecycle | ✅ Full | ✅ Full | ✅ Full | ❌ N/A |
| Host Employer Mgmt | ✅ Full (12 routes) | ✅ Full | ✅ Full | ❌ N/A |
| ~~AVETMISS NAT Export~~ | N/A (RTO only) | N/A (RTO only) | N/A (RTO only) | ❌ N/A |
| USI Capture | ❌ Missing | ✅ Yes | ⚠️ Unknown | ❌ N/A |
| STP Integration | ❌ Missing | ⚠️ Partial | ✅ Built-in | ❌ N/A |
| Xero/MYOB | ❌ Stub only | ✅ Via Ready Contracts | ✅ Built-in | ✅ Marketplace |
| GTO Standards Module | ✅ 10 routes, 8 stores | ⚠️ Unknown | ✅ Full | ❌ N/A |
| BOOT Compliance | ✅ Automated (`charge-calc`) | ⚠️ Unknown | ⚠️ Unknown | ❌ N/A |
| Claims Forecasting | ❌ Missing | ✅ Built-in | ⚠️ Reporting | ❌ N/A |
| Training Plan E-Sign | ❌ Missing | ✅ Electronic | ⚠️ Unknown | ❌ N/A |
| Mobile App | ❌ No PWA | ⚠️ Responsive | ⚠️ Unknown | ✅ Full |
| Kanban Board | ❌ No | ⚠️ Unknown | ❌ No | ✅ Full |
| AI Assistant | ✅ Grok/Claude | ❌ No | ⚠️ "Smart AI" | ✅ HubSpot AI |
| Custom Fields | ✅ Admin UI | ⚠️ Config | ⚠️ Unknown | ✅ Full |
| Bulk Actions | ❌ Missing | ⚠️ Unknown | ⚠️ Unknown | ✅ Full |
| Public API | ❌ None | ✅ REST | ⚠️ Unknown | ✅ Full |
| Dark Mode | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Field Officer Module | ✅ 15 routes (best) | ⚠️ Basic | ⚠️ Basic | ❌ N/A |
| WHS Module | ✅ 14 routes | ⚠️ Basic | ⚠️ Unknown | ❌ N/A |

### CRM7 Competitive Advantages

1. **AI Assistant** — Only GTO CRM with integrated AI (Grok + Claude via Vercel AI Gateway)
2. **Dark Mode** — No competitor offers dark mode; D2C Neon Electric theme is unique
3. **Modern Stack** — React 19, TypeScript strict, Tailwind, Radix UI, Zustand
4. **Custom Fields Admin** — Full custom field management UI with admin panel
5. **Unified People Model** — Migrated from legacy apprentice/worker to unified `people` table
6. **Field Officer Module** — 15 routes with full CRUD — most comprehensive in market
7. **GTO Compliance Module** — 10 routes with evidence capture, standard assessment, risk management
8. **DRY One-Shot Architecture** — Documented cross-project data reuse pattern unique to BSuite

### CRM7 Competitive Disadvantages

1. ~~**No AVETMISS**~~ — **REMOVED: AVETMISS is RTO, not GTO.** Scoped as P3 RTO module add-on.
2. **No mobile/offline** — Field officers and apprentices need mobile access
3. **No Xero/MYOB** — Every competitor integrates with Australian accounting packages
4. **No USI verification** — Regulatory requirement for all RTOs/GTOs
5. **No STP** — Payroll reporting is becoming mandatory
6. **UX gaps** — No Kanban, no bulk actions, no saved views, no inline editing
7. **No public API** — Competitors offer REST APIs for third-party integration

---

## 4. GTO National Standards Compliance Audit

| Standard | Requirement | CRM7 Status | Gap |
|----------|------------|-------------|-----|
| **1.1** Recruit suitable candidates | People recruitment, host vacancies | ✅ Covered | — |
| **1.2** Assess apprentice suitability | Assessment store, competency tracking | ✅ Covered | — |
| **1.3** Match to suitable host | Placements, host matching | ⚠️ Partial | No AI-assisted matching |
| **1.4** Formalise training contract | Contracts module (7 routes) | ⚠️ Partial | No e-signatures, no versioning |
| **1.5** Induction — GTO obligations | People onboarding page | ⚠️ Partial | No structured induction checklist |
| **1.6** Induction — workplace safety | WHS module (14 routes) | ✅ Covered | — |
| **2.1** Monitor apprentice progress | Progress reviews (7 routes) | ✅ Covered | — |
| **2.2** Training plan currency | Training module | ⚠️ Partial | No auto-alerts for plan review dates |
| **2.3** Workplace assessment records | Field officer competency | ✅ Covered | — |
| **2.4** Support at-risk apprentices | Compliance alerts exist | ⚠️ Partial | No predictive attrition scoring |
| **2.5** Manage host employer obligations | Host monitoring, agreements | ✅ Covered | — |
| **2.6** Resolve placement issues | Field officer case notes, incidents | ✅ Covered | — |
| **3.1** Governance & administration | Settings, audit log | ⚠️ Partial | Audit trail needs enhancement |
| **3.2** Financial management | Full financial module | ✅ Covered | — |
| **3.3** Complaints handling | GTO complaints page | ✅ Covered | — |
| **3.4** Records management | GTO records management page | ⚠️ Partial | No retention policy enforcement |
| **3.5** Access & equity | GTO access & equity page | ✅ Covered | — |
| **3.6** Risk management | GTO risk management page | ✅ Covered | — |

**Standards Coverage: 11/18 fully covered, 7/18 partial** — key gaps in e-signatures, retention, and predictive features.

---

## 5. Architecture & Technical Debt Concerns

### 5.1 Legacy Code

- **`apprenticeStore.ts`** — Legacy store still exists alongside unified people model. Should be deprecated with clear migration path.
- **`typeSafeRouting.ts`** — `AppRoute` enum references `/apprentices/:id` paths that now redirect. Enum values should match actual routes.
- **`navigation.ts`** `implementedRoutes` set — only lists ~20 routes but 195+ exist. This set is stale and potentially misleading.

### 5.2 Route Inconsistencies

- **Duplicate import/export settings:** Both `/settings/import-export-data` and `/settings/import-export` exist with different components (`DataImportExport` vs `SettingsImportExport`).
- **`/hosts/agreement`** (singular) and **`/hosts/agreements`** (plural) both routed to different components.
- **`/financial/invoicing/:id`** has `InvoicingDetail` but invoices created at `/financial/invoices/create` — mixed naming.

### 5.3 Permission Gaps

- **~30% of routes lack `permission` prop** — Leads detail, People routes, Leave, Funding Sources, Competencies, Enrichment, Mentors, Placements, and Skills pages have no permission guard.
- Legacy `requiresRole` prop deprecated but not fully migrated.

### 5.4 Store Naming

- Mix of naming patterns: `hostEmployerStore` vs `hostSiteStore` vs `hostAgreementStore` — consistent but `fieldOfficerAssignmentStore` is verbose. Not a bug but worth standardising.

---

## 6. Recommended Implementation Roadmap

### Phase 1: Regulatory Compliance (Weeks 1-4) — MUST SHIP

| Week | Task | Gap Ref | Assignee |
|------|------|---------|----------|
| ~~1-2~~ | ~~AVETMISS NAT file generation~~ | ~~G1~~ | **REMOVED — RTO, not GTO. Reclassified P3.** |
| 1 | USI capture field + verification API integration | G2 | Claude Code Scope B |
| 1-2 | Induction checklist with digital sign-off (Std 1.2) | NEW | Claude Code Scope B |
| 2-3 | Training plan versioning + e-signature integration | G3 | Claude Code Scope B |
| 3 | Employer capacity evidence + insurance tracking on host pages | G8 | Claude Code Scope B |
| 3-4 | Record retention policy engine + archival flags | G5 | Claude Code Scope A |

### Phase 2: Integration & Mobile (Weeks 3-8)

| Week | Task | Gap Ref | Assignee |
|------|------|---------|----------|
| 3-4 | Xero/MYOB OAuth + invoice sync | G7 | Claude Code |
| 4-6 | PWA manifest + service worker + offline data sync | G6 | Cascade |
| 5-8 | STP Phase 2 data export + payroll reconciliation | G4 | Claude Code |

### Phase 3: UX Modernization (Weeks 5-10)

| Week | Task | Gap Ref | Assignee |
|------|------|---------|----------|
| 5-6 | Kanban board component (reusable, start with pipeline) | G9 | Cascade |
| 6-7 | Bulk action bar + multi-select on all list pages | G11 | Cascade |
| 7-8 | Saved views / custom filter persistence | G12 | Claude Code |
| 8-9 | Inline editing on list views | G10 | Cascade |
| 9-10 | View toggle (Table/Card/Kanban) per list page | G13 | Claude Code |
| 10 | Command palette (⌘K) | G14 | Cascade |

### Phase 4: AI Enhancement (Weeks 8-12)

| Week | Task | Gap Ref | Assignee |
|------|------|---------|----------|
| 8-9 | AI-powered award classification assistant | G15 | Claude Code |
| 9-10 | Claims forecasting + anomaly detection | G20 | Claude Code |
| 10-11 | Predictive attrition scoring for apprentices | G16 | Cascade |
| 11-12 | Unified communication inbox | G17 | Cascade |

### Phase 5: Strategic (Weeks 12+)

- Public REST API (G26)
- Multi-tenant org hierarchy (G21)
- White-label portals (G23)
- Plugin marketplace (G24)
- Digital credentials (G28)

---

## 7. Quick Wins (< 1 Day Each)

These can be tackled immediately to improve quality:

1. **Fix `implementedRoutes` set in `navigation.ts`** — currently lists ~20 routes but 195+ exist
2. **Add `permission` props to unguarded routes** — ~30% of routes lack permission checks
3. **Deprecate `apprenticeStore.ts`** — add deprecation notice, alias to person store
4. **Consolidate duplicate settings routes** — merge `/settings/import-export-data` and `/settings/import-export`
5. **Fix `/hosts/agreement` vs `/hosts/agreements`** — standardise to plural
6. **Update `AppRoute` enum in `typeSafeRouting.ts`** — remove stale `/apprentices/*` paths
7. **Fix `/financial/invoicing` vs `/financial/invoices` naming inconsistency**
8. **Add missing `routeName` props** — some routes pass routeName, some don't; standardise

---

## 8. Regulatory Compliance Checklist

### GTO National Standards 2017 (Core GTO Obligations)

- [ ] USI capture at employment (field + format validation)
- [ ] USI Registry API verification (or manual portal fallback)
- [ ] Induction checklist with digital sign-off (Std 1.2)
- [ ] Parent/guardian acknowledgement for <18 apprentices (Std 1.2)
- [ ] Host Employer Agreement review cycle + signed acknowledgement (Std 1.3)
- [ ] Training Plan sign-off tracking: GTO + apprentice + RTO + host (Std 1.4)
- [ ] Support services log (LLN, mentoring, special equipment) (Std 2.1)
- [ ] Training Plan progress vs milestones visual tracker (Std 2.2)
- [ ] Economic downturn/stand-down management workflow (Std 2.3)
- [ ] Performance issue management with structured outcomes (Std 2.5)
- [ ] Insurance compliance tracking (PI/PL/WorkCover) with expiry alerts (Std 3.5)
- [ ] Multi-jurisdiction STA awareness (QLD/NSW/VIC/SA/WA/TAS/NT/ACT) (Std 3.1)
- [ ] Complaints register with outcomes + STA escalation (Std 3.8)
- [ ] Continuous improvement feedback → analysis → action loop (Std 3.7)
- [ ] Apprentice Connect Australia Provider (ACAP) integration
- [ ] STA at-risk Training Contract notification within 14 days

### ~~AVETMISS / NCVER~~ — RTO Only (P3 Strategic Add-on)

> **Note:** These are RTO obligations, not GTO. Scoped as future RTO module.

- [ ] NAT file generation (NAT00010-NAT00130)
- [ ] AVS validation workflow
- [ ] Submission to state training authorities
- [ ] Periodic submission scheduling

### ~~ASQA 2025 Standards~~ — RTO Only (P3 Strategic Add-on)

> **Note:** ASQA regulates RTOs, not GTOs. GTOs register with STAs against National Standards.

- [ ] Assessment mapping documentation
- [ ] Trainer/assessor competency records
- [ ] Annual Declaration on Compliance (ADC) support
- [ ] Policy documentation and evidence capture

### STP Phase 2

- [ ] STP-compliant data elements in payroll
- [ ] Integration with ATO STP gateway
- [ ] Correction and finalisation workflows
- [ ] Audit log of STP submissions

### Fair Work Act

- [ ] Award-aware rate calculations (via @bsuite/charge-calc)
- [ ] Roster record retention (7 years)
- [ ] Modern Award compliance checks
- [ ] Employer obligation evidence capture

### Record Retention

- [ ] Training records: 30 years (QLD) / jurisdiction-aware
- [ ] Financial records: 5 years minimum
- [ ] Signed visit/contact logs: retain per ACT Standards
- [ ] Assessment evidence: retain until qualification expiry + buffer
- [ ] Immutable audit logs for all compliance-critical operations

---

## 9. Cross-Reference with Existing Plans

| Existing Doc | Overlap | Status |
|-------------|---------|--------|
| `crm7-feature-parity-implementation-plan` | G1-G8 partially covered in 4 streams | In Progress |
| `crm7-feature-parity-rebuild-design` | Architecture for BaseEntity, charge-calc | Reference |
| `cross-session-red-team-next-phases` | Tier 0-3 covers immediate bugs | Partially Done |
| `ux-ui-competitor-analysis-plan` | G9-G14 align with UX gaps identified | Planning |
| `gto-standards-reference` | G1-G8 directly map to standards evidence | Reference |
| `DRY-ONE-SHOT-ARCHITECTURE` | Architecture patterns for new entities | Active |
| `pricing-strategy` | Tier features align with gap priorities | Reference |
| `AUTH-MAP` | Auth architecture stable, no gaps | Complete |
| `d2c-theme-specification` | Theme system defined, compliance TBD | Phase 8 |

---

## 10. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **No AVETMISS = cannot sell to GTOs** | Critical | High | Prioritise G1 in Phase 1 |
| **No mobile = field officers use paper** | High | High | PWA in Phase 2 |
| **Permission gaps = data leakage** | High | Medium | Quick win: add permission props |
| **Legacy stores cause confusion** | Medium | Medium | Deprecation notices + migration |
| **30% routes unguarded** | High | Medium | Systematic permission audit |
| **No Xero = manual double-entry** | Medium | High | Phase 2 integration |
| **Test coverage below target** | Medium | High | Incremental test addition |

---

## 11. DRY One-Shot Entry Compliance Audit

### EntitySelector Infrastructure

CRM7 has a well-architected generic `EntitySelector<T>` component (`src/components/entity/EntitySelector.tsx`) — 372 lines — that provides:

- Debounced typeahead search against Supabase (ilike across configured columns)
- Primary + secondary display fields per result
- Full row object returned on select (enables auto-populate)
- Optional quick-add button for inline entity creation
- Supabase JOIN support for related data

### Specialized Selectors (7 found)

| Selector | Table | Search Columns | Status |
|----------|-------|---------------|--------|
| `ContactSelector` | contacts | first_name, last_name, email, company | ✅ Used |
| `ClientSelector` | clients | name, industry (JOINs primary_contact) | ✅ Used |
| `EmployerSelector` | employers | business_name, trading_name, abn | ✅ Used |
| `ApprenticeSelector` | apprentices | first_name, last_name, email (JOINs qual, employer) | ⚠️ Legacy table |
| `FundingSourceSelector` | funding_sources | name, provider, program_name | ✅ Used |
| `QualificationSelector` | qualifications | (assumed from imports) | ✅ Used |
| (Missing) PersonSelector | people | — | ❌ Needed |

### Pages Using EntitySelectors Correctly (8 pages)

- `claims/new.tsx` — ApprenticeSelector + FundingSourceSelector
- `contracts/new.tsx` — ContactSelector + EmployerSelector
- `compliance/create.tsx` — Multiple selectors
- `funding-sources/new.tsx` — ContactSelector
- `hosts/create.tsx` — EmployerSelector
- `people/new.tsx` — Selectors
- `people/[id]/edit.tsx` — Selectors
- `quotes/create.tsx` — ClientSelector

### DRY Violations Found

| Page | Field | Current | Should Be |
|------|-------|---------|-----------|
| **`deals/new.tsx`** | `contact_id` | Raw `<Input>` (free text) | `ContactSelector` or `ClientSelector` |

### Missing Selectors Needed

| Selector | Reason |
|----------|--------|
| **PersonSelector** | `ApprenticeSelector` references legacy `apprentices` table; needs `people` table equivalent |
| **HostEmployerSelector** | Alias/wrapper around EmployerSelector for host-specific filtering |
| **TrainingProviderSelector** | No selector exists for training providers |
| **MentorSelector** | Mentors module has no entity selector |

### One-Shot Compliance Score: 7/10

Strong foundation with `EntitySelector<T>` generic. Key issues:

1. `deals/new.tsx` uses raw input for contact_id (violation)
2. `ApprenticeSelector` references legacy `apprentices` table, not `people`
3. Missing PersonSelector, TrainingProviderSelector, MentorSelector
4. No cross-project entity sharing yet (Conduit, R80.3 can't reuse CRM7's selectors)

---

## 12. Theme & UX Compliance Audit

### 12.1 Neon Color Hex MISMATCH (Critical)

`theme.css` and `tailwind.config.js` define the SAME color names with DIFFERENT hex values:

| Color Name | theme.css (CSS vars) | tailwind.config.js | Match? |
|------------|---------------------|-------------------|--------|
| neon-electric-blue | `#2563eb` | `#00D4FF` | ❌ MISMATCH |
| neon-electric-cyan | `#00cec9` | `#00FFFF` | ❌ MISMATCH |
| neon-electric-indigo | `#4f46e5` | `#6366F1` | ❌ MISMATCH |
| neon-electric-purple | `#6c5ce7` | `#A855F7` | ❌ MISMATCH |
| neon-electric-magenta | `#fd79a8` | `#FF00FF` | ❌ MISMATCH |
| neon-electric-pink | `#ec4899` | `#FF6B9D` | ❌ MISMATCH |
| neon-electric-coral | `#ff4757` | `#FF6B6B` | ❌ MISMATCH |
| neon-electric-orange | `#ff7675` | `#FF8C00` | ❌ MISMATCH |
| neon-electric-yellow | `#fdcb6e` | `#EEFF00` | ❌ MISMATCH |
| neon-electric-green | `#22c55e` | `#39FF14` | ❌ MISMATCH |
| neon-electric-lavender | `#a29bfe` | `#E879F9` | ❌ MISMATCH |

**All 11 neon colors differ.** The CSS vars in `theme.css` match the D2C theme spec; `tailwind.config.js` uses different (brighter/more saturated) values. This means `bg-neon-electric-blue` produces a different color than `var(--neon-electric-blue)`.

**Fix:** Align `tailwind.config.js` to reference CSS vars: `'neon-electric-blue': 'var(--neon-electric-blue)'`

### 12.2 Hardcoded Hex Colors in Pages

| File | Hardcoded Colors | Should Use |
|------|-----------------|------------|
| `Dashboard.tsx` | `#10B981`, `#F97316` | `var(--color-success)`, `var(--color-warning)` |
| `contacts/index.tsx` | 11 hardcoded hex in `TAG_COLORS` map | Tailwind color classes or CSS vars |
| `contacts/tags/index.tsx` | Hardcoded tag color hex values | CSS var system |
| `contracts/[id].tsx` | `STATUS_COLORS` map with 5 hex values | Semantic CSS vars |
| `hosts/reports.tsx` | 5 hardcoded hex values | CSS vars |
| `claims/dashboard.tsx` | 2 hardcoded hex values | CSS vars |
| `auth/login.tsx` | Brand SVG colors (Google, Microsoft) | ✅ Acceptable (3rd party brand) |

**Total: 6 pages with non-brand hardcoded colors** that should use the theme system.

### 12.3 Font Specification Violation

- **D2C Spec requires:** Inter (body), JetBrains Mono (code)
- **theme.css defines:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`)
- **tailwind.config.js:** `fontFamily.sans: 'var(--font-sans)'` — references the system stack

**Fix:** Update `--font-sans` to include Inter as primary: `Inter, -apple-system, BlinkMacSystemFont...` and add `@fontsource/inter` + `@fontsource/jetbrains-mono` packages.

### 12.4 Theme Infrastructure (What Works Well)

- ✅ **ThemeProvider** — Clean context with `light`/`dark`/`system` support, localStorage persistence
- ✅ **CSS variable system** — Comprehensive light/dark vars with WCAG-compliant contrast ratios
- ✅ **High contrast mode** — `@media (prefers-contrast: high)` support
- ✅ **Reduced motion** — `@media (prefers-reduced-motion: reduce)` zeros out transitions
- ✅ **Sidebar tokens** — Properly defined in `index.css` with HSL values for shadcn sidebar
- ✅ **Semantic status colors** — Success/Warning/Error/Info with separate light/dark values
- ✅ **WCAG contrast annotations** — Comments document contrast ratios for each semantic color
- ✅ **shadcn/ui integration** — Proper token mapping for background, foreground, primary, muted, etc.
- ✅ **Animation system** — 6 named animations with CSS vars and utility classes
- ✅ **Z-index scale** — Documented scale from base(0) to toast(1700)

### 12.5 Theme Compliance Score: 6/10

Strong CSS variable infrastructure but critical hex mismatch between CSS vars and Tailwind, hardcoded colors in 6 pages, and font spec violation.

---

## Appendix A: Store Inventory (Complete)

aassRegistrationStore, aiStore, apprenticeStore, assessmentStore, auditStore, awardRateCacheStore, awardStore, bootAssessmentStore, calendarStore, chargeRateStore, clientStore, communicationStore, communicationTemplateStore, competencyAssessmentStore, competencyStore, complianceAlertStore, complianceStore, contactStore, contractStore, contractVariationStore, createEntityStore, customFieldDefinitionStore, dataImportJobStore, documentRecordStore, documentTemplateStore, emailStore, fairWorkAwardStore, fieldOfficerAssignmentStore, fieldOfficerStore, financialStore, fundingClaimStore, fundingSourceStore, govtIntegrationLogStore, gtoComplaintStore, gtoComplianceEvidenceStore, gtoComplianceStore, gtoOrganizationStore, gtoRecordStore, gtoRiskStore, gtoStandardStore, hostAgreementStore, hostEmployerStore, hostSiteStore, invoiceStore, leadStore, leaveStore, mailMergeBatchStore, mentorStore (+10 more truncated from search)

## Appendix B: Research Sources

- ReadyTech Ready Apprentice — <https://readytech.io>
- aXcelerate — <https://www.axcelerate.com.au>
- VETtrak — <https://readytech.io/vettrak>
- Workforce One — <https://www.workforceone.com.au>
- NCVER AVETMISS — <https://www.ncver.edu.au>
- ASQA 2025 Standards — <https://www.asqa.gov.au/rtos/2025-standards-rtos>
- ATO STP Phase 2 — <https://www.ato.gov.au>
- ACT Standards Compliance Guide — <https://www.act.gov.au>
- QLD Record Retention Schedule — Queensland State Archives
