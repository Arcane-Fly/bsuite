# BSuite Data Platform — Completion Program

**Status:** DRAFT — decisions required before execution
**Date:** 2026-08-07
**Silo:** `bsuite_` · Project family: BSuite
**Supersedes:** `~/.claude/plans/https-crm-crm7-app-reports-custom-create-distributed-origami.md` (2026-08-06, DRAFT). That plan was sound; P0–P9 were built and merged to `main`. This document exists because **the completion tests it set for itself were never run**, and a live audit of the shipped result found a materially different state from the one "merged" implies.
**Method:** 2 parallel read-only `Explore`/`general-purpose` subagents (sonnet) + live verification against Postgres `tuybltdrdefjblnplpqo` + independent re-verification by the author of every P0 claim + branch/worktree sweep across parent and all 6 submodules.

---

## 0. The one-paragraph version

The engine is good. `report_run_catalog_query` is `SECURITY INVOKER` with catalog-validated identifiers, real FK-derived joins, dry-run and undo — the safety architecture the source plan argued for is genuinely there. **What is missing is coverage and use.** The report catalog describes **23 of 363 tables (6.3%)** and is crm7-only: zero conduit, zero BSU-only, zero throughput, zero braden. Four persistence surfaces built in P4/P5 hold **zero rows between them**. One live silent data-loss bug ships today. This program closes coverage, proves use, and fixes what the audit found — it does not re-architect anything.

---

## 1. Verified state (2026-08-07, live)

### 1.1 Table wiring — 363 tables

| Class | Count |
|---|---:|
| Wired (direct `.from()`) | 271 |
| Wired (RPC-only, app calls that RPC) | +13 |
| Wired (indirect/dynamic registry) | +8 |
| **Total wired** | **292** |
| Load-bearing via inbound FK only | 16 |
| Orphan candidates (0 refs, 0 FK) | 55 — **48 at 0 rows**, 7 view/webhook-mediated |

### 1.2 Report catalog coverage — the answer to "is it platform-wide?"

**No. It is crm7-wide.**

| | |
|---|---:|
| `report_catalog_entities` | 23 |
| Wired tables NOT catalogued | **269** |
| Conduit `r7_*` catalogued | **0 of 23** |
| BSU-only / throughput-only / braden-only catalogued | **0** |
| R80.4 wage/award catalogued | **0** |

Entirely uncovered domains despite being fully wired: recruitment/ATS (`r7_*`, 23 tables), WHS (`whs_*`, 9), documents (`document_metadata` — 425 rows), GTO compliance (`gto_*`, 5), Xero (`xero_*`, 7), platform admin (`platform_*`, 8).

**Highest-value seed candidates** (real usage, real rows, invisible to reporting today):

| Table | Rows | Why it matters |
|---|---:|---|
| `training_providers` | **8,119** | Largest table in the schema |
| `user_preferences` | 1,229 | (likely *not* report-worthy — settings) |
| `anzsco_occupations` | 1,023 | Occupation reference |
| `role_capabilities` | 486 | Authorisation model |
| `document_metadata` | 425 | Largest tenant-scoped table |
| `apprentices` | 16 | **26 inbound FKs** — most structurally-connected uncatalogued table |
| `r7_*` family | — | Entire ATS domain, 0% covered |

### 1.3 Per-app footprint

| App | Tables directly wired |
|---|---:|
| crm7 | 201 |
| BSU | 60 |
| conduit | 42 |
| braden | 17 |
| throughput | 16 |
| **R80.4** | **0** |

**R80.4 makes no Supabase calls at all.** It is a pure calculation library; crm7 persists its output. Consequence: `r80_charge_rate_builds`, `r80_margin_policies`, `r80_payroll_tax_positions` (all 0 rows) have **no persistence wiring in either app**. If they are meant to store R80.4 output, that wiring does not exist anywhere in the monorepo.

### 1.4 Never-exercised surfaces

| Surface | Rows | Writer exists? |
|---|---:|---|
| `report_templates` (non-platform scope) | **0** | yes |
| `data_import_jobs` | **0** | yes |
| `data_change_sets` | **0** | yes |
| Tenant-authored `report_catalog_entities` | **0** | no (migration-seeded only) |
| `custom_pages` / `form_layouts` / `ui_config_overrides` / `tenant_schema_layout` | **0** each | yes |
| `tenant_entity_records` / `tenant_entity_relations` | **0** | yes |

**14 of 21 config/builder tables are at 0 rows; 12 of those have a reachable writer.** The source plan named this exact signature as the estate's dominant defect (§1.3) and then reproduced it.

### 1.5 Inert gates

- `report_catalog_fields.min_role` is **NULL on all 229 rows**, and the check **fails open** on NULL — so the role half of the gate can never deny. It is *not* a leak: `is_pii` is enforced independently (12 fields) and RLS remains the primary control. See §2 P0.2 and §8.1 for the corrected severity.
- `_bulk_data_write_authority()` never calls `get_descendant_tenant_ids()` — **the enterprise/sub-org tier is not implemented in the write path.** Inert today (all 5 tenants are root) but it is a tier the operator explicitly described.

---

## 2. P0 — live defects found by this audit

### P0.1 — A custom field added via the inline widget silently vanishes

`crm7/src/pages/settings/custom-fields.tsx` wires **two** add-field controls to **different tables**:

| Control | Writes | Rows | Read by the page |
|---|---|---:|---|
| Page's own "Add Field" form | `tenant_field_definitions` | 562 | yes |
| `SchemaFieldAdderWidget` (`:244`) → `add_tenant_field_definition()` | `custom_fields` | **0** | **never** |

Independently verified live: the RPC body contains `INSERT INTO public.custom_fields` and does **not** reference `tenant_field_definitions`. `customFieldsService` reads `tenant_field_definitions` exclusively (`:101,122,149,160`).

The comment at `custom-fields.tsx:106` asserts the opposite — *"the SAME `custom_fields` table this page's own 'Add Field' form writes to … not a competing system"* — and cites *"live-verified via Supabase MCP `pg_proc` 2026-07-03"*. Someone verified the RPC **existed**, not what it **wrote to**.

**Severity:** user gets a success response, field never appears. Silent data loss on a shipped settings page.

> **CORRECTION (2026-08-07, from `claude-opus5-dataplatform-lane` during P1 — accepted).**
> This section originally read *"562 fields exist via one path; zero have ever survived the other."*
> **That framing was wrong and misleading.** All 562 `tenant_field_definitions` rows were written
> in a **single second on 2026-05-12**, `created_by` NULL, `scope='platform'` — they are a
> migration seed. **Zero rows in that table were ever created by a user through EITHER control.**
>
> The original wording implied the page's own "Add Field" form is the proven-good path. It is
> **equally unexercised**. Consequences, both binding:
>
> 1. **P1's completion test must exercise BOTH controls**, not only the inline widget.
> 2. That pushes part of P1 into **P3** territory (prove the write path), which is where this
>    program's real risk sits.

