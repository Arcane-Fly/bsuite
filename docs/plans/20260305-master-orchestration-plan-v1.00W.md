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

| Project | TypeScript | Routes | Deployment | Current Lane |
|---------|-----------|--------|------------|--------------|
| **CRM7** | ✅ 0 errors | 169 (0 dead) | ✅ Vercel Pro | Finish-strong validation: theme review, browser QA, then Sprint A |
| **Conduit** | ✅ 0 errors | 16 pages | ✅ Vercel Pro | Resume AI "Scout" and deeper workflow/product work on top of stable shell polish |
| **BSU** | ✅ 0 errors | 14 pages | ✅ Vercel Pro | Resume Stripe billing and session handoff; shell work is complete unless QA finds regressions |
| **R80.3** | ✅ 0 errors | Core calc | ✅ Vercel Pro | Resume PWA, test coverage, and charge-calc/package follow-through |
| **Braden** | ✅ 0 errors | Corporate | ✅ Vercel Pro | Resume SEO and lead capture; keep deferred admin color cleanup separate |
| **Infra** | ✅ 13 Edge Fns | 11 migrations | ✅ Supabase | Continue fairwork-enhanced hardening: penalty-rates correctness, rate limiting, CORS, validation |

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

### 3.5 Current Execution Lanes by App — 2026-03-10

This section supersedes any CRM7-only reading of the orchestration state. The current suite posture is to close the remaining CRM7 validation lane while keeping the other four core apps and infra explicitly represented in the master plan.

| App | Current State | Immediate Next Step | Notes |
|-----|---------------|---------------------|-------|
| **CRM7** | Broad UI refresh structurally complete; finish-strong shell polish landed and typechecked | Complete theme-spec validation and browser QA, then resume Sprint A (GTO workflows) | CRM7 remains the canonical D2C shell reference app |
| **business-suite-unified** | Shared shell/token migration complete and verified | Resume Stripe billing and session handoff work after short polish-only review if screenshots reveal regressions | Avoid reopening shell redesign unless QA finds concrete issues |
| **conduit** | Shared shell/high-visibility polish complete and verified | Resume product roadmap lane: AI "Scout" and candidate-edit depth, with only targeted UI fixes after manual review | Keep Next.js-specific best practices intact; no broad visual churn |
| **R80.3** | Shared shell/high-visibility polish complete and verified | Resume PWA, test coverage, and charge-calc/package follow-through after any polish-only fixes from review | Existing calculator refactor remains a separate P2 item |
| **braden** | Corporate brand token migration complete on core shared surfaces | Resume SEO and lead-capture lane; keep deferred admin hardcoded-color cleanup as a separate polish track | Never mix D2C Neon Electric shell language into Braden |
| **Infra / Supabase / Edge Functions** | Platform stable, but fairwork-enhanced/security fixes remain on deck | Resume Wave 1 hardening: penalty-rates correctness, rate limiting, CORS, caller validation, API-key consistency | Infra remains shared leverage for multiple apps |

**Suite-wide rule**
- Do not let CRM7’s richer UI tracking obscure the other four apps.
- Treat CRM7 as the shell proving ground, but keep BSU, Conduit, R80.3, Braden, and infra visible in every orchestration checkpoint.

### 3.6 Active Next Actions by App — 2026-03-10

| App | Immediate Action | Definition of Done for Current Lane |
|-----|------------------|-------------------------------------|
| **CRM7** | Finish D2C theme-spec review, complete browser QA via manual preview fallback if needed, then reopen Sprint A planning | Validation evidence captured, punch list trimmed to concrete issues only, shell lane formally closed |
| **business-suite-unified** | Continue Stripe billing and session handoff implementation | Billing/session work reaches verified implementation state without reopening completed shell migration work |
| **conduit** | Continue AI "Scout" and candidate/workflow product depth | Product lane advances while UI changes remain tightly scoped to evidence-based polish |
| **R80.3** | Continue PWA and test-coverage lane, then follow through on charge-calc integration work | PWA/coverage work progresses independently of CRM7 validation and without bundling unrelated UI churn |
| **braden** | Continue SEO and lead-capture execution under the corporate brand system | Growth/marketing lane advances while admin hardcoded-color cleanup remains separately tracked |
| **Infra / Supabase / Edge Functions** | Continue fairwork-enhanced hardening and shared platform correctness/security work | Penalty-rate correctness, rate limiting, CORS, and validation remain active until verified resolved |

