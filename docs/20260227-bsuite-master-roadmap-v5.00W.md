# BSuite Master Roadmap

**Version:** 5.00W
**Date:** 2026-02-27
**Last Updated:** 2026-03-16
**Status:** Working
**Scope:** All BSuite projects — CRM7, Conduit, Braden, R80.3, business-suite-unified

> This is the **single source of truth** for BSuite project planning. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing here.

---

## Roadmap Governance

### Canonical Sources

- **Planning and delivery status:** this file (`docs/20260227-bsuite-master-roadmap-v5.00W.md`)
- **Authentication and session topology:** [`docs/AUTH-MAP.md`](./AUTH-MAP.md)
- **Engineering standards and quality gates:** [`docs/20260227-contributing-standards-guide-v1.00W.md`](./20260227-contributing-standards-guide-v1.00W.md) and root `AGENTS.md`
- **Implementation truth:** active repo files such as `package.json`, `vercel.json`, migrations, deployed function inventories, and tests

### Interpretation Rules

- Project `docs/README.md` files are **navigation hubs**, not the source of truth for status.
- `docs/plans/*.md` files are **feeder plans**. They provide scope and detail, but status must be reconciled back into this roadmap.
- `docs/archive/**` and donor/imported documentation are **reference-only provenance**. They may preserve feature intent, naming variants, or migration history, but they do not override current repo reality.
- When a donor document uses a different product name for the same capability, normalize it into the active BSuite taxonomy instead of tracking it as a separate product.

### Naming Normalization

- `Business Suite Unified`, `suite`, and `portal` normalize to **business-suite-unified**
- `CRM7 Remediated`, `GTO Complete`, and surviving Workforce Hub features normalize to **crm7**
- `Apprentice Tracker` donor material normalizes into **crm7** or **R80.3** unless a current active repo exists
- `R80 calculator` and `R80.3 Remediated` normalize to **R80.3**
- `ATS`, recruitment, and talent-pipeline donor material normalize to **conduit**

---

## Documentation Compliance

**Audit Date:** 2026-03-16 | **Reference:** [`docs/20260316-docs-compliance-audit-v1.00W.md`](./20260316-docs-compliance-audit-v1.00W.md)

- 375 .md files audited across all 6 BSuite projects
- ~80 files compliant before remediation (21%) → remediation targets 100%
- Windsurf plans consolidated into `docs/plans/`
- Claude memory research files ported to `docs/`
- crm13-docs labeled as historical reference only
- All project-level docs normalized to `YYYYMMDD-descriptive-name-vMAJOR.MINOR[STATUS].md`

---

## Projects Overview

| Project | Role | Tech | PM | Deploy | Status |
|---------|------|------|----|--------|--------|
| **business-suite-unified** | Portal, OAuth provider, shared DB | React + Vite + Stripe | pnpm | Vercel | Active |
| **crm7** | CRM + apprenticeship management | React + Vite + AI SDK | pnpm | Vercel | Active |
| **conduit** | Recruitment ATS | Next.js 16 App Router | pnpm | Vercel | Active |
| **braden** | Corporate site (braden.com.au) | React + Vite | pnpm | Vercel | Active |
| **R80.3** | Apprentice charge calculator | React + Vite | pnpm | Vercel | Active |

---

## Infrastructure Status

### Supabase (`tuybltdrdefjblnplpqo`)

| Resource | Count | Status |
|----------|-------|--------|
| **Migrations applied** | 11 | ✅ All applied |
| **Edge Functions deployed** | 13 | ✅ All active |
| **Storage buckets** | 15 | ✅ All private |

**Edge Functions:**

| Function | Purpose | Status |
|----------|---------|--------|
| `oauth-google-email` | Google OAuth (email + calendar scopes) | ✅ Deployed v3 |
| `oauth-microsoft-email` | Microsoft OAuth (email + calendar scopes) | ✅ Deployed v3 |
| `email-dispatcher` | Multi-provider email sending (Resend/Gmail/Graph/SMTP) | ✅ Deployed |
| `email-token-refresh` | Cron-based OAuth token renewal | ✅ Deployed |
| `calendar-integration` | Unified Google/Microsoft calendar API | ✅ Deployed v1 |
| `send-notification` | Email notifications via Resend | ✅ Deployed v1 |
| `generate-document` | PDF/document generation | ✅ Deployed |
| `lead-capture` | Lead intake from external forms | ✅ Deployed |
| `fairwork-enhanced` | Fair Work API proxy | ✅ Deployed |
| `tga-search` | TGA qualification search | ✅ Deployed |