#### P0.1 turned out to have a second half the audit missed

Found by the implementer during P1, and it is the more dangerous half:

`add_tenant_field_definition()` resolved its target tenant with
`ORDER BY (ut.tenant_id = v_entity_tenant_id) DESC LIMIT 1`. **All 44 `tenant_entities` rows have
`tenant_id IS NULL`**, so that key was NULL for every candidate — and `ORDER BY NULL` imposes no
ordering, leaving `LIMIT 1` an **arbitrary pick**.

**Repointing the table alone would NOT have fixed the reported bug.** The field would have been
written successfully into a coin-flip tenant, and the page — filtered to the current tenant —
would still have shown nothing. Identical symptom, different cause.

Three things follow, all generalisable beyond this defect:

- **`x = NULL` inside an `ORDER BY` does not sort — it silently disables the ordering.** Same
  family as this estate's recorded `NaN = NaN` and `NULLS FIRST` lessons: a comparison against
  NULL that reads as a preference and is actually a no-op. Postgres does not warn.
- **A live test would have been a coin flip, and a pass would have been luck rather than
  evidence.** A 50% intermittent pass is worse than a clean fail — it reads as "works, flaky"
  and the real defect survives.
- **The operator is the WORST-case test account here, not the best.** Braden's two accounts each
  hold multi-tenant membership that no real client has; every real client user is single-tenant
  and would have passed.

Two further defects the same phase surfaced, recorded because each is a class rather than an
instance:

- **`min(uuid)` does not exist in Postgres.** A first fix contained `SELECT count(*), min(ut.tenant_id)`
  — `42883` at runtime, on a branch taken by *every* live call, i.e. silent data loss traded for a
  total outage. It passed `CREATE FUNCTION`, `pnpm typecheck`, all four migration linters, the
  pre-commit hook, and a written spec review. **Only executing it caught it.** Doctrine:
  *a plpgsql body is not semantically checked until it runs* — applying a function migration proves
  only that it PARSES. Verification means calling it, once per branch, as a real identity.
- **`DROP ... IF EXISTS` on an old signature followed by a bare `CREATE`** aborts a baseline replay
  with `42723` when the new signature already exists. Use `CREATE OR REPLACE`.

### P0.2 — `min_role` is NULL on every catalogued field — and the gate FAILS OPEN

*(Severity corrected during red-team — see §8.1. This is **not** a leak; it was initially written as one.)*

`report_catalog_caller_may_access_field()` opens with:

```sql
v_min_role_ok := CASE WHEN p_min_role IS NULL THEN true  -- ← fail-OPEN
```

With `min_role` NULL on all 229 rows, the role half of the gate can never deny. **But it is not a data leak**, for two reasons verified live:

1. `v_pii_ok` is computed **independently** and still enforces — a PII field requires `is_gto_admin()` or `is_platform_developer()`. The 12 PII-flagged fields are protected today.
2. The engine is `SECURITY INVOKER`, so **RLS on every base table remains the primary control**. Selecting a field you may not read returns no rows; it does not return someone else's.

So the accurate statement is: **the defence-in-depth layer described in the source plan's D7 is present in code and unpopulated in data.** The primary control holds.

**The real hazard is forward-looking, and it lands in P2.** Because the function fails open on NULL, seeding ~100 new entities and their fields **without setting `min_role` at insert time** produces hundreds more fail-open fields. Restrictiveness cannot be decided only at the seeding step while the function's own default is permissive — that combination is how 229 open fields happened the first time.

### P0.3 — The `custom_fields` name collision

`custom_fields` is simultaneously (a) a catalog **table** (0 rows, orphaned) and (b) a JSONB **column** on 12 physical tables which is the real, live value store. Same identifier, two unrelated mechanisms, same codebase. This is a standing trap for the next person who greps it — and is plausibly how P0.1 was introduced.

---

## 3. Phases

Each phase: **model tier · skills · MCPs · red-team · validation · verification**. Ordered so risk rises only after the safety net is in.

> **ORDER CORRECTED after red-team (§8.4).** The sequence is **P1 → P3 → P2 → P4 →** … not P1 → P2 → P3. The catalog is the allowlist the DEFINER write engine trusts, so extending it before the write paths are proven widens an unproven surface. P2 is gated behind a green two-account cross-tenant write test.
>
> **P0.0 — cross-tenant write via `bulk_data_undo`: FOUND AND FIXED** during this plan's own red-team. `20260807060000` (crm7 `4d1755a9`), applied and verified both directions. Detail in §8.3. Listed here because a reader scanning phases must not conclude the write engine was safe all along.

---

### P1 — Fix the live defects · **risk: medium**

**Scope:** P0.1, P0.2, P0.3.

- **P0.1 decision:** repoint `add_tenant_field_definition()` at `tenant_field_definitions` **or** remove the widget. Recommend **repoint** — the widget is good UX and the RPC has a `CHECK` constraint the form lacks. Grep confirms zero other readers of the `custom_fields` table. Then retire the table (Expand→Migrate→Contract).
- **P0.2:** populate `min_role` across all 229 fields. Requires a policy decision (D4).
- **P0.3:** rename the table (not the column — the column is the live one) before retiring it, so the collision cannot survive in history.

