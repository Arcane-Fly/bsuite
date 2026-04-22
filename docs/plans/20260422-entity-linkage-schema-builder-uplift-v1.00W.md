# Entity linkage, one-shot enforcement, and schema/page-builder uplift — cross-app

**Status:** W (Working — drafted 2026-04-22, awaiting Braden review)
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

### 3.3 CROSS-APP WRITE VIOLATIONS (verify + fix if breached)

| # | Entity | Owner app | Suspected violators | Action |
|---|---|---|---|---|
| V1 | `contacts` | CRM7 | conduit (candidates system) — does it re-create contacts locally? | Audit `conduit_candidates` ↔ `contacts` path; if candidate→contact conversion creates a duplicate contact row, migrate to FK against existing `contacts.id` |
| V2 | `clients` | CRM7 | braden (lead capture) — lead form submits to its own table? | Confirm braden's lead form ultimately writes to CRM7's `leads` + `clients`, not a braden-local table |
| V3 | `users` | BSU | All | Already FK'd; verify no app has its own `app_users` mirror |
| V4 | `apprentices` | CRM7 | R80.3 | R80.3 reads `apprentices` for rate calc; confirm READ-only (should be via `schemaBuilderService` pattern, not a local clone) |

## 4. Missing GTO-domain entities

Per the CLAUDE.md GTO glossary (RTO = training provider, STA = state training authority with carriage, AASS = federal registration via ADMS, GTO Standards 2017 has 3 elements). Current entity coverage:

| Entity | Status | Owner app | Fix |
|---|---|---|---|
| TrainingProvider (RTO) | ✓ Partial — exists as table but RTO#/funding-body links missing | CRM7 | Add `rto_registration_status` enum + `funding_body_ids uuid[]` FK to FundingSource |
| **StateTrainingAuthority (STA)** | ✗ MISSING | CRM7 (new) | Create `state_training_authorities` table: `state auStateEnum`, `name text`, `registration_url text`, `api_endpoint text`, `is_primary boolean`. Seed with 8 AU states (DTWD for WA, etc.) |
| **AASS (Australian Apprenticeship Support Services)** | ✗ MISSING | CRM7 (new) | Create `aass_registrations` table: `apprentice_id uuid FK`, `registration_number text`, `registered_at timestamptz`, `adms_submission_id text`, `status enum` |
| **TrainingContract** | ✓ Partial — just a TEXT field on Apprentice | CRM7 (promote to entity) | Create `training_contracts` table: `contract_number text UNIQUE`, `apprentice_id uuid FK`, `sta_id uuid FK`, `aass_registration_id uuid FK`, `rto_id uuid FK`, `host_employer_id uuid FK`, `start_date`, `nominal_end_date`, `actual_end_date`, `status enum` |
| FundingSource | ✓ Exists (`funding_sources` table) | CRM7 | No change |
| Qualification (TGA code) | ✓ Exists | CRM7 | No change |
| **UnitOfCompetency** | ✗ MISSING | CRM7 (new) | Create `units_of_competency` table: `code text UNIQUE`, `title text`, `description text`, `tga_status enum`. Plus `qualification_units` join: `qualification_id + unit_id + core_or_elective + sequence` |
| CompetencyAchievement | ✓ Exists as `apprentice_competencies` | CRM7 | No change; will benefit from UnitOfCompetency FK when §UnitOfCompetency lands |
| **Incident (WHS parent)** | ✗ MISSING — only `compliance_alerts` exist | CRM7 (new) | Create `incidents` table: `tenant_id`, `apprentice_id` nullable FK, `placement_id` nullable FK, `host_employer_id` nullable FK, `incident_type enum`, `occurred_at`, `reported_at`, `severity enum`, `description text`, `resolution_notes text`, `status enum`. `compliance_alerts` gets nullable `incident_id` FK |
| Document | ✓ Exists | CRM7 | No change |
| Notification | ✓ Exists | CRM7 | No change |
| **Reminder** | ✗ MISSING — no scheduling entity | CRM7 (new) | Create `reminders` table: `owner_id uuid FK users`, `related_entity_type text`, `related_entity_id uuid`, `due_at timestamptz`, `repeat_rule text` (RRULE), `completed_at timestamptz`. Trigger on `notifications` insert when due fires |
| Activity / Interaction | ✓ Partial — generic `Activity` interface exists, no dedicated Note/Interaction table | CRM7 | Create `interactions` table if agent-productivity tier needs it (phone call log, meeting note, email thread anchor); low priority |

## 5. Schema-builder + page-builder capability matrix

Current state vs target state:

| App | Schema-builder today | Page-builder today | Target |
|---|---|---|---|
| BSU | ✓ Full (Developer Portal /developer/schema) | ✓ Full (Developer Portal /developer/website + widget compositor) | Stay here — BSU is the AUTHORING surface |
| CRM7 | ✓ Partial (custom fields only) | ✓ Partial (PageGridLayout for dashboards) | Consume `tenant_entities` scoped `app_scope='crm7'` or `'all'`; fields + pages authored in BSU render in CRM7 |
| R80.3 | Read-only via `schemaBuilderService.ts` | ✗ None | Consume `tenant_entities` scoped `app_scope='r80'` or `'all'`; add page-builder consumer so dashboard widgets authored in BSU render |
| conduit | ✗ None | ✗ None | Add consumer for both; Next.js 16 wrinkle — page-builder widget catalogue needs RSC-safe components |
| braden | ✗ None (marketing site) | ✗ None | Consumer only for custom lead-form fields (e.g. extra qualifiers per tenant); no full schema builder (overkill for a marketing site) |
| throughput | ✗ None | ✗ None | Consumer only for custom Idea fields |

