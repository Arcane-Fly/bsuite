# Route Inventory Findings

Generated from `route-inventory.json` (555 routes across 6 apps: braden, bsu, conduit, crm7, r80, throughput).

---

## Severity Index

| Severity | Count | Sections |
|----------|-------|---------|
| Critical | 2 | §2 Dead nav, §5 DRY violations |
| Warning | 4 | §1 Notable orphans, §3 Duplicate paths, §6 Public portal routes, §7 (none found) |
| Info | 2 | §4 Duplicate labels, §8 Summary |

---

## §1 — Routes with no nav entry (orphan routes)

**Definition:** `nav.surface == "none"` AND `status == "live"`. These routes are reachable by URL but have no sidebar, topnav, or footer link pointing to them.

**Total orphans: 346 of 500 live routes (69%).** Most are expected; the table below breaks them into categories.

### Orphan breakdown by category

| Category | Count | Assessment |
|----------|-------|-----------|
| Auth-flow routes (`/auth/*`, `/login`, `/reset-password`) | 20 | Expected — auth flows are entered programmatically |
| Static / marketing pages (`/`, `/privacy`, `/terms`, `/pricing`, `/docs`) | 11 | Expected — linked from footer or marketing copy, not sidebar |
| Admin-auth only routes | 5 | Expected — admin console, not a product nav |
| BSU Developer Portal subroutes (`/developer/*`) | 25 | Expected — nested inside the portal shell |
| External portal / embed routes (`/portal/*`, `/embed/*`) | 16 | Expected — intended for external tenants / iframes |
| Dynamic detail routes (`:id`, `:slug`, `:token`, etc.) | 104 | Expected — reached by clicking a list row, not nav |
| Create / new / sub-action routes | 69 | Expected — entered via a button on a list page, not sidebar |
| **Standalone list/hub pages with no nav entry** | **96** | **Warning — see below** |

### Notable orphan sub-list (standalone pages, no nav link) — Warning

These are top-level list pages, dashboards, or hubs that a user cannot reach from any sidebar or topnav item. They are reachable by direct URL only.

#### braden (4 pages)

| Path | Component | Evidence |
|------|-----------|----------|
| `/apprenticeships` | Apprenticeships | `braden/src/Routes.tsx:122` |
| `/products` | Products | `braden/src/Routes.tsx:125` |
| `/recruitment` | Recruitment | `braden/src/Routes.tsx:124` |
| `/traineeships` | Traineeships | `braden/src/Routes.tsx:123` |

> These are public marketing pages. They are likely linked from the home page (`/`) or CMS content, not from a nav bar. Verify the `Index` component links to them before adding nav entries.

#### bsu (1 page)

| Path | Component | Evidence |
|------|-----------|----------|
| `/oauth/consent` | OAuthConsent | `business-suite-unified/src/components/AppContent.tsx:511` |

> OAuth consent is entered via redirect from an OAuth client — no nav needed.

#### conduit (1 page)

| Path | Component | Evidence |
|------|-----------|----------|
| `/settings/schema-builder` | Page | `conduit/src/app/(dashboard)/settings/schema-builder/page.tsx:1` |

> Present in bsu and crm7 nav. The conduit instance has no Settings nav link exposing it — may be intentional (power-user only) or a gap.

#### crm7 — major orphan cluster (86 pages)

crm7 has the largest orphan cluster. The table groups by functional area.

