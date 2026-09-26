# Unified In-Context Developer Authoring Surface — Implementation Plan

> **Filename corrected 2026-08-17: `v1.00D` → `v1.03A`.** The body declared
> `A (Approved — operator 2026-07-03 "the word")` and `v1.03A`; the filename said Draft v1.00. A
> `D` marker on an operator-approved, build-authorised plan is a Draft marker hiding an authorised
> build — the next agent reads "draft" and re-plans work that was already signed off.


`20260703-unified-authoring-surface-plan-v1.03A.md`
Status: **A (Approved — operator 2026-07-03 "the word")** · Author: claude-code · Date: 2026-07-03 · **v1.03A** (red-team resolutions §11 folded in; Phase-1 build authorized, starting with §11 BLOCKING pre-work)

> **Operator directive (2026-07-03):** "As developer I should be able to edit a
> page and do everything — create a new entity or type of entity, add cards, link
> other entities or pages, create schema entities, connect to schema entities
> (e.g. add a Host Employer field to a page, connect to host employer the same as
> elsewhere)." Phase-1 target chosen: **create-entity-in-context PLUS
> add-and-bind-existing-entity** — *create if it doesn't exist, add+bind if it
> does, warn where something similar exists, and the AI can do it too.*

---

## 1. Problem statement — the incongruence

The visual authoring stack is built as **four disconnected tools plus a launcher
that navigates you away from the page you're editing**, instead of one coherent
in-context surface. Symptoms the operator hit are all facets of this one gap:

- **"Document types missing, no way to add them"** — `documentCategories.ts` is a
  hardcoded literal enum, not schema-driven, so there is no authoring path.
- **Award-rates / stat-card double-card oddness** — pages render hardcoded cards;
  the Canvas Editor can only *rearrange* them, not add/replace/bind.
- **Page Tools = a menu of four separate destinations** — Edit Page Layout,
  Custom Fields & Entities, Schema Builder, Form Layouts — you leave the page to
  use any of them; nothing composes in-context.

**Root cause:** the primitives are ~80% built but never *composed*. This is the
"half-finished across sessions" pattern — the parts exist; the integration is the
work.

## 2. Current-state inventory (grounded — do NOT rebuild these)

| Capability | Where it lives | State |
|---|---|---|
| Canvas Editor (rearrange/resize/hide hardcoded cards) | `@bsuite/page-builder` `PageGridLayout`/`DraggableCardPage`; crm7 `CanvasCard`/`DraggableCardPage` | Built, shipped (0.4.3) |
| **Widget palette incl. entity widgets** (`entity:<name>` → `EntityTableWidget`) | `crm7/src/lib/page-builder/WidgetPalette.tsx` | **Built but mounted NOWHERE** |
| ~20 FK-backed canonical selectors (`HostSiteSelector`, `EmployerSelector`, `PersonSelector`, `PlacementSelector`, …) | `crm7/src/components/entity/selectors/` | Built, used across app |
| Schema Builder (design entities/fields/relationships, graph) | `crm7/src/pages/settings/schema-builder/index.tsx` | Built, separate destination |
| Custom Fields & Entities | `crm7/src/pages/settings/custom-fields*.tsx` | Built, separate destination |
| Form Layouts (drag fields into sections) | `crm7/src/pages/settings/form-layout-create.tsx` | Built, separate destination |
| Custom Pages + tenant layout slots | `CustomPageRenderer.tsx` + `@bsuite/schema-registry` `TenantLayoutSlot` | Built |
| Page Tools launcher (navigates away) | `crm7/src/components/platform/PageEditorLauncher.tsx` | Built — **menu, not composition** |
| AI authoring tools (form layouts, picklists, custom pages) | `crm7/src/lib/ai/tools/ui-builder-tools.ts` | Partially scaffolded |
| Live agent route (JWKS+PKCE, tool loop) | `crm7/api/ai/chat.ts` | Built (0.4.x) |
| Hardcoded config exemplar | `crm7/src/lib/documents/documentCategories.ts` | **Hardcoded enum — target to schema-drive** |

**Live data layer (persistence + catalog + dedup source):**
`tenant_entities`, `entity_relationships`, `tenant_entity_relations`,
`custom_fields`, `form_layouts`, `picklists` + `picklist_options`,
`tenant_navigation` (all RLS-guarded, tenant-scoped). Canonical entities = the
~20 selector-backed core tables (host_employer, people/placements, etc.).

## 3. Target architecture — one in-context surface

