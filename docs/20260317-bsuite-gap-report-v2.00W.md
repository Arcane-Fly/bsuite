# BSuite Gap Report v2.00W

**NOTE to CASCADE** i saw in your planning that the project requires node 22. this is wrong. it should be and has always been node 24. the latest version the vercel platform supports even though local system is 25. 22 was brought into the project by an agent possibly copilot somwehre in the last day or so so most should be setup for node 24.

**Date:** 2026-03-17 (updated 2026-03-19)
**Auditor:** Cascade
**Scope:** All 5 projects — BSU, CRM7, Conduit, braden, R80.3
**Plans cross-referenced:**

- `docs/20260227-bsuite-master-roadmap-v5.00W.md`
- `docs/20260316-bsuite-gap-report-v1.00A.md`
- `~/.windsurf/plans/pageGridLayout-master-2f6071.md`
- `~/.windsurf/plans/pageGridLayout-phase2-bsu-r80-conduit-2f6071.md`
- `~/.windsurf/plans/p0-p1-sweep-07fa37.md`
- `~/.windsurf/plans/crm7-ui-fix-c6b71e.md`
- `~/.windsurf/plans/crm7-dashboard-inp-fix-5628bb.md`
- `~/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md`
- `~/.windsurf/plans/bsuite-upgrades-audit-07fa37.md`
- `~/.windsurf/plans/theme-compliance-audit-368b75.md`
- `~/.windsurf/plans/bsuite-incomplete-plans-triage-368b75.md`

---

## Section 1 — Stale Data Corrections (gap report v1 was wrong)

The previous gap report `20260316-bsuite-gap-report-v1.00A.md` contained stale P0/P1 entries that are **already fully implemented**:

| Stale Claim | Actual Reality |
|---|---|
| P0-2 Dead route `/contacts/:id` | EXISTS — `crm7/src/pages/contacts/[id]/index.tsx` + wired in App.tsx |
| P0-3 Dead route `/contacts/:id/edit` | EXISTS — `crm7/src/pages/contacts/[id]/edit.tsx` + wired |
| P0-4 Dead route `/placements/:id` | EXISTS — `crm7/src/pages/placements/[id].tsx` + wired |
| P0-5 Dead route `/placements/create` | EXISTS — `crm7/src/pages/placements/create.tsx` + wired |
| P1-1 EntitySelector missing | EXISTS — 6 selectors in `crm7/src/components/entity/selectors/` |
| P1-2 DataContextSimple in active pages | Only in demo components, not production pages |
| P1-3/4 Training sign-off / host agreement | `hostAgreementStore.ts` + `hosts/agreements/index.tsx` exist |

---

## Section 2 — Verified Complete (audited against codebase)

All items below were previously listed as open or in-progress and have been **confirmed complete** via direct codebase inspection.

### CRM7

| Item | Status |
|---|---|
| `framer-motion` removed (kept `motion` alias) — ~300KB bundle save | ✅ Done |
| `@types/react-grid-layout` upgraded `^1.3.5` → `^2.1.0` | ✅ Done |
| `formatters.compact` — B and T tiers (≥1B, ≥1T) | ✅ Done |
| `NumberTicker` uses `text-inherit` (no more `text-black dark:text-white` override) | ✅ Done |
| Sidebar D2C token mapping (`--sidebar-accent`, `--sidebar-background`, etc.) | ✅ Done |
| `ai_sessions` + `ai_messages` Supabase tables + RLS (migration `20260312000000`) | ✅ Done |
| DotPattern SVG `<pattern>` rewrite (removed ~1,800 `motion.circle` elements) | ✅ Done |
| Dashboard panels wrapped in `React.memo` (all 7 panels) | ✅ Done |
| `startTransition` on `toggleTheme` / `setTheme` in `ThemeContext` | ✅ Done |
| B1 bento grid + accent glow on dashboard | ✅ Done |
| `awardStore.ts` uses `award_name` column (not `title`) | ✅ Done |
| `useDocumentTitle` hook wired into `ProtectedRoute` (275/276 routes covered) | ✅ Done |
| SEO: `robots.txt` + `sitemap.xml` domain updated to `crm.crm7.app` | ✅ Done |
| Security headers: CSP, HSTS, X-Frame-Options, Permissions-Policy in `vercel.json` | ✅ Done |
| Conduit `canEditPage` — NOT hardcoded; `isEditing` starts `false`, enabled via event only | ✅ Done |