| | |
|---|---|
| **Model** | sonnet (mechanical) · **opus** for the RPC repoint (touches a published package's contract) |
| **Skills** | `db-supabase` · `auth-supabase` (min_role policy) · `test-driven-development` · `check-security` |
| **MCPs** | Supabase (apply + verify live) · Context7 (only if `@bsuite/schema-registry` API is touched) |
| **Red-team** | **fable** — "is repointing the RPC safe, or does some caller depend on `custom_fields` shape?" Adversarial: find a reader the grep missed (nested selects are invisible to grep — see §6.2). |
| **Validation** | pgTAP: field added via RPC appears in `getFieldDefinitions()`. Negative: a user below `min_role` cannot select a gated field. |
| **Verification** | **Live, signed in:** add a field via the inline widget on `/settings/custom-fields` and watch it render. That is the completion test — not a passing unit test. |

---

### P2 — Extend the catalog to the whole platform · **risk: low**

This is the phase that answers the operator's question. It is **data, not architecture** — the engine already queries the same Postgres every missing table lives in.

**Scope:** raise coverage from 23 → target ≥120 entities spanning all six apps. Priority order:

1. `r7_*` recruitment (23 tables — an entire product line invisible to reporting)
2. `whs_*` safety (9)
3. `document_metadata`, `gto_*` compliance
4. `apprentices` (26 inbound FKs), `awards`/`award_rates`, `engagements`, `contracts`
5. Reference dimensions: `training_providers`, `anzsco_occupations`, `units_of_competency`, `public_holidays`

**Explicitly excluded** (decide in D2, do not seed by default): `user_preferences` (settings, not business data), audit/rate-limit tables (write-only by design), `platform_*` (developer tier only — gate via `min_role`).

**Joins must derive from `pg_constraint`**, never hand-typed. The source plan's §1.2 documented a hand-written join that "silently matches nothing for correctly-written rows" — a confident wrong number is the worst failure a reporting tool has.

| | |
|---|---|
| **Model** | sonnet (seeding) · haiku (mechanical introspection sweeps) |
| **Skills** | `db-supabase` · `machine-db-postgres-best-practices` · `general-dry-one-shot-architecture` (entity ownership — one owning app per entity) |
| **MCPs** | Supabase (introspection + apply) |
| **Red-team** | **fable** — "which of these 100 new entities exposes a column that should never be reportable?" PII sweep before seeding, not after. |
| **Validation** | CI drift check: catalog row whose table/column no longer exists **fails the build**. Verify the check fails on a deliberately-renamed column — a guard that cannot fail is not a guard. |
| **Verification** | Build one report per app family (crm7, conduit ATS, WHS) returning non-zero rows against seed data. |

---

### P3 — Prove the write paths · **risk: low, value: highest**

Four surfaces have never produced a row. Until one does, none of P4–P9 is known to work.

**Completion tests — each is "a row appears from the UI", not "the code compiles":**

| Test | Table | Currently |
|---|---|---:|
| Save a custom report as a tenant | `report_templates` scope≠platform | 0 |
| Run an import | `data_import_jobs` | 0 |
| Run a bulk update, then undo it | `data_change_sets` | 0 |
| Publish a page layout | `custom_pages` / `form_layouts` | 0 |
| Author a tenant catalog entity | `report_catalog_entities` tenant_id≠null | 0 |

| | |
|---|---|
| **Model** | sonnet · **opus** for anything that fails (a surface that fails here has an unknown-cause bug) |
| **Skills** | `test-playwright` · `test-verify-before-completion` · `bsuite-ship-visual-promote` |
| **MCPs** | Playwright (drive the real UI) · Supabase (assert the row landed) |
| **Red-team** | **fable** — "if the row does not appear, is it RLS, the client filter, or a silent 403?" A silent denial is indistinguishable from a no-op; every mutation surface must pass an `onError` that **renders**. |
| **Validation** | Each surface exercised signed-in as a real user per tier. |
| **Verification** | Row count > 0, verified by SQL, for every line in the table above. |

---

### P4 — Seed data · **risk: low**

**Use the existing `Demo Organisation — CRM7` tenant** (`aaaaaaaa-0000-0000-0000-000000000001`, slug `demo`, tier `enterprise`). It exists, has **0 rows and 0 members**, and its fixture-shaped UUID shows it was created for exactly this.

Rationale over the alternatives:

- **Not Braden Group** (9 people, 3 clients, 1 timesheet) or **bsuite Platform** (16 people, 13 clients) — *neither is empty*. Seeding into them mixes demo with live rows and leaves no boundary to delete along.
- **Not a new tenant** — this one already exists.
- **Never FutureBuild Academy** — real client data (Caris).
- It **doubles as the cross-tenant isolation fixture** P5 and P6 require. Proving org-admin-A cannot reach tenant-B needs a second tenant with known contents; using a real client for a negative security test is not acceptable.

**Action:** add the operator as `owner` in `user_tenants` so it appears in the tenant switcher; seed a coherent GTO dataset (people → placements → timesheets → invoices → training contracts) large enough to exercise joins and aggregates.

| | |
|---|---|
| **Model** | sonnet · haiku (bulk row generation) |
| **Skills** | `biz-au-apprenticeship` · `biz-au-award-boot` (realistic GTO shapes, not lorem ipsum) |
| **MCPs** | Supabase |
| **Red-team** | **fable** — "does any seed row leak into another tenant's queries?" |
| **Validation** | Every seeded row carries `tenant_id = aaaaaaaa-…-0001`. Zero rows land in any other tenant. |
| **Verification** | Sign in, switch to the demo tenant, see the data. Switch to Braden Group, see none of it. |

---

### P5 — Tier scoping: close the enterprise gap · **risk: high**

`_bulk_data_write_authority()` handles developer and org-admin correctly and enforces D5 (platform rows read-only to tenants). It does **not** handle the sub-org tier — no `get_descendant_tenant_ids()`.

Blocked on **D1** (what a sub-org *is*). If D1 says defer, this phase is: document the gap in the function body so the next reader knows it is deliberate, not missing.

| | |
|---|---|
| **Model** | **fable** (irreversible, security, cross-tenant) |
| **Skills** | `bsuite-rls-authz-red-team` · `check-security` · `auth-supabase` |
| **MCPs** | Supabase |
| **Red-team** | **fable, adversarial**: craft a definition/import naming another tenant's rows from every tier. Expected: **0 rows**, every time. |
| **Validation** | pgTAP two-account cross-tenant suite. |
| **Verification** | Two real accounts, live. Not fixtures. |

---

### P6 — Wire what should be wired; retire what should not · **risk: medium**

From the audit:

**Retire (Expand→Migrate→Contract):**

- `workers` → `people` — 0 rows, 0 inbound FKs, 0 readers. **Already contract-ready** (verified 2026-08-06).
- `organization_members` → `org_members` — a 3-way legacy overlap with `enterprise_memberships`, flagged in an audit **3 months ago** and still unresolved.
- `custom_fields` table (after P1).
- 48 zero-row orphans — batch-assess, do not batch-drop.

**Decide, do not assume:**

- `apprentices` → `people` is a **partial** migration. The UI selector already resolves `apprentice` → `people`, but `apprentices` still has 16 rows and **26 inbound FKs**. This is coexistence, not supersession. Finishing it is a data-migration project, not a drop.
- `r80_*` tables (0 rows, no wiring in either app) — either wire R80.4 output persistence or drop them. Leaving 0-row tables named after a live product is how the next reader concludes a feature exists.

| | |
|---|---|
| **Model** | sonnet · **fable** for each drop decision (irreversible) |
| **Skills** | `check-codebase-cleanup` · `check-cleanup-scope-safety` · `db-supabase-migration` |
| **MCPs** | Supabase |
| **Red-team** | **fable** — "what reads this that grep cannot see?" Nested `.select('*, child(*)')` embeds, DB triggers, `pg_cron`, and external webhooks are all invisible to the audit that produced this list (§6.2). |
| **Validation** | Live-catalog verification, never migration files. Dry-run inside a guaranteed rollback. |
| **Verification** | Drop applied; dependent surfaces still render. |

---

### P7 — Builder interop · **risk: medium**

The six subsystems are near-total silos. Concrete consequence: **24 of 44 schema-builder entities (55%) can never be reported on**, including `apprentice` — which has live rows *and* custom-field support. A developer adds a custom field to an apprentice; it can never reach a report.

**Decide (D3):** is `report_catalog_entities` derived from `tenant_entities`, or deliberately hand-curated? Either is defensible — reporting needs `is_pii`/`min_role` that schema-builder has no concept of. **What is not defensible is leaving it undocumented**, because "why can't I report on X" then reads as a bug forever.

Also: `tenant_entity_records`/`tenant_entity_relations` are at 0 rows — the entire "create your own entity" capability, including a dedicated EAV fallback in `platform-kit-proxy`, has never been used by a real tenant.

| | |
|---|---|
| **Model** | opus (architectural) |
| **Skills** | `general-dry-one-shot-architecture` · `bsuite-developer-portal` · `check-dry-one-shot` |
| **MCPs** | Supabase · Context7 |
| **Red-team** | **fable** — "does a promotion path create a privilege-escalation route from tenant-authored entity into platform scope?" |
| **Validation** | Add an entity in schema-builder → it becomes reportable (or is explicitly, visibly, not). |
| **Verification** | Live, per tier. |

---

### P8 — Xero: connected but never synced · **risk: medium**

2 connections, both `last_synced_at IS NULL`; 0 webhooks ever received; **0 of 3 invoices carry a Xero ID**. OAuth succeeded; data never flowed; nothing surfaces the difference.

**Capability ceiling — sharper than previously recorded, verified in-repo against a 47-page API pass:**

| Value | Xero source |
|---|---|
| GST | ✅ Accounting `TaxRates` — tenant lane only (codes are per-org) |
| Leave loading / OT multiplier | ⚠️ Payroll AU `PayItems`/`EarningsRates` — behind a `payroll.settings` scope **neither connection is guaranteed to hold** |
| Payroll tax rate | ❌ absent from Xero's API entirely |
| **Superannuation Guarantee rate** | ❌ **no Xero source at all** |

This corrects the previously-held "Xero can give GST / leave-loading / OT, cannot give payroll" — leave-loading/OT is *conditional*, and SG has no source whatsoever.

| | |
|---|---|
| **Model** | sonnet · opus if sync fails with unknown cause |
| **Skills** | `biz-xero-integration` · `biz-xero-accounting` |
| **MCPs** | Supabase · Context7 (Xero SDK currency) |
| **Red-team** | **fable** — "what does a partially-successful sync leave behind?" |
| **Validation** | One invoice round-trips and carries a `xero_invoice_id`. |
| **Verification** | Surface sync health (not just connection state) in the admin view. A connected-but-silent integration is worse than a visibly disconnected one. |

---

### P9 — Surfaces per tier · **risk: medium**

Routes exist and are correctly placed: BSU `/developer/database` (platform, developer-gated; `/developer/tables` and both platform-kit routes now redirect into it); crm7 `/admin/data`, `/settings/data`, `/reports/custom/create`. **The operator's placement rule is already implemented.** What is unproven is that each tier sees only its own scope.

| | |
|---|---|
| **Model** | sonnet |
| **Skills** | `test-playwright` · `bsuite-user-advocate` · `web-ui-ux-patterns` |
| **MCPs** | Playwright · Supabase |
| **Red-team** | **fable** — "what does a tier see that it should not?" |
| **Verification** | Four real accounts, one per tier, live. |

---

## 4. Decisions required

| ID | Decision | Recommendation |
|---|---|---|
| **D1** | Sub-orgs / enterprise tier — define `parent_tenant_id` now, or leave designed-in but inert? | **Defer, document.** All 5 tenants are root. What a sub-org *is* is a domain ruling, not an engineering guess. But document the gap in `_bulk_data_write_authority()` so it reads as deliberate. |
| **D2** | Catalog scope — everything, or curated? | **Curated, but platform-wide.** Seed all business domains across all 6 apps; exclude settings/audit/rate-limit tables. Gate platform-only entities with `min_role`, don't omit them. |
| **D3** | Is `report_catalog_entities` derived from `tenant_entities` or hand-curated? | **Hand-curated, documented as such**, with a promotion path (schema-builder entity → *draft* catalog row → developer approves). Auto-derivation would surface PII columns nobody vetted. |
| **D4** | `min_role` policy — what is the default for a newly catalogued field? | **Default to the most restrictive** that keeps the field usable, then relax deliberately. Defaulting open reproduces the current state where the gate cannot fire. |
| **D5** | May an org admin bulk-update platform reference data (`tenant_id IS NULL`)? | **No — already enforced correctly** in `_bulk_data_write_authority()`. Add a visible "Platform-managed" affordance so it reads as intentional. |
| **D6** | `r80_*` tables — wire or drop? | **Ask R80.4's owner.** R80.4 makes zero DB calls by design; these may be crm7's intended persistence for its output, or dead. |
| **D7** | `apprentices` → `people` — finish the migration or formalise coexistence? | **Formalise coexistence for now.** 26 inbound FKs makes this a data-migration project, not a cleanup. |

---

## 5. Skills & MCP index

| Phase | Skills | MCPs | Model |
|---|---|---|---|
| P1 | `db-supabase`, `auth-supabase`, `test-driven-development`, `check-security` | Supabase, Context7 | sonnet / opus |
| P2 | `db-supabase`, `machine-db-postgres-best-practices`, `general-dry-one-shot-architecture` | Supabase | sonnet / haiku |
| P3 | `test-playwright`, `test-verify-before-completion`, `bsuite-ship-visual-promote` | Playwright, Supabase | sonnet / opus |
| P4 | `biz-au-apprenticeship`, `biz-au-award-boot` | Supabase | sonnet / haiku |
| P5 | `bsuite-rls-authz-red-team`, `check-security`, `auth-supabase` | Supabase | **fable** |
| P6 | `check-codebase-cleanup`, `check-cleanup-scope-safety`, `db-supabase-migration` | Supabase | sonnet / fable |
| P7 | `general-dry-one-shot-architecture`, `bsuite-developer-portal`, `check-dry-one-shot` | Supabase, Context7 | opus |
| P8 | `biz-xero-integration`, `biz-xero-accounting` | Supabase, Context7 | sonnet |
| P9 | `test-playwright`, `bsuite-user-advocate`, `web-ui-ux-patterns` | Playwright, Supabase | sonnet |
| All | `agent-subagent-driven-dev`, `agent-master-orchestration`, `agent-definition-of-done`, `qig-agent-comms` | qig-memory | — |

---

## 6. Verification contract

1. **Live catalog, never migration files.** A `DROP` in a merged migration is not proof — that has been wrong three times here.
2. **Dry-run every migration inside a guaranteed rollback** (`DO` block ending in unconditional `RAISE`).
3. **Duplicate-stamp check before push:** `ls supabase/migrations | grep -oE '^[0-9]{14}' | sort | uniq -d`.
4. **Every migration ≥ `MIGRATION_FLOOR` 20260611000000**, with explicit `GRANT`s in the same file.
5. **A row appears from the UI** — the completion test for every persistence surface. Not "the code compiles."
6. **Two-account cross-tenant test** before P5 and P6 merge.
7. **Every guard is verified failing** with the defect reintroduced. A guard that cannot fail is not a guard.
8. **Exclude `.claude/worktrees`, `.superpowers`, `.vercel`, `dist`, `build`, `public`** from every repo-wide measurement — worktrees are full second copies and have produced a 290-vs-41 error here.

---

## 7. What this audit could NOT determine

Carried forward honestly — these are the places a confident claim above could still be wrong:

- **`pg_trigger` was not queried.** Some tables (`page_audit_log`, `people_training_day_pattern_periods`) are touched by trigger-shaped functions not confirmed attached.
- **Nested-select embeds are invisible to grep.** `.select('*, child(*)')` reads a table without naming it in a `.from()`. `funding_claim_items`, `vet_training_packages`, `host_contracts` are flagged **uncertain**, not dead, for this reason. **This is the single biggest risk to the P6 drop list.**
- **`pg_cron` jobs and external webhooks** (Stripe, Xero, TGA) write from outside all 6 repos. An "orphan" could be externally fed.
- **RLS policy presence per table was not audited** — out of scope; `bsuite-rls-authz-red-team` covers it in P5.
- **BSU Feature Builder** surfaced as a **seventh** builder subsystem, unaudited.
- **`ui_configurations`** — no writer located; flagged unresolved rather than asserted dead.
- **Row-count feasibility.** Largest tenant-scoped table is 425 rows. Virtualization and pagination are specified for a load that does not yet exist.

---

## 8. Red-team results

Run against this document before it was finalised. Verdicts are CONFIRMED / WEAKENED / REFUTED.

### 8.1 REFUTED — "P0.2 is a security hole"

**My own claim, wrong as first written.** `report_catalog_caller_may_access_field()` fails open on NULL `min_role`, but `v_pii_ok` enforces independently and the engine is `SECURITY INVOKER`, so RLS remains the primary control. Selecting a field you may not read returns nothing — it does not return another tenant's row. **Corrected in §2.** The forward-looking hazard for P2 (seeding hundreds more fail-open fields) is real and survives; the "leak today" framing did not.

### 8.2 CONFIRMED — the P6 drop candidates are safe, but the first measurement was wrong

Initial check reported **14 functions referencing `custom_fields`**, which would have refuted the drop. That number was **my own instrument falling into the exact defect this plan documents as P0.3**: `custom_fields` is also a JSONB *column* on 12 tables, and a bare `\mcustom_fields\M` regex matches both.

Disambiguated by requiring table-position syntax (`FROM|JOIN|INTO|UPDATE`):

| Target | Functions using it as a TABLE | Inbound FKs | Views | Verdict |
|---|---:|---:|---:|---|
| `custom_fields` | **1** (`add_tenant_field_definition` — the one P1 repoints) | 0 | 0 | safe after P1 |
| `workers` | **0** — the single hit is a *comment* inside `get_charge_rate_quote_signing_context` | 0 | 0 | contract-ready |
| `organization_members` | 2 | 0 | 0 | assess before drop |

**Lesson, recorded because it will recur:** a name-collision defect corrupts the very audit trying to remove it. Any measurement of `custom_fields` must specify table-vs-column position, or it reports a confident wrong number — in the *conservative* direction, which is how a safe drop gets blocked forever.

### 8.3 CONFIRMED (critical) — cross-tenant write via `bulk_data_undo`. **FIXED.**

The independent adversarial pass found, and proved live, a **P0 the plan did not identify**. The plan framed the only write-path gap as the missing sub-org tier (§P5). The real hole was a cross-tenant **write and delete**.

`bulk_data_undo()` is `SECURITY DEFINER`, granted to `authenticated`. It authorised against `_bulk_data_write_authority(v_cs.tenant_id)` — the change set's **own declared** tenant — then executed:

```sql
EXECUTE format('DELETE FROM %I.%I WHERE id = $1', v_cs.table_schema, v_cs.table_name)
EXECUTE format('UPDATE %I.%I SET %s WHERE id = $2', v_cs.table_schema, v_cs.table_name, ...)
```

Both took the table from the change-set row; neither scoped the `WHERE` by tenant; DEFINER bypasses RLS. `authenticated` holds INSERT on `data_change_sets`/`_items` and those insert policies constrain **only** `tenant_id`, leaving `table_schema`/`table_name`/`status` caller-controlled.

**Impact:** any tenant owner/admin could overwrite or delete arbitrary rows in every other tenant, and in platform reference data — silently, with the audit trail recording it as a legitimate undo.

**Why four documented rounds of adversarial review missed it:** every round asked **which columns** a caller may write. None asked **which rows**. `bulk_data_update` and `bulk_data_import` both carry the row-level tenant check — `bulk_data_update`'s own comment calls it *"the enforcement layer"* — and `undo` is the one that never got it.

**Fixed** in `20260807060000_fix_bulk_data_undo_cross_tenant_write.sql` (crm7 `4d1755a9`), applied and recorded. Verified live, both directions, inside guaranteed rollback: the exploit now returns `skipped` with the victim row byte-identical, **and** a legitimate same-tenant undo still returns `restored`.

### 8.4 CONFIRMED — the plan's own sequencing was wrong

**P2 must not precede P3.** The catalog *is* the allowlist the DEFINER write engine trusts (`_bulk_data_resolve_entity` accepts any active catalogued entity). Every entity added in P2 becomes a new forge target. The plan labelled P2 "risk: low" while it in fact **widens** the write-engine's attack surface before P3 proves that engine works.

**Corrected order: P1 → P3 (prove write paths, with a cross-tenant test) → P2 (extend catalog) → …** P2 is gated behind a green two-account cross-tenant write test.

### 8.5 REFUTED — "plan time could exceed the 8s timeout and read as no data"

Hard caps verified in the function body: joins ≤6, fields ≤40, group-by/aggregates ≤10, filter depth ≤4, ≤20 conditions, page size ≤1000. Six joins is below Postgres's `geqo_threshold` of 12, so exhaustive planning stays cheap — **plan time alone will not hit 8s**, and a timeout surfaces as error `57014`, not an empty grid.

The **real** residual: the outer `SELECT count(*) OVER ()` forces full materialisation of the filtered, 6-way-joined set on *every page* (the window runs before `LIMIT`). At P4-seeded volume that can hit the timeout at **execution**. Replace with a separate capped/estimated count, and map `57014` to a legible "query too large — add a filter" message.

### 8.6 CONFIRMED — the plan's biggest omission: no RLS audit gates P2

The engine adds a tenant predicate **only** when `report_catalog_entity_tenant_scope` finds a column literally named `tenant_id`. Verified live, several P2 expansion targets have none: `anzsco_occupations`, `awards`, `gto_standards_clauses`, `r7_anon_apply_rate_limit`, `r7_candidate_pool_memberships`, `r7_privacy_notice_versions`.

For genuinely global references (`awards`, `anzsco_occupations`) that is correct. But for a **tenant-scoped child** table that scopes via a parent FK rather than its own column, the engine adds **no predicate** and isolation rests entirely on that one table's RLS policy — while §7 says RLS-per-table is "out of scope, covered in P5", i.e. *after* P2 exposes ~100 tables.

**Required change:** an RLS/isolation audit becomes a **precondition of cataloguing** each table in P2, and the catalog must record whether a table is genuinely global or FK-scoped so a lint can refuse to expose an FK-scoped table whose RLS is unproven.

### 8.7 What survived attack — trust this part

`report_run_catalog_query` and `report_catalog_build_filter` were attacked on identifier injection through entity/field/join/aggregate keys, aggregate-name and type escape, filter-node SQL smuggling, joins to uncatalogued tables, and recursion/condition-count abuse. **Every vector closed.** All identifiers catalog- or server-derived; all values bound parameters via a single `USING` array; all enums through fixed `CASE`s; joins require a live catalog row; tenant predicates `AND`-composed and unloosenable by the client. All 23 catalogued base tables verified `relrowsecurity = true` with a SELECT policy and a real `tenant_id` column.

The INVOKER read engine is genuinely the sound piece the plan claims. **The danger was entirely in the DEFINER write helpers.**

---

## 9. Delivery record — 2026-08-07 (supervisor lane)

§8.3 fixed the cross-tenant write P0 but left it **guarded once, not guarded forever**: the
catalogue side of the same programme shipped a permanent in-database precondition gate, while
the write side rested on a hand-run verification. This section records closing that, and the
three defects that closing it uncovered.

### 9.1 The guard — crm7#1453, `46_bulk_data_cross_tenant_write_isolation.sql`

16 pgTAP assertions covering all three DEFINER entry points, because the family is the unit:
`bulk_data_update` and `bulk_data_import` carried the row-level tenant check and `bulk_data_undo`
did not, and diffing them is what located the P0.

| # | path | gate exercised |
|---|---|---|
| B1–B4 | `bulk_data_undo` with a forged change set declaring the caller's own tenant | row/tenant gate (the P0 shape) |
| C1–C3 | `bulk_data_update` against a foreign row id | row/tenant gate |
| D1 | `bulk_data_import` into a tenant the caller does **not** hold | authority layer (42501) |
| D3–D4 | `bulk_data_import` into a tenant the caller **does** hold, smuggling a foreign row id | row/tenant gate |
| D2 | `_bulk_data_write_authority` executable by `authenticated`? | grant lockdown |
| E1–E2 | same caller, same field, same RPC, **own** tenant | positive control |

**The control that makes it a real test.** The engine runs a **field** gate *before* the **row**
gate. Measured, not reasoned: attacking `first_name` returns *"cannot undo: this tier cannot write
field(s)"* — the FIELD gate — so a suite written that way passes and **keeps passing with the
tenant gate deleted**. The attack therefore targets `trade` (floor-tier, non-PII), and **A3
asserts the field gate is OPEN**, so the suite fails loudly instead of going vacuous if that ever
changes.

It also seeds its **own** tenant-scoped catalog entity with `min_role='tenant_member'`, because
`report_catalog_fields.min_role` is nullable on `development` and `_bulk_data_role_meets_min`
fails **closed** on NULL — inheriting the platform entry would silently reinstate the field gate
as the refusal reason under a fresh CI replay.

**Negative control (the point):** disabling *only* the row gates fails 7 of 16, including B3 where
the victim row is **actually overwritten cross-tenant**. Every control still passes, so the
failures are specific to the tenant gates. 16/16 pass against the real engine.

### 9.2 The bulk-data engine was never rebuildable from source — crm7#1453

Found by suite 46's **first CI run**, not by review. `20260806280000_data_change_sets.sql` aborts
on every fresh replay at `relation "public.audit_events" does not exist`. psql autocommits per
statement, so it leaves **partial schema**: `data_change_sets` created, `data_change_set_items`
absent, and RLS + all five policies + all grants (everything after line 116) never run. The
`bulk_data_*` RPCs still CREATE cleanly — plpgsql bodies aren't resolved at definition time — and
fail only at runtime.

`audit_events` is created by a **pre-baseline** migration (stamped applied, never replays) and is
**absent from the 2026-05-13 baseline dump**, so nothing in the tree could create it. Repaired by
forward hotfix `20260807110000` — verified a byte-identical no-op on production (5 policies before
and after, 0 diff rows) and verified to fix the replay: C10 now `Files=73, Tests=948, Result: PASS`.

**Every prior green C10 run was green over a schema where this engine was half-missing.** The suite
failing on its first run was the gate working.

### 9.3 33 tables live but unrebuildable — reported, not fixed

The same sweep found **33** tables that exist in production but are created by neither the baseline
nor any post-baseline migration. 30 of 33 have zero rows; only 5 are referenced from `src/`. So it
is **latent**, not an outage — but any rebuilt environment lacks them. Clusters: `xero_*`, `r7_*`,
`r80_*`, `pages`/`page_*`, `invoice_run*`.

Durable fix is to **regenerate the baseline from live**, which retires the whole class, rather than
33 per-table repairs. Deliberately **not** bundled into a test PR.

*(A first pass reported 66; that was wrong — locale-dependent `comm` sorting plus a regex that
missed pg_dump's quoted identifiers. Corrected to 33 and the method validated against a known true
positive before reporting.)*

### 9.4 Two CI gates that were not gating — crm7#1454, #1455, #1457

- **Version collision.** Two lanes stamped `20260807100000` minutes apart. `schema_migrations` is
  keyed on version and the applier **skips** a file whose version is recorded, so the second sorts
  last and is *never applied — silently, with the run reporting success*. Renumbered (#1454), and
  the check is now **enforced in CI** (#1455) rather than recommended.
- **db-lint was skipping all four migration guardrails on PRs** (#1457). `actions/checkout` fetches
  full history, then the step re-fetched the base with `--depth=1`, destroying the merge base;
  `git diff BASE...HEAD` exits 128 and `set -euo pipefail` aborts, skipping every lint below. The
  job goes red — which looks like the gate working — and since db-lint is **not a required check**
  the PR merges anyway. That is how the collision reached `development`.

**Still open, stated plainly:** DB Migration Lint remains a non-required check, so a genuine lint
failure can still be merged past. That is a repo-settings change, not a file change.

### 9.5 Correction to §8.3's framing

§8.3 says the fix was "verified live, both directions". True, and insufficient — a one-time
verification of a `SECURITY DEFINER` write path is exactly what §9.2 shows can rot invisibly. The
standard this programme should hold is the one the catalogue side already met: **a permanent
in-database guard, plus proof it fails when the thing it guards is removed.**

---

## 10. Delivery record — 2026-08-07 (data-platform lane)

All nine phases executed. Eleven migrations applied and verified against the **live catalogue**,
never against their own files. Every completion test that could be run has been run. What
follows records what shipped, and — more usefully — the defects that only surfaced because
something was actually executed.

### 10.1 What shipped

| Phase | Delivered | Proof |
|---|---|---|
| P1 | `add_tenant_field_definition` repointed at `tenant_field_definitions`; `min_role` backfilled + `NOT NULL` + `CHECK` + fail-**closed**; `custom_fields` table renamed | **Completion test as written**: added a field through the inline widget on live `crm.crm7.app` and watched it render. Row confirmed in the database with `created_by` = the signing user |
| P2 | Catalogue **23 → 84 entities**, 229 → 1,208 fields, 34 → 109 joins. 6.3% → 23% of 363 tables. The `r7_*` ATS line went 0% → catalogued | Engine returns real rows from newly-catalogued entities as a signed-in user with RLS on; `gto_compliance_standards` returns **17 of 34**, i.e. the tenant predicate is applied |
| P3 | pgTAP **suite 47** — the five persistence surfaces accept a row | **Executed**, 20/20, live *and* in CI's fresh-replay C10 |
| P4 | Demo Organisation seeded (3 hosts, 6 contacts, 4 apprentices, 6 people, 5 placements, 7 timesheets, ATS rows) | Leak check 0; a query aimed at a non-member tenant is refused `42501` at tenant **selection**, before any row |
| P5 | Sub-org gap documented **in** `_bulk_data_write_authority`'s own comment (D1: defer + document) | Reads as deliberate, with what the eventual change must ship with |
| P6 | `workers` retired | The holding lane's gate re-run **verbatim** → 0, and re-asserted **at apply time** |
| P7 | D3 ruled **hand-curated**; propose → draft → developer-approves path built | Draft is invisible to **both** the read and the write engine; approve is developer-only; double-approve refused |
| P8 | `xero_connection_health` view | Both live connections now report `never_synced` instead of looking connected |
| P9 | Tier surfaces analysed | See 10.3 — my headline finding here was **wrong**, and the retraction is the record |

### 10.2 The defects that only executing found

Each of these passed every static gate available.

- **`min(uuid)` does not exist in Postgres.** It sat in a branch taken by *every* live call, so the
  RPC would have failed 100% of the time — silent data loss traded for a total outage. It passed
  `CREATE FUNCTION`, typecheck, four migration linters, the pre-commit hook and a written spec
  review. **A plpgsql body is not semantically checked until it runs**, so applying a function
  migration proves only that it *parses*.
- **A regression I caused.** `min_role` has **two** interpreters. I updated the read gate and not
  the write gate, flipping bulk import/update from allow-all to deny-all. Caught by a test's
  *control* step, not its attack — without it I would have recorded "cross-tenant write refused"
  as a pass while nothing could be written at all. **A dead engine refuses attacks perfectly.**
- **A replay would have aborted.** `DROP IF EXISTS` on the old signature plus a bare `CREATE`
  fails `42723` on re-run. The file's own header had asserted it was replay-safe.
- **The e2e fixture had never existed**, for three independent reasons: below `MIGRATION_FLOOR`,
  an INSERT omitting a `NOT NULL` `field_key`, and a `dotenv` import that is not a dependency.
  None was ever observed because nothing had executed the chain — **a file that cannot run never
  gets its second bug found.**
- **The fixture seeder repointed the ordinary-user identity.** It wrote fixture A into the
  *unsuffixed* `CRM7_E2E_EMAIL`, read by `auth.setup.ts` and 16 specs, so every run aimed them at
  the cross-tenant *attacker*. A live probe then spent an hour mutating one account while
  authenticating as another. **A test that silently changes who it is testing is worse than one
  that fails** — it still looks convincing.
- **`replica` mode hollows a trigger assertion.** The pgTAP harness sets
  `session_replication_role = 'replica'`, which disables every ordinary trigger. Suite 47's
  catalogue assertion would have passed because the gate *never ran*. Fixed, plus a control
  proving the trigger is armed.

### 10.3 Corrections to this document and to me

- **§7's premise on P0.1 was too generous.** "562 fields exist via one path" implied the surviving
  path was proven. All 562 rows were written in *one second* by a migration with `created_by` NULL —
  **neither** add-field path had ever produced a user-created row.
- **§P7's figure was wrong.** It recorded "24 of 44 schema-builder entities (55%) can never be
  reported on". Live: 45 entities, 19 already reportable under the plural table name, 9 fixable
  immediately, 17 needing a semantic alias nobody has written down.
- **D4 could not be answered as written.** "The most restrictive value that keeps the field usable"
  did not exist: `is_gto_staff` reads `org_members`, which holds 3 rows. The obvious reading would
  have denied 3 of 6 live users every field *while reading like a security improvement*. A
  `tenant_member` floor tier was added.
- **I filed a P0 that was wrong, twice over.** "RBAC is inert — 330 of 331 routes developer-only."
  I had misread the code (`portal_role` is read **first**; I saw only the fallback branch) **and**
  my live proof moved two variables in one statement. Retracted in full. Confirmed afterwards by
  real sign-in: a single-membership user with a NULL tenant pin and no bypass role reaches the page.
  A lane's wrong finding costs a cycle; one filed as a blocker tells everyone else to stop looking.

### 10.4 Deliberately not done

- **The two tombstones** (`workers_legacy_unused`, `custom_fields_legacy_unused`) are renamed, not
  dropped. The rename already buys what the drop was for — a missed reader fails **loudly** at
  `42P01` instead of silently reading an empty table, which is the exact defect that left
  `worker_name` blank on 13 customer-facing quotes for a month. The drop is irreversible and needs
  a human.
- **The RBAC/`org_members` posture** — who may author reporting data — is a security-posture
  ruling, not an engineering fix. Evidence filed, nothing patched.

---

## 11. Baseline regeneration — assigned program item (2026-08-07) · **HELD AT DRAFT**

> **Status: crm7#1460 is DRAFT, not merged.** PI's gate is satisfied and the schema proof is
> complete (§11.3). It is held because regeneration has a consequence neither PI nor I anticipated
> — it silently drops every migration-seeded row (§11.7) — and closing that requires a per-table
> privacy ruling on which reference rows may be committed to git. The gate script
> (`crm7/scripts/replay-schema-diff.sh`) IS merged, so the finding is reproducible on demand and nothing
> is lost by waiting.

Assigned by PI to the supervisor lane after §9.2/§9.3, with the gate stated as: *a regenerated
baseline must be proven by a **full replay into an empty database** producing a schema that matches
live, **with the diff shown** — not "it applied cleanly".*

### 11.1 The instrument came first — `crm7 crm7/scripts/replay-schema-diff.sh`

Throwaway Docker Postgres 17, own port, removed on exit; never touches production or a local
Supabase. Applies the baseline, marks its versions, replays every post-baseline migration, then
diffs the result against live and **exits non-zero if any live table cannot be built from source**.

It classifies the diff by CAUSE — `NO-MIGRATION` / `SKIPPED-PRE-BASELINE` / `MIGRATION-FAILED` —
rather than reporting a flat number, because its substrate is minimal and 46 migrations fail on
`storage.objects` / `auth.sessions` / `cron` / `supabase_vault` that a real instance provides.
**Those failures are the instrument's, not the tree's**, and a flat number would blame the tree for
them. Only the first two categories fail the gate.

### 11.2 What it measured — and the count it corrected

| | tables |
|---|---|
| built by a full replay | 338 |
| live | 363 |
| **live but unbuildable from source** | **27** |

26 had no migration at all. The 27th, `rcti_invoices`, is a **second instance of the `audit_events`
shape**: its migration `20260306000004` is in `applied-versions` so the replay skips it, and the
baseline contained zero occurrences of the table — so nothing in the tree could create it.

**This superseded two earlier figures of my own: 66 → 33 → 27.** The 33 over-counted by six
(`custom_fields_legacy_unused` and five `xero_*` *are* created by migrations; the regex missed
their `CREATE` form). Each revision came from a better instrument and this one is empirical rather
than textual — which is the argument for replaying over grepping, made against my own numbers.

### 11.3 The regeneration, and the gate satisfied

`pg_dump --schema-only --schema=public` of live, installed as
`baseline/20260807_prod_baseline_schema_dump.sql` with `applied-versions-20260807.txt` (583
versions). **Zero migration file versions are absent from live `schema_migrations`**, so nothing
replays on top — the baseline alone must reproduce live, which is a stronger and simpler property
than the layered model it replaces.

| after regeneration | |
|---|---|
| replay tables / live tables | 363 / 363 |
| live but unbuildable | **0** |
| built but not live | **0** |
| full object inventory (tables, views, functions, triggers, policies, indexes, enums) | **3,397 on both sides, diff empty in BOTH directions** |
| function bodies (md5 of `pg_get_functiondef`) | 259 / 259, **0 differing** |
| RLS | 363 enabled / 1 forced — matching live exactly, 0 tables without RLS |
| baseline errors under the CI's own `ON_ERROR_STOP=1` | **0** |

Not a count that matched — the **sets** matched.

### 11.4 Three defects found by running it rather than reading it

1. **`\restrict` tokens.** `pg_dump` 17.9 emits `\restrict`/`\unrestrict`, which older `psql`
   clients reject. Stripped.
2. **A bare `CREATE SCHEMA "public"`.** Errors *already exists* on a provisioned database. CI
   applies the baseline under `ON_ERROR_STOP=1`, so that **one line would have aborted the entire
   apply**. The old Supabase-CLI dump used `IF NOT EXISTS`, which is exactly why it had never
   surfaced. Made idempotent.
3. **`ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"` ×12.** On Supabase the connection user is
   `postgres`, which is **not** superuser and cannot alter another role's defaults — `permission
   denied to change default privileges`, aborting the apply at line 63409 of 63457. `supabase db
   dump` silently **filters these**; bare `pg_dump` does not. That undocumented difference is the
   whole reason the old baseline never hit it. Removed; the 10 `FOR ROLE postgres` remain, and
   nothing is lost because default privileges govern *future* objects and every provisioned
   instance already carries `supabase_admin`'s own.

### 11.5 The fourth instrument failure this week — and it found its own first defect

Both workflows applied the baseline as `psql -v ON_ERROR_STOP=1 -f baseline.sql 2>&1 | tail -20`.
**A pipeline returns `tail`'s status, not `psql`'s.** So `ON_ERROR_STOP=1` aborts the apply and the
step passes anyway, leaving a partial schema that every pgTAP suite then runs against.

Fixed with `set -o pipefail` in the same PR — and **that fix surfaced defect 3 above within the
hour**. Without it, the drift job would have compared against a baseline that aborted at line
63409 of 63457: almost complete, and silently wrong.

The family now has both signs: **a red job can mean zero checks ran** (§9.4), and **a green step
can mean nothing applied**. In both, the colour reports on the wrong process.

### 11.6 What this retires, and what it does not

**Retires:** the `audit_events` / `rcti_invoices` class — a pre-baseline migration stamped applied,
never replayed, and absent from the dump, so nothing could build the table. Both are now *in* the
baseline. Also `workers` and `stp_allowance_types`, which the tree previously **built even though
they are dropped live** — a rebuilt environment was resurrecting a table the estate deliberately
retired.

**Does not retire:** their `CREATE` statements in old migrations are now dead source. Stripping
them is a follow-up, not done here. And per PI's structural finding, **none of this is prevention**
— required checks are unavailable on this repo's plan, so `replay-schema-diff.sh` is a detector a
human must read.

### 11.7 Why it is held — a schema-only baseline drops every seeded row

Regenerating records **all 583 versions as applied**, so no migration replays — and the rows those
migrations *seed* vanish with them. The schema is perfect and the database has no reference data.

PI's own drift guard caught it, and was right to:

```
##[error] measured 0 active report_catalog_entities rows — refusing to report success on nothing
```

Fixed for the catalogue by appending a data-only dump of `report_catalog_entities` +
`report_catalog_fields`, **after verifying** they are product configuration and not customer data:
84 entities / 1,208 fields, all `tenant_id` NULL, `created_by` NULL on every row, every column
schema metadata. The drift check then passed.

But **~20 pgTAP suites depend on other migration-seeded data** — `04_timesheets_rls`,
`07_gto_standards_rls`, `10_seed_codehouse_parity_templates` (30/30), the seven `report_*_rpc`
suites, `25_storage_bucket_policy_coverage`, and more. Covering them means deciding, per table,
whether its rows belong in a repo file.

**That is a privacy decision, not a dump flag**, and the heuristic reach for it is dangerous: my
first pass scored a table "safe to dump" if it had no tenant-scoped rows, and `public.profiles`
passed — it has no `tenant_id` column at all and holds 15 real users' emails and platform roles.
Committing that to git would have been irreversible. Escalated to PI with the measured candidate
set and the explicit exclusions.

**The alternative, tested and rejected:** keeping the old applied-versions list so migrations still
replay does restore the seeds — but yields 365 tables, **resurrecting `workers` and
`stp_allowance_types`**, and replays 300+ migrations against a schema that already holds their
effects (51 tolerated errors). It trades a clean model for a noisy one and reintroduces the
resurrection defect regeneration was meant to remove.

**Split out and merged separately:** the `set -o pipefail` fix (crm7#1462), which is correct on its
own and is what surfaced the `permission denied` defect in §11.4.
