# BSuite Master Orchestration Plan — Red-Team Validated

**Document ID:** 20260305-master-orchestration-plan-v1.00W.md
**Status:** Working Draft
**Date:** 2026-03-05
**Author:** Cascade (Windsurf) — Master Orchestration + Red-Team
**Scope:** fairwork-enhanced audit, CRM7 next sprint, BSuite-wide priorities
**Method:** Full codebase review + multi-persona red-team ({CODE_REVIEWER}, {SECURITY_SPECIALIST}, {TECHNICAL_ARCHITECT}, {PERFORMANCE_OPTIMIZER})

---

## Part 1: fairwork-enhanced Edge Function — Red-Team Audit

### 1.1 Current State Summary

**File:** `business-suite-unified/supabase/functions/fairwork-enhanced/index.ts` (1,125 lines)
**Consumers:** CRM7 (`fairworkEnhancedService.ts`), R80.3 (`fairworkApi.ts`)
**Actions:** 13 (`awards`, `award-detail`, `apprentice-rates`, `historical-rates`, `allowances`, `penalty-rates`, `classifications`, `pay-rates`, `expense-allowances`, `wage-allowances`, `penalties`, `award-updates`, `check-updates`)

**Fallback chain:** FWC MAPD API → Supabase `award_rate_cache` table → Hardcoded data
**Recent user improvements:** Added `FALLBACK_SOURCE_WARNING`, `FALLBACK_RATES_AS_OF`, `stale` flag, and `rates_as_of` metadata to all response paths. This was a good addition — consumers can now surface data freshness warnings.

### 1.2 Bugs Found

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| **B1** | 🔴 High | **`handlePenaltyRates` returns hardcoded `FALLBACK_PENALTY_RATES` even when live API succeeds** — Line 834 includes `penaltyRates: FALLBACK_PENALTY_RATES` alongside the real `penalties` array from the API. Consumer gets conflicting data. Same issue in db-cache path (line 864). | Lines 830-850, 857-871 |
| **B2** | 🔴 High | **API key lookup inconsistency** — `fairwork-enhanced` queries `api_keys.key_name = 'FAIRWORK_API_KEY'`; `sync-award-rates` queries `api_keys.service_name = 'fairwork' AND is_active = true`. Different column, different filter. If DB row doesn't have both, one function finds the key and the other doesn't. | `fairwork-enhanced` L274, `sync-award-rates` L104-109 |
| **B3** | 🟡 Medium | **`check-updates` action is a no-op** — Returns `{ success: true, message: "Update check initiated" }` but performs zero work. Dead code that claims functionality. | Lines 996-1001 |
| **B4** | 🟡 Medium | **`sync-award-rates` uses wrong FWC API endpoints** — Calls `/classifications?award_fixed_id=X` but the MAPD API path is `/awards/{code}/classifications`. The `award_fixed_id` query param may not be supported on the base `/classifications` endpoint. | `sync-award-rates` L171-178 |
| **B5** | 🟢 Low | **Hardcoded `FALLBACK_RATES_AS_OF = "2025-07-01"` is a static string** — If someone updates the hardcoded rate tables without updating this constant, consumers get incorrect staleness information. | Line 199 |

### 1.3 Security Issues ({SECURITY_SPECIALIST})

| # | Severity | Finding | Remediation |
|---|----------|---------|-------------|
| **S1** | 🔴 High | **No rate limiting** — Any caller can hammer the FWC API through this proxy. `tga-search` has rate limiting but `fairwork-enhanced` does not. | Port rate limiter from `tga-search` (IP-based, 30 req/min). |
| **S2** | 🔴 High | **CORS `Access-Control-Allow-Origin: *`** — Any website can call this function. | Restrict to BSuite domains: `crm7.app`, `crm.crm7.app`, `r8.crm7.app`, `suite.crm7.app`, `localhost:*`. |
| **S3** | 🟡 Medium | **No caller authentication** — Function uses service role key internally but doesn't validate the caller's JWT from the `Authorization` header. | Add `supabaseClient.auth.getUser()` check or require valid anon-key JWT. |
| **S4** | 🟡 Medium | **No input sanitization** — `body.awardCode` is passed directly into API URLs (`/awards/${awardCode}/...`) and DB queries without validation. Path traversal risk on the API URL. | Validate `awardCode` matches `/^MA\d{6}$/` pattern. |

### 1.4 Architecture Issues ({TECHNICAL_ARCHITECT})