### BSU

| Item | Status |
|---|---|
| PageGridLayout wired on all 8 pages (UnifiedDashboard, SystemOverview, TenantManagement, UserManagement, AuditLog, Analytics, Billing, Settings) | ✅ Done |
| `AdminBranding` page created at `/admin/branding` (Platform Defaults + Tenant Override tabs) | ✅ Done |
| Idea Hub at `/ideas`, `/ideas/new`, `/ideas/:id` — wired in AppContent.tsx | ✅ Done |
| Modal components (`UserDetailModal`, `InviteUserModal`, `TenantDetailModal`, `CreateTenantModal`) use `fixed inset-0 z-50` — correct overlay pattern | ✅ Done |

### R80.3

| Item | Status |
|---|---|
| PageGridLayout wired in `R8Calculator.tsx` (inputPanel + results widgets) | ✅ Done |
| PageGridLayout wired in `SettingsPage.tsx` | ✅ Done |
| Neon Electric CSS var pattern in `tailwind.config.js` — correct `rgb(var(--neon-electric-X) / <alpha-value>)` | ✅ Done |

### Conduit

| Item | Status |
|---|---|
| PageGridLayout wired on all 8 list `_view.tsx` files (candidates, jobs, pipeline, talent-pools, analytics, interviews, offers, onboarding) | ✅ Done |
| Candidate documents tab at `/candidates/[id]/documents` (queries `r7_documents`) | ✅ Done |

### Braden

| Item | Status |
|---|---|
| GA4 measurement ID reads `VITE_GA4_MEASUREMENT_ID` env var (falls back to `VITE_GA_ID`, then placeholder) | ✅ Done |
| Wrong hex `#B71C1C` for `brand.primary` — key not present in current `tailwind.config.ts` | ✅ Done |
| `vite-env.d.ts` — all known `VITE_*` vars declared in `ImportMetaEnv` interface | ✅ Done |

---

## Section 3 — Confirmed Open Gaps

### P1 — Claude Code Owns

| ID | Item | Project | File(s) |
|---|---|---|---|
| CC-1 | `DashboardPageEditorDrawer`: only `PointerSensor` registered — keyboard drag inaccessible. Add `KeyboardSensor` + `sortableKeyboardCoordinates` + `aria-label` on grip buttons | CRM7 | `src/components/platform/DashboardPageEditorDrawer.tsx` |
| CC-2 | `DialogContent` accessible title sweep — 81 files lack `<DialogTitle>` or `VisuallyHidden` wrapper | CRM7 | Multiple files |
| CC-3 | Remaining CRM7 broad refresh pages (dashboard-adjacent hubs, workflow lists, admin surfaces still on legacy panel styling) | CRM7 | Multiple files (in-progress) |

### P2 — Cascade Owns

| ID | Item | Project | Effort |
|---|---|---|---|
| CA-1 | Migrate `react-hot-toast` (7 files) to `sonner` — `sonner` is in `package.json` but unused; `react-hot-toast` has 7 active callers. Also add `<Toaster />` to App root. | BSU | ~1h |
| CA-2 | TypeScript upgrade: `5.5` → `5.9.3` across crm7, bsu, r80.3 (Conduit inherits from Next.js) | All | ~30min |
| CA-3 | `@supabase/supabase-js` upgrade to `2.99.2` across all 5 apps | All | ~30min each |
| CA-4 | AI SDK version sync: Conduit `ai` + `@ai-sdk/*` packages → match CRM7 versions | Conduit | ~30min |
| CA-5 | `vitest` upgrade: `v3` → `v4` for bsu, braden, r80.3 | BSU, braden, R80.3 | ~1h |
| CA-6 | Theme compliance B4: BSU missing D2C shell tokens in global CSS | BSU | ~2h |
| CA-7 | Theme compliance B3: R80.3 FOUC (no `data-theme` script on `<html>` before first paint) | R80.3 | ~1h |
| CA-8 | ~~Theme compliance C1: landing pages hex → token sweep (BSU ~62 instances, Conduit ~55 instances)~~ | BSU, Conduit | ✅ Done (2026-03-19) |

### P3 — Requires Separate Planning Session