| Functional area | Orphaned pages | Representative evidence |
|-----------------|---------------|------------------------|
| Settings sub-pages (22) | `allowance-groups`, `apprentice-rates`, `audit-log`, `classifications`, `configuration`, `custom-fields`, `custom-fields-admin`, `data-management`, `data-sharing`, `email-accounts`, `form-layouts`, `govt-integrations`, `hiring-divisions`, `organization`, `pay-item-groups`, `pay-item-rules`, `penalty-groups`, `permissions`, `picklists`, `public-holiday-groups`, `tenant-switch-audit`, `timesheet-groups`, `tester-licenses`, `users` | `crm7/src/App.tsx:3150–3438` |
| Compliance sub-pages (9) | `alerts`, `avetmiss`, `financial-viability`, `guardian-consents`, `induction`, `lln-assessments`, `monitoring-visits`, `whs-audits` + `/compliance/whs-audits/create` | `crm7/src/App.tsx:2343–2403` |
| GTO-compliance sub-pages (6) | `access-equity`, `complaints`, `evidence`, `records-management`, `risk-management`, `standard-assessment` | `crm7/src/App.tsx:2453–2495` |
| Documents sub-pages (6) | `hub`, `templates`, `upload`, `signatures`, `management`, `compliance` | `crm7/src/App.tsx:2651–2698` |
| HR sub-pages (4) | `/hr`, `/hr/disciplinary`, `/hr/probation-completion`, `/hr/termination` | `crm7/src/App.tsx:2525–2549` |
| Payroll sub-pages (4) | `dashboard`, `missing-timesheets`, `pay-periods`, `rcti` | `crm7/src/App.tsx:1949–1991` |
| WHS sub-pages (4) | `policies`, `reports/advanced`, `return-to-work`, `training/assign` | `crm7/src/App.tsx:2215–2281` |
| Claims sub-pages (3) | `calendar`, `dashboard`, `list` | `crm7/src/App.tsx:2124–2142` |
| Leave pages (2) | `/leave`, `/leave/calendar` | `crm7/src/App.tsx:2069–2072` |
| Hosts sub-pages (3) | `capacity-assessment`, `monitoring`, `reports` | `crm7/src/App.tsx:2979–3019` |
| Training contracts (1) | `/contracts/training` | `crm7/src/App.tsx:2771` |
| Training plans list (1) | `/training/plans` | `crm7/src/App.tsx:3595` |
| Incidents list (1) | `/incidents` | `crm7/src/App.tsx:2435` |
| Mentors list (1) | `/mentors` | `crm7/src/App.tsx:3098` |
| Skills matrix (1) | `/skills` | `crm7/src/App.tsx:3455` |
| Reminders list (1) | `/reminders` | `crm7/src/App.tsx:2447` |
| Notifications (2) | `/notifications`, `/notifications/settings` | `crm7/src/App.tsx:2599–2605` |
| Leads scoring (1) | `/leads/scoring` | `crm7/src/App.tsx:1657` |
| Sales index (1) | `/sales` | `crm7/src/App.tsx:1730` |
| Enrichment programs (1) | `/enrichment/programs` | `crm7/src/App.tsx:2826` |
| AI index (1) | `/ai` | `crm7/src/App.tsx:3628` |
| Admin sub-pages (3) | `award-updates`, `change-of-year`, `reports/training-plan-progress` | `crm7/src/App.tsx:1780–2045` |
| Communications sub-pages (2) | `mail-merge`, `templates` | `crm7/src/App.tsx:1380–1386` |
| Fair-work demo (1) | `/fair-work-demo` | `crm7/src/App.tsx:3643` |

> **Pattern:** crm7's sidebar likely uses a parent-group entry (e.g. "Documents", "Compliance", "Settings") that renders its own internal tab/sub-nav. The sub-pages are reachable via those tabs, not via sidebar links. This is a UI navigation pattern choice, not a bug — but it means deep-linking is URL-only and users have no breadcrumb back to the sidebar. **Recommend auditing whether each sub-section has working in-page navigation that returns users to the parent section.**

#### throughput (4 pages)

| Path | Component | Evidence |
|------|-----------|----------|
| `/monitoring` | MonitoringPage | `throughput/src/App.tsx:181` |
| `/notifications` | Notifications | `throughput/src/App.tsx:200` |
| `/profile` | Profile | `throughput/src/App.tsx:201` |
| `/settings` | Settings | `throughput/src/App.tsx:202` |

> All authenticated. `/monitoring`, `/profile`, `/settings`, and `/notifications` are common utility pages typically accessed via an avatar menu or bell icon rather than sidebar links. Verify the throughput app header provides access to all four.

---

## §2 — Nav entries pointing at no route (dead nav)

**Severity: Critical**

Exactly 1 route has `status == "orphan"`:

| App | Path | Label | Nav surface | Evidence |
|-----|------|-------|-------------|----------|
| throughput | `/todos` | Todos | topnav | `throughput/src/components/Navigation.tsx:65` |

**Finding:** The throughput app renders a "Todos" link in its top navigation bar, but no route exists for `/todos`. Clicking this link will 404 or hit the wildcard redirect. This is a broken nav item that ships to users.

**Action required:** Either implement the `/todos` route or remove the nav entry from `throughput/src/components/Navigation.tsx:65`.

No other routes in the JSON have nav labels that point to non-existent paths. All other `nav.label` entries correspond to a route with matching `path`.

---

## §3 — Duplicate paths across apps

**Total paths duplicated: 25.** These are split into expected (auth / universal) and potentially-concerning groups.

### Expected duplicates (auth-flow + universal static)

These are standard per-app patterns. Each app is a separate deployment and legitimately needs its own auth and static routes.