| # | Severity | Finding | Remediation |
|---|----------|---------|-------------|
| **A1** | 🟡 Medium | **DRY violation: Two separate FWC API clients** — `fairwork-enhanced` and `sync-award-rates` both implement FWC fetch logic with different retry strategies, different API key lookup, and different endpoint formats. | Extract shared `fwc-api-client.ts` module or consolidate into one function. |
| **A2** | 🟡 Medium | **Cross-project ownership split** — `sync-award-rates` is in `R80.3/supabase/functions/` but `fairwork-enhanced` is in `business-suite-unified/supabase/functions/`. Unclear ownership. | Move `sync-award-rates` to BSU alongside `fairwork-enhanced`, or merge into `fairwork-enhanced` as a `sync` action. |
| **A3** | 🟡 Medium | **Staleness threshold magic number duplicated** — `30 * 24 * 60 * 60 * 1000` appears in both the Edge Function and `crm7/fairworkEnhancedService.ts`. | Export constant from a shared location or have the Edge Function always include `is_stale` so clients don't recalculate. |
| **A4** | 🟢 Low | **CRM7 double-fallback** — `fairworkEnhancedService.ts` falls back to `award_rate_cache` when the Edge Function fails, but the Edge Function already falls back to the same cache. Useful if the Edge Function itself is down, but adds complexity. | Document this as intentional defense-in-depth. |
| **A5** | 🟢 Low | **No cron schedule for `sync-award-rates`** — Cache population depends on manual invocation. No Supabase cron job exists. | Add `pg_cron` job: `SELECT cron.schedule('sync-award-rates', '0 3 1 * *', ...)` — monthly on the 1st at 3am. |
| **A6** | 🟢 Low | **`readAllCachedAwards` does `SELECT *` then deduplicates in JS** — Should use `DISTINCT ON (award_code)` in PostgreSQL. | Optimize query. |

### 1.5 Code Quality ({CODE_REVIEWER})

| # | Finding | Remediation |
|---|---------|-------------|
| **Q1** | **`any` types everywhere** — `body: any`, `supabaseClient: any`, `data: any`. No Zod validation on request body. | Add Zod schemas per action, type the Supabase client. |
| **Q2** | **No structured logging** — Mix of `console.log`, `console.warn`, `console.error` without correlation IDs. | Add request ID to all log lines for tracing. |
| **Q3** | **No tests** — Zero test coverage for a function handling legally-critical wage data. | Add Deno test file with mocked Supabase client + FWC API. |

### 1.6 Prioritized Fix Plan

| Priority | Items | Effort | Impact |
|----------|-------|--------|--------|
| **Now** (this session) | B1 (penalty rates bug), S4 (input validation) | 30m | Correctness + security |
| **Sprint 1** | S1 (rate limiter), S2 (CORS), B2 (API key lookup), A5 (cron) | 2h | Security + reliability |
| **Sprint 2** | A1 (DRY), A2 (ownership), Q1 (Zod), Q3 (tests) | 1d | Maintainability |
| **Backlog** | B3 (check-updates), B5 (static date), A3 (shared constant), A6 (query opt) | 2h | Polish |

---

## Part 2: CRM7 Next Sprint — Audit-Driven Priorities

### 2.1 What's Done (from audit doc + master roadmap)

- ✅ Route integrity: 169 routes, **zero 404s**, zero dead links
- ✅ Permission hardening: 14 fixes applied, all guards correct
- ✅ Theme audit: neon colors aligned, hardcoded hex replaced
- ✅ Tier 1+2 page wiring: 11 pages wired to Zustand stores
- ✅ Launch-Ready Phases 0-4: feature flags (35), route gating (57 pages), nav gating, kill list, Cmd+K palette
- ✅ AI assistant Phases 1-8: tools, persona, chat UI, model router
- ✅ TypeScript: zero errors across all 5 apps

### 2.2 CRM7 Next Sprint Recommendations

Based on audit findings, GTO document gap analysis (Track A), and competitive position:

#### Sprint A: GTO Core Workflows (3.5 weeks) — P1

These are the **core GTO daily workflows** identified from real GTO employer documents. They represent the highest business value because they're what field officers and administrators use every day.