**Operating principle**
- CRM7 may hold the richest UI detail, but the orchestration plan must continue to move all five BSuite apps and shared infra forward in parallel.

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

The broad UI refresh remains the active precursor pass before Sprint A. The shell/token foundation is complete and the remaining work is now the finish-strong validation lane rather than more structural redesign.

- **Next:** Complete CRM7 finish-strong polish, theme-spec validation, and browser QA signoff
- **Then:** Resume Part 3, Wave 2 / CRM7 Sprint A (GTO Core Workflows: timesheets, competency, site visits, host assessment, induction)
- The refreshed shell and token system now provides the stable component foundation required for Sprint A page work

### 5.7 CRM7 Continuation Progress — 2026-03-10

The CRM7 refresh continued beyond the initial workflow hub pass and now covers the remaining high-visibility VET, deal-management, and auth surfaces that were still using older manual headers or flatter legacy panel treatments.

**Verification status**
- `pnpm typecheck` passed after each refresh batch in `crm7`
- Rollout tracker updated in `~/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md`

**Additional completed CRM7 batches**

| Batch | Files | Status |
|------|-------|--------|
| Training package flow | `src/pages/vet/training-packages/create.tsx`, `src/pages/vet/training-packages/[id]/index.tsx`, `src/pages/vet/training-packages/[id]/edit.tsx` | ✅ Complete |
| Assessment flow | `src/pages/vet/assessments/create.tsx`, `src/pages/vet/assessments/[id]/index.tsx`, `src/pages/vet/assessments/[id]/edit.tsx` | ✅ Complete |
| Units list/create | `src/pages/vet/units/index.tsx`, `src/pages/vet/units/create.tsx` | ✅ Complete |
| Qualifications create/import | `src/pages/vet/qualifications/create.tsx`, `src/pages/vet/qualifications/import.tsx` | ✅ Complete |
| Qualification structure + unit edit | `src/pages/vet/qualifications/[id]/structure.tsx`, `src/pages/vet/units/[id]/edit.tsx` | ✅ Complete |
| Deals list/create | `src/pages/deals/index.tsx`, `src/pages/deals/new.tsx` | ✅ Complete |
| Auth surfaces | `src/pages/auth/business-suite-sso.tsx`, `src/pages/auth/callback.tsx`, `src/pages/auth/confirm.tsx`, `src/pages/auth/reset-password.tsx` | ✅ Complete |

**Pattern outcome**
- Manual page headers were replaced with the shared `PageHeader` pattern where appropriate
- Legacy card shells were normalized to semantic elevated surfaces using `--bg-shell-elevated`, `--border-shell`, and `--shadow-shell`
- Tabs, toggle rows, and similar control groupings were aligned to accent shell surfaces using `--bg-shell-accent`
- CRM7 auth states now visually match the broader shell language instead of appearing as a separate older UI pocket

### 5.8 Current Active Lane

The CRM7 refresh is now in a finish-strong completion lane: validation is active, but the dashboard and remaining dashboard-adjacent surfaces should not yet be treated as complete.

**Current priorities**
- Finish the remaining CRM7 dashboard and dashboard-adjacent UI completion work before calling the shell lane done
- Validate light and dark mode readability against `docs/20260228-d2c-theme-specification-v1.00W.md`
- Run browser/screenshot QA across refreshed CRM7 surfaces once a working preview is available
- Produce a concise punch list only if QA finds concrete regressions or contrast issues

**Latest progress**
- Finish-strong shell polish landed and typechecked across `src/styles/theme.css`, `src/components/page-header.tsx`, `src/components/layout/CRM7Header.tsx`, `src/components/layout/AppSidebar.tsx`, `src/components/layout/DashboardShell.tsx`, and `src/components/ui/sidebar.tsx`
- Shared shell chrome now uses slightly stronger elevated surfaces, restrained shell glow, tenant-surface adoption in the brand blocks, and more consistent blur/depth treatments across page headers, header chrome, dashboard hero regions, and sidebar navigation

