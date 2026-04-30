# Misplaced Routes Audit — Phase 12.1

**Audit date:** 2026-04-23
**Phase:** 12 (per `docs/plans/20260423-bsuite-production-plan.md` §Phase 12)
**Source of truth for ownership:** `docs/20260227-dry-one-shot-architecture-v1.01A.md` §1 Entity Ownership Map
**Auditor:** Claude (Phase 12 implementer)
**Coordination:** Phase 6 (Claude main — edge fns + BSU AuthContext), Phase 7 (feat/phase7-fks-and-convergence — entity FKs + EntitySelector), Phase 9 (SSO consolidation). No overlap.

---

## 1 — Ownership Matrix (per DRY v1.01A §1)

| App | Owns (canonical create/edit UI) |
|-----|---------------------------------|
| **BSU** | Billing, subscriptions, users/tenants admin, platform settings, developer portal, embed routes, organization admin (create + sub-org management), platform-level schema builder + page builder |
| **CRM7** | Contacts, leads, clients, opportunities, placements, apprentices, mentors, timesheets, invoices, AI plugins, tenant-level custom fields / schema-builder (tenant-scope only), feature flag admin (tenant-scope) |
| **Conduit** | Candidates, jobs, pipeline, talent pools, applications, interviews, offers, onboarding (conduit-level), candidate/employer portals |
| **R80.3** | Wage calculator, charge rates, award schedules, EA manager |
| **braden** | Corporate marketing only |
| **throughput** | Ideas, research, business plans, refinements |

---

## 2 — Enumerated Routes Per App

### 2.1 BSU (`business-suite-unified/src/components/AppContent.tsx`)

Routes inside `MainApp` (authenticated):

| Route | Component | Domain fit |
|-------|-----------|------------|
| `/` | `UnifiedDashboard` | BSU — portal home |
| `/settings` | `Settings` | BSU — platform settings |
| `/billing` | `Billing` | BSU (owner) |
| `/admin` | `AdminPanel` | BSU (owner) |
| `/admin/branding` | `AdminBranding` | BSU (owner — platform branding Tier 1 + tenant Tier 2) |
| `/admin/platform-kit` | `PlatformKit` | BSU (owner) |
| `/analytics` | `Analytics` | BSU — portal-level aggregation |
| `/gto` | `GTO` | **MARKETING** — not user-facing after signup. See §3.2 |
| `/government` | `Government` | **MARKETING** — see §3.2 |
| `/documents` | `Documents` | BSU — cross-tenant doc library; OK here |
| `/branding` | `Branding` | BSU — tenant-facing branding page (distinct from `/admin/branding`) |
| `/ideas`, `/ideas/new`, `/ideas/:id` | Idea Hub | **MISPLACED** — throughput owns Ideas. See §3.1 |
| `/settings/schema-builder` | `SchemaBuilder` | BSU — platform-level; OK (tenant-scope schema-builder lives in CRM7, correctly dual-owned) |
| `/organization/new` | `CreateOrganization` | BSU (owner) |
| `/developer/*` | `DeveloperPortal` | BSU (owner — developer portal routes) |
| `/embed/contact` | `EmbedContact` | BSU (owner — embed forms) |
| `/embed/lead-form` | `EmbedLeadForm` | BSU (owner — embed forms) |
| `/login`, `/auth/callback`, `/reset-password`, `/oauth/consent` | auth scaffolding | BSU (owner — OAuth server) |

No obvious misplacements. **Findings:**
- `/ideas/*` is debatable — BSU has an idea hub but throughput is the owning app per DRY v1.01A. Treatment: **DEFER** — BSU idea hub is a light tenant-portfolio lens, not the canonical create/edit UI; throughput remains the idea owner. Add a "Manage in Throughput" deep-link on BSU idea hub instead of removing.
- `/gto`, `/government` are marketing-style pages. The production plan §Phase 12 table calls this out: "Evaluate `BSU:/gto` + `BSU:/government` — keep as platform marketing or move to CRM7". Treatment: **DEFER** — these are cross-tenant industry landing pages; no tenant data; keep as BSU platform marketing.

