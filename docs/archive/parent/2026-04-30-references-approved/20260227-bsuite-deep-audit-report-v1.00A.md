# BSuite Deep Audit Report

**Date:** 2026-02-27
**Version:** v1.00W (Working)
**Scope:** CRM7, BSU, Conduit, braden.com.au, R80.3

---

## Executive Summary

All five BSuite projects were audited across code quality, UI/UX consistency, live deployment health, feature completeness, dead pages, and security posture. Key findings:

- **1 Critical Production Bug**: Conduit returns `500 MIDDLEWARE_INVOCATION_FAILED` — missing Supabase env vars on Vercel
- **70 TODO/FIXME items** in CRM7 source (tech debt accumulation)
- **CRM7** has the largest codebase (58 pages) and broadest feature set — also the most incomplete stubs
- **BSU** is well-structured but gated behind Vercel SSO authentication on preview
- **Conduit** has excellent ATS feature coverage (20 pages) but is non-functional in production
- **braden.com.au** is clean with comprehensive admin/CMS capabilities
- **R80.3** is the most mature and focused product with strong calculation services

---

## 1. Conduit (ATS) — CRITICAL

### 1.1 Production Bug 🔴

**`MIDDLEWARE_INVOCATION_FAILED` (HTTP 500)** on every request to the development deployment.

- **Root Cause**: Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are not configured in Vercel project settings. The middleware at `src/middleware.ts` calls `updateSession()` which creates a Supabase client with `process.env.NEXT_PUBLIC_SUPABASE_URL!` — undefined at runtime on Vercel.
- **Local**: Works fine (`.env.local` exists with correct values)
- **Fix**: Add env vars to Vercel project `prj_EpTqQLe4muwr0E18AZoWcMRgUuT7` via dashboard or CLI
- **Priority**: P0 — blocks all testing

### 1.2 Feature Completeness ✅ (Excellent)

Conduit has 20 pages covering the full ATS lifecycle:

| Feature | Page | Status |
|---------|------|--------|
| Dashboard/Pipeline | `/pipeline` | ✅ Implemented |
| Candidates list | `/candidates` | ✅ Implemented |
| Candidate detail | `/candidates/[id]` | ✅ Implemented |
| New candidate | `/candidates/new` | ✅ Implemented (1 TODO) |
| Jobs list | `/jobs` | ✅ Implemented |
| Job detail | `/jobs/[id]` | ✅ Implemented |
| Job create/edit | `/jobs/new`, `/jobs/[id]/edit` | ✅ Implemented |
| Job distribution | `/jobs/[id]/distribute` | ✅ Implemented |
| Interviews | `/interviews` | ✅ Full CRUD with feedback/ratings |
| Offers | `/offers` | ✅ Full lifecycle (draft→send→accept/decline) |
| Compliance | `/compliance` | ✅ VEVO, USI, WWCC, police checks |
| Onboarding | `/onboarding` | ✅ Templates + instances |
| Talent Pools | `/talent-pools` | ✅ List + detail |
| Analytics | `/analytics` | ✅ Implemented |
| Settings | `/settings` | ✅ Pipeline stages, integrations, general |
| Auth (login/register) | `/auth/*` | ✅ Implemented |

### 1.3 Code Quality

- **TypeScript**: Zero `any` types in source code ✅
- **Console pollution**: Only 3 console statements (2 in communicationService, 1 in API route) — acceptable
- **TODO items**: Only 1 (in candidates/new) — excellent
- **AI Integration**: Jodie AI chat fully wired with `@ai-sdk/react` v6 patterns (TextStreamChatTransport, useChat, tool registry)
- **Zustand stores**: Well-structured per-entity stores (candidateStore, jobStore, interviewStore, offerStore, complianceStore, onboardingStore, settingsStore)
- **Accessibility**: Good use of `aria-label`, `aria-hidden`, `role="dialog"`, `aria-modal`

### 1.4 UI/UX Assessment

- **Consistent design language**: Neon Electric theme applied correctly
- **Empty states**: All pages have proper empty state illustrations
- **Loading states**: Spinner components on all data-fetching pages
- **Error handling**: Error banners displayed for API failures
- **Responsive**: Mobile-friendly with `sm:` / `md:` breakpoints
- **Missing**: No breadcrumb navigation between related pages

### 1.5 Architecture Concerns

- Custom dialogs built inline rather than using shared Dialog component from shadcn/ui
- Inline form state management could benefit from React Hook Form + Zod validation (per project standards)
- `confirm()` browser dialogs used for destructive actions (Cancel interview, Delete) — should use custom confirmation dialog

---

## 2. CRM7 (GTO CRM) — MODERATE ISSUES

### 2.1 Deployment Health ✅

