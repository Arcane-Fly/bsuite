# BSuite — Comprehensive Fixes & Remaining Work Roadmap

Consolidated plan from all sources (root `docs/plans/`, Windsurf plans, Claude plans, skills audit) covering every fix required and all remaining work across the 5 BSuite projects.

---

## Sources Audited

| Source | Count | Key Items |
|--------|-------|-----------|
| `docs/plans/` | 48 files | Master orchestration, audit corrections, remaining work, TGA, document lifecycle |
| `~/.windsurf/plans/` | 62 files | SSO+RBAC, OAuth hub upgrade, feature gap closure, deployment fixes |
| `~/.claude/plans/` | 32 files | Email capabilities, 404 elimination, nav unification, UX overhaul |
| Skills | 4 applied | `supabase-oauth-server`, `auth-setup`, `master-orchestration`, `bsuite-brand-system` |
| Session context | This session | Rogue agent cleanup (completed), conduit redirect bug (diagnosed) |

---

## Part 1: CRITICAL FIXES (Do Now)

### Fix 1: Conduit Login Redirects to suite.crm7.app (BUG)

**Root cause:** Cookie storage key mismatch.

- BSU, CRM7, R80.3 all use `storageKey: 'business_suite_auth'` in their Supabase clients
- Conduit's `@supabase/ssr` clients use the **default** storage key (`sb-tuybltdrdefjblnplpqo-auth-token`)
- Result: Conduit can't read BSU's session cookies → middleware thinks user is unauthenticated → redirects back to BSU → user stays on BSU

**Fix (3 files):**

1. `conduit/src/lib/supabase/client.ts` — Add `auth: { storageKey: 'business_suite_auth', flowType: 'pkce' }`
2. `conduit/src/lib/supabase/server.ts` — Add `auth: { storageKey: 'business_suite_auth', flowType: 'pkce' }`
3. `conduit/src/lib/supabase/middleware.ts` — Add `auth: { storageKey: 'business_suite_auth', flowType: 'pkce' }` (already has `flowType`)

**Secondary fix:** BSU `AppContent.tsx` — when an **already-authenticated** user arrives with `?return_to=conduit`, immediately redirect instead of showing the dashboard. Currently `AuthScreen` only renders for unauthenticated users.

**Verification:**

- Log in at suite.crm7.app with `?return_to=conduit` → lands on conduit.crm7.app
- Navigate directly to conduit.crm7.app while logged into BSU → session detected, no redirect
- Update middleware tests to assert `storageKey: 'business_suite_auth'`

**Ref:** `supabase-oauth-server` skill §6 (Cross-Subdomain Session Sharing), AGENTS.md Critical Auth Rule #1

---

### Fix 2: BS OAuth Token Refresh (P1 — All 3 Clients)

**Problem:** `refreshBusinessSuiteToken()` is exported but **never called** in CRM7, R80.3, and Braden. BS OAuth tokens silently expire.

**Fix:** Wire token refresh into each app's auth initialization or use an interval-based refresh. Check `bs_access_token` expiry on app load + periodic check.

**Files:**

- `crm7/src/lib/business-suite-oauth.ts` + `crm7/src/contexts/AuthContext.tsx`
- `R80.3/src/lib/business-suite-oauth.ts` + `R80.3/src/stores/authStore.ts`
- `braden/src/lib/business-suite-oauth.ts` + `braden/src/hooks/useAdminAuth.ts`

**Ref:** AGENTS.md Critical Auth Rule #6, `supabase-oauth-server` skill §9 checklist item "Token refresh is wired up"

---

### Fix 3: fairwork-enhanced Bugs (B1 + Security)

From `docs/plans/20260305-master-orchestration-plan-v1.00W.md`:

| # | Issue | Fix | File |
|---|-------|-----|------|
| B1 | `handlePenaltyRates` returns hardcoded `FALLBACK_PENALTY_RATES` alongside live API data | Remove from API/cache paths, keep only in fallback path | `business-suite-unified/supabase/functions/fairwork-enhanced/index.ts` L830-870 |
| S1 | No rate limiting | Port rate limiter from `tga-search` | Same file |
| S2 | CORS `*` | Restrict to `.crm7.app` domains + localhost | Same file |
| S3 | No caller auth | Add JWT validation via `supabase.auth.getUser()` | Same file |
| S4 | No input validation | Validate `awardCode` matches `/^MA\d{6}$/` | Same file |

---

### Fix 4: Deploy TGA Search Edge Function

**Status:** Code exists but deploy failed (run from wrong directory).

```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
supabase functions deploy tga-search --project-ref tuybltdrdefjblnplpqo
```

**Verify:** CRM7 QualificationSelector fetches live TGA data.

---

### Fix 5: Rogue Agent Cleanup (COMPLETED ✅)

- ✅ Restored cookie storage + AppSwitcher in CRM7, R80.3, BSU
- ✅ Removed .yarn/ artifacts + pnpm-workspace.yaml from all 5 projects
- ✅ Fixed @bsuite/nav-core ^0.2.0 → ^0.1.0
- ✅ Pushed all fixes, merged dev→main, aligned branches

---

### Fix 6: WIF Migration — Static SA Key → Workload Identity Federation (COMPLETED ✅)

- ✅ WIF pool `supabase-edge-functions` + OIDC provider `supabase-auth` created
- ✅ `--allowed-audiences="authenticated"` set for Supabase JWT `aud` claim
- ✅ IAM binding: `roles/iam.workloadIdentityUser` granted to pool for SA impersonation
- ✅ IAM Credentials API enabled
- ✅ Exposed SA key `63d97c908882b...` deleted — 0 user-managed keys remain
- ✅ Edge Function `generate-document` rewritten: Supabase JWT → STS → SA impersonation → scoped access token
- ✅ `googleDocsService.ts` updated to WIF pattern
- ✅ `.env.example` updated with placeholder values (Copilot PR review addressed)
- ✅ 4 docs files + AGENTS.md updated with WIF enforcement rules
- ✅ Supabase secrets set: `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL`
- ✅ Old secret `GOOGLE_SERVICE_ACCOUNT_JSON` removed
- ✅ Verified against Google official docs (`docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers`)
- ✅ Commits: `953a1cb` (crm7), `bb64b98` (root)
- ⏳ E2E test pending: trigger document generation from CRM7 UI
- **Plan:** `docs/plans/20260305-wif-migration-plan-v1.00A.md`

---

## Part 2: AUTH & SSO HARDENING

Per `supabase-oauth-server` skill §9 Security Hardening Checklist:

| # | Check | Status | Action |
|---|-------|--------|--------|
| 1 | RS256 signing active (JWKS endpoint returns keys) | ⚠️ Unverified | Run: `curl -s "https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json" \| jq '.keys[] \| {kty, alg, kid}'` |
| 2 | OAuth redirect URIs are exact-match | ✅ Configured | CRM7, R80.3, Braden all registered |
| 3 | General redirect allow-list is minimal | ⚠️ Unverified | Check Supabase Dashboard → Auth → URL Configuration |
| 4 | `next`/`redirect` params sanitized | ✅ `redirectTargets.ts` | Allowlist-only approach |
| 5 | No secrets in source code | ⚠️ Audit needed | Run `auth_surface_scan.sh` |
| 6 | Server-side auth uses `getClaims()` not `getSession()` | ⚠️ Conduit uses `getUser()` | `getUser()` is authoritative — acceptable |
| 7 | Edge Function "Verify JWT" disabled after RS256 | ⚠️ Unverified | Check Supabase Dashboard |
| 8 | SSR middleware skips `/auth/callback` | ✅ Conduit middleware line 40 | |
| 9 | `NEXT_PUBLIC_*` env vars set before build | ✅ Vercel config | |
| 10 | Cookie domain only on matching TLD | ✅ All 3 conduit files + BSU/CRM7/R80.3 | Hostname guard present |
| 11 | Token refresh wired up | ❌ BS OAuth tokens never refreshed | Fix 2 above |
| 12 | Consent screen validates authorization_id | ⚠️ Unverified | Check BSU `/oauth/consent` |
| 13 | PKCE state verified before code exchange | ✅ CRM7 callback checks `bs_oauth_state` | |
| 14 | Chunked cookie storage handles >4KB | ✅ BSU cookieStorage chunks at 3500B | |