**Edit Page becomes the single authoring loop.** From the Canvas Editor a
developer (or the AI) can:

1. **Add** an element (card / field / section / relationship link) to the current
   page.
2. Pick what it binds to via a **unified Entity Catalog** search:
   - **Exists →** bind to the *canonical* entity/field using the same selector +
     table + FK columns used everywhere else ("Host Employer same as elsewhere").
   - **Doesn't exist →** create it in-context (inline Schema Builder mini-flow →
     `tenant_entities`/`custom_fields`), then place + bind it.
   - **Similar exists →** dedup/similarity guard surfaces near-matches and
     *requires an explicit "create new anyway"* before minting a duplicate.
3. **Persist** the binding as part of the page layout definition (widget config
   carries `entityType` + binding), RLS-guarded to developer/platform_admin.
4. **AI parity** — every authoring operation is exposed as an agent tool, so
   "add a Host Employer field to this page" works from chat identically.

### 3.1 New shared primitive: the Entity Catalog

A single read model unifying **canonical entities** (registry of the selector
components + their table + FK columns + labels/icons) **∪ `tenant_entities`**
(custom). One source feeds: the WidgetPalette, the add-or-create flow, the
dedup/similarity warn, and the AI tools. Lives in `@bsuite/schema-registry`
(shared) with a crm7 canonical-registry contribution.

### 3.2 Add-or-create-or-warn engine

`resolveOrCreateEntity(query)` → `{ match: exact | similar[] | none }` →
drives the UI branch (bind / warn+choose / create). Similarity = normalized
name/label match against catalog (no fuzzy-regex; use a token-set comparison
helper per the No-Regex rule).

### 3.3 AI-as-author

Extend `ui-builder-tools.ts` with `authoring.findOrCreateEntity`,
`authoring.addPageWidget`, `authoring.bindEntity`, `authoring.listCatalog` — the
*same* engine the UI calls. Wire into `api/ai/chat.ts`. Fulfils the earlier
"AI can do anything a user can do" directive.

### 3.4 Branding as schema-driven config (folded in — operator-directed 2026-07-03)

**Root cause of the `/developer/branding` upload 400 (live-verified):**
`platform_branding` has `CHECK (id = 'platform')` (single global row), but the
DeveloperBranding UI (`Branding.tsx:145`) upserts one row **per app**
(`id: slug`). Any `slug ≠ 'platform'` → check_violation (23514) → 400. Same
schema-vs-UI incongruence class as the rest of this plan.

**Target model (operator):** *per-app platform defaults, with a "apply to
platform vs this app" choice, that NEVER override enterprise/org custom
branding.*

- Floor-gated migration (**not** raw DDL — §12.1) relaxes
  `platform_branding_id_check` to allow the app slugs **plus** a `platform`
  master row (e.g. `id IN ('platform','crm7','conduit','r8','braden',
  'throughput','bsu')`, or drop the literal-`platform` check for a slug
  allow-list).
- DeveloperBranding UI offers **apply-to-platform vs apply-to-this-app**.
- **Resolution precedence (enforced in `branding_json_for_tenant()`):**
  1. Tier-3 `tenant_app_branding` (enterprise/sub-org/org per-app custom) — **wins**
  2. Tier-2 `tenant_branding` (enterprise/sub-org/org custom, parent-walk) — **wins**
  3. per-app `platform_branding` row (developer app default)
  4. `platform_branding` `id='platform'` master (developer global default)
  5. D2C theme defaults
  **A developer platform/app default must never clobber a tenant's custom brand
  or accents.** This tightens the resolver shipped in
  `20260703000000_branding_json_for_tenant_read_tables.sql`.

## 4. Phasing

- **Phase 1 (this plan — operator-chosen):** the add-or-create-or-warn loop +
  AI parity. Mount `WidgetPalette` in the Canvas Editor; build the Entity
  Catalog + resolve-or-create engine + dedup warn; bind via canonical selectors;
  persist bindings; expose the 4 AI tools. Exemplar entity: **Host Employer**.
- **Phase 2 (schema-driven config + branding):** migrate hardcoded config
  (`documentCategories`) → config/picklist entities editable through the stack;
  **fold in the branding fix** (see §3.4). Extend to fields/sections.
- **Phase 3:** in-context relationships + cross-page/entity links; converge
  Custom Pages; retire the "navigate-away" Page Tools menu into the surface.

## 5. Blast radius