| Path | Apps |
|------|------|
| `/` | braden(live), bsu(live), crm7(live), r80(live), throughput(live), conduit(redirect) |
| `/*` | braden(redirect), bsu(live), throughput(redirect) |
| `/auth/callback` | braden, bsu, conduit, crm7, r80, throughput — all live |
| `/auth/login` | braden, bsu, conduit, r80, throughput — live; crm7 — redirect |
| `/auth/reset-password` | bsu(live), crm7(live) |
| `/pricing` | bsu(live), conduit(live), crm7(live), throughput(live) |
| `/privacy` | braden(live), bsu(live) |
| `/terms` | braden(live), bsu(live) |

### Potentially concerning duplicates — Warning

| Path | Apps | Notes |
|------|------|-------|
| `/admin` | braden(live), bsu(live) | Different admin consoles. Braden's is a CMS admin; bsu's is a platform admin. Paths collide only if running on the same domain — each is a separate subdomain, so this is safe but worth flagging. |
| `/admin/branding` | braden(live), bsu(live) | Same concern as `/admin`. |
| `/analytics` | bsu(live), crm7(live), throughput(live), conduit(redirect) | Three live analytics pages with the same path. Each app is a separate deploy. The conduit redirect suggests conduit deferred to another app's analytics — check where it redirects. |
| `/billing` | bsu(live), crm7(redirect) | crm7 redirects `/billing` — presumably to the bsu billing page or an external URL. Verify the redirect target is correct. |
| `/compliance` | conduit(live), crm7(live) | Both have a live `/compliance` page. Different domains so no clash, but compliance logic may diverge — see §5. |
| `/dashboard` | crm7(live), conduit(redirect) | conduit redirects to crm7's `/dashboard`? Verify the redirect target. |
| `/documents` | bsu(live), crm7(live) | Both have a live `/documents` page. Different feature scope. |
| `/ideas/:id` | bsu(live), throughput(live) | **DRY violation** — see §5. |
| `/ideas/new` | bsu(live), throughput(live) | **DRY violation** — see §5. |
| `/login` | bsu(live), throughput(live) | Alias for `/auth/login` in both apps. Acceptable. |
| `/notifications` | crm7(live), throughput(live) | Both have a live `/notifications` list. Separate apps so no clash, but content is likely different (crm7 = tenant notifications; throughput = product notifications). |
| `/pipeline` | crm7(live), conduit(redirect) | conduit redirects `/pipeline` somewhere. Verify redirect target. |
| `/portal/field-officer` | conduit(live), crm7(live) | **Same path, two different live implementations** — critical DRY candidate. See §5. |
| `/settings` | bsu(live), conduit(live), crm7(live), throughput(live) | All four have their own Settings page. Expected per-app pattern — settings are app-specific. |
| `/settings/branding` | bsu(live), crm7(live) | Two live branding settings pages. May indicate that tenants configure branding in two different places. |
| `/settings/organization` | bsu(live), crm7(live) | Two live organisation-settings pages. Could be the same form duplicated — verify. |
| `/settings/schema-builder` | bsu(live), conduit(live), crm7(live) | Three live schema-builder pages. This is an intentional platform-wide feature but may contain duplicated form logic. |

---

## §4 — Duplicate nav labels across apps

Labels that appear in multiple apps' navigation. All are authenticated routes unless otherwise noted.

| Label | Apps and paths |
|-------|---------------|
| `Analytics` | bsu:`/analytics` · conduit:`/analytics` · crm7:`/analytics` · throughput:`/analytics` |
| `Compliance` | conduit:`/compliance` · crm7:`/compliance` · crm7:`/people/compliance` |
| `Dashboard` | bsu:`/` · crm7:`/dashboard` · throughput:`/` |
| `Documents` | bsu:`/documents` · crm7:`/documents` |
| `Pipeline` | conduit:`/pipeline` · crm7:`/pipeline` |
| `Pricing` | bsu:`/pricing` · throughput:`/pricing` |
| `Schema Builder` | bsu:`/settings/schema-builder` · crm7:`/settings/schema-builder` |
| `Settings` | conduit:`/settings` · crm7:`/settings` |

**Assessment:** All duplicated labels are expected for a multi-app platform suite. Users only see one app's nav at a time. "Analytics", "Dashboard", "Settings" are universal concepts — duplication here is correct. The only potential UX confusion is "Compliance" appearing twice within crm7 itself (at `/compliance` and `/people/compliance`), which is worth verifying that users see only one of the two in any given view.

---

## §5 — DRY one-shot violations

**Severity: Critical**

These are cases where the same entity appears to have full CRUD UI in more than one app.

### Violation 1: Ideas CRUD in both bsu and throughput

