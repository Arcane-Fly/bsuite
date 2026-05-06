# BSuite Master Roadmap

**Version:** 5.04W
**Date:** 2026-02-27
**Last Updated:** 2026-05-06 (plans audit — see "2026-05-06 Plans Audit" section)
**Status:** Working
**Scope:** All BSuite projects — CRM7, Conduit, Braden, R80.3, business-suite-unified

> **2026-05-01 ratification note:** Phase 0 is complete. The single execution queue for all remaining work is [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md). This roadmap remains the long-horizon planning reference; the merged backlog is the phase-ordered execution queue with atomic-replace governance per ADRs 0001–0006.

> This is the **single source of truth** for BSuite project planning. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing here.

## 2026-05-06 Plans Audit

A docs-only plans audit on 2026-05-06 reconciled in-repo plans against an
external corpus of 49 IDE/Cascade plan files (claude_code IDE plans +
windsurf cascade plans) and the `bsuite_*` memory namespace.

**Source:** claude_code IDE plans + windsurf cascade plans audited
2026-05-06.

**Roll-up:**

| Bucket | Count |
|--------|------:|
| External BSuite plans triaged | 30 (32 minus 2 reclassified to QIG/agent-tooling during audit) |
| External plans dismissed as QIG (silo violation if acted on) | 19 (17 pre-classified + 2 reclassified) |
| External plans verified DONE (against current code / merged PRs) | 12 |
| External plans superseded by canonical in-repo doctrine | 11 |
| External plans that are direct duplicates of active in-repo plans | 2 |
| External plans still actionable (OPEN / PARTIAL) | 5 |
| In-repo active plans (parent + 6 submodules) | 19 |
| In-repo plans archived in this run | 0 — every in-repo plan is either active multi-phase work or already archived in 2026-05-04 doc-unification (parent PR #430) and throughput Wave A (throughput PR #76) |
| In-repo plans already in `archive/` | 10 |

**Loop-closing notes:**

- `crm7-broad-ui-refresh-ec965f.md` (windsurf) ⇄ canonical
  [`docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md`](./plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md)
  — same plan, in-repo is canonical, status W (Working).
- `bsuite-audit-page-builder-branding-relationships-66c734.md` (windsurf)
  ⇄ canonical
  [`docs/plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`](./plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md)
  — same plan, in-repo is canonical, status W.
- `oauth-best-practice-audit-03bc3f.md` (windsurf) → superseded by
  [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) +
  `bsuite_decisions_v2` frozen decision #5 (auth canonicalisation
  2026-04-28) and #7 (cookie SSO removed 2025-02-27); residual OIDC
  nonce work shipped in `@bsuite/auth` v0.2.0 (PR #510).
- `pageGridLayout-master-2f6071.md` (windsurf) → DONE-V via
  `@bsuite/page-builder@0.1.0` extraction
  (`bsuite_phase2a_page_builder_complete_20260427`).
- `enforce-oklch-color-format-35b53f.md` /
  `oklch-theme-migration-35b53f.md` /
  `theme-compliance-audit-368b75.md` (windsurf) → DONE-V via WS-D
  rollout (`bsuite_ws_d_complete`, 9 PRs).
- `branch-sync-and-bug-fixes-d79b6f.md` (windsurf) → DONE-V via WS-B
  orphan triage (`bsuite_ws_b_orphan_triage_complete`, 12 candidates
  resolved).

**External-only OPEN plans worth transcribing if picked up:**

- The five-wave stabilisation plan
  (`starting-at-parent-docs-soft-shell.md`, claude_code) — W1–W4 SHIPPED
  per `bsuite_session_20260502_w1_to_w4_complete`; **W5 systemic
  guards remain open**.
- The email/calendar/tasks integration plan
  (`email-calendar-tasks-integration-98e953.md`, windsurf) — 5/7 edge
  functions ACTIVE; **Phases 3 + 4 (`email-inbox-sync`, `tasks-sync`,
  Settings UI email tab, Inbox UI) remain open**.

Triage workpapers (out-of-repo, in `~/workspace/plans-review/`):
`external-plans-triage.md`, `in-repo-plans-triage.md`,
`memory-archaeology.md`, `PLANS-AUDIT-FINAL.json`. The plan-tracking
convention codified by this audit is recorded in
[`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) under
"Plan-tracking convention".

---

## Roadmap Governance

### Canonical Sources

- **Active execution queue (post-Phase 0 ratification):** [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md) — the single phase-ordered execution queue covering all remaining work across parent + 6 submodules + shared packages. Supersedes the consolidation role of the finish-line roadmap, outstanding-work ledger, and per-submodule OUTSTANDING files.
- **Phase 0 ADRs (governance):** [`docs/adr/ADR-0001`](./adr/ADR-0001-page-builder-ownership.md) through [`docs/adr/ADR-0006`](./adr/ADR-0006-contact-propagation-doctrine.md) — atomic replace-and-remove doctrine; no `@deprecated` markers; no dual-path interim states.
- **Planning and delivery status (long-horizon):** this file (`docs/20260227-bsuite-master-roadmap-v5.00W.md`)
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

<!-- Added 2026-05-06: Codehouse parity & Platform 360 — see docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md -->

### Codehouse Parity & Platform 360 (added 2026-05-06)

**Plan:** [`20260506-codehouse-parity-and-platform-360-v1.00W`](./plans/20260506-codehouse-parity-and-platform-360-v1.00W.md)

A cross-app workstream tracking 35 Codehouse Workforce-One parity gaps and a Platform-360 capability spec (every feature × every portal × every role × every data-flow). Six workstreams: WS-A (parity tracking integration) · WS-B (issue alignment) · WS-C (dashboard schema extension) · WS-D (Platform-360 spec — 9 portal sub-plans) · WS-E (visual feature builder full-stack — `/dev/feature-builder` route in BSU) · WS-F (doc-drift sweep). Permissions remain `AUTH_CANONICAL.md` + Supabase RLS + BSuite SSO — **no new RBAC/ABAC framework**. Domains tracked in the parity matrix (external — `~/workspace/competitor/parity-matrix.md`); this plan references matrix rows rather than restating them.

| Workstream | Status (this PR) | Owner |
|---|---|---|
| WS-A1 / WS-A4 — index plan + roadmap section | ✅ Shipped (this PR) | Cascade |
| WS-D — 9 portal sub-plans | ✅ Shipped (this PR) | Cascade |
| WS-E — visual feature builder spec | ✅ Shipped (this PR) | Cascade |
| WS-A2 — parity workstream in merged-execution-backlog | ✅ Shipped (this PR) | Cascade |
| WS-A3 — submodule OUTSTANDING + STATUS link rows | 🟡 Per-submodule one-line PRs (separate) | Cascade |
| WS-B — 12 grouped GitHub issues | 🔲 Follow-up PR (issue-filer subagent) | TBD |
| WS-C — dashboard schema additive extension | 🔲 Follow-up PR (post #535) | TBD |
| WS-E1–E5 — `/dev/feature-builder` shipped code | 🔲 Phase P-360 / future | BSU |
| WS-F — doc-drift sweep (17 items) | 🔲 Follow-up PR | Cascade |

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

### 3. System Notices (SP-5)

| Component | Status |
|-----------|--------|
| DB migration `20260319000001_system_notices.sql` | ✅ Applied |
| `useSystemNotices` hook (Supabase Realtime, severity-aware) | ✅ All 5 apps |
| `SystemNoticeBanner` component | ✅ All 5 apps |
| Platform-scope notices (developer/platform_admin) | ✅ Wired |
| Tenant-scope notices (enterprise super-admin) | ✅ Wired |

### 4. TenantBrandingProvider Rollout

| App | Status |
|-----|--------|
| CRM7 | ✅ `TenantThemeProvider` — migration + settings page + CSS vars |
| BSU | ✅ `TenantBrandingProvider` + `useTenantBranding` hook wired |
| R80.3 | ✅ `TenantBrandingContext` — 4 CSS vars applied |
| Conduit | ✅ Server-side `getInlineBrandingStyle()` + `TenantBrandingProvider` client |
| Braden | ✅ Hook present; `logo_url` + `company_name`; palette locked to Corporate |

### 5. Authentication & OAuth

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

### 6. DRY One-Shot Architecture

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
- ✅ **Theme architecture reconciliation + dashboard finish pass** — D2C token/source-layer correction landed; Dashboard migrated from inline Responsive grid to universal `PageGridLayout`; CLS fixed (`containerWidth > 0` guard); Quick Actions stacked layout; edit-mode border; CSS vars verified in `theme.css` (2026-03-17)
- ✅ **Universal Page Canvas** — `PageGridLayout` applied to Dashboard, Budget, Communications, Contacts, Analytics; `PageEditorLauncher` fires edit event directly (no modal gate); widget registry + `EntityTableWidget` + `WidgetPalette` infrastructure; Schema Builder "Add to Page" button + entity widget injection; 2427/2427 tests, 0 typecheck errors (2026-03-17)
- ✅ **Per-tenant Branding (three-tier)** — original `TenantThemeProvider` landed 2026-03-17 with `tenant_settings`-backed primary/accent CSS vars. 2026-04-14 upgrade (crm7 PR #193 + BSU PR #60 + backend migrations via bsuite#148): new `useBranding()` hook resolves **Tier 3** (tenant_app_branding) → **Tier 2** (tenant_branding) → **Tier 1** (platform_branding) → hardcoded D2C fallback; honours `platform_branding.force_override_tenant_ids` for super-admin lock-to-platform; parallel tier fetches; light/dark logo URL variants; slot-aware Logo (`header`/`sidebar`/`auth`/`favicon`).
- ✅ **A11y sweep** — heading level skips fixed in competency report + incidents pages; `WorkflowBuilder` icon buttons labelled; `PageGridLayout` loading placeholder with `aria-busy` (2026-03-17)
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
- ✅ **RBAC architecture** — two-tier role model (BSuite portal roles → Conduit operational roles), 69 fine-grained permissions across 12 domains, `PermissionGate` component, `usePermissions` hook, server-side middleware route protection with `ROUTE_PERMISSIONS` map + write-route pattern matching, tenant role overrides via `mapPortalRoleToConduit(portalRole, tenantOverrides)`. See [`conduit/docs/20260303-rbac-architecture-design-v1.00W.md`](../conduit/docs/20260303-rbac-architecture-design-v1.00W.md)

**Remaining:**

- ✅ **AI assistant "Scout"** — API route, chat hook, branded UI, and assistant surfaces are present in repo ([plan](./plans/20260228-conduit-ai-tools-plan-v1.00W.md), [prompt](./claude-code-prompts.md#prompt-2))
- ✅ **Candidate Portal** (2026-04-14, conduit PR #46) — replaces `/portal/candidate` stub with authenticated dashboard: applications, upcoming interviews, offers, documents. New RLS helper `r7_candidate_id_for_auth_user()` + 6 co-existing `FOR SELECT` policies. 29 view-component tests + 28 data-layer tests (conduit PR #49).
- ✅ **Public careers page** (2026-04-14, conduit PR #48, rebased from #45) — replaces `/portal/careers` stub with working job board, JSON-LD `JobPosting` structured data, `r7_jobs.apply_url` + `apply_email` columns, `public_jobs_visible_all` RLS policy.
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
- ✅ **Fair Work API cache & fallback architecture** (PR #48) — in-memory cache → `award_rate_cache` Supabase table → empty fallback ladder; `fairworkCacheFallback.test.ts` behaviour suite. See [`docs/20260304-r80-fairwork-api-reference-v1.00W.md`](../R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md)
- ✅ PDF export
- ✅ Enterprise agreement manager
- ✅ Award rate selector with templates
- ✅ Comparative view
- ✅ Import/export calculations
- ✅ BSU OAuth integration
- ✅ Onboarding wizard
- ✅ Wage source manager (multiple data sources) — CSV/spreadsheet import with auto-recalculation, fallback behaviour, format normalization

**Remaining:**

- 🔶 **PWA + offline** — `vite-plugin-pwa` and manifest are present; full offline maturity still needs review ([prompt](./claude-code-prompts.md#prompt-4))
- 🔶 **Wage calculation test suite** — multiple Vitest suites exist; 2026-04-14 R80.3 PR #48 added `fairworkCacheFallback.test.ts` (17 behaviour tests on the in-memory → DB fallback ladder), closing the last uncovered critical path on the legal-compliance critical chain. Broader 90%+ coverage target and logger migration still tracked.
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

- ✅ **Stripe billing portal** — 5 webhook events, `useSubscription` hook, checkout + portal flow fully audited and gap-filled. 16 stripeService tests + 10 useSubscription tests passing (SP-2, 2026-03-19)
- 🔶 **Session handoff + AppSwitcher** — AppSwitcher component exists; full cross-app rollout and handoff completeness still need review ([plan](./plans/20260228-bsu-project-switching-plan-v1.00W.md), [prompt](./claude-code-prompts.md#prompt-7))
- ✅ **Idea Hub** — implemented 2026-03-16 (`/ideas` route + nav entry, `ideas` DB table)
- 🔶 **Cross-app notifications** — Supabase Realtime pub/sub, notification center UI, notification preferences
- 🔲 Unified settings management
- 🔲 Usage analytics dashboard
- 🔲 Unified navigation (`@bsuite/nav-core` shared package + shadcn sidebar migration)

---

## Recently Completed (as of 2026-04-14 — afternoon claude-loop rotation batch)

> 30+ PRs merged across all 5 apps in the 2026-04-14 claude-loop rotation cycle (DEPS → FEATURE → UI → UX → WL → TYPES → A11Y → DB → EDGE → TESTS → COMPETE). Rotation tracker issues: [bsuite#139](https://github.com/GaryOcean428/bsuite/issues/139) through [bsuite#166](https://github.com/GaryOcean428/bsuite/issues/166).

**WL — Three-tier white-label hook (bsuite#148 / bsuite#152)**

- ✅ Platform/tenant/app-specific branding schema applied to Supabase via MCP — `platform_branding` (single row, force-override list), `tenant_branding` v2 with logo_light/dark/favicon URLs, `tenant_app_branding` (per-app per-tenant overrides).
- ✅ `useBranding()` hook landed in **crm7** ([PR #193](https://github.com/GaryOcean428/crm7/pull/193)) and **BSU** ([PR #60](https://github.com/GaryOcean428/business-suite-unified/pull/60)) — resolves Tier 3 → Tier 2 → Tier 1 → hardcoded D2C Neon Electric fallback, honours `force_override_tenant_ids`, parallel tier fetches, CSS custom properties (`--brand-primary/secondary/accent/font` + legacy `--app-*`/`--color-*`), slot-aware logo component accepting `header`/`sidebar`/`auth`/`favicon`.
- ✅ RLS `auth_rls_initplan` WARNs on all three new branding tables resolved — migration wraps `auth.uid()` in `(SELECT auth.uid())` for O(1) plan-time evaluation. crm7 PR #195.

**FEATURE — Candidate Portal + public careers page (conduit)**

- ✅ **Conduit Candidate Portal** ([PR #46](https://github.com/GaryOcean428/conduit/pull/46)) — replaces `/portal/candidate` "coming soon" stub with full authenticated surface: applications, upcoming interviews, offers, documents. New RLS helper `r7_candidate_id_for_auth_user()` joins `auth.users` → `r7_candidates` on lower-cased email. Six new `FOR SELECT` policies co-exist with existing tenant_isolation (OR-combined). 29 view-component tests.
- ✅ **Conduit public careers page** ([PR #48](https://github.com/GaryOcean428/conduit/pull/48), rebased from stale #45 per handoff [bsuite#164](https://github.com/GaryOcean428/bsuite/issues/164)) — replaces `/portal/careers` stub with working job board, JSON-LD `JobPosting` structured data for Google for Jobs, `r7_jobs.apply_url` + `apply_email` columns, `public_jobs_visible_all` RLS policy.

**COMPETE — Per-stage deal rotting alerts (crm7)**

- ✅ **crm7 per-stage deal rotting alerts** ([PR #191](https://github.com/GaryOcean428/crm7/pull/191)) — converges with HubSpot Sales Hub Pro+, Pipedrive, and Salesforce Lightning 2026 "stage rotting" feature. New `opportunities.stage_entered_at` column + trigger on stage transitions; pipeline-velocity.ts now uses precise time-in-stage instead of the age-since-creation substitution called out in the previous header.

**TYPES — Type tightening (3 projects)**

- ✅ **crm7** ([PR #194](https://github.com/GaryOcean428/crm7/pull/194)) — EntitySelector schema-agnostic `EntitySelectorQuery` alias, useEffect cleanup audit, export trimming.
- ✅ **BSU** ([PR #57](https://github.com/GaryOcean428/business-suite-unified/pull/57)) — mcpDebugger `window`/`performance.memory`/`window.MCPDebugger` typed via `declare global` (was 3 `any` casts), schemaBuilderService unified on `.from()` generic builder, AuthContext `UserTenantRow` interface (drop `(row: any)`), 10s loading-watchdog timeout cleared in effect cleanup.
- ✅ **R80.3** ([PR #46](https://github.com/GaryOcean428/R80.3/pull/46)) — 5 `any` casts eliminated; `debounce` generic `T extends (...args: never[]) => void`; `FinancialYearRow` / `EnterpriseAgreementRow` inline DB interfaces; remaining TypeScript strictness flags enabled. Completes the last outstanding TYPES rotation across the BSuite workspace.

**A11Y — WCAG 2.1 AA sweep (3 projects)**

- ✅ **BSU** ([PR #62](https://github.com/GaryOcean428/business-suite-unified/pull/62)) — Branding, AdminBranding, Notices admin pages. useId() field IDs, aria-live error regions, label/for associations on 15+ inputs.
- ✅ **Conduit** ([PR #40](https://github.com/GaryOcean428/conduit/pull/40)) — ComposeDialog migrated to Radix Dialog primitive (free focus trap, portal, escape, outside-click), channel selector → APG tablist (role=tablist/tab, arrow/home/end keyboard nav), aria-invalid + aria-describedby on every field, aria-busy on submit, aria-live=assertive for send-error banner. EmptyState focus-visible rings.
- ✅ **R80.3** ([PR #45](https://github.com/GaryOcean428/R80.3/pull/45) + [PR #47](https://github.com/GaryOcean428/R80.3/pull/47)) — Trash2 aria-label, PaydaySuperCalculator htmlFor/id on 5 inputs, 4 settings toggle switches, skip-to-main-content link, LoginModal role=dialog + aria-modal + focus trap + body scroll lock + Escape dismiss, ExportCalculations radiogroup fix.

**DB — Supabase health audit fixes (crm7)**

- ✅ **Storage listing gap** ([PR #187](https://github.com/GaryOcean428/crm7/pull/187)) — dropped broad public `tenant_logos_select` policy on `storage.objects`. Public reads continue via CDN path (`storage.buckets.public = true`). Closes Supabase advisor `public_bucket_allows_listing` WARN on `tenant-logos` bucket.
- ✅ **rls_initplan on branding tables** ([PR #195](https://github.com/GaryOcean428/crm7/pull/195)) — 5 `auth_rls_initplan` WARNs cleared on `platform_branding` and `tenant_app_branding` (see WL block above).

**EDGE — SEC-EDGE-005 security hardening (all Supabase edge fns)**

- ✅ **BSU 6-function constant-time compare sweep** ([PR #66](https://github.com/GaryOcean428/business-suite-unified/pull/66), rebased from #63) — centralized `timingSafeEqual` + `isServiceRoleCall` in `_shared/cors.ts`; migrated `verifyInternalAuth`, `send-notification`, `email-dispatcher` (+ Content-Type enforcement + 256KB body cap), `oauth-google-email/handleRefresh`, `oauth-microsoft-email/handleRefresh`, `process-webhook-queue` (also repaired undefined `serviceKey` reference that was crashing every invocation).
- ✅ **BSU CORS + rate limit hardening** ([PR #64](https://github.com/GaryOcean428/business-suite-unified/pull/64)) — `calendar-integration` migrated to shared CORS + shared rate limiter (was missing entirely on a 1021-line public-facing endpoint), `tga-search` replaced inline 16-line rate limiter + 4-origin CORS allowlist (-38 lines). Shared `_shared/cors.ts` now recognises Vercel preview origins, crm7.app/braden.com.au apex variants, and 127.0.0.1:* dev origins.
- ✅ **BSU edge hardening** ([PR #58](https://github.com/GaryOcean428/business-suite-unified/pull/58)) — `process-webhook-queue` repaired (undefined `serviceKey` crash), `lead-capture` replaced wildcard CORS with shared allowlist, `stripe-portal` closed IDOR on client-supplied `customerId` (authentication now always required, `body.customerId` accepted only as hint and rejected with 403 if it doesn't match resolved tenant-owned ID), `generate-document` replaced wildcard CORS and added missing rate limiting.
- ✅ **crm7 edge functions** — [PR #188](https://github.com/GaryOcean428/crm7/pull/188) fixed duplicate `checkRateLimit` shadow in `store-ram-credential` + `xero-token-exchange` (local `checkRateLimit(userId)` was shadowing shared `checkRateLimit(req)` import, causing always-429-or-always-allow-through); [PR #190](https://github.com/GaryOcean428/crm7/pull/190) added constant-time compare + `week_ending` format validation to `timesheet-reminders`, constant-time compare on `compliance-scanner`; pre-auth IP rate limit added to `document-encryption` (previously only post-auth).

**DEPS — 2026-04-14 patch round (5 projects)**

- ✅ **BSU** ([PR #59](https://github.com/GaryOcean428/business-suite-unified/pull/59)) — 8 declared-floor bumps across react-hook-form, framer-motion, recharts, typescript-eslint, autoprefixer, globals (floors had drifted behind caret-resolved versions).
- ✅ **Conduit** ([PR #42](https://github.com/GaryOcean428/conduit/pull/42) + [PR #44](https://github.com/GaryOcean428/conduit/pull/44)) — @ai-sdk/google 3.0.62→3.0.63, @ai-sdk/react 3.0.160→3.0.161, ai 6.0.158→6.0.159, next/eslint-config-next 16.1.6→16.2.3, react/react-dom 19.2.4→19.2.5.

**TESTS — Behaviour-pinning test expansion (3 projects)**

- ✅ **crm7** ([PR #189](https://github.com/GaryOcean428/crm7/pull/189)) — 65 tests across `src/lib/ai/config.test.ts` (21), `model-router.test.ts` (44) — pins Grok-4.1-fast-reasoning primary + Claude-Sonnet-4.6 / Claude-Opus-4.6 fallbacks (AGENTS.md "never replace grok" rule guarded), complexity routing, per-tenant monthly quota enforcement.
- ✅ **Conduit** ([PR #49](https://github.com/GaryOcean428/conduit/pull/49)) — 80 behaviour tests across nav-utils (27), logger (15), interpolateTemplate (25), getCandidateProfile (28). Candidate Portal data layer (5 `cache()`-wrapped server resolvers + `loadCandidatePortalData()` fan-out) had zero direct tests before this. Baseline 357 → 437 tests (+22%).
- ✅ **R80.3** ([PR #48](https://github.com/GaryOcean428/R80.3/pull/48)) — 17 behaviour tests in `fairworkCacheFallback.test.ts` — in-memory cache hit/miss, retry-exhaust → DB fallback content (`award_rate_cache` transform path), empty-row degradation to clean fallback. Completes the wage-calc legal-compliance test ladder.

**PERF — Conduit branding waterfall collapse (conduit)**

- ✅ **Conduit** ([PR #41](https://github.com/GaryOcean428/conduit/pull/41)) — eliminated 5-query Supabase waterfall on every dashboard page load. New `cache()`-wrapped `getCurrentUser()` + `getTenantContext()` helpers (canonical Next.js 16 / React `cache()` pattern), `getInlineBrandingStyle()` tenant_settings + tenant_branding + platform-default-fallback queries now parallelized via `Promise.all`.

**DOCS — R80.3 Fair Work reference v1.01W (R80.3)**

- ✅ **R80.3 Fair Work API reference** ([PR #49](https://github.com/GaryOcean428/R80.3/pull/49)) — documented the actual 3-layer cache & fallback ladder (in-memory → `auth-fairwork` edge fn → `award_rate_cache` → empty fallback), retry semantics (3 attempts, exponential backoff 1s/2s/4s), per-function fallback paths for `fetchAwards`/`fetchClassifications`/`fetchApprenticeRates`/`getAward`/etc, and the "API 200 with 0 rows" sub-path that's the actual common failure mode after every 1 July FWC schema revision. Previously the doc only covered upstream FWC endpoint shapes.
- ✅ **R80.3 package.json duplicate key fix** ([PR #50](https://github.com/GaryOcean428/R80.3/pull/50)) — removed stale `@playwright/test: ^1.50.0` key shadowed by `^1.59.1` (duplicate JSON keys are RFC 8259 undefined behaviour; schema linters and `pnpm outdated` silently dropped the first occurrence).

## Recently Completed (as of 2026-04-14 — morning batch)

- ✅ **Tier-3 EntitySelectors** (2026-04-14, crm7 PR #192) — AwardRateSelector, PlacementSelector, HostSiteSelector, FieldOfficerSelector, TrainingProviderSelector added to `src/components/entity/selectors/`. Roadmap 26c.
- ✅ **R80.3 Wage Source CSV UI** (2026-04-14, R80.3 PR #51) — Download Template button + Import CSV File picker in Settings → Award Rates. Surfaces existing `generateSampleCSVTemplate()` + `importWageDataFromFile()` service functions. Roadmap 27h.
- ✅ **Roadmap v5.01W** (2026-04-14, bsuite PR #136) — Full doc→roadmap audit across 6 repos. 17 new entries, 13 confirmed complete, Audit Sprint Status table.
- ✅ **CRM7 Nav + white-label fix** (2026-04-13, PR #185) — Collapsed nav icon mode correct; SidebarProvider as flex-row root fixes main content reflow; CRM7Logo always visible in header; `branding.tsx` now upserts to `tenant_branding` table (not disconnected `tenant_settings`)
- ✅ **Node 24 alignment** (2026-04-13, PR #186) — crm7 `.node-version` 22→24 matching `engines.node: "24"`
- ✅ **RLS migration** (2026-04-13) — all 5 tenants/user_tenants policies changed from {public} → {authenticated}. Migration `20260413062306_fix_rls_public_to_authenticated_tenant_policies` applied.
- ✅ **BSU AGENTS.md OAuth mandate** (2026-04-13) — Two-provider OAuth canonical spec (Google + Microsoft/Azure only, GitHub intentionally removed). New "Automated Deployment Checks" section.
- ✅ **Fair Work API cache & fallback architecture** (R80.3, PR #48) — in-memory → `award_rate_cache` → empty fallback ladder. `fairworkCacheFallback.test.ts` behaviour suite. `award_rate_cache` Supabase table.

## Recently Completed (as of 2026-03-19)

- ✅ TGA edge function deployed to Supabase
- ✅ 7 STA adapters + RAM/USI/ADMS Settings UI complete
- ✅ Launch-Ready Phase 2: empty states across CRM7
- ✅ caseNoteStore + host_preferred_qualifications migration
- ✅ Fair Work compliance: timesheets (reg 3.34), disciplinary/PIP/support person, termination (reg 3.40), leave NES §88/§90
- ✅ God file refactor (issue #92 closed)
- ✅ R80.3 Milestones 2–3 committed (unified upgrade branch merged)
- ✅ **Universal Page Canvas** (2026-03-17) — PageGridLayout wired to all 5 main CRM7 pages; widget registry + EntityTableWidget + WidgetPalette; Schema Builder "Add to Page"; CLS fixed; 14 commits on crm7 development branch (PRs open, pending review)
- ✅ **Per-tenant Branding** (2026-03-17) — TenantThemeProvider + Settings > Branding page + tenant-assets bucket + migration
- ✅ **BSU Developer bypass fix** (2026-03-17) — stale-closure in checkSubscription resolved; hasBypassRole reset on sign-out; 3 commits on BSU development branch (PR open, pending review)
- ✅ **A11y sweep** (2026-03-17) — heading levels, WorkflowBuilder aria-labels, PageGridLayout placeholder
- ✅ Document lifecycle system: 8 phases complete, TGA edge function deployed, 2,382 tests passing
- ✅ RAM M2M auth wired: credential decrypted, Settings UI complete (ABRD:21662181740_crm7, valid to 2028-03-03)
- ✅ WIF migration complete (static SA keys → Workload Identity Federation)
- ✅ P0/P1 sweep: Conduit candidate docs tab, BSU Idea Hub, Braden GA4 env var migration
- ✅ Documentation compliance remediation: 375 .md files normalized to YYYYMMDD convention
- ✅ **P3 SP-1** (2026-03-19): TenantBrandingProvider rolled out to all 5 apps
- ✅ **P3 SP-2** (2026-03-19): BSU Stripe E2E audit + gap-fill (5 webhook events, 26 tests)
- ✅ **P3 SP-4** (2026-03-19): Entity crosswalk doc `docs/20260319-entity-crosswalk-v1.00D.md`
- ✅ **P3 SP-5** (2026-03-19): `system_notices` migration + `SystemNoticeBanner` + `useSystemNotices` — all 5 apps
- ✅ **P3 CA-8** (2026-03-19): BSU hardcoded hex → D2C token sweep (ideas pages, Analytics `D2C_CHART` const, `PageGridLayout`)

## In Progress / Pending

- ⚠️ Item 9: Test coverage — fairwork + auth tests complete, 16 pre-existing failures in AI components remain
- ⚠️ Dashboard polish: hero signals, bento grid, ai_sessions/ai_messages tables, DND accessibility (KeyboardSensor)
- ✅ ~~Stripe end-to-end verification~~ — complete (2026-03-19)
- ⚠️ SP-3: CRM7 Tier 3-4 page wiring — in progress (Claude Code primary)
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
| 4 | ~~BSU Stripe billing portal~~ ✅ E2E verified | bsu | ✅ Done | Cascade | 2026-03-19 |
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
| 21 | AI cost tracking per tenant + full AI cost dashboard (per-user, per-tenant, per-feature breakdown with budget alerts) | crm7/bsu | 3d | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Part 2 §6 |
| 22 | Document storage QA fixes | crm7 | 2d | [report](./archive/crm7/20260226-document-storage-qa-report.md) |
| 23 | Doc cleanup (22 missing READMEs, broken links) | all | 1d | Claude plan `prancy-seeking-dijkstra` |
| 24 | Braden visual customization | braden | 1w | — |
| 25 | R80.3 PDF export improvements | R80.3 | 2d | — |
| 26 | Test coverage push (70% target all projects) | all | ongoing | — |
| 26a | ~~CC-1: DashboardPageEditorDrawer accessibility — add `KeyboardSensor` + `sortableKeyboardCoordinates` + `aria-label` on grip buttons~~ | crm7 | ✅ Done (struck under P0-15 rollup 2026-05-01; tracked in merged backlog if re-opened) | Gap report v2 CC-1 |
| 26b | CRM7 DRY one-shot: auto-population chains — apprentice select fills 6 related fields, claims/new auto-fills qualification/employer/dates | crm7 | 1d | [UX One-Shot Deep Dive](./20260226-ux-oneshot-deep-dive-plan-v1.00W.md) Phase 4 |
| 26c | ~~CRM7 DRY one-shot: Tier-3 EntitySelectors — `AwardRateSelector`| crm7 | ✅ Done | [DRY Architecture](./20260227-dry-one-shot-architecture-v1.00A.md) §3 Tier 3 |
| 26d | CRM7 DRY one-shot: DB FK migrations — `employers.primary_contact_id`, `funding_sources.contact_id` + ContactSelector on 9 forms | crm7 | 1d | [UX One-Shot Deep Dive](./20260226-ux-oneshot-deep-dive-plan-v1.00W.md) Phase 3 |
| 26e | ~~@types/node upgrade to ^24.x across all 5 apps~~ | all | ✅ Done (shipped pre-finish-line via 2026-04-14 DEPS rotation; struck under P0-15 rollup) | Gap report v2 RT-7 |
| 26f | ~~pnpm version alignment to 10.32.1 (BSU, braden, conduit, R80.3 behind CRM7)~~ | all | ✅ Done (superseded by `packageManager: pnpm@10.30.3` canonical pin in `AGENTS.md`; struck under P0-15 rollup) | Gap report v2 RT-8 |
| 26g | ~~R80.3: add `@vitest/coverage-v8 ^4.0.0` (missing, blocks `pnpm test:coverage`)~~ | R80.3 | ✅ Done (shipped pre-finish-line via 2026-04-14 DEPS rotation; struck under P0-15 rollup) | Gap report v2 RT-9 |
| 26h | Conduit RBAC: document ✅ status — PermissionGate, middleware route protection, tenant role overrides, write-route pattern matching all confirmed implemented | conduit | — | [RBAC Design](../conduit/docs/20260303-rbac-architecture-design-v1.00W.md) |

### P3 — Future

| # | Task | Project | Effort | Source |
|---|------|---------|--------|--------|
| 27 | AI plugin system + Xero + Calendar + workflow automation | crm7 | 3w | Prompt 5 |
| 27a | AI Conversational Data Entry — natural language CRM: user types entity description → AI extracts structured data → auto-creates record via tool call | crm7 | 1w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Feature 2 |
| 27b | AI Predictive Compliance Engine — daily background job scoring all apprentices for risk (training delays, expiring docs, funding eligibility, WHS patterns) → creates urgent tasks for field officers | crm7 | 1w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Feature 1 |
| 27c | AI Intelligent Report Generation — natural language analytics: user asks question → AI generates structured report with visualizations and actionable insights | crm7 | 1w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Feature 3 |
| 27d | AI Autonomous Workflow Engine — AI-triggered multi-step workflows (document routing, assessment scheduling, high-risk intervention) | crm7 | 2w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Feature 4 |
| 27e | Embedding/Vector Search — semantic document search via openai/text-embedding-3-small + vector DB; smart knowledge base; intelligent entity matching | crm7 | 1w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Part 2 §7 |
| 27f | AI Provider Routing + Fallbacks — xAI → Claude → GPT-5 fallback chain; cost-optimised routing; 99.99% uptime strategy | crm7 | 3d | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Part 2 §5 |
| 27g | AI Real-Time Compliance Intelligence — Perplexity Search integration for Fair Work monitoring (fairwork.gov.au + legislation.gov.au), Training.gov.au auto-sync, WHS regulation updates, USI verification | crm7 | 1w | [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) Part 2 §4 |
| 27h | ~~R80.3 Wage Source Enhancements~~ — CSV template download + import UI live in Settings; timestamp + preview on import | R80.3 | ✅ Done (2026-04-14) | [External Wage Sources](../R80.3/docs/20260304-r80-external-wage-sources-reference-v1.00W.md) |
| 28 | BSuite Mobile native (Expo → Google Play) | new `mobile/` | 2w | Prompt 1B |
| 29 | Org → Tenant hierarchy | bsu/crm7 | 1w | Feature gap §1C |
| 30 | ~~BSU Idea Hub~~ ✅ | bsu | ✅ Done | Windsurf | 2026-03-16 |
| 31 | Field-level parity against GTO evidence requirements | crm7 | 2d | Feature gap §2F |
| 32 | Demo seed data | all | 2d | Feature gap §6 |
| 33 | Compliance automation workflows | crm7 | 1w | — |
| 34 | Advanced reporting with predictive analytics | crm7 | 2w | — |
| 35 | BSU usage analytics dashboard | bsu | 3d | — |
| 36 | Biped marketplace integration (P4 deferred) | braden/bsu | 2w | Deferred until core 5 are best-in-class |

---

## P3 Sprint Status (2026-03-19)

**Plan:** [`~/.windsurf/plans/p3-sprint-plan-2f6071.md`](../../../.windsurf/plans/p3-sprint-plan-2f6071.md)

| Item | Description | Status |
|------|-------------|--------|
| SP-1 | TenantBrandingProvider — all 5 apps | ✅ Complete |
| SP-2 | BSU Stripe E2E audit + gap-fill + tests | ✅ Complete |
| SP-3 | CRM7 Tier 3-4 page wiring | 🔶 In progress (Claude Code) |
| SP-4 | Entity crosswalk doc | ✅ Complete |
| SP-5 | system_notices migration + SystemNoticeBanner rollout | ✅ Complete |
| CA-8 | BSU hardcoded hex → D2C token sweep | ✅ Complete |
| RT-10 | BSU react-day-picker v8 → v9 audit | 🔲 Pending |

## Audit Sprint Status (2026-04-14)

_Source: Full doc→roadmap cross-reference across all 6 repos. See [BSuite Gap Report v2](./20260317-bsuite-gap-report-v2.00W.md) and [AI Strategic Vision](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md)._

| Item | Description | Status |
|------|-------------|--------|
| AUD-1 | Conduit RBAC architecture (PermissionGate, middleware, 69 permissions, tenant overrides) | ✅ Confirmed implemented — added to roadmap as 26h |
| AUD-2 | R80.3 Fair Work cache & fallback (PR #48, award_rate_cache table) | ✅ Confirmed implemented — added to Recently Completed |
| AUD-3 | CRM7 nav + branding fix (PR #185) | ✅ Confirmed implemented — added to Recently Completed |
| AUD-4 | RLS {public} → {authenticated} migration | ✅ Confirmed applied — added to Recently Completed |
| AUD-5 | CA-1 sonner v2 alignment (BSU, Conduit) | ✅ Confirmed done (Gap v2 summary) |
| AUD-6 | CA-2 TypeScript upgrade all apps | ✅ Confirmed done (Gap v2 summary) |
| AUD-7 | CA-3 @supabase/supabase-js 2.99.2 all 5 | ✅ Confirmed done (Gap v2 summary) |
| AUD-8 | CA-4 AI SDK version sync Conduit↔CRM7 | ✅ Confirmed done (Gap v2 summary) |
| AUD-9 | CA-5 vitest v4 all projects | ✅ Confirmed done (Gap v2 summary) |
| AUD-10 | CA-6 BSU FOUC inline theme script | ✅ Confirmed done (Gap v2 RT-3) |
| AUD-11 | CC-2 DialogTitle sweep (claimed 81 gaps) | ✅ Zero gaps — count was total usages not missing titles |
| AUD-12 | @types/react-grid-layout ^2.1.0 all projects | ✅ Confirmed done (Gap v2 RT-5) |
| AUD-13 | AI Strategic Vision features 1–4 + vector search + provider routing | 🔲 Added to roadmap as 27a–27g (P3 — future work) |
| AUD-14 | DRY one-shot: auto-population chains + Tier-3 selectors + FK migrations | 🔲 Added to roadmap as 26b–26d (P2) |
| AUD-15 | @types/node ^24.x upgrade + pnpm 10.32.1 alignment + R80.3 coverage-v8 | ✅ Done (26e/26f/26g struck under P0-15 rollup 2026-05-01) |
| AUD-16 | CC-1 DashboardPageEditorDrawer KeyboardSensor + aria | ✅ Done (26a struck under P0-15 rollup 2026-05-01) |
| AUD-17 | R80.3 Wage Source Enhancements (CSV template, version control) | ✅ Complete (PR #51) |

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

## Revision log

- **2026-05-01 v5.03W** — Phase 0 ratification rollup (P0-15 of finish-line roadmap):
  - Citation added: merged execution backlog (`20260501-merged-execution-backlog-v1.00W.md`) as the active phase-ordered execution queue post-ratification.
  - Citation added: Phase 0 ADRs 0001–0006 as governance authority for atomic replace-and-remove.
  - Struck P2 items #26a, #26e, #26f, #26g (shipped pre-finish-line via 2026-04-14 DEPS rotation, or superseded by canonical `AGENTS.md` pin). Titles wrapped in strikethrough; effort column set to ✅ Done.
  - Audit Sprint Status: AUD-15 and AUD-16 marked ✅ Done (their rollup destinations 26e/26f/26g and 26a are now all struck).
  - Last Updated line refreshed.
- **2026-04-14 v5.02W** — post-TESTS rotation; 30+ PRs merged across all 5 apps covering DEPS → FEATURE → UI → UX → WL → TYPES → A11Y → DB → EDGE → TESTS → COMPETE rotation.
- **2026-04-14 v5.01W** — full doc→roadmap audit across 6 repos (bsuite PR #136). 17 new entries, 13 confirmed complete, Audit Sprint Status table added.
- **2026-02-27 v5.00W** — initial consolidation; per-project roadmaps archived to `docs/archive/<project>/`.

---

## Related Documents

| Document | Location |
|----------|----------|
| Active execution queue (post-Phase 0) | [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md) |
| Phase 0 ADR index | [`docs/adr/README.md`](./adr/README.md) |
| Phase 0 completion report | [`docs/20260501-phase-0-completion-report-v1.00W.md`](./20260501-phase-0-completion-report-v1.00W.md) |
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
| BSuite Gap Report v2 (2026-03-17) | [`docs/20260317-bsuite-gap-report-v2.00W.md`](./20260317-bsuite-gap-report-v2.00W.md) |
| BSuite Completeness Matrix (2026-03-09) | [`docs/20260309-bsuite-completeness-matrix-v1.00W.md`](./20260309-bsuite-completeness-matrix-v1.00W.md) |
| CRM7 AI Strategic Vision | [`crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md`](../crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md) |
| Conduit RBAC Architecture Design | [`conduit/docs/20260303-rbac-architecture-design-v1.00W.md`](../conduit/docs/20260303-rbac-architecture-design-v1.00W.md) |
| R80.3 External Wage Sources Reference | [`R80.3/docs/20260304-r80-external-wage-sources-reference-v1.00W.md`](../R80.3/docs/20260304-r80-external-wage-sources-reference-v1.00W.md) |
| R80.3 Fair Work API Reference (incl. cache/fallback arch.) | [`R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md`](../R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md) |
| Entity Crosswalk & Traceability | [`docs/20260319-entity-crosswalk-v1.00D.md`](./20260319-entity-crosswalk-v1.00D.md) |

### Archived Roadmaps

| Original | Archive Location |
|----------|-----------------|
| CRM7 Master Roadmap | [`docs/archive/crm7/20260226-master-roadmap.md`](./archive/crm7/20260226-master-roadmap.md) |
| Braden Roadmap | [`docs/archive/braden/20260227-roadmap-v1.md`](./archive/braden/20260227-roadmap-v1.md) |
| R80.3 Roadmap | [`docs/archive/r80/20260227-roadmap-v1.md`](./archive/r80/20260227-roadmap-v1.md) |
| CRM7 Document Storage QA | [`docs/archive/crm7/20260226-document-storage-qa-report.md`](./archive/crm7/20260226-document-storage-qa-report.md) |