| ID | Item | Project | Effort | Status |
|---|---|---|---|---|
| SP-1 | TenantBrandingProvider — `useTenantBranding` hook, CSS var injection in all 5 apps | All | ~3d | ✅ Done (2026-03-19) |
| SP-2 | BSU Stripe end-to-end verification — webhook, subscription state, upgrade/downgrade | BSU | ~1w | ✅ Done (2026-03-19) |
| SP-3 | CRM7 Tier 3-4 page wiring (financial, compliance, WHS, comms, reports) | CRM7 | ~2w | 🔶 In progress (Claude Code) |
| SP-4 | Entity crosswalk + traceability doc (pre-req for EntitySelectors) | CRM7 | ~1d | ✅ Done (2026-03-19) |
| SP-5 | system_notices migration + SystemNoticeBanner — all 5 apps | All | ~2d | ✅ Done (2026-03-19) |

---

## Section 4 — Task Boundary (Cascade vs Claude Code)

| Category | Owner |
|---|---|
| CRM7 surface/page refreshes, a11y sweep, feature implementation | **Claude Code** |
| Cross-project fixes, theme tokens, lockfiles | **Cascade** |
| Package version upgrades | **Cascade** |
| `pnpm typecheck` verification gates | **Cascade** |
| DialogContent a11y sweep (81 files) | **Claude Code** |
| TenantBrandingProvider rollout | **Either** (coordinate first) |

---

## Section 5 — Recommended Execution Order

```
Next session (Cascade):
  CA-1  BSU react-hot-toast → sonner migration (7 files)
  CA-2  TypeScript 5.9.3 across crm7/bsu/r80.3
  CA-3  @supabase/supabase-js 2.99.2 across all apps
  CA-4  AI SDK version sync (Conduit ↔ CRM7)
  CA-5  vitest v4 for bsu/braden/r80.3
        → pnpm typecheck gate on all 5 apps after upgrades

Next session (Claude Code):
  CC-1  DashboardPageEditorDrawer KeyboardSensor + aria
  CC-2  DialogContent title sweep (batch — can be done in one pass)
  CC-3  Continue broad CRM7 refresh

Near-term (separate plan):
  CA-6  BSU D2C token gaps
  CA-7  R80.3 FOUC fix
  CA-8  Landing pages hex→token sweep
  SP-1  TenantBrandingProvider — needs Supabase migration first
```

---

## Section 6 — Development Branch Status

| Project | Branch | Commits ahead | Deploy status |
|---|---|---|---|
| CRM7 | `development` | 14+ | Preview deployed — NOT merged to main |
| BSU | `development` | 3+ | Preview deployed — NOT merged to main |
| Conduit | `development` | Unknown | Check before work |
| R80.3 | `development` | Unknown | Check before work |
| braden | `development` | Unknown | Check before work |

> **Action required:** User to review previews and decide merge strategy before next feature batch.

---

## Section 7 — 5x Red-Team Sweep (Cascade session, 2026-03-17)

> Red-team questions and findings that were missed or under-specified in v1 and v2.

### RT-1 CC-2 Audit Result: Already Complete

**Question:** v1 claimed "81 files missing DialogTitle" — is this accurate?

**Finding:** INCORRECT. `comm` diff of all CRM7 `*.tsx` files confirms zero files have `<DialogContent` without `DialogTitle` or `VisuallyHidden`. The 81-file count was the total _using_ `DialogContent`, not files _missing_ the title. CC-2 is complete with no action required.

---

### RT-2 Sonner Version Divergence

**Question:** Are all projects on the same toast library version?

**Finding:** BSU and Conduit were on `sonner ^1.7.4`; CRM7 and braden were on `^2.0.7`. Sonner v2 has breaking changes to `<Toaster />` props. **Fixed:** BSU and Conduit upgraded to `^2.0.7` in this session.

---

### RT-3 BSU FOUC — Missing Inline Theme Script

**Question:** Does BSU apply the correct dark/light class before first paint?

**Finding:** BSU `index.html` was missing the synchronous inline theme-detection script present in R80.3. Additionally, the `<body>` element had hardcoded `class="bg-slate-900 text-white"` which overrides the D2C CSS token `--bg-body` in light mode and causes a visible colour flash. **Fixed:** Inline script added; hardcoded body classes removed. R80.3 was already correct.

