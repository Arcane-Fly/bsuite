---
kind: plan
authority: engineering
owner: bsuite-platform
evidence:
  - docs/nav/findings.md
  - docs/nav/build-inventory.py
  - packages/nav-core/src/apps.ts
  - business-suite-unified/src/components/RouteInspectorAddToNavDialog.tsx
---

# Navigation & Route Remediation Plan

> ## THE WORK SHIPPED. THE VERIFICATION DID NOT. AND THE FEATURE HAS NEVER BEEN USED.
>
> **Re-measured 2026-09-02.** This plan is **not superseded** and its 53 unchecked boxes are
> **not outstanding work** — all eight phases executed, eight pull requests merged, and the
> result is live on `main`. Every unchecked box is a **verification gate**, not a build task,
> and the section below has been read as one for a fortnight by anyone who did not scroll.
>
> | of the 53 boxes | |
> |---|---|
> | provably DONE, re-measured this pass | **21** |
> | genuinely UNRUN — mostly live visual, Lighthouse and red-team passes on conduit and R80.4 | **24** |
> | replaced by a better measure since | **4** |
> | need an artefact this pass could not produce | **3** |
> | the operator's call | **1** |
>
> ### The finding that matters more than any of them
>
> **`tenant_navigation` holds ZERO ROWS in production.**
>
> The database navigation overlay this plan built is fully wired: the "Add to Navigation"
> flow exists (`RouteInspectorAddToNavDialog.tsx`), the CHECK constraint accepts all six
> scopes, row-level security is on with four policies, and five of six apps call
> `useTenantNavigation` — braden excluded by design, stated in the migration header.
>
> Every blocker was removed. **Nobody has ever added a single entry.**
>
> Measured live, with its own positive control in the same query: `nav_rows 0`, while
> `tenants 7` and `custom_pages 2` — so the counter works and the zero is real.
>
> This is the estate's signature failure in a form no wiring gate can catch. The feature is
> not unwired, not unreachable and not broken. It is **built, reachable, and undiscovered** —
> and its Phase 4.1 wiring took BSU down twice to get there.
>
> ### One caveat carried forward, and it is a DRY item rather than a parity gap
>
> Mobile navigation is at behavioural parity across all six apps at 375px, but only conduit
> and R80.4 consume the shared `MobileSidebarDrawer`. **The other four hand-roll equivalent
> logic** — four reimplementations of a solved problem.
>
> **Do not re-run a phase from the text below.** Read the outcome section first; then, if you
> need verification, the 24 unrun gates are the work, not the build.


> **For Claude:** REQUIRED SUB-SKILL: Use `plan-executing` to implement this plan task-by-task.

---

## EXECUTION OUTCOME — 2026-08-14 (read before re-running any phase)

All eight phases executed. Delivery and the honest gaps are below; the phase text is
retained unchanged as the original brief.

### Shipped and merged to `development`

| App | PR | What |
|---|---|---|
| throughput | #290 | dead `/todos` removed · utility-page nav · DB nav rewired to the component that actually renders |
| conduit | #465 | Schema Builder nav · dashboard ARIA |
| braden | #390 | marketing pages into nav · AppSwitcher · 3 bare SSO hrefs fixed |
| crm7 | #1732 | 45 unreachable pages wired into in-page sub-navigation |
| R80.4 | #68 | DB nav overlay · lockfile regenerated outside the tree |
| BSU | #728, #730, #731 | interactive Route Inspector · adversarial-review fixes · **two P0 fixes** |

Eight superseded/mispushed PRs closed with reasons. conduit#461 left **open** — operator
ruling D-93 superseded it mid-flight and the call belongs to the portals lane.

### The finding that matters most

**A P0 was introduced by this plan's own Phase 4.1 and took the entire BSU app down on the
preview — every route, dashboard included.** `useTenantNavigation` opens a Supabase Realtime
channel named `tenant-navigation:<app_scope>`; two subscribers on one channel make the second
`.on('postgres_changes', …)` after `subscribe()` throw. It happened **twice**, from two
different causes (a twice-mounted child, then two different components).

Both times, **every gate was green while the app was dead**: typecheck, lint, `pnpm build`,
`pnpm size`, and 1106 unit tests. Nothing mounted the sidebar and counted subscriptions, so
nothing *could* have caught it. It was found only by loading the deployed preview.

Two guards now exist, each **positive-controlled** (watched failing before being trusted):
a subscription-count test, and a static assertion that `RouteInspector` never re-imports the
hook. The static form is deliberate — rendering the Inspector in jsdom does **not** reproduce
the fault, because a mocked hook opens no channel.

### Defects found only by live verification, never by reading code

1. **bsuite#2004** — `content_pages`/`custom_pages` have no anon SELECT policy, so every
   anonymous visitor to a braden CMS page gets zero rows. Reproduced over real PostgREST with
   passing positive controls. Handed to the portals lane (routes vs policies boundary).
2. **Vercel build-breaker** — the Inspector imported the inventory from the *parent* monorepo;
   Vercel clones submodules standalone. Fixed at the generator + a CI guard.
3. **throughput's DB nav was wired into dead code** — `EnhancedNavigation` is mounted by
   nothing. Also `tenant_navigation`'s CHECK constraint rejected `app_scope='throughput'`, so
   the feature was dead twice over (migration `20260819010000` written, dry-run verified, not
   applied).
4. **`manualChunks` mis-classification** — `id.includes('/react/')` matched any package with a
   `react/` subdirectory. Anchoring fixed a size break *and* a pre-existing mis-chunk:
   critical path 247.18 → **218.41 kB**.

### Corrections to this plan's own instructions

- Phase 6.3 said to use `@dnd-kit`; I then relayed an operator note as a blanket dnd-kit ban.
  **Both were wrong in different directions.** The note was about the *card grid*
  (react-grid-layout). `Nav.tsx:16` states "SortableList (dnd-kit) for sections AND items —
  no ChevronUp/Down-only". Now uses the shared `SortableList`.
- Phase 6.4's "Edit in Page Builder → `/developer/pages`" targets a route removed by ADR-0001.
  Retargeted to CRM7 `/settings/custom-pages`.

### Not done, stated plainly

- **`nav.surface` measures nav-config membership, not UI reachability.** Wiring 45 crm7 pages
  into in-page tabs did **not** move the orphan count. Any future report must not imply it did.
  A `reachable_via` field is the real fix.
- **braden is absent from `BSUITE_APP_KEYS`**, so no app can link *to* braden. Unassigned.
- **throughput `MegaMenu`/`MobileBottomNav`/`EnhancedNavigation` remain dead code** — left in
  place because deleting pre-existing work needs owner approval.