**Execution rule**
- Do not expand scope into unrelated redesign work before the finish-strong validation lane is complete
- Once QA is signed off, resume the next CRM7 product wave from Part 3 without reopening the shell migration lane

### 5.9 Cross-App Continuation Guardrail

The current orchestration state is not CRM7-only.

- **CRM7** is in finish-strong validation and browser QA
- **business-suite-unified** is clear to continue Stripe billing and session handoff once CRM7 QA no longer needs the active orchestration slot
- **conduit** is clear to continue AI Scout and deeper product workflows on top of the now-stable shell layer
- **R80.3** is clear to continue PWA/test-coverage work with UI polish treated as follow-up only if review finds regressions
- **braden** is clear to continue SEO/lead-capture delivery while preserving the separate corporate brand system
- **Infra** remains a parallel hardening lane anchored in the fairwork-enhanced fixes from Part 1

This plan should therefore be read as a suite-wide sequencing document: close the CRM7 validation lane cleanly, then continue the next wave in each app without reopening completed shell migration work unless QA evidence justifies it.

### 5.10 Current Validation Blocker — 2026-03-10

The latest orchestration checkpoint is:

- CRM7 finish-strong shell polish has landed and `pnpm typecheck` passed
- An attempted live dashboard visit at `http://127.0.0.1:40227/dashboard` returned HTTP 502 because the preview endpoint was no longer serving the app
- User direction is that the CRM7 dashboard is still nowhere near done and should not be treated as QA-ready

**Implication**
- CRM7 visual/browser QA is blocked by preview availability, but more importantly the dashboard lane still has unfinished implementation work and should not yet be collapsed into validation-only status
- Until the dashboard finish pass is completed and a working preview is available, CRM7 should be treated as "partially polished, dashboard completion still active"

**Suite-wide continuation guidance while CRM7 dashboard completion is pending**
- **CRM7:** reopen the dashboard/dashboard-adjacent finish pass, then resume theme-spec validation and browser QA once the preview is running again
- **business-suite-unified:** continue Stripe billing and session handoff; do not wait on CRM7 dashboard completion unless shared-shell regressions are discovered
- **conduit:** continue AI Scout and deeper workflow/product work; reserve UI effort for screenshot-driven polish only
- **R80.3:** continue PWA and test-coverage work; keep calculator refactor isolated from shell polish tracking
- **braden:** continue SEO/lead-capture execution under the corporate brand system; keep admin color cleanup as a separate deferred polish lane
- **Infra:** continue fairwork-enhanced hardening in parallel because it is independent of the CRM7 preview/dashboard blocker

### 5.11 CRM7 Sync Startup Fix — 2026-03-10

A secondary CRM7 runtime issue surfaced during preview QA: `SyncService` was attempting to push and pull multiple protected tables before auth had fully settled, producing noisy cross-table sync failures in the local preview.

**Root cause**
- `syncManager.start()` was being triggered as soon as SQLite initialization completed in `App.tsx`
- `useSyncStatus()` in `src/lib/sync-service.ts` also auto-started the sync manager on mount
- The sync layer gated on `isSupabaseReady`, but not on the presence of an authenticated session

**Fix landed**
- `src/App.tsx`: background sync startup now waits for SQLite readiness, auth loading to complete, Supabase to be configured, and a live session to exist before starting
- `src/lib/sync-service.ts`: removed the extra auto-start path inside `useSyncStatus()` so sync lifecycle is controlled from the app boundary rather than from status subscribers
- `pnpm typecheck` passed after the change in `crm7`

**Effect on orchestration**
- **CRM7:** local preview noise from premature sync startup is addressed, but this does not change the broader assessment that the dashboard finish pass is still open
- **business-suite-unified / conduit / R80.3 / braden:** no orchestration change; their roadmap lanes remain active in parallel
- **Infra:** remains focused on fairwork-enhanced hardening and other shared platform fixes, not on the CRM7 preview-only sync startup issue

### 5.12 Dashboard Reality Check — 2026-03-10

A live dashboard review was attempted at `http://127.0.0.1:40227/dashboard`.