- Live at `crm7-git-development-braden-pty-ltd.vercel.app` — returns **200 OK**
- Strong CSP headers configured
- Theme initialization before React hydration (prevents FOUC)
- Chrome extension error suppression scripts (good defensive coding)
- Memory monitoring and infinite loop detection

### 2.2 Feature Completeness (Extensive but Many Stubs)

58 page files — the largest project by far:

| Module | Pages | Notes |
|--------|-------|-------|
| Dashboard | 1 | ✅ Main dashboard |
| Apprentices | 8 | Full lifecycle: list, detail, create, progress, completion, recruitment, training, records |
| Awards | 4 | List, detail, create, edit |
| Claims | 5 | Dashboard, list, detail, create |
| Charge Rates | 3 | List, detail, create |
| Contacts | 4 | List, groups, tags, modern-contacts |
| Contracts | 3 | List, detail, create |
| Compliance | 2 | List, create |
| Financial | 1 | Index |
| Calendar | 1 | Index |
| Analytics | 1 | Index |
| Communications | 1 | Index |
| Competencies | 1 | Index |
| Deals | 1 | Index |
| Documents | 1 | Index |
| VET/Qualifications | 4+ | Import, edit, structure |
| WHS (Safety) | 5+ | Dashboard, incidents, inspections, risk assessments, training, workflows |
| Settings | 4 | Permissions, integrations, configuration, user management |
| Auth | 6 | Login, register, reset, callback, SSO, accept-invite |
| Enrichment | 2 | Index, programs |
| Hosts | 3 | Detail, reports |
| Field Officers | 1 | List |
| Pricing | 1 | Pricing page |
| Admin | 1 | Award updates |

### 2.3 Code Quality Concerns ⚠️

- **70 TODO/FIXME items** across 34 files — significant tech debt:
  - `settings/permissions.tsx` — 9 TODOs (likely placeholder permission logic)
  - `settings/integrations.tsx` — 8 TODOs (unfinished integration connectors)
  - `settings/configuration.tsx` — 5 TODOs
  - `hosts/[id].tsx` — 4 TODOs (incomplete host detail page)
  - Multiple WHS components — 2-3 TODOs each
- **38 console.log statements** across 21 files — needs cleanup:
  - `lib/sync-service.ts` — 11 console.logs (excessive)
  - `lib/sqlite-db.ts` — 4 console.logs
- `api-test.tsx` and `fair-work-demo.tsx` — demo/test pages that should not ship to production
- `OneShotEntryDemo.tsx` — demo component still in codebase

### 2.4 Security

- Strong CSP in `index.html` and `vercel.json`
- Permissions-Policy headers configured
- HSTS with preload
- OAuth SSO integration with BSU

### 2.5 Dead/Suspect Pages

- `/api-test` — test page, should be removed or feature-flagged
- `/fair-work-demo` — demo page, should be behind dev flag
- `/contacts/modern-contacts` — duplicate of `/contacts`?
- `/pricing` — has a console.log and TODO

---

## 3. Business Suite Unified (BSU) — GOOD

### 3.1 Deployment Health

- Returns **401 (Vercel SSO Authentication)** on development branch preview — this is expected behaviour for team-level deployment protection
- Production domain `suite.crm7.app` should be tested separately

### 3.2 Feature Completeness

47 source files, well-organized:

| Feature | File | Status |
|---------|------|--------|
| Dashboard | `UnifiedDashboard.tsx` | ✅ |
| Auth | `AuthForm.tsx`, `AuthCallback.tsx` | ✅ |
| OAuth Consent | `OAuthConsent.tsx` | ✅ |
| Admin Panel | 5 admin pages (SystemOverview, TenantManagement, UserManagement, AuditLog) | ✅ |
| Analytics | `Analytics.tsx` | ✅ |
| Billing/Stripe | `Billing.tsx` + `stripeService.ts` | ✅ |
| Branding | `Branding.tsx` | ✅ |
| Documents | `Documents.tsx` | ✅ |
| Settings | `Settings.tsx` | ✅ |
| CRM7 Embed | `CRM7.tsx` | ✅ |
| GTO Module | `GTO.tsx` | ✅ |
| Government | `Government.tsx` | ✅ |
| Calculator | `Calculator.tsx` | ✅ (R80.3 integration) |
| Marketing Home | `MarketingHome.tsx` | ✅ |
| Service Cards | `ServiceCard.tsx` | ✅ |
| App Switcher | `AppSwitcher.tsx` | ✅ |
| 404 Page | `NotFound.tsx` | ✅ |
| Access Guard | `AccessGuard.tsx` | ✅ |

### 3.3 Code Quality ✅

- **Zero TODO/FIXME items** — cleanest codebase
- Well-structured services: `supabase.ts`, `stripeService.ts`, `adminService.ts`, `biMetricsService.ts`, `permissionsService.ts`, `documentService.ts`, `notificationService.ts`
- Proper barrel exports and service abstraction
- `mcpDebugger.ts` present — useful for development but should be stripped for production