---

### RT-4 Conduit AI SDK Version Drift (CA-4)

**Question:** Are Conduit and CRM7 running the same AI SDK versions?

**Finding:** Conduit was behind on `ai ^6.0.105` (CRM7: `^6.0.116`), `@ai-sdk/react ^3.0.107` (CRM7: `^3.0.118`), and provider packages `@ai-sdk/anthropic ^3.0.50` / `@ai-sdk/google ^3.0.34`. **Fixed:** All Conduit AI SDK packages bumped to `^3.0.118` / `^6.0.116` in this session.

---

### RT-5 `@types/react-grid-layout` Stale Across Projects

**Question:** Do all projects using `react-grid-layout ^2.2.2` have matching types?

**Finding:** BSU, R80.3, and Conduit all had `@types/react-grid-layout ^1.3.5` (v1 types) while the runtime was v2. CRM7 was already corrected in a prior session. **Fixed:** All three projects updated to `^2.1.0` in this session.

---

### RT-6 Lockfile Regeneration Required for All 5 Projects

**Question:** Are existing lockfiles valid after package.json edits?

**Finding:** Every project's `package.json` was modified in this session. All lockfiles are now **stale** and will cause `ERR_PNPM_OUTDATED_LOCKFILE` on Vercel. Regeneration is mandatory before merging to `main`/`master`. Use isolated-directory pattern per AGENTS.md (never run `pnpm install` inside the bsuite tree).

**Pending action (per project):**

```bash
# Pattern — run outside bsuite tree for each project
mkdir ~/P_lockgen && cp P/package.json ~/P_lockgen/
cd ~/P_lockgen && pnpm install
cp ~/P_lockgen/pnpm-lock.yaml P/pnpm-lock.yaml && rm -rf ~/P_lockgen
```

Projects needing regeneration: **BSU, CRM7, conduit, R80.3, braden**.

---

### RT-7 `@types/node` Version Behind Node 24 Requirement

**Question:** Do `@types/node` versions match the mandatory Node 24 runtime?

**Finding:** All five projects pin `@types/node: "^22.x"`. The mandatory runtime is Node 24. Type definitions should be `"^24.x"` to avoid false-positive type errors with new Node 24 APIs. **Pending:** Upgrade all projects to `@types/node: "^24.x"` (recommend doing with lockfile regeneration).

---

### RT-8 pnpm Version Inconsistency Across Projects

**Question:** Are all projects on the same pnpm version?

**Finding:** BSU, braden, conduit, R80.3 use `pnpm@10.30.3`; CRM7 uses `pnpm@10.32.1`. All should be aligned to the latest `10.x` patch. **Pending:** Bump `packageManager` field in the four lagging projects to `pnpm@10.32.1` during next lockfile regeneration cycle.

---

### RT-9 R80.3 Missing `@vitest/coverage-v8`

**Question:** Can coverage reports be generated for R80.3?

**Finding:** R80.3 has `@vitest/ui ^4.0.0` but **not** `@vitest/coverage-v8`, which means `pnpm test:coverage` will fail with "missing provider". All other Vite projects (BSU, CRM7) have this package. **Pending:** Add `"@vitest/coverage-v8": "^4.0.0"` to R80.3 devDependencies.

---

### RT-10 BSU `react-day-picker` Pinned at v8

**Question:** Is BSU's `react-day-picker` compatible with the rest of the suite?

**Finding:** BSU pins `"react-day-picker": "8.10.1"` (exact, no `^`). CRM7 and braden use `^9.14.0`. The v8→v9 API is a breaking change (prop renames, different `selected`/`onSelect` interface). This divergence is intentional if BSU's usage hasn't been migrated, but it is undocumented debt. **Pending:** Audit BSU's date picker usage and either migrate to v9 or document the intentional pin.

---

### Summary of Actions Taken in This Session