- Migration `20260819010000` is **not applied** (the applier runs on `main`).

**Status: D → keep at Draft.** The phases are executed, but conduit#461 is blocked on an
operator ruling and the items above are open. Do not promote this to `A` on delivery alone.

---

**Goal:** Bring every route across 6 BSuite apps to a verified state: correct auth guard, reachable nav, consistent shell/theme, parity on shared components (`@bsuite/nav-core`, `AppSwitcher`, `MobileSidebarDrawer`, DB nav overlay), and zero DRY violations — verified by live login, Supabase query, and Playwright screenshot, not by code-reading alone.

**Architecture:** 8 phases. Phase 0 syncs branches and fixes P0 breakage (dead nav, broken redirects). Phase 1 resolves DRY violations (Ideas, field-officer portal) and audits entity ownership in Supabase. Phase 2 is a full security audit of the 55 public routes — RLS policies, token validation, rate limiting — verified by Supabase MCP queries and E2E tests. Phase 3 brings nav-surface parity: every orphan route is either wired into a nav surface or documented as intentionally hidden. Phase 4 enforces cross-app consistency: DB nav overlay wiring, AppSwitcher parity, mobile drawer, ARIA, and theme-token compliance in all nav shells. Phase 5 runs a full visual QA at all breakpoints using live deployments. Phase 6 builds a **live Route & Nav Inspector** in the Developer Portal — the in-app equivalent of `docs/nav/index.html` — integrated with the existing Page Builder, Feature Builder, and Nav Editor so operators can manage routes and nav visually, create DB overlays from orphan routes, and inspect cross-app coverage in real time. Phase 7 delivers CI gating, updated findings, and the merge PR.

**Tech Stack:** React 19 (wouter / React Router v6 / v7), Next.js 16 App Router, Supabase (RLS, `tenant_navigation`, PostgREST), Vercel (per-app deploys), `@bsuite/nav-core`, `@bsuite/schema-registry`, `@bsuite/theme`, Playwright, `pnpm`

**Source:** `docs/nav/findings.md` + `docs/nav/route-inventory.json` (555 routes, generated 2026-08-14)

---

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence (re-run `python3 docs/nav/build-inventory.py` and diff after every phase) | §9.2 visual-equivalence (screenshot every touched nav at 375 / 768 / 1440)
- **Equivalence target**: `docs/nav/route-inventory.json` before vs after; each change must reduce finding count without introducing new ones
- **Cross red-team**: `agent-red-implement` verifies evidence rows before flip-to-done at every gate
- **Skills to load**: see §Skills matrix below — 28 skills across 7 phases
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

---

## Pre-flight: Branch Sync

Before any work begins:

1. **Sync development ↔ main:**

```bash
git fetch origin
git diff origin/main..origin/development --stat
git log origin/main..origin/development --oneline
```

2. **All work on feature branches off `development`** — one branch per phase
3. **PRs target `development`** — never direct-push to main
4. **Promotion to main only after operator review** of the completed plan
5. **Verify `.env.local` has live login creds** — needed for visual inspections

---

## Phase 0 — P0 Fixes (dead nav, broken redirects)

**Gate skills:** `test-playwright`, `agent-red-implement`
**MCPs:** `playwright`, `context7` (React Router redirect API)

### Task 0.1: Remove dead `/todos` nav link in throughput

**Finding:** `findings.md §2` — `throughput/src/components/Navigation.tsx:65` links to `/todos`, no route exists.

**Files:**

- Modify: `throughput/src/components/Navigation.tsx:65` — delete the `/todos` entry

**Steps:**

1. Read the file, confirm the dead entry
2. Remove the object `{ label: 'Todos', path: '/todos', icon: ListChecks }` from `navItems`
3. Run `python3 docs/nav/build-inventory.py` — orphan count must drop to 0
4. @skill `test-playwright`: Start throughput dev server (`pnpm --filter throughput dev`), screenshot nav at 1440px, confirm "Todos" gone
5. Commit: `fix(throughput): remove dead /todos nav link`

### Task 0.2: Verify all conduit redirect targets resolve

**Finding:** `findings.md §3` — conduit has 3 redirects (`/dashboard`, `/pipeline`, etc.) whose targets were not captured.

**Files:**

- Read: all conduit routes with `status: redirect` in `route-inventory.json`
- Read: the source file for each, confirm `redirect()` target exists as a live route

**Steps:**

1. Query the JSON for conduit redirects
2. For each, read the source file and confirm the target path exists in the same app's route table
3. If any target is broken → fix the redirect or remove it
4. Commit if changes made

### ⛨ Gate 0

- [ ] `build-inventory.py` re-run: 0 orphans
- [ ] Throughput nav screenshot: no "Todos"
- [ ] All conduit redirects: targets verified
- [ ] @skill `agent-red-implement`: no regressions in other nav items
- **Escalation:** Broken redirect target → `high` tier for cross-app impact

---

## Phase 1 — DRY Entity Deduplication

**Gate skills:** `check-dry-one-shot`, `bsuite-rls-authz-red-team`, `agent-red-implement`
**MCPs:** `supabase` (query `tenant_navigation`, check RLS on ideas/field-officer tables), `qig-memory` (record DRY rulings as `bsuite_` precedent)

### Task 1.1: Resolve Ideas CRUD duplication (BSU + throughput)

**Finding:** `findings.md §5.1` — `/ideas/new` and `/ideas/:id` live in both apps.

**Files:**

- Read: `business-suite-unified/src/components/AppContent.tsx:371-372`
- Read: `business-suite-unified/src/pages/IdeaHub.tsx`, `NewIdea.tsx`, `IdeaDetail.tsx`
- Read: `throughput/src/App.tsx:203-208`

**Steps:**

1. Read both implementations — do they share a Supabase table?
2. @mcp `supabase`: `execute_sql` → `SELECT * FROM information_schema.columns WHERE table_name = 'ideas' ORDER BY ordinal_position` — confirm table exists and check for `tenant_id` scope
3. @mcp `supabase`: Check RLS policies → `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'ideas'`
4. If BSU's pages are lightweight stubs → replace with cross-app redirect via `buildLaunchUrl(throughputOrigin(), path)`. If full implementations → decide canonical owner, redirect the other
5. @skill `check-dry-one-shot`: Verify the Ideas entity now has exactly one CRUD home
6. Commit: `refactor(bsu): redirect /ideas/* to throughput (DRY one-shot)`

### Task 1.2: Resolve `/portal/field-officer` duplication (conduit + crm7)

**Finding:** `findings.md §5.2` — identical URL path, two live implementations.

**Files:**