### 3.4 Architecture

- Acts as the portal/entry point for the entire BSuite ecosystem
- OAuth server for cross-app SSO
- Stripe subscription management
- Clean separation: marketing site vs authenticated app

---

## 4. braden.com.au — GOOD

### 4.1 Feature Completeness

54 source files with a comprehensive admin CMS system:

| Feature | Status |
|---------|--------|
| Public Site (Hero, About, Services, Contact, Projects, Apps) | ✅ |
| Contact Form (Enhanced) | ✅ |
| Admin Dashboard | ✅ |
| Content Manager (Pages, Blocks, Settings) | ✅ |
| Media Manager / Library | ✅ |
| Hero Image Manager | ✅ |
| Site Editor (Layout + Component Library) | ✅ |
| Admin Users Management | ✅ |
| Permission Guard | ✅ |
| SEO Head Component | ✅ |
| Share Modal | ✅ |
| Error Boundary | ✅ |
| Breadcrumbs | ✅ |
| Storage Policy Audit | ✅ |
| Debug Component | ⚠️ Should be dev-only |
| SiteEditor subpages (Clients, Emails, Leads, Staff, Tasks cards) | ✅ |

### 4.2 Code Quality

- **3 TODO/FIXME items** only — very clean:
  - `types.ts` — 2 items (type refinements)
  - `EnhancedContactForm.tsx` — 1 item
- Corporate branding (Braden Red `#ab233a`, Gold `#cbb26a`) correctly separated from D2C Neon Electric theme

### 4.3 Concerns

- `Debug.tsx` component should be wrapped in development-only flag
- Verify CSP headers and bot protection are active (per AGENTS.md requirements)

---

## 5. R80.3 (Wage Calculator) — STRONGEST

### 5.1 Feature Completeness

58 source files with deep domain logic:

| Feature | Status |
|---------|--------|
| R8 Calculator (main) | ✅ |
| Award Rate Selector | ✅ |
| Apprentice Manager | ✅ |
| Apprentice Settings Modal | ✅ |
| Comparative View | ✅ |
| Enterprise Agreement Manager | ✅ |
| Export/Import Calculations | ✅ |
| Fair Work Update Notification | ✅ |
| Onboarding Wizard (4-step) | ✅ |
| Settings Page | ✅ |
| Marketing Home | ✅ |
| Auth Callback | ✅ |
| PDF Export Service | ✅ |
| Spreadsheet Wage Service | ✅ |

### 5.2 Service Layer (Excellent)

Comprehensive service architecture:

- `awardRatesService.ts` — Award rate data management
- `awardTemplateService.ts` — Template generation (225 lines, the largest service)
- `calculationService.ts` — Core wage calculations
- `chargeCalculationsService.ts` — Charge rate calculations
- `customPayRateService.ts` — Custom pay rate overrides
- `enterpriseAgreementService.ts` — EA management
- `exportImportService.ts` — Data portability
- `fairWorkService.ts` + `fairworkApi.ts` — Fair Work API integration
- `pdfExportService.ts` — PDF generation
- `spreadsheetWageService.ts` — Spreadsheet calculations
- `unifiedSchemaService.ts` — Schema management

### 5.3 Code Quality

- **1 TODO item** only (in `awardTemplateService.ts`) — excellent
- Tests exist: `awardTemplateService.test.ts` (79 test cases)
- Dual context pattern: `ApprenticeContext.tsx` + `CalculatorContext.tsx`
- BSU OAuth integration for SSO

### 5.4 Compliance Critical

- Wage calculations are legally binding — extra test coverage appropriate
- Fair Work API responses should be cached (per AGENTS.md)

---

## 6. Cross-Project Issues

### 6.1 Shared Concerns

| Issue | CRM7 | BSU | Conduit | braden | R80.3 |
|-------|------|-----|---------|--------|-------|
| TODOs/FIXMEs | 70 ⚠️ | 0 ✅ | 1 ✅ | 3 ✅ | 1 ✅ |
| Console.log pollution | 38 ⚠️ | — | 3 ✅ | — | — |
| TypeScript `any` | Not checked | — | 0 ✅ | — | — |
| Live deployment | ✅ 200 | ✅ (SSO) | 🔴 500 | — | — |
| Demo/test pages | 2 ⚠️ | 0 | 0 | 1 ⚠️ | 0 |
| Empty states | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error boundaries | ✅ | ✅ | — | ✅ | — |

### 6.2 Missing `.env.example` Files

- **Conduit**: No `.env.example` file — developers won't know what env vars are needed
- Other projects have `.env.example` files

### 6.3 Test Coverage