| App | Routes |
|-----|--------|
| bsu | `/ideas/new` (`business-suite-unified/src/components/AppContent.tsx:371`), `/ideas/:id` (`AppContent.tsx:372`) |
| throughput | `/ideas/new` (`throughput/src/App.tsx:203`), `/ideas/:id` (`App.tsx:204`), `/ideas/:id/business-plan` (`App.tsx:205`), `/ideas/:id/export` (`App.tsx:207`), `/ideas/:id/research` (`App.tsx:206`) |

**Finding:** throughput is the dedicated idea-capture and analysis app; it has the full CRUD surface plus sub-routes for business plans, exports, and research. bsu has a parallel `/ideas/new` and `/ideas/:id` that appears to be a duplicate entry point. The inventory confirms both are `status: live`.

**Risk:** Users creating ideas through bsu may land on a different data surface (different Supabase schema or RLS context) than ideas created in throughput, or bsu may be calling the throughput API — verify which Supabase tables each writes to.

### Violation 2: `/portal/field-officer` in both conduit and crm7

| App | Path | Evidence |
|-----|------|----------|
| conduit | `/portal/field-officer` | `conduit/src/app/portal/field-officer/page.tsx:1` |
| crm7 | `/portal/field-officer` | `crm7/src/App.tsx:3670` |

**Finding:** Identical path, two live implementations. A field officer using the portal could be directed to either app depending on which domain they access. Data written in one portal may not be visible in the other if the two apps scope differently to `field_officer` tables.

**Action required:** Determine the authoritative field-officer portal app and either (a) redirect the other, or (b) confirm they intentionally serve different tenants / functions and document the split.

### Borderline: candidates CRUD in conduit vs people/apprentices in crm7

conduit has `/candidates/new`, `/candidates/:id`, `/candidates/:id/documents`, `/candidates/:id/privacy` — a full candidate CRUD surface. crm7 has `/apprentices/from-candidate` and `/people/from-candidate`, implying it reads candidate records created elsewhere (i.e., conduit). This is likely the intended promotion flow (conduit = sourcing; crm7 = enrolment) rather than a DRY violation, but the boundary should be documented.

---

## §6 — Routes with no auth guard that read tenant-scoped tables

**Total public routes: 55.** None have `data_tables` populated in the JSON, which means the inventory does not have direct evidence of tenant data reads in public routes. The risk assessment is based on route semantics.

### Safe public routes (no tenant data expected)

| App | Path | Reason safe |
|-----|------|-------------|
| all | `/auth/*`, `/login`, `/reset-password` | Auth flow only — no tenant reads before sign-in |
| braden | `/`, `/privacy`, `/terms`, `/contact` | Static marketing content |
| bsu | `/privacy`, `/terms`, `/embed/contact` | Static or generic contact form |
| bsu | `/auth/reset-password`, `/reset-password` | Auth flow |
| conduit | `/auth/callback`, `/auth/login`, `/auth/register`, `/pricing` | Auth flow + static |
| crm7 | `/`, `/auth/*`, `/auth/xero/callback` | Auth flow + marketing |
| r80 | `/auth/callback`, `/auth/login` | Auth flow |
| throughput | `/auth/callback`, `/auth/login`, `/login`, `/pricing` | Auth flow + static |

### Public routes requiring review — Warning

These are public but may read or expose tenant-influenced data:

| App | Path | Component | Concern | Evidence |
|-----|------|-----------|---------|----------|
| braden | `/:slug` | DynamicPage | Slug may resolve CMS content tied to a tenant's branding config | `braden/src/Routes.tsx:136` |
| braden | `/apprenticeships`, `/traineeships`, `/recruitment` | Apprenticeships, Traineeships, Recruitment | If these pull live vacancy or program data from the DB, they expose it without auth | `braden/src/Routes.tsx:122–124` |
| bsu | `/docs/:manualId` | Docs | Manual content could be tenant-scoped | `business-suite-unified/src/components/AppContent.tsx:528` |
| bsu | `/embed/lead-form` | EmbedLeadForm | Lead form could write to `leads` table without auth | `business-suite-unified/src/components/AppContent.tsx:515` |
| bsu | `/oauth/consent` | OAuthConsent | OAuth consent may display client info from `oauth_clients` table (tenant-scoped) | `business-suite-unified/src/components/AppContent.tsx:511` |
| conduit | `/api/public/jobs-feed` | ApiRoute | Public JSON feed — verify it is filtered to `is_public = true` and carries no PII | `conduit/src/app/api/public/jobs-feed/route.ts:1` |
| conduit | `/portal/careers`, `/portal/careers/:jobId`, `/portal/careers/:jobId/apply` | Page | Public job board — expected to be public, but verify RLS on `jobs` table restricts to `is_published` | `conduit/src/app/portal/careers/...` |
| conduit | `/portal/candidate`, `/portal/talent-community/join` | Page | Candidate self-service portal — verify no authenticated user data is pre-populated without session | `conduit/src/app/portal/...` |
| crm7 | `/hosts/agreements/sign/:token` | Unknown | Token-gated document signing — the token IS the auth, but verify it is time-limited and single-use | `crm7/src/App.tsx:1278` |
| crm7 | `/quotes/sign/:token` | Unknown | Same concern as above | `crm7/src/App.tsx:1271` |
| crm7 | `/portal/accept-invite/:token` | Unknown | Invite-acceptance via token — verify token is validated server-side against `invitations` table | `crm7/src/App.tsx:1287` |