| # | Task | Audit Ref | Effort | Why Now |
|---|------|-----------|--------|---------|
| 1 | **Enhanced Timesheets** — Per-day time blocks, work/leave type classification, multi-host, 38/40hr validation, host approval workflow, lock-after-submit | A1 | 1w | Core weekly touchpoint — timesheets are the #1 daily workflow |
| 2 | **Enhanced Competency Assessments** — 4-point scale, 15+ criteria across 4 categories, dual sign-off (GTO + Host), visit type classification | A2 | 1w | Primary field officer deliverable |
| 3 | **Enhanced Site Visits** — Configurable visit schedule tied to apprentice lifecycle, per-visit checklist, P&E assessment, PPE log | A4 | 1w | Primary field officer workflow |
| 4 | **Host Employer Pre-Placement Assessment** — Supervision, training commitment, OHS, document checklist | A5 | 3d | Required before every new placement |
| 5 | **Induction Checklist** — Multi-section with tick + initials, licence tracking, external services | A6 | 3d | GTO Standards 2017, Standard 1.2 |

#### Sprint B: Regulatory Compliance (2 weeks) — P1

| # | Task | Audit Ref | Effort | Why Now |
|---|------|-----------|--------|---------|
| 6 | **USI Capture + Verification API** — Field on people forms + USI Registry API integration | CF-2 | 3d | GTO obligation at employment |
| 7 | **E-Signatures for Training Plans** — DocuSign/native canvas signature, version tracking | CF audit | 1w | GTO Standards 2017, Standard 1.4 — audit risk |
| 8 | **Insurance Compliance Tracker** — WorkCover, public liability, professional indemnity with expiry alerts | Audit §5 | 2d | Registration requirement |

#### Sprint C: UX & Competitive (1.5 weeks) — P1

| # | Task | Roadmap Ref | Effort | Why Now |
|---|------|-------------|--------|---------|
| 9 | **Kanban Pipeline Board** — @dnd-kit drag-and-drop deal management | P1 #11 | 3d | Critical UX gap vs every competitor |
| 10 | **PWA + Service Worker** — vite-plugin-pwa, offline IndexedDB, mobile UI, install prompt | CF-5, P1 #5 | 1w | Field officers need mobile |

#### Sprint D: GTO Compliance Enhancement (1.5 weeks) — P2

| # | Task | Audit Ref | Effort |
|---|------|-----------|--------|
| 11 | **Disciplinary Escalation** — 5-step pathway with signed records, serious misconduct bypass | A7 | 3d |
| 12 | **Termination Process** — 17-step checklist, cascading status updates | A8 | 2d |
| 13 | **Change of Year (CoY)** — Date, progression type, competency check, hours validation | A9 | 2d |
| 14 | **Incentive Claims Calendar** — Calendar-based schedule, claim window reminders | A10 | 2d |

### 2.3 Cross-Cutting Patterns to Build First

Before Sprint A, build these reusable components (saves time across all GTO workflows):

| Component | Used By | Effort |
|-----------|---------|--------|
| **Triple Sign-off Component** — Apprentice + Host + GTO signature slots with timestamps | A1, A2, A4, A6, A7 | 2d |
| **Configurable Checklist Component** — Dynamic sections, tick + initials per item | A4, A5, A6, A8 | 1d |
| **Lifecycle Schedule Engine** — Define visit/action schedules tied to apprentice milestones | A4 | 1d |

---

## Part 3: BSuite-Wide Next Steps

### 3.1 Current Health Dashboard

| Project | TypeScript | Routes | Deployment | Key Gap |
|---------|-----------|--------|------------|---------|
| **CRM7** | ✅ 0 errors | 169 (0 dead) | ✅ Vercel Pro | GTO workflows, PWA, Kanban |
| **Conduit** | ✅ 0 errors | 16 pages | ✅ Vercel Pro | AI "Scout", candidate edit |
| **BSU** | ✅ 0 errors | 14 pages | ✅ Vercel Pro | Stripe billing, session handoff |
| **R80.3** | ✅ 0 errors | Core calc | ✅ Vercel Pro | PWA, test coverage, charge-calc |
| **Braden** | ✅ 0 errors | Corporate | ✅ Vercel Pro | SEO, lead capture |
| **Infra** | ✅ 13 Edge Fns | 11 migrations | ✅ Supabase | `sync-award-rates` cron, CORS |

### 3.2 Vercel Deployment: No Splitting Needed

Per the capacity assessment (audit doc §Vercel):