### CI/CD (`.github/workflows/supabase-migrate.yml`)

| Pipeline | Trigger | Status |
|----------|---------|--------|
| **Database migrations** | Push to `main` changing `*/supabase/migrations/**` | ✅ Active |
| **Edge Function deploy** | Push to `main` changing `*/supabase/functions/**` | ✅ Active |
| **Manual dispatch** | `workflow_dispatch` with submodule selector | ✅ Active |

### Git Branching

All repos use `development` as working branch, pushed to `origin/development`.

| Repo | Default | Working | Remote |
|------|---------|---------|--------|
| bsuite (parent) | main | development | ✅ |
| business-suite-unified | master | development | ✅ |
| crm7 | main | development | ✅ |
| conduit | main | development | ✅ |
| braden | main | development | ✅ |
| R80.3 | main | development | ✅ |

---

## Cross-Project Initiatives

### 1. Email & Calendar Capabilities

**Plans:** [`email-capabilities-plan`](./plans/20260227-email-capabilities-plan-v1.00W.md) · [`ai-tools-migration-calendar`](./plans/20260228-ai-tools-migration-calendar-edge-fn-v1.00W.md) ✅

| Phase | Scope | Status |
|-------|-------|--------|
| 1. Database schema | `email_integrations`, `email_messages`, `email_templates`, `email_audit_log` | ✅ Complete |
| 2. Edge Functions | OAuth (Google/Microsoft), dispatcher, token refresh, calendar | ✅ Complete |
| 3. CRM7 email store | `emailStore.ts`, email service layer | ✅ Built |
| 4. CRM7 email UI | `EmailComposeDialog`, `EmailHistory`, `EmailTemplateSelector` | ✅ Built |
| 5. Conduit comms store | `communicationStore.ts`, `communicationService.ts` | ✅ Built |
| 6. Conduit comms UI | `ComposeDialog`, `CommunicationTimeline`, `CommunicationItem` | ✅ Built |
| 7. Braden lead capture | Contact form → lead-capture Edge Function → CRM sync | 🔲 Not started |
| 8. Embeddable widget | Cross-site lead capture widget | 🔲 Not started |

### 2. AI Assistant (Jodie) — CRM7

**Plan:** [`ai-assistant-plugin-system-plan`](./plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md)

| Phase | Scope | Status |
|-------|-------|--------|
| 1. Tool registry | 54 tools across 8 categories (`inputSchema` format) | ✅ Complete |
| 2. Persona & skills | `jodie-persona.ts`, `jodie-skills.ts`, 5-layer system prompt | ✅ Complete |
| 3. Model router | `model-router.ts`, complexity-based model selection | ✅ Complete |
| 4. API endpoint | `api/ai/chat.ts` Edge Runtime, streaming via AI SDK v6 | ✅ Complete |
| 5. Chat UI | `AIAssistant`, `AISheet`, `AIMessage`, `AIInputArea`, etc. | ✅ Complete |
| 6. useChat hook | `useAIChat.ts` with `@ai-sdk/react` integration | ✅ Complete |
| 7. Tool confirmations | In-chat tool result display (`AIToolCard`) | ✅ Complete |
| 8. Command palette | `AICommandPalette.ts` with keyboard shortcuts | ✅ Complete |
| 9. Plugin system | Activepieces integration, dynamic tool loading | 🔲 Not started |
| 10. Workflow automation | Multi-step automated workflows triggered by AI | 🔲 Not started |
| 11. Cost tracking | Per-tenant usage metering and limits | 🔲 Not started |
| 12. Conduit AI tools | Candidate search, pipeline mgmt, interview scheduling | 🔲 Not started |

### 3. Authentication & OAuth

**Reference:** [`AUTH-MAP.md`](./AUTH-MAP.md) (§10: Platform Developer Role System)

| Component | Status |
|-----------|--------|
| Supabase Auth (all projects) | ✅ Active |
| BSU OAuth 2.1 PKCE consent screen | ✅ Built (`OAuthConsent.tsx`) |
| R80.3 OAuth callback | ✅ Built (`AuthCallback.tsx`, `business-suite-oauth.ts`) |
| Conduit auth (login, callback, middleware) | ✅ Built |
| RLS policies on all tables | ✅ Applied |
| Tenant isolation | ✅ Active |
| Platform Developer Role System | ✅ Built — `platform_role` (developer/tester/user), impersonation, tester licenses, DeveloperToolbar |