- **R80.3**: Has test files ✅
- **braden**: Has `__tests__/Hero.test.tsx` ✅
- **CRM7**: Needs test audit (no visible test files in pages)
- **BSU**: Needs test audit
- **Conduit**: No test files found ⚠️

---

## 7. Competitor Analysis

### 7.1 ATS Market (Conduit Competitors)

| Competitor | Pricing | Key Strength | Conduit Advantage |
|------------|---------|--------------|-------------------|
| **Greenhouse** | ~$12K+/yr (quote) | Structured interviews, 400+ integrations | Free with BSuite, AU-focused, AI-native |
| **Lever** | ~$6-8/emp/mo | Built-in CRM + sourcing | Integrated with GTO ecosystem |
| **Workable** | $299/mo+ | Fast setup, job board distribution | Conduit has compliance (VEVO/USI/WWCC) |
| **SmartRecruiters** | $15K+/yr | Winston AI matching | Jodie AI is integrated, not add-on |
| **JazzHR** | $75-269/mo | Low cost, simple | Conduit is part of full business suite |
| **Breezy HR** | $157/mo+ | Visual pipelines, free tier | Onboarding + compliance built-in |
| **Recruitee** | €301/mo+ | Collaborative hiring, multilingual | Conduit has AU-specific compliance |

**Conduit's differentiators vs all competitors:**

1. **Australian compliance built-in** (VEVO, USI, WWCC, ABN, WHS, police checks) — no competitor offers this natively
2. **Part of integrated business suite** — CRM, wage calc, billing all connected
3. **AI assistant (Jodie)** with full tool registry for candidate/job/interview/analytics operations
4. **No per-seat pricing** — included in BSuite subscription
5. **GTO/apprenticeship workflow** integration via CRM7

**Where competitors beat us:**

1. **Job board distribution** — Greenhouse/Workable post to 200+ boards; Conduit has basic distribution
2. **Integration ecosystem** — Greenhouse has 400+ integrations; Conduit needs API/webhooks
3. **Structured interview scorecards** — Greenhouse is the gold standard
4. **Candidate sourcing/CRM** — Lever's proactive sourcing is best-in-class
5. **Mobile app** — Most competitors have native mobile; Conduit is web-only
6. **Reporting/analytics depth** — SmartRecruiters has enterprise analytics

### 7.2 GTO CRM Market (CRM7 Competitors)

| Competitor | Type | Notes |
|------------|------|-------|
| **ReadyTech (Ready Apprentice/RDY)** | Purpose-built GTO | Market leader in AU apprenticeship management |
| **Workforce One** | GTO management | Prominent AU vendor |
| **aXcelerate** | RTO/VET management | AVETMISS/ASQA compliance |
| **CloudAssess** | Workplace training | Mobile/offline assessment |
| **Formation CRM** | General AU CRM | Not GTO-specific |
| **SELMA** | Work-based training | Competency management |
| **myOneFlow** | Apprenticeship management | UK/AU focus |

**CRM7's differentiators:**

1. **Full business suite integration** — not just apprentice tracking but CRM + billing + recruitment
2. **Modern tech stack** — React/Vite vs legacy Java/PHP competitors
3. **AI capabilities** — AI assistant for data insights
4. **WHS module** — Integrated workplace safety (incidents, inspections, risk assessments, training)
5. **Financial module** — Claims, charge rates, contracts, funding sources all in one

**Where competitors beat us:**

1. **ReadyTech** has deep AVETMISS reporting integration
2. **Workforce One** has established GTO client base and workflows
3. **CloudAssess** has superior mobile/offline capability for workplace assessments
4. **ReadyTech** connects to national Apprenticeship Data Management System

### 7.3 Wage Calculator Market (R80.3 Competitors)

| Competitor | Notes |
|------------|-------|
| **Fair Work Pay Calculator** | Free government tool, basic |
| **MYOB/Xero payroll** | Built into accounting software |
| **Tanda** | Workforce management with award interpretation |
| **Flare HR** | Award interpretation engine |

**R80.3's differentiators:**

1. **Enterprise Agreement support** — not just awards
2. **Comparative view** — compare rates across awards/EAs
3. **Apprentice-specific calculations** — year-of-apprenticeship wage progression
4. **Export/import** — data portability
5. **PDF export** — professional reports
6. **Integration with CRM7** — auto-populate from apprentice records

### 7.4 Corporate Site Market (braden.com.au)

Well-built with admin CMS. The main competition is Squarespace/Wix but the custom solution allows:

- Direct integration with BSuite services
- Custom admin panel with fine-grained content management
- Developer-controlled deployment and security headers

---

## 8. GTO National Standards Compliance Framework