- **41 projects** on Pro (5 core BSuite) — unlimited headroom
- **Build times** all under 1 minute — well within 45 min limit
- **~50 deploys/day** vs 6,000 daily limit
- **Bandwidth** negligible pre-production
- **Verdict: Stay with current topology**

### 3.3 Recommended BSuite-Wide Sprint Order

| Wave | Focus | Projects | Duration | Agent |
|------|-------|----------|----------|-------|
| **Wave 1** | fairwork-enhanced fixes (B1, S1-S4) | BSU | 1 day | Windsurf |
| **Wave 2** | CRM7 reusable components (sign-off, checklist, schedule) | CRM7 | 4 days | Windsurf |
| **Wave 3** | CRM7 Sprint A (timesheets, competency, site visits, host assessment, induction) | CRM7 | 3 weeks | Windsurf + Claude Code |
| **Wave 4** | CRM7 Sprint B (USI, e-signatures, insurance) | CRM7 | 2 weeks | Claude Code |
| **Wave 5** | CRM7 Sprint C (Kanban, PWA) | CRM7 | 1.5 weeks | Claude Code |
| **Wave 6** | Conduit AI Scout + BSU Stripe billing | Conduit + BSU | 2 weeks | Claude Code (parallel) |
| **Wave 7** | R80.3 PWA + test coverage + charge-calc | R80.3 | 1 week | Claude Code |
| **Wave 8** | Braden SEO + lead capture | Braden | 3 days | Claude Code |
| **Wave 9** | CRM7 Sprint D (compliance enhancements) | CRM7 | 1.5 weeks | Any |

**Total estimated timeline:** 10-12 weeks for all waves (many can run in parallel).

### 3.4 Items NOT Recommended Right Now

| Item | Reason |
|------|--------|
| AVETMISS/NAT export | RTO obligation, not GTO — reclassified to P3 |
| Xero/MYOB integration | Useful but not a differentiator until post-launch |
| AI plugin system | Phase 9-10 of AI plan — core AI (Phases 1-8) is solid |
| Expo mobile app | PWA covers mobile needs for now |
| Biped marketplace | P4 — deferred until core 5 are best-in-class |
| Org → Tenant hierarchy | P3 — single-tenant works for launch |

---

## Part 4: Immediate Actions (This Session)

### 4.1 Fix B1: Penalty Rates Bug

**Problem:** `handlePenaltyRates` returns hardcoded `FALLBACK_PENALTY_RATES` alongside live API data.
**Fix:** Remove `penaltyRates: FALLBACK_PENALTY_RATES` from the API and db-cache response paths. Only include it in the hardcoded fallback path.

### 4.2 Fix S4: Input Validation for Award Codes

**Problem:** `body.awardCode` passed directly into URLs without validation.
**Fix:** Add award code validation function: `/^MA\d{6}$/` pattern check.

### 4.3 Fix S1: Add Rate Limiter

**Problem:** No rate limiting on fairwork-enhanced.
**Fix:** Port the rate limiter pattern from `tga-search/index.ts`.

---

---

## Part 5: BSuite Broad UI Refresh — Completed 2026-03-10

### 5.1 Summary

A broad UI refresh was executed across all five BSuite apps, anchored in the Balanced Hybrid design language with the CRM7 D2C Neon Electric token system extended to support theme modes and tenant branding hooks.

### 5.2 Completed Work

| Task | Scope | Status | Commits |
|------|-------|--------|---------|
| **Task 1** — CRM7 shell token extension | `theme.css`, `CRM7Header.tsx` | ✅ Complete | `c14305f`, `f78840f` |
| **Task 2** — CRM7 workflow hub refresh | 23 pages → PageHeader; deprecated var cleanup; DashboardShell shell tokens | ✅ Complete | `22a8e86`, `103e43e`, `260f5b2` |
| **Task 3** — CRM7 visual QA | Code-level audit of all touched surfaces | ✅ Clean — 0 critical issues | — |
| **Task 4** — Cross-app polish | BSU, conduit, R80.3, braden token migrations and focus states | ✅ Complete | per-app commits |
| **Task 5** — Magic UI pattern guide | Approved/rejected patterns, zone map, CRM7 mappings, guardrails | ✅ Complete | docs commit |
| **Task 6** — Reference surface pack | 5 canonical CRM7 surfaces identified and documented | ✅ Complete | docs commit |

### 5.3 Key Changes Per App