`@bsuite/page-builder` (mount palette; widget config carries entity binding),
`@bsuite/schema-registry` (Entity Catalog + binding persistence + RLS),
`crm7` (Edit Page integration, canonical registry, AI tools, agent route).
Consumer rollout to the other 5 apps follows the §12.2 dependency-bump chain.

## 6. Data & security model

- Bindings persist in the page-layout definition (tenant-scoped) + any new custom
  entity/field lands in `tenant_entities`/`custom_fields` via **floor-gated
  migrations / RPC**, never raw DDL (§12.1).
- **RLS:** authoring writes restricted to developer/platform_admin;
  tenant-scoped reads. Verify live via `pg_policies` (§12.1.1); run
  `get_advisors` after any schema change (§12.1.3).

## 7. Acceptance criteria (as validation targets)

1. In Edit Page on `/people/[id]`, "Add element" → search "Host Employer" →
   binds an entity card using `EmployerSelector`/`HostSiteSelector`, renders live
   host data, persists across reload — **screenshot pair (§9.2)** on d.crm.
2. Search a non-existent entity → inline create → lands a row in `tenant_entities`
   (verified live via MCP, §12.1.1) → immediately placeable + bindable.
3. Search a near-duplicate → dedup warn lists the canonical match; creating
   anyway requires explicit confirm.
4. From the AI chat: "add a Host Employer field to this page" performs the same
   bind (tool-call trace) — output-equivalent to the UI path.
5. Zero new `tenant_navigation`/schema 400s; advisors triaged.

## 8. Skills & MCPs per phase/step (Gate A/C — attach and cite)

Every step invokes the **named** dedicated skill (not a general-purpose agent)
and queries the MCP for the *installed* version before editing (Gate A).

| Step / workstream | Skills (invoke by name) | MCPs |
|---|---|---|
| Pre-edit inventory (all) | `master-orchestration`, `best-practice-research` | **Context7** (installed version of `ai`, `react`, `@dnd-kit/*`, `react-grid-layout`, `@bsuite/page-builder`, `@bsuite/schema-registry`) |
| Entity Catalog + resolve-or-create engine | `dry-one-shot-architecture`, `api-design-validation` | Context7, **Supabase** (`list_tables`, `execute_sql` on `tenant_entities`/`custom_fields`) |
| Mount WidgetPalette in Canvas Editor | `shadcn-ui`, `tailwind`, `feature-dev:code-reviewer` | Context7 (`@bsuite/page-builder`) |
| Bind via canonical selectors | `dry-one-shot-architecture` | Supabase (`information_schema` FK columns) |
| Persistence + RLS + migrations | `supabase-postgres-best-practices` | **Supabase** (`apply_migration` via floor-gated dispatch, `get_advisors`, `pg_policies`) |
| Branding fold-in (§3.4) | `supabase-postgres-best-practices`, `bsuite-design-sheriff` | Supabase (CHECK relax migration + resolver), **Vercel** (deploy) |
| AI parity (`ui-builder-tools`, agent route) | `vercel-ai-sdk`, `supabase-auth-comprehensive` | Context7 (`ai` version), **Vercel** (AI Gateway `/v1/models`) |
| Live UX verify | `playwright-skill` / `qa-and-verification`, `verification-before-completion` | **Playwright** or **chrome-devtools-mcp**, **Vercel** (`get_deployment` until READY on `d.*`) |

## 9. Red-team protocol (run by subagents before build; §6/§17)

Adversarial review **before** implementation, run as an agent team; each lens is
a distinct reviewer (perspective-diverse, not redundant). Findings fold back
into this doc (bump to v1.02R) and gate the build.

1. **Architecture lens** — does composing WidgetPalette + selectors + Schema
   Builder actually deliver the add-or-create-or-warn loop without a rewrite?
   Any place we'd duplicate an existing primitive (§1 anti-goal)?
2. **Security / RLS lens** — authoring writes are developer/platform_admin only;
   `tenant_entities`/`custom_fields`/`platform_branding` policies verified live
   (§12.1.1); branding precedence never lets a platform default clobber a tenant
   custom brand (§3.4).
3. **DRY / entity-ownership lens** — every entity reference is FK-backed via a
   canonical selector; no new free-text `*_name` fields; the dedup/similarity
   warn actually prevents duplicate entities.
4. **Developer-UX lens** (`bsuite-user-advocate`) — the "do everything from Edit
   Page" loop is discoverable, non-destructive, and the AI path is output-
   equivalent to the UI path.