> **Source**: `GTO-Standards.md` — Evidence Guide to support the National Standards for
> Group Training Organisations (January 2017), Version 1.1. Full markdown conversion in
> repository root.
>
> **Important correction**: AVETMISS is an RTO (Registered Training Organisation) reporting
> standard, not a GTO standard. GTOs are employers, not training providers. The relevant
> compliance framework for CRM7's GTO customers is the **National Standards for Group
> Training Organisations (January 2017)**, not AVETMISS/ASQA.

The National Standards for GTOs comprise **3 Standards with 18 sub-elements** that CRM7
must help GTOs demonstrate compliance with. The Evidence Guide emphasises that compliance
is demonstrated through **practice and behaviour** — not just policies and procedures. GTOs
must show evidence of consistent implementation, feedback loops, and continuous improvement.

### Standard 1: Recruitment, Employment and Induction (4 elements)

The GTO must ensure the right person is recruited, fully informed, properly inducted, and
that host employers and RTOs are engaged before work begins.

| Element | Requirement | CRM7 Feature | Gap? |
|---------|-------------|-------------|------|
| 1.1 | **Pre-contract information**: Inform apprentices about employment conditions, host arrangement, training, support services, rights/obligations. Must include recruitment matching (interests, aspirations, skills), LLN assessment, special needs identification. Info in multiple formats (paper, online, verbal). Under-18s require parent/guardian acknowledgement register. | Apprentice create/onboarding flow | **GAP**: Need pre-employment info pack generation, LLN assessment tracking, parent/guardian sign-off register, recruitment matching scoring |
| 1.2 | **Induction program**: Induct to system — responsibilities under Training Contract, to host/GTO/RTO/school. Cover workplace nature, IR/WR rights (incl. cancellation/appeals/Fair Work), WHS, support mechanisms (LLN, field staff, grievances). All apprentices must complete induction before commencing. Evidence: sign-off checklist. | Apprentice induction module | **GAP**: Need structured induction program with sign-off checklist, WHS/IR content delivery, parent notification for under-18s |
| 1.3 | **Host employer engagement**: Assess host capacity (facilities, WHS site audit, supervision, range of work per Training Plan). Obtain signed Host Employer Agreement. Provide induction with signed acknowledgement. Measure effectiveness via feedback analysis and repeat business levels. | Host employer management (`/hosts`) | **GAP**: Need WHS site audit checklist, Host Employer Agreement with digital sign-off, host induction process, satisfaction/repeat business analytics |
| 1.4 | **Training Plan participation**: GTO and apprentice actively participate in RTO's Training Plan development. Both sign off. Document issues impacting delivery. Maintain records of discussions between RTO, host, GTO on reviews and competency-based progression. | Training module | **PARTIAL**: Training tracking exists but no Training Plan co-development workflow, sign-off tracking, or RTO discussion records |

### Standard 2: Monitoring and Supporting to Completion (6 elements)

The GTO must proactively monitor, support, and intervene across the full lifecycle to
maximise completion rates.

| Element | Requirement | CRM7 Feature | Gap? |
|---------|-------------|-------------|------|
| 2.1 | **Support and mentoring services**: Provide support mechanisms over full term (LLN, mentoring, special equipment for WHS/access). Assess individual need and level of support. Analyse outcomes achieved by those receiving support. Seek feedback on relative value of each support service. Outline changes made as result of analysis. | Apprentice progress tracking | **GAP**: Need individual support plan with needs assessment, support service catalogue with usage tracking, outcome analysis dashboard |
| 2.2 | **Training Plan monitoring**: Monitor progress against Training Plan. Facilitate integration of training and employment experiences. Arrange workplace rotations if required. Request RTO review when employment changes occur. Maintain records of monitoring visit discussions/file notes. | Training records, Competencies | **PARTIAL**: Competency tracking exists but no structured monitoring visit records, rotation planning, or RTO review request workflow |
| 2.3 | **Economic downturn/stand-down management**: Policies for finding new placements before suspension. Governing body risk assessment with financial reserves. 3-year analysis of stand-down usage, reasons, and retention outcomes. | — | **GAP**: No stand-down/downturn management module, no placement continuity workflow |
| 2.4 | **Host employer ongoing support**: Assistance, coordination, advice for full duration of Host Employer Agreement. Track field staff contact frequency/type/issues. Assist hosts in developing mentoring skills. Assess host capacity regularly (qualified trades persons list, skills audit). Manage rotations for economic or skill reasons. Analyse cancellation rates and reasons. | Host employer management, Field Officers | **PARTIAL**: Host management exists but needs contact frequency tracking, host skills audit, cancellation analysis dashboard |
| 2.5 | **Performance management**: Manage performance issues fairly (natural justice, procedural fairness). Record outcomes acknowledged by apprentice. Analyse whether issues are GTO- or host-generated, whether systemic. Review policies regularly using complaints data and apprentice feedback. | — | **GAP**: No formal performance management workflow with documented outcomes, systemic issue detection, or fairness safeguards |
| 2.6 | **Competency-based progression and completion**: Comply with state requirements. Inform hosts and apprentices about industrial agreements supporting CBP&C. Demonstrate efforts to achieve qualification in reasonable timeframe. Analyse feedback from hosts, RTOs, apprentices on CBP&C implementation. | Apprentice progress, Claims | **PARTIAL**: Progress tracking exists but no CBP&C-specific workflow, no industrial agreement information delivery |

