# BSuite Master Roadmap

**Version:** 2.00W
**Date:** 2026-02-27
**Last Updated:** 2026-02-27
**Status:** Working
**Scope:** All BSuite projects — CRM7, Conduit, Braden, R80.3, business-suite-unified

> This is the **single source of truth** for BSuite project planning. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing here.

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

**Zustand Stores (13):** `apprenticeStore`, `awardStore`, `clientStore`, `contactStore`, `contractStore`, `emailStore`, `fundingClaimStore`, `fundingSourceStore`, `hostEmployerStore`, `hostSiteStore`, `leadStore`, `placementStore`, `timesheetStore`, `qualificationStore`, `trainingPlanStore`, `aiStore`

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
- ✅ Email capabilities (store, compose dialog, history, templates)
- ✅ AI tool migration (`parameters` → `inputSchema`)
- ✅ SEC-004: RLS role validation — database-backed `has_tenant_role()` replaces JWT claim trust (commit `39eac97`)
- ✅ Platform Developer Role System — `platform_role` column (developer/tester/user), tester licenses, org impersonation with audit trail, DeveloperToolbar, subscription bypass for privileged roles
- ✅ DataTable component with clickable rows/cells
- ✅ Accessibility controls
- ✅ Fair Work award selector

**Remaining:**

- ~~🔶 **AI chat endpoint deployment**~~ — ✅ Done (Vercel env vars set)
- ~~🔶 **Email integration wiring**~~ — ✅ Done (email UI already calls Edge Functions: OAuth flow + dispatcher)
- 🔶 **Calendar UI** — frontend components to call `calendar-integration` Edge Function
- 🔲 AU Funding Claims Enhancement ([plan](./plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md))
- 🔲 Compliance automation workflows
- 🔲 Advanced reporting with predictive analytics
- 🔲 Activepieces integration (Xero, ADMS, Gmail)
- 🔲 AI plugin system and workflow automation
- 🔲 AI cost tracking per tenant
- 🔲 Document storage QA fixes ([report](./archive/crm7/20260226-document-storage-qa-report.md))
- 🔲 Test coverage (Vitest) — 70% target for critical paths

### Conduit

**Zustand Stores (7):** `candidateStore`, `jobStore`, `talentPoolStore`, `pipelineStore`, `onboardingStore`, `complianceStore`, `communicationStore`

**Pages (16):** Dashboard layout, Candidates (list/new/[id]), Jobs (list/new/[id]/edit), Talent Pools (list/[id]), Pipeline (Kanban), Onboarding, Compliance, Analytics (placeholder), Settings (placeholder), Auth (login, register)

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
- ✅ Login page with Google OAuth + BSU SSO
- ✅ Common components (EmptyState, StatusBadge)
- ✅ Database table prefix migration (r7_→ conduit_)
- ✅ D2C Neon Electric theme with dark mode

**Remaining:**

- ~~🔶 **Communications service wiring**~~ — ✅ Done (`communicationService.ts` already calls `email-dispatcher` and `sms-dispatcher` Edge Functions)
- 🔶 **Candidate [id] edit page** — inline edit works, but no dedicated edit route
- ~~🔶 **Job [id] edit page**~~ — ✅ Done (`/jobs/[id]/edit/page.tsx` created)
- ~~🔶 **Auth register page**~~ — ✅ Done (`/auth/register/page.tsx` created)
- 🔶 **Missing stores/hooks** — some imports reference stores not yet created (e.g. `useTenantId` may need server-side tenant resolution)
- 🔲 AI assistant integration (Conduit-specific tools)
- 🔲 Advanced pipeline analytics (Analytics page is placeholder)
- 🔲 Interview scheduling
- 🔲 Offer management workflow
- 🔲 Job distribution (board posting)
- 🔲 Document management for candidates
- 🔲 Settings page (pipeline stages, templates, integrations)
- 🔲 Mobile responsive sidebar (hamburger menu)
- 🔲 Test coverage (Jest) — 70% target for critical paths

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

- ✅ **Products page & CMS** — `/products` page, homepage BSuite teaser, CMS-managed dynamic pages (privacy, terms)
- 🔶 **Lead capture wiring** — contact form → `lead-capture` Edge Function → CRM lead sync
- 🔶 **Confirmation email** — send via `email-dispatcher` after form submission
- 🔶 **Biped marketplace integration** — shared auth, unified billing, cross-product analytics with BSuite ecosystem
- 🔲 Visual customization system foundation
- 🔲 Advanced editing features (WYSIWYG blocks)
- 🔲 SEO/marketing optimization ([plan](./plans/20260226-prerender-seo-marketing-plan-v1.0.0.md))
- 🔲 Prerender for social sharing
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

- 🔶 **Offline capabilities** — service worker and IndexedDB caching
- 🔲 Performance optimizations (large dataset handling)
- 🔲 Enhanced testing coverage for wage calculations (legally critical)
- 🔲 PDF export improvements (print-friendly, multi-page)
- 🔲 UX refinements
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

- ~~🔶 **Stripe billing integration**~~ — ✅ Done (Stripe keys + webhook configured)
- 🔶 **Project switching** — service cards link to external apps but no unified session handoff
- 🔲 Unified settings management
- 🔲 Cross-app notification system
- 🔲 Usage analytics dashboard
- 🔲 Billing portal (plan management, invoices)