---

### 2.2 CRM7 (`crm7/src/App.tsx`)

Full route list truncated; misplaced-candidate routes:

| Route | Component | Ownership | Decision |
|-------|-----------|-----------|----------|
| `/settings/users` | `SettingsUsers` | **BSU** (users admin) — but **tenant-scoped user mgmt is legitimate CRM7 surface** (scope-split) | **Accept with reason** — tenant-scoped user admin is a legitimate CRM7 concern (assign users to CRM7 features/permissions). Platform-wide user admin remains in BSU `/admin`. |
| `/settings/permissions` | `SettingsPermissions` | mixed — tenant-scoped role mgmt is legitimate CRM7 | **Accept with reason** — same as above |
| `/settings/configuration` | `SettingsConfiguration` | CRM7 (app config) | OK |
| `/settings/feature-flags` | `SettingsFeatureFlags` | CRM7 (tenant flags) | OK — plan §8.4 explicitly puts this at CRM7 `/settings/feature-flags` |
| `/settings/organization` | `SettingsOrganization` | **MISPLACED** — organization entity is BSU-owned (tenants/sub-orgs). Current CRM7 impl is a stub that links users to `${VITE_BSU_URL}/organization/new` per comment at App.tsx:626. | **Move to BSU** — replace CRM7 stub with a permanent redirect. Sub-org management lives in BSU per plan §12.1 + §12.3. |
| `/settings/custom-fields`, `/custom-fields-admin`, `/settings/picklists`, `/settings/form-layouts`, `/settings/custom-pages` | tenant custom-UX builders | CRM7 (tenant schema-builder scope) | OK — dual-owned pattern: BSU `/settings/schema-builder` is platform-level; CRM7 is tenant-level |
| `/settings/schema-builder` | `SettingsSchemaBuilder` | CRM7 (tenant-scope schema-builder) | OK — matches plan §Phase 8 dual-scope split |
| `/settings/data-sharing` | `SettingsDataSharing` | CRM7 (tenant data-sharing policy) | OK |
| `/settings/tester-licenses` | `SettingsTesterLicenses` | **MISPLACED** — developer / tester licensing is a platform concern, not a CRM7 domain concern. | **Move to BSU** — defer now, add redirect. Developer portal at BSU `/developer/*` is the correct home. **Flag for future** (Phase 12 follow-up PR) — low risk. |
| `/settings/audit-log`, `/settings/data-management`, `/settings/import-export*`, `/settings/bulk-operations`, `/settings/integrations/*`, `/settings/role-overrides`, `/settings/module-visibility` | tenant-scoped admin | CRM7 (tenant admin) | OK |
| `/settings/branding` | `SettingsBranding` | **MISPLACED** — tenant branding is BSU Tier 2; CRM7 had a duplicate branding form. | **Move to BSU** — per plan §Phase 12 table: "Deprecate `CRM7:/settings/branding` → BSU — Medium — add redirect to BSU `/admin/branding`". **Flag for future** — Phase 12 follow-up PR in CRM7 repo; out-of-scope here because Phase 7 implementer holds `crm7` checkout. |
| `/settings/govt-integrations` | `GovtIntegrations` | CRM7 (tenant integrations: RAM/USI/ADMS are per-tenant creds) | OK |
| `/settings/email-accounts` | `SettingsEmailAccounts` | CRM7 (per-user email OAuth) | OK |
| `/billing/*` | invoice management (financial module) | CRM7 — **not to be confused with BSU `/billing`** which is subscription billing | OK — different domains: CRM7 `/billing` = issued-invoices; BSU `/billing` = subscription-payer. Naming collision: **Flag for future rename** — CRM7 should be `/financial/invoicing` (already exists) and `/billing` should redirect there. Low risk. |
| `/admin/award-updates` | `AdminAwardUpdates` | CRM7 (award data sync — payroll domain) | OK |
| `/apprentices/*`, `/people/*`, `/contacts/*`, `/leads/*`, `/opportunities/*`, `/placements/*`, `/clients/*`, `/timesheets/*`, `/quotes/*`, `/deals/*`, `/pipeline/*`, `/reports/*`, `/financial/*`, `/communications/*`, `/insights/*`, `/analytics` | CRM domain | CRM7 (owner) | OK |