### Standard 3: GTO Governance and Administration (8 elements)

The GTO must be viable, well-governed, compliant, and transparent — with robust systems
for insurance, equity, marketing, complaints, and continuous improvement.

| Element | Requirement | CRM7 Feature | Gap? |
|---------|-------------|-------------|------|
| 3.1 | **Legislative compliance**: Comply with Commonwealth, State, Territory legislative/regulatory requirements. Integrate into policies. Address changes by governments. Keep staff and clients informed. Identify areas requiring improvement. | Compliance module | **PARTIAL**: Compliance tracking exists — needs state-specific regulatory change tracking and obligation registers |
| 3.2 | **Incorporation**: GTO is incorporated in Australia, government entity, or regulated by ACNC. | — | **N/A**: Legal status — not a CRM feature |
| 3.3 | **Continuous improvement and strategic direction**: Current business plan (12/24-month projections, Board-reviewed). Risk assessment and management plan. CI framework: monitor service delivery, review policies, seek feedback from apprentices/hosts/stakeholders. Communicate KPIs to staff. Review governance arrangements. | — | **GAP**: No business plan tracker, risk register, CI framework dashboard, or KPI communication module |
| 3.4 | **Financial viability**: Certified accounts (annual). Accounting system with monthly reconciliation. Financial management policies. Skills within governance body. 12-month profit forecasting. Resource allocation aligned to outcomes. Inform registering body of viability issues. Analyse host employer satisfaction re: value-for-money. | — | **GAP**: No financial health dashboard, no registering body notification workflow. Could integrate with Xero/MYOB for financial data. |
| 3.5 | **Insurance**: Hold appropriate insurances (workers comp, public liability, professional indemnity, building/contents, vehicles, debtors, host equipment, cyber). Certificate of currency required (not quotes/invoices). Annual review. All activities must be covered. | — | **GAP**: No insurance register with certificate of currency tracking and expiry alerts |
| 3.6 | **Access and equity**: Monitor outcomes for apprentices facing barriers. Identify improvements. Train staff/hosts on A&E strategies. Partner with specialist organisations. Ensure reasonable adjustments for disability. Seek feedback from equity specialists. | — | **GAP**: No equity/diversity tracking, no reasonable adjustment register, no barrier-to-participation flagging |
| 3.7 | **Marketing**: Clear, accurate marketing. Honour commitments in marketing materials. Maintain register of approved material with permission forms. Seek feedback on clarity/accuracy. | — | **LOW PRIORITY**: Marketing compliance — not core CRM feature |
| 3.8 | **Complaints and appeals**: Publicly available, easily accessible policy. Staff understand dispute resolution mechanisms. Inform apprentices/parents/hosts how to lodge. Follow natural justice and procedural fairness. Independent third-party review option. Record all complaints with outcomes and timeframes. Analyse and review processes to prevent recurrence. | Communications module | **GAP**: Need formal complaints register with natural justice safeguards, independent review option, and recurrence prevention tracking |

### Evidence Guide: What CRM7 Must Generate for Auditors

The Evidence Guide emphasises that evidence must be **sufficient** (regular/consistent, not
one-off), **authentic**, and **clearly show compliance** (not inferred). CRM7 should be the
system of record that generates audit-ready evidence:

1. **Recruitment matching records** — how interests/skills were assessed and matched (Std 1.1)
2. **Induction completion registers** — sign-off checklists per apprentice, parent acknowledgements (Std 1.2)
3. **Host Employer Agreement register** — signed agreements, WHS site audits, capacity assessments (Std 1.3)
4. **Training Plan participation records** — GTO/apprentice sign-off, RTO discussion notes (Std 1.4)
5. **Support service usage and outcomes** — individual support plans, mentoring logs, outcome analysis (Std 2.1)
6. **Monitoring visit records** — field staff contact logs with frequency, type, issues, file notes (Std 2.2, 2.4)
7. **Rotation and placement records** — workplace rotation history with skill coverage analysis (Std 2.2, 2.4)
8. **Stand-down/downturn records** — 3-year analysis of stand-down events, placement efforts, retention (Std 2.3)
9. **Performance management records** — documented outcomes, fairness evidence, systemic analysis (Std 2.5)
10. **CBP&C compliance records** — progression timelines, feedback analysis, industrial agreement info (Std 2.6)
11. **Compliance obligation register** — state-specific regulatory requirements with currency tracking (Std 3.1)
12. **CI framework evidence** — business plan reviews, risk assessments, KPI tracking, improvement actions (Std 3.3)
13. **Insurance certificate register** — certificates of currency, annual review dates, coverage verification (Std 3.5)
14. **Equity and diversity records** — barrier identification, reasonable adjustments, outcome monitoring (Std 3.6)
15. **Complaints and appeals register** — formal log with outcomes, timeframes, natural justice evidence, recurrence analysis (Std 3.8)