---

## Remaining Work Summary (Priority Order)

### P0 — Critical Path (blocks production use)

| # | Task | Project | Effort |
|---|------|---------|--------|
| ~~1~~ | ~~Deploy CRM7 AI chat endpoint to Vercel + set `AI_GATEWAY_API_KEY`~~ | crm7 | ✅ Done |
| ~~2~~ | ~~Wire email compose UI to Supabase OAuth flow + dispatcher~~ | crm7 | ✅ Done |
| ~~3~~ | ~~Wire Conduit communications to Edge Function email/SMS~~ | conduit | ✅ Done |
| ~~4~~ | ~~Set up Stripe keys + webhook for BSU billing~~ | bsu | ✅ Done |
| ~~5~~ | ~~Create `/auth/register` page in Conduit~~ | conduit | ✅ Done |
| ~~6~~ | ~~Create `/jobs/[id]/edit` page in Conduit~~ | conduit | ✅ Done |
| ~~7~~ | ~~Google Cloud Console: add Gmail + Calendar scopes to consent screen, add redirect URI~~ | infra | ✅ Done |
| ~~8~~ | ~~Azure AD: verify Mail + Calendar permissions, grant admin consent, add redirect URI~~ | infra | ✅ Done |

### P1 — High Value Features

| # | Task | Project | Effort |
|---|------|---------|--------|
| ~~9~~ | ~~Calendar UI components (event list, create, availability)~~ | crm7 | ✅ Done |
| ~~10~~ | ~~Lead capture wiring (Braden contact form → Edge Function → CRM)~~ | braden/bsu | ✅ Done |
| ~~11~~ | ~~Confirmation email after Braden form submission~~ | braden | ✅ Done |
| ~~12~~ | ~~Conduit interview scheduling (calendar integration)~~ | conduit | ✅ Done |
| 13 | AU Funding Claims Enhancement | crm7 | 1w |
| 14 | R80.3 offline mode (service worker + IndexedDB) | R80.3 | 3d |
| 15 | Conduit AI tools (candidate search, pipeline mgmt) | conduit | 1w |
| 16 | BSU project switching with session handoff | bsu | 2d |
| 17 | Biped marketplace integration into BSuite (shared auth, billing, analytics) | braden/bsu | 2w |

### P2 — Enhancement & Polish

| # | Task | Project | Effort |
|---|------|---------|--------|
| 18 | AI plugin system (Activepieces) | crm7 | 1w |
| 19 | AI workflow automation engine | crm7 | 2w |
| 20 | AI cost tracking per tenant | crm7/bsu | 2d |
| ~~21~~ | ~~Conduit analytics dashboard~~ | conduit | ✅ Done |
| ~~22~~ | ~~Conduit offer management workflow~~ | conduit | ✅ Done |
| ~~23~~ | ~~Conduit job distribution (board posting)~~ | conduit | ✅ Done |
| ~~24~~ | ~~Conduit settings page (pipeline stages, integrations)~~ | conduit | ✅ Done |
| ~~25~~ | ~~Conduit mobile sidebar (hamburger menu)~~ | conduit | ✅ Done |
| 26 | Braden visual customization system | braden | 1w |
| 27 | Braden SEO/prerender optimization | braden | 3d |
| 28 | R80.3 PDF export improvements | R80.3 | 2d |
| 29 | R80.3 enhanced wage calculation test coverage | R80.3 | 2d |
| 30 | BSU billing portal (plan management, invoices) | bsu | 1w |
| 31 | BSU cross-app notification system | bsu | 3d |
| 32 | BSU usage analytics dashboard | bsu | 3d |
| 33 | Document storage QA fixes (CRM7) | crm7 | 2d |
| 34 | Compliance automation workflows | crm7 | 1w |
| 35 | Advanced reporting with predictive analytics | crm7 | 2w |
| 36 | Test coverage push (all projects, 70% target) | all | ongoing |
| 37 | Biped BSuite integration — shared auth, unified billing, analytics | braden/bsu/biped | 2w |

---

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
| Pricing Strategy | [`docs/pricing-strategy.md`](./pricing-strategy.md) |
| Theme Best Practice | [`Theme-best-practice.md`](../Theme-best-practice.md) |
| AI Feature Map | [`docs/ai/features/20260227-feature-map-complete-v1.0.0.md`](./ai/features/20260227-feature-map-complete-v1.0.0.md) |

### Archived Roadmaps

| Original | Archive Location |
|----------|-----------------|
| CRM7 Master Roadmap | [`docs/archive/crm7/20260226-master-roadmap.md`](./archive/crm7/20260226-master-roadmap.md) |
| Braden Roadmap | [`docs/archive/braden/20260227-roadmap-v1.md`](./archive/braden/20260227-roadmap-v1.md) |
| R80.3 Roadmap | [`docs/archive/r80/20260227-roadmap-v1.md`](./archive/r80/20260227-roadmap-v1.md) |
| CRM7 Document Storage QA | [`docs/archive/crm7/20260226-document-storage-qa-report.md`](./archive/crm7/20260226-document-storage-qa-report.md) |