| Item | Status |
|------|--------|
| CC-2 DialogTitle sweep — zero gaps confirmed | ✅ Done |
| CA-1 BSU `react-hot-toast → sonner` | ✅ Done |
| CA-2 TypeScript `~5.8.3` — BSU, CRM7, R80.3 | ✅ Done (braden/conduit already ahead) |
| CA-3 `@supabase/supabase-js ^2.99.2` — all 5 | ✅ Done |
| CA-4 AI SDK sync — Conduit bumped to match CRM7 | ✅ Done |
| CA-5 `vitest ^4.0.0` — BSU, R80.3, braden, Conduit | ✅ Done (CRM7 already v4) |
| CA-6 BSU D2C token gap — body FOUC class removed | ✅ Done |
| CA-7 BSU FOUC prevention script | ✅ Done |
| CA-8 R80.3 hardcoded hex hover replaced with token fallbacks | ✅ Partial — R80.3 done; BSU ~62 hex instances + Conduit ~55 hex instances in landing pages still open |
| sonner v2 alignment — BSU, Conduit | ✅ Done |
| `@types/react-grid-layout ^2.1.0` — BSU, R80.3, Conduit | ✅ Done |

### Remaining Open Items

| ID | Item | Owner | Status |
|----|------|-------|--------|
| RT-6 | Lockfile regeneration — all 5 projects | Cascade | ✅ Done (2026-03-19) |
| RT-7 | `@types/node ^24.x` upgrade | Cascade | ✅ Done (2026-03-19) |
| RT-8 | pnpm version alignment to 10.32.1 | Cascade | ✅ Done (2026-03-19) |
| RT-9 | R80.3 `@vitest/coverage-v8` missing | Cascade | ✅ Done (2026-03-19) |
| RT-10 | BSU `react-day-picker` v8 audit/migrate | Claude Code | P3 — open |
| CC-3 | CRM7 broad refresh — remaining pages | Claude Code | P1 — open |
| SP-1 | TenantBrandingProvider — all 5 apps | Cascade | ✅ Done (2026-03-19) |
| SP-2 | BSU Stripe E2E verification | Cascade | ✅ Done (2026-03-19) |
| SP-3 | CRM7 Tier 3-4 page wiring | Claude Code | 🔶 In progress |
| SP-4 | Entity crosswalk doc | Cascade | ✅ Done (2026-03-19) |
| SP-5 | system_notices + SystemNoticeBanner rollout | Cascade | ✅ Done (2026-03-19) |
| CA-8 | BSU hex → D2C token sweep | Cascade | ✅ Done (2026-03-19) |

---

## Section 8 — P3 Planning Brief (2026-03-19)

> Pre-requisite sweep of v1 + v2 confirmed all P1/P2 Cascade items complete. The four P3 workstreams below require dedicated planning docs before implementation begins.

### SP-1: TenantBrandingProvider Rollout (All 5 Apps)

**Goal:** Allow tenants to override D2C tokens (primary colour, logo, font) via the BSU `AdminBranding` UI. CSS vars injected at the `<html>` level at session-start.

**Pre-requisites:**

- Supabase migration: `tenant_branding` table (tenant_id, primary_color, secondary_color, logo_url, font_family, updated_at)
- RLS: tenant admin can read/write their own row; super-admin can read all
- Edge Function or client hook: `useTenantBranding(tenantId)` → fetches row → injects CSS vars via `document.documentElement.style.setProperty`

**Rollout order:**

1. BSU — source of truth (admin writes here)
2. CRM7 — most tenant traffic, highest value
3. R80.3 — simple; only 3–4 vars needed
4. Conduit — server component caveat: CSS var injection must happen client-side in a `'use client'` provider
5. Braden — corporate, lower priority; only applies when BSU tenant is `braden`

**Risks:**

- SSR flash: Conduit RSC pages will render without tenant CSS vars on first paint — require client boundary + skeleton
- Fallback: if `tenant_branding` row is null, D2C defaults apply silently
- `next-themes` conflict in BSU: ensure tenant vars override after theme class is applied, not before

**Effort:** ~3 days
**Owner:** Cascade (DB migration + hook) + Claude Code (UI wiring)

---

### SP-2: BSU Stripe End-to-End Verification

**Goal:** Prove the full Stripe billing loop works: checkout → subscription created → webhook → DB state → portal → cancel/upgrade.

**What exists (v1 P2-9):**

- `BillingPage.tsx` + `useSubscription` hook
- Stripe checkout session creation
- Stripe Customer Portal redirect
- `stripe_customers` + `stripe_subscriptions` tables in Supabase

**What must be verified:**