---

## 9. Actionable Improvement Plan (with Competitor Gaps Flagged)

### P0 — Critical (This Week)

1. **Fix Conduit Vercel env vars** — Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel project settings. Values match root `.env.local` (same Supabase project `tuybltdrdefjblnplpqo`)
2. **Create Conduit `.env.example`** — Document required env vars for developers
3. **Remove or feature-flag demo pages** in CRM7 (`/api-test`, `/fair-work-demo`, `OneShotEntryDemo`)

### P1 — High Priority (Next 2 Weeks)

4. **Clean up CRM7 console.logs** — Remove 38 debug logs, especially 11 in `sync-service.ts`
5. **Address top 20 CRM7 TODOs** — Focus on settings/permissions (9 TODOs) and integrations (8 TODOs)
6. **Add Conduit tests** — Unit tests for stores, integration tests for critical flows
7. **Replace `confirm()` dialogs** in Conduit with custom confirmation components
8. **Add breadcrumb navigation** to Conduit dashboard pages
9. **Implement structured interview scorecards** in Conduit — 🏴 *Competitor gap: Greenhouse is the gold standard here*
10. **GTO Std 1.2: Induction program with sign-off checklist** in CRM7 — WHS/IR content, parent notifications for under-18s — 🏴 *Competitor gap: ReadyTech has this built-in*

### P2 — Medium Priority (Next Month)

11. **Job board integration API** for Conduit — SEEK, Indeed, LinkedIn — 🏴 *Competitor gap: Greenhouse/Workable post to 200+ boards; this is the #1 ATS gap*
12. **GTO Std 2.2/2.4: Structured field visit scheduling** with monitoring visit records, contact frequency tracking, file notes — 🏴 *Competitor gap: ReadyTech + Workforce One both have this*
13. **GTO Std 2.6: Competency-based progression and completion** tracking with industrial agreement info delivery — 🏴 *Competitor gap: ReadyTech has "alerts dashboard"*
14. **GTO Std 1.3: Host Employer Agreement management** — WHS site audit, digital sign-off, capacity assessment, satisfaction/repeat business analytics — 🏴 *Competitor gap: ReadyTech handles host employer management natively*
15. **GTO Std 1.1: Pre-contract information system** — Info pack generation, recruitment matching scoring, LLN assessment, parent/guardian register
16. **GTO Std 2.1: Support and mentoring services** — Individual support plans, needs assessment, service catalogue, outcome analysis
17. **CRM7 test suite** — Test coverage for compliance, claims, apprentice workflows
18. **Conduit analytics depth** — Time-to-hire, source tracking, conversion funnels — 🏴 *Competitor gap: SmartRecruiters has enterprise analytics*
19. **Webhook/API system** for Conduit — Enable third-party integrations — 🏴 *Competitor gap: Greenhouse has 400+ integrations*
20. **Replace inline form state** in Conduit with React Hook Form + Zod (per project standards)
21. **BSU marketing site improvements** — SEO, landing pages, conversion optimization

### P3 — Strategic (Next Quarter)

22. **GTO cross-cutting: Audit-ready compliance report generation** — Exportable evidence packs per standard element (all 15 evidence types from §8) — 🏴 *Competitor gap: ReadyTech can generate compliance evidence for state auditors*
23. **GTO Std 1.4: Training Plan collaboration** — GTO/apprentice sign-off, RTO discussion records, co-development workflow
24. **GTO Std 3.8: Complaints and appeals register** — Natural justice safeguards, independent review option, recurrence prevention
25. **GTO Std 3.3: Continuous improvement and strategic direction** — Business plan tracker, risk register, CI framework dashboard, KPI communication
26. **GTO Std 3.5: Insurance certificate register** — Certificate of currency tracking, annual review, coverage verification — 🏴 *Competitor gap: Workforce One tracks employer compliance docs*
27. **GTO Std 2.3: Economic downturn/stand-down management** — Placement continuity workflow, 3-year stand-down analysis, financial reserves tracking
28. **GTO Std 2.5: Performance management** — Fair process with natural justice, outcome recording, systemic issue detection
29. **GTO Std 3.6: Access and equity** — Barrier-to-participation flagging, reasonable adjustment register, outcome monitoring
30. **Candidate sourcing module** for Conduit — LinkedIn/SEEK profile import — 🏴 *Competitor gap: Lever's proactive sourcing is best-in-class*
31. **Mobile app or PWA** for Conduit and CRM7 — 🏴 *Competitor gap: Most ATS competitors have native mobile; CloudAssess has offline mobile*
32. **Advanced AI features** — Resume parsing, candidate matching scores, interview transcription — 🏴 *Competitor gap: SmartRecruiters Winston AI, Greenhouse AI*
33. **Multi-channel communications** — SMS, email templates, WhatsApp — 🏴 *Competitor gap: Most modern ATS platforms have multi-channel*
34. **Client portal** for Conduit — Employers view candidates, schedule interviews — 🏴 *Competitor gap: Greenhouse employer portal*
35. **Offline mode** for CRM7 field officers — 🏴 *Competitor gap: CloudAssess has mobile/offline for workplace assessments*
36. **White-label capability** for BSU — Allow GTOs to brand the suite