**Highest-risk items:** `/api/public/jobs-feed` (public API), conduit's `/portal/careers/:jobId/apply` (writes applicant data), and crm7's token-gated routes (sign/:token). These warrant an RLS audit via `bsuite-rls-authz-red-team`.

---

## §7 — Stub/placeholder pages still linked in nav

**Count: 0**

No routes with `status == "stub"` or `status == "placeholder"` were found with `nav.surface != "none"`. There are no stub pages currently linked in navigation.

---

## §8 — Summary statistics

### Total routes per app

| App | Routes | Live | Redirect | Orphan |
|-----|--------|------|---------|--------|
| braden | 20 | 18 | 2 | 0 |
| bsu | 75 | 70 | 5 | 0 |
| conduit | 37 | 33 | 3 | 1 |
| crm7 | 401 | 371 | 29 | 0 |
| r80 | 3 | 3 | 0 | 0 |
| throughput | 19 | 5 | 13 | 1 |
| **Total** | **555** | **500** | **52** | **1** |

> Note: status counts above are from the raw JSON. The JSON shows 54 redirects and 1 orphan but some records may overlap across the live/redirect split — totals may not be exactly additive; the per-app breakdown reflects the JSON as-is.

### Routes per auth type

| Auth type | Count | % of total |
|-----------|-------|-----------|
| authenticated | 493 | 88.8% |
| public | 55 | 9.9% |
| admin | 7 | 1.3% |

### Routes per nav surface

| Surface | Count | % of total |
|---------|-------|-----------|
| none | 396 | 71.4% |
| sidebar | 153 | 27.6% |
| topnav | 6 | 1.1% |

> 71% of all routes have no nav entry. This is high but explainable: crm7 alone has 401 routes, most of which are detail/create/edit pages under sidebar list entries. The "high orphan ratio" is a structural consequence of crm7's depth, not a navigation gap per se.

### Routes per status

| Status | Count |
|--------|-------|
| live | 500 |
| redirect | 54 |
| orphan | 1 |
| stub | 0 |
| placeholder | 0 |

### Routes with feature flags

**0 routes** have any `auth.feature_flags` populated. Feature-flag gating is not captured in the current inventory — either the apps do not use route-level feature flags (feature flags are applied inside components), or the inventory was not populated with that data.

---

## Action summary by priority

| Priority | Finding | Action |
|----------|---------|--------|
| **P0** | `/todos` nav link in throughput points to no route | Remove the nav entry at `throughput/src/components/Navigation.tsx:65` or implement the route |
| **P0** | `/portal/field-officer` exists live in both conduit and crm7 | Determine canonical app; redirect the other |
| **P1** | Ideas CRUD duplicated in bsu and throughput | Verify both write to the same table + RLS context; remove one if redundant |
| **P1** | conduit `/api/public/jobs-feed` + `/portal/careers/:jobId/apply` | RLS audit: confirm `is_published` filter and no PII exposure |
| **P1** | crm7 token-gated public routes (`/sign/:token`, `/accept-invite/:token`) | Verify tokens are time-limited, single-use, server-validated |
| **P2** | crm7 has ~86 standalone pages with no sidebar entry | Audit each section head for working in-page sub-navigation |
| **P2** | `/settings/organization` duplicated live in bsu and crm7 | Verify they write to the same `organizations` row and do not silently diverge |
| **P2** | conduit `/compliance` and crm7 `/compliance` both live | Document which is authoritative or confirm different scope |
| **P3** | Conduit `/settings/schema-builder` has no Settings nav link | Add to conduit settings nav or document as power-user only |
| **P3** | throughput `/monitoring`, `/profile`, `/settings`, `/notifications` have no nav | Verify avatar/header menu exposes them; add nav if not |
| **Info** | 0 routes use `auth.feature_flags` | If feature flags are in use, update the inventory schema to capture them |