### 5.1 Core design

- **BSU is the single authoring app** — no app-specific schema or page builder. BSU's Developer Portal writes to `tenant_entities` + `tenant_entity_relations` + `tenant_field_definitions` + `tenant_page_layouts` (new table).
- **Every consumer app reads via a shared hook** — `useTenantSchema(scope)` that returns entities + fields + relations for the requested scope. Hook lives in a new `@bsuite/schema-registry` npm package (mirrors `@bsuite/theme` pattern).
- **`app_scope` is enforced** per PR #133 / #137 pattern: `.or('app_scope.eq.<scope>,app_scope.eq.all')` filter. BSU sees all; consumers see their scope plus `all`.
- **Pages are composed** from a small set of whitelisted components (`DataTable`, `EntitySelector`, `StatGrid`, `Card`, `FormRenderer`). BSU's page-builder is a drag-drop composer that writes JSON layouts to `tenant_page_layouts`. Consumers render from that JSON.

### 5.2 New tables

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
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, app_scope, route_path, layout_version)
);

-- RLS: developer + tenant owner/admin can read/write; tenant members can read only published versions
```

## 6. Phased delivery

Each phase ends with a full ship-all-apps promotion to main.

### Phase 1 — CRITICAL golden-path FKs (2–3 days)

**Ship gaps #1–4 above.** All on `development` branches first; Playwright smoke of contact create + lead create + invoice create; promote to main only after green.

- Migrations: 1 combined (`contacts.client_id`, `leads.contact_id`, `leads.client_id`, `invoices.client_id`) + backfill script with name-fuzzy-match flagging unresolved rows.
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

### Phase 3 — GTO entity gap (5–7 days)

**Ship StateTrainingAuthority, AASS, UnitOfCompetency, Incident, Reminder.** Each is a new table + RLS + TS type + form + selector + integration into downstream reports.

- STA seed: 8 AU states with DTWD (WA), TAFE NSW, etc.
- AASS registrations: nullable until ADMS integration lands (tracked under Part N.8 human-action Xero pattern).
- UnitOfCompetency: seed from TGA import if an API key is available; else allow CSV upload in BSU Developer Portal.
- Incident: parent table + migrate `compliance_alerts.incident_id` FK.
- Reminder: RRULE scheduling + notification trigger.

### Phase 4 — Cross-app write-violation audit (1 day)

**Audit V1–V4.** Write a unit-test style query per table that checks for duplicate-owner violations (e.g. `select count(*) from conduit_candidates where email not in (select email from contacts)` — if non-zero, conduit is silently forking identity).

Produces a `docs/YYYYMMDD-cross-app-write-audit-v1.00W.md` artifact.

### Phase 5 — Schema + page-builder uplift (7–10 days, parallel-safe)

**Ship §5.2 tables + `@bsuite/schema-registry` package + BSU page-builder UI + consumer hooks in 4 non-BSU apps.**

- BSU authoring UI: extend Developer Portal with page-composer; drag-drop widget placement; preview in target app.
- Consumer hook: `useTenantSchema` + `useTenantPageLayout(routePath)` published to `@bsuite/schema-registry@0.1.0`.
- Each non-BSU app: install `@bsuite/schema-registry`, wire to a canonical mount point per route (e.g. a `<TenantLayoutSlot route='/dashboard'>` renders the BSU-authored widgets).
- Consumer rendering: RSC-safe for conduit (Next.js 16); strip client-only widgets when server-rendered; hydrate with data via TanStack Query.

Ships as its own PR chain — does NOT block Phases 1–4.

### Phase 6 — Documentation + CLAUDE.md (0.5 day)

- Refresh `docs/20260227-dry-one-shot-architecture-v1.00A.md` with §11 "2026-04-22 Gap Closure" addendum listing Phases 1–5 outcomes.
- Update each app's CLAUDE.md with the `useTenantSchema` consumer pattern.
- Add a CI lint rule that flags new `text` columns with names matching `*_name|*_email|*_phone|*_company|*_code` on tables that reference an existing entity — forces FK discussion in PR.
- Status bump: `v1.00A` → `v1.01A` on the DRY doc.

## 7. Open questions (Braden)

1. **STA carriage model:** Do we need per-state STA rows (DTWD, TAFE NSW, …) as a single table with a `state` discriminator, or a polymorphic `training_authority` parent with child tables per jurisdiction? Single-table-discriminator is simpler and recommended unless state-specific fields diverge heavily.
2. **UnitOfCompetency seeding:** Is there an official TGA/training.gov.au API with a key we can use, or do we need to support CSV import as the baseline?
3. **Conduit candidate → contact identity:** Today `conduit_candidates` likely has name/email fields that are effectively duplicates of `contacts`. Confirm whether hiring a candidate should merge into an existing contact (dedup by email) or create a linked `contact_id` FK while keeping candidate as a stage-1 entity.
4. **Page-builder widget whitelist:** Start with `DataTable + EntitySelector + StatGrid + Card + FormRenderer`, or broader? Narrower list = faster ship + fewer RSC complications.
5. **Braden lead path:** Today braden.com.au captures leads — does the submit flow write into CRM7's `leads` table via an API call, or does braden have a local staging table that is batch-synced? The answer determines whether V2 is a violation.

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
7. Cross-app write audit artefact (`docs/YYYYMMDD-cross-app-write-audit-v1.00W.md`) has zero unresolved violations after Phase 4.
8. DRY doc bumped to `v1.01A`; CI lint rule blocks any new text column matching the `*_name|*_email|*_company|*_code|*_phone` pattern without an accompanying FK or explicit exemption comment.

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