- Read: `conduit/src/app/portal/field-officer/page.tsx`
- Read: crm7's `FieldOfficerPortal` component (lazy import from `src/App.tsx:3670`)

**Steps:**

1. Compare: what tables does each query? Who is the target user (conduit recruiter vs crm7 GTO field officer)?
2. @mcp `supabase`: Check `field_officer_assignments`, `field_officer_visits` table usage → which app reads/writes?
3. If same data → redirect lesser to canonical. If different personas → rename to disambiguate paths
4. @skill `bsuite-rls-authz-red-team`: If both write to the same table → verify RLS prevents cross-tenant data leakage
5. Commit

### Task 1.3: Audit `/settings/organization` + `/settings/branding` duplication (BSU + crm7)

**Finding:** `findings.md §3` — both apps expose live org-settings and branding-settings pages.

**Files:**

- Read: `business-suite-unified/src/pages/Settings.tsx` (or equivalent)
- Read: `crm7/src/pages/Settings/SettingsOrganization.tsx`, `crm7/src/pages/Settings/BrandingRedirect.tsx`

**Steps:**

1. Identify which Supabase table each writes to — `organizations`? `tenants`? `tenant_branding`?
2. @mcp `supabase`: `SELECT * FROM pg_policies WHERE tablename IN ('organizations', 'tenants', 'tenant_branding')` — do both paths have the same RLS context?
3. If identical data destination → one must redirect or be scoped (e.g., BSU = platform admin, crm7 = tenant admin). Document the boundary
4. @skill `general-dry-one-shot-architecture`: Full entity-ownership sweep on `organizations`, `tenants`, `tenant_branding`
5. Commit

### ⛨ Gate 1

- [ ] @skill `check-dry-one-shot`: Zero remaining DRY violations in findings
- [ ] @skill `agent-red-implement`: Cross-app links survive deduplication
- [ ] @mcp `supabase`: RLS policies on `ideas`, `field_officer_*`, `organizations` verified
- [ ] Login as test user → navigate to redirected routes → confirm SSO handoff works
- [ ] @skill `auth-e2e-sso-testing`: Cross-app redirect triggers BS OAuth PKCE correctly
- [ ] @mcp `qig-memory`: Record DRY rulings as `bsuite_dry_rulings_20260814`
- **Escalation:** Both apps write to the same table with different RLS → `frontier` tier + `bsuite-rls-authz-red-team`

---

## Phase 2 — Security Audit (55 public routes)

**Gate skills:** `bsuite-rls-authz-red-team`, `check-security`, `auth-e2e-sso-testing`, `auth-oauth-local-testing`, `test-playwright`
**MCPs:** `supabase` (RLS policy queries, `execute_sql`), `playwright` (unauthenticated browsing)

### Task 2.1: Audit conduit public API + portal routes

**Finding:** `findings.md §6` — `/api/public/jobs-feed` is a public JSON endpoint; `/portal/careers/:jobId/apply` accepts unauthenticated form submissions.

**Files:**

- Read: `conduit/src/app/api/public/jobs-feed/route.ts`
- Read: `conduit/src/app/portal/careers/[jobId]/apply/page.tsx`
- Read: `conduit/src/lib/supabase/middleware.ts` — confirm `publicPaths`

**Steps:**

1. Read the jobs-feed route handler — does it filter by `is_published = true`? Does it expose PII?
2. @mcp `supabase`: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'jobs'` — verify anon SELECT restricted to published only
3. Read the apply page — what table does it INSERT to? Rate-limited?
4. @mcp `supabase`: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'applications'` — verify anon INSERT restricted
5. @skill `test-playwright`: Navigate to `/api/public/jobs-feed` unauthenticated, verify response schema has no PII columns
6. @skill `test-playwright`: Navigate to `/portal/careers/1/apply` unauthenticated, verify form renders, submit test → verify RLS blocks invalid tenant
7. If issues found → `gh issue create --title "SEC-P1: ..." --label security`

### Task 2.2: Audit crm7 token-gated public routes

**Finding:** `findings.md §6` — `/quotes/sign/:token`, `/hosts/agreements/sign/:token`, `/portal/accept-invite/:token`

**Files:**

- Read: crm7 components for each (lazy imports from `src/App.tsx:1271-1287`)

**Steps:**

1. For each token route: read the component, trace the token validation flow
2. Verify: server-side validation (not just client-side), expiry check, single-use enforcement, UUID v4 minimum
3. @mcp `supabase`: Check the token storage table — `SELECT column_name, data_type FROM information_schema.columns WHERE table_name LIKE '%tokens%' OR table_name LIKE '%invitations%'` — look for `expires_at`, `used_at` columns
4. @skill `auth-e2e-sso-testing`: Attempt to use an expired token, a used token, a fabricated token → all must 403/404
5. If any check fails → P0 security issue

### Task 2.3: Audit BSU embed and OAuth consent routes

**Finding:** `findings.md §6` — `/embed/lead-form` writes without auth; `/oauth/consent` displays client info.

**Files:**

- Read: BSU embed and OAuth components

**Steps:**