**Add Conduit to OAuth client registry (P2):**

- Register in Supabase Dashboard as OAuth app
- Create `conduit/src/lib/business-suite-oauth.ts` (port from CRM7)
- Wire dual callback in `conduit/src/app/auth/callback/route.ts`
- Currently NOT required (cookie SSO is sufficient for .crm7.app)

---

## Part 3: CRM7 — GTO Core Workflows (Highest Business Value)

From `docs/plans/20260305-master-orchestration-plan-v1.00W.md` §Sprint A-D + `20260304-crm7-audit-corrections-task-assignments-v1.00W.md`:

### Cross-Cutting Components (Build First — ~4 days)

| Component | Used By | Effort |
|-----------|---------|--------|
| Triple Sign-off Component (Apprentice + Host + GTO) | Timesheets, Competency, Host Assessment, Induction, Disciplinary | 2d |
| Configurable Checklist Component (sections, tick+initials) | Host Assessment, Induction, Termination | 1d |
| Lifecycle Schedule Engine (visits tied to milestones) | Site Visits | 1d |

### Sprint A: GTO Core Workflows (~3 weeks)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1 | Enhanced Timesheets — per-day blocks, work/leave types, multi-host, 38/40hr validation, host approval, lock-after-submit | P1 | 1w |
| 2 | Enhanced Competency Assessments — 4-point scale, 15+ criteria, dual sign-off | P1 | 1w |
| 3 | Enhanced Site Visits — configurable schedule, per-visit checklist, PPE log | P1 | 1w |
| 4 | Host Employer Pre-Placement Assessment — supervision, training, OHS, docs | P1 | 3d |
| 5 | Induction Checklist — multi-section, licence tracking, external services | P1 | 3d |

### Sprint B: Regulatory Compliance (~2 weeks)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 6 | USI Capture + Verification API (USI Registry SOAP client already built) | P1 | 3d |
| 7 | E-Signatures for Training Plans (core e-sign engine exists — wire into Training Plan workflow) | P1 | 1w |
| 8 | Insurance Compliance Tracker (WorkCover, PI, PL with expiry alerts) | P1 | 2d |

### Sprint C: UX & Competitive (~1.5 weeks)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 9 | Kanban Pipeline Board (@dnd-kit drag-drop deal management) | P1 | 3d |
| 10 | PWA + Service Worker (vite-plugin-pwa, offline IndexedDB, mobile UI) | P1 | 1w |

### Sprint D: GTO Compliance Enhancement (~1.5 weeks)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 11 | Disciplinary Escalation — 5-step pathway, signed records | P2 | 3d |
| 12 | Termination Process — 17-step checklist, cascading status | P2 | 2d |
| 13 | Change of Year (CoY) — date, progression, competency check | P2 | 2d |
| 14 | Incentive Claims Calendar — schedule, reminders | P2 | 2d |

---

## Part 4: REMAINING WORK (Claude Code Scope)

From `docs/plans/20260304-remaining-work-implementation-plan-v1.00W.md`:

### Completed by Claude Code (keep, don't redo)

- ✅ RAM M2M auth client + keystoreParser
- ✅ ADMS adapter → RAM M2M, 2026 claim types
- ✅ USI Registry SOAP client (Verify, Locate, BulkVerify)
- ✅ Document lifecycle system (Phases 1-7)
- ✅ wageScheduleService + fairwork award cache write-back
- ✅ conduit registered as git submodule
- ✅ braden .env.production fixed + gitignored
- ✅ Hardcoded Supabase URL in business-suite-oauth.ts fixed