**CRM7 misplaced routes:**
1. `/settings/organization` — misplaced (canonical BSU). Already stubbed to link out. Treatment: **Move now in CRM7** → replace with `<RedirectTo to="${VITE_BSU_URL}/settings/organization" />`. Out-of-scope here (Phase 7 holds crm7 checkout). **Defer to Phase 7 implementer** or Phase 12 follow-up PR.
2. `/settings/tester-licenses` — misplaced. **Defer to Phase 12 follow-up PR.**
3. `/settings/branding` — misplaced. Plan explicitly tags this; **Defer to Phase 12 follow-up PR** (Phase 6 implementer is separately wiring BSU `/admin/branding` to `platform_branding` singleton per P1-04).

---

### 2.3 Conduit (`conduit/src/app/`)

Next.js App Router structure:

| Route | Ownership | Decision |
|-------|-----------|----------|
| `/(dashboard)` | conduit home | OK |
| `/(dashboard)/candidates/*` | conduit (owner) | OK |
| `/(dashboard)/jobs/*` | conduit (owner) | OK |
| `/(dashboard)/pipeline/*` | conduit (owner) | OK |
| `/(dashboard)/talent-pools/*` | conduit (owner) | OK |
| `/(dashboard)/interviews/*` | conduit (owner) | OK |
| `/(dashboard)/offers/*` | conduit (owner) | OK |
| `/(dashboard)/onboarding/*` | conduit (owner of conduit-side onboarding; CRM7 owns apprentice conversion) | OK |
| `/(dashboard)/compliance/*` | conduit (conduit-side compliance checks per DRY v1.01A §1) | OK |
| `/(dashboard)/analytics` | conduit (conduit-scoped analytics) | OK |
| `/(dashboard)/settings/*` | tenant settings | OK — conduit-scoped settings |
| `/(dashboard)/settings/schema-builder` | `SettingsSchemaBuilder` | Tenant-scoped schema-builder is legitimate (dual-owned); OK |
| `/portal/careers`, `/portal/candidate`, `/portal/employer` | conduit (candidate/employer portals) | OK |
| `/auth/login`, `/auth/register` | **MISPLACED** — per plan §Phase 9.1: "`/auth/login` and `/auth/register` in Conduit redirect to BSU `/login?return_to=conduit`". | **Defer to Phase 9 implementer** (SSO consolidation) — no overlap with Phase 12. |
| `/auth/callback` | conduit (owns its PKCE callback) | OK — required per plan §Phase 9.1 |

No Phase 12-specific conduit misplacements. All auth-related misplacements belong to Phase 9.

---

### 2.4 R80.3 (`R80.3/src/App.tsx`)

R80.3 uses `useState` view-switching instead of a router. Active views:

| View | Ownership | Decision |
|------|-----------|----------|
| `calculator` | R80.3 (owner) | OK |
| `manage` (ApprenticeManager) | **Arguable** — full apprentice CRUD belongs to CRM7 per DRY. R80.3 currently has its own ApprenticeManager for rate-scoped apprentice subsets. | **Accept with reason** — DRY v1.01A §1 marks Apprentices as CRM7-owned but notes "R8 (rates)" reads. Current ApprenticeManager is read-heavy + rate-context inline edits. **Flag for future** — migrate to CRM7 EntitySelector read-mode once Phase 7 ships. |
| `compare`, `export`, `agreements`, `payday-super` | R80.3 (owner of compute) | OK |
| `settings` (SettingsPage) | **PARTIALLY MISPLACED** — plan §Phase 12 calls for "Deprecate `R80.3:SettingsPage` branding/org section". | **Defer to Phase 12 follow-up PR** (R80.3 repo) — low risk. |
| `schema-builder` (SchemaBuilderView) | **MISPLACED** — platform-level schema-builder belongs to BSU; tenant-level to CRM7. R80.3 should be a pure consumer (no authoring). | **Defer to Phase 12 follow-up PR** (R80.3 repo) — remove authoring UI, keep TenantLayoutSlot consumer (already wired per Phase 5). |
| Onboarding wizard (inline) | **MISPLACED** — plan §Phase 12: "Deprecate `R80.3:OnboardingWizard` → BSU — Low — add redirect". | **Defer to Phase 12 follow-up PR** (R80.3 repo). |