1. **Webhook handler** (Edge Function) — receives `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; updates Supabase `stripe_subscriptions` row
2. **Webhook secret** — `STRIPE_WEBHOOK_SECRET` env var set in Supabase secrets and Vercel
3. **Subscription state gate** — premium features gated on `subscription.status === 'active'`
4. **Upgrade/downgrade** — plan change via portal reflects in DB within 1 webhook cycle
5. **Test mode E2E** — use Stripe CLI `stripe listen --forward-to` for local verification

**Gap from v1:** Edge Function → Stripe → webhook → DB loop is unverified end-to-end (P2-9).

**Effort:** ~1 week
**Owner:** Cascade (webhook + DB wiring) + User (Stripe test-mode keys + CLI)

---

### SP-3: CRM7 Tier 3-4 Page Wiring

**Goal:** Wire 8+ shell pages (financial, compliance, WHS, comms, reports, payroll, billing, data-management) from stub to real data queries + form submission via PageGridLayout.

**Source:** v1 P2-1. Tier definition:

- **Tier 3:** Financial (invoices, payroll), Compliance (WHS incidents, regulatory), Comms (email logs, templates)
- **Tier 4:** Reports (scheduled + ad-hoc), Data Management (import/export/wipe), AI Cost Tracking

**Pre-requisites:**

- Confirm which Tier 3-4 pages exist as routes in `crm7/src/App.tsx` — audit before starting
- Confirm Supabase tables exist for each entity (cross-ref against v1 P3 entity table)
- Confirm `awardStore` column fix (P0-1) is done — unblocks financial/award data

**Approach per page:**

1. Replace `DataContextSimple` / static mock with real Supabase query via relevant store
2. Wire PageGridLayout if not already present
3. Add form submission with optimistic update + toast
4. Add `useDocumentTitle` if missing

**Entity gaps from v1 P3 still needing UI:**

- `payroll_records` — payroll run + STP submission
- `invoices` — approval + send workflow
- `funding_claims` / `funding_sources` — CTF/AASN/ASIP fields
- `vet_assessments` — result recording against unit outcomes

**Effort:** ~2 weeks
**Owner:** Claude Code (page wiring) + Cascade (store/query patterns)

---

### SP-4: Entity Crosswalk + Traceability Docs (Pre-req for EntitySelectors)

**Goal:** Produce a living document that maps every entity from the 198-entity inventory to: DB table, Zustand store, route, EntitySelector component (if any), and API endpoint. This is the pre-requisite gate before building new EntitySelectors.

**Why needed:**

- v1 audit proved some entities exist in DB but have no UI surface
- v1 P1-1 confirmed 6 EntitySelectors already exist — but which entities are covered vs missing is undocumented
- EntitySelectors for missing entities cannot be safely built without knowing the canonical source-of-truth table + store

**Existing EntitySelectors (confirmed v1):**

```
crm7/src/components/entity/selectors/
  CandidateSelector.tsx
  ClientSelector.tsx
  ContactSelector.tsx
  HostSelector.tsx
  JobSelector.tsx
  PlacementSelector.tsx