**CRM7 (`crm7` branch: `development`)**
- `src/styles/theme.css`: Added `[data-theme-mode="balanced"]`, `.dark[data-theme-mode="neon-premium"]`, `--shell-blur: 18px`, tenant override hooks (`--tenant-primary/secondary/surface/border`)
- 23 workflow hub pages converted to use `PageHeader` component
- Deprecated `--bg-primary` and `--text-heading` variable references eliminated from all component files
- `DashboardShell.tsx`: breadcrumbs, header, and tab surfaces now use full shell token styling
- `CRM7Footer.tsx`: `--border-color` → `--border-shell`
- All `backdropFilter` values tokenized to `blur(var(--shell-blur))`

**business-suite-unified**
- `--text-heading` refs cleaned from 4 component files
- `ServiceCard.tsx`, `DashboardStats.tsx`: slate Tailwind colors → CSS variables
- `AuthForm.tsx`: focus-visible rings added to all inputs and action buttons

**conduit**
- `AppSwitcher.tsx`: hardcoded hex values → semantic tokens; `--muted-foreground` fixed to `--color-muted-foreground` (Tailwind v4 correction)
- `DashboardShell.tsx`: same Tailwind v4 fix applied

**R80.3**
- `R8Calculator.tsx`: focus ring (`focus:ring-blue-500`) and checkbox color (`text-blue-600`) → `var(--accent-primary)`

**braden**
- `src/index.css`: added `--braden-red`, `--braden-gold`, `--braden-red-dark`, `--braden-gold-light`, `--braden-text-on-red`, `--braden-text-on-gold`, `--braden-red-90` brand token system
- `Navigation.tsx`: `#811a2c` → `var(--braden-red)`; opacity modifier bug fixed; mobile menu focus state added
- `Footer.tsx`, `Layout.tsx`: hardcoded hex colors replaced with Braden brand tokens

### 5.4 New Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Magic UI Pattern Guide | `crm7/docs/reference/20260310-crm7-magicui-pattern-guide-v1.00W.md` | Approved/rejected effects, zone map, implementation guardrails |
| Reference Surface Pack | `crm7/docs/reference/20260310-crm7-reference-surface-pack-v1.00W.md` | Canonical surface examples with code patterns |

### 5.5 Open Follow-Up Items

| Item | Priority | App | Notes |
|------|----------|-----|-------|
| Adopt `--tenant-primary` in `CRM7Header.tsx` avatar and `AppSidebar.tsx` logo | P2 | CRM7 | Before `TenantThemeProvider` is wired |
| `src/index.css`: 5 remaining `--text-heading` refs in utility classes | P3 | CRM7 | Valid token, not broken — cosmetic debt |
| `DashboardShell` header (`--bg-shell-hero`) vs `PageHeader` (`--bg-shell-elevated`) alignment | P3 | CRM7 | Intentional divergence; review at next visual pass |
| Braden admin folder: 20+ files with hardcoded colors | P2 | braden | Deferred from Task 4 — large scope |
| R80.3 god component refactor (R8Calculator) | P2 | R80.3 | Existing Issue #92 — separate sprint |

### 5.6 Sprint Order Update

The broad UI refresh was completed as a precursor pass before Sprint A. Sprint ordering remains unchanged — continue from Part 3, Wave 2:

- **Next:** CRM7 Sprint A (GTO Core Workflows: timesheets, competency, site visits, host assessment, induction)
- The refreshed shell and token system provides the stable component foundation required for Sprint A page work

---

## Appendix: Red-Team Validation Summary

| Persona | Verdict |
|---------|---------|
| {CODE_REVIEWER} | B1 is a correctness bug — live data mixed with hardcoded. Fix immediately. `any` types need Zod schemas. |
| {SECURITY_SPECIALIST} | S1 (no rate limit) and S2 (CORS *) are the highest-priority security issues. S3 (no auth) is medium — the anon key provides some gate but isn't sufficient for a proxy to a paid API. |
| {TECHNICAL_ARCHITECT} | A1 (DRY violation) and A2 (ownership split) create maintenance risk. Consolidating both FWC functions under BSU is the right call. |
| {PERFORMANCE_OPTIMIZER} | A6 (SELECT * with JS dedup) is minor. No hot performance issues — the 10s timeout on FWC API calls is appropriate. |
| {AGENT_ORCHESTRATOR} | Wave ordering is correct — fix bugs first, build reusable components, then sprint on features. CRM7 is the revenue driver and should get ~60% of agent time. |