---

### 2.5 braden (`braden/src/Routes.tsx`)

| Route | Ownership | Decision |
|-------|-----------|----------|
| `/`, `/services/:serviceId`, `/apprenticeships`, `/traineeships`, `/recruitment`, `/products`, `/privacy`, `/terms`, `/:slug` | braden (corporate marketing) | OK |
| `/auth/callback` | braden (PKCE callback) | OK — required |
| `/admin/branding` | **MISPLACED** — braden exemption: braden is BRADEN-EXEMPT from the D2C oklch rule and has its own Red/Gold palette. Admin branding for braden corp-site is out-of-scope for the platform `/admin/branding` flow — it's a static corporate branding, not a multi-tenant surface. | **Accept with reason** — braden `/admin/branding` manages the braden corporate theme only. It intentionally does not flow through the platform branding tiers. Keep local. |

No Phase 12-actionable misplacements in braden.

---

### 2.6 throughput (`throughput/src/App.tsx`)

| Route | Ownership | Decision |
|-------|-----------|----------|
| `/` (Dashboard) | throughput | OK |
| `/ideas/new`, `/ideas/:id`, `/ideas/:id/{business-plan,research,export}` | throughput (owner) | OK |
| `/launch`, `/teams`, `/analytics`, `/notifications`, `/pricing`, `/profile`, `/settings` | throughput tenant surface | OK |
| `/monitoring` | throughput (error/health monitoring) | OK — though plan §13.1 (Sentry) may consolidate this |
| `/login` | **MISPLACED** — throughput should use BSU SSO per Phase 9. | **Defer to Phase 9 implementer.** |
| `/auth/callback` | throughput (PKCE callback) | OK — required |

No Phase 12-actionable misplacements in throughput.

---

## 3 — Per-Route Findings Register

### 3.1 "Act now" findings (this PR)

None within Phase 12's safe scope. The three in-scope CRM7 misplacements (`/settings/branding`, `/settings/organization`, `/settings/tester-licenses`) all require a CRM7-repo PR but `crm7/` is held by the Phase 7 implementer — we cannot ship CRM7 changes in this phase without a merge conflict.

**Only the BSU-side work is actionable without overlap:**
- §12.2 tenant hierarchy DB migration (cycle-prevention trigger + `ON DELETE SET NULL` + duplicate-index cleanup)
- §12.3 BSU sub-organisation admin UI
- §12.4 RLS hierarchy-select policies (DB-only; independent of any app checkout)

### 3.2 "Defer" findings (flagged for follow-up PRs)

| # | Location | Action | Owning implementer |
|---|----------|--------|--------------------|
| F-01 | CRM7 `/settings/branding` | Replace with `<RedirectTo to="${VITE_BSU_URL}/admin/branding" />` | Phase 12 follow-up PR after Phase 7 merges |
| F-02 | CRM7 `/settings/organization` | Replace with `<RedirectTo to="${VITE_BSU_URL}/settings/organization" />` (or BSU `/organization/new` for non-tenanted users) | Phase 12 follow-up PR after Phase 7 merges |
| F-03 | CRM7 `/settings/tester-licenses` | Replace with `<RedirectTo to="${VITE_BSU_URL}/developer/tester-licenses" />` and build BSU route | Phase 12 follow-up PR |
| F-04 | R80.3 SettingsPage branding/org section | Remove; link to BSU `/admin/branding` + `/settings/organization` | Phase 12 follow-up PR |
| F-05 | R80.3 OnboardingWizard | Remove; link to BSU OnboardingWizard | Phase 12 follow-up PR |
| F-06 | R80.3 SchemaBuilderView (authoring mode) | Remove authoring UI; keep TenantLayoutSlot consumer | Phase 12 follow-up PR |
| F-07 | BSU `/calculator` redirect (if present) | Redirect to R80.3 | Verified: no `/calculator` route in BSU. **No-op.** |
| F-08 | BSU `/ideas/*` → Throughput deep-link | Add "Open in Throughput" affordance; keep light portfolio lens | P2 — deferred |
| F-09 | BSU `/gto`, `/government` | Keep as platform marketing; no action | Resolved — no move |
| F-10 | CRM7 `/billing` → `/financial/invoicing` rename + redirect | Namespace collision with BSU subscription billing | P2 — deferred |

