# Entity linkage, one-shot enforcement, and schema/page-builder uplift — cross-app

**Status:** W (Working — drafted 2026-04-22, §7 decisions captured 2026-04-22, ready to start Phase 1 after final sign-off)
**Revision:** v1.01W — folds in Braden's decisions on polymorphic modelling, TGA API seeding, candidate→contact merge, tenant-scoped authoring isolation, and braden lead flow audit result
**Applies to:** All 6 apps (BSU, CRM7, conduit, R80.3, braden, throughput)
**Supersedes nothing — extends:** [docs/20260227-dry-one-shot-architecture-v1.00A.md](../20260227-dry-one-shot-architecture-v1.00A.md)
**Parallel to:** [docs/plans/20260422-theme-centralisation-v1.00A.md](20260422-theme-centralisation-v1.00A.md) (theme work runs independently)
**Audit parent:** [plans/bsuite-world-class-audit-adaptive-sonnet.md](/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md) — new Part P

---

## 1. Context

The one-shot / DRY policy is already written and authoritative ([docs/20260227-dry-one-shot-architecture-v1.00A.md](../20260227-dry-one-shot-architecture-v1.00A.md) §6 Red Flag #1: *"Free-text field for an entity that has a table — Use an EntitySelector"*). Today 2026-04-22 the user confirmed while testing CRM7 that **adding a Contact with a "company" field does not link that company to the `clients` / `host_employers` table** — it stays as free text. Inversely, the Client record has no contact-roster surface. This is a live DRY violation on the golden-path CRM flow.

An audit was run across all 6 apps. Findings (full citations below):

- **4 CRITICAL** free-text-where-FK-should-exist gaps on CRM7's golden path: Contact.company, Lead has no contact_id, Lead.company, Invoice has no direct client_id.
- **4 MEDIUM** gaps (HostEmployer contact_* fields, VetAssessment.host_employer_name, Placement.award_code as TEXT, Apprentice training_contract_number as TEXT).
- **4 GTO-domain entities missing entirely:** StateTrainingAuthority, AASS (federal registration event), UnitOfCompetency, Incident (parent of WHS alerts).
- **Schema-builder capability is uneven:** BSU has full entity + page builder; CRM7 has custom-fields + PageGridLayout; R80.3 is read-only; conduit / braden / throughput have none.
- **Page-builder capability is even more uneven:** Only BSU (Developer Portal) and CRM7 (PageGridLayout / dashboard widgets) can compose pages at runtime.

The combined effect: the suite does NOT yet deliver "enter once, use everywhere" for a GTO running contacts → leads → clients → apprentices → placements → timesheets → invoices — because the FK chain is broken in 4 places. Tenants also cannot self-serve custom entities on 4 of 6 apps.

## 2. Scope rules

Same doctrine as Part N: every change lands on `development` first, smoke-verified against the dev preview, promoted to `main` only when confirmed green. No `--no-verify`. One-shot policy = Red Flag #1 means **any new free-text field for an existing entity blocks the PR**.

Apps in scope for cross-linking fixes: **all 6** (the DRY doc explicitly says "Applies to: CRM7 • R8 • BSU • Conduit • All future modules" — that includes braden + throughput).

Apps in scope for schema-builder uplift: **all 6**, but the strategy is **read-from-one, author-in-one** — BSU is the authoring surface (Developer Portal); consumer apps read via `tenant_entities` + `tenant_entity_relations` with `app_scope` filters.

---

## 3. Gap inventory — cross-app entity linkage

### 3.1 CRITICAL (golden-path blockers, ship Phase 1)

| # | Source entity | Field | Current | Target entity | Fix | Apps | Effort |
|---|---|---|---|---|---|---|---|
| 1 | Contact | `company` | TEXT free-text | Client / HostEmployer | Add `client_id uuid` FK + `CompanySelector` (thin wrapper on existing `ClientSelector`); migrate existing rows by fuzzy name match, flag unresolved for review | CRM7 (owner), BSU reads | M |
| 2 | Lead | — | No `contact_id` column at all | Contact | Add `contact_id uuid` FK + Zod + Form swap to `ContactSelector`; dedupe existing by email/name before backfill | CRM7 | M |
| 3 | Lead | `company` | TEXT free-text | Client / HostEmployer | Add `client_id uuid` FK + `ClientSelector` in Lead form; same migration fuzzy-match pass as #1 | CRM7 | S |
| 4 | Invoice | — | Only `host_employer_id`; no general `client_id` | Client (direct) | Add `client_id uuid` FK; backfill from `host_employer_id → clients` join where HostEmployer IS a Client variant | CRM7 | S |

### 3.2 MEDIUM (compliance / billing coherence, ship Phase 2)

| # | Source entity | Field | Current | Target entity | Fix | Apps | Effort |
|---|---|---|---|---|---|---|---|
| 5 | HostEmployer (Client) | `contact_name` + `contact_email` + `contact_phone` | TEXT triplet | Contact | Add `primary_contact_id` FK; keep denorm snapshots for historical accuracy (mirrors PR #266 Placement pattern) | CRM7 | S |
| 6 | Placement | `award_code` | TEXT | AwardRate (R80.3 owned table) | Add `award_rate_id` FK; backfill lookup by code; migrate form to `AwardRateSelector` | CRM7 + R80.3 coordinated | M |
| 7 | VetAssessment | `host_employer_name` | TEXT | HostEmployer | Add `host_employer_id` FK | CRM7 | S |
| 8 | Apprentice | `training_contract_number` | TEXT | TrainingContract (new — see §4) | Create TrainingContract entity first; then convert field to FK | CRM7 | M |

### 3.3 CROSS-APP WRITE VIOLATIONS

| # | Entity | Owner app | Suspected violators | Status (2026-04-22) | Action |
|---|---|---|---|---|---|
| V1 | `contacts` | CRM7 | conduit (candidates system) | **CONFIRMED — merge-on-hire required** per §7.3 | When Conduit marks a candidate `hired`, the handoff flow (Part N.5.a, already shipped) creates an apprentice in CRM7; extend the same path to also dedup/merge into `contacts` by email. Migration backfills existing hired candidates |
| V2 | `leads` | CRM7 | braden lead form | **NOT a violation** — braden calls the shared `lead-capture` edge function which writes to `leads` + `contacts` with `tenant_id='<braden-website-tenant-uuid>'`. [braden/src/components/contact/useEnhancedContactForm.ts:19-34](../../braden/src/components/contact/useEnhancedContactForm.ts#L19-L34) | No fix needed |
| V3 | `users` | BSU | All | Already FK'd to `auth.users`; no app mirrors | No fix needed; verify via grep pass in Phase 4 |
| V4 | `apprentices` | CRM7 | R80.3 | R80.3 reads `apprentices` for rate calc | Confirm READ-only via `schemaBuilderService` pattern, no local clone table |
| **V5** | `lead-capture` edge function | CRM7 (canonical) | **DUPLICATED in BSU** — [business-suite-unified/supabase/functions/lead-capture/index.ts](../../business-suite-unified/supabase/functions/lead-capture/index.ts) diverges from [crm7/supabase/functions/lead-capture/index.ts](../../crm7/supabase/functions/lead-capture/index.ts) | **NEW violation found 2026-04-22** — two edge function copies have drifted | Delete BSU copy; deploy single canonical version under CRM7 project; update braden's Supabase client config if it currently points at a specific project ref |

## 4. Missing GTO-domain entities

Per the CLAUDE.md GTO glossary (RTO = training provider, STA = state training authority with carriage, AASS = federal registration via ADMS, GTO Standards 2017 has 3 elements). Current entity coverage:

| Entity | Status | Owner app | Fix |
|---|---|---|---|
| TrainingProvider (RTO) | ✓ Partial — exists as table but RTO#/funding-body links missing | CRM7 | Add `rto_registration_status` enum + `funding_body_ids uuid[]` FK to FundingSource |
| **StateTrainingAuthority (STA)** | ✗ MISSING | CRM7 (new) | **Single table with state discriminator** (decided 2026-04-22 — see §7.1). Create `state_training_authorities` table: `id uuid pk`, `state auStateEnum`, `name text`, `registration_url text`, `api_endpoint text`, `is_primary boolean`. Seed 8 AU states with DTWD (WA), TAFE NSW, DECI (SA), etc. |
| **AASS (Australian Apprenticeship Support Services)** | ✗ MISSING | CRM7 (new) | Create `aass_registrations` table: `apprentice_id uuid FK`, `registration_number text`, `registered_at timestamptz`, `adms_submission_id text`, `status enum` |
| **TrainingContract** | ✓ Partial — just a TEXT field on Apprentice | CRM7 (promote to entity) | Create `training_contracts` table: `contract_number text UNIQUE`, `apprentice_id uuid FK`, `sta_id uuid FK`, `aass_registration_id uuid FK`, `rto_id uuid FK`, `host_employer_id uuid FK`, `start_date`, `nominal_end_date`, `actual_end_date`, `status enum` |
| FundingSource | ✓ Exists (`funding_sources` table) | CRM7 | No change |
| Qualification (TGA code) | ✓ Exists | CRM7 | No change |
| **UnitOfCompetency** | ✗ MISSING | CRM7 (new) | Create `units_of_competency` table: `code text UNIQUE`, `title text`, `description text`, `tga_status enum`. Plus `qualification_units` join: `qualification_id + unit_id + core_or_elective + sequence`. **Seed source: official training.gov.au web services** (decided 2026-04-22 — see §7.2). New edge function `tga-sync` pulls qualifications + units from <`https://ws.sandbox.training.gov.au/`> (sandbox) / production endpoint; CSV fallback retained for offline bootstrap |
| CompetencyAchievement | ✓ Exists as `apprentice_competencies` | CRM7 | No change; will benefit from UnitOfCompetency FK when §UnitOfCompetency lands |
| **Incident (WHS parent)** | ✗ MISSING — only `compliance_alerts` exist | CRM7 (new) | Create `incidents` table: `tenant_id`, `apprentice_id` nullable FK, `placement_id` nullable FK, `host_employer_id` nullable FK, `incident_type enum`, `occurred_at`, `reported_at`, `severity enum`, `description text`, `resolution_notes text`, `status enum`. `compliance_alerts` gets nullable `incident_id` FK |
| Document | ✓ Exists | CRM7 | No change |
| Notification | ✓ Exists | CRM7 | No change |
| **Reminder** | ✗ MISSING — no scheduling entity | CRM7 (new) | Create `reminders` table: `owner_id uuid FK users`, `related_entity_type text`, `related_entity_id uuid`, `due_at timestamptz`, `repeat_rule text` (RRULE), `completed_at timestamptz`. Trigger on `notifications` insert when due fires |
| Activity / Interaction | ✓ Partial — generic `Activity` interface exists, no dedicated Note/Interaction table | CRM7 | Create `interactions` table if agent-productivity tier needs it (phone call log, meeting note, email thread anchor); low priority |

## 5. Schema-builder + page-builder capability matrix — three-tier authoring model

Decided 2026-04-22 (§7.4): The platform supports full runtime customisation, but with **strict isolation tiers** so enterprise tenants can reshape their own tenant tree without touching braden.com.au or developer-only surfaces.

### 5.1 Authoring tiers

| Tier | Who | Can author | Cannot author |
|---|---|---|---|
| **Platform Developer** | `braden.lang77@gmail.com` / platform_admin role | Everything: entities, fields, relations, pages, widgets, navigation, themes, on every app including braden.com.au and developer-only sections | Nothing restricted |
| **Enterprise Owner/Admin** | enterprise tenant owner OR admin role | Entities, fields, relations, pages, widgets, navigation, themes — **scoped to their own enterprise tenant + all sub-organisations under it** | braden.com.au surfaces, developer-only pages, any tenant outside their tree |
| **Tenant Manager/Staff** | within a single tenant below enterprise | Consume only (render composed pages authored above) | Any authoring |
| **Tenant Viewer** | view-only | Consume only | Any authoring |

RLS enforces every write. The DB-level check is: `(authoring_user_role IN ('platform_admin','developer')) OR (target_tenant_id IN descendants_of(authoring_user.enterprise_tenant_id) AND target_scope != 'braden' AND target_scope != 'developer_only')`.

### 5.2 Current state vs target state

| App | Schema-builder today | Page-builder today | Target |
|---|---|---|---|
| BSU | ✓ Full (Developer Portal /developer/schema) | ✓ Full (Developer Portal /developer/website + widget compositor) | **Authoring home** for BOTH Platform Developer AND Enterprise Owner/Admin tiers. Two UI modes: "Platform mode" (full access) vs "Enterprise mode" (scoped to your tenant tree). Mode is auto-detected from user role |
| CRM7 | ✓ Partial (custom fields only) | ✓ Partial (PageGridLayout for dashboards) | Consumer only. Replaces own schema-builder with `@bsuite/schema-registry` consumer. Renders BSU-authored pages at known mount points |
| R80.3 | Read-only via `schemaBuilderService.ts` | ✗ None | Consumer only. Same `@bsuite/schema-registry` |
| conduit | ✗ None | ✗ None | Consumer only. Next.js 16 wrinkle — widget catalogue needs RSC-safe variants (server-render fallback for client-only widgets) |
| braden | ✗ None (marketing site) | ✗ None | **Platform-developer-only authoring** for braden.com.au surfaces. Enterprise tenants have NO access to braden. Lead form fields can be tenant-customised where a tenant is embedding the braden lead flow under their own org (see §5.6) |
| throughput | ✗ None | ✗ None | Consumer only |

### 5.3 Core design

- **BSU is the single authoring app** for all tiers. No app-specific schema or page builder. BSU's Developer Portal writes to `tenant_entities` + `tenant_entity_relations` + `tenant_field_definitions` + `tenant_page_layouts` (new) + `tenant_navigation` (new).
- **Every consumer app reads via a shared hook** — `useTenantSchema(scope)` + `useTenantPageLayout(routePath)` + `useTenantNavigation()`. Hooks live in a new `@bsuite/schema-registry` npm package (mirrors `@bsuite/theme` pattern).
- **`app_scope` + tenant scope BOTH enforced**: row visible if `(app_scope = target OR app_scope = 'all') AND tenant_id IN ancestors_of(current_user_tenant_id)`.
- **`is_developer_only boolean`** flag on `tenant_page_layouts` + `tenant_entities`: when true, only platform_admin/developer roles can author OR view.
- **Pages are composed** from a whitelisted widget catalogue (start narrow, expand per §7.4): `DataTable`, `EntitySelector`, `StatGrid`, `Card`, `FormRenderer`. BSU's page-builder is a drag-drop composer that writes JSON layouts to `tenant_page_layouts`. Same drag-drop UX as the existing CRM7 `PageGridLayout`.

### 5.4 Widget whitelist (v1 — narrow by design)

| Widget | Purpose | Props schema |
|---|---|---|
| `DataTable` | Tabular list of any entity | `entity`, `columns[]`, `filters[]`, `sort`, `page_size` |
| `EntitySelector` | Searchable dropdown resolving to an FK | `entity`, `display_field`, `target_field` (the FK column it writes to) |
| `StatGrid` | KPI cards with counts / sums | `entity`, `metric` (`count` / `sum:field` / `avg:field`), `group_by`, `filters[]` |
| `Card` | Container with title + children | `title`, `collapsible`, `children[]` (other widgets) |
| `FormRenderer` | Create/edit form for an entity | `entity`, `fields[]` (subset of entity's fields), `submit_label` |

Broader widget library (charts, maps, timeline, kanban, etc.) queued for v2 after the above five are stable in prod.

### 5.5 Hard-isolation list (platform-developer only, never enterprise)

The following surfaces are developer-authored only. Enterprise tenants cannot edit them even in their own tenant tree:

- braden.com.au public routes (`/`, `/about`, `/services`, `/contact`) — marketing content
- BSU `/developer/*` routes — Developer Portal itself
- BSU `/admin/platform/*` routes — platform-wide settings
- Any entity with `is_system_managed: true` flag (users, tenants, subscriptions, billing)
- Theme tokens (owned by theme centralisation plan; overlay only via tenant-level `tenant_settings.branding`)

### 5.6 Enterprise embedding (§7.5 scope)

Decided: enterprise tenants can embed BSU surfaces inside their own sub-organisation domain. Mechanism:

- BSU exposes `/embed/<surface-name>` routes (already has `/embed/contact`) with `Content-Security-Policy: frame-ancestors *` header
- New `/embed/lead-form?tenant=<uuid>` — tenant-branded lead capture form; on submit writes to shared `leads` table with `tenant_id=<uuid>`, admin notification emails to that tenant's configured `lead_notification_email` (defaults to tenant owner's email)
- Enterprise tenants add to their site the same way braden.com.au's ContactForm calls `lead-capture`; they just use the BSU embed URL instead of building their own form
- **Braden lead routing** (per Braden 2026-04-22 note): change the braden.com.au admin-notification target from `braden.lang77@gmail.com` to `braden@braden.com.au` — update `tenant_settings.lead_notification_email` for the braden-website tenant row

### 5.7 New tables

```sql
-- Already exists (seed work already landed — validate only):
-- tenant_entities
-- tenant_entity_relations
-- tenant_field_definitions (if missing, create)

-- New:
create table tenant_page_layouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  app_scope text not null check (app_scope in ('all','bsu','crm7','conduit','r80','braden','throughput')),
  route_path text not null,                -- e.g. '/dashboard' or '/contacts/:id'
  layout_version int not null default 1,
  layout_json jsonb not null,               -- { widgets: [{ type, props, position }] }
  is_published boolean not null default false,
  is_developer_only boolean not null default false,  -- §5.5 isolation flag
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, app_scope, route_path, layout_version)
);

create table tenant_navigation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  app_scope text not null check (app_scope in ('all','bsu','crm7','conduit','r80','braden','throughput')),
  parent_id uuid references tenant_navigation(id) on delete cascade,
  label text not null,
  icon text,                                -- lucide icon name
  route_path text not null,
  sort_order int not null default 0,
  required_role text not null default 'staff' check (required_role in ('viewer','staff','manager','admin','owner','developer')),
  is_developer_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS shared pattern (both tables):
--   SELECT: tenant members can read rows where tenant_id IN ancestors_of(their tenant)
--           AND (NOT is_developer_only OR role IN ('developer','platform_admin'))
--           AND (app_scope = 'all' OR app_scope = their app's scope)
--           AND is_published = true  [for page layouts]
--   INSERT/UPDATE/DELETE:
--           platform_admin/developer → unrestricted
--           owner/admin of tenant → restricted to tenant tree, NOT braden scope, NOT is_developer_only=true
```

### 5.8 Enterprise tenant tree

`tenants.parent_tenant_id` (already exists per prior migrations) defines the tenant hierarchy. An "Enterprise" is any tenant with `tier='enterprise'` and no parent. Sub-organisations are child rows under it. The helper function `descendants_of(tenant_id uuid)` returns all tenants in the subtree; RLS policies invoke this to scope writes.

## 6. Phased delivery

Each phase ends with a full ship-all-apps promotion to main.

### Phase 1 — CRITICAL golden-path FKs + braden lead-notification fix (2–3 days)

**Ship gaps #1–4 above + update braden lead-notification email.** All on `development` branches first; Playwright smoke of contact create + lead create + invoice create; promote to main only after green.

- Migrations: 1 combined (`contacts.client_id`, `leads.contact_id`, `leads.client_id`, `invoices.client_id`) + backfill script with name-fuzzy-match flagging unresolved rows.
- Migration: update `tenant_settings.lead_notification_email='braden@braden.com.au'` for the braden-website tenant row (per §7.5).
- UI: swap 4 free-text fields to `EntitySelector` variants.
- Tests: Playwright assertion that creating a Contact with a company yields a row with both `client_id` AND `company` populated (for display continuity).
- Skills invoked: `supabase-postgres-best-practices`, `forms-and-validation`, `tanstack-query`, `shadcn-ui`, `test-driven-development`.
- MCPs: `supabase apply_migration`, `supabase execute_sql` (four-persona RLS check), Playwright smoke.

### Phase 2 — MEDIUM compliance/billing FKs (3–4 days)

**Ship gaps #5–8.** Includes creating the TrainingContract entity (§4) because gap #8 depends on it.

- New TrainingContract table + RLS + form + selector.
- HostEmployer.primary_contact_id + denorm snapshots (mirrors PR #266 Placement pattern).
- Placement.award_rate_id FK + AwardRateSelector + coordinated R80.3 + CRM7 shared hook.
- VetAssessment.host_employer_id.

### Phase 3 — GTO entity gap + TGA API integration (5–7 days)

**Ship StateTrainingAuthority, AASS, UnitOfCompetency (with TGA API sync), Incident, Reminder.** Each is a new table + RLS + TS type + form + selector + integration into downstream reports.

- STA seed: 8 AU states with DTWD (WA), TAFE NSW, etc. Single table with state discriminator per §7.1.
- AASS registrations: nullable until ADMS integration lands (tracked under Part N.8 human-action Xero pattern).
- UnitOfCompetency: primary seed via new `tga-sync` edge function hitting [training.gov.au web services](https://training.gov.au/support/connecting-your-system-traininggovau-apis-1); CSV fallback supported. New reference doc `docs/20260422-tga-api-integration-reference-v1.00W.md` written before this sub-phase starts.
- Incident: parent table + migrate `compliance_alerts.incident_id` FK.
- Reminder: RRULE scheduling + notification trigger.

### Phase 4 — Cross-app write-violation closure + lead-capture consolidation (1–2 days)

**V1 candidate→contact merge** (§7.3): ship the backfill migration + extend Part N.5.a handoff to dedup by email.

**V5 lead-capture consolidation**: delete BSU copy of `supabase/functions/lead-capture/`, keep CRM7 copy as canonical, update braden's Supabase client config if the function invocation was routed via the BSU project ref. Verify via Playwright submit on braden.com.au + check unified `leads` table.

**V3 users + V4 apprentices**: grep audit — confirm no app has a local mirror table; ship artefact `docs/YYYYMMDD-cross-app-write-audit-v1.00W.md`.

### Phase 5 — Schema + page-builder + navigation uplift with tenant-scoped isolation (9–12 days, parallel-safe)

**Ship §5.7 tables + `@bsuite/schema-registry` package + BSU page-builder UI (Platform mode + Enterprise mode) + consumer hooks in 5 non-BSU apps + enterprise embed routes.**

- BSU authoring UI: extend Developer Portal with page-composer + navigation editor; drag-drop widget placement matching existing `PageGridLayout` UX; preview in target app. Two UI modes auto-detected from user role.
- Consumer package: `useTenantSchema` + `useTenantPageLayout(routePath)` + `useTenantNavigation()` published to `@bsuite/schema-registry@0.1.0`.
- Each non-BSU app: install `@bsuite/schema-registry`, wire to a canonical mount point per route (e.g. `<TenantLayoutSlot route='/dashboard'>` renders BSU-authored widgets). Navigation is rendered from `useTenantNavigation()` so the Enterprise admin can add new menu items without code.
- Consumer rendering: RSC-safe for conduit (Next.js 16); strip client-only widgets when server-rendered; hydrate with data via TanStack Query.
- Widget catalogue v1: 5 widgets per §5.4.
- **Hard isolation (§5.5):** RLS enforces that braden + `is_developer_only=true` surfaces can ONLY be authored by platform_admin / developer. Enterprise owner/admin writes to those tenant_ids / scopes return 403.
- **Enterprise embed (§5.6):** ship `/embed/lead-form?tenant=<uuid>` BSU route + CSP configuration. Enterprise tenants add a snippet to their own marketing sites.
- Realtime: changes published in BSU trigger a Supabase realtime broadcast on channel `tenant-schema:<tenant_id>`; consumers subscribe and invalidate TanStack Query cache — pages update live without a reload.

Ships as its own PR chain — does NOT block Phases 1–4.

### Phase 6 — Documentation + CLAUDE.md (0.5 day)

- Refresh `docs/20260227-dry-one-shot-architecture-v1.00A.md` with §11 "2026-04-22 Gap Closure" addendum listing Phases 1–5 outcomes.
- Update each app's CLAUDE.md with the `useTenantSchema` consumer pattern.
- Add a CI lint rule that flags new `text` columns with names matching `*_name|*_email|*_phone|*_company|*_code` on tables that reference an existing entity — forces FK discussion in PR.
- Status bump: `v1.00A` → `v1.01A` on the DRY doc.

## 7. Decisions (answered by Braden 2026-04-22)

### 7.1 STA carriage model → **single table with state discriminator**

> **What polymorphic meant:** one parent table (e.g. `training_authorities`) with a separate child table per state variant (`wa_training_authorities`, `nsw_training_authorities`, …), each with its own state-specific columns. Alternative: a single flat `state_training_authorities` table with a `state auStateEnum` column distinguishing rows.

**Decision:** single flat table. Rationale: all 8 AU state training authorities share the same conceptual fields (name, URL, contact, registration endpoint); per-state divergences (e.g. WA's DTWD has a different funding model than NSW TAFE) live in `funding_sources` which is already a separate table with FK back to STA. No reason to split rows across physical tables.

### 7.2 UnitOfCompetency seeding → **official training.gov.au web services (primary), CSV fallback (secondary)**

**Primary source:** [training.gov.au API docs](https://training.gov.au/support/connecting-your-system-traininggovau-apis-1) + [sandbox WSDL](https://ws.sandbox.training.gov.au/webservices.html). Both saved to persistent memory as `bsuite_reference_tga_apis`.

**Secondary:** CSV upload in BSU Developer Portal for air-gapped / offline bootstrap.

**Implementation:** new edge function `tga-sync` runs on a schedule (daily), pulls qualifications + units + training packages, upserts into the respective tables with a `source='tga_api'` marker. Manual CSV uploads tag rows `source='csv_<uploader>_<date>'` so provenance is always clear.

**Reference doc (new):** [docs/20260422-tga-api-integration-reference-v1.00W.md](../20260422-tga-api-integration-reference-v1.00W.md) to be written before Phase 3 Unit-of-Competency work starts. Covers endpoints, auth, rate limits, payload shapes, field mappings.

### 7.3 Conduit candidate → contact identity → **merge into existing contact on hire (dedup by email)**

When a Conduit candidate reaches `status='hired'` and the Part N.5.a handoff flow triggers:

1. Look up existing `contacts` row by email within the target host tenant
2. If found → use that `contacts.id`, update any new fields from the candidate (phone, address etc) where the contact's field was null
3. If not found → create a new `contacts` row and use its id
4. Store `contact_id` on the `conduit_candidates` row so the lineage is preserved (candidate was its own stage-1 entity until it got promoted)

Backfill migration runs once over existing hired candidates to establish the FK for history.

### 7.4 Page-builder scope → **full god-mode for Platform Developer; full tenant-scoped god-mode for Enterprise Owner/Admin; strict isolation from braden.com.au and developer-only surfaces**

Detailed in §5.1–5.5 above. Key principles:

- Drag-drop UX matches the existing CRM7 `PageGridLayout` pattern (no new interaction model)
- Enterprise tenants author for their enterprise tenant + all sub-organisation tenants below them in the tree
- Braden.com.au marketing routes + BSU Developer Portal routes are platform-developer-only, never exposed to enterprise authoring
- Widget whitelist starts at 5 (§5.4), expands after v1 proves stable
- Changes propagate live: publishing in BSU invalidates the TanStack Query cache on consumer apps via realtime broadcast

### 7.5 Braden lead path → **NOT a violation; lead-notification routing to be fixed**

**Audit result:** braden.com.au's `useEnhancedContactForm` calls the shared `lead-capture` Supabase edge function, which writes to the unified `leads` + `contacts` tables with `tenant_id='<braden-website-tenant-uuid>'`. Source-of-truth compliance: ✓.

**Subsidiary violation (V5 added):** the `lead-capture` edge function is duplicated in BOTH BSU and CRM7 supabase/functions/ and has drifted between copies. Phase 4 action: consolidate to single canonical version in CRM7's Supabase project; delete BSU copy.

**Lead notification routing:** braden wants new-lead admin notifications to land at `braden@braden.com.au` (preferred, dedicated braden-group inbox) rather than the current `braden.lang77@gmail.com`. Update `tenant_settings.lead_notification_email` for the braden-website tenant row in Phase 1 migration. Enterprise tenants who embed `/embed/lead-form` set their own `lead_notification_email` via BSU's tenant settings UI.

**Enterprise embedding:** detailed in §5.6. BSU exposes `/embed/lead-form?tenant=<uuid>` — a CSP-relaxed route tenants can iframe into their own marketing sites. Same write path, same shared tables, tenant-scoped.

## 8. Skills + MCPs + verification (K.8)

```markdown
### Skills invoked
- [ ] /master-orchestration
- [ ] /using-superpowers
- [ ] /supabase-postgres-best-practices (every phase — RLS + migrations)
- [ ] /supabase (RLS four-persona matrix)
- [ ] /forms-and-validation (Zod + react-hook-form for every new selector)
- [ ] /tanstack-query (useTenantSchema + invalidation on authoring write)
- [ ] /shadcn-ui (selector primitives + page-builder composer)
- [ ] /test-driven-development + /playwright (per-phase E2E smoke)
- [ ] /security-audit (Phase 3 — new tables with cross-tenant PII)
- [ ] /subagent-driven-development (three-role team per phase)

### MCPs consulted
- [ ] Supabase MCP apply_migration + execute_sql + get_advisors (every phase)
- [ ] Context7 query-docs @supabase/ssr + @tanstack/react-query@5 before selector migrations
- [ ] Playwright MCP for authenticated smoke (contact → client resolution)
- [ ] GitHub MCP for PR descriptions carrying the K.8 checklist

### Samples referenced
- [ ] Existing ContactSelector in crm7/src/components/entity/selectors/ContactSelector.tsx
- [ ] PR #266 pattern (supervisor_contact_id FK + denorm snapshots)
- [ ] supabase-platform/vite-app schema-builder reference implementation

### 2026 sense-check gate (K.4)
- [ ] Domain gate: supabase (RLS matrix attached per migration)
- [ ] Domain gate: tanstack-query (query-key factory + invalidation on mutation)
- [ ] Accessibility: every new selector meets WCAG AA per Part N.3 standards

### Red-team (K.5)
- [ ] Security: RLS four-persona matrix per new table; no cross-tenant leak
- [ ] Reliability: backfill idempotent; partial failures don't corrupt FK
- [ ] Performance: list views that JOIN on new FKs under 300ms at 10k rows
- [ ] UX/a11y: selectors keyboard-navigable, target size ≥ 24×24

### Memory (K.6)
- [ ] bsuite_session_20260422<letter> per phase
- [ ] bsuite_pending_actions updated
- [ ] MEMORY.md index updated
```

## 9. Acceptance gates (cycle-level)

1. `grep -rE "company|contact_name|supervisor_name|rto_name|award_code" <app>/src/types/entities.ts` returns zero matches on free-text string types for the 10 gap fields (Phase 1 + 2 evidence).
2. Four-persona RLS matrix passes for every new table created in Phases 2–5 (anon / tenant A user / tenant B user / developer).
3. Playwright spec: create Contact → type a company name in the selector → dropdown shows live Client matches → pick one → row persists with BOTH `client_id` populated AND `company` snapshot for display continuity.
4. Playwright spec: STA / AASS / TrainingContract / Incident / Reminder each have a create flow in the CRM7 UI, RLS-gated per subscription tier.
5. A BSU platform_admin can go to `/developer/schema` and add a new entity, save it, then visit `crm.crm7.app/<that-entity>` and see it render via the `@bsuite/schema-registry` consumer (Phase 5 evidence).
6. A BSU platform_admin can compose a page layout (drag + drop widgets) in the BSU page-builder, publish it for the `crm7` scope, and the new layout appears on CRM7 on next load.
7. **A BSU Enterprise Owner** (non-platform role) signs in, opens the page-builder in Enterprise mode, can author pages scoped to their enterprise tenant + sub-orgs, and is blocked (403) from writing to braden scope or `is_developer_only=true` rows. Verified via Playwright with a seeded enterprise test user.
8. **Braden lead submission from braden.com.au** fires a notification to `braden@braden.com.au` (not `braden.lang77@gmail.com`). Verified via Supabase logs on the `lead-capture` function after a test submit.
9. **lead-capture edge function has exactly one source copy** — a grep across all 6 submodules' `supabase/functions/` trees returns only the CRM7 version.
10. Cross-app write audit artefact (`docs/YYYYMMDD-cross-app-write-audit-v1.00W.md`) has zero unresolved violations after Phase 4.
11. **TGA API integration reference doc** (`docs/20260422-tga-api-integration-reference-v1.00W.md`) exists and the `tga-sync` edge function successfully pulls qualifications + units from the sandbox endpoint on first deploy.
12. DRY doc bumped to `v1.01A`; CI lint rule blocks any new text column matching the `*_name|*_email|*_company|*_code|*_phone` pattern without an accompanying FK or explicit exemption comment.

## 10. Execution order

```
Group 1 (sequential — migrations touch same CRM7 tables)
  Phase 1 — CRITICAL FKs (1 PR, 4 gaps)

Group 2 (parallel post-Phase-1)
  Phase 2 — MEDIUM FKs (1 PR)
  Phase 3 — GTO entities (2–3 PRs, independent tables)
  Phase 4 — Cross-app audit (1 artefact PR, metadata only)

Group 3 (post-Group-2, big chunk)
  Phase 5 — Schema + page-builder uplift (4 PRs: package + BSU UI + consumer-hook rollout + per-app integration)

Group 4 (docs)
  Phase 6 — Docs + lint rule (1 PR)
```

Each group ends with a `multi-agent-red-team-implementation` gate before the next group starts.

---

## Critical files cited

| Purpose | File |
|---|---|
| DRY policy source | [docs/20260227-dry-one-shot-architecture-v1.00A.md](../20260227-dry-one-shot-architecture-v1.00A.md) |
| Contact entity | [crm7/src/types/entities.ts:182-196](../../crm7/src/types/entities.ts#L182-L196) — `company` TEXT field confirmed gap |
| Lead entity | [crm7/src/types/entities.ts:238-251](../../crm7/src/types/entities.ts#L238-L251) — missing contact_id + company TEXT |
| Invoice schema | [crm7/supabase/migrations/20260228120100_create_billing.sql](../../crm7/supabase/migrations/20260228120100_create_billing.sql) — host_employer_id only |
| Placement PR #266 (reference pattern) | [crm7/src/types/entities.ts:294-297](../../crm7/src/types/entities.ts#L294-L297) — supervisor_contact_id FK + denorm snapshots |
| ContactSelector primitive | [crm7/src/components/entity/selectors/ContactSelector.tsx](../../crm7/src/components/entity/selectors/ContactSelector.tsx) |
| tenant_entities registry | [crm7/supabase/migrations/20260311053135_visual_relational_builder.sql](../../crm7/supabase/migrations/20260311053135_visual_relational_builder.sql) |
| app_scope filter | [crm7/supabase/migrations/20260421120000_add_app_scope_to_tenant_entities.sql](../../crm7/supabase/migrations/20260421120000_add_app_scope_to_tenant_entities.sql) |
| R80.3 consumer example | [R80.3/src/lib/schemaBuilderService.ts:40-60](../../R80.3/src/lib/schemaBuilderService.ts#L40-L60) |
| BSU Developer portal (authoring target) | [business-suite-unified/src/pages/Developer/Schema.tsx](../../business-suite-unified/src/pages/Developer/Schema.tsx), [Tables.tsx](../../business-suite-unified/src/pages/Developer/Tables.tsx), [TenantSettings.tsx](../../business-suite-unified/src/pages/Developer/TenantSettings.tsx) |

---

## Relationship to other active plans

- **Theme centralisation** ([20260422-theme-centralisation-v1.00A.md](20260422-theme-centralisation-v1.00A.md)) — independent; can ship in parallel.
- **Audit adaptive-sonnet Part N** — CLOSED as of 2026-04-22. This plan opens a new **Part P** focused on entity linkage + schema/page-builder uplift.
- **Part O (deferred catalogue)** — Phase 5 here supersedes / tightens O.12 (CRM7 wizard move) because wizard definition becomes JSON authored in BSU.