1. Check `/embed/lead-form` — table written, CAPTCHA presence, tenant context validation
2. Check `/oauth/consent` — does it validate `client_id` against `oauth_clients`? Can a crafted URL show arbitrary client info?
3. @mcp `supabase`: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'oauth_clients'` + `leads`
4. @skill `check-security`: Full OWASP scan on the embed and OAuth routes
5. File issues for gaps

### Task 2.4: Audit braden public content routes

**Finding:** `findings.md §6` — `/:slug`, `/apprenticeships`, `/traineeships`, `/recruitment` are public and may pull tenant-influenced data.

**Files:**

- Read: `braden/src/pages/DynamicPage.tsx`, `Apprenticeships.tsx`, etc.

**Steps:**

1. Determine if these are static marketing or if they query Supabase
2. If they query → verify they use the anon key and the query is not tenant-scoped (braden is a marketing site, not a tenant app)
3. @mcp `supabase`: Verify no anon RLS policy grants SELECT on tenant-scoped content to braden's origin
4. Document findings

### ⛨ Gate 2

- [ ] @skill `bsuite-rls-authz-red-team`: Full red-team on all 55 public routes with 4-persona matrix (anon, authenticated, admin, super_admin)
- [ ] @skill `check-security`: Scan all touched files for OWASP top 10
- [ ] @skill `auth-e2e-sso-testing`: Token-gated routes tested with expired/used/invalid tokens
- [ ] @mcp `supabase`: Every public-route table has been queried for RLS policies
- [ ] @mcp `playwright`: Unauthenticated access to each flagged route — screenshot + response inspection
- [ ] All findings documented in `findings.md §6` with issue links
- **Escalation:** Unauthenticated write to tenant-scoped table without rate-limit → P0, `frontier` tier, notify operator immediately

---

## Phase 3 — Navigation Completeness

**Gate skills:** `test-playwright`, `test-qa-and-verification`, `bsuite-context`, `bsuite-page-grid-layout`, `web-ui-ux-patterns`, `agent-red-implement`
**MCPs:** `playwright` (visual nav testing), `supabase` (check `tenant_navigation` for orphan overlays), `context7` (React Router / Next.js nav patterns)

### Task 3.1: Wire throughput utility pages into header/avatar menu

**Finding:** `findings.md §1` — `/monitoring`, `/profile`, `/settings`, `/notifications` have no nav surface.

**Files:**

- Read: `throughput/src/components/Navigation.tsx` — the top nav
- Read: `throughput/src/components/layout/MainContent.tsx` — the shell
- Potentially modify: add UserNav dropdown or bell icon if missing

**Steps:**

1. Check if avatar dropdown exists — does it expose `/profile`, `/settings`?
2. Check if bell icon exists — does it expose `/notifications`?
3. If not → build avatar dropdown and bell icon following crm7 or R80.4 patterns (they already have `UserNav`)
4. @skill `web-ui-ux-patterns`: Ensure dropdown follows platform conventions
5. @skill `bsuite-design-sheriff`: Verify D2C Neon Electric tokens used, no hardcoded colours
6. @skill `test-playwright`: Screenshot at 375/768/1440 — dropdown visible and functional
7. Commit

### Task 3.2: Add conduit `/settings/schema-builder` to nav

**Finding:** `findings.md §1` — BSU and crm7 have schema-builder in Settings nav; conduit doesn't.

**Files:**

- Modify: `conduit/src/config/navigation.ts`

**Steps:**

1. Read the conduit nav config — find the Admin > Settings section
2. Add `{ label: 'Schema Builder', href: '/settings/schema-builder', requiredPermission: 'view_settings' }`
3. @skill `bsuite-context`: Confirm the permission name matches conduit's middleware RBAC
4. @skill `test-playwright`: Login → Settings → verify Schema Builder tab appears
5. Commit

### Task 3.3: Audit crm7 in-page sub-navigation (86 orphan pages)

**Finding:** `findings.md §1` — 86 crm7 standalone pages with no sidebar link. Expected to be reachable via parent-section tab bars.

**Files:**

- Read: representative parents: `Settings.tsx`, `Compliance.tsx`, `Documents.tsx`, `WHS.tsx`, `Financial.tsx`, `Payroll.tsx`, `Claims.tsx`, `HR.tsx`, `GTO.tsx`

**Steps:**

1. For each parent section, verify it renders a tab bar or sub-nav linking to all its children
2. Spot-check 3 deep pages per section — navigate there by URL, confirm there is a breadcrumb or tab to return to the parent
3. @skill `test-playwright`: Automate — visit each parent, assert child links exist as `<a>` or `<Link>` with the child path
4. @skill `web-ui-ux-patterns`: Any section head without a tab bar → add one matching the existing pattern (e.g., shadcn `Tabs` or the crm7 `SubNav` component if one exists)
5. If adding sub-nav → @skill `bsuite-design-sheriff` + `bsuite-brand-system`: verify D2C tokens, consistent spacing, hover states
6. Commit in batches by functional area

### Task 3.4: Verify BSU Developer Portal tab completeness

**Finding:** 25 `/developer/*` routes have no sidebar entry — should all be tabs in the Developer Portal shell.

**Files:**

- Read: `business-suite-unified/src/pages/Developer/index.tsx` — the tab registry

**Steps:**

1. Extract registered tab paths from `Developer/index.tsx`
2. Cross-reference with `/developer/*` routes in `route-inventory.json`
3. Any route not in the tab bar → add it or mark as intentionally hidden (e.g., `/developer/functions/new` is a create form, not a tab)
4. @skill `test-playwright`: Login as developer, screenshot Developer Portal, verify tab count matches
5. Commit

### Task 3.5: Verify braden marketing page links from home

**Finding:** `findings.md §1` — `/apprenticeships`, `/traineeships`, `/recruitment`, `/products` have no nav entry but are public marketing pages.

**Files:**

- Read: `braden/src/pages/Index.tsx` — check for links to these pages
- Read: `braden/src/config/navigation.ts` — check `navigationItems`

**Steps:**

1. Are these pages linked from the homepage hero, service cards, or CTA buttons?
2. If not linked from any rendered surface → either add to nav or add CTA links on the homepage
3. @skill `test-playwright`: Visit `www.braden.com.au` (or local dev), click through from home, verify each marketing page is reachable
4. Commit

### ⛨ Gate 3

- [ ] @skill `test-qa-and-verification`: Full QA pass on all nav changes
- [ ] @skill `test-verify-before-completion`: Route counts match, nav-surface distribution improved
- [ ] @skill `agent-red-implement`: Red-team all nav additions
- [ ] @mcp `playwright`: Screenshots at 375/768/1440 for every modified app
- [ ] Login-based visual inspection (`.env.local` creds) for each modified app
- [ ] Re-run `build-inventory.py` — compare before/after: orphan route ratio must drop
- **Escalation:** Adding sub-nav changes component API surface → `standard` tier arch review

---

## Phase 4 — Cross-App Consistency & Platform Parity

**Gate skills:** `bsuite-design-sheriff`, `bsuite-brand-system`, `bsuite-shared-ui-rollouts`, `check-code-quality`, `check-feature-parity`, `web-shadcn`, `machine-vercel-react-best-practices`, `agent-red-implement`
**MCPs:** `supabase` (`tenant_navigation` RLS + row audit), `context7` (@bsuite/nav-core API), `playwright` (visual diff), `chrome-devtools` (computed style inspection)

### Task 4.1: Wire DB nav overlay into R80.4, throughput, and BSU

**Finding (from survey):**

- crm7 ✅ and conduit ✅ have `useTenantNavigation` + `mergeNavConfigs` wired
- R80.4 ❌, throughput ❌ have zero calls
- BSU has `mergeNavConfigs` (1 ref) but no `useTenantNavigation` (0 refs) — the Nav Editor at `/developer/nav` writes to `tenant_navigation` but BSU's own sidebar doesn't consume it
- braden ❌ — **intentionally excluded** per Phase 5 §7.4 D-06 (platform-only; skip)

**Files:**

- Modify: `R80.4/src/components/layout/SidebarNav.tsx` — add `useTenantNavigation(supabase, 'r8')` + `mergeNavConfigs`
- Modify: `throughput/src/components/Navigation.tsx` — add `useTenantNavigation(supabase, 'throughput')` + `mergeNavConfigs`
- Modify: `business-suite-unified/src/components/AppSidebar.tsx` — wire `useTenantNavigation(supabase, 'bsu')`

**Steps:**

1. Read crm7's `useMergedNavConfig()` at `crm7/src/config/navigation.ts:623` — this is the reference implementation
2. @skill `bsuite-context`: Confirm `@bsuite/schema-registry` is a dependency of each target app
3. @mcp `context7`: Look up `@bsuite/nav-core` → `mergeNavConfigs` API to confirm signature
4. Replicate the pattern in R80.4, throughput, and BSU:

```typescript
import { mergeNavConfigs } from '@bsuite/nav-core'
import { useTenantNavigation } from '@bsuite/schema-registry/react'

export function useMergedNavConfig(supabase) {
  const { navConfig: dbNav } = useTenantNavigation(supabase, '<app_scope>')
  return dbNav ? mergeNavConfigs(STATIC_NAV_CONFIG, dbNav) : STATIC_NAV_CONFIG
}
```

5. Wire the merged config into each app's sidebar renderer
6. @mcp `supabase`: Verify `tenant_navigation` CHECK constraint allows the new app_scopes → `SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'tenant_navigation'::regclass`
7. If CHECK constraint needs updating → write a migration (migration collision protocol per memory)
8. @skill `bsuite-pnpm-monorepo`: If `@bsuite/schema-registry` is not yet a dep → add it via pnpm outside the bsuite tree (lockfile generation rules)
9. @skill `test-playwright`: Login as developer → open BSU Nav Editor → create a test overlay for R80.4 → verify it appears in R80.4's sidebar
10. Commit per app

### Task 4.2: AppSwitcher parity — wire into braden

**Finding (from survey):** braden has 0 AppSwitcher references. Every other app has it in its header. A user on `www.braden.com.au` who is logged in as an admin has no way to switch to other BSuite apps.

**Files:**

- Read: `braden/src/components/Navigation.tsx` — the header component
- Read: `R80.4/src/components/layout/AppHeader.tsx` — reference implementation
- Modify: braden's header to include `<AppSwitcher>` when user is authenticated

**Steps:**

1. Import `AppSwitcher` and `getBSuiteApps` from `@bsuite/nav-core`
2. Only show when `isAdmin` is true (braden is mostly public; switcher is for logged-in admins)
3. @skill `bsuite-brand-system`: AppSwitcher must use Braden corporate tokens (Red/Gold), NOT D2C Neon Electric — braden is BRADEN-EXEMPT
4. @skill `bsuite-design-sheriff`: Verify no oklch tokens leak into braden's admin header
5. @skill `test-playwright`: Login as admin on braden, screenshot header, verify AppSwitcher dropdown works
6. Commit

### Task 4.3: Cross-app suite link parity

**Finding (from survey):** throughput has only 2 cross-app link refs (vs crm7's 60, BSU's 56). R80.4 has 11 (suiteLinks in sidebar footer). Verify all 6 apps have consistent `suiteLinks` in their sidebar or footer.

**Files:**

- Read: each app's nav config `suiteLinks` section
- Compare: are the same destination apps listed in each? Are `buildLaunchUrl` targets correct?

**Steps:**

1. Extract `suiteLinks` from each app's `navigation.ts` (or `Navigation.tsx` for throughput)
2. Build a matrix: which apps link to which other apps
3. Every app must link to all other apps it is not (5 outbound links each)
4. For any missing link → add it using `buildLaunchUrl` from `@bsuite/nav-core`
5. @skill `check-feature-parity`: Cross-app link matrix must be symmetric
6. Commit per app

### Task 4.4: ARIA / accessibility parity in nav shells

**Finding (from survey):**

- conduit: 0 aria/role attributes in nav components (critical gap)
- braden: 3 (minimal)
- R80.4: 19, crm7: 34, BSU: 21, throughput: 28

**Files:**

- Modify: `conduit/src/components/DashboardShell.tsx`, `conduit/src/components/portal/PortalSidebar.tsx`
- Modify: `braden/src/components/navigation/DesktopMenu.tsx`, `MobileMenu.tsx`

**Steps:**

1. @skill `web-ui-ux-patterns`: Audit all nav components for WCAG 2.1 AA compliance — `role="navigation"`, `aria-label`, `aria-expanded` on collapsibles, `aria-current="page"` on active items
2. @mcp `context7`: Look up shadcn/ui `NavigationMenu` ARIA requirements
3. Add missing attributes to conduit and braden nav shells
4. @skill `bsuite-design-sheriff`: Verify focus-ring visibility, no colour-only encoding, contrast ratios in nav items
5. @mcp `chrome-devtools`: Lighthouse accessibility audit on each app's nav
6. Commit

### Task 4.5: Theme-token compliance in nav components

**Finding (from survey):** crm7 header uses `var(--brand-primary)` (correct). Need to verify all nav shells use semantic tokens, not hardcoded colours.

**Files:**

- All layout/nav component files across 6 apps

**Steps:**

1. @skill `bsuite-design-sheriff`: Scan all nav components for hardcoded hex/rgb — `grep -rn "#[0-9a-fA-F]\{3,8\}" */src/components/layout/ */src/layouts/ */src/components/navigation/`
2. Replace any hardcoded colours with `@bsuite/theme` semantic tokens (D2C apps) or Braden corporate tokens (braden app)
3. @skill `bsuite-brand-system`: Verify the `--gradient-accent` wordmark is on the logo in every app header
4. @skill `bsuite-wordmark-gradient`: Confirm gradient renders correctly at all breakpoints
5. @mcp `chrome-devtools`: Inspect computed styles on nav elements — verify oklch values resolve correctly
6. Commit

### Task 4.6: Mobile nav / responsive parity

**Finding (from survey):** throughput has only 2 mobile nav refs; BSU has 2. crm7 and conduit have 12 each. Verify all apps have a functional mobile nav experience.

**Files:**

- Read: each app's mobile nav implementation
- Check: hamburger button, slide-out drawer, bottom nav

**Steps:**

1. For each app at 375px: is there a hamburger / drawer? Does it render all nav items?
2. @skill `test-playwright`: Resize to 375px for each app, screenshot, verify mobile nav is present and functional
3. If any app is missing mobile nav → implement using `MobileSidebarDrawer` from `@bsuite/nav-core` (already used by conduit's PortalSidebar and R80.4's AppShell)
4. @skill `web-shadcn`: Verify drawer component follows shadcn/ui `Sheet` patterns
5. @skill `machine-vercel-react-best-practices`: Verify no layout shift on nav toggle
6. Commit per app

### ⛨ Gate 4

- [ ] @skill `bsuite-design-sheriff`: Full sweep — zero hardcoded colours in nav shells
- [ ] @skill `bsuite-brand-system`: Wordmark gradient renders in all 6 app headers
- [ ] @skill `check-feature-parity`: DB nav overlay, AppSwitcher, suiteLinks, mobile nav — all at parity
- [ ] @skill `check-code-quality`: No dead imports, consistent component naming, barrel exports
- [ ] @skill `agent-red-implement`: Red-team all parity changes
- [ ] @mcp `supabase`: `tenant_navigation` CHECK constraint allows all 5 app_scopes (braden excluded by design)
- [ ] @mcp `playwright`: Screenshots at 375/768/1440 for all 6 apps
- [ ] @mcp `chrome-devtools`: Lighthouse accessibility audit ≥90 on each app's nav
- **Escalation:** Theme token mismatch across apps → `standard` tier + `bsuite-shared-ui-rollouts`

---

## Phase 5 — Live Visual QA

**Gate skills:** `test-exploratory-qa`, `test-playwright`, `bsuite-user-advocate`, `test-verify-before-completion`
**MCPs:** `playwright` (full E2E), `chrome-devtools` (performance, console errors)

### Task 5.1: Full E2E nav walkthrough per app

**Steps:**

1. Login via `.env.local` creds to each app's production or preview URL
2. @skill `bsuite-user-advocate`: Red-team from 3 perspectives:
   - **End user** (apprentice portal, field officer portal): can they reach everything they need?
   - **Developer-user** (developer portal, schema builder): are all tabs accessible?
   - **Tenant admin** (settings, branding, permissions): complete CRUD reachability?
3. @skill `test-playwright`: Automated walkthrough — click every sidebar item, verify page loads without console errors
4. @mcp `chrome-devtools`: Check for console errors, network 4xx/5xx, layout shift on each page
5. @skill `test-exploratory-qa`: Free-form exploratory testing — find anything the structured tests missed

### Task 5.2: Cross-app SSO nav flow

**Steps:**

1. Start at BSU → click suite link to CRM7 → verify SSO handoff → arrive authenticated
2. CRM7 → click suite link to R80.4 → verify
3. R80.4 → suite link to conduit → verify
4. Conduit → suite link to throughput → verify
5. @skill `auth-e2e-sso-testing`: Automate the full ring (BSU → CRM7 → R80.4 → conduit → throughput → BSU)
6. Screenshot each landing page after SSO handoff

### Task 5.3: Dark mode / light mode nav verification

**Steps:**

1. For each D2C app (BSU, CRM7, Conduit, R80.4, Throughput): toggle dark/light mode
2. @mcp `chrome-devtools`: Verify nav shell background, text, border tokens swap correctly
3. @skill `bsuite-design-sheriff`: No white text on white bg, no invisible focus rings
4. Screenshot both modes at 1440px per app

### ⛨ Gate 5

- [ ] @skill `bsuite-user-advocate`: APPROVE from all 3 personas
- [ ] @skill `test-verify-before-completion`: All evidence screenshots captured
- [ ] @skill `agent-red-implement`: Final red-team — zero open defects
- [ ] @mcp `chrome-devtools`: Zero console errors on any nav page, Lighthouse perf ≥80
- [ ] Cross-app SSO ring completed without manual intervention
- **Escalation:** SSO handoff failure → P0, `frontier` tier, `auth-e2e-sso-testing` + operator notification

---

## Phase 6 — Developer Portal Nav Inspector & Visual Route Management

**Gate skills:** `bsuite-developer-portal`, `bsuite-page-grid-layout`, `web-ag-grid`, `web-dnd-kit`, `web-shadcn`, `web-tanstack-table`, `bsuite-design-sheriff`, `agent-red-implement`, `test-playwright`
**MCPs:** `supabase` (tenant_navigation CRUD, custom_pages), `playwright` (visual testing), `chrome-devtools` (perf), `context7` (AG Grid, shadcn Tabs, DnD Kit APIs)

### Context

The Developer Portal already has three visual authoring surfaces:
- **Navigation Editor** (`/developer/nav`) — CRUD on `tenant_navigation` rows, overlay on static nav
- **Page Builder / Feature Builder** (`/developer/pages`, `/developer/feature-builder`) — visual page composition
- **Routing Editor** (`/developer/routing`) — tenant route config

This phase adds a fourth surface: a **live Route & Nav Inspector** that shows the merged state of static + DB navigation across all apps, highlights gaps and conflicts, and lets operators fix them in-place. It is the in-app equivalent of `docs/nav/index.html` — but live, tenant-aware, and writable.

### Task 6.1: Build the Route Inspector tab in Developer Portal

**Files:**

- Create: `business-suite-unified/src/pages/Developer/RouteInspector.tsx`
- Modify: `business-suite-unified/src/pages/Developer/index.tsx` — register new tab

**Steps:**

1. Read the existing Developer Portal tab structure at `Developer/index.tsx:187-272` — follow the same lazy-load + sub-route pattern
2. Register `/developer/route-inspector` as a new tab between "Routing" and "Embed"
3. Build the inspector component with three views (matching `docs/nav/index.html`):

   **(a) App Tree view** — collapsible route tree per app scope. Data source: static nav config (imported) merged with `tenant_navigation` rows from Supabase. Show:
   - Path, component, auth type, nav surface, status
   - Colour-coded status badges (live/redirect/orphan) — D2C tokens, no colour-only encoding
   - Expandable detail panel showing `evidence` (file:line), permissions, feature flags

   **(b) Cross-app Matrix** — rows = URL prefix, columns = app scopes. Cells = route count. Heatmapped. Click a cell → filter the tree to those routes

   **(c) Findings Panel** — auto-computed from the live data:
   - Orphan routes (nav.surface = none + status = live)
   - Dead nav (DB entries pointing to non-existent routes)
   - DRY violations (same path in >1 app)
   - Public routes reading tenant tables (auth.type = public + known tenant tables)

4. @skill `web-tanstack-table`: Use TanStack Table for the route list — virtual scrolling needed for crm7's 401 routes
5. @skill `web-shadcn`: Use shadcn `Tabs`, `Badge`, `Collapsible`, `Table`, `Input` (search), `Select` (filters)
6. @skill `bsuite-design-sheriff`: D2C Neon Electric tokens throughout. Error = red (#ef4444), not purple
7. @skill `bsuite-page-grid-layout`: If the inspector should be a DraggableCardPage, use the `pageKey: 'bsu-route-inspector'` pattern
8. Commit

### Task 6.2: Wire live data from `tenant_navigation` + static configs

**Files:**

- Modify: `RouteInspector.tsx` — data fetching layer

**Steps:**

1. For the current tenant's nav overlays: `supabase.from('tenant_navigation').select('*').eq('tenant_id', tenantId)` — shows what the Nav Editor has authored
2. For static configs: import each app's `NAV_CONFIG` from `@bsuite/nav-core` types (or duplicate the static data as a JSON blob at build time — the inspector reads, never writes, the static configs)
3. For route definitions: load `docs/nav/route-inventory.json` as a static asset (committed, not fetched from Supabase) — this is the source of truth for what routes exist in code
4. @mcp `supabase`: `list_tables` → verify `tenant_navigation` structure matches what the inspector expects
5. Merge static + DB using `mergeNavConfigs` to show the tenant's actual effective navigation
6. @skill `web-tanstack-query`: Use `useQuery` for the Supabase fetch, `useSuspenseQuery` if inside Suspense
7. Commit

### Task 6.3: Add inline editing for DB nav overlays

**Files:**

- Modify: `RouteInspector.tsx` — edit capabilities

**Steps:**

1. For DB-sourced nav entries (from `tenant_navigation`): allow inline edit of label, icon, order, section assignment
2. Re-use the mutation patterns from the existing Nav Editor (`/developer/nav`) — `save_tenant_navigation` RPC or direct table upsert
3. For static-code nav entries: show as read-only with a "Code-defined" badge. Link to the source file (display `evidence` as a clickable path)
4. @skill `web-dnd-kit`: Allow drag-and-drop reordering of DB nav items (same pattern as the existing Nav Editor)
5. @skill `web-forms-validation`: Zod schema for nav item edits — validate label length, href format, icon name
6. @mcp `supabase`: Verify RLS allows the `developer` / `platform_admin` roles to write `tenant_navigation`
7. Commit

### Task 6.4: Integrate with existing Page Builder and Feature Builder

**Files:**

- Read: `business-suite-unified/src/pages/Developer/Pages.tsx` (PageComposer)
- Read: `business-suite-unified/src/pages/Developer/FeatureBuilder.tsx`
- Modify: `RouteInspector.tsx` — cross-links

**Steps:**

1. When viewing a route that corresponds to a custom page (`/p/:slug`) → add a "Edit in Page Builder" button linking to `/developer/pages?page=<slug>`
2. When viewing a route with a Feature Builder definition → add an "Edit Feature" button linking to `/developer/feature-builder?feature=<id>`
3. From the Page Builder / Feature Builder → add a "View in Route Inspector" back-link
4. When the Nav Editor creates a new DB nav entry → the Route Inspector should reflect it immediately (TanStack Query invalidation via Supabase Realtime, same pattern as `DashboardShell.tsx:66-93` in conduit)
5. @skill `bsuite-developer-portal`: Follow the existing cross-tab linking patterns in the Developer Portal
6. Commit

### Task 6.5: Visual route creation flow

**Files:**

- Modify: `RouteInspector.tsx` — "Add Route to Nav" action

**Steps:**

1. When viewing an orphan route (code-defined but no nav entry), show an "Add to Navigation" button
2. Clicking it opens a dialog pre-filled with the route's path, suggesting a label (derived from component name), icon (from a curated set), and section (from existing sections)
3. On submit → inserts into `tenant_navigation` for the route's app_scope
4. The tree view updates in real-time (Supabase Realtime subscription)
5. @skill `web-shadcn`: Use shadcn `Dialog`, `Form`, `Select`, `Input`
6. @skill `web-forms-validation`: Zod schema for the nav entry creation form
7. @skill `bsuite-design-sheriff`: Dialog follows D2C modal patterns
8. @mcp `supabase`: Verify the INSERT respects the `app_scope` CHECK constraint
9. Commit

### ⛨ Gate 6

- [ ] @skill `bsuite-developer-portal`: Inspector tab appears in Developer Portal, all 3 views render
- [ ] @skill `test-playwright`: Login as developer → open Route Inspector → verify tree shows 555 routes, matrix is populated, findings panel auto-computes
- [ ] @skill `web-tanstack-table`: Virtual scrolling handles crm7's 401 routes without lag
- [ ] @skill `bsuite-design-sheriff`: D2C tokens, no hardcoded colours, error = red
- [ ] @skill `agent-red-implement`: Red-team the inspector — can a non-developer access it? Does inline edit respect RLS?
- [ ] @mcp `supabase`: Verify writes to `tenant_navigation` are scoped to the authenticated tenant
- [ ] @mcp `chrome-devtools`: Performance audit — inspector loads in <2s even with crm7's 401 routes
- [ ] Cross-link round-trip: Route Inspector → Page Builder → back to Route Inspector → works
- [ ] "Add to Navigation" flow tested: create DB overlay entry, verify it appears in the target app's sidebar
- **Escalation:** Inspector exposes routes or data to roles below `developer` → P0, `frontier` tier

---

## Phase 7 — CI, Documentation, Merge (formerly Phase 6)

**Gate skills:** `agent-red-implement`, `check-dry-one-shot`, `bsuite-rls-authz-red-team`, `test-verify-before-completion`, `bsuite-plans-keeper`
**MCPs:** `qig-memory` (session summary), `github` (PR creation)

### Task 6.1: Re-generate route-inventory.json and update findings.md

**Steps:**

1. `python3 docs/nav/build-inventory.py` — capture new route count
2. Diff against the Phase 0 baseline — document all changes
3. Update `findings.md` — mark resolved items with ✅ and commit SHA
4. Update `index.html` rendering if schema changed
5. Verify §9.1: re-run produces identical output

### Task 6.2: Wire `build-inventory.py` into CI

**Files:**

- Create: `.github/workflows/route-inventory.yml`

**Steps:**

1. Create workflow triggered on PRs touching route/nav files (see Phase 0 plan for path list)
2. Step: `python3 docs/nav/build-inventory.py`
3. Step: diff generated JSON against committed JSON → warn on drift
4. @skill `bsuite-platform`: Verify CI workflow uses Node 24, pnpm, correct submodule checkout
5. Commit

### Task 6.3: Record session state

**Steps:**

1. @mcp `qig-memory`: `memory_put` → `bsuite_nav_remediation_20260814` with session summary, what shipped, what deferred
2. @skill `bsuite-plans-keeper`: Update this plan doc status from `D` (Draft) to `A` (Approved) after operator sign-off

### Task 6.4: Final PR

**Steps:**

1. Create PR from feature branch to `development`
2. Include §9 evidence block:

```markdown
## Evidence
- [x] Output-equivalence (§9.1): before/after route-inventory.json diff — N findings resolved
- [x] Visual-equivalence (§9.2): screenshots at 375/768/1440 for all 6 apps
- [x] Self-report block: [list any known divergences]
- [x] Tests run: build-inventory.py exits 0, Playwright suite green
- [x] Live verify: login-based screenshots for each app with nav changes
```

### ⛨ Final Gate

- [ ] @skill `agent-red-implement`: Full red-team of all changes across all 6 apps
- [ ] @skill `check-dry-one-shot`: Zero DRY violations
- [ ] @skill `bsuite-rls-authz-red-team`: Zero auth gaps
- [ ] @skill `check-security`: Zero new security findings
- [ ] @skill `bsuite-design-sheriff`: Zero hardcoded colours in nav components
- [ ] @skill `check-feature-parity`: DB nav, AppSwitcher, suiteLinks, mobile nav — all at parity
- [ ] @skill `test-verify-before-completion`: All evidence rows filled
- [ ] @skill `bsuite-user-advocate`: APPROVE from all 3 personas
- [ ] **Operator review — WAIT for approval before merge**
- **Escalation:** Red-team SEND_BACK → return to the phase that introduced the regression

---

## Skills Matrix

| Skill | Phases | Purpose |
|-------|--------|---------|
| `bsuite-context` | All | Project context, nav config locations, file paths |
| `bsuite-design-sheriff` | 3, 4, 5, 6, Final | D2C theme compliance, shadcn consistency, oklch enforcement |
| `bsuite-brand-system` | 4, 5, 6 | Two-brand enforcement (D2C vs Braden corporate), wordmark gradient |
| `bsuite-wordmark-gradient` | 4 | Gradient-text doctrine on app headers |
| `bsuite-shared-ui-rollouts` | 4 | Shared `@bsuite/ui` / `@bsuite/theme` migration patterns |
| `bsuite-pnpm-monorepo` | 4 | Lockfile generation, dependency installation |
| `bsuite-platform` | 7 | CI/CD, shared config, cross-cutting build concerns |
| `bsuite-plans-keeper` | 7 | Update plan docs, close issues |
| `bsuite-developer-portal` | 6 | Developer Portal tab structure, cross-tab linking, permission gates |
| `bsuite-page-grid-layout` | 3, 6 | DraggableCardPage / CanvasCard patterns, page layout integration |
| `bsuite-rls-authz-red-team` | 1, 2, 6, Final | RLS policy red-team (4-persona matrix) |
| `bsuite-user-advocate` | 5, Final | End-user / developer / admin red-team |
| `bsuite-production-debugging` | 5 | Debug production nav issues if found during live QA |
| `check-dry-one-shot` | 1, Final | DRY violation detection |
| `check-feature-parity` | 4, Final | Cross-app feature matrix |
| `check-code-quality` | 4, 6 | Import hygiene, naming, barrel exports |
| `check-security` | 2, 6, Final | OWASP top 10, hardcoded secrets, inspector access control |
| `check-cleanup-scope-safety` | 1 | Safe scope for dead-code removal |
| `general-dry-one-shot-architecture` | 1 | Entity ownership enforcement |
| `auth-e2e-sso-testing` | 1, 2, 5 | Cross-app SSO flow, token route E2E |
| `auth-oauth-local-testing` | 2 | Local preview builds, prerender auth |
| `test-playwright` | 0–6 | Visual verification, nav functional tests, inspector E2E |
| `test-exploratory-qa` | 5, 6 | Free-form exploratory QA |
| `test-qa-and-verification` | 3, 5, 6, Final | QA pass |
| `test-verify-before-completion` | All gates | Evidence verification |
| `agent-red-plan` | Pre-execution | Red-team the plan itself |
| `agent-red-implement` | All gates | Red-team each implementation |
| `web-ui-ux-patterns` | 3, 4, 6 | Nav UX conventions (dropdowns, tabs, breadcrumbs) |
| `web-shadcn` | 4, 6 | Sheet / NavigationMenu / Tabs / Dialog / Form component patterns |
| `web-tanstack-table` | 6 | Virtual-scrolling data table for 555-route inspector |
| `web-tanstack-query` | 6 | useQuery / useSuspenseQuery for Supabase data in inspector |
| `web-dnd-kit` | 6 | Drag-and-drop reordering of DB nav overlay items |
| `web-forms-validation` | 6 | Zod schemas + React Hook Form for nav item creation/edit forms |
| `web-ag-grid` | 6 | Alternative to TanStack Table if AG Grid is already used in Developer Portal |
| `web-framer-motion` | 6 | Collapsible tree animations, panel transitions in inspector |
| `machine-vercel-react-best-practices` | 4, 6 | Layout shift, hydration, perf, component composition |
| `vercel-ops` | 5 | Env-var verification, deploy-ready probes for cross-app links |

## MCP Matrix

| MCP | Phases | Purpose |
|-----|--------|---------|
| `supabase` | 1, 2, 4, 6 | RLS policy queries (`pg_policies`), table inspection (`information_schema`), `tenant_navigation` CHECK constraints + CRUD, `custom_pages` join, `execute_sql` for live verification |
| `playwright` | 0–6 | Visual screenshots at 3 breakpoints, functional nav tests, unauthenticated route access, SSO ring, inspector E2E |
| `chrome-devtools` | 4, 5, 6 | Computed style inspection (oklch resolution), Lighthouse audits (accessibility ≥90, perf ≥80), console error monitoring, inspector load-time profiling |
| `context7` | 1, 3, 4, 6 | React Router redirect API, Next.js App Router patterns, `@bsuite/nav-core` API docs, shadcn/ui component docs, TanStack Table/Query docs, DnD Kit docs |
| `qig-memory` | 1, 7 | `bsuite_` silo: record DRY rulings, session summaries, cross-session state |
| `github` | 2, 7 | Issue creation for security findings, PR creation |

---

## Execution model

**Sequential** via `plan-executing` — each phase depends on the previous gate passing.

**Within a phase:** independent tasks may be parallelised via `agent-run-subagents` (dispatch to `sonnet` workers in isolated worktrees per the worktree isolation rules).

**Commit cadence:** One commit per task. One PR per phase.

**Red-team cadence:** `agent-red-implement` runs at every gate. `bsuite-user-advocate` runs at Gate 5 (live QA). `agent-red-plan` runs once before Phase 0 begins.

**Escalation tiers:** `low` (lint fix) → `standard` (component API change) → `high` (cross-app impact) → `frontier` (RLS violation, SSO failure, data exposure).

**Do not merge without operator review.** This plan modifies navigation, auth surfaces, and theme wiring in all 6 apps.