5. **Completeness critic** — what's unspecified (persistence shape of bindings,
   migration floor, AI tool auth, rollback)?

**Cross red-team agents:** claude-code (architecture), perplexity-computer or
codebuff (security/DRY), `bsuite-user-advocate` (UX). No queue item flips to
`done` until a peer verifies the evidence rows (§9/§17).

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both §9.1 (output-equivalence: AI path == UI path) and
  §9.2 (visual-equivalence: Edit Page add/create/bind flow on d.crm).
- **Equivalence target**: live-deploy `d.crm.crm7.app/people/[id]` Edit Page +
  before/after screenshots + AI tool-call trace.
- **Cross red-team**: perplexity-computer (or codebuff) verifies evidence rows
  before flip-to-done; bsuite-user-advocate red-teams the developer-UX.
- **Skills to load**: `master-orchestration`, `writing-plans`,
  `multi-agent-red-team-planning`, `supabase-postgres-best-practices`,
  `supabase-auth-comprehensive`, `shadcn-ui`, `tailwind`, `vercel-ai-sdk`,
  `verification-before-completion`.
- **Self-report on divergence**: yes (mandatory).

## 10. Open questions for operator

1. **Home for the shared Entity Catalog** — `@bsuite/schema-registry` (proposed)
   vs a new `@bsuite/entity-catalog` package.
2. **Custom entity storage floor** — reuse `tenant_entities`/`custom_fields`
   as-is, or extend their schema (adds a migration).
3. **Rollout** — crm7-first (prove Phase 1), then the §12.2 chain to the other 5
   apps; confirm crm7-first is acceptable.
