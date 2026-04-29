> **⚠️ SUPERSEDED — 2026-05-01**
>
> This document has been superseded by:
> **[`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md)** — Universal WYSIWYG + Schema UX Master Plan v1.05W
>
> See `docs/archive/2026-05-01-wysiwyg-consolidation/README.md` for the full supersession rationale. This file is a read-only historical reference — do not resurrect.

---

# Entity linkage, one-shot enforcement, and schema/page-builder uplift — cross-app

**Status:** W (Working — drafted 2026-04-22, §7 decisions captured 2026-04-22, hardened via parallel red-team + skills + OAuth non-regression subagents 2026-04-22, ready to start Phase 1 after final sign-off)
**Revision:** v1.02W — adds §K skills+MCPs per phase with 2026-currency verification, §M OAuth 2.1 Server non-regression guardrails, §R red-team attack trees + stop-ship criteria + staging per phase, §S sign-off gates between phases. Execution order in §6 restructured to enforce pre-phase → during-phase → post-phase discipline per master-orchestration §5 (Plan → Red-team → Research → Refine)
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

---

## K. Skills + MCPs per phase (2026-current)

Dispatched via parallel skills-identification subagent 2026-04-22. Every phase PR description MUST carry the K.8 checklist with these specific skills + MCPs ticked.

### K.1 Cross-cutting (apply to EVERY phase, every turn)

| Skill | Purpose |
|---|---|
| [master-orchestration](/home/braden/.claude/skills/master-orchestration/SKILL.md) | Invoked at turn start; coordinates sub-agents; writes architecturally significant decisions to `bsuite_*` memory |
| [using-superpowers](/home/braden/.claude/skills/using-superpowers/SKILL.md) | Dispatches parallel sub-agents; checks 1% rule for skill invocation |
| [verification-before-completion](/home/braden/.claude/skills/verification-before-completion/SKILL.md) | Evidence before claims — Playwright + RLS matrix + backfill idempotency proof BEFORE claiming done |
| [subagent-driven-development](/home/braden/.claude/skills/subagent-driven-development/SKILL.md) | Three-role team (implementer + spec reviewer + code-quality reviewer) per phase |
| [multi-agent-red-team-implementation](/home/braden/.claude/skills/multi-agent-red-team-implementation/SKILL.md) | Security / Reliability / Performance / UX-a11y gate before each phase group merges |
| [git-workflow](/home/braden/.claude/skills/git-workflow/SKILL.md) | Conventional commits; branch naming `feat/phase-N-<topic>`; K.8 checklist in PR body |
| [finishing-a-development-branch](/home/braden/.claude/skills/finishing-a-development-branch/SKILL.md) | Squash history; acceptance-gate check; dev→main promotion discipline |
| [documentation-compliance](/home/braden/.claude/skills/documentation-compliance/SKILL.md) | Doc naming `YYYYMMDD-name-vMAJOR.MINOR[STATUS].md`; index updates |
| [writing-plans](/home/braden/.claude/skills/writing-plans/SKILL.md) | Per-phase sub-plans trace back to this master plan |

### K.2 Per-phase required skills

| Phase | Required | Why |
|---|---|---|
| 1 | [supabase-postgres-best-practices](/home/braden/.claude/skills/supabase-postgres-best-practices/SKILL.md), [supabase](/home/braden/.claude/skills/supabase/SKILL.md), [forms-and-validation](/home/braden/.claude/skills/forms-and-validation/SKILL.md), [tanstack-query](/home/braden/.claude/skills/tanstack-query/SKILL.md), [shadcn-ui](/home/braden/.claude/skills/shadcn-ui/SKILL.md), [test-driven-development](/home/braden/.claude/skills/test-driven-development/SKILL.md), [playwright](/home/braden/.claude/skills/playwright/SKILL.md) | Migrations + RLS + selector forms + E2E smoke |
| 2 | Same as Phase 1 + [security-audit](/home/braden/.claude/skills/security-audit/SKILL.md) | New entity (TrainingContract) with PII |
| 3 | Phase 1 set + [security-audit](/home/braden/.claude/skills/security-audit/SKILL.md), [api-design-validation](/home/braden/.claude/skills/api-design-validation/SKILL.md) | TGA external API; Incident cross-tenant PII; RRULE parsing |
| 4 | [supabase-postgres-best-practices](/home/braden/.claude/skills/supabase-postgres-best-practices/SKILL.md), [test-driven-development](/home/braden/.claude/skills/test-driven-development/SKILL.md), [playwright](/home/braden/.claude/skills/playwright/SKILL.md), [git-workflow](/home/braden/.claude/skills/git-workflow/SKILL.md), [security-audit](/home/braden/.claude/skills/security-audit/SKILL.md) | Backfill + edge function consolidation + cross-site verify |
| 5 | Phase 1 set + [vercel-next-cache-components](/home/braden/.claude/skills/vercel-next-cache-components/SKILL.md), [supabase-auth-comprehensive](/home/braden/.claude/skills/supabase-auth-comprehensive/SKILL.md), [tailwind-css-v4-best-practices](/home/braden/.claude/skills/tailwind-css-v4-best-practices/SKILL.md), [security-audit](/home/braden/.claude/skills/security-audit/SKILL.md), [ui-ux-pro-max](/home/braden/.claude/skills/ui-ux-pro-max/SKILL.md) | Page-builder + tenant-scoped RLS + Next 16 RSC + realtime + WCAG audit |
| 6 | [documentation-compliance](/home/braden/.claude/skills/documentation-compliance/SKILL.md), [git-workflow](/home/braden/.claude/skills/git-workflow/SKILL.md), [code-quality-enforcement](/home/braden/.claude/skills/code-quality-enforcement/SKILL.md) | DRY doc bump + CI lint rule wiring |

### K.3 MCP matrix per phase

| Phase | MCP | Purpose |
|---|---|---|
| 1–5 | `mcp__claude_ai_Supabase__apply_migration` + `execute_sql` + `get_advisors` + `list_tables` | Every schema change goes through apply_migration; `get_advisors` MUST be clean before merge |
| 1–5 | `mcp__claude_ai_Supabase__deploy_edge_function` | Phase 3 `tga-sync`; Phase 4 consolidated `lead-capture` |
| 1–5 | `mcp__plugin_playwright_playwright__browser_*` | E2E smoke (authenticated as dev + as enterprise-owner + as tenant-B for isolation tests) |
| All | `mcp__plugin_context7_context7__query-docs` | BEFORE every library-sensitive change — `@tanstack/react-query@5`, `@supabase/ssr`, `@supabase/realtime-js`, `jose`, `dnd-kit`, `rrule`, `react-hook-form`, Tailwind v4 |
| 3 | `mcp__google-dev-knowledge__search_documents` | TGA WSDL / training.gov.au docs lookup (fallback if Context7 has no index) |
| 5 | `mcp__plugin_context7_context7__query-docs` (Next 16 Cache Components) | RSC-safe widget wrapping for conduit |
| All | `mcp__claude_ai_Vercel__get_runtime_logs` | Post-deploy 10-min observability window per phase |
| All | `mcp__claude_ai_github__create_pull_request` + `update_pull_request` + `get_commit` | PR bodies carry K.8 + §S sign-off checklist |

### K.4 2026-currency confirmations

All skills cited in K.2 have been verified as reflecting 2026 patterns (TanStack Query v5, React 19, Tailwind v4 oklch, Next 16 Cache Components, `@supabase/ssr`, `jose` for JWT). No skill targets pre-2025-Q3 API shapes. QIG/consciousness/e8/pantheon skills are explicitly EXCLUDED — separate project namespace per CLAUDE.md.

### K.5 Skill gaps flagged (future work — not blocking this plan)

| Gap | Suggested skill name | Needed for |
|---|---|---|
| Drag-drop page-builder composition with dnd-kit | `shadcn-page-builder-drag-drop` | Phase 5 |
| Multi-tenant hierarchical RLS (`descendants_of`) | `enterprise-rls-hierarchical-tenants` | Phase 5 |
| training.gov.au web services integration reference | `tga-training-gov-au-integration` | Phase 3 |
| Supabase realtime → TanStack Query invalidation pattern | `supabase-realtime-cache-invalidation` | Phase 5 |
| Fuzzy-match backfill with manual-review queue | `entity-fuzzy-match-backfill` | Phase 1 |

These are tracked for future skill creation but do NOT block this plan — the underlying libraries' Context7 docs carry the same info.

---

## M. OAuth 2.1 Server non-regression guardrails

Dispatched via parallel OAuth-audit subagent 2026-04-22. **Constraint: no reversion from Supabase Native OAuth 2.1 back to legacy custom BS OAuth server at ANY point across ANY phase.**

### M.1 Current state (2026-04-22 verified)

All 4 clients on Supabase Native OAuth 2.1:

| App | Client ID | OAuth state |
|---|---|---|
| CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` | Native, PKCE S256, JWKS, cookie SSO on `.crm7.app` |
| R80.3 | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | Native, PKCE S256, JWKS, cookie SSO |
| Braden | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | Native, PKCE S256, JWKS, localStorage (different TLD) |
| Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` | Native, PKCE S256, JWKS, cookie SSO |

Supabase project ref `tuybltdrdefjblnplpqo` immutable. `@bsuite/auth` package at [packages/auth/src/oauth-client.ts](../../packages/auth/src/oauth-client.ts) is the canonical implementation — PKCE `generateCodeChallenge()`, nonce enforcement `verifyIdToken()`, JWKS via `jose.createRemoteJWKSet()`, 5-min-buffer refresh via `startBSTokenRefresh()`.

### M.2 Hard guardrails (numbered, non-negotiable)

1. **Token endpoint lock.** Every exchange uses `/auth/v1/oauth/token` on `tuybltdrdefjblnplpqo.supabase.co`. No custom BSU `/oauth/token`.
2. **JWKS verification immutable.** `jose.createRemoteJWKSet()` against Supabase-hosted JWKS only. No hardcoded keys. No custom issuer.
3. **PKCE S256 non-reversible.** `flowType: 'pkce'` + SHA-256 code challenge, on every Supabase client across all 6 apps.
4. **Nonce enforcement mandatory.** `verifyIdToken()` validates nonce (OIDC Core §3.1.2.2). Mismatch = auth failure, NEVER silent fallback.
5. **Token refresh auto-extension.** `startBSTokenRefresh()` active on every authed route. 5-min pre-expiry buffer. 60s check interval.
6. **Storage segregation.** sessionStorage for ephemeral PKCE state (code_verifier, state, nonce only). localStorage for refresh_token (domain-locked `.crm7.app` for SSO apps). **No secrets in URL fragments. No `VITE_DEVELOPER_EMAILS` revival.**
7. **`onAuthStateChange` callbacks MUST NOT `await supabase.from(...)`.** Known deadlock incident 2026-04-21, PR #129. Any phase reintroducing this pattern is a stop-ship bug.
8. **No second OAuth consent surface.** BSU `/oauth/consent` is the only consent screen for all 4 client apps. No per-app consent duplication.
9. **`auth.oauth_clients` rows are protected.** The 4 client-ID rows above must not be deleted, re-created, or have their redirect URIs rewritten to include wildcards. Exact-match redirect URIs only per OAuth 2.1 §7.6.
10. **No HS256 downgrade.** ECC P-256 JWKs + `sb_publishable_` / `sb_secret_` keys only. Legacy HS256 JWT revoked 2026-04-22; no code path restores it.
11. **No `auth.jwt()` bypass in RLS.** Every RLS policy reads claims via `auth.jwt()`; no hand-parsed JWT in SQL functions.
12. **`@bsuite/auth` is authoritative.** Any phase modifying `packages/auth/src/oauth-client.ts` requires explicit OAuth red-team sign-off (§R.6 below). No app adds its own `jwtVerify`.

### M.3 Per-phase OAuth regression risk + mandatory red-team check

| Phase | OAuth touch | Risk | Red-team check before merge |
|---|---|---|---|
| 1 | New RLS policies on contacts/leads/invoices | LOW — claim reads only | "Does the policy read tenant_id via `auth.jwt() ->> 'tenant_id'`? No hand-parsing?" |
| 2 | TrainingContract RLS | LOW-MED — new table with multi-entity FK | "Does the policy check tenant via `auth.jwt()` on ALL three FK joins (apprentice / rto / host_employer)?" |
| 3 | Incident RLS (cross-tenant PII) + `tga-sync` edge function | MED — new PII table + new external API | "Does `tga-sync` use `SUPABASE_SERVICE_ROLE_KEY` from secrets, never hardcoded? Does Incident RLS reject tenant-A user querying tenant-B incidents?" |
| 4 | Deleting BSU `lead-capture` edge function | LOW — infrastructure only | "After deletion, does braden.com.au's Supabase client still reach the CRM7 copy without code change? (Supabase edge functions are project-scoped; verify invocation URL.)" |
| 5 | `tenant_page_layouts` + `tenant_navigation` + realtime subscription + `/embed/lead-form` | HIGH — new write surfaces + authenticated realtime channel | "Does realtime channel auth use `auth.jwt()` from the Supabase client (not a custom token)? Do Enterprise-mode writes check `auth.jwt() ->> 'role'` before allowing braden-scope writes? Does `/embed/lead-form` run with anon JWT only — never service-role?" |
| 6 | CI lint rule addition | ZERO | (no OAuth touch) |

Every phase's PR description MUST cite the M.3 red-team check answer with evidence (grep output, test assertion, logs). No hand-wave "looks fine".

---

## R. Red-team attack trees + stop-ship criteria + staging per phase

Dispatched via parallel red-team subagent 2026-04-22. Full attack-tree detail lives in the subagent artefact (committed to `/home/braden/.claude/artefacts/20260422-entity-plan-red-team-report.md`); the tight version below is the authoritative gate.

### R.1 Phase 1 — CRITICAL golden-path FKs

**Top attack paths:**
- **Backfill fuzzy-match ambiguity** — 3 clients named "Braden" → non-deterministic winner. *Mitigation:* any match <90% score flagged `company_resolution_status='manual_review_required'`, audit UI lists flagged rows.
- **ContactSelector async race** — user Tabs before results load → `client_id=null` submitted. *Mitigation:* Suspense-wrapped selector, can't submit until query settled.
- **FK constraint violation mid-backfill** — partial state. *Mitigation:* single Postgres transaction, idempotent re-runnable `WHERE client_id IS NULL`.
- **Lead notification email not actually updated** — migration skipped the `tenant_settings.lead_notification_email` update. *Mitigation:* Playwright spec submits live form, confirms recipient in function logs.

**Stop-ship for Phase 1:**
- [ ] Migration exits 0, idempotent (second run = no-op)
- [ ] Fuzzy-match <90% flagged; audit UI lists flagged rows
- [ ] Playwright: Contact-with-company → `client_id` persisted AND `company` TEXT preserved as display snapshot
- [ ] Playwright: live braden.com.au submit → `lead_notification_email` in function logs = `braden@braden.com.au`
- [ ] Four-persona RLS clean for contacts/leads/invoices with new FK columns
- [ ] ContactSelector + ClientSelector keyboard-navigable (Tab/Enter/Escape per WCAG)

**Staging:**
- **Pre:** PR #266 pattern reviewed; CompanySelector component design signed-off; Context7 check on `@tanstack/react-query@5` for Suspense query pattern.
- **During:** Every migration run against dev DB snapshot; backfill output summary (matched/flagged/failed counts) in PR.
- **Post:** 3 green Playwright runs; observability window 60 min on prod post-promote.

### R.2 Phase 2 — MEDIUM compliance FKs

**Top attack paths:**
- **HostEmployer contact snapshot phishing** — admin updates linked Contact email to a phishing domain; old snapshot still shows. *Mitigation:* snapshot fields suffixed `_snapshot`; UI shows "last updated X ago" label.
- **Placement.award_rate_id R80.3 deletion race** — R80.3 hard-deletes a rate while CRM7 still references it. *Mitigation:* R80.3 AwardRate deletion is soft-delete (`is_active=false`) only during the Phase 2 window. Backfill creates synthetic "Discontinued" rate for missing codes.
- **TrainingContract.apprentice_id race during concurrent Conduit handoff** — Part N.5.a handoff and Phase 2 backfill both try to create the same contract_number. *Mitigation:* Postgres advisory lock per apprentice_id; handoff paused during backfill window.

**Stop-ship for Phase 2:**
- [ ] All 4 new FKs wired; backfill flags pending-review rows
- [ ] HostEmployer snapshot columns named `*_snapshot`; audit UI displays "last updated"
- [ ] R80.3 coordinated: AwardRate deletion is soft-delete only during Phase 2
- [ ] Playwright: TrainingContract created + Apprentice deletion cascade tested
- [ ] Four-persona RLS clean on all new tables

### R.3 Phase 3 — GTO entities + TGA API

**Top attack paths:**
- **TGA API credential exposure** — key logged to Supabase function logs or hardcoded. *Mitigation:* Supabase Vault secrets manager (`vault.secrets`); grep `dist/` for the key; 90-day rotation policy in reference doc.
- **UnitOfCompetency CSV XSS injection** — admin uploads `<script>` in description. *Mitigation:* Zod + DOMPurify on render; CSV upload role-restricted to `admin`.
- **Cross-tenant Incident leak** — tenant-A user queries an incident linked to tenant-B apprentice. *Mitigation:* Incident RLS checks all three FK joins against `auth.jwt() ->> 'tenant_id'`; Playwright test with tenant-B identity.
- **`tga-sync` partial write on timeout** — 7.5k qualifications inserted before 504; next sync double-counts. *Mitigation:* entire sync in single transaction; `tga_last_sync_status` enum in `tenant_settings` tracks recovery.
- **RRULE infinite loop** — malformed `FREQ=DAILY;UNTIL=...;FREQ=MONTHLY`. *Mitigation:* Zod validation via `rrule` npm library parser at form level.

**Stop-ship for Phase 3:**
- [ ] `tga-sync` completes first run on sandbox endpoint, seeds ≥1000 qualifications, uses Supabase Vault secret
- [ ] Playwright: tenant-A Incident NOT visible to tenant-B user (four-persona RLS explicitly tests this case)
- [ ] CSV upload DOMPurify + `admin` role gate confirmed
- [ ] RRULE invalid input rejected at form level
- [ ] TGA API reference doc [docs/20260422-tga-api-integration-reference-v1.00W.md](../20260422-tga-api-integration-reference-v1.00W.md) exists and reviewed BEFORE implementation
- [ ] Lighthouse ≥95 on Incident + Reminder forms

### R.4 Phase 4 — Cross-app closure + lead-capture consolidation

**Top attack paths:**
- **V5 edge function drift exploits** — BSU copy missing CSRF check in CRM7 copy → attacker calls BSU copy with spoofed tenant_ids. *Mitigation:* delete BSU copy; single canonical CRM7 version.
- **Candidate→Contact merge overwrites address/phone data** — duplicate candidate records (import glitch) both merge into same contact. *Mitigation:* dedupe by email BEFORE merge loop; flag duplicates; idempotent upsert with explicit conflict handling.
- **Lead-capture deletion breaks braden.com.au** — hardcoded BSU project ref somewhere. *Mitigation:* Playwright live submit on braden.com.au BEFORE and AFTER deletion; roll back if diff.

**Stop-ship for Phase 4:**
- [ ] `grep -r lead-capture/index.ts` across all 6 supabase/functions/ returns exactly ONE hit (CRM7)
- [ ] Backfill flags duplicate candidates; audit UI lists them
- [ ] Playwright live submit on braden.com.au post-deletion returns success + row in unified `leads`
- [ ] `docs/YYYYMMDD-cross-app-write-audit-v1.00W.md` artefact committed

### R.5 Phase 5 — Schema + page-builder (highest risk, most red-team attention)

**Top attack paths:**
- **Stored XSS via widget `label_html`** — enterprise admin injects `<script>`. *Mitigation:* Zod schema rejects HTML entirely for v1 (plain text only); DOMPurify ready for v2 if HTML enabled; CSP `script-src 'self'` (no new `unsafe-inline`).
- **Widget entity whitelist bypass** — admin sets `DataTable entity='auth.users'` to enumerate platform users. *Mitigation:* entity prop validated server-side against `tenant_entities WHERE tenant_id IN descendants_of(user_tenant_id)`; client-side whitelist is UX not security.
- **Realtime fan-out bomb** — 5000-user enterprise publishes → thundering herd cache invalidation. *Mitigation:* publish debounced ≤1/5s; selective invalidation (key by changed entity_id, not full schema key); consumer exponential backoff + jitter.
- **Cross-tenant nav exposure** — tenant-A author creates `is_developer_only=true` nav item; tenant-B stale cache shows it. *Mitigation:* RLS + `WHERE (NOT is_developer_only OR user_role IN ('platform_admin','developer'))`; Playwright tenant-B test.
- **Enterprise pivot to braden scope** — enterprise admin rewrites `app_scope='braden'` on a page. *Mitigation:* RLS blocks non-platform-role writes to `app_scope='braden'` OR `is_developer_only=true`; 403 returned; Playwright test.
- **AuthContext reload regression** — `useTenantSchema()` captures stale closure of `user.role`. *Mitigation:* reads from `useAuth()` via context, NOT closure; cache invalidates on role change; Playwright demote-role test.
- **Page-builder keyboard inaccessible** — mouse-only drag-drop. *Mitigation:* `dnd-kit` library (keyboard built-in: Tab/Space/arrow keys); Playwright keyboard test.
- **Enterprise-authored theme fails WCAG AA** — light-gray on light-gray. *Mitigation:* contrast checker on theme save; Lighthouse CI gate on sample.

**Stop-ship for Phase 5:**
- [ ] Zod widget-props schemas reject unknown keys (exhaustive discriminated union)
- [ ] Widget `entity` prop whitelist enforced in RLS policy, not only client-side
- [ ] DOMPurify wraps every tenant-authored HTML string on render (ready for v2)
- [ ] RLS four-persona matrix PASSES for `tenant_page_layouts` + `tenant_navigation` including `is_developer_only=true` isolation
- [ ] Playwright: enterprise-owner-of-subsidiary tries to write to `app_scope='braden'` layout → 403
- [ ] Playwright: enterprise-owner creates/edits a layout scoped to their own enterprise + sub-org → success
- [ ] Playwright: tenant-B user with stale cache does NOT see tenant-A's `is_developer_only=true` nav items
- [ ] Playwright: keyboard-only navigation through page-builder drag-drop works (Tab/Space/arrows)
- [ ] Realtime publish debounced ≤1/5s; consumer invalidation selective by entity_id (not full schema key)
- [ ] Bundle delta ≤35 KB gzip for schema-registry consumer
- [ ] Lighthouse accessibility ≥95 on a BSU-authored CRM7 dashboard with 5 widgets
- [ ] `prefers-reduced-motion` respected on any realtime animation

### R.6 Phase 6 — CI lint + docs

**Top attack paths:**
- **Lint rule not enforced on branch protection** — rule added but merge-bypass-able. *Mitigation:* explicitly add to required checks on `main` branch protection.
- **Exemption comment abuse** — developers add `// DRY exemption: <reason>` liberally. *Mitigation:* exemption requires PR-body justification + reviewer sign-off; tracked in a quarterly audit.

**Stop-ship for Phase 6:**
- [ ] `.github/workflows/lint-schema.yml` lint rule rejects any PR adding `text` column matching `*_name|*_email|*_phone|*_company|*_code` without FK AND without `// DRY exemption: <reason>` comment
- [ ] Rule added to `main` branch protection as required check
- [ ] DRY doc v1.00A → v1.01A with §11 addendum
- [ ] All 6 app CLAUDE.md updated with `useTenantSchema()` + `useTenantPageLayout()` patterns

### R.7 Cross-phase dependency red flags

1. **Phase 1 fuzzy-match ambiguity** feeds Phase 5's DataTable — any unresolved backfill surfaces as mixed-up rows in widgets.
2. **Phase 2 TrainingContract** must ship before Phase 3 can reference it (Incident context optional FK).
3. **Phase 3 TGA schema discovery** must be complete before Phase 5 exposes UnitOfCompetency via DataTable/EntitySelector — schema surprises break widget queries.
4. **Phase 4 lead-capture consolidation** must finish before Phase 5 ships `/embed/lead-form` — an unconsolidated function means some embed callers hit stale code.
5. **Phase 5 RLS on `tenant_entities`** is too permissive → all Phase 2/3 entities leak via page-builder widgets even though table RLS was correct. RLS layered check required.
6. **AuthContext state-closure regression** in any phase ripples to all 5 consumer apps — every phase PR explicitly asserts no `setState-in-effect` reintroduction.

---

## S. Sign-off gates between phases (hard gates, no exceptions)

Per master-orchestration §5: Plan → Red-team → Research → Refine (2 iterations) → Implement → Red-team → Fix → Verify (2 iterations) → QA → Prove completion.

### S.1 Entry gate (before Phase N+1 starts)

All boxes MUST be checked or the next phase does NOT start:

- [ ] Phase N merged to `main` and production deploy READY
- [ ] Phase N observability window: 60 min post-merge, zero new error class in Supabase logs + Vercel runtime logs
- [ ] Phase N memory writeback complete: `bsuite_session_YYYYMMDD<letter>` + `bsuite_pending_actions` updated, MEMORY.md index under 200 lines
- [ ] Phase N red-team report attached to merged PR with every R.x stop-ship item checked
- [ ] Phase N OAuth M.3 red-team check signed off with evidence
- [ ] Phase N+1 pre-phase gate items from R.x satisfied
- [ ] Context7 queries for Phase N+1's new library usages captured in PR draft
- [ ] No open `needs-decision` items on this plan

### S.2 During-phase gates (continuous)

Every PR within Phase N carries the K.8 checklist AND:

- [ ] `mcp__claude_ai_Supabase__get_advisors` run post-migration, zero warnings OR documented exemption
- [ ] Four-persona RLS matrix attached for every new/changed table
- [ ] `grep -rE 'bg-slate-|text-slate-|#[0-9a-fA-F]{3,8}' <modified files>` clean of new hardcoded colours (theme plan §K)
- [ ] `pnpm lint + test + typecheck` green; husky hook passed without `--no-verify`
- [ ] Playwright smoke of the specific flow the PR touches — screenshot attached
- [ ] Bundle-size delta measured for any consumer-bundle change (Phase 5)

### S.3 Exit gate (Phase N complete)

- [ ] All §R.N stop-ship boxes checked
- [ ] Squash merge into `development`
- [ ] Dev-preview Vercel deploy READY
- [ ] 3 × Playwright full-suite runs green on preview (flake check)
- [ ] Dev → main promotion PR opened with §S.1 checklist inline; merge only after checklist clean
- [ ] Post-merge 60-min observability window clean → only THEN Phase N+1 entry gate can open

### S.4 Emergency stop

Any phase can trigger an emergency stop if:

- Supabase Auth logs spike sign-in failures >2% / 15 min
- Runtime error count >10/hr on any app
- A red-team finding crosses the "security CRITICAL" bar mid-implementation
- OAuth 2.1 regression check in M.3 fails

Emergency stop = immediate `git revert` on `development`, memory write-back explaining the abort, pause until root-caused.

---

## T. Final skills + tools summary for Phase 1 kick-off

When Phase 1 starts, the implementing agent MUST:

1. Invoke `master-orchestration` + `using-superpowers` at turn start
2. Invoke Phase 1 skill set (K.2): `supabase-postgres-best-practices`, `supabase`, `forms-and-validation`, `tanstack-query`, `shadcn-ui`, `test-driven-development`, `playwright`
3. Run Context7 queries: `@tanstack/react-query@5` (Suspense query), `react-hook-form` (async validation), `@supabase/ssr` (server-side session)
4. Pull current state via Supabase MCP: `list_tables` on `public.contacts`, `public.leads`, `public.invoices`, `public.tenant_settings`
5. Dispatch `subagent-driven-development` 3-role team: implementer + spec-compliance reviewer + code-quality reviewer
6. Write migration + selector code; run `get_advisors` post-apply (clean required)
7. Run Playwright smoke per §R.1 stop-ship
8. Self-run the `multi-agent-red-team-implementation` 4-lens pass BEFORE requesting review
9. PR body carries K.8 + §M.3 OAuth check + §R.1 stop-ship boxes + §S.2 during-phase gates
10. After merge: observability window + memory writeback + §S.1 entry gate for Phase 2