### 3.3 "Accept with reason" (permanently OK)

| # | Location | Reason |
|---|----------|--------|
| A-01 | CRM7 `/settings/users`, `/settings/permissions` | Tenant-scoped user/role mgmt is a legitimate CRM7 surface. Platform-wide user admin remains in BSU `/admin`. |
| A-02 | CRM7 tenant schema-builder / custom-fields / picklists / form-layouts / custom-pages | Tenant-scope authoring (dual-ownership with BSU platform-scope). |
| A-03 | Conduit `/(dashboard)/settings/schema-builder` | Same dual-ownership pattern, conduit-scope. |
| A-04 | braden `/admin/branding` | Corporate-theme-only; intentionally does not flow through multi-tenant branding tiers. |
| A-05 | R80.3 `ApprenticeManager` view | Rate-context inline edits; DRY v1.01A §1 marks "R8 (rates)" reads explicit. Flagged for re-review in Phase 7 follow-up but not breaking DRY. |

---

## 4 — Phase 12 Execution Summary

| Sub-phase | Status | Delivered in this PR |
|-----------|:-----:|----------------------|
| 12.1 Audit | DONE | This doc |
| 12.2 Hierarchy DB | DONE | Migration `20260423T_phase12_tenant_hierarchy_hardening` applied — adds cycle-prevention trigger, ON DELETE SET NULL on `tenants_parent_tenant_id_fkey`, dedups `parent_tenant_id` index |
| 12.3 BSU admin UI | DONE | `business-suite-unified/src/pages/Admin/SubOrganizations.tsx` + route wiring in `AppContent.tsx` |
| 12.4 RLS hierarchy-select | DONE | Migration `20260423T_phase12_hierarchy_rls` — adds `*_hierarchy_select` policy pattern on selected tenant-scoped tables |
| Mis-placed route moves | DEFERRED — 6 findings F-01…F-06 | Separate PRs post-Phase 7 merge |

**Count summary:** 10 candidate findings enumerated across 6 apps. **0 moved in this PR** (Phase 7 holds CRM7 + R80.3 app checkouts). **6 deferred with owning implementers named.** **4 accepted with documented reason.**

---

## Appendix A — Ownership Decision Flowchart

```
Route candidate
    ↓
Is this a platform concern (billing, subscriptions, users, tenants, developer portal, embed)?
    YES → BSU
    NO → continue
    ↓
Is this a CRM domain entity (contacts, leads, clients, opportunities, placements, apprentices, timesheets, invoices, awards)?
    YES → CRM7
    NO → continue
    ↓
Is this a sourcing/recruitment entity (candidates, jobs, pipeline, talent pools, applications, interviews, offers)?
    YES → Conduit
    NO → continue
    ↓
Is this a wage calculation entity (charge rates, award data, EA manager)?
    YES → R80.3
    NO → continue
    ↓
Is this an idea/research/plan entity?
    YES → Throughput
    NO → continue
    ↓
Is this corporate marketing content?
    YES → braden
    NO → Needs explicit decision — propose to architect before adding
```

---

## Appendix B — Cross-references

- `docs/20260227-dry-one-shot-architecture-v1.01A.md` §1 — Entity Ownership Map (source of truth)
- `docs/plans/20260423-bsuite-production-plan.md` §Phase 12 — authoritative task list
- `docs/20260227-auth-map-reference-v1.00A.md` — auth split: Phase 9 holds all `/auth/login` consolidation work
- `packages/schema-registry/` — TenantLayoutSlot + useTenantNavigation consumers (Phase 5 basis for platform/tenant schema-builder split)