### 4. DRY One-Shot Architecture

**Reference:** [`DRY-ONE-SHOT-ARCHITECTURE.md`](./DRY-ONE-SHOT-ARCHITECTURE.md)

Each entity has a single owning app for create/edit. Schema changes via versioned migrations only. ✅ Enforced.

---

## Project-Specific Status

### CRM7

**Zustand Stores (16):** `apprenticeStore`, `awardStore`, `clientStore`, `contactStore`, `contractStore`, `emailStore`, `fundingClaimStore`, `fundingSourceStore`, `hostEmployerStore`, `hostSiteStore`, `leadStore`, `placementStore`, `timesheetStore`, `qualificationStore`, `trainingPlanStore`, `aiStore`, `mentorStore`, `competencyStore`, `complianceStore`

**AI Tools (54):** crud (15), report (7), timesheet (8), search (5), vacancy (4), screening (4), scheduling (4), email (7)

**API Routes:** `api/ai/chat.ts`, `api/db/[...path].ts`, `api/health.ts`, `api/error-report.ts`

**Completed:**

- ✅ Multi-tenant architecture with RLS
- ✅ Offline-first SQLite + IndexedDB sync
- ✅ WHS incident management
- ✅ Timesheet approval workflows
- ✅ Contact and employer management
- ✅ Portal system (GTO, host employer, apprentice views)
- ✅ AI assistant Phase 1–8 (Jodie: tools, persona, skills, chat UI, API endpoint)
- ✅ AI SDK v3 migration (`useAIChat.ts` rewritten for `@ai-sdk/react` v3 — `sendMessage`, local input state, status-derived loading)
- ✅ Cookie URI fix (`readCookieRaw` in `removeItem` — eliminates `URIError: URI malformed` spam)
- ✅ Email capabilities (store, compose dialog, history, templates)
- ✅ Calendar UI components (event list, create, availability) calling `calendar-integration` Edge Function
- ✅ AI tool migration (`parameters` → `inputSchema`)
- ✅ AU Funding Claims Enhancement ([plan](./plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md))
- ✅ SEC-004: RLS role validation — database-backed `has_tenant_role()` replaces JWT claim trust
- ✅ Platform Developer Role System — `platform_role`, tester licenses, impersonation with audit, DeveloperToolbar
- ✅ DataTable component with clickable rows/cells
- ✅ Accessibility controls
- ✅ Fair Work award selector
- ✅ Tier 1 page wiring — 6 pages (leads, opportunities, tasks, clients, deals, apprentices) wired to Zustand stores with Supabase CRUD
- ✅ 5-pass red team on all wired pages
- ✅ **Launch-Ready Phase 0+1** ([plan](./plans/20260303-bsuite-launch-ready-implementation-plan-v1.00W.md), [design](./plans/20260303-bsuite-launch-ready-design-v1.00D.md)):
  - Feature flag system: `useFeatureFlags` hook (35 flags, 19 hidden), `FeatureGate` component, `withFeatureGate` HOC
  - Route-level enforcement: 57+ pages gated via `withFeatureGate` in App.tsx
  - Nav gating: 6 sections hidden (WHS, VET, Communication, Portal, Financial, Analytics) via `filterSectionsByPermission`
  - Kill list: 4 settings pages made read-only (24+ mutations disabled), host reports emptied, financial summary hidden
  - 2 red-team rounds: 16 issues found, 13 fixed, 3 deferred (low risk)
  - 48 new tests (2254 total passing, now 2261 after Phases 2-4)

**Remaining:**