### Still Outstanding (10 items from remaining-work plan)

| # | Task | Status | Owner |
|---|------|--------|-------|
| 1 | Deploy TGA Search Edge Function | Not deployed | Fix 4 above |
| 2 | 7 State Training Authority adapters (NSW, VIC, QLD, SA, TAS, ACT, NT) | Code exists, verify | Cascade (done earlier) |
| 3 | Settings UI for Government Integrations | Check if exists | Claude Code |
| 4 | Conduit AI "Scout" tools | Design exists | Claude Code |
| 5 | BSU Stripe billing wiring | Stub exists | Claude Code |
| 6 | AppSwitcher dev port corrections | Audit needed | Cascade |
| 7 | CRM7 remaining hardcoded hex colors | Pending | Cascade |
| 8 | Font spec compliance (Inter + JetBrains Mono) | Pending | Cascade |
| 9 | STP Phase 2 integration | Not started | P1, Claude Code Scope A |
| 10 | Xero/MYOB OAuth + invoice sync | Not started | P1, Claude Code Scope A |

---

## Part 5: FEATURE GAP CLOSURE (from Windsurf plan `bsuite-feature-gap-closure-19ee18.md`)

### P0 Blockers

| # | Blocker | Status |
|---|---------|--------|
| 0A | Fix Microsoft Azure AD OAuth ("Error getting user email") | ⚠️ Needs Azure Portal config |
| 0B | Create `ai_sessions` + `ai_messages` tables (sync 404s) | Not done |
| 0C | Create 4 missing platform admin tables | Not done |

### DB & Data Management (CRM7)

- Admin Data Wipe feature (org admin only, Edge Function)
- Bulk Operations Service (multi-select → bulk update/delete)
- Excel Upload & Export (xlsx library)
- Audit Logging Service (wire into `createEntityStore`)
- AI Usage Tracking dashboard widget
- Customizable Module Visibility (tenant preferences)

### Page Wiring (CRM7 — mock → Supabase)

- **Tier 1 (Core CRM):** leads, contacts, opportunities, tasks, clients, placements
- **Tier 2 (GTO):** apprentices, timesheets, assessments, training packages, units, competencies, mentors, hosts, vacancies, agreements
- **Tier 3 (Financial):** claims, funding sources, charge rates, contracts, financial, compliance, GTO compliance
- **Tier 4 (Supporting):** field officers, workers, communications, reports, progress reviews, WHS
- **~15 new Zustand stores** needed (all follow `createEntityStore` pattern)

### Conduit Gaps

- Communications page (route + wire store)
- Documents UI (route + wire store)
- Compliance verification

### BSU Gaps

- Idea Hub (6 DB tables exist, no pages)
- Billing History (wire table)
- Analytics Dashboard (wire real data)

---

## Part 6: CROSS-PROJECT IMPROVEMENTS

### Email Capabilities (from Claude plan `lexical-giggling-bengio.md`)

- `email-dispatcher` Edge Function (currently logs only)
- Gmail API sending (credentials exist)
- Microsoft Graph sending (credentials exist)
- SMTP via denomailer
- Token refresh for OAuth email providers
- Email compose UI integrated into Contacts/Leads pages

### 404 & Dead Link Elimination (from Claude plan `robust-zooming-valley.md`)

- 44 total broken routes across all apps (18 critical, 13 high)
- AppSwitcher dev port fixes (4 copies)
- CRM7: 33 new CRUD/form/stub pages + App.tsx route registrations
- Conduit: 3 portal stub pages
- Braden: wire /privacy and /terms routes

### UX/UI Overhaul (from Claude plan `prancy-seeking-dijkstra.md`)