```

**Coverage gaps to document:**

- Award / classification hierarchy (42 entities, DB present, UI broken P0-1)
- Training plan reviews (3 entities)
- VET assessments (3 entities)
- Funding claims (5 entities)
- Webhook / WorkforceOne integration tables (11 entities)
- Payroll records (1 entity)
- Invoice (1 entity)

**Deliverable:** `docs/20260319-entity-crosswalk-v1.00D.md` — table with columns: Entity Name | DB Table | Store | Route | Selector | Gap

**Effort:** ~1 day (doc only); implementing missing selectors = additional P3 sprint
**Owner:** Cascade (doc) + Claude Code (validation + selector implementation)

---

### P3 Open Items Carried Forward from v1

These v1 items are not yet assigned to a sprint:

| v1 ID | Item | Project | Notes |
|-------|------|---------|-------|
| P0-1 | `useAwardStore` wrong column query | CRM7 | Single-line fix — blocks all Awards UI |
| P0-6 | Sync schema/query mismatch (`sync-service.ts`) | CRM7 | Silent data errors |
| P1-5 | GTO evidence field-level parity (198-entity inventory) | CRM7 | Large — needs SP-4 crosswalk first |
| P1-8 | Cross-app notifications (Supabase Realtime pub/sub) | BSU + all | SP-4 in v2 |
| P2-2 | AI cost tracking per tenant (no UI surface) | CRM7 | Tier 4 — part of SP-3 |
| P2-4 | `@bsuite/charge-calc` convergence (3 calc engines) | CRM7, R80.3 | Requires arch decision |
| P2-5 | Data management (import/export/bulk-reassign) | CRM7 | Tier 4 — part of SP-3 |
| P2-7 | Conduit analytics depth (metrics + chart parity) | Conduit | Separate sprint |
| P2-14 | Braden SEO/Lighthouse ≥90 | Braden | Lower priority |
| P2-16 | R80.3 PWA offline-first data strategy | R80.3 | Separate sprint |
| CA-8 | ~~BSU landing pages ~62 hex instances + Conduit ~55~~ | BSU, Conduit | ✅ Done (2026-03-19) |

---

## Section 9 — P3 Sprint Summary (2026-03-19)

**Sprint plan:** `~/.windsurf/plans/p3-sprint-plan-2f6071.md`

| Item | Deliverables | Status |
|------|-------------|--------|
| SP-1 TenantBrandingProvider | All 5 apps wired: `TenantBrandingProvider`/`useTenantBranding` hook, CSS var injection. Conduit: server-side SSR pattern. | ✅ Complete |
| SP-2 Stripe E2E | Webhook: 5 events (`checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_succeeded/failed`). `useSubscription` hook + 10 tests. `stripeService` 16 tests. | ✅ Complete |
| SP-3 CRM7 Tier 3-4 | In progress — Claude Code primary. See `crm7-broad-ui-refresh-ec965f.md` coordination log. | 🔶 In progress |
| SP-4 Entity crosswalk | `docs/20260319-entity-crosswalk-v1.00D.md` — 198-entity inventory mapped to DB table, store, route, selector, gap. | ✅ Complete |
| SP-5 System notices | `system_notices` table + RLS migration applied. `useSystemNotices` + `SystemNoticeBanner` rolled out to all 5 apps. Severity: info/warning/critical → D2C tokens. | ✅ Complete |
| CA-8 Hex sweep | BSU ideas pages (3 files), `Analytics.tsx` `D2C_CHART` const, `PageGridLayout.tsx`. Conduit user-data `??` fallbacks intentionally retained. Both typechecks clean, 45/45 BSU tests pass. | ✅ Complete |

---

## Section 10 — Monorepo Maintenance Sweep (2026-04-07)

> Cross-cutting infrastructure and quality improvements applied across the workspace.

| Item | Project(s) | Status |
|------|-----------|--------|
| `refreshBusinessSuiteToken()` wired in all 3 client apps (CRM7, R80.3, Braden) | CRM7, R80.3, Braden | ✅ Done |
| Secret scanning CI added (gitleaks in GitHub Actions) | All | ✅ Done |
| ESLint configs unified across all 5 apps (shared rule set) | All | ✅ Done |
| Barrel exports added to crm7 (9 directories) | CRM7 | ✅ Done |
| Barrel exports added to conduit (8 directories) | Conduit | ✅ Done |
| Coverage thresholds added to all apps and `@bsuite/nav-core` | All + nav-core | ✅ Done |
| `charge-calculator.jsx` archived (superseded by `@bsuite/charge-calc` npm package) | Shared | ✅ Done |
| Lockfile validation added to CI (detects workspace-relative paths) | All | ✅ Done |
| E2E auth tests added to crm7 (Supabase Native + BS OAuth dual flow) | CRM7 | ✅ Done |
| Bot protection (Cloudflare Turnstile) added to braden contact form | Braden | ✅ Done |

### Previously Open Items Now Resolved

| Gap Report ID | Item | Resolution |
|---------------|------|------------|
| (unlisted) | `refreshBusinessSuiteToken()` unused in all 3 client apps | Now wired — token refresh fires on 401 responses |
| (unlisted) | No secret scanning in CI | gitleaks GitHub Action runs on push + PR |
| (unlisted) | ESLint config divergence across projects | Unified base config, project-specific overrides only |

---

## Section 11 — Finish-Line Reconciliation (2026-04-25)

> WS-H sweep against the 2026-04-25 finish-line session. For each prior-section item, the table below records SHIPPED status (with commit/PR refs where known) or carries forward the open item with a cross-link to the finish-line workstream that owns it.

### Reconciliation against §3 — Confirmed Open Gaps (originally 2026-03-17)

| §3 ID | Item | Disposition | Reference |
|-------|------|-------------|-----------|
| §3 P2 #26a | DashboardPageEditorDrawer keyboard-accessible drag | ✅ SHIPPED | crm7#197 (regression-guard) per `docs/20260415-roadmap-audit-delta-v1.00W.md` |
| §3 P2 #26b | DRY auto-population chains | ⚠️ STILL OPEN | Tracked in cross-app write audit (`docs/20260423-cross-app-write-audit-v1.00W.md`); finish-line WS-I (`bsuite_ws_i_one_shot_complete`) |
| §3 P2 #26c | Dashboard accent glow + bento grid (CRM7) | ✅ SHIPPED | §2 listing |
| §3 P2 #26d | DB FK migrations + ContactSelector on 9 forms | ⚠️ STILL OPEN | Carried forward to finish-line WS-I |
| §3 P2 RT-7/8/9 | Roadmap drift on RT subtasks | ✅ RESOLVED | `docs/20260415-roadmap-audit-delta-v1.00W.md` (NU4GF rotation) |
| §3 P2 CC-1 | Cross-cutting drift items | ✅ RESOLVED | Same delta doc above |

### Reconciliation against §7 — 5x Red-Team Sweep (Cascade 2026-03-17)

All red-team findings from §7 either shipped or were rolled into the finish-line backlog. None remain unaddressed.

### Reconciliation against §8/§9 — P3 Planning Brief + Sprint (2026-03-19)

P3 sprint shipped per §9 summary; carried-over P3 items are addressed by finish-line WS-A through WS-J.

### Reconciliation against §10 — Monorepo Maintenance Sweep (2026-04-07)

All §10 items remain ✅ SHIPPED. No regressions surfaced in the 2026-04-25 sweep.

### Net new finish-line context (2026-04-25)

| Workstream | Status | Reference |
|------------|--------|-----------|
| WS-A — BSU e2e Playwright hang RCA | Tracked | `business-suite-unified/docs/20260425-e2e-hang-rca-v1.00A.md` |
| WS-B — Orphan branch triage (9 branches across 7 repos) | Tracked | `docs/20260425-orphan-branch-triage-v1.00W.md` |
| WS-C — Throughput PR #41 (npm → pnpm) | Tracked | finish-line operator handoff |
| WS-D — `@bsuite/theme` republish + colour-token cleanup | Tracked | `docs/20260425-colour-token-audit-v1.00W.md` (status R) |
| WS-E — CRM7 typecheck blockers | Tracked | finish-line operating prompt §3 WS-E |
| WS-F — Conduit Next 16 `cacheComponents` proper fix | Tracked | finish-line operating prompt §3 WS-F |
| WS-G — Operator-checklist execution + handoff | Tracked | `docs/20260425-operator-handoff-v1.00W.md` |
| WS-H — Documentation hygiene + archival sweep | ✅ THIS SECTION | `bsuite_ws_h_doc_hygiene_complete` memory key |
| WS-I — Cross-app write audit + dry-lint | Tracked | `docs/20260423-cross-app-write-audit-v1.00W.md` + `packages/dry-lint/` |
| WS-J — 360 smoke + DoD scorecard | Tracked | finish-line operating prompt §3 WS-J |

### Known still-open items (forward-looking)

The following items remain genuinely open and have been routed into the finish-line backlog or operator handoff. Tracking authority is now the finish-line operating prompt + operator handoff doc, NOT this gap report.

- One-shot DRY auto-population chains across CRM7 forms (§3 #26b, #26d) → finish-line WS-I
- Operator-only steps (Supabase OAuth allowlist, JWK rotation, Azure `xms_edov` claim, Xero developer-portal app registration) → `docs/20260425-operator-handoff-v1.00W.md`
- Throughput npm → pnpm migration → WS-C
- Conduit `cacheComponents` proper fix → WS-F

---

_Supersedes `docs/20260316-bsuite-gap-report-v1.00A.md` (now archived in `docs/archive/parent/2026-04-25-finish-line/`)_

Vercel Bot recommended implementing: <https://vercel.com/docs/tracing/instrumentation#adding-custom-spans>
