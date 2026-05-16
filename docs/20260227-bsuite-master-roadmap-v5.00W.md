# BSuite Master Roadmap

**Version:** 5.12W
**Date:** 2026-02-27
**Last Updated:** 2026-05-15 (claude-loop ROADMAP rotation — capture 2026-05-15 PERF (crm7 AIAssistant lazy-load) + ROADMAP (R80.3 PDF multi-page) rotations + cross-app ship-all-apps merges since v5.11W: crm7#797/#798/#799, BSU#444/#445, throughput#162, R80.3#255/#256; strike P2 #25 + #26b as Done)
**Status:** Working
**Scope:** All BSuite projects — CRM7, Conduit, Braden, R80.3, business-suite-unified, throughput

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
- ✅ ~~Enterprise Agreement processing + BOAT validation (AI extraction, rate schedules)~~ — engine shipped end-to-end as `@bsuite/charge-calc/boot` v0.2.4 (8 modules, 1,757 LOC + 4,825 LOC tests) + CRM7 consumer at [`src/lib/rates/bootGate.ts`](https://github.com/GaryOcean428/crm7/blob/development/src/lib/rates/bootGate.ts) sha `428820e` + `/compliance/boot` routes + RLS role-separated human-review workflow. See [`docs/20260508-boot-engine-shipped-evidence-v1.00W.md`](./20260508-boot-engine-shipped-evidence-v1.00W.md).
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
- ✅ ~~Enterprise Agreement processing + BOAT validation~~ — see strikethrough above for the same row in the prior P2 zone; engine shipped at `@bsuite/charge-calc/boot` v0.2.4 + CRM7 integration. Evidence: [`docs/20260508-boot-engine-shipped-evidence-v1.00W.md`](./20260508-boot-engine-shipped-evidence-v1.00W.md).
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

## Recently Completed (as of 2026-05-15 evening — claude-loop PERF + ROADMAP rotations + cross-app ship-all-apps merges since v5.11W)

> Captures work landed 2026-05-15 between the v5.11W bump (DOCS rotation, bsuite#1013) and this v5.12W bump (ROADMAP rotation, bsuite#1020). Two claude-loop rotations + 8 cross-app PRs that merged on the ship-all-apps cycle.

**PERF — crm7 `AIAssistant` lazy-load (2026-05-15)**

- ✅ **152 KB / 30% off the authenticated-route entry chunk** ([crm7#795](https://github.com/GaryOcean428/crm7/pull/795), tracker [bsuite#1015](https://github.com/GaryOcean428/bsuite/issues/1015)) — claude-loop PERF rotation. Single-file change to `crm7/src/layouts/MainLayout.tsx`: static `import { AIAssistant } from '@/components/ai'` → `React.lazy()` + `<Suspense>` wrapper behind the existing `userId && tenantId &&` gate. Measured before/after via clean `pnpm build:noprerender`: entry chunk `index-DrJmdcoy.js` 523,032 B (510 KB) → `index-DMgHikCv.js` 366,068 B (358 KB) + new `AIAssistant-BVYH5iMd.js` 193,673 B (lazy). The 8 AIAssistant sub-components + `MarkdownContent` renderer + `useChat`/`useAIChat` SDK now stream in only after auth resolves. AIAssistant is non-critical-path (floating button, panel collapsed by default), so users see no visible difference for the <100ms chunk-stream latency. Vite `manualChunks` already split the `@ai-sdk/*` vendor (212 KB `ai-sdk` chunk) — this PR adds the complementary app-side dynamic-import split. DOM Layout Invariants confirmed zero structural delta. **Pattern banked:** stash-rebuild-pop-rebuild for §9.1 output-equivalence on bundle-delta PERF work.

**ROADMAP — R80.3 PDF export multi-page support (2026-05-15)**

- ✅ **Single-page overflow bug closed + "Page N of M" pagination** ([R80.3#257](https://github.com/GaryOcean428/R80.3/pull/257), tracker [bsuite#1020](https://github.com/GaryOcean428/bsuite/issues/1020)) — claude-loop ROADMAP rotation, **closes P2 #25** ("PDF export improvements (print-friendly, multi-page)"). Pre-fix, `exportCalculationToPDF` in `src/services/pdfExportService.ts` drew Calculation Details + Pay Rate + Results + Charge Rate + On-Cost Breakdown + Configuration sequentially without a page-break check; on dense rows the Configuration block overflowed past A4 page height (~297 mm) and content was silently lost. The multi-calc table loop had a row-level break but didn't re-draw the column header on continuation pages. Fix: two helper functions — `ensureSpace(doc, y, requiredSpace)` (called before each section + each table row, adds page if needed) and `stampFooters(doc, leftMargin)` (runs last, loops over `getNumberOfPages()` to stamp "Page N of M" + generator footer on every page). Multi-calc continuation pages now re-draw the table header. Output-equivalence preserved: for any export that previously fit on one page, the `ensureSpace` early-return path is a no-op → byte-identical output.

**ROADMAP — strike P2 #26b (auto-population chains) as Done**

- ✅ **CRM7 DRY one-shot auto-population chains** — verified shipped via `src/pages/claims/new.tsx` (sha `98007f6`). `handleApprenticeSelect` callback (lines 215-237) auto-fills 5 fields from the selected apprentice: `qualification_code`, `qualification_name`, `employer_id`, `apprenticeship_start`, `is_first_year` (derived from `start_date`); `handleSourceSelect` (lines 256-279) auto-fills 2 more from the funding source: `government_level`, `external_system`. Both run an `runEligibilityCheck()` side effect that further auto-fills `claim_amount` (max eligible) and `claim_type` (top suggested) when both selectors resolve. Net 7+ fields auto-populated — exceeds the original "6 related fields" acceptance target. Item was misclassified as P2-pending in v5.11W; correct status is ✅ Done. ROADMAP audit refresh.

**Cross-app ship-all-apps merges since v5.11W (informational — operator/other-agent shipped, not in claude-loop rotation count)**

- ✅ **crm7#797** — `refactor(crm7): AnnualReviewToggle auto-seeds asOfDate without enabled guard` — removes the guard on the seed-on-undefined useEffect so first interaction always shows real data
- ✅ **crm7#798** — `fix(db): drop 45 legacy storage.objects policies (closes crm7#774)` — storage.objects drift cleaned from 109 policies / 62 bucket groups back to canonical 64 / 17; legacy `"Delete X documents"` human-readable policies that duplicated the snake_case `<bucket>_<op>` canonical set are dropped
- ✅ **crm7#799** — `chore(edge-fn): delete dead adobe-sign-webhook (closes crm7#687, supersedes #686)` — Adobe Sign vendor removed (in-app `@xyflow/react` is the live path); deleted public-attack-surface edge function. Operator follow-up: undeploy + remove ADOBE_SIGN_* secrets
- ✅ **BSU#444** — `fix(ci): pin Node 24 explicitly in e2e.yml (consistency with other BSU workflows)` — same root cause as crm7#793, conduit#261; closes the last actions/setup-node@v5 silent-downgrade-to-Node-22 surface in BSU
- ✅ **BSU#445** — `fix(bsu): remediate react-hooks v7 warnings + enforce --max-warnings 0` — BSU lint 6 → 0 warnings; `form.watch()` → `useWatch()` in AuthForm + ColumnEditor; tightened lint script to fail CI on any new warning. Restoration follow-up commit `7bd8fe5` re-added the bsuite/no-text-white directives that the rule oscillation removed, set `reportUnusedDisableDirectives: 'off'`
- ✅ **throughput#162** — `chore(throughput): delete dead src/lib/ai.ts + drop direct openai/anthropic deps` — 135 LOC dead code with direct provider SDK imports violating bsuite#550 (all LLM calls route through Vercel AI Gateway); `langchainGroq.ts` is the canonical path. Direct deps dropped to transitive-only state via @langchain/core
- ✅ **R80.3#255** — `test(r8): PaydaySuperCalculator UI snapshot tests (#232 — P1.J slice 3/3)` — 5 Vitest + RTL snapshot tests with `vi.useFakeTimers()` pinning system time for deterministic banner / countdown / cap-applied / salary-sacrifice / compliance-schedule states
- ✅ **R80.3#256** — `feat(r8): Payday Super salary-sacrifice OTE/QE refinements (#231 — P1.J slice 2/3)` — ATO-aligned split of salary-sacrifice into OTE-eligible (concessional super, adds to QE) vs non-OTE-eligible (novated lease, FBT-exempt, excluded from QE); new tagged `PaydaySuperSalarySacrifice` interface supersedes legacy `hasSalarySacrifice` + `salarySacrificePerPeriod` pair via `resolveOteEligibleSacrifice` priority-ordered helper

---

## Recently Completed (as of 2026-05-15 — claude-loop rotation cycle TYPES → A11Y → DB → EDGE → TESTS → DOCS + operator baseline-grant audit)

> Captures work landed 2026-05-14 → 2026-05-15, not yet in the 2026-05-13 section below. Five claude-loop rotations + one operator audit deliverable + one tooling-doctrine bank.

**TYPES — R80.3 dormant `bsuite/no-text-white` sweep (2026-05-14)**

- ✅ **24 dormant ESLint warnings closed** ([R80.3#249](https://github.com/GaryOcean428/R80.3/pull/249), tracker [bsuite#993](https://github.com/GaryOcean428/bsuite/issues/993)) — claude-loop TYPES rotation. Every site was a coloured-background fill (`bg-blue-{500,600}`, `bg-green-500`, `bg-accent`, `bg-linear-to-{r,br}` gradients, `getYearColor()` apprentice badges) — the exact fill-context exception the rule's docstring carves out. 24 single-line `eslint-disable-next-line bsuite/no-text-white -- fill-context:` comments across 14 files plus one className-template collapse in `OnboardingWizard.tsx`. Sibling audit confirmed conduit + BSU + braden CLEAN; throughput carries 92 dormant `@typescript-eslint/no-explicit-any` warnings (queued).

**A11Y — Braden decorative-icon `aria-hidden` sweep (2026-05-15)**

- ✅ **11 WCAG 1.3.1 / 4.1.2 gaps closed on `www.braden.com.au` homepage** ([braden#278](https://github.com/GaryOcean428/braden/pull/278), tracker [bsuite#1002](https://github.com/GaryOcean428/bsuite/issues/1002)) — claude-loop A11Y rotation. Direct completion of bsuite#981 (heroicons → lucide-react swap of 4 contact-flow files). The predecessor PR shipped `aria-hidden="true"` on every decorative icon in `TrustSignals.tsx` + `EnhancedContactForm.tsx` but missed `Contact.tsx` (3 icons: MapPin/Phone/Mail) + `Services.tsx` (8 icons: ShieldCheck/FileText/Lightbulb/Monitor/Rocket/Cog/Briefcase/Globe). Pattern worth banking: when porting decorative-icon usage between libraries, add the a11y attribute at the same time — the icon-import diff is the natural seam.

**DB — BSU `public.ping()` SECURITY INVOKER conversion (2026-05-15)**

- ✅ **1 of 17 Supabase advisor 0029 (`authenticated_security_definer_function_executable`) WARN entries cleared** ([BSU#443](https://github.com/GaryOcean428/business-suite-unified/pull/443), tracker [bsuite#1004](https://github.com/GaryOcean428/bsuite/issues/1004)) — claude-loop DB rotation. `public.ping()` reads only `NOW()` + `current_setting('server_version')`; neither requires elevation, so SECURITY DEFINER served no purpose. Converted to `SECURITY INVOKER SET search_path = 'public', 'pg_temp'`. Other 16 lint-0029 functions have legitimate DEFINER justifications (admin ops, audit logs, cross-tenant lookups, or internal `is_platform_admin()` guards as defence-in-depth) — classified inline in tracker. Migration applied to `tuybltdrdefjblnplpqo` via Supabase MCP 2026-05-15T03:40Z; file-PR is source-of-truth catch-up. `check_auth()` deferred one cycle (multi-app callers, want bake-in).

**EDGE — crm7 rate-limiter shared-bucket DoS-on-others hardening (2026-05-15)**

- ✅ **CWE-770 / OWASP API4 (Unrestricted Resource Consumption) variant closed** ([crm7#794](https://github.com/GaryOcean428/crm7/pull/794), tracker [bsuite#1006](https://github.com/GaryOcean428/bsuite/issues/1006)) — claude-loop EDGE rotation. Pre-fix, when both `x-forwarded-for` and `cf-connecting-ip` were absent, every such request collided into a single bucket keyed by the literal string `"unknown"` — a noisy internal `supabase.functions.invoke` call (or a header-stripping attacker) could saturate the 30/min quota for ALL other unidentified callers across the 8 CRM7 edge functions sharing `_shared/rate-limiter.ts` (`lead-capture`, `document-encryption`, `generate-document`, `ram-token-exchange`, `store-ram-credential`, `xero-invoice-submit`, `xero-token-exchange`, `xero-token-exchange-cc`). Fix: per-request bucket key (`unknown:<crypto.randomUUID()>`); also `.trim()`'d `cf-connecting-ip` for header-whitespace tolerance. Memory bounded by existing 100-entries-per-request prune cap. Test contract: prior 11th assertion pinned the buggy shared-bucket behaviour (drain 30 → 31st denied); new assertion drains `RATE_LIMIT_MAX * 3 = 90` headerless requests and verifies all allowed. **BSU sibling has byte-identical bug** at `business-suite-unified/supabase/functions/_shared/rate-limiter.ts` — queued for next EDGE rotation.

**TESTS — conduit auth-helper + RBAC matrix coverage (2026-05-15)**

- ✅ **76 new vitest cases across 3 previously-zero-coverage files** ([conduit#262](https://github.com/GaryOcean428/conduit/pull/262), tracker [bsuite#1009](https://github.com/GaryOcean428/bsuite/issues/1009)) — claude-loop TESTS rotation. `src/lib/auth/return-path.ts` (27 LOC → 26 tests covering OWASP A01 open-redirect: protocol-relative `//`, backslash `/\`, `http://`, `https://`, `javascript:`, `data:`, embedded `://`, null/undefined/empty + `buildLocalLoginPath` encoding); `src/lib/auth/bs-oauth-cookie.ts` (29 LOC → 16 tests on cookie hygiene Path/Max-Age=3300/SameSite=Lax/Secure-on-https-only, encoded token, empty-token no-op, SSR safety, end-to-end document.cookie round-trip); `src/lib/permissionUtils.ts` (105 LOC → 34 tests on 6-role × 38-permission RBAC matrix — admin-all-perms, recruiter scope, hiring_manager limited-manage, employer read-only-no-AI, candidate self-service, viewer no-export, plus `checkAny/All/single` contracts). Post-PR conduit test suite: **36 files / 661 tests** (was 33 / 585).

**DOCS — operator baseline grant-audit inventory (2026-05-15)**

- ✅ **`supabase/migrations/baseline/RECONCILIATION-INVENTORY.md` added** ([bsuite#1011](https://github.com/GaryOcean428/bsuite/pull/1011), operator-authored, closes [bsuite#964](https://github.com/GaryOcean428/bsuite/issues/964) item 3) — production grant-audit of `tuybltdrdefjblnplpqo` performed 2026-05-13T12:30Z. Verdict: COMPLIANT for Oct 30 2026 Supabase Data API explicit-grant enforcement. All client-facing tables have explicit grants (legacy default-auto-grant behaviour); 2 service-role-only tables (`mapd_webhook_queue`, `mapd_webhook_subscriptions`) intentionally restricted. README workflow status updated: Issue 1 (PAT for private submodule clone) FIXED via [#989](https://github.com/GaryOcean428/bsuite/pull/989); Issue 2 (`.nontx.sql` CONCURRENTLY migrations) FIXED via [#1008](https://github.com/GaryOcean428/bsuite/pull/1008). Submodule history divergence still tracked at [bsuite#961](https://github.com/GaryOcean428/bsuite/issues/961) (operator action).

**DOCS — AGENTS.md §11 Multi-File Refactor Tooling Patterns (2026-05-15)**

- ✅ **Frozen Fact `FF-TOOLING-PATTERNS-20260515` adopted** ([bsuite#1012](https://github.com/GaryOcean428/bsuite/issues/1012)) — claude-loop DOCS rotation. Banks two patterns proven across 7 rotations: **Pattern A** GitHub Contents API multi-file source-only refactor (no local clone — use for single-file-scope attribute adds, import swaps, eslint-disable annotations; precedents bsuite#981 / #983 / #990 / #1003 / #1010) and **Pattern B** local-clone-in-`/tmp` + pnpm install + verify-then-push (use for type-system changes, dep bumps, ESLint cross-file context, test additions; precedents bsuite#993 / #1006 / #1009). Decision table + anti-patterns + cross-references to §1 / §9 / §10 + the pnpm Lockfile Generation rule. Closes 4-rotation §9.3 carry-forward from bsuite#993 / #1002 / #1006 / #1009.

---

## Recently Completed (as of 2026-05-13 — ship-cycle-2 + claude-loop PERF + cross-app stability)

> Captures work landed 2026-05-12 (post-v5.09W bump at 06:59Z) → 2026-05-13. For the 2026-05-11/12 rotation cycle see the section below; for the prior 2026-05-09/10 cycle see the 2026-05-10 section.

**PERF — dashboard render-blocking CSS removed (2026-05-12)**

- ✅ **Async-load Fontshare CSS to unblock first paint** ([bsuite#856](https://github.com/GaryOcean428/bsuite/pull/856), 2026-05-12) — claude-loop PERF rotation ([bsuite#853](https://github.com/GaryOcean428/bsuite/issues/853)) converted the render-blocking Fontshare `<link rel="stylesheet">` in `docs/dashboard/index.html` to the canonical async-CSS preload pattern with `<noscript>` fallback; added `crossorigin` to the `<link rel="preconnect">` so the connection is reused for CORS-required WOFF2 fetches. Net +3 / −2 LOC, one file. Surface: the live BSuite Plan Dashboard at https://garyocean428.github.io/bsuite/dashboard/ — loaded by every cron + every operator proactive sweep. `inline-data.sh` re-inlining contract preserved (verified by §9.1 output-equivalence: regex scope is the data-script block, cannot reach the head).

**STABILITY — Zustand v5 peer-dep hotfix sweep (2026-05-13)**

- ✅ **r80.crm7.app production white-page resolved** ([R80#240](https://github.com/GaryOcean428/R80.3/pull/240) merged to main; preventive bumps [crm7#748](https://github.com/GaryOcean428/crm7/pull/748) + [conduit#247](https://github.com/GaryOcean428/conduit/pull/247)) — root cause: Zustand v5 made `use-sync-external-store` a peer dependency; `@xyflow/react@^12.10.2` transitively imports `zustand/traditional` which in turn imports `use-sync-external-store/shim/with-selector.js`. Under pnpm strict isolation the package is symlinked into `zustand/`'s per-package `node_modules` but NOT hoisted to top-level, so Rolldown's bundler walking from `@xyflow/react`'s resolution scope failed with `Could not resolve 'use-sync-external-store/shim/with-selector.js' imported by 'zustand'`. Canonical fix per Context7 Zustand v5 migration docs: install `use-sync-external-store@^1.6.0` as a DIRECT dependency in each consumer. Class of bug now closed across all 3 affected apps. **Sibling repos still on Zustand v4 are unaffected.**

**CRM7 — placements form FK-backed selectors + auto-populate + charge-calc UI shell (2026-05-13)**

- ✅ **Placements Phase 2-3 of architect blueprint** ([crm7#749](https://github.com/GaryOcean428/crm7/pull/749) — feature-flagged behind `VITE_PLACEMENT_CHARGE_CALC_V2`) — replaces Person ID / Host Employer ID free-text inputs with FK selectors; converts Supervisor to ContactSelector with employer-primary auto-populate; auto-populates Position Title from selected person's most-recent placement; derives Hourly Rate from Award Rate (with override toggle). New: `ChargeRateCard`, `AllowancesCard`, `usePlacementChargeCalc` hook. Phase 1 deferrals (operator-side): `packages/charge-calc` patch + 0.2.4 publish; Supabase migration: `placements` + 8 nullable columns. Once both ship, the V2 flag flips on.

**R80.3 — DRY one-shot ownership fix + Payday Super public-holiday awareness (2026-05-12)**

- ✅ **R80.3 reader-only on CRM7-owned `apprentices`; owns new `r80_apprentice_calc_state`** ([R80#236](https://github.com/GaryOcean428/R80.3/pull/236), closes [R80#179](https://github.com/GaryOcean428/R80.3/issues/179)) — DRY one-shot ownership audit (P2-26). R80.3 had been writing to CRM7-owned `public.apprentices` from `apprenticeStore.ts:saveApprenticeToDb / deleteApprenticeFromDb / syncToSupabase`. New migration `20260512100000_r80_apprentice_calc_state.sql` creates `public.r80_apprentice_calc_state` (R80-owned) with `cost_config / work_config / billable_options / funding_config / custom_settings / display_name` JSONB columns + `(apprentice_id, tenant_id)` unique constraint; tenant-isolated RLS via `user_tenants` membership (same pattern as `charge_rate_schedules`, `host_charge_rates`); backfill extracts existing calc-state from prior dual-write rows. R80.3 store now READS `apprentices` and WRITES `r80_apprentice_calc_state`.
- ✅ **Payday Super public-holiday awareness (P1.J slice 1/3)** ([R80#230](https://github.com/GaryOcean428/R80.3/pull/230), closes [R80#173](https://github.com/GaryOcean428/R80.3/issues/173)) — Payday Super (1 July 2026 effective date) requires super contributions to reach the fund within 7 BUSINESS days of payday. The legacy helper in `paydaySuperService.ts` only skipped weekends; a public holiday inside the window silently expired the deadline early and created Superannuation Guarantee Charge (SGC) exposure. New: `src/services/publicHolidays.ts` with `isPublicHoliday / isBusinessDay / addBusinessDays / countPublicHolidaysInRange / getHolidays`. Hard-coded NATIONAL + per-state calendar for 2026 + 2027 (covers the regulatory ship window; data verified against Fair Work Ombudsman + state government pages). Spec-hardcoded per the issue's atomic-funding-derivation constraint (WS-E.4 will atomically swap the source later; consumer interface is stable).

**BRADEN — axe-core + Lighthouse CI gates + React hooks zero-warnings (2026-05-12)**

- ✅ **axe-core + Lighthouse CI gates** ([braden#267](https://github.com/GaryOcean428/braden/pull/267) → promotion [#268](https://github.com/GaryOcean428/braden/pull/268), closes [braden#204](https://github.com/GaryOcean428/braden/issues/204)) — closes the BL-006f UI/UX best-practices tracker. New: `@axe-core/playwright@^4` dev dep; `tests/e2e/a11y.spec.ts` audits 6 public routes against WCAG 2.2 A/AA tags (`wcag2a / wcag2aa / wcag21a / wcag21aa / wcag22aa`), test fails on any `critical` or `serious` impact violation; `.github/workflows/lighthouse-ci.yml` runs `@lhci/cli` on every PR + push to development/main with thresholds (a11y >= 0.85 error blocks merge; perf / best-practices / SEO >= 0.70 warn). Lighthouse audits the prerendered output (`dist/<route>/index.html`) to match what visitors actually see — corrected from initial PR that audited unprerendered SPA routes. Two manual items (NVDA/JAWS keyboard, manual perf waterfall) flagged as out-of-band quarterly tasks.
- ✅ **React hooks remediation — 0 lint warnings** ([braden#261](https://github.com/GaryOcean428/braden/pull/261), closes [braden#198](https://github.com/GaryOcean428/braden/issues/198)) — two `react-hooks` warnings cleared: (1) `useAdminAuth.ts:102:6` missing dep `shouldAutoRedirect` → added to dep array; (2) `AdminAuth.tsx:64:5` set-state-in-effect cascading-render → moved URL → message computation into a lazy `useState` initializer so the value is computed once during the first render; the useEffect now only handles the URL-cleanup side-effect via `navigate(..., { replace: true })`.

**CONDUIT — cross-app schema migration doctrine (BL-011c) (2026-05-12)**

- ✅ **BSU CRM-domain migration doctrine** ([conduit#178](https://github.com/GaryOcean428/conduit/issues/178) closed via [#243](https://github.com/GaryOcean428/conduit/pull/243)) — process doctrine, not code. Wave 2 directive bans deferral; the deliverable is a doctrine document binding every future BSU CRM-domain schema change to atomic, same-PR, no-dual-path consumer updates across CRM7, conduit, R80.3, braden, and throughput. Highlights: one-PR-per-schema-change rule (no dual paths); banned `@deprecated` markers + runtime `??` fallbacks between old/new shapes; Expand → Migrate → Contract only when atomic is genuinely impossible (each phase a separate PR that compiles + passes tests at HEAD on its own); read-only consumer rule (CRM7 owns CRM-domain entities; conduit/R80.3/braden/throughput READ via PostgREST and WRITE only to app-owned tables); consumer-discovery is a §17 cross-red-team gate (mandatory grep dump in PR body); type-generation deliverable (regenerated Supabase types in every consumer repo in the same PR).

**INFRA — 9-signal drift-scan CI rollout + rule-file alignment (bsuite#902) (2026-05-12 → 2026-05-13)**

- ✅ **9-signal drift-scan CI workflows rolled out to 5 D2C apps** ([crm7#747](https://github.com/GaryOcean428/crm7/pull/747), [R80#241](https://github.com/GaryOcean428/R80.3/pull/241), [conduit#246](https://github.com/GaryOcean428/conduit/pull/246), [braden#270](https://github.com/GaryOcean428/braden/pull/270), [throughput#159](https://github.com/GaryOcean428/throughput/pull/159)) — canonical scanner `scripts/drift-scan.mjs` (10 named regexes, all <=80 chars, ReDoS-safe via `--regex-audit`; framework auto-detection via `package.json`; 36 self-test fixtures including 6 self-scan regression tests after the scanner-self-scan paradox fix; `actions/setup-node@v4` pinned because `@v5` auto-enables `package-manager-cache` when `packageManager` field exists in `package.json` and the drift-scan workflow has zero pnpm/npm deps).
- ✅ **`.windsurfrules` + `AGENTS.md` aligned to AUTH_CANONICAL + canonical AI Gateway model** ([R80#239](https://github.com/GaryOcean428/R80.3/pull/239), [conduit#245](https://github.com/GaryOcean428/conduit/pull/245), [braden#269](https://github.com/GaryOcean428/braden/pull/269)) — cycle-1 rule-file drift. Aligns rule files with `AUTH_CANONICAL.md` (cookie SSO is gone; OAuth 2.1 PKCE + JWKS only) and the canonical AI Gateway model (`xai/grok-4.20-reasoning`).

**SHIP-CYCLE — 2026-05-13 cycle-2 main → development sync (informational)**

- ✅ **Sync PRs across parent + 5 submodules** ([bsuite#905](https://github.com/GaryOcean428/bsuite/pull/905), [crm7#750](https://github.com/GaryOcean428/crm7/pull/750), [R80#242](https://github.com/GaryOcean428/R80.3/pull/242), [conduit#248](https://github.com/GaryOcean428/conduit/pull/248), [braden#271](https://github.com/GaryOcean428/braden/pull/271), [throughput#160](https://github.com/GaryOcean428/throughput/pull/160)) — operator-authored ship-cycle-2 prep; absorbs the latest hotfix landings (zustand peer-dep fix, drift-scan CI rollout) into `development` before the next dev → main promotion cycle. No production impact. All 5 Vercel-served apps READY at the time of this audit; business-suite production verified via inspector trail (last main promotion `dpl_B9GN8tvSjPA32pU5YcPhca6Womie`).

---
---

## Recently Completed (as of 2026-05-12 — claude-loop rotation cycle + page-builder resize fix + OAuth hardening + O.11 theming)

> Captures work landed 2026-05-11 → 2026-05-12 not yet in the 2026-05-10 section below. For the prior 2026-05-09/10 cycle see that section; for the larger 2026-04-15 → 2026-05-08 batch see the 2026-05-08 section.

**PAGE-BUILDER — react-grid-layout v2 resize-handle restored (2026-05-12)**

- ✅ **Render `react-resizable`'s `cloneElement`-injected children** ([bsuite#839](https://github.com/GaryOcean428/bsuite/pull/839), 2026-05-12) — corrective second-pass after [#836](https://github.com/GaryOcean428/bsuite/pull/836). v2 of `react-grid-layout` clones each child with an injected `<resizableHandle>` slot; the prior fix forgot to render `props.children` after `cloneElement`, so the SE handle was present in the DOM tree but invisible. The two-PR sequence (#836 → #839) is recorded as a §9.3 self-report case: the original PR did not pass the §9.2 visual-equivalence loop (handle was not opened in a real browser), and the divergence was caught only after a downstream user reported it.

**AUTH — OAuth `client_id` trim defence-in-depth (2026-05-11)**

- ✅ **`client_id` whitespace trim on the BS OAuth Server** ([bsuite#829](https://github.com/GaryOcean428/bsuite/pull/829) — 6 submodule pointers bumped) — every consumer's `business-suite-oauth.ts` and the BSU `/oauth/authorize` handler now `.trim()` the registered `client_id` before lookup. Defends against the operator-paste / env-var-trailing-whitespace failure mode that produced 400 `unknown_client` on the BSU→Throughput handoff (logged 2026-05-10). Companion to the existing `oauth-callback-must-bridge` lint rule.
- ✅ **PKCE localStorage hotfix + crm7 migration** ([bsuite#832](https://github.com/GaryOcean428/bsuite/pull/832) — 5 submodule pointers bumped, 2026-05-12) — verifies all 5 consumer Supabase clients use `flowType: 'pkce'` + per-domain `localStorage` storage key. Closes a residual `cookieStorage` reference in a deprecated crm7 helper.

**O.11 — Centralised theming + agent doctrine refresh + Tailwind v4 check (2026-05-11)**

- ✅ **Part O.11 plan + execution kickoff** ([bsuite#825](https://github.com/GaryOcean428/bsuite/pull/825)) — `docs/plans/20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` is now the planning authority for the centralised-theming POC, the feature-placement audit addendum, and the docs-coherence pass. Establishes `@bsuite/theme@0.3.3+` (`packages/theme/`) as the canonical OKLCH role-token source for the 5 D2C apps + `@bsuite/theme/braden-css` for braden. Mandates the five-tier anti-glare text scale capped at `oklch(0.94 ... )` on dark surfaces; bans raw `text-white`, `text-black`, hex/RGB/HSL in consumer UI; reaffirms purple Electric Purple `oklch(0.568 0.202 283.1)` as the only semantic error/destructive role (not tenant-overridable). CLAUDE.md "Theme System" section refreshed in the same PR.

**ROTATION — claude-loop overnight cycle (2026-05-11 / 2026-05-12)**

| Issue | Task | Repo | Outcome |
|---|---|---|---|
| [bsuite#830](https://github.com/GaryOcean428/bsuite/issues/830) | TYPES | bsuite | `data-export/xlsx/index.ts` `any` tightening — [bsuite#831](https://github.com/GaryOcean428/bsuite/pull/831) merged direct |
| [bsuite#833](https://github.com/GaryOcean428/bsuite/issues/833) | A11Y | BSU | WCAG 2.4.1 skip-to-main-content link in `MainApp` shell — handoff [bsuite#834](https://github.com/GaryOcean428/bsuite/issues/834) (BSU#403, awaiting ship-all-apps merge) |
| [bsuite#838](https://github.com/GaryOcean428/bsuite/issues/838) | DB | — | Supabase advisor sweep on `tuybltdrdefjblnplpqo` — closed clean |
| [bsuite#841](https://github.com/GaryOcean428/bsuite/issues/841) | EDGE | — | Edge-fn security review (CORS / OPTIONS / WIF) — closed clean |
| [bsuite#844](https://github.com/GaryOcean428/bsuite/issues/844) | TESTS | BSU | `AppLauncherTile` vitest render contract (12 cases, `describe.each` × 5 tints) — handoff [bsuite#845](https://github.com/GaryOcean428/bsuite/issues/845) (BSU#418, awaiting ship-all-apps merge) |
| (this update) | DOCS | bsuite | Master roadmap v5.09W — capture 2026-05-11/12 cycle |

**Dashboard cron sweep — 2026-05-12 (informational)**

- ✅ **Dashboard data refresh** ([bsuite#843](https://github.com/GaryOcean428/bsuite/pull/843) → promotion [#846](https://github.com/GaryOcean428/bsuite/pull/846)) — `bsuite.active_plans` 8 → 13 (5 new plans surfaced under `docs/plans/`); `bsuite.archived` corrected 6 → 0 (`docs/plans/archive/` is empty of `.md` files); `meta.last_refresh` set to 2026-05-12; all 6 submodule SHAs refreshed to current registered pointers; `index.html` re-inlined via `inline-data.sh`.

---

## Recently Completed (as of 2026-05-10 — claude-loop rotation cycle + auth bridge + placement docs)

> Captures work landed 2026-05-09 → 2026-05-10 not yet in the 2026-05-08 section below. For the larger 2026-04-15 → 2026-05-08 batch, see that section.

**AUTH — BS OAuth `setSession` bridge + 60s sync (canonical 2026-05-07)**

- ✅ **`bsuite/oauth-callback-must-bridge` lint rule** (`@bsuite/dry-lint` v0.4.0) — enforces `supabase.auth.setSession({access_token, refresh_token})` in every consumer app's `/auth/callback` so BS OAuth Server tokens (`/auth/v1/oauth/token`) become live Supabase sessions. Without the bridge, the per-domain supabase client falls back to anon and RLS-protected reads 401/406 immediately after BSU→app handoff (BSU→CRM7 logged-out incident, 2026-05-06).
- ✅ **60s `setSession` sync interval in `AuthContext`** — re-seeds the Supabase session whenever `bs_access_token` rotates. Shipped in CRM7 + R80.3 + throughput + braden as of 2026-05-07. `@bsuite/auth` pinned exact in each consumer `package.json` (canonical: `@bsuite/auth: 0.2.3`, `@bsuite/page-builder: ^0.2.6`).
- ✅ **`oauth-contract.test.ts`** present in all 5 client apps (CRM7, R80.3, throughput, conduit, braden) — CI-enforced bridge contract. Verified by `(crm7|R80.3|throughput|conduit|braden)/src/__tests__/oauth-contract.test.ts`.

**PARITY SPECS — codehouse-parity sub-plans README (2026-05-10)**

- ✅ **[`docs/plans/20260506-codehouse-parity/README.md`](./plans/20260506-codehouse-parity/README.md)** — index for the 9 portal sub-plans + visual feature builder spec. Universal Rulebook §10.5 ("Every `docs/` folder has a README.md index") violation resolved for this directory (10 files, no index).

**APPRENTICE PLACEMENTS — AVETMISS NAT00120 mapping + state machine + form schema (2026-05-06)**

- ✅ **AVETMISS NAT00120 mapping** ([`docs/20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md`](./20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md)) — BSuite apprentice/placement entity → AVETMISS NAT00120 field mapping for STA reporting compliance.
- ✅ **State machine canon** ([`docs/20260506-apprentice-placement-state-machine-canon-v1.00W.md`](./20260506-apprentice-placement-state-machine-canon-v1.00W.md)) — canonical state transitions for apprentice placement lifecycle.
- ✅ **Form schema spec** ([`docs/20260506-apprentice-placement-form-schema-spec-v1.00W.md`](./20260506-apprentice-placement-form-schema-spec-v1.00W.md)) — Zod schema + RHF form definitions.

**CONDUIT — schema gap reconciliation (2026-05-06)**

- ✅ **Conduit canonical map reconciliation** ([`docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md`](./20260506-conduit-canonical-map-reconciliation-v1.00W.md)).
- ✅ **Conduit schema gap decision** ([`docs/20260506-conduit-schema-gap-decision-v1.00W.md`](./20260506-conduit-schema-gap-decision-v1.00W.md)).

**ROTATION — claude-loop overnight rotation cycle (2026-05-09 / 2026-05-10)**

| Issue | Task | Repo | Outcome |
|---|---|---|---|
| [bsuite#770](https://github.com/GaryOcean428/bsuite/issues/770) | DB | BSU | search_path lock on 3 functions + advisor sweep — handoff [bsuite#771](https://github.com/GaryOcean428/bsuite/issues/771) (BSU#391) |
| [bsuite#774](https://github.com/GaryOcean428/bsuite/issues/774) | EDGE | crm7 | `_shared/rate-limiter.ts` vitest contract — handoff [bsuite#775](https://github.com/GaryOcean428/bsuite/issues/775) (crm7#578) |
| [bsuite#778](https://github.com/GaryOcean428/bsuite/issues/778) | TESTS | crm7 | `_shared/oauth-state.ts` vitest contract — handoff [bsuite#779](https://github.com/GaryOcean428/bsuite/issues/779) (crm7#579) |
| [bsuite#781](https://github.com/GaryOcean428/bsuite/issues/781) | DOCS | crm7 | `_shared/__tests__/README.md` vitest convention — handoff [bsuite#782](https://github.com/GaryOcean428/bsuite/issues/782) (crm7#580) |
| [bsuite#784](https://github.com/GaryOcean428/bsuite/issues/784) | PERF | crm7 | preconnect Supabase API origin — handoff [bsuite#787](https://github.com/GaryOcean428/bsuite/issues/787) (crm7#581) |
| [bsuite#789](https://github.com/GaryOcean428/bsuite/issues/789) | ROADMAP | bsuite | this update — `docs/plans/20260506-codehouse-parity/README.md` + master roadmap v5.08W |

---

## Recently Completed (as of 2026-05-08 — overnight ship-all-apps + claude-loop cycles)

> ~30 days of two-agent (claude-loop + perplexity-computer + ship-all-apps merge cycle) work since the 2026-04-14 batch. This section captures verifiable doctrine, governance, dashboard, uplift-wave, and parity-spec landmarks. Per-rotation feature/fix work is tracked in the [closed claude-loop rotation issues](https://github.com/GaryOcean428/bsuite/issues?q=is%3Aissue+label%3Aclaude-loop+is%3Aclosed) (issues #555–#718, ~50 cycles); the doctrine, dashboard, and uplift-wave sections below are the structural changes.

**Doctrine & governance — Red-Team-UX Doctrine v1.00A**

- ✅ **Red-Team-UX Doctrine v1.00A** ([bsuite PR #643](https://github.com/GaryOcean428/bsuite/pull/643), 2026-05-07) — canonical `docs/20260507-red-team-ux-doctrine-v1.00A.md`. Authoritative for ALL PRs across the 7-repo workspace: §1 research mandate (primary-source citations only, no blogs), §2 6-role red-team table (UX-DX, Security, Performance, Reliability, Quality, Research-Critic), §3 16-item UX-DX checklist, §4 cron integration, §5 enforcement (3 hard rules, no exceptions), §6 reference patterns. PRs missing §2.2/§3.2/§1.2 blocks are auto-labelled `needs-redteam` by ship-all-apps and skipped from merge until blocks are added.
- ✅ **BSuite Uplift Design Language v1.00A** (`docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md`) — 12 primitives spec (StepperShell, ScopeSelect, TrackChanges, Picker family, CommandPalette, SortableList, PermissionMatrix, LivePreview, FilterBar, DataTable, EmptyState, TechnicalDetails), vocabulary contract (banned developer jargon — `tenant_id`, `RLS`, `FK`, "chips", `MCP`, `migration`, `JWT`, `schema` — only inside `<TechnicalDetails>` primitive), 9-wave rollout map W0–W8, per-surface mappings, AUTH_CANONICAL.md cross-link.
- ✅ **FF-SELF-VALIDATION-20260507** ([bsuite PR #612](https://github.com/GaryOcean428/bsuite/pull/612), 2026-05-07) — adopted across AGENTS.md / CLAUDE.md / copilot-instructions. Mandates §9.1 output-equivalence loop (refactors), §9.2 visual-equivalence loop (UI), §9.3 self-report uncertainty. Sourced from Kjosbakken, *How to Make Claude Code Validate its own Work*, 2026-05-05. Every PR description must include an `## Evidence` block; every issue/plan must declare validation loop, equivalence target, cross red-team verifier, skills to load.
- ✅ **FF-DASHBOARD-20260508** (CLAUDE.md §10, 2026-05-08) — Roadmap Dashboard Update Protocol. Live dashboard at <https://garyocean428.github.io/bsuite/dashboard/>; source of truth `docs/dashboard/data/dashboard-data.json` + every `docs/plans/**/*.md` across parent + 6 submodules. Refresh script `python3 docs/dashboard/refresh-data.py`; inline script `bash docs/dashboard/inline-data.sh`. Mandates same-PR dashboard updates (no deferral), evidence_url required for every status change, schema versioning per top-level section.
- ✅ **ship-all-apps automation** ([bsuite PR #630](https://github.com/GaryOcean428/bsuite/pull/630)) — `scripts/ship-all-apps.sh` + `workflow_dispatch` GitHub Actions trigger. Reads all open PRs across 7 repos, doctrine-gates per §5.1, merges with `--admin` when CI green and doctrine-compliant, verifies Vercel deployments, recovers failed builds via empty-commit redeploy, runs OAuth/RLS/architecture/Supabase-advisor compliance sweeps, promotes development → default branch (serialized: braden → R80.3 → BSU → throughput → conduit → crm7 → bsuite). Cron 6-hourly.

**Uplift Wave program — bsuite#635**

- ✅ **W0 — 12 primitives library** (claude-code-local owner; [BSU#364](https://github.com/GaryOcean428/business-suite-unified/pull/364), sha `9c4e101`) — `src/components/uplift/` ships the canonical primitive set. First consumer: W4 Pass 1 PermissionsEditor.
- ✅ **W1 — Feature Builder full redesign** (perplexity-computer owner; [BSU#361](https://github.com/GaryOcean428/business-suite-unified/pull/361), merged 2026-05-07T09:48Z).
- 🔄 **W4 Pass 1 — Permissions Editor** (claude-code-local owner; [BSU#376](https://github.com/GaryOcean428/business-suite-unified/pull/376), `role_capabilities` table applied via Supabase MCP, 47 caps × 9 domains, 4 role presets, awaiting ship-all-apps merge per [bsuite#684](https://github.com/GaryOcean428/bsuite/issues/684)).
- 🔄 **W3 — Pay Item Groups + 3 sibling settings** (perplexity-computer owner) — in progress.
- ✅ Replaces the closed-unmerged BSU#346 with the doctrine-compliant W4 design — scoping doc shipped via [bsuite PR #681](https://github.com/GaryOcean428/bsuite/pull/681).

**Roadmap dashboard — live operator-facing surface**

- ✅ **Live dashboard launched** at <https://garyocean428.github.io/bsuite/dashboard/> — surfaces `summary`, `repos` (7-repo status), `plans[]` (auto-generated from every `docs/plans/**/*.md`), `operator_blockers`, `production_state`, `gap_report.categories`, `parity_status`, `feature_360_status`, `visual_feature_builder`, `portal_coverage`, `apprentice_placements_status`, `doc_drift_status`.
- ✅ **GTO Compliance Catalogue** (commit `b0daa92`) — 50-report coverage matrix, 8 active gaps tracked as crm7#527–#534.
- ✅ **Operator-blockers cleared 7 → 0** ([bsuite PR #703](https://github.com/GaryOcean428/bsuite/pull/703), [#706](https://github.com/GaryOcean428/bsuite/pull/706), [#708](https://github.com/GaryOcean428/bsuite/pull/708), [#711](https://github.com/GaryOcean428/bsuite/pull/711)) — Xero OAuth verified end-to-end on Braden Group tenant; baseline branch protection applied; stale blockers (1, 2, 3, 5) resolved.

**Codehouse parity specs — research portion of Codehouse parity matrix closure**

- ✅ **Pay Item Groups** (PARITY-569 / [#569](https://github.com/GaryOcean428/bsuite/issues/569)) — 11 Codehouse gaps, domain C
- ✅ **Timesheet approval** ([#568](https://github.com/GaryOcean428/bsuite/issues/568)) — 4 gaps
- ✅ **Comms** ([#571](https://github.com/GaryOcean428/bsuite/issues/571)) — 3 gaps
- ✅ **Admin** ([#578](https://github.com/GaryOcean428/bsuite/issues/578)) — 14 gaps
- ✅ **Integrations** ([#577](https://github.com/GaryOcean428/bsuite/issues/577)) — crm7 + conduit
- ✅ **File-export adapters** ([#576](https://github.com/GaryOcean428/bsuite/issues/576)) — 3 gaps
- ✅ **Reports / Pay periods / Leave / Timesheet entry / Apprentice placement** specs (2026-05-06) — full set in `docs/20260506-*-parity-spec-v1.00W.md`

**Autonoma E2E testing — REMOVED 2026-05-13 after evaluation**

- ❌ **Vercel integration uninstalled across all 6 apps (2026-05-13).** Reason: deployment-checks fire on every PR but require pre-authored tests in the Autonoma dashboard to pass; without tests the check defaults to FAILURE and pollutes the PR queue. Plugin install for local test authoring was also blocked by an upstream Prisma server-side bug (`Null constraint violation on prisma.apiKey.create`).
- ❌ **Per-app env vars auto-removed** by Vercel integration uninstall.
- ❌ **`AUTONOMA_*` removed from `.env.local`** (parent monorepo root).
- 📌 **Defensive `.gitleaks.toml` rule kept** — `autonoma-client-secret` detection guard remains in place to catch any accidental future re-introduction.
- 📌 **Historical context preserved** in `docs/20260507-cron-log-claude-scheduled-v1.00W.md` (frozen log) and `bsuite#619` (PR that originally added the integration).
- See parent `CLAUDE.md` § "E2E Testing — status: NO active integration" for rationale + re-evaluation gates.

**Defensive rotation work shipped (selection — full list in closed claude-loop tracker issues)**

- ✅ **A11Y — CommandDialog parity with crm7** ([BSU#378](https://github.com/GaryOcean428/business-suite-unified/pull/378)) — DialogTitle/DialogDescription wrapped in VisuallyHidden, aria-hidden on decorative Search icon. WCAG 2.1 SC 4.1.2 / Radix v1.1.15 mandatory-title compliance.
- ✅ **DB — `tenant_branding_insert` RLS to `authenticated`** ([BSU#380](https://github.com/GaryOcean428/business-suite-unified/pull/380)) — closes the one row missed by the bulk `20260413062306_fix_rls_public_to_authenticated_tenant_policies` migration. Migration applied via Supabase MCP on `tuybltdrdefjblnplpqo`; verified `pg_policies.tenant_branding_insert.roles = {authenticated}`.
- ✅ **EDGE — `assign-tester-license` duplicate `checkRateLimit`** ([BSU#385](https://github.com/GaryOcean428/business-suite-unified/pull/385)) — restored documented 30 req/min/IP cap (was effectively 15 due to duplicate calls). Tracking [bsuite#704](https://github.com/GaryOcean428/bsuite/issues/704).
- ✅ **TESTS — Deno test infra + `_shared/rate-limiter.ts` regression suite** ([BSU#388](https://github.com/GaryOcean428/business-suite-unified/pull/388)) — first BSU edge-fn Deno test infrastructure. 11 vitest cases pin documented contract (30 req/min/IP, 60s window, IP-extraction priority). New `.github/workflows/edge-fn-tests.yml` runs `deno test` on `supabase/functions/**` PR touches.
- ✅ **TESTS — `saveRoleCapabilities` + `loadTenantRoles` unit coverage** ([BSU#387](https://github.com/GaryOcean428/business-suite-unified/pull/387)) — 18 vitest specs across 2 new test files. Closes the W4 Pass 1 persistence-layer coverage gap.
- ✅ **W6 — `useBranding` stale-CSS-var cleanup** ([BSU#375](https://github.com/GaryOcean428/business-suite-unified/pull/375)) — `applyBrandingVars` pairs every `setProperty` with `removeProperty` in the no-value branch; wipes `tenant-branding-custom-css` `<style>` between tenant switches. Tracking [bsuite#680](https://github.com/GaryOcean428/bsuite/issues/680).

**Cron / log discipline**

- ✅ 19 fire-cycle cron logs appended on 2026-05-07/08 (entries `*-fire log` PRs #657–#724) — every ship-all-apps and claude-loop run since 2026-05-07T10:22Z appended to `docs/20260507-cron-log-claude-scheduled-v1.00W.md` per §4 doctrine cron integration.
- ✅ **`ship-all-apps` § 20 obvious-fix auto-merge** — adopted as the post-CI-green merge path for single-file, sub-doctrine-threshold work; cron logs tagged `[§20 auto-merge]`.

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

> **2026-05-08 audit refresh** (claude-loop ROADMAP rotation, bsuite#731). Each item below was re-verified against canonical state at this run's STEP 3 audit; status flags now reflect 2026-05-08 reality. See [`docs/20260508-roadmap-pending-audit-v1.00W.md`](./20260508-roadmap-pending-audit-v1.00W.md) for the full evidence trail (8 items × source SHAs).

- ⚠️ Item 9: Test coverage — fairwork + auth tests complete; W4 admin lib/admin coverage gap closed via [BSU#387](https://github.com/GaryOcean428/business-suite-unified/pull/387) (18 vitest specs, awaiting ship-all-apps merge per bsuite#720). Open: 16 pre-existing AI-component failures in CRM7; PermissionsEditor.tsx page-level integration test (~6 specs, deferred to next TESTS rotation per bsuite#717 follow-up note).
- ✅ ~~Dashboard polish: hero signals, bento grid, ai_sessions/ai_messages tables, DND accessibility (KeyboardSensor)~~ — complete; KeyboardSensor / sortableKeyboardCoordinates / aria-label sweep struck 2026-05-01 under P0-15 rollup (item 26a + AUD-16); ai_sessions/ai_messages tables already exist in Supabase (P0 item 2 struck); hero signals + bento grid live via D2C Neon Electric rollout (WS-D 9 PRs, see Recently Completed 2026-04-14).
- ✅ ~~Stripe end-to-end verification~~ — complete (2026-03-19)
- ⚠️ SP-3: CRM7 Tier 3-4 page wiring — partial: training-plan progress report ([CRM7#575](https://github.com/GaryOcean428/crm7/pull/575)), host-employer monthly pack ([CRM7#571](https://github.com/GaryOcean428/crm7/pull/571)), Fair Work inspector report ([CRM7#574](https://github.com/GaryOcean428/crm7/pull/574)), STP Phase-2 export ([CRM7#573](https://github.com/GaryOcean428/crm7/pull/573)), apprentice-progress reports ([CRM7#570](https://github.com/GaryOcean428/crm7/pull/570)), portable-LSL multi-state exports ([CRM7#569](https://github.com/GaryOcean428/crm7/pull/569)) — all on `crm7@development` post 2026-05-08T08 promote. Reports tier substantially closed; financial / compliance / WHS / comms tiers still in-progress per Copilot autonomy.
- ⚠️ Cross-app notifications (Supabase Realtime pub/sub) — pending; tracked as P2 #19; deferred behind the active ship-all-apps cycle work; no scoping doc written yet.
- ✅ ~~BOOT compliance engine (C8-tier, competitive differentiator — foundU + Workforce One are the only competitors with any BOOT support, and Workforce One holds 30% GTO market share specifically on BOOT automation differentiation per CLAUDE-LOOP COMPETE notes); pending; tracked as P2 #14 ("Enterprise Agreement + BOAT validation").~~ — **engine shipped end-to-end** (correction 2026-05-08, claude-loop COMPETE rotation bsuite#739; the prior "pending" classification was 30+ days stale). Engine package `@bsuite/charge-calc/boot` v0.2.4 with 8 modules covering single-class + GTO multi-placement comparison, FWC Form F17 export, failure-pattern detection, undertaking recommender, non-monetary offsets (1,757 LOC source + 4,825 LOC tests). CRM7 consumer wraps the engine via [`src/lib/rates/bootGate.ts`](https://github.com/GaryOcean428/crm7/blob/development/src/lib/rates/bootGate.ts) (`validateBootCompliance()` + NES s.87/s.96/s.114/s.62 floor checks); UI surfaces `/compliance/boot` (list) + `/compliance/boot/:id` (detail) with F17 JSON export and s.193A human-review enforced via RLS role separation. Feature flag `boot_engine: true` enabled at launch for all tenants. Per [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) line 164 this is **#1 of 5 capabilities BSuite EXCEEDS Codehouse Workforce One / OTS** — the GTO competitive moat is held, not pending. Full evidence trail in [`docs/20260508-boot-engine-shipped-evidence-v1.00W.md`](./20260508-boot-engine-shipped-evidence-v1.00W.md).
- ✅ ~~@bsuite/charge-calc full convergence (3 independent calc engines → 1 shared package)~~ — convergence achieved at the dependency level: both consumers pin `@bsuite/charge-calc: ^0.2.3` per [`crm7/package.json`](https://github.com/GaryOcean428/crm7/blob/development/package.json) (sha `522b594`) and [`R80.3/package.json`](https://github.com/GaryOcean428/R80.3/blob/development/package.json) (sha `3a27510`) at 2026-05-08T08 audit. Package published to npm at `^0.2.3`. Open: legacy parallel-engine removal verification deferred to next FEATURE / EDGE rotation (out-of-scope for ROADMAP audit per single-cycle rule).
- ⚠️ Xero payroll integration (5 major TODO blocks in CRM7) — partial: OAuth fixes shipped via 2026-05-08T08 promote ([crm7@main #568](https://github.com/GaryOcean428/crm7/pull/568)); `xero-token-exchange`, `xero-invoice-submit`, `ram-token-exchange` edge fns active with dual-layer rate limiting; `xero-node ^15.0.1` consumed in `crm7/package.json`. Remaining: invoice-line-item mapping, payroll-run sync, multi-tenant Xero org switching.

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
| 3a | **9-wave UI uplift program** — W0 + W1 shipped 2026-05-07; W4 scoping landed (`bsuite#681`); BSU implementation PRs for W4/W6 are open (`BSU#376`, `BSU#375`) pending merge. Current active work: W3 (Pay Item Groups + 3 sibling settings). Active queue: W2 (Reports CRM7), W5 (Tenant Admin), W7 (Apprentice placements). W8 (consumer bumps × 4 apps) remains blocked on W7. Ownership locked: claude-loop = W2/W4/W6, perplexity-computer = W3/W5/W7/W8. Tracker: [bsuite#635](https://github.com/GaryOcean428/bsuite/issues/635). | all | 4w | claude-loop + perplexity-computer | [INDEX.md](./plans/uplift/INDEX.md) |
| 3b | **Codehouse Parity & Platform 360 — WS-A3/B/C/E1–E5/F** — WS-A1/A2/A4/D/E shipped 2026-05-06/07. Remaining: WS-A3 (per-submodule OUTSTANDING + STATUS link rows), WS-B (12 grouped GitHub issues), WS-C (dashboard schema additive extension post-#535), WS-E1–E5 (visual feature builder shipped code), WS-F (doc-drift sweep — 17 items). | all | 3w | TBD | [Plan](./plans/20260506-codehouse-parity-and-platform-360-v1.00W.md) |
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
| 14 | ~~Enterprise Agreement + BOAT validation~~ — engine + CRM7 integration shipped end-to-end (`@bsuite/charge-calc/boot` v0.2.4 + `crm7/src/lib/rates/bootGate.ts` sha `428820e` + `/compliance/boot` routes + RLS s.193A workflow). Evidence: [`20260508-boot-engine-shipped-evidence-v1.00W.md`](./20260508-boot-engine-shipped-evidence-v1.00W.md). | CRM7 | ✅ Done | Shipped 2026-03-17 (CRM7 UI doc); confirmed live 2026-05-08 (claude-loop bsuite#739) |
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
| 25 | ~~R80.3 PDF export improvements~~ — multi-page support + "Page N of M" pagination shipped via `src/services/pdfExportService.ts` `ensureSpace()` + `stampFooters()` helpers ([R80.3#257](https://github.com/GaryOcean428/R80.3/pull/257), tracker [bsuite#1020](https://github.com/GaryOcean428/bsuite/issues/1020)). | R80.3 | ✅ Done (2026-05-15) | — |
| 26 | Test coverage push (70% target all projects) | all | ongoing | — |
| 26a | ~~CC-1: DashboardPageEditorDrawer accessibility — add `KeyboardSensor` + `sortableKeyboardCoordinates` + `aria-label` on grip buttons~~ | crm7 | ✅ Done (struck under P0-15 rollup 2026-05-01; tracked in merged backlog if re-opened) | Gap report v2 CC-1 |
| 26b | ~~CRM7 DRY one-shot: auto-population chains — apprentice select fills 6 related fields, claims/new auto-fills qualification/employer/dates~~ — verified shipped in `src/pages/claims/new.tsx` (sha `98007f6`). `handleApprenticeSelect` (lines 215-237) auto-fills 5 fields from apprentice; `handleSourceSelect` (lines 256-279) auto-fills 2 from funding source; `runEligibilityCheck` side-effect adds 2 more (claim_amount + claim_type). Net 7+ fields auto-populated, exceeds target. ROADMAP audit refresh 2026-05-15 (bsuite#1020). | crm7 | ✅ Done | [UX One-Shot Deep Dive](./20260226-ux-oneshot-deep-dive-plan-v1.00W.md) Phase 4 |
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
| RT-10 | BSU react-day-picker v8 → v9 audit | ✅ Complete (2026-05-08) — `react-day-picker: ^9.14.0` confirmed in `business-suite-unified/package.json` at sha `cc598ee` (pinned alongside React 19.2.5 + date-fns 4.1.0 + Tailwind v4) |

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

- **2026-05-15 v5.12W** — claude-loop ROADMAP rotation ([bsuite#1020](https://github.com/GaryOcean428/bsuite/issues/1020)):
  - Added "Recently Completed (as of 2026-05-15 evening — claude-loop PERF + ROADMAP rotations + cross-app ship-all-apps merges since v5.11W)" section above the v5.11W block. Captures: (a) claude-loop PERF rotation ([crm7#795](https://github.com/GaryOcean428/crm7/pull/795) — 152 KB / 30% off auth-shell entry chunk via AIAssistant `React.lazy()` in MainLayout); (b) claude-loop ROADMAP rotation ([R80.3#257](https://github.com/GaryOcean428/R80.3/pull/257) — closes P2 #25, single-page overflow + "Page N of M" pagination via `ensureSpace()` + `stampFooters()` helpers); (c) ROADMAP audit re-classification of P2 #26b (auto-population chains) as ✅ Done with file-evidence; (d) cross-app ship-all-apps merges since v5.11W: crm7#797 (AnnualReviewToggle auto-seed guard removal), crm7#798 (drop 45 legacy storage.objects policies — RLS canonicalisation), crm7#799 (delete dead adobe-sign-webhook edge fn), BSU#444 (e2e.yml Node 24 explicit pin), BSU#445 (react-hooks v7 lint-warning remediation + `--max-warnings 0` enforcement), throughput#162 (delete dead `src/lib/ai.ts` direct OpenAI/Anthropic deps — Vercel AI Gateway compliance), R80.3#255 (PaydaySuperCalculator UI snapshot tests), R80.3#256 (Payday Super salary-sacrifice OTE/QE refinements P1.J slice 2/3).
  - P2 #25 (R80.3 PDF export improvements): struck `~~~~` with PR ref to R80.3#257, status ✅ Done (2026-05-15). The roadmap-implementation half of this ROADMAP rotation (per playbook "implement highest-priority unimplemented item").
  - P2 #26b (CRM7 DRY auto-population chains): struck `~~~~` with file-evidence (`src/pages/claims/new.tsx:215-237` apprentice handler + `:256-279` source handler — 7+ fields auto-fill, exceeds the original 6-field target). Item was already shipped; classification refresh.
  - **§9.3 self-report:** ROADMAP rotation completed via Pattern A (Contents API push for R80.3 single-file refactor) + Pattern B-equivalent local-edit-then-push on bsuite parent for the roadmap markdown. No `pnpm typecheck/test` needed on bsuite (markdown-only); R80.3 typecheck deferred to CI/Vercel preview (consistent with bsuite#981 precedent for single-service-file refactors with no consumer-surface changes). All cross-app merge inventory verified against Vercel deployment list at run start.
  - Last Updated line bumped.
- **2026-05-15 v5.11W** — claude-loop DOCS rotation ([bsuite#1012](https://github.com/GaryOcean428/bsuite/issues/1012)):
  - Added "Recently Completed (as of 2026-05-15)" section above the prior 2026-05-13 block. Captures: (a) claude-loop TYPES rotation ([R80.3#249](https://github.com/GaryOcean428/R80.3/pull/249) — 24 dormant `bsuite/no-text-white` warnings closed across 14 files); (b) claude-loop A11Y rotation ([braden#278](https://github.com/GaryOcean428/braden/pull/278) — 11 WCAG 1.3.1/4.1.2 gaps on www.braden.com.au homepage); (c) claude-loop DB rotation ([BSU#443](https://github.com/GaryOcean428/business-suite-unified/pull/443) — `public.ping()` SECURITY INVOKER, advisor 0029 sweep); (d) claude-loop EDGE rotation ([crm7#794](https://github.com/GaryOcean428/crm7/pull/794) — CWE-770 shared-bucket DoS-on-others variant closed in `_shared/rate-limiter.ts`); (e) claude-loop TESTS rotation ([conduit#262](https://github.com/GaryOcean428/conduit/pull/262) — 76 new vitest cases on return-path / bs-oauth-cookie / permissionUtils, suite 585 → 661); (f) operator baseline grant-audit inventory ([bsuite#1011](https://github.com/GaryOcean428/bsuite/pull/1011) — closes bsuite#964 item 3, Oct 30 2026 enforcement readiness verdict); (g) AGENTS.md §11 Multi-File Refactor Tooling Patterns (`FF-TOOLING-PATTERNS-20260515` — banks Pattern A Contents-API + Pattern B `/tmp` pnpm-verify; closes 4-rotation §9.3 carry-forward).
  - AGENTS.md: appended §11 with primary-source citations to pnpm CLI docs + GitHub REST API Contents reference + GitHub MCP server.
  - **§9.3 self-report:** DOCS rotation used Pattern A (no `/tmp` clone needed — bsuite parent edits are markdown-only, no `pnpm typecheck/lint/test` surface). Verification surface: Vercel + CI gitleaks + drift-scan + DOM Layout Invariants must pass post-PR — explicitly named in the PR's §Evidence block.
  - Last Updated line bumped.
- **2026-05-13 v5.10W** — claude-loop ROADMAP rotation ([bsuite#906](https://github.com/GaryOcean428/bsuite/issues/906)):
  - Added "Recently Completed (as of 2026-05-13)" section above the prior 2026-05-12 block. Captures: (a) claude-loop PERF rotation ([bsuite#853](https://github.com/GaryOcean428/bsuite/issues/853) → [#856](https://github.com/GaryOcean428/bsuite/pull/856)) — Fontshare async-CSS preload pattern landed AFTER the v5.09W bump and was not in the 2026-05-12 section; (b) Zustand v5 `use-sync-external-store` peer-dep hotfix sweep across R80.3 + crm7 + conduit; (c) CRM7 placements Phase 2-3 FK selectors + charge-calc UI shell (feature-flagged); (d) R80.3 DRY one-shot ownership fix (R80 reader-only on `apprentices`; owns new `r80_apprentice_calc_state`); (e) R80.3 Payday Super public-holiday awareness (P1.J slice 1/3, regulatory effective 1 July 2026); (f) Braden axe-core + Lighthouse CI gates + React hooks zero-warnings; (g) Conduit BSU CRM-domain migration doctrine (BL-011c); (h) 9-signal drift-scan CI rolled out to all 5 D2C apps; (i) rule-file alignment to AUTH_CANONICAL + canonical AI model across R80/conduit/braden; (j) ship-cycle-2 sync PRs (informational).
  - **§9.3 self-report:** ROADMAP rotation completed via GitHub MCP tools only (no local shell/clone in this run — full-flow via `mcp__github__*` + `mcp__Vercel__*` + `mcp__Supabase__*`). Roadmap correctness preserved; implementation of the highest-priority unimplemented roadmap item (per ROADMAP playbook) deferred to a focused next rotation with build tooling available. This is named as a follow-up rather than skipped silently per zero-defer policy.
  - Last Updated line bumped.
- **2026-05-12 v5.09W** — claude-loop DOCS rotation:
  - Added "Recently Completed (as of 2026-05-12)" section covering 2026-05-11/12 rotation cycle (TYPES → A11Y → DB → EDGE → TESTS → DOCS) and the structural items not captured by rotation tracker issues: page-builder resize-handle dual fix (#836 → #839, recorded as §9.3 self-report case), OAuth `client_id` trim defence-in-depth (#829), PKCE localStorage hotfix + crm7 migration (#832), and Part O.11 centralised theming plan adoption (#825).
  - Dashboard cron sweep (PR #843 → promotion #846) noted for traceability — `bsuite.active_plans` 8 → 13, `bsuite.archived` 6 → 0 correction.
  - Last Updated line bumped.
- **2026-05-10 v5.08W** — claude-loop ROADMAP rotation (issue [bsuite#789](https://github.com/GaryOcean428/bsuite/issues/789)):
  - Added "Recently Completed (as of 2026-05-10)" section covering 2026-05-09/10 rotation cycle (DB → EDGE → TESTS → DOCS → PERF → ROADMAP), AUTH setSession bridge + 60s sync lint rule + contract tests, APPRENTICE placement docs (AVETMISS/state-machine/form-schema), CONDUIT reconciliation docs, codehouse-parity sub-plans README.
  - Added P1 #3a (9-wave UI uplift program) and P1 #3b (Codehouse Parity & Platform 360 remaining workstreams) to execution table.
  - Added 6 entries to Related Documents (Red-Team Doctrine, FF-SELF-VALIDATION, Uplift Design Language, Uplift Wave Index, Codehouse Parity plan, Codehouse Parity sub-plans README).
  - New: [`docs/plans/20260506-codehouse-parity/README.md`](./plans/20260506-codehouse-parity/README.md) — index for 10 sub-plans (§10.5 violation resolved).
- **2026-05-08 v5.07W** — claude-loop COMPETE rotation (bsuite#739). BOOT compliance engine shipped-state correction:
  - **Master roadmap was 30+ days stale on BOOT.** Lines 337, 428, 629, 667 all classified BOOT engine as 🔲 / ⚠️ pending despite the engine + CRM7 integration being shipped end-to-end.
  - **All 4 stale rows struck** with primary-source evidence URLs to live artifacts: package `@bsuite/charge-calc/boot` v0.2.4 (8 modules, 1,757 LOC source + 4,825 LOC tests), CRM7 wrapper `src/lib/rates/bootGate.ts` sha `428820e`, CRM7 routes `/compliance/boot` + `/compliance/boot/:id`, CRM7 UI scoping doc `docs/reference/20260317-crm7-boot-assessment-ui-v1.00W.md` sha `8f081a7`, RLS migrations `20260301201200_boot_assessments_rls.sql` + `20260317030000_boot_assessments_security_hardening.sql`.
  - **Companion evidence document:** `docs/20260508-boot-engine-shipped-evidence-v1.00W.md` (full per-artifact evidence trail with line-anchored citations + Fair Work Act primary statute references).
  - **Competitive context preserved** per [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) line 164: BOOT Assessment Engine is #1 of 5 capabilities BSuite EXCEEDS Codehouse Workforce One / OTS. Workforce One holds 30% GTO market share specifically on BOOT-automation differentiation per CLAUDE-LOOP COMPETE notes — BSuite's stronger implementation (NES floors + GTO multi-placement + s.193A workflow + F17 export + npm-published engine package) holds this moat today, not as a future deliverable.
  - **No engine, schema, or UI work shipped this run.** Pure correctness fix on roadmap classification — the engine has been live since at least 2026-03-17.
- **2026-05-08 v5.06W** — claude-loop ROADMAP rotation (bsuite#731). In Progress / Pending audit:
  - Item 9 test coverage: refreshed with W4 admin lib coverage status (BSU#387) + open PermissionsEditor page-level test gap (deferred).
  - Dashboard polish: STRUCK — KeyboardSensor / sortableKeyboardCoordinates / aria-label sweep already shipped (26a + AUD-16 rollup); ai_sessions/ai_messages tables already exist (P0 #2 struck); hero signals + bento grid live via WS-D rollout.
  - SP-3 CRM7 Tier 3-4: refreshed with 6 active reports-uplift Copilot PRs landed via 2026-05-08T08 promote (CRM7 #569–575).
  - charge-calc convergence: STRUCK — both CRM7 + R80.3 consume `@bsuite/charge-calc: ^0.2.3` per `package.json` audit at SHAs `522b594` / `3a27510`.
  - Xero payroll: refreshed with OAuth fix shipment + remaining 3 sub-tasks named (invoice-line mapping, payroll sync, multi-tenant org switch).
  - **RT-10 (P3 Sprint Status):** ✅ Complete — `react-day-picker: ^9.14.0` verified in BSU `package.json` at sha `cc598ee`. Closes the last 🔲 Pending row in the P3 Sprint Status table.
  - Companion evidence document: `docs/20260508-roadmap-pending-audit-v1.00W.md` (full per-item evidence trail).
- **2026-05-08 v5.05W** — claude-loop DOCS rotation (bsuite#725 / PR #726). Single additive section appended above the prior 2026-04-14 batch; captures doctrine, dashboard, uplift-wave, parity-spec, Autonoma landmarks shipped 2026-04-15 → 2026-05-08.
- **2026-05-06 v5.04W** — plans audit roll-up (operator-driven; merged via PR #430 doc-unification chain). External corpus reconciliation; 12 plans verified DONE, 11 superseded, 5 actionable.
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
| Red-Team + UX-DX Doctrine v1.00A | [`docs/20260507-red-team-ux-doctrine-v1.00A.md`](./20260507-red-team-ux-doctrine-v1.00A.md) |
| FF-SELF-VALIDATION-20260507 | [`docs/20260507-ff-self-validation-doctrine-v1.00W.md`](./20260507-ff-self-validation-doctrine-v1.00W.md) |
| BSuite Uplift Design Language | [`docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md`](./plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md) |
| Uplift Wave Index | [`docs/plans/uplift/INDEX.md`](./plans/uplift/INDEX.md) |
| Codehouse Parity & Platform 360 | [`docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`](./plans/20260506-codehouse-parity-and-platform-360-v1.00W.md) |
| Codehouse Parity sub-plans | [`docs/plans/20260506-codehouse-parity/README.md`](./plans/20260506-codehouse-parity/README.md) |
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
| In Progress / Pending Audit (2026-05-08) | [`docs/20260508-roadmap-pending-audit-v1.00W.md`](./20260508-roadmap-pending-audit-v1.00W.md) |
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