- Custom AI icon (ScoutIcon SVG — replace generic Bot icon)
- 22 missing README indexes
- Broken doc links (11 in docs/ai, 6 cross-references)
- CLAUDE.md path corrections

### BSU → Account Management Hub (from Windsurf plan `bsu-oauth-hub-upgrade-cbcddd.md`)

- Account Center pages (profile, security, subscription, usage)
- Session revocation (`revokeOtherSessions`)
- Proper JWKS token validation (`getClaims()` instead of `getSession()`)
- `@bsuite/auth-contracts` shared types package

### Enterprise RBAC (from Windsurf plan `bsuite-sso-rbac-unified-cbcddd.md`)

- `enterprises` table + `enterprise_memberships`
- Expanded `user_tenants.role` CHECK constraint (org_owner, org_admin, etc.)
- RLS policies for enterprise hierarchy
- Remove legacy CRM7/R80.3 login pages → BSU redirect

---

## Part 7: ADMIN UI CUSTOMIZATION (from `crm7/docs/plans/2026-03-04-admin-ui-customization-design.md`)

Three-pillar system:

1. **Custom Fields** — Developer → Org Admin → User scoped field definitions
2. **Custom Views** — Configurable list/detail views per entity
3. **Form Builder** — Drag-drop visual editor (@dnd-kit) for form layouts

DB tables needed: `custom_fields`, `ui_configurations`, `pages`, `page_revisions`, `components`, `templates`

---

## Execution Priority

| Wave | Focus | Effort | Impact |
|------|-------|--------|--------|
| **1 (NOW)** | Fix 1 (conduit cookie SSO) + Fix 3 (fairwork bugs) + Fix 4 (TGA deploy) | 1 day | Unblocks conduit login, fixes data bug |
| **2** | Fix 2 (BS OAuth refresh) + Auth hardening checklist + P0 blockers (Azure, missing tables) | 2 days | Security + stability |
| **3** | CRM7 cross-cutting components (sign-off, checklist, schedule) | 4 days | Enables Sprint A |
| **4** | CRM7 Sprint A (timesheets, competency, site visits, host assessment, induction) | 3 weeks | Core GTO value |
| **5** | CRM7 Sprint B (USI wiring, e-sign Training Plans, insurance) | 2 weeks | Regulatory compliance |
| **6** | CRM7 Sprint C (Kanban, PWA) + 404 elimination | 1.5 weeks | UX + mobile |
| **7** | Email capabilities + page wiring (Tiers 1-2) | 2 weeks | Feature completeness |
| **8** | BSU Account Center + Stripe billing + Conduit gaps | 2 weeks | Platform maturity |
| **9** | CRM7 Sprint D (compliance) + data management + Tier 3-4 wiring | 2 weeks | Polish |
| **10** | Enterprise RBAC + Admin UI Customization + seed data | 3 weeks | Enterprise features |

**Total: ~14-16 weeks** (Waves 4-9 parallelizable across Cascade + Claude Code agents)

---

## Files Referenced (Key Auth Files)

| File | Issue |
|------|-------|
| `conduit/src/lib/supabase/client.ts` | Missing `storageKey: 'business_suite_auth'` |
| `conduit/src/lib/supabase/server.ts` | Missing `storageKey: 'business_suite_auth'` |
| `conduit/src/lib/supabase/middleware.ts` | Missing `storageKey: 'business_suite_auth'` |
| `business-suite-unified/src/components/AppContent.tsx` | Doesn't handle `return_to` for already-authenticated users |
| `crm7/src/lib/business-suite-oauth.ts` | `refreshBusinessSuiteToken()` exported but never called |
| `R80.3/src/lib/business-suite-oauth.ts` | Same refresh issue |
| `braden/src/lib/business-suite-oauth.ts` | Same refresh issue |
| `business-suite-unified/supabase/functions/fairwork-enhanced/index.ts` | B1 penalty bug + S1-S4 security |
