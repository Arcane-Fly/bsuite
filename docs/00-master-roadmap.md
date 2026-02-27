# BSuite Master Roadmap

**Version:** 1.00W
**Date:** 2026-02-27
**Status:** Working
**Scope:** All BSuite projects — CRM7, Conduit, Braden, R80.3, business-suite-unified

> This is the **single source of truth** for BSuite project planning. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing here.

---

## Projects Overview

| Project | Role | Status | Key Focus |
|---------|------|--------|-----------|
| **business-suite-unified** | Portal & entry point | Active | Stripe billing, project switching |
| **crm7** | CRM + apprenticeship management | Active | AI assistant, email capabilities, document storage |
| **conduit** | Recruitment ATS | Active | Communications infrastructure, pipeline, talent pools |
| **braden** | Corporate site (braden.com.au) | Active | Customization system, lead capture |
| **R80.3** | Apprentice charge calculator | Active | Fair Work API, offline capabilities, compliance |

---

## Cross-Project Initiatives

### 1. Email Capabilities (All Projects)

**Plan:** [`docs/plans/20260227-email-capabilities-plan-v1.00W.md`](./plans/20260227-email-capabilities-plan-v1.00W.md)

Platform-level (Resend) and user-level (Gmail, Microsoft Graph, SMTP) email sending across the bsuite ecosystem.

- **Shared Edge Functions:** `oauth-google-email`, `oauth-microsoft-email`, `email-dispatcher`, `email-token-refresh`
- **CRM7:** `email_messages`, `email_templates`, `email_audit_log` tables; compose UI in contacts/leads pages
- **Conduit:** `conduit_communications` table; email/SMS in candidate and job workflows
- **Braden:** Contact form → CRM lead sync; confirmation emails via dispatcher

**Phases:**
1. Database migration + Edge Functions (schema, OAuth, dispatcher)
2. Frontend services + Zustand store
3. UI components (compose dialog, email history, template selector)
4. Braden lead capture integration
5. Lead capture widget (embeddable)

### 2. AI Assistant + Plugin System (CRM7, Conduit)

**Plan:** [`docs/plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md`](./plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md)

In-app AI assistant with Vercel AI SDK, 80+ tools, plugin architecture, and workflow automation.

- **CRM7:** Primary implementation — apprentice CRUD, reports, timesheets, compliance
- **Conduit:** Candidate search, pipeline management, interview scheduling, AI scoring
- **Shared:** Tool registry pattern, model router, cost tracking, Activepieces integration

**Phases:**
1. Core AI infrastructure (Vercel AI SDK, tool registry) — 2 weeks
2. UI components (chat panel, tool confirmations) — 1 week
3. Model integration (monkey-projects routing, cost tracking) — 1 week
4. Plugin system — 1 week
5. Workflow automation engine — 2 weeks
6. Testing and documentation — 1 week

### 3. Authentication & Authorization

**Reference:** [`docs/AUTH-MAP.md`](./AUTH-MAP.md)

Supabase Auth shared across all projects with tenant isolation and RLS policies.

### 4. DRY One-Shot Architecture

**Reference:** [`docs/DRY-ONE-SHOT-ARCHITECTURE.md`](./DRY-ONE-SHOT-ARCHITECTURE.md)

Each entity has a single owning app for create/edit operations. Schema changes via versioned migrations only.

---

## Project-Specific Roadmaps

### CRM7

**Current Sprint Focus:**
- AI assistant Phase 1 (core infrastructure)
- Email capabilities (Edge Functions + frontend services)
- Document storage QA fixes (see [`crm7/docs/00-roadmap/20260226-document-storage-issues.md`](../crm7/docs/00-roadmap/20260226-document-storage-issues.md))

**Upcoming:**
- AU Funding Claims Enhancement (see [`docs/plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md`](./plans/20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md))
- Compliance automation workflows
- Advanced reporting with predictive analytics
- Activepieces integration (Xero, ADMS, Gmail)

**Completed:**
- Multi-tenant architecture with RLS
- Offline-first SQLite + IndexedDB sync
- WHS incident management
- Timesheet approval workflows
- Contact and employer management
- Portal system (GTO, host employer, apprentice views)

### Conduit

**Current Sprint Focus:**
- Communications infrastructure (`communicationStore.ts`, `communicationService.ts`)
- Communications UI components (compose, history, templates)
- Integration into candidate and job pages

**Upcoming:**
- AI assistant integration (Conduit-specific tools)
- Advanced pipeline analytics
- Interview scheduling
- Offer management workflow
- Compliance tracking for recruitment

**Completed:**
- Next.js 16 App Router setup
- Candidate management (CRUD, search)
- Job management
- Pipeline Kanban board
- Talent pool management
- Onboarding workflow scaffolding
- Database table prefix migration (r7_ → conduit_)

### Braden

**Current Sprint Focus:**
- Contact form → CRM lead sync via email dispatcher
- Confirmation email templates

**Upcoming:**
- Visual customization system foundation
- Advanced editing features
- SEO and marketing optimization (see [`docs/plans/20260226-prerender-seo-marketing-plan-v1.0.0.md`](./plans/20260226-prerender-seo-marketing-plan-v1.0.0.md))

**Completed:**
- Corporate site with Braden branding
- CSP headers and bot protection
- Contact form implementation

### R80.3

**Current Sprint Focus:**
- Fair Work API integration refinements
- Offline capabilities

**Upcoming:**
- Performance optimizations
- Enhanced testing coverage for wage calculations
- PDF export improvements
- User experience refinements

**Completed:**
- Apprentice charge calculator core
- Fair Work API integration
- Basic PDF export

### business-suite-unified

**Upcoming:**
- Stripe billing integration
- Project switching portal
- Unified settings management

---

## Related Documents

| Document | Location |
|----------|----------|
| Contributing Standards | [`docs/20260227-contributing-standards-guide-v1.00W.md`](./20260227-contributing-standards-guide-v1.00W.md) |
| Email Capabilities Plan | [`docs/plans/20260227-email-capabilities-plan-v1.00W.md`](./plans/20260227-email-capabilities-plan-v1.00W.md) |
| AI Assistant Plan | [`docs/plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md`](./plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md) |
| Auth Architecture | [`docs/AUTH-MAP.md`](./AUTH-MAP.md) |
| DRY Architecture | [`docs/DRY-ONE-SHOT-ARCHITECTURE.md`](./DRY-ONE-SHOT-ARCHITECTURE.md) |
| Pricing Strategy | [`docs/pricing-strategy.md`](./pricing-strategy.md) |
| Theme Best Practice | [`Theme-best-practice.md`](../Theme-best-practice.md) |

### Archived Roadmaps

| Original | Archive Location |
|----------|-----------------|
| CRM7 Master Roadmap | [`docs/archive/crm7/20260226-master-roadmap.md`](./archive/crm7/20260226-master-roadmap.md) |
| Braden Roadmap | [`docs/archive/braden/20260227-roadmap-v1.md`](./archive/braden/20260227-roadmap-v1.md) |
| R80.3 Roadmap | [`docs/archive/r80/20260227-roadmap-v1.md`](./archive/r80/20260227-roadmap-v1.md) |
| CRM7 Document Storage QA | [`docs/archive/crm7/20260226-document-storage-qa-report.md`](./archive/crm7/20260226-document-storage-qa-report.md) |