- ✅ **Tier 2 page wiring** — 3 new stores (mentorStore, competencyStore, complianceStore), 2 stores fixed (timesheetStore, placementStore), 5 pages rewired (mentors, competencies, compliance, timesheets, placements), Placement + Timesheet entity types aligned to DB schema
- ✅ **Launch-Ready Phase 2** — EmptyState consolidation (deleted duplicate, 2 pages fixed), 8+ broken export buttons disabled across 10 files (Tasks 10-12)
- ✅ **Launch-Ready Phase 3** — Dashboard mock widgets replaced with EmptyState + CTAs, onboarding wizard confirmed launch-ready (Tasks 13-14)
- ✅ **Launch-Ready Phase 4** — Cmd+K command palette with permission filtering + 6 tests, activity timeline deferred (no activities table). AI shortcut moved to Cmd+J. 2 red-team rounds: 30 issues found, 12 fixed, rest deferred low-risk. (Tasks 15-16)
- ✅ **PWA** — `vite-plugin-pwa`, service worker, manifest, and `usePWA` hook are present in repo ([prompt](./claude-code-prompts.md#prompt-1))
- ✅ **Kanban pipeline board** — `pages/pipeline/kanban.tsx` and drag-and-drop board components are present in repo
- 🔶 **Theme architecture reconciliation + dashboard finish pass** — D2C token/source-layer correction landed across `src/styles/theme.css`, `src/index.css`, `src/components/ui/card.tsx`, `tailwind.config.js`, and `src/pages/Dashboard.tsx`; `pnpm typecheck` + `pnpm build` passed, but authenticated dashboard QA and finish quality remain open
- 🔶 **Sync schema/query alignment** — sync startup timing noise was reduced earlier, but local SQLite ↔ Supabase schema mismatches remain an active runtime blocker for a clean CRM7 finish pass
- 🔲 Tier 3-4 page wiring — financial, compliance, field officers, WHS, comms, reports (~15 more stores)
- 🔲 AI plugin system + workflow automation ([plan](./plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md))
- 🔲 Xero integration (OAuth2 + 6 AI tools) + Google Calendar (OAuth2 + 4 AI tools)
- 🔲 AI cost tracking per tenant
- 🔲 Enterprise Agreement processing + BOAT validation (AI extraction, rate schedules)
- 🔶 `@bsuite/charge-calc` shared package — adopted in CRM7 and R80.3; broader convergence work remains ([plan](./plans/20260228-r80-crm7-shared-calc-engine-v1.00W.md))
- 🔶 Data management — `/settings/data-management`, `/settings/import-export`, and `/settings/audit-log` exist; bulk operations and deeper admin tooling remain
- 🔲 Compliance automation workflows
- 🔲 Advanced reporting with predictive analytics
- 🔲 Document storage QA fixes ([report](./archive/crm7/20260226-document-storage-qa-report.md))
- 🔲 Test coverage (Vitest) — 70% target for critical paths

### Conduit

**Zustand Stores (7):** `candidateStore`, `jobStore`, `talentPoolStore`, `pipelineStore`, `onboardingStore`, `complianceStore`, `communicationStore`

**Pages (16+):** Dashboard layout, Candidates (list/new/[id]), Jobs (list/new/[id]/edit), Talent Pools (list/[id]), Pipeline (Kanban), Onboarding, Compliance, Analytics, Settings, Auth (login, register), plus AI and portal surfaces

**Completed:**

- ✅ Next.js 16 App Router setup with Tailwind v4 (`@theme` CSS)
- ✅ Supabase client/server/middleware auth
- ✅ Candidate management (CRUD, search, filters, profile with inline edit)
- ✅ Job management (CRUD, publish/close workflow, salary display)
- ✅ Pipeline Kanban board with drag-and-drop
- ✅ Talent pool management (CRUD, add/remove candidates, color coding)
- ✅ Onboarding templates + instance tracking with progress bars
- ✅ Compliance dashboard (VEVO, USI, police, WWCC, medical, WHS) with expiry alerts
- ✅ Communications infrastructure (`communicationStore`, `communicationService`)
- ✅ Communications UI (ComposeDialog, CommunicationTimeline, CommunicationItem)
- ✅ Login/register pages with Supabase-native auth wiring
- ✅ Common components (EmptyState, StatusBadge)
- ✅ Database table prefix migration (r7_→ conduit_)
- ✅ D2C Neon Electric theme with dark mode

**Remaining:**

- ✅ **AI assistant "Scout"** — API route, chat hook, branded UI, and assistant surfaces are present in repo ([plan](./plans/20260228-conduit-ai-tools-plan-v1.00W.md), [prompt](./claude-code-prompts.md#prompt-2))
- 🔶 **Candidate [id] edit page** — inline edit works, but no dedicated edit route
- 🔶 **Missing stores/hooks** — some imports reference stores not yet created
- 🔶 Advanced pipeline analytics — analytics route exists, but depth and completeness still need review
- 🔲 Document management for candidates
- 🔲 @dnd-kit migration for pipeline Kanban (accessibility improvement)
- 🔲 Test coverage (Vitest) — 70% target for critical paths

### Braden

**Completed:**

- ✅ Corporate site with Braden branding (Montserrat + Inter, Braden Red/Gold)
- ✅ CSP headers and bot protection
- ✅ Contact form (basic + enhanced with validation)
- ✅ Admin dashboard (content manager, image manager, site settings, storage audit)
- ✅ SEO head component
- ✅ Auth system (admin login, permission guard)
- ✅ Media manager
- ✅ Content management (pages, blocks, empty states)

**Remaining:**

- 🔶 **SEO + lead capture** — prerender script, JSON-LD structured data, and contact form → CRM7 lead-capture wiring exist; GA4 production rollout and performance optimization remain ([plan](./plans/20260226-prerender-seo-marketing-plan-v1.0.0.md), [prompt](./claude-code-prompts.md#prompt-6))
- ✅ **Confirmation email** — contact flow invokes `email-dispatcher` after form submission
- 🔲 Visual customization system foundation
- 🔲 Advanced editing features (WYSIWYG blocks)
- 🔲 Biped marketplace integration (P4 — deferred until core 5 projects are best-in-class)
- 🔲 Test coverage (Vitest)

### R80.3

**Services (14):** `awardRatesService`, `awardTemplateService`, `calculationService`, `chargeCalculationsService`, `customPayRateService`, `enterpriseAgreementService`, `exportImportService`, `fairWorkService`, `fairworkApi`, `pdfExportService`, `spreadsheetWageService`, `supabaseClient`, `unifiedSchemaService`, `userSettingsService`, `wageSourceManager`

**Stores (5):** `apprenticeStore`, `authStore`, `calculatorStore`, + others

**Completed:**

- ✅ Apprentice charge calculator core
- ✅ Fair Work API integration (direct + enhanced Edge Function proxy)
- ✅ PDF export
- ✅ Enterprise agreement manager
- ✅ Award rate selector with templates
- ✅ Comparative view
- ✅ Import/export calculations
- ✅ BSU OAuth integration
- ✅ Onboarding wizard
- ✅ Wage source manager (multiple data sources)

**Remaining:**

- 🔶 **PWA + offline** — `vite-plugin-pwa` and manifest are present; full offline maturity still needs review ([prompt](./claude-code-prompts.md#prompt-4))
- 🔶 **Wage calculation test suite** — multiple Vitest suites exist, but the 90%+ legally-critical coverage target and logger migration remain open
- 🔶 **`@bsuite/charge-calc` shared package** — package dependency and bridge layer are live; full engine convergence work remains ([plan](./plans/20260228-r80-crm7-shared-calc-engine-v1.00W.md))
- 🔲 Enterprise Agreement processing + BOAT validation
- 🔲 Performance optimizations (large dataset handling)
- 🔲 PDF export improvements (print-friendly, multi-page)
- 🔲 Fair Work API update notifications (real-time)

### business-suite-unified

**Pages:** Dashboard, Admin (UserManagement, TenantManagement, AuditLog, SystemOverview), Billing, Branding, Settings, Analytics, Documents, CRM7, Calculator, GTO, Government, OAuth Consent, Auth Callback

**Services:** `adminService`, `biMetricsService`, `documentService`, `notificationService`, `permissionsService`, `stripeService`, `supabase`

**Completed:**

- ✅ Unified dashboard with service cards
- ✅ Auth context with Supabase
- ✅ OAuth 2.1 PKCE consent screen
- ✅ Admin panel (users, tenants, audit log, system overview)
- ✅ Subscription upgrade component
- ✅ Marketing home page
- ✅ Permission service with role-based access
- ✅ All Edge Functions deployed (10 functions)
- ✅ All database migrations applied (11 migrations)
- ✅ All storage buckets created (15 buckets)

**Remaining:**

- 🔶 **Stripe billing portal** — billing page UI, subscription hook, checkout flow, and customer portal flow are present; end-to-end completeness still needs review ([prompt](./claude-code-prompts.md#prompt-3))
- 🔶 **Session handoff + AppSwitcher** — AppSwitcher component exists; full cross-app rollout and handoff completeness still need review ([plan](./plans/20260228-bsu-project-switching-plan-v1.00W.md), [prompt](./claude-code-prompts.md#prompt-7))
- 🔲 **Idea Hub** — no repo implementation found in this audit pass
- 🔶 **Cross-app notifications** — Supabase Realtime pub/sub, notification center UI, notification preferences
- 🔲 Unified settings management
- 🔲 Usage analytics dashboard
- 🔲 Unified navigation (`@bsuite/nav-core` shared package + shadcn sidebar migration)

---

## Recently Completed (as of 2026-03-16)

- ✅ TGA edge function deployed to Supabase
- ✅ 7 STA adapters + RAM/USI/ADMS Settings UI complete
- ✅ Launch-Ready Phase 2: empty states across CRM7
- ✅ caseNoteStore + host_preferred_qualifications migration
- ✅ Fair Work compliance: timesheets (reg 3.34), disciplinary/PIP/support person, termination (reg 3.40), leave NES §88/§90
- ✅ God file refactor (issue #92 closed)
- ✅ R80.3 Milestones 2–3 committed (unified upgrade branch merged)
- ✅ Document lifecycle system: 8 phases complete, TGA edge function deployed, 2,382 tests passing
- ✅ RAM M2M auth wired: credential decrypted, Settings UI complete (ABRD:21662181740_crm7, valid to 2028-03-03)
- ✅ WIF migration complete (static SA keys → Workload Identity Federation)
- ✅ P0/P1 sweep: Conduit candidate docs tab, BSU Idea Hub, Braden GA4 env var migration
- ✅ Documentation compliance remediation: 375 .md files normalized to YYYYMMDD convention

## In Progress / Pending

- ⚠️ Item 9: Test coverage — fairwork + auth tests complete, 16 pre-existing failures in AI components remain
- ⚠️ Dashboard polish: hero signals, bento grid, ai_sessions/ai_messages tables, DND accessibility (KeyboardSensor)
- ⚠️ Stripe end-to-end verification (checkout → webhook → DB unverified)
- ⚠️ Cross-app notifications (Supabase Realtime pub/sub)
- ⚠️ BOOT compliance engine (C8-tier, competitive differentiator — foundU is only competitor with any BOOT support)
- ⚠️ @bsuite/charge-calc full convergence (3 independent calc engines → 1 shared package)
- ⚠️ Xero payroll integration (5 major TODO blocks in CRM7)

---

## Remaining Work Summary (Priority Order)

> **Consolidated Feb 28, 2026** from: Windsurf plan (`bsuite-feature-gap-closure`), Claude plans (9 BSuite-related), `claude-code-prompts.md` (7 prompts), and `docs/plans/` (6 formal plans).

### P0 — Blockers (unblocks everything else)

| # | Task | Project | Effort | Notes |
|---|------|---------|--------|-------|
| 0 | Canonical roadmap and documentation normalization | all | 1d | ✅ Completed — master roadmap governance added, stale doc surfaces demoted, donor naming normalized. 2026-03-16: 20260228 page inventory + rbac matrix archived, matrix.md/navigation.md ARCHIVED headers added, gap report produced at `docs/20260316-bsuite-gap-report-v1.00W.md` |
| 1 | ~~Fix Azure AD OAuth~~ | crm7 | 15m | ✅ **Done** — `xms_edov` + `email` optional claims added to Azure manifest |
| 2 | ~~Create `ai_sessions` + `ai_messages` tables~~ | crm7 | — | ✅ **Already exist** in Supabase |
| 3 | ~~Create 4 platform admin tables~~ | bsu | — | ✅ **Already exist** in Supabase |

### P1 — Revenue & Competitive Differentiation

| # | Task | Project | Effort | Agent | Source |
|---|------|---------|--------|-------|--------|
| 4 | BSU Stripe billing portal (Edge Functions + UI + gating) | bsu | 1w | Claude Code | Prompt 3 |
| 5 | ~~CRM7 PWA~~ (`vite-plugin-pwa`, manifest, service worker hook present) | crm7 | ✅ Built | Claude Code | Prompt 1A |
| 6 | R80.3 PWA + 90% wage calc tests + logger migration | R80.3 | 5d | Claude Code | Prompt 4 |
| 7 | ~~Conduit AI "Scout"~~ (API route + chat UI + persona surfaces present) | conduit | ✅ Built | Claude Code | Prompt 2 |
| 8 | ~~CRM7 Tier 2 page wiring~~ (5 pages + 3 stores + 2 fixes) | crm7 | ✅ Done | Windsurf | Feature gap §3 |
| 9 | Braden SEO + lead capture (prerender, JSON-LD, GA4) | braden | 3d | Claude Code | Prompt 6 |
| 10 | BSU session handoff + AppSwitcher | bsu + all | 2d | Claude Code | Prompt 7 |
| 11 | ~~CRM7 Kanban pipeline board~~ (@dnd-kit route and board components present) | crm7 | ✅ Built | — | UX gap |

### P2 — Enhancement & Polish

| # | Task | Project | Effort | Source |
|---|------|---------|--------|--------|
| 12 | Unified navigation (`@bsuite/nav-core` + shadcn sidebar) | all | 1w | Claude plan `atomic-hopping-ocean` |
| 13 | `@bsuite/charge-calc` shared package (3 engines → 1) | R80↔CRM7 | 1w | `r80-crm7-shared-calc-engine` plan |
| 14 | Enterprise Agreement + BOAT validation | CRM7 | 1w | Claude plans `warm-moseying-liskov` + `velvety-giggling-curry` |
| 15 | Bulk operations and remaining admin data tooling | crm7 | 1w | Feature gap §2A-2D |
| 16 | ~~CRM7 dashboard layout system~~ — free-canvas edit mode, configurable columns 1-24, bounded drag, responsive view-mode reflow, persist layoutCols | crm7 | ✅ Done | 2026-03-16 |
| 17 | CRM7 sync schema/query mismatch remediation | crm7 | 2d | Active sync/runtime blocker from dashboard QA |
| 18 | Cross-project UX (AI icon, @dnd-kit Conduit, view toggles) | multi | 3d | Claude plan `prancy-seeking-dijkstra` + `cross-project-ux-improvements` |
| 19 | Cross-app notifications (Supabase Realtime) | bsu | 3d | Prompt 7 |
| 20 | CRM7 Tier 3-4 wiring (financial, compliance, WHS, comms, reports) | crm7 | 2w | Feature gap §3 Tier 3-4 |
| 21 | AI cost tracking per tenant | crm7/bsu | 2d | — |
| 22 | Document storage QA fixes | crm7 | 2d | [report](./archive/crm7/20260226-document-storage-qa-report.md) |
| 23 | Doc cleanup (22 missing READMEs, broken links) | all | 1d | Claude plan `prancy-seeking-dijkstra` |
| 24 | Braden visual customization | braden | 1w | — |
| 25 | R80.3 PDF export improvements | R80.3 | 2d | — |
| 26 | Test coverage push (70% target all projects) | all | ongoing | — |

### P3 — Future

| # | Task | Project | Effort | Source |
|---|------|---------|--------|--------|
| 27 | AI plugin system + Xero + Calendar + workflow automation | crm7 | 3w | Prompt 5 |
| 28 | BSuite Mobile native (Expo → Google Play) | new `mobile/` | 2w | Prompt 1B |
| 29 | Org → Tenant hierarchy | bsu/crm7 | 1w | Feature gap §1C |
| 30 | BSU Idea Hub | bsu | 3d | Feature gap §5 |
| 31 | Field-level parity against GTO evidence requirements | crm7 | 2d | Feature gap §2F |
| 32 | Demo seed data | all | 2d | Feature gap §6 |
| 33 | Compliance automation workflows | crm7 | 1w | — |
| 34 | Advanced reporting with predictive analytics | crm7 | 2w | — |
| 35 | BSU usage analytics dashboard | bsu | 3d | — |
| 36 | Biped marketplace integration (P4 deferred) | braden/bsu | 2w | Deferred until core 5 are best-in-class |

---

### Agent Assignment Matrix

| Agent | Focus | Items |
|-------|-------|-------|
| **Windsurf** | CRM7 page wiring + DB migrations + red team | P0 #2-3, P1 #8, P2 #15-18 |
| **Claude Code Instance 1** | CRM7 PWA | P1 #5 |
| **Claude Code Instance 2** | Conduit AI "Scout" | P1 #7 |
| **Claude Code Instance 3** | BSU Stripe billing | P1 #4 |
| **Claude Code Instance 4** | R80.3 PWA + tests | P1 #6 |
| **Claude Code Instance 5** | Braden SEO + lead capture | P1 #9 |
| **User (manual)** | Azure Portal OAuth fix | P0 #1 |

> **P4 Future:** Biped marketplace platform integration (shared auth, unified billing, cross-product analytics). Repo: `https://github.com/GaryOcean428/biped.git`. Deferred until core 5 BSuite projects are best-in-class.

## Related Documents

| Document | Location |
|----------|----------|
| Contributing Standards | [`docs/20260227-contributing-standards-guide-v1.00W.md`](./20260227-contributing-standards-guide-v1.00W.md) |
| Email Capabilities Plan | [`docs/plans/20260227-email-capabilities-plan-v1.00W.md`](./plans/20260227-email-capabilities-plan-v1.00W.md) |
| AI Assistant Plan | [`docs/plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md`](./plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md) |
| AI Tools Migration Plan | [`docs/plans/20260228-ai-tools-migration-calendar-edge-fn-v1.00W.md`](./plans/20260228-ai-tools-migration-calendar-edge-fn-v1.00W.md) ✅ Complete |
| E2E Flows & Google/Azure Setup | [`docs/plans/20260227-e2e-flows-google-azure-setup-v1.00W.md`](./plans/20260227-e2e-flows-google-azure-setup-v1.00W.md) |
| AU Funding Claims Plan | [`docs/plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md`](./plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md) |
| SEO/Marketing Plan | [`docs/plans/20260226-prerender-seo-marketing-plan-v1.0.0.md`](./plans/20260226-prerender-seo-marketing-plan-v1.0.0.md) |
| Auth Architecture | [`docs/AUTH-MAP.md`](./AUTH-MAP.md) |
| DRY Architecture | [`docs/DRY-ONE-SHOT-ARCHITECTURE.md`](./DRY-ONE-SHOT-ARCHITECTURE.md) |
| Conduit AI Tools Plan | [`docs/plans/20260228-conduit-ai-tools-plan-v1.00W.md`](./plans/20260228-conduit-ai-tools-plan-v1.00W.md) |
| BSU Project Switching Plan | [`docs/plans/20260228-bsu-project-switching-plan-v1.00W.md`](./plans/20260228-bsu-project-switching-plan-v1.00W.md) |
| R80↔CRM7 Shared Calc Engine | [`docs/plans/20260228-r80-crm7-shared-calc-engine-v1.00W.md`](./plans/20260228-r80-crm7-shared-calc-engine-v1.00W.md) |
| Cross-Project UX Improvements | [`docs/plans/2026-02-28-cross-project-ux-improvements.md`](./plans/2026-02-28-cross-project-ux-improvements.md) |
| Launch-Ready Design | [`docs/plans/20260303-bsuite-launch-ready-design-v1.00D.md`](./plans/20260303-bsuite-launch-ready-design-v1.00D.md) |
| Launch-Ready Implementation | [`docs/plans/20260303-bsuite-launch-ready-implementation-plan-v1.00W.md`](./plans/20260303-bsuite-launch-ready-implementation-plan-v1.00W.md) |
| External API Audit | See plan file at `.claude/plans/` (API integration inventory + remediation) |
| Competitive Landscape | See memory file at `.claude/projects/.../memory/competitive-landscape.md` |
| Claude Code Prompts (7 agents) | [`docs/claude-code-prompts.md`](./claude-code-prompts.md) |
| Pricing Strategy | [`docs/pricing-strategy.md`](./pricing-strategy.md) |
| D2C Theme Specification | [`docs/20260228-d2c-theme-specification-v1.00W.md`](./20260228-d2c-theme-specification-v1.00W.md) |
| AI Feature Map | [`docs/ai/features/20260227-feature-map-complete-v1.0.0.md`](./ai/features/20260227-feature-map-complete-v1.0.0.md) |
| BSuite Gap Report (2026-03-16) | [`docs/20260316-bsuite-gap-report-v1.00W.md`](./20260316-bsuite-gap-report-v1.00W.md) |
| BSuite Completeness Matrix (2026-03-09) | [`docs/20260309-bsuite-completeness-matrix-v1.00W.md`](./20260309-bsuite-completeness-matrix-v1.00W.md) |

### Archived Roadmaps

| Original | Archive Location |
|----------|-----------------|
| CRM7 Master Roadmap | [`docs/archive/crm7/20260226-master-roadmap.md`](./archive/crm7/20260226-master-roadmap.md) |
| Braden Roadmap | [`docs/archive/braden/20260227-roadmap-v1.md`](./archive/braden/20260227-roadmap-v1.md) |
| R80.3 Roadmap | [`docs/archive/r80/20260227-roadmap-v1.md`](./archive/r80/20260227-roadmap-v1.md) |
| CRM7 Document Storage QA | [`docs/archive/crm7/20260226-document-storage-qa-report.md`](./archive/crm7/20260226-document-storage-qa-report.md) |