4. **Who is "developer"?** (red-team #6) — does the entity/field authoring loop
   target BSuite's own engineers (platform-scoped) or every *tenant's* own
   admin/owner (tenant-scoped)? The LIVE RLS on `tenant_entities`/`custom_fields`
   is tenant-scoped (`owner/admin/manager`); branding is platform-scoped
   (`platform_role`). This changes the whole security surface — see §11.6.

## 11. Red-team resolutions (subagent-run 2026-07-03 → v1.02R)

A perspective-diverse subagent red-team reviewed v1.01D against the live code +
Supabase catalog. All 10 findings are code/DB-grounded; resolutions below amend
the plan. **BLOCKING** findings gate the Phase-1 build.

1. **[BLOCKING] New-entity row storage is missing.** `tenant_entities` +
   `custom_fields` are **metadata-only**; there is no records table, and
   `EntityTableWidget` does `supabase.from(entityType)` (raw physical table). →
   **New §3.1a:** add `tenant_entity_records (id uuid, tenant_entity_id uuid FK,
   tenant_id uuid, data jsonb, created_at, updated_at)` with tenant-scoped RLS;
   `EntityTableWidget` branches canonical-table vs custom-entity→records. This is
   **new build**, not composition — Phase-1 scope updated to say so.
2. **[BLOCKING/Security] Raw-table-name exposure.** `EntityTableWidget.tsx:20`
   passes tenant `text` (`tenant_entities.name`) straight into `.from()`; a
   tenant admin could target `tenant_branding` (unrestricted SELECT) or any live
   table. → **§3.1 amendment + new AC:** `EntityTableWidget` and AI `bindEntity`
   MUST validate the target against the Entity Catalog allowlist (canonical
   tables) OR the `tenant_entity_records` path — never a raw string.
3. **[BLOCKING/Security] §3.4 branding premise was wrong.** The **live**
   `branding_json_for_tenant()` is **zero-arg, 2-tier** (`platform_branding`
   master ← `tenant_branding` parent-walk) and **never reads
   `tenant_app_branding`**. → §3.4 is **superseded**: the branding fix must (a)
   add an `app_slug text` param, (b) **ADD** the `tenant_app_branding` tier
   (currently unread — this is new, not "tighten"), (c) audit every caller
   (`useBranding.ts`, `BrandingProvider`) — none pass an app slug today. *Team B
   (branding-fix) was instructed to add the tenant_app_branding tier + handle
   app-context; verify it added the `app_slug` param and caller audit.*
4. **[Architecture] WidgetPalette's create-path itself navigates away.**
   `WidgetPalette.tsx:139-142`'s "doesn't exist" link calls
   `navigate('/settings/schema-builder')`. → **§4 Phase 1:** that nav link is
   **replaced** with the inline `resolveOrCreateEntity` flow. Positive:
   `pageGridLayoutAdapter.tsx:42-65` already exposes
   `createEntityWidget`/`onRegisterEntityWidget` + a `crm7-add-entity-widget`
   event — dispatch into it (cheaper than new eventing).
5. **[BLOCKING/Completeness] Complete two half-built primitives, don't rebuild.**
   `crm7/src/lib/entity-validator.ts` is a **dedup stub** whose types
   (`EntityMatch{confidence, matchReasons, suggestedAction}`) are exactly §3.2's
   shape. `packages/schema-registry/.../SchemaFieldAdderWidget.tsx` is a built,
   **`enabled={false}`** inline field-adder calling RPC
   `add_tenant_field_definition` — which **does not exist live**. → §2 inventory +
   §3.2: **complete `entity-validator.ts`** (dedup) and **finish + ship the
   `add_tenant_field_definition` RPC** to enable `SchemaFieldAdderWidget`, rather
   than new UI. Re-run a "stub/TODO/disabled" grep before build (§1 anti-goal).
6. **[BLOCKING/Security] §6 RLS split is wrong.** Only `platform_branding` is
   `platform_role`-gated; `tenant_entities`/`custom_fields`/`form_layouts`/
   `picklists`/`entity_relationships`/`tenant_entity_relations` writes are
   **tenant-scoped** (`owner/admin/manager`). `custom_fields` has **no role
   check at all** (only a `app.current_tenant_id` GUC). → §6 split into (a)
   tenant-scoped entity/field authoring, (b) platform-scoped branding; the Edit-
   Page branding card gates on `isDeveloper` specifically; **`custom_fields` RLS
   hardening (add role check + move to `auth_tenant_id()`) is a Phase-1 blocker**;
   "who is developer" → §10.4 open question.
7. **[Architecture/DRY] AC1 needs a new widget.** `EntityTableWidget` is a
   generic table browser; the FK selectors are in-form comboboxes — neither
   renders "this person's bound Host Employer card." → §3: add
   **`RelatedEntityCardWidget`** (consumes an FK-relationship binding + current
   record id, renders via the canonical selector's display logic); AC1 rewritten
   to name it.
8. **[Completeness] Name the relationship-table semantics.**
   `tenant_entity_relations` = schema-level entity-TYPE relationships (Schema
   Builder graph); `entity_relationships` = record-level instance links (audit
   if still written). A widget's FK binding is **layout config only**, not a new
   relationship row — added to §3.1/§6 to avoid a third overlapping table.
9. **[Completeness] Name the persistence owner.** Phase-1 bindings persist
   through `@bsuite/page-builder`'s existing per-app/per-tenant preference
   adapter (what's actually mounted), NOT `schema-registry`'s `TenantLayoutSlot`
   (which `crm7/CLAUDE.md` documents as **BSU-authors-only**). → §5: Phase 1 is
   **scoped to crm7-local pages** (excludes cross-app `TenantLayoutSlot`
   layouts); revising that doctrine needs separate operator sign-off.
10. **[Developer-UX] Don't run two competing flows silently.** During Phase 1
    (before Phase 3 retires Page Tools), the "Custom Fields & Entities" /
    "Schema Builder" cards must show a "Try this from Edit Page instead" nudge
    (or be hidden) — added to §7 AC + §9.4, or the UX red-team fails first pass.

## 26 September — forms and signatures delivered through this surface (bsuite#3208)

**Still the plan as of 2026-09-26.** The capability register cites this plan as the live in-context authoring specification (rows C01, C05, C06, C08, C12, C13 and C15).

Recorded by the #3208 lane. It closes the 23 September handoff that the capability register notes: an update was
due to this plan's owner, and that owner's session is no longer active.

Form authoring, fill, signatures and confidential escalation are **deployed-tested** on production. The
[capability register's 26 September section](../20260908-customization-capability-register-v1.00W.md#26-september--3208-c1c9-deployed-tested-on-production)
has the full documentation contract, and the
[evidence pack](../evidence/20260926-bsuite-3208/README.md) has the evidence.

What that means for this plan:

- The form builder (`/settings/form-layouts`) follows this plan's rule: records, never storage. Its palette offers
  the record's fields only, and asks "Which kind of record".
- Form definitions stay in `form_layouts` (the 23 September store ruling cites this plan's lines 56–59).
- The 23 September Margin-class workspace requirements are not all built. That covers the four publish
  destinations, comments and Jodie actions. They remain requirements under bsuite#3204 and #3208 in the register.
  Nothing here claims them.