### P4 — Future (Biped Integration)

37. **Migrate Biped frontend to TypeScript strict mode** — Currently `.js`/`.jsx`
38. **Replace Flask-Login auth with Supabase Auth + BSU OAuth SSO**
39. **Migrate Biped backend from Flask/PostgreSQL to Supabase** (gets RLS, realtime, edge functions)
40. **Deploy Biped to Vercel** (currently Railway) — align with BSuite deployment model
41. **Cross-pollinate**: CRM7 host employers post to Biped marketplace; Conduit candidates find tradie apprenticeships; R80.3 integrates with Biped provider pay rates

---

## 10. Competitive Positioning Summary

### Where BSuite Wins

- **Integrated ecosystem** — No competitor offers CRM + ATS + Wage Calculator + Billing in one suite
- **Australian compliance** — VEVO, USI, WWCC, WHS compliance built natively
- **AI-native** — Jodie AI in Conduit, AI assistant in CRM7
- **Modern stack** — React, TypeScript, Supabase vs legacy Java/PHP competitors
- **Price** — Included in BSuite subscription vs $3K-50K+/yr for individual competitor products
- **GTO-specific workflows** — Apprentice lifecycle management with host employer management

### Where BSuite Must Improve (Competitor Gaps)

| Gap | Competitor Benchmark | Priority | BSuite Project |
|-----|---------------------|----------|----------------|
| Job board distribution (SEEK/Indeed/LinkedIn) | Greenhouse (200+ boards), Workable | P2 | Conduit |
| Integration ecosystem (APIs/webhooks) | Greenhouse (400+ integrations) | P2 | Conduit |
| Structured interview scorecards | Greenhouse (gold standard) | P1 | Conduit |
| Candidate sourcing/CRM | Lever (proactive sourcing) | P3 | Conduit |
| Mobile app (native/PWA) | Most ATS + CloudAssess (offline) | P3 | Conduit + CRM7 |
| Enterprise analytics/reporting | SmartRecruiters | P2 | Conduit |
| GTO Standard 1: Induction checklists + sign-off | ReadyTech | P1 | CRM7 |
| GTO Standard 2: Field visit scheduling + compliance | ReadyTech, Workforce One | P2 | CRM7 |
| GTO Standard 2: At-risk early warning | ReadyTech (alerts dashboard) | P2 | CRM7 |
| GTO Standard 2: Host employer agreement mgmt | ReadyTech | P2 | CRM7 |
| GTO Standard 3: Audit-ready compliance reports | ReadyTech | P3 | CRM7 |
| GTO Standard 3: Insurance tracking/expiry | Workforce One | P3 | CRM7 |
| Training Plan collaboration (GTO-RTO) | ReadyTech, aXcelerate | P3 | CRM7 |
| Multi-channel comms (SMS/email/WhatsApp) | Most modern ATS | P3 | Conduit |

### Clarification: AVETMISS vs GTO Standards

- **AVETMISS** = Australian Vocational Education and Training Management Information Statistical Standard. This is an **RTO** (Registered Training Organisation) reporting standard managed by **ASQA** (Australian Skills Quality Authority). It covers training delivery and student outcome reporting.
- **GTO National Standards** = The compliance framework for **Group Training Organisations** (January 2017). These 3 standards cover recruitment/employment/induction, monitoring/support, and governance/administration. This is what CRM7's GTO customers must comply with.
- CRM7 should focus on **GTO National Standards** compliance tooling. AVETMISS integration is relevant only if CRM7 also serves RTOs or needs to report training outcomes — that's a secondary concern and would be an RTO-focused add-on module.

---

*Report generated by deep codebase audit + live deployment smoke testing + competitor research + GTO National Standards analysis.*
*Next steps: P0 fixes immediately, then GTO compliance gaps (P1-P2) to differentiate from ReadyTech.*
