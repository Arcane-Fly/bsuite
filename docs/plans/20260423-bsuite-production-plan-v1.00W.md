# BSuite — Refreshed Audit & Full Production Plan

**Audit date:** 2026-04-23 (refreshed from 2026-04-22 baseline)
**Baseline:** bsuite monorepo `development` branch; live Supabase `tuybltdrdefjblnplpqo` (Postgres 17.6); all five submodules
**New context incorporated:** Phase 5 (7 PRs merged), Phase 4 V1/V5, Phase 6c DRY lint, conduit SSR hotfix (PR #98 outstanding), Claude Code Phase 6c session
**Colourblind constraint:** Red/green sole-signifier findings are explicitly called out

---

## Delta Since Last Audit (What Landed)

The overnight session and subsequent Claude Code work delivered substantial progress:

| Work | Status | Evidence |
|------|--------|----------|
| Phase 5 — `@bsuite/nav-core@0.5.0` + `@bsuite/schema-registry@0.1.0` published | ✅ DONE | npm registry live |
| Phase 5 — `tenant_page_layouts`, `tenant_navigation`, `ancestors_of`/`descendants_of` RLS migrations | ✅ DONE | Live DB: tables exist |
| Phase 5 — BSU PageComposer + NavigationEditor | ✅ DONE | BSU PRs #168, #169 merged |
| Phase 5 — crm7 TenantLayoutSlot (PR #282) | ✅ DONE | Merged to development |
| Phase 5 — conduit dual-layer cache (PR #97) | ✅ DONE | Merged to development |
| Phase 5 — R80.3 + braden + embed route (PRs merged) | ✅ DONE | development SHA confirmed |
| Theme-A–E: BSU `cssVariables false→true`, hex→oklch sweep, `tailwind.config.js` cleanup, webmanifest `#0a0e1a`, legacy `TenantThemeProvider` removed from CRM7 | ✅ DONE | Commit history confirmed |
| Phase 4 V1 — candidate→contact merge on hire (CRM7 PR #284) | ✅ DONE | Merged |
| Phase 4 V5 — lead-capture canonical → CRM7; BSU duplicate pending delete (BSU PR #171) | ✅ MOSTLY DONE | CRM7 PR merged; BSU PR #171 open |
| Phase 6c — DRY free-text-where-FK lint rule added | ✅ DONE | BSU PR #172 merged |
| Phase 6c — `contacts.client_id` (uuid) column added | ✅ DONE | Live DB confirmed |
| Phase 6c — `leads.contact_id` + `leads.client_id` columns added | ✅ DONE | Live DB confirmed |
| CLAUDE.md updated across all repos (Phase 6b+6c docs) | ✅ DONE | Commits in all repos |
| Conduit SSR prerender fix (PR #98) | ⚠️ BLOCKER | PR diverged — hotfix needed |

**Outstanding blocker:** Conduit Vercel build is still failing. PR #98 (`feat/phase5-consumer-conduit`) is diverged from `development` by 1 squash-merge commit. The fix (typeof window guard in DashboardShell.tsx) is written and committed to the feature branch but cannot merge cleanly. Recommended resolution: cherry-pick commits `2f38cc3` and `5870990` onto a new `fix/conduit-ssr-prerender-guard` branch from `development`, open a new PR.

---

## Refreshed Findings Register

### P0 — Confirmed Live Production Blockers

| ID | Status Change | Finding | App | Action |
|----|--------------|---------|-----|--------|
| **P0-LIVE-01** | 🆕 LIVE CONFIRMED | Vault RPC `email_integration_set_encrypted_token` does not exist — OAuth tokens stored plaintext in `email_integrations` (access_token, refresh_token) | CRM7 edge functions | Create the Vault RPC; encrypt existing tokens |
| **P0-LIVE-02** | 🆕 LIVE CONFIRMED | `smtp_password` + `imap_password` stored plaintext in `email_integrations` with no Vault path | CRM7 edge functions | Encrypt via pgcrypto; add Vault migration |
| **P0-LIVE-03** | 🆕 LIVE CONFIRMED | OAuth state parameter in `oauth-google-email` + `oauth-microsoft-email` is unsigned base64 JSON — CSRF/injection attack on state allows attacker to map their session to any user's integration | CRM7 edge functions | Sign state with `HMAC-SHA256(OAUTH_STATE_SECRET)`; verify on callback |
| **P0-J04** | ✅ CONFIRMED LIVE | BSU AuthContext zero-fetch bug — tier-chip stuck at "Free" for the 3 confirmed enterprise users; `INITIAL_SESSION` races bootstrap, `profiles` + `user_tenants` never fetched | BSU | Fix `onAuthStateChange` bootstrap race; add integration test |
| **P0-J05** | ✅ CONFIRMED | CVE-2026-23869 — Next.js RSC DoS (CVSS 7.5) in Conduit pre-16.2.3 | Conduit | Bump `next` to `^16.2.3` |
| **P0-J08** | UNCONFIRMED | `APPLY_THIS_SQL.sql` in CRM7 repo root — may contain sensitive mutations | CRM7 | `git rm crm7/APPLY_THIS_SQL.sql`; BFG check if credentials present |
| **P0-J01** | PARTIALLY MITIGATED | `throughput` OAuth: `business-suite-oauth.ts` was 0 bytes; throughput Supabase JS at `^2.39.7` | throughput | Wire OAuth from CRM7 template; bump supabase-js to `^2.103.0` |
| **P0-L02** | STILL OPEN | Schema builder, page builder, entity relationship engine — 7 tables, all 0 rows in production; no admin UI in TypeScript source | BSU + All | Build SchemaBuilder admin UI; see Phase 8 |
| **P0-05** | ✅ FIXED | BSU `@theme` hex primary/accent — **resolved in Theme-A/B pass** | — | Done |
| **P0-J03** | UNVERIFIED | Wildcard redirect URIs `*.vercel.app` in Supabase auth — OAuth 2.1 §7.6 violation | Supabase | Remove wildcards in Supabase Auth dashboard |

**P0-L01 STATUS UPDATE:** `contacts.client_id` (uuid) column **now exists** in live DB — Phase 6c landed this FK. P0 downgraded to **P1-ongoing** (column exists; UI EntitySelector still not built; free-text `company` field on contact form may still bypass it).

---

### P1 — User-Visible / High-Priority

| ID | Status | Finding | App | Action |
|----|--------|---------|-----|--------|
| **P1-LIVE-01** | 🆕 CONFIRMED | `email-token-refresh` uses `===` for secret comparison — timing side-channel; `timingSafeEqual` helper exists but unused | CRM7 edge fn | Replace with `timingSafeEqual` |
| **P1-LIVE-02** | 🆕 CONFIRMED | `GOTRUE_JWT_ADMIN_GROUP_NAME` deprecation warning firing live in auth logs | BSU/Supabase | Remove the config key before Supabase enforces removal |
| **P1-L01** | OPEN | `employers` free-text contact fields — no `primary_contact_id` FK | CRM7 | Phase 6c migration: `ALTER TABLE employers ADD COLUMN primary_contact_id UUID REFERENCES contacts(id)` |
| **P1-L02/03** | OPEN | `funding_sources` + `training_providers` free-text contact — no `contact_id` FK | CRM7 | Phase 6c batch migration |
| **P1-L04** | OPEN | `mentors` full duplicate person record — no `contact_id` FK | CRM7 | `ALTER TABLE mentors ADD COLUMN contact_id UUID REFERENCES contacts(id)` |
| **P1-L05** | OPEN | `host_agreements` no `signatory_contact_id` FK | CRM7 | Add FK column |
| **P1-L07** | OPEN | `opportunities` has `contact_id` but no `client_id` — sales pipeline by account broken | CRM7 | `ALTER TABLE opportunities ADD COLUMN client_id UUID REFERENCES clients(id)` |
| **P1-L08** | OPEN | `vacancies` no `client_id` — vacancy not traceable to client | CRM7 | `ALTER TABLE vacancies ADD COLUMN client_id UUID REFERENCES clients(id)` |
| **P1-L09/10** | OPEN | EntitySelector (7 types) + EntityLinker — documented but not in TypeScript source | CRM7 | Phase 7 UI work |
| **P1-L11** | OPEN | Dual person model: `contacts` + `people` — no enforced convergence | All | Enforce `people.contact_id NOT NULL` for new records; migration for existing |
| **P1-01** | ✅ FIXED | BSU shadcn `cssVariables false→true` — **resolved in Theme-A** | — | Done |
| **P1-07** | ✅ FIXED | CRM7 dual dark-mode trigger — **resolved, `TenantThemeProvider` removed** | — | Done |
| **P1-08** | ✅ FIXED | Legacy `TenantThemeProvider` in CRM7 — **removed in Theme pass** | — | Done |
| **P1-12** | OPEN | Conduit `/auth/login` + `/auth/register` — independent auth bypasses BSU SSO | Conduit | Redirect unauthenticated to BSU `/login?return_to=conduit` |
| **P1-J02** | OPEN | OIDC nonce missing in all authorization requests — id_token replay risk | All clients | Add nonce to `signInWithBusinessSuite`; verify in token exchange |
| **P1-J04** | OPEN | `next-themes` (Next.js-specific) used in BSU Vite app | BSU | Replace with Zustand-based `useTheme` (CRM7 pattern) |
| **P1-J05** | OPEN | Dual toast library in BSU: `react-hot-toast` + `sonner` | BSU | Remove `react-hot-toast`; migrate all usages to `sonner` |
| **P1-J09** | OPEN | BSU on `react-router-dom` v6; all other apps on v7 | BSU | Migrate to `^7.13.1` |
| **P1-J12** | OPEN | `strict: true` not enabled in R80.3 + throughput tsconfig | R80.3, throughput | Enable; fix resulting type errors |
| **P1-J15** | OPEN | CRM7 DialogContent a11y sweep — 81 files missing `<DialogTitle>` | CRM7 | Bulk add `<DialogTitle>` per shadcn pattern |
| **P1-04** | OPEN | BSU `AdminBranding` writes to Tier 2 (`tenant_branding NULL`) not Tier 1 (`platform_branding`) | BSU | Wire platform tab to `platform_branding` singleton |
| **P1-09** | OPEN | `throughput` on Tailwind v3 — `preset-v4.css` cannot be consumed | throughput | Upgrade to Tailwind v4; wire preset |
| **P1-J08** | OPEN | 5 `vercel.json` files missing `Cache-Control: immutable` for `/assets/*` | CRM7, R80.3, braden, throughput, conduit | Add header rules |

**Colourblind (red/green sole-signifier) status:** No confirmed instances of red vs. green as the sole state signifier were found in the CSS/token layer. Status tokens (`--status-success/error`) always accompany icons or labels in the components audited. This remains a watch item for the DialogContent a11y sweep (P1-J15) and any future status badge work.

---

### P2 — Polish / Documentation / Technical Debt

| ID | Finding | App |
|----|---------|-----|
| P2-LIVE-01 | 5 RLS policies with `auth_rls_initplan` warn — per-row re-evaluation of auth functions | DB |
| P2-LIVE-02 | 25+ unused indexes (especially `people` table — 9 unused, suggesting speculative design) | DB |
| P2-LIVE-03 | 4 tables with unindexed foreign keys (performance) | DB |
| P2-J01 | `schemaBuilderService` missing `app_scope` filter — CRM7 entities appear in R80.3/Conduit pickers | R80.3, Conduit |
| P2-J02 | 37 feature flags in `tenant_settings.feature_flags` JSONB with no admin UI | CRM7 |
| P2-J03 | Xero integration fully implemented but OAuth app not registered — feature is dead | CRM7 |
| P2-J05 | Sidebar `localStorage` key inconsistency across 3 apps | All |
| P2-J07 | No Sentry error monitoring in any app | All |
| P2-J09 | `@bsuite/auth` package exists but no app has migrated to it | All clients |
| P2-L01 | `Association_Ready` tab in entity XLSX empty | PM |
| P2-01 | No Storybook / component catalog | packages/ui |
| P2-06 | BSU missing `apple-touch-icon.png`, `pwa-192x192/512.png` | BSU |
| P2-08 | No Part O plan docs in `docs/plans/` | Docs |
| P2-09 | No `shadow.ts` / `motion.ts` JS token exports | packages/design-tokens |

---

## One-Shot Policy — Revised Compliance Table

| Dimension | Previous | Now (2026-04-23) |
|-----------|----------|-----------------|
| Entity FKs (17 cross-links) | 7/17 | **9/17** (+`contacts.client_id`, +`leads.contact_id`, +`leads.client_id`) |
| Single person entry point | ❌ 3 tables | ❌ 3 tables (unchanged; FK exists but convergence unenforced) |
| Contact → Account linkage | ❌ No column | ⚠️ `contacts.client_id` column exists; EntitySelector UI not yet built |
| Auto-population on re-entry | ❌ | ❌ EntitySelector still not in TypeScript source |
| Schema + page builder admin | ❌ 0 rows | ❌ 0 rows; no UI |
| Entity relationship engine | ❌ 0 rows | ❌ 0 rows |
| Free-text duplication | ❌ 6+ tables | ❌ ~5 tables (leads fixed; employers/mentors/training_providers/funding_sources/host_agreements remain) |

Phase 6c added the lint rule and a subset of FK columns. The lint rule will prevent regressions. The remaining FK migrations and all UI work are still open.

---

## Full Production Roadmap

### Overview

Production means: all five apps deployed to Vercel on `main`/`master`, all P0 security issues resolved, the one-shot policy operational for users, and the platform polished enough to onboard real enterprise tenants. The work is organised into 9 sequential phases, designed for one-shot execution with no deferrals.

**Apps in scope:** BSU, CRM7, Conduit, R80.3, throughput (braden: corporate theme, independent — targeted fixes only)

---

### Phase 6 — Security & Infrastructure Hardening (IMMEDIATE — blocks production)

**Target: all P0 security issues resolved, Vercel deployments all green**

| Task | PR target | Priority |
|------|-----------|----------|
| 6.0 — Conduit SSR hotfix: cherry-pick `2f38cc3` + `5870990` onto `fix/conduit-ssr-prerender-guard` from `development`; open new PR | conduit | P0 |
| 6.1 — BSU PR #171 merge: delete drifted BSU lead-capture duplicate | BSU | P1 |
| 6.2 — Create Vault RPC `email_integration_set_encrypted_token` in DB; migrate plaintext `access_token` + `refresh_token` in `email_integrations` | DB migration | P0 |
| 6.3 — Encrypt `smtp_password` + `imap_password` via pgcrypto; add Vault migration path | DB migration | P0 |
| 6.4 — Sign OAuth state with `HMAC-SHA256`; verify on callback in `oauth-google-email` + `oauth-microsoft-email` | CRM7 edge fns | P0 |
| 6.5 — Replace `===` secret compare with `timingSafeEqual` in `email-token-refresh` | CRM7 edge fn | P1 |
| 6.6 — Remove `GOTRUE_JWT_ADMIN_GROUP_NAME` from Supabase project config | Supabase | P1 |
| 6.7 — Remove wildcard redirect URIs `*.vercel.app` + `*.vusercontent.net` from Supabase Auth dashboard; add exact preview URLs | Supabase | P0 |
| 6.8 — Bump `next` to `^16.2.3` in Conduit (CVE-2026-23869) | Conduit | P0 |
| 6.9 — Add OIDC nonce to all `signInWithBusinessSuite` calls (CRM7, R80.3, BSU, Conduit) | All clients | P1 |
| 6.10 — Add `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` to 5 `vercel.json` files | CRM7/R80.3/braden/throughput/conduit | P1 |
| 6.11 — BSU AuthContext zero-fetch bug fix; add integration test for ≥2 Supabase REST calls on mount | BSU | P0 |
| 6.12 — Fix `auth_rls_initplan` in 5 RLS policies (wrap auth calls in `(select auth.uid())`) | DB migration | P2 |
| 6.13 — Add 4 missing FK indexes (`apprentice_handoff_tokens`, `collaborative_documents`, `contact_messages`, `platform_rate_limits`) | DB migration | P2 |
| 6.14 — `git rm crm7/APPLY_THIS_SQL.sql`; BFG history rewrite if credentials present | CRM7 | P0 |
| 6.15 — Wire BSU platform tab in `AdminBranding.tsx` to `platform_branding` singleton (upsert `WHERE id = 'platform'`) | BSU | P1 |

**Deliverable:** All P0 security findings resolved. Conduit Vercel deployment green. BSU enterprise tier-chip working for all 3 enterprise users.

---

### Phase 7 — One-Shot Policy: Remaining FK Migrations + EntitySelector UI

**Target: full DRY compliance — every entity has a FK anchor; users can navigate cross-entity without re-typing data**

#### 7.0 — Remaining FK Migrations (DB)

Apply via Supabase migrations in CRM7 repo:

```sql
-- 7.0.1 Employers → contacts
ALTER TABLE employers ADD COLUMN primary_contact_id UUID REFERENCES contacts(id);
CREATE INDEX ON employers(primary_contact_id);

-- 7.0.2 Mentors → contacts
ALTER TABLE mentors ADD COLUMN contact_id UUID REFERENCES contacts(id);
CREATE INDEX ON mentors(contact_id);

-- 7.0.3 Training providers → contacts
ALTER TABLE training_providers ADD COLUMN contact_id UUID REFERENCES contacts(id);
CREATE INDEX ON training_providers(contact_id);

-- 7.0.4 Funding sources → contacts
ALTER TABLE funding_sources ADD COLUMN contact_id UUID REFERENCES contacts(id);
CREATE INDEX ON funding_sources(contact_id);

-- 7.0.5 Host agreements → signatory contact
ALTER TABLE host_agreements ADD COLUMN signatory_contact_id UUID REFERENCES contacts(id);
CREATE INDEX ON host_agreements(signatory_contact_id);

-- 7.0.6 Opportunities → client
ALTER TABLE opportunities ADD COLUMN client_id UUID REFERENCES clients(id);
CREATE INDEX ON opportunities(client_id);

-- 7.0.7 Vacancies → client
ALTER TABLE vacancies ADD COLUMN client_id UUID REFERENCES clients(id);
CREATE INDEX ON vacancies(client_id);
```

#### 7.1 — Enforce People → Contact Convergence

- Add `NOT NULL` constraint migration for `people.contact_id` (with backfill for any existing orphan rows)
- Add unique constraint: `UNIQUE (contact_id)` on `people` — one person record per contact
- Remove duplicate entry points: R80.3 people form must lookup/create a `contacts` record first

#### 7.2 — EntitySelector Component (7 typed variants)

Build in `packages/ui` (or CRM7 `src/components/entity/selectors/`):

- `ContactSelector` — search `contacts` by name/email; create inline
- `ClientSelector` — search `clients`; create inline
- `ApprenticeSelector` — search `apprentices`
- `EmployerSelector` — search `employers`
- `FundingSourceSelector`
- `TrainingProviderSelector`
- `PlacementSelector`

Each selector: debounced search, "create new" affordance, displays linked record chip post-selection. Replace all free-text contact fields on:

- `employers` form → `EmployerSelector` for `primary_contact_id`
- `mentors` form → `ContactSelector` for `contact_id`
- `training_providers` form → `ContactSelector`
- `funding_sources` form → `ContactSelector`
- `leads` form → `ContactSelector` for `contact_id` (column already exists)
- `contacts` form → `ClientSelector` for `client_id` (column already exists)
- `opportunities` form → `ClientSelector` for `client_id`

#### 7.3 — EntityLinker Panel

Build `EntityLinker` component: a collapsible sidebar panel on entity detail pages surfacing all related entities via the FK graph. Wire to 12 entity detail pages in CRM7 (prioritise Contact, Client, Apprentice, Placement, Opportunity).

#### 7.4 — Lead → Contact Conversion UI

Since `leads.contact_id` exists, build the lead-promote flow:

- "Convert Lead" action on lead detail page
- Either creates new `contacts` record and sets `leads.contact_id`, or links to existing contact via ContactSelector
- Post-conversion: lead card shows linked contact chip; contact page shows linked lead(s)

#### 7.5 — CRM7 DialogContent a11y sweep (P1-J15)

Automated sweep of 81 files — bulk-add `<DialogTitle>` (visually hidden where design doesn't show a title). One-shot: use a codemod or AST transform over the CRM7 `src/` directory.

**Deliverable:** One-shot policy fully operational. Entering a contact links to the client. Entering a mentor uses an existing contact. All 17 entity cross-links exist at DB + UI level. No free-text islands remaining.

---

### Phase 8 — Schema Builder + Page Builder Admin UI

**Target: tenants can configure custom entity fields, custom pages, and entity relationships — the platform becomes extensible without code deploys**

The DB infrastructure is fully ready (`tenant_field_definitions`, `tenant_entities`, `tenant_page_layouts`, `custom_pages`, `entity_relationships` tables — all with correct RLS). The UI is entirely missing.

#### 8.1 — SchemaBuilder Admin (BSU `/settings/schema-builder`)

Already has a route stub; wire to live DB:

- Entity type selector (reads `tenant_entities` — 76 system seed rows)
- Field definition manager (reads/writes `tenant_field_definitions`) — field types: text, number, date, boolean, select, FK
- FK field type wires `fk_table` + `fk_label_column` + `fk_search_columns` columns (already in schema)
- `app_scope` filter — CRM7 entities do not appear in R80.3/Conduit pickers (fixes P2-J01)

#### 8.2 — PageBuilder (BSU PageComposer, Phase 5 basis)

Phase 5 already shipped `PageComposer` and `NavigationEditor` components in BSU. Wire these to `custom_pages` + `tenant_page_layouts` tables:

- Create/edit custom page definitions
- Drag-drop layout config stored in `layout_config JSONB`
- Navigation editor saves to `tenant_navigation`

#### 8.3 — Entity Relationship Engine UI

Wire `entity_relationships` and `tenant_entity_relations` tables to a relationship-type manager in the SchemaBuilder. Allows tenants to define ad-hoc cross-entity links beyond the system-defined FKs.

#### 8.4 — Feature Flags Admin (CRM7 `/settings/feature-flags`)

Build a tenant-admin UI for the 37 JSONB feature flags in `tenant_settings.feature_flags`. Toggle UI, descriptions, and per-tenant access control. Resolves P2-J02.

**Deliverable:** BSU becomes a true no-code platform. Enterprise tenants can extend entity schemas and page layouts without a developer. The schema-builder and page-builder complete the Phase 5 backend work.

---

### Phase 9 — SSO Consolidation + Auth Hardening

**Target: single auth entry point (BSU), all apps share `@bsuite/auth`, no split auth surfaces**

#### 9.1 — Conduit Auth Consolidation

- `/auth/login` and `/auth/register` in Conduit redirect to BSU `/login?return_to=conduit` for unauthenticated users
- Retain Conduit `AuthCallback` route for PKCE code exchange (required)
- Candidate/employer users coming in cold still flow through BSU auth → return to Conduit

#### 9.2 — `@bsuite/auth` Package Adoption

Migrate all apps from per-app `business-suite-oauth.ts` copies to `packages/auth/src/oauth-client.ts`:

1. CRM7 first (canonical reference) — confirm `@bsuite/auth` matches CRM7's current implementation
2. R80.3, braden, throughput sequentially
3. BSU (Conduit already uses Supabase SSR pattern directly)

#### 9.3 — throughput OAuth

- `business-suite-oauth.ts` was 0 bytes — copy CRM7's working implementation
- Bump `@supabase/supabase-js` from `^2.39.7` to `^2.103.0`
- Wire `startBSTokenRefresh()` into throughput `AuthProvider`
- Update throughput `AuthCallback` route

#### 9.4 — R80.3 + braden OAuth hardening

- Backport `isAuthError` check + `bs-oauth-expired` event dispatch from CRM7's `checkAndRefreshToken` (P1-J01)
- Bump `jose` from `^6.1.3` to `^6.2.2`
- braden: bump `@supabase/supabase-js` from `^2.99.3` to `^2.103.0`

#### 9.5 — Azure `xms_edov` Claim

- Add `xms_edov` optional claim in Azure app manifest (LangCorp tenant)
- Add server-side rejection of `xms_edov === 0` in BSU OAuth callback
- Confirms that the 1 Azure-authenticated production user has a verified email

**Deliverable:** Single auth entry point. All 4 client apps use `@bsuite/auth`. throughput users can authenticate. Microsoft OAuth email attestation enforced. OIDC nonce replay attack closed.

---

### Phase 10 — Dependency & Build Standardisation

**Target: all apps on aligned dependency versions; throughput on Tailwind v4; BSU on react-router v7**

| Task | App | Complexity |
|------|-----|-----------|
| BSU: `react-router-dom` v6 → v7 | BSU | M — API changes in loaders/actions |
| BSU: `react-day-picker` `8.10.1` → `^9.14.0` | BSU | M — full rewrite API |
| BSU: remove `react-hot-toast`; migrate all usages to `sonner` | BSU | S |
| BSU: replace `next-themes` with Zustand `useTheme` (CRM7 pattern) | BSU | S |
| throughput: upgrade Tailwind v3 → v4; wire `@bsuite/theme/preset-v4.css` | throughput | M |
| throughput: upgrade `@supabase/supabase-js` `^2.39.7` → `^2.103.0` | throughput | S |
| All: upgrade TypeScript `~5.7.3` → `^5.9.3` | crm7, BSU, R80.3 | S |
| All: upgrade `vitest` `^3.2.4` → `^4.0.18` | BSU, braden, conduit, R80.3 | S |
| Conduit: upgrade `ai` + `@ai-sdk/*` from `^6.0.105` → `^6.0.116` | Conduit | S |
| All: `sonner` v1 → v2 | BSU, Conduit | S |
| All: `tailwind-merge` `^2.6.1` → `^3.5.0` | BSU, braden, conduit | S |
| BSU: `date-fns` `^3.6.0` → `^4.1.0` | BSU | S |
| R80.3, throughput: enable `strict: true` in tsconfig | R80.3, throughput | M |
| braden: align `@vitejs/plugin-react-swc` → `@vitejs/plugin-react` (Babel) | braden | S |
| Unify sidebar `localStorage` key across all apps | All | S |

**Deliverable:** All apps on aligned dependency versions. throughput consumes D2C tokens correctly. BSU fully on modern React Router. Zero dual-package conflicts.

---

### Phase 11 — Remaining Theme & Design System Completion

**Target: 100% oklch compliance; shared `<Logo />`; `packages/ui` populated; Storybook**

#### 11.1 — Remaining Hex Sweep

The audit quantified ~300 remaining hex literals across D2C apps (after Theme-A–E pass):

- CRM7 `MarketingHome.tsx` — ~62 matches
- BSU `MarketingHome.tsx` — ~62 matches
- Conduit `ConduitLanding.tsx` — ~55 matches
- CRM7 AI message components (`AIMessage.tsx`, etc.) — inline rgba

Use the ESLint guardrail (Phase 6c DRY lint already added pattern) plus `grep -r 'bg-\[#\|text-\[#\|border-\[#' src/` per repo to enumerate remaining. One-shot: run automated codemods where safe; manual review for complex gradients.

#### 11.2 — Semantic Mode-Switching Tokens (P1-05)

Add semantic aliases to `packages/theme/src/css/vars.css`:

```css
:root { --bg-base: var(--light-bg-primary); --text-base: var(--color-text-primary); }
.dark { --bg-base: var(--dark-bg-primary); --text-base: var(--color-text-inverted); }
```

This allows components to use `bg-[--bg-base]` instead of `dark:bg-dark-bg-primary`, removing the dark-mode coupling from utility classes.

#### 11.3 — Dark Status Tokens (P1-06)

Add `.dark {}` overrides for `--status-success`, `--status-warning`, `--status-error`, `--status-info` in `packages/theme/src/css/vars.css`.

#### 11.4 — Shared `<Logo />` Component (P0-03)

Build in `packages/ui`:

```tsx
<Logo slot="header" appSlug="crm7" colorScheme="dark" />
```

Implements 4-level resolution: sub-org → enterprise tenant → platform → default. Consumes `useTenantBrandingContext()`. Replace all per-app logo rendering with this component.

#### 11.5 — `packages/ui` Primitive Centralisation (P1-17)

Migrate `Button`, `Dialog`, `EmptyState`, `ErrorBoundary`, and `Logo` into `packages/ui`. BSU's `components.json` is now `cssVariables: true` (Theme-A fixed this) — re-run shadcn CLI to regenerate primitives with CSS variable classes, then migrate into the shared package. Apps import from `@bsuite/ui` rather than managing their own copies.

#### 11.6 — FOUC Prevention (BSU, R80.3, Conduit)

CRM7 already has the dark-mode class injection inline script in `index.html`. Add the same pattern to BSU `index.html`, R80.3 `index.html`, and Conduit `app/layout.tsx`.

#### 11.7 — Font Alignment (F1-1, F1-2, F1-3)

- Conduit: replace `next/font/google` with `@fontsource-variable/inter` self-hosted
- BSU: confirm `font-family: 'Inter Variable'` (not `'Inter'`) in self-hosted declaration
- BSU, R80.3: add `@fontsource/jetbrains-mono` (currently only in CRM7; `--font-mono` token references it)

#### 11.8 — PWA Asset Completion (P2-05, P2-06)

| App | Missing assets |
|-----|---------------|
| BSU | `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png` |
| R80.3 | `site.webmanifest`, `apple-touch-icon.png` |
| Conduit | Full PWA asset audit (public/ was 404 in prior audit) |
| braden | `site.webmanifest`, `apple-touch-icon.png`, PWA icons |
| throughput | All PWA assets + `favicon.ico` |

#### 11.9 — Storybook in `packages/ui` (P2-01)

Set up Storybook 8 in `packages/ui`. Create stories for every exported primitive. This enables visual regression testing and design handoff.

**Deliverable:** The BSuite design system is complete, documented, and enforced. All apps render identically in light and dark mode. Tailwind alpha modifiers work on all tokens. Logo resolution is consistent across all surfaces.

---

### Phase 12 — Mis-placed Route Consolidation

**Target: each app owns only its domain; BSU is the single platform portal**

| Task | From | To | Risk |
|------|------|----|------|
| Deprecate `CRM7:/settings/branding` | CRM7 | BSU | Medium — add redirect to BSU `/admin/branding` |
| Move `CRM7:/settings/organization` (sub-org hierarchy) | CRM7 | BSU | High — coordinate data migration |
| Move `CRM7:/settings/tester-licenses` | CRM7 | BSU | Low |
| Deprecate `R80.3:SettingsPage` branding/org section | R80.3 | BSU | Low |
| Deprecate `R80.3:OnboardingWizard` | R80.3 | BSU | Low — add redirect |
| Redirect `BSU:/calculator` → R80.3 | BSU | R80.3 | Low |
| Evaluate `BSU:/gto` + `BSU:/government` — keep as platform marketing or move to CRM7 | BSU | TBD | Low |

#### 12.1 — Sub-Organisation Hierarchy (P1-11)

Requires DB schema change (deferred from earlier phases, now addressable):

```sql
ALTER TABLE tenants ADD COLUMN parent_tenant_id UUID REFERENCES tenants(id);
CREATE INDEX ON tenants(parent_tenant_id);
```

Add hierarchical branding resolution Tier 0 in `useBranding`: sub-org → enterprise → platform → default.

**Deliverable:** Every route lives in exactly the right app. Platform concerns are in BSU. Domain concerns are in their respective apps. Navigation between apps uses BSU as the hub.

---

### Phase 13 — Observability + Testing (Wave 1 of Maturity Plan)

**Target: every app has error monitoring, smoke tests, and CI quality gates**

#### 13.1 — Sentry (P2-J07)

Install `@sentry/react` in all 5 D2C apps + `@sentry/nextjs` in Conduit. Configure DSN per environment. Add performance monitoring for Core Web Vitals. Current maturity score: 0.8/3 (none of the apps have Sentry).

#### 13.2 — Playwright E2E Tests (P1-J13)

Install `@playwright/test` in each app. Minimum critical-path smoke tests per app:

- **BSU:** login → dashboard; create organization; admin branding save
- **CRM7:** login → create contact; contact → client link; lead conversion
- **Conduit:** login → create vacancy; candidate application; hire to CRM7
- **R80.3:** login → calculator; apprentice form
- **throughput:** login → create idea

#### 13.3 — CSP Headers

Add `Content-Security-Policy` headers to all `vercel.json` files. Start permissive, tighten over time. Current: zero apps have CSP (Wave 0 of the maturity plan).

#### 13.4 — Web Vitals Monitoring

Wire `web-vitals` library in each app; report to a BSU analytics endpoint (or Vercel Analytics). Focus on CRM7 INP violations (confirmed 165–357ms range from prior audit — items 2, 4, 6 from the INP plan are still open: `startTransition` on state setters, `transition-all` scope, grid margin tuning).

**Deliverable:** Sentry active in all apps. CI fails on test regressions. CSP headers in place. INP violations resolved for CRM7 dashboard.

---

### Phase 14 — PageGridLayout Completion + World-Class UI Pass

**Target: every page in every app uses PageGridLayout; UI is polished to a world-class standard**

#### 14.1 — PageGridLayout Rollout (still open per audit)

| App | Status | Remaining work |
|-----|--------|---------------|
| BSU | ✅ Done (8 pages) | `AdminBranding.tsx` wrap (tech debt T2); action-menu dropdown clipping (T1) |
| CRM7 | ~40% done | Batches A–H — 41 remaining pages |
| R80.3 | ❌ Not done | `r80-calculator` + `r80-settings` views |
| Conduit | ❌ Not done | 8 `_view.tsx` files |
| throughput | ❌ Not done | All pages |
| braden | ❌ Not done | Non-interactive overlay mode |

#### 14.2 — CRM7 Broad UI Refresh Completion

Following the ~40% completion from the prior broad refresh:

- Dashboard finish pass (noted as in-progress at plan time)
- Remaining dashboard-adjacent admin/workflow surfaces
- Hero signal cards as clickable `<Link>` wrappers
- DND-kit `KeyboardSensor` for accessible drag
- B1 Bento grid layout (3-col top row + asymmetric second row)

#### 14.3 — Braden Admin Branding Editor

`BrandingAdmin.tsx` at braden `/admin/branding` — not built. Allows braden corporate theme management.

#### 14.4 — Email/Calendar Integration UI

The edge functions `email-inbox-sync` and `tasks-sync` are deployed (confirmed live). The missing UI:

- Settings: `Email Accounts` tab (`/settings/email-accounts`)
- In-app Inbox UI in Communications page
- Tasks sync badge + sync button on `/tasks`
- DB migration for `email_messages.direction/is_read/folder/snippet` + `tasks.external_id/provider`

#### 14.5 — Idea Hub (BSU `/ideas`)

`ideas` table exists in DB with 2+ unused indexes — the feature was designed. Build `IdeaHub.tsx` and wire route in `AppContent.tsx`.

#### 14.6 — Conduit Candidate Documents Tab

`r7_documents` table exists. Create `candidates/[id]/documents/page.tsx` + add tab to candidate `_view.tsx`.

#### 14.7 — Xero Integration Activation (P2-J03)

The 5-layer Xero integration is fully coded but flag-gated. Register the app at developer.xero.com; set `XERO_CLIENT_ID` + `XERO_CLIENT_SECRET` env vars in Vercel; flip `feature_flags.xero_integration = true` for the first tenant.

**Deliverable:** Every page in every app is on PageGridLayout. CRM7 dashboard passes Core Web Vitals. UI is consistent across all surfaces. Email integration is usable by end users.

---

### Phase 15 — Production Ship

**Target: all apps deployed to `main`/`master` on Vercel production; no P0/P1 findings open**

#### 15.1 — Development → Main Merge

Per `development` branch only policy (established in session instructions): once all above phases are green on `development`, open PRs from `development` → `main`/`master` for all 5 submodules + the bsuite monorepo. Execute per ship-all-apps skill Phase 5–6 pattern.

#### 15.2 — Production Smoke Test

After each production deploy, run the Playwright smoke suite (Phase 13.2) against production URLs:

- BSU: `suite.crm7.app`
- CRM7: `crm7.app` (confirm active domain)
- Conduit: `conduit.crm7.app`
- R80.3: `r8.crm7.app`
- throughput: confirm domain

#### 15.3 — Tenant Onboarding

With BSU auth working, schema builder active, and all one-shot flows operational, the platform is ready for real enterprise tenant onboarding. Create the first non-Braden Group tenant end-to-end as a production smoke test of the full tenant lifecycle.

---

## Execution Summary

| Phase | Description | P0 items resolved | Estimate |
|-------|-------------|:---:|---------|
| **Phase 6** | Security & infra hardening | 7 P0s | 2–3 days |
| **Phase 7** | One-shot FK migrations + EntitySelector UI | 1 P0, 8 P1s | 4–5 days |
| **Phase 8** | Schema builder + page builder admin UI | 1 P0 | 4–5 days |
| **Phase 9** | SSO consolidation + auth hardening | 2 P0s | 2–3 days |
| **Phase 10** | Dependency & build standardisation | — | 2 days |
| **Phase 11** | Theme & design system completion | — | 3–4 days |
| **Phase 12** | Mis-placed route consolidation | — | 2 days |
| **Phase 13** | Observability + testing | — | 2–3 days |
| **Phase 14** | PageGridLayout + world-class UI | — | 5–7 days |
| **Phase 15** | Production ship | — | 1 day |

**Total estimated effort:** 27–35 agent-days from today to full production.

**Critical path:** Phase 6 → Phase 9 → Phase 15. Everything else can run in parallel with the critical path or remain queued after the production ship, provided P0 security issues are resolved first and every non-critical item stays represented in the merged backlog with an owner and acceptance criteria.

**Immediate next action:** Resolve conduit SSR divergence (Phase 6.0) — cherry-pick `2f38cc3` + `5870990` onto `fix/conduit-ssr-prerender-guard` from `development`, open new PR, merge once CI passes. This unblocks conduit Vercel and clears the only remaining Phase 5 outstanding item.

---

## Appendix: Confirmed-Live Schema Cross-Link Status (2026-04-23)

| Relationship | DB Column | Status |
|---|---|:---:|
| Contact → Client | `contacts.client_id` (uuid) | ✅ Exists (Phase 6c) |
| Lead → Contact | `leads.contact_id` (uuid) | ✅ Exists (Phase 6c) |
| Lead → Client | `leads.client_id` (uuid) | ✅ Exists (Phase 6c) |
| Apprentice → Contact | `apprentices.contact_id` | ✅ Exists (prior) |
| Placement → Client | `placements.client_id` | ✅ Exists (prior) |
| Candidate → Contact | `r7_candidates.contact_id` | ✅ Exists (prior) |
| People → Contact | `people.contact_id` | ✅ Exists (prior, unenforced) |
| Client → primary Contact | `clients.primary_contact_id` | ✅ Exists (prior) |
| Field Officer → Contact | `field_officers.contact_id` | ✅ Exists (prior) |
| Employer → Contact | `employers.primary_contact_id` | ❌ Missing |
| Mentor → Contact | `mentors.contact_id` | ❌ Missing |
| Training Provider → Contact | `training_providers.contact_id` | ❌ Missing |
| Funding Source → Contact | `funding_sources.contact_id` | ❌ Missing |
| Host Agreement → Signatory | `host_agreements.signatory_contact_id` | ❌ Missing |
| Opportunity → Client | `opportunities.client_id` | ❌ Missing |
| Vacancy → Client | `vacancies.client_id` | ❌ Missing |
| Tenant → Parent Tenant | `tenants.parent_tenant_id` | ❌ Missing (sub-org) |

**Score: 9/17 implemented.** Phase 7 completes the remaining 7 (+ sub-org hierarchy in Phase 12).