**Observed state**
- The endpoint returned HTTP 502, so a true visual review could not be completed from the running preview
- User direction is that the CRM7 dashboard is still far from done and should not be represented as a near-complete surface

**Planning consequence**
- The CRM7 lane remains broader than shell polish plus QA
- Dashboard and dashboard-adjacent completion work must stay explicitly open in the rollout plan before CRM7 can be considered ready to exit the UI-refresh lane
- Cross-app orchestration remains unchanged: BSU, Conduit, R80.3, Braden, and Infra should continue their own roadmap lanes in parallel

### 5.13 CRM7 Dashboard Color Token Completion + Dead Code Purge — 2026-03-10 (cont.)

**Work completed (commit `cdae0fc`)**

- `src/pages/Dashboard.tsx` — final hardcoded Tailwind color cleanup:
  - `recentActivityData`: changed `bgClass: string` (Tailwind strings like `bg-blue-50 dark:bg-blue-900/20`) to `bgStyle: React.CSSProperties` using semantic CSS vars (`--color-info-bg`, `--color-success-bg`, `--color-warning-bg`). Render updated to spread bgStyle into the `style` prop, removing the Tailwind dependency.
  - Financial panel icons: `text-emerald-600` → `style={{ color: 'var(--color-success)' }}`
  - Training panel icons: `text-purple-600` → `style={{ color: 'var(--accent-secondary)' }}`
  - Error state: `--bg-panel` → `--bg-shell-elevated`

- `src/features/dashboard/` — **entire directory deleted** (651 lines of dead code):
  - `Dashboard.tsx` — legacy component; active route (`pages/Dashboard.tsx`) confirmed via `App.tsx` import. Never imported by any other file.
  - `ModernDashboard.tsx` — unused variant
  - `useDashboard.ts` — unused hook
  - `dashboardService.ts` — unused service
  - All barrel index files for the above
  - TypeScript `noEmit` confirms no module references remain

**Dashboard data model confirmed**

- `pages/Dashboard.tsx` already calls `getCrmMetrics()` from `lib/data/dashboardQueries.ts` for live Supabase data
- `DEMO_METRICS` is compile-time constants used ONLY when the developer "Demo Data" toggle (`useDevMode`) is active or as a last-resort DB-failure fallback
- Real data flow: DB → localStorage cache → `DEMO_METRICS` (in that order on failure)
- No changes needed to the data layer — it was already correct

**In-flight work**

- Background agent dispatched for broad 110-page color token audit across remaining `src/pages/` files
- 110 pages identified with residual `text-{color}-{number}` / `bg-{color}-{number}` Tailwind classes
- Agent targets: `people/`, `gto-compliance/`, `contacts/`, `deals/`, `reports/`, `calendar/`, `field-officers/`, `contracts/`, `funding-sources/` (in priority order)

**Orchestration status after this pass**

- CRM7 dashboard: ✅ Color tokens complete. Active route (`pages/Dashboard.tsx`) is fully theme-consistent.
- CRM7 broad page audit: 🔄 In progress (background agent)
- Cross-app shell: ✅ BSU, conduit, R80.3, braden — verified no deprecated token usage in shell/layout files
- Remaining CRM7 lane: Continue broad page audit → visual QA signoff → resume Sprint A (GTO Core Workflows)

---

## Appendix: Red-Team Validation Summary

| Persona | Verdict |
|---------|---------|
| {CODE_REVIEWER} | B1 is a correctness bug — live data mixed with hardcoded. Fix immediately. `any` types need Zod schemas. |
| {SECURITY_SPECIALIST} | S1 (no rate limit) and S2 (CORS *) are the highest-priority security issues. S3 (no auth) is medium — the anon key provides some gate but isn't sufficient for a proxy to a paid API. |
| {TECHNICAL_ARCHITECT} | A1 (DRY violation) and A2 (ownership split) create maintenance risk. Consolidating both FWC functions under BSU is the right call. |
| {PERFORMANCE_OPTIMIZER} | A6 (SELECT * with JS dedup) is minor. No hot performance issues — the 10s timeout on FWC API calls is appropriate. |
| {AGENT_ORCHESTRATOR} | Wave ordering is correct — fix bugs first, build reusable components, then sprint on features. CRM7 is the revenue driver and should get ~60% of agent time. |
