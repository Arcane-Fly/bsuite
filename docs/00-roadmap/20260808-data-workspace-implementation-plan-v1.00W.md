# BSuite Data Workspace — Implementation Plan v1.00W

**Date:** 2026-08-08 · **Status:** W (Working) · **Rounds 1 and 2 red-teamed, external research applied**
**Supersedes for this topic:** `docs/plans/https-crm-crm7-app-reports-custom-create-distributed-origami.md`

---

## How to read this document

**If you read only two things: §2d and §4.**

§0 is what is actually true today, measured. §1 is the one decision that changed after
review, and why. §2 / §2b / §2c are what four adversarial reviewers and an external research
pass found in the first draft. **§2d is Round 2 — what my own *revision* got wrong, which is
the most useful section here.** §3 is the revised work, re-ordered because of it. §4 is what
needs **you**, each as decision / why / what informed it. §5 is what was ruled out, so nobody
re-opens it. §6 is the rule that stops this shipping as another shell. §7 is the backlog.

**Two rounds of red-teaming, five adversaries, plus external research against primary
sources.** Every finding was re-verified by me against the live database or the actual source
before it was written down — several reviewer claims were downgraded, and two of my own
findings were retracted when the evidence went the other way. Where something is inferred
rather than verified, it says so.

---

## §0 — Situation report (measured live 2026-08-08, not inferred)

### The ask, in your words

> *"give me this [NocoDB] — all data connected of all suite apps. developer read all edit
> all all tenants. then scoped per or permissions thereafter. developer, superadmin, org
> admin decide who can read and edit what to the max limit of their own scope limit."*

### What already exists — considerably more than the first draft of this plan assumed

The first draft proposed building a new `/data` page. Then a reviewer went looking, and
found the pages already there. This is the correction that matters most in this document,
so it goes first:

| Surface | What it is | Status |
|---|---|---|
| `/settings/data` | "Data Import & Bulk Update" — upload → map columns → dry-run preview → commit, plus pick-rows/pick-fields bulk update, with undo | **Built, live, nav-registered** |
| `/admin/data` | "Enterprise Data Console" — entity browser, run-a-query, change history scoped to your tenant *plus its descendants* | **Built, live, nav-registered** |
| `/reports/custom/create` | The report builder — field picker over 1,208 fields, joins, GROUP BY, aggregates | **Built, live** |
| `report_run_catalog_query()` | The read engine. SECURITY INVOKER, real joins, GROUP BY, aggregates | **Built** |
| `bulk_data_update` / `_import` / `_undo` | The write engine. Dry-run → commit → undo, per-row authority checks, PII/min-role field gates | **Built, pgTAP-guarded** |
| `@bsuite/data-grid` v0.1.0 | Virtualised grid: range select, TSV clipboard paste, fill handle, undo/redo, typed editors | **Built** |
| Catalogue | 84 entities · 1,208 fields · 124 joins, every field carrying `is_filterable / is_sortable / is_groupable / is_aggregatable / is_pii / min_role` | **Populated** |

And critically — **`/admin/data`'s own file header already documents your tier rule**,
written by another lane before I started:

> *developer → platform-wide, home surface is BSU `/developer/*`; enterprise / super admin
> → own tenant + descendants, home surface is THIS page; org admin → own tenant only, home
> surface is `/settings/data`; user → own records, `/reports`.*

That is your vocabulary, already recorded, already mapped to four surfaces.

### What is actually missing — the numbers that matter

| Measure | Value |
|---|---|
| `data_change_sets` (every bulk edit ever made) | **0** |
| Saved report-builder views (`report_configs`, `builder_view`) | **0** |
| Non-platform report templates | **0** |
| Tenants with a parent (sub-orgs) | **0** of 7 |
| `tenant_settings` rows | **1** of 7 tenants |
| Grid columns shipped with `editable: true`, anywhere in six apps | **0** |

**The diagnosis: the plumbing exists and has never carried water.** Not one bulk edit has
ever been committed. Not one view has ever been saved. The grid that supports inline
editing has exactly one consumer, and that consumer hard-codes every column read-only.

This reframes the whole job. The gap is not "build an engine". It is **the last mile
between a working engine and a person actually using it** — plus the permission product,
which genuinely does not exist.

### The admin tiers — where the vocabulary and the code disagree

Your definition, now recorded permanently:

| Your term | Scope |
| **developer** (= platform admin) | The whole platform, every tenant |
| **super admin** | **One ENTERPRISE, including all its sub-orgs** |
| **org admin** | **ONE org** — a sub-org, or a standalone org with no parent |

Measured against that, three real defects — but **not** the three the first draft claimed:

1. **`is_enterprise_admin()` does not cascade.** Confirmed by reading the live function
   body: it never calls `get_descendant_tenant_ids()`. It answers "am I admin of this one
   root tenant". **The cascade is the tier**, so the tier is not built. `/admin/data`
   works around this by calling the descendant function directly in the page — so the UI
   cascades while the authorisation function does not. That split is the actual bug.
2. **FOUR functions grant platform scope, with THREE different predicates.**
   `is_platform_admin()`, `is_platform_super_admin()` and `platform_is_developer_or_admin()`
   (a byte-identical duplicate) all mean *developer or platform_admin or is_super_admin*.
   But **`is_platform_developer()` means `platform_role='developer'` only — it ignores
   `is_super_admin`.** 53 policies call the first; 17 call the last, and the last also gates
   the PII check and catalogue writes. They agree today only because both developer accounts
   happen to hold both attributes.
   *(An earlier draft of this section claimed the hazard was two different key columns.
   That was wrong — `profiles.user_id` is `GENERATED ALWAYS AS (id) STORED` and cannot
   diverge. The predicate split is the real defect. See §2d, F-01.)*
3. **`profiles.is_super_admin` still means the opposite of your word** — it grants full
   platform scope. 2 accounts hold it. Anyone applying your vocabulary to that column
   hands an enterprise admin the entire platform.

**Correction to the first draft, stated plainly:** it proposed *creating* a function
called `is_platform_developer()`. That name is already taken, by a function that already
has exactly the semantics wanted. The first draft would have collided with working code.

---

## §1 — The ruling that changed: no new `/data` route

**Decision:** Build the workspace **into `/settings/data` and `/admin/data`**, the two
surfaces that already exist and are already mapped to your tiers. Do **not** create a
`/data` route.

**Why:** crm7 already has six destinations with "data" in the name — `/reports`,
`/reports/custom/create`, `/settings/data`, `/settings/data-management` (which is actually
GDPR deletion), `/settings/data-sharing` (which is actually third-party consent), and
`/admin/data`. Three of those differ only by suffix and mean completely unrelated things.
A seventh called `/data` does not clarify that; it makes it worse, and it would ship a
second bulk-edit page next to the one nobody has used yet.

**What informed it:** the scope reviewer found `/settings/data` already wired to the same
RPCs my T3 proposed to wire; the UX reviewer independently found the six-name collision;
and `/admin/data`'s header already assigns those two pages to org admin and super admin
respectively. Three separate lines of evidence, same conclusion. Against it: a fresh route
would have been cleaner to build. That is a builder's convenience, not your requirement.

---

## §2 — Round 1 red-team findings

Four adversaries: security (fable tier), reliability, UX-against-the-non-coder bar, and
scope realism. **Every finding below I re-verified myself against the live database or the
actual source** — a reviewer's claim is a lead, not a fact. Severity is mine, after
verification, and in three places I downgraded what a reviewer called critical.

Security (fable) had not returned when this revision was written; its findings append as
§2b and feed Round 2.

### Confirmed — and these are live defects, not plan defects

| ID | Sev | Finding | Evidence I verified |
|---|---|---|---|
| **R1-01** | **High** | **The audit trail can be forged and tampered with by a tenant's own owner/admin.** The INSERT policy on `data_change_sets` constrains only `tenant_id` — not `table_name`, not `entity_key`, not `status`, not `old_data`. An owner/admin can insert a change set claiming `status='committed'` over any table, with any "previous value". The UPDATE policy additionally lets them rewrite `undone_at`/`undone_by`. | Read the live policy expressions from `pg_policy`. Cross-tenant is correctly blocked (that was the earlier P0 fix); this is within-tenant. |
| **R1-02** | **High** | **Undo can be pointed at the wrong change set.** After a commit, the client finds "the change set I just made" with `ORDER BY created_at DESC LIMIT 1` filtered on entity + tenant + operation, with **no filter on who created it**. Two admins editing the same entity concurrently is enough to misfire; combined with R1-01 it is steerable. | `bulkDataService.ts` `getLatestChangeSet`. The RPC never returns the change-set id, so the client has to guess. |
| **R1-03** | **High** | **A partly-failed paste looks like a total failure.** Batches of 200 run sequentially with no per-batch error handling. If batch 3 dies, batches 1–2 are already committed, 4–7 never run, the promise rejects so the caller never learns the ids of what *did* commit — and the grid reverts every cell, including the 400 genuinely saved. The user's natural next move is to paste again. | `bulkDataService.ts` commit loop; `DataGrid.tsx` revert path. `authenticated` has `statement_timeout=8s` — verified live — and a timeout raises `57014`, which PL/pgSQL's `WHEN OTHERS` cannot trap. |
| **R1-04** | **Medium** | **Fixing a typo fast can resurrect a rejected value.** The grid's optimistic overlay is keyed by row *position*. If edit A is rejected after edit B has replaced it in the same cell, A's cleanup blindly deletes B's entry. The undo stack can then replay a value that was rejected and never real. | `DataGrid.tsx` overlay key + failure handler. Also breaks if the table re-sorts mid-edit. |
| **R1-05** | ~~Medium~~ **RETRACTED — my error** | I wrote that `is_platform_admin()` reads a *different, nullable* column and that nothing keeps them in step. **Wrong.** `profiles.user_id` is `GENERATED ALWAYS AS (id) STORED` — the columns cannot diverge. The security reviewer caught this. The real defect is the **predicate**, not the column — see S-02. | `pg_attribute.attgenerated = 's'`, verified live. |
| **R1-06** | **Medium** | **A broad query times out as an unreadable error.** The read engine wraps every query in `count(*) OVER ()`, which forces the full result set to be computed before the 1,000-row page can be returned. `training_providers` is already 8,119 rows. Nothing special-cases `57014`. | Executor SQL; live row counts. |
| **R1-07** | **Medium** | **A permission denial and an empty table look identical.** 68 catalogued-candidate tables have no `tenant_id` column, so the engine adds no tenant predicate and isolation rests entirely on that table's own RLS. If RLS denies, you get zero rows and no error — indistinguishable from "there is nothing here". | The estate's own precondition migration documents this as an open gap. |

### Confirmed — plan defects

| ID | Sev | Finding | Resolution |
|---|---|---|---|
| **R1-08** | **Critical** | **The headline acceptance test could be passed today with zero code.** "Operator edits a cell and `data_change_sets > 0`" is satisfiable by opening `/settings/data`, which already exists and already works, and changing one field. A test that a shipped-and-unused feature already passes measures nothing. | Rewritten — see §6. |
| **R1-09** | **Critical** | **The anti-shell contract did not bind three of its own tasks.** §4 of the draft said every task's acceptance is a change made from the deployed UI. T1, T2 and T4's actual written criteria were pgTAP tests — no browser, no login. The single mechanism against repeating the failure pattern exempted the three tasks most likely to hide behind green tests. | Fixed — §6 now binds every task, or says explicitly why not. |
| **R1-10** | **Critical** | **The first draft proposed creating `is_platform_developer()`, which already exists.** | T1 rebased onto the existing functions. |
| **R1-11** | **High** | **T2.3's `workspace_views` duplicates a working, already-dead table.** Saved views already exist via `report_configs` with `report_type='builder_view'` — full save/list/delete/import/export, RLS'd, live. It has 0 rows because nobody uses the builder, not because it is missing. Adding a second table would create **two** dead saved-view tables, reproducing inside this plan the exact pattern §0 diagnoses. | Extend `report_configs`; no new table. |
| **R1-12** | **High** | **Effort was inverted.** T2 (the write engine) is largely built and has been through four documented adversarial reviews. T3 (making the grid actually editable) has never been done anywhere in six apps and got one paragraph. | Re-baselined — T3 is the dominant item. |
| **R1-13** | **High** | **84 entities is a wall, and search was deferred.** Only 23 of 84 entities have any description. Six entities have "Assessment" in the name with blank descriptions on all six. One is labelled "Documents (legacy)" next to another labelled "Documents". Domain headings are developer words — "crm", "reference", "operations". | Findability moves into the first slice. |
| **R1-14** | **High** | **Errors are raw Postgres.** The write engine returns `"write failed: "` concatenated with `SQLERRM`. A not-null violation reaches a user as `null value in column "x" violates not-null constraint`. | Error-mapping layer, with its own test. |
| **R1-15** | **Critical** | **Client-side formula columns are a trap.** Page-scoped formulas would sit in the same footer row as server-computed sums, look identical, and be silently wrong past 1,000 rows — with no way for the client to know how wrong. | Cut from v1. |
| **R1-16** | **Medium** | **A new feature flag would be unflippable for 6 of 7 tenants** — flag overrides live in `tenant_settings`, and only 1 tenant has a row. | No new flag, or ship the row with it. |

### Downgraded after verification

- The reviewer called `get_descendant_tenant_ids()`'s missing cycle-detection critical. It
  uses `UNION ALL` with no depth cap, but `trg_tenants_hierarchy_check` prevents cycles
  being created. **Real, but hardening** — it becomes load-bearing under T1, so it gets a
  `UNION` and a depth cap there.
- A reviewer flagged `anon` holding write grants on the audit tables. True, but it is the
  Supabase default across all 351 tables, and every policy on those tables is scoped to
  `authenticated`, so `anon` is denied. **Not a finding.** Reported here because it looks
  alarming in a grant listing and someone will re-raise it.

### The finding that is not a software defect

**R1-17 — `placements` and `timesheets` cannot be restricted to a site, because neither
table records one.** The UX reviewer found no catalogued join to `sites`; I checked the
schema underneath and there is no `site_id` column on either table either. `sites` links
only to `employers`. So "give this person access to only Sarah's site" is not expressible
for the two entities where a GTO would most want it — the closest possible is "all of that
employer's sites".

This is a data-model question, not a bug, and it is **yours**, not mine — see §4, OP-3.

---

## §2b — Security review (fable tier)

The security reviewer read the query executor in full and then verified every claim against
production with read-only queries. **I then re-verified each critical myself.** Its
headline: *the engine is genuinely well-built — identifiers only ever come from catalogue
rows, values bind through one parameter, and there is no SQL injection.* The holes are in
what the planned extensions would bypass.

It also caught an error of mine (R1-05 above). That is what the round was for.

### Live security posture — true right now, independent of this plan

These are not plan defects. They exist in production today and want fixing regardless of
whether the data workspace is ever built.

| ID | Sev | Finding | Verified |
|---|---|---|---|
| **S-01** | **Critical** | **Any signed-in user can promote themselves to platform developer if one trigger is off.** `authenticated` (and `anon`) hold column-level `UPDATE` on `profiles.platform_role` **and** `profiles.is_super_admin`. The only UPDATE policy is `auth.uid() = id` with **no column restriction**. The sole thing preventing `UPDATE profiles SET platform_role='developer', is_super_admin=true WHERE id=auth.uid()` is the trigger `trg_guard_profiles_privileged_columns` — which sits at `tgenabled='O'`, so it does **not** fire under `session_replication_role='replica'`. This estate has already been bitten by exactly that. | Column privileges, the policy, and `tgenabled` all read live. |
| **S-02** | **High** | **Four functions grant platform scope, with three different predicates.** `is_platform_admin()`, `is_platform_super_admin()` and `platform_is_developer_or_admin()` (a byte-identical duplicate) all mean *developer or platform_admin or is_super_admin*. But `is_platform_developer()` means `platform_role='developer'` **only — it ignores `is_super_admin`.** Invisible today because both developer accounts hold both. 53 policies call one; 17 call the other. The one that ignores `is_super_admin` gates the catalogue write path. | All four bodies read live. |
| **S-03** | **High** | **The PII gate is writable by the roles it restricts.** `report_catalog_fields` has **no unique index** on `(entity_id, column_name)` — its sibling `report_catalog_entities` has exactly that pair of partial uniques. Its insert policy admits `is_gto_staff` (which includes `field_officer`). The resolver picks the tenant row over the platform row. So a staff-level user can insert a duplicate field row with `is_pii=false, min_role='tenant_member'`, and it wins — unmasking all 39 PII-flagged fields. | Indexes, policy and resolver order all read live. Not exploitable by any account that exists today; becomes live the moment T4's Field Security panel or T7's role expansion ships. |
| **S-04** | **High** | **Detach-to-promote.** The `tenants` UPDATE policy's `WITH CHECK` pins only `id` — not `parent_tenant_id`, `tier`, `tenant_type` or `status`. And the hierarchy trigger's `WHEN` clause is `new.parent_tenant_id IS NOT NULL`, so setting it to NULL **does not fire the guard at all**. An owner/admin of a sub-org can detach it, becoming a root tenant. Harmless today. **T1 is precisely what would turn it into an escalation path**, because T1 makes "root tenant + gto_admin" mean *enterprise super admin*. | Policy and `pg_get_triggerdef` read live. |
| **S-05** | **High** | **Two of three subtree walkers can spin.** `get_descendant_tenant_ids()` and `descendants_of()` are `UNION ALL` with no depth cap and no cycle guard, and both are executable by `authenticated`. A third, **`tenant_subtree_ids()`, already exists and is correct** — `UNION` plus `depth < 10`, with a comment saying *"an unguarded recursive CTE on a cyclic graph does not error, it spins."* The cycle guard trigger is also `tgenabled='O'` and does an unlocked read, so two concurrent re-parents can race a cycle in. | All three bodies read live. |
| **S-06** | **Medium** | **Constraint errors are a cross-tenant existence oracle.** Per-row failures return `"write failed: "` concatenated with the raw `SQLERRM`. Unique constraints ignore RLS. Several catalogued entities have non-tenant-scoped unique indexes, including `people_training_contract_number_uq` — the primary regulatory identifier for an apprentice. A dry-run import lets someone test whether *any* tenant holds a given training contract number. | Index list joined to catalogued entities, read live. |

**S-01 and S-05 are cheap to close and should not wait for this plan.** S-01 is a `REVOKE`
plus marking the trigger `ENABLE ALWAYS`. S-05 is calling the walker that already exists.

### Plan defects the security review found

| ID | Sev | Finding | Resolution |
|---|---|---|---|
| **S-07** | **Critical** | **The most likely route to a cross-tenant leak is T4 itself.** A grant that only ever *narrows* is a UI convenience. The moment a real grant must let someone see rows RLS currently denies, the implementer faces "add a grants-aware policy to 363 tables" or "make the read path SECURITY DEFINER". They will pick the second — it looks contained, and the tenant predicates already exist in the generated SQL. But those predicates are today a *second* layer on top of RLS; under DEFINER they silently become the *only* layer, and every branch that legitimately omits them (global reference tables, nullable-tenant rows, join predicates in ON clauses) becomes a full cross-tenant read. §5 already rejects this — but nothing in T4 stopped an implementer re-litigating it by accident. | T4 now states the engine stays INVOKER permanently, with a CI assertion on `prosecdef`, shown failing with the function flipped. |
| **S-08** | **Critical** | **Grants must intersect with the PII gate, never union.** The natural wiring `has_grant(f) OR caller_may_access_field(f)` makes any grant a PII bypass, because `is_pii` is a *deny*, not an absent *allow*. | Wired as `AND` at all five admission points, with a test that grants "all fields" and asserts the 39 PII fields stay denied. |
| **S-09** | **Critical** | **NULL-as-wildcard makes the superset check pass vacuously.** "All fields" encoded as NULL means the *"for each requested field, assert the grantor has it"* loop runs zero times and returns success. This estate already has the recorded lesson that null is not the absence of a flag, and already shipped a `min_role IS NULL → true` fail-open in this same subsystem. | Wildcards banned. "All" is materialised as an enumerated snapshot of what the grantor actually held at creation. |
| **S-10** | **Critical** | **Two legal grants compose into an illegal one.** Grant A gives `{name}` on Sales; Grant B gives `{salary}` on Engineering. A union evaluator yields name **and** salary across **both** — the exact cross-product each grant withheld. | Effective access is a set of (fields, filter) pairs, never flattened. One query is authorised by exactly one grant. |
| **S-11** | **Critical** | **The write RPC must not take entity/tenant per row.** If `p_rows` elements carry their own `entity_key`/`tenant_id`, 999 legitimate rows plus one pointing at a victim re-creates the cross-tenant write this estate already proved and fixed on 2026-08-07. | Signature is one entity, one tenant, resolved once; rows carry only `{id, fields}`, and a row object containing `entity_key`/`table_name`/`tenant_id` is a hard error, not a silent strip. |
| **S-12** | **High** | **Superset is checked at creation and never at use.** If the grantor is demoted or offboarded, the grant survives. | Revoke-on-capability-loss triggers, plus grants going inert if the grantor has not been re-verified. |
| **S-13** | **High** | **The write path's tenant check is a TOCTOU.** The function is SECURITY DEFINER, so RLS is off for both statements; rows are prefetched without `FOR UPDATE`, tenant is compared in memory, then `UPDATE ... WHERE id = $2` runs with **no tenant predicate**. The in-memory comparison is the only enforcement. | Add `AND tenant_id = $3` to the WHERE. The reviewer calls this *"the single highest-value one-line change in the review"*, and it is verified by removing it and watching the test go red. |
| **S-14** | **High** | **Mass assignment.** The write engine's blocklist is four columns (`id/tenant_id/created_at/updated_at`) and does not cover authority columns. If `org_members.gto_role` or `user_tenants.role` is ever catalogued, bulk update becomes a privilege-granting primitive — and if `data_access_grants` is catalogued, a grant-forgery one. | A hard table denylist in entity resolution, plus writability becoming opt-in per field rather than "anything catalogued". |
| **S-15** | **High** | **JSONB custom fields reopen the blind oracle.** `is_pii`/`min_role` are per *column*; a JSONB blob is one column holding many logical fields. Once filterable, `custom_fields->>'tfn' LIKE '1%'` compiles, passes the column-level check, and the returned row count leaks the value of a field nobody may read. | Feeds OP-4: a JSONB key must be a first-class catalogue row with its own gates, never a client-supplied path. |
| **S-16** | **Medium** | **"Same evaluator for UI and server" is the risk, not the reassurance.** The UI needs a bulk cacheable answer; the server needs a per-request uncacheable one. Sharing a name leads to the UI passing its decision to the server, or a cache that makes revocation stop working. Note the precedent already exists: the write RPC takes a client-supplied field list. | Split into an explicitly advisory UI summary and a server-only authoriser the client cannot call. T4's acceptance now includes: revoke mid-session, don't refresh, paste into the greyed column, assert 403 **and** assert the row is unchanged. |

### What the security review says to cut — and why cutting improves security

- **The whole delegation chain.** `parent_grant_id`, cascading revoke, delegates
  re-granting. It is the sole source of two escalation paths (a grantee re-grants to a role
  they hold, escaping the revoke cascade; and a delegated grant with two possible parents
  cannot express which one justifies it). Your ask names three **tiers** deciding, not
  grantees re-delegating. **Only a tier-holder may create a grant.** This matches the
  independent scope-reviewer conclusion that delegation is built for a hierarchy depth that
  has zero rows.
- **The full filter AST as a grant restriction.** Every real case is one equality on one
  dimension. A recursive AST buys expressiveness nobody asked for and costs two defects: it
  compiles under the grantee's identity, so the *tightest* grants are the ones that fail to
  compile; and it shares a 20-condition budget with the client's own filter, so a client
  can starve the security predicate. Ship one field, one value, strict equality.

---

## §2c — External research round

The structural calls above were checked against how mature systems actually behave, using
primary sources (the Zanzibar paper, AWS IAM evaluation-logic docs, PostgreSQL's own RLS
and GRANT documentation, the Macaroons paper, BigQuery/Snowflake masking docs, and each
Airtable clone's raw LICENSE file) rather than recollection.

| Our call | Verdict | Basis |
|---|---|---|
| One grant authorises one query; never flatten | **Confirmed, and it is a known pattern** — the shape of AWS assumed roles | Every system checked unions along one axis or over whole atomic policies; none recombines two independent axes |
| Read engine stays SECURITY INVOKER; grants only narrow | **Confirmed** | This is the exact bug PostgreSQL 15 shipped `security_invoker` views to fix, and matches attenuation-only delegation in the Macaroons paper |
| Ban NULL wildcards; enumerate a snapshot | **Correct but incomplete** | Safe as the catalogue grows; **fails open when the grantor's own access shrinks**. Needs re-intersection on grantor change |
| Licence conclusions | **All seven confirmed** | Raw LICENSE files re-fetched independently |
| PII flags vs filter/group/aggregate | **A gap we had not addressed** | No mainstream system fully closes the blind-oracle channel; the only complete answer is to deny the operation class |

The honest caveat from that work: the snapshot-revalidation recommendation is assembled by
analogy from the capability-revocation literature rather than copied from one system that
does exactly this. It is the weakest-sourced item in this plan and is labelled as such.

---

## §2d — Round 2: what the revision got wrong

Round 2 ran at fable tier against the *revised* plan, with one instruction: work out whether
the fixes actually close anything or merely say they do. It found **five closures that were
sentences with no mechanism**, and one genuine contradiction of the operator's core ask.
I re-verified each against the live database. This section is the most important in the
document, because these are my errors, not inherited ones.

### The one that changes the architecture

**F-03 · Critical · "developer reads everything" does not work today, and the obvious fix is
dangerous.** The read engine's very first check refuses any tenant the caller is not a member
of — `RAISE ... 42501, 'Selected tenant is not available to the current user'`. There is no
platform-developer branch. **Verified: the developer accounts are members of 3 of 7 tenants.**
So your literal sentence — *developer read all, edit all, all tenants* — fails on 4 of 7
right now.

The trap is the obvious fix. Adding `user_tenants` rows for the developers in all 7 tenants
would make the engine work — and would also grant them membership in **every RLS policy in
the shared database**, across conduit, throughput, braden, BSU and R80.4, not just this
workspace. That is a far larger change than the one being made, and it would be invisible.

**The right mechanism already exists and has never been used:** `platform_admin_acting_as`
— gated on `is_platform_super_admin()`, and `auth_tenant_id()` already treats acting-as as
*replacing* scope rather than adding to it. **Verified: 0 rows.** Cross-tenant developer
access is act-as, one tenant at a time, with an audit row — not blanket membership.

### The closures that were only sentences

| ID | Sev | What I claimed vs what is true |
|---|---|---|
| **F-01** | **Critical** | I wrote "assert every predicate returns the same answer for every profile row". **Verified: 0 rows disagree today**, so that test is green before the migration, after it, and whichever direction the convergence goes — and I never said which direction wins. It matters enormously: converge broad and every future `platform_admin` silently gains all 39 PII fields plus catalogue write; converge narrow and any `is_super_admin`-only account silently loses 68 policies' worth of read. **A test that cannot fail is not a test.** |
| **F-02** | **Critical** | OP-0 said "fold items 3 and 4 into T1". I then wrote a sub-task for item 4 (detach-to-promote) and **none for item 3** — the missing unique index that lets a staff user shadow a PII flag. It survived only as a backlog line. |
| **F-04** | **Critical** | I wrote that retiring `is_super_admin` "breaks two live call sites". **Verified: four database functions, plus the S-01 guard trigger itself, plus at least six client files across four submodules** — including BSU's `AuthContext`, which is the OAuth server for the other five apps. A failed profile read there denies the developer bypass and locks the developer out of BSU. |
| **F-05** | **High** | My T1.2b trigger would **break BSU's live sub-org flow and manufacture the exact state it exists to prevent.** Verified in source: `createSubOrganisation` creates the tenant, then patches `parent_tenant_id` in a second client-side UPDATE, and on failure *deliberately does not delete* — leaving an orphaned root tenant. My trigger refuses step two. Every attempt would produce the S-04 end state, through the supported UI. |
| **F-06** | **High** | T1.4 named only crm7's permission hook. Five other apps gate on the same columns; BSU additionally treats `tester` as developer-equivalent, and 2 accounts hold it. The tier would be "real" in one app of six. |
| **F-09** | **Low sev, real reasoning error** | I dismissed the `anon` grants because "every policy is scoped to `authenticated`". **That reason is false — RLS does not govern TRUNCATE**, and both roles hold it. Practically harmless (PostgREST never emits TRUNCATE), but my revoke list was incomplete and my justification was wrong. |

### Two corrections to findings I over-stated

- **F-13** — my S-15 described filtering `custom_fields->>'tfn'`. **That syntax does not
  compile**; the AST has no JSON path. I overstated the mechanism. But the reviewer found the
  real exposure is *blunter and live*: **verified, 22 `custom_fields` JSONB columns are
  catalogued, every one `is_filterable`, `is_pii=false`, `min_role='tenant_member'`** —
  including `apprentices`, `whs_incidents` and `r7_candidates`. No oracle is needed; any
  tenant member can read the whole blob today. Anything anyone ever puts in a custom field is
  already visible to every member of that tenant.
- **R1-07** — I cited "68 tables with no tenant column". Of the **84 actually catalogued**
  entities, **7** lack one. The remediation surface is small enough to just do.

### The structural decisions that did not survive contact

- **F-16 · Critical · my own two rules multiply into a wall.** "One grant authorises one
  query" plus "row filters are one field, one value, equality" means a field officer covering
  three host employers needs three grants — and **no single query is authorised by any of
  them**, so the default view *"open Apprentices, see my rows"* cannot be expressed at all.
  The first thing you would say is "why can I only see one employer at a time", and the only
  answers are union (which reopens the cross-product leak) or client-side merging (which is
  union with no enforcement). Date ranges are equally inexpressible — "this financial year's
  timesheets" needs two operators. **Fix:** keep one-query-one-grant; relax the filter to one
  field with `eq` **or** `in` over an enumerated list, plus optionally one date range. `in`
  already exists in the engine, correctly bound as a single array parameter — it collapses
  the three grants into one *without* recreating the cross-product.
- **F-17 · High · narrow-only grants need a dangerous window to exist.** Since grants only
  narrow what RLS admits, giving someone restricted access means **first** adding a
  `user_tenants` row — full tenant read everywhere, across all six apps — and **then**
  narrowing. If the admin is interrupted between those two steps, the over-broad state is
  permanent and looks normal. **Fix:** one transactional "create restricted user" RPC, and
  the rule that holding any grant on an entity denies the ungranted default — otherwise the
  grant is decorative.
- **F-18 · High · enumerated snapshots inherit the flaw they were meant to dodge.** If the
  snapshot stores column *names*, it freezes the list but not the sensitivity — and
  sensitivity is the mutable part (F-02). **Fix:** snapshot field **ids**; a forged duplicate
  row gets a new id and is not in the snapshot. And never ship a "refresh grant" button —
  the cheap implementation re-enumerates under the current actor, which is exactly the
  widening that banning wildcards was for.
- **F-19/F-20 · Medium · cutting delegation leaves three tenants with no one who can grant.**
  Verified: `gto_admin` exists in only 4 of 7 tenants. And when a sole grantor is offboarded,
  every grant they made goes inert **and inert renders as an empty grid**, not an error.

### What both rounds had missed entirely

**F-10 · High · nobody would notice any of this.** The detection already exists and nothing
reads it: `guard_profiles_privileged_columns()` writes an audit row on **every blocked
self-promotion attempt** — a perfect forensic record of an S-01 attempt — and no code in any
of the six apps reads that table. Every failure class in this plan is silent by construction:
a denial reads as empty, an inert grant reads as empty, a mis-scoped resolver just returns
fewer rows. Sentry catches exceptions; none of these throw.

**F-11 · High · the ordering opens a window less safe than today.** T3 (editable grid) lands
before T4 (permissions), and **verified: 11 of 13 active memberships are owner or admin**, so
write authority is near-universal. Per-field writability opt-in was a note inside a repair
task; it must be a prerequisite of shipping the grid.

**F-12 · High · three tables define authority and the resolver never says which wins.**
Write authority reads `user_tenants.role`; read scope reads `user_tenants.status`; the PII
gate and the enterprise tier read `org_members.gto_role`. Verified: one developer account has
**zero** `org_members` rows. Pick the wrong table and `/settings/data` disappears for real users.

---

## §3 — Revised task breakdown

### Tracked issues

Every task below is filed. The issue is the unit of work; this document is the reasoning
behind it.

| Task | Issue | What it is, in plain words |
|---|---|---|
| T1a | [crm7#1478](https://github.com/GaryOcean428/crm7/issues/1478) | Three live security holes. Ships alone, ahead of everything |
| T2 | [crm7#1479](https://github.com/GaryOcean428/crm7/issues/1479) | Fix the save engine before building on it |
| T3 | [crm7#1477](https://github.com/GaryOcean428/crm7/issues/1477) | **The actual spreadsheet.** The headline |
| T1b | [bsuite#1833](https://github.com/GaryOcean428/bsuite/issues/1833) | The admin tiers, and "developer reads all, edits all" |
| T4 | [crm7#1481](https://github.com/GaryOcean428/crm7/issues/1481) | Who can see and edit what — you elect which, what and scope |
| T5 | [crm7#1482](https://github.com/GaryOcean428/crm7/issues/1482) | Alarms. Every failure here is currently silent |
| — | [crm7#1480](https://github.com/GaryOcean428/crm7/issues/1480) | Two false claims on the data pages, found while testing |
| — | [crm7#1483](https://github.com/GaryOcean428/crm7/issues/1483) | RULING 10.2 — the operator-authored interpretation surface |


**Round 2 changed the ordering, and this is the most consequential edit in the document.**

The previous version put the whole tier refactor first. Round 2's verdict on that: *"T1
becomes the whole project and T3 is never reached."* It is right. T1 had accumulated six
security fixes, a tier resolver, client reconciliation across six apps, and a column
retirement that can 500 twenty-seven tables — a multi-week authorisation refactor of a shared
production database, standing in front of the only task that can move either counter off
zero. The plan's own stated principle is *"the first slice must be something you can open and
use"*, and it then put a database refactor first anyway.

**So T1 splits in two**, and the deciding fact is this: the developer tier already passes
every gate the read and write engines apply, inside the 3 tenants the developers belong to.
**An editable grid for you, on one entity, needs none of the tier work.**

### T0 · Before anything: find out why `/settings/data` has never been used

**The highest-value hour in the plan.** A working, reachable, correctly-permissioned bulk-edit
page has existed and has never once been used. Building a second one without knowing why is
how the zeros happen again.

**Done when:** you have attempted one real bulk edit on `/settings/data`, and we have a
written answer to *what stopped it*. That answer re-orders everything below.

### T1a · Safety — ships this week, on its own, ahead of everything

Both items are unconditional, both are verified live defects, neither depends on the tier
model, and neither can be re-litigated later. Round 2 verified that **no client code anywhere
in the six apps writes `profiles`**, so the revoke breaks no supported path.

- **T1a.1** `REVOKE UPDATE (platform_role, is_super_admin) ON profiles FROM authenticated,
  anon`; mark `trg_guard_profiles_privileged_columns` **ENABLE ALWAYS**. Closes S-01.
- **T1a.2** Add the two partial unique indexes on `report_catalog_fields (entity_id,
  column_name)` mirroring what `report_catalog_entities` already has, and narrow that table's
  write policy from `is_gto_staff` to `is_gto_admin`. Closes S-03 / F-02 — the gap my
  previous revision left with no task at all.
- **T1a.3** Set `is_filterable = false` on the 22 catalogued `custom_fields` JSONB columns
  (F-13). Right now every one is filterable, non-PII and readable by any tenant member. This
  is independent of the OP-4 ruling and should not wait for it.

**Done when:** attempting the self-promotion as a disposable account fails; attempting it
*with the trigger disabled* **also** fails, proving the revoke is doing the work and the
trigger is now defence-in-depth rather than the sole control. Inserting a duplicate catalogue
field row raises `23505`. Each shown failing first.

### T2 · Repair the write path

R1-01..R1-04 and S-13 are live defects in the engine everything else sits on.

- **T2.1** Revoke direct client `INSERT, UPDATE, DELETE` **and TRUNCATE** (F-09 — my earlier
  list and my reason for it were both wrong) on `data_change_sets`/`_items`. Constrain `status`.
- **T2.2** Return the `change_set_id` from the write RPCs so the client stops guessing which
  change set was its own. Fixes R1-02 and the benign concurrent case together.
- **T2.3** Per-batch error handling: keep the ids of every batch that committed, and surface
  "partly saved — here is what saved" as a real state. Special-case `57014`.
- **T2.4** Re-fetch each row immediately before writing, and **add `AND tenant_id = $3` to the
  UPDATE's WHERE clause** (S-13). The function is SECURITY DEFINER so RLS is off for both
  statements; an in-memory comparison against an unlocked prefetch is currently the only
  enforcement. Highest-value single line in the review. **Verify by deleting the clause and
  watching the test go red.**
- **T2.5** Constraint errors stop leaking across tenants (S-06): map
  `unique_violation`/`foreign_key_violation`/`check_violation` to one generic rejection, real
  text to a server log. Unique indexes ignore RLS and
  `people_training_contract_number_uq` is not tenant-scoped.
- **T2.6** The per-row RPC takes **one** entity and **one** tenant, resolved once (S-11).
  A row object carrying `entity_key`/`table_name`/`tenant_id` is a hard error.
- **T2.7** Hard table denylist in entity resolution (S-14): `profiles`, `user_tenants`,
  `org_members`, `data_access_grants`, `data_change_sets*`, `report_catalog_*`.
- **T2.8** Key the grid overlay by row id, not position; revert becomes compare-and-delete.
- **T2.9** Error-mapping layer. `SQLERRM` never reaches a user.
- **T2.10** Base-PK projection, hardcoded to `id` and never catalogue-declared (S-Q2), under a
  reserved output key, and **rejected outright when the query groups or aggregates** —
  folding a PK into GROUP BY degenerates every group to one row, turning a summary the user
  is authorised for into a row dump they are not.

**Done when:** each defect has a test shown failing against today's code first, **and** a
live proof — a paste spanning more than one 200-row batch, forced to fail **two ways**: a
constraint violation (per-row rejection path) and a statement timeout (`57014`, which
`WHEN OTHERS` cannot trap and which takes a different path entirely — F-23). The UI must
report what saved and offer undo for exactly that.

### T3 · The editable workspace — the dominant item, and the first thing you can open

Built **into** `/settings/data` and `/admin/data`. Never been done: zero editable grid columns
exist anywhere in the estate.

- **T3.0 · Prerequisite (F-11).** Enumerate per-field writability opt-ins. Verified: 11 of 13
  active memberships are owner/admin, so shipping an editable grid before the narrowing
  product means every non-guest can edit every catalogued entity in their tenant. Writability
  is opt-in per field, and the list ships **with** the grid, not after it.
- **T3.1 · Findability.** Search across entities; curated descriptions for the six ambiguous
  "Assessment" entities; business-language domain headings; the word "legacy" out of every
  user-visible label.
- **T3.2 · One entity end-to-end**, developer-tier only: grid, inline edit, add row, undo,
  on the repaired write path. This is the slice that moves `data_change_sets` off zero.
- **T3.3** Filter/sort toolbar with a real operator picker (the engine supports
  `eq/neq/gt/gte/lt/lte/in/isNull/isNotNull`; the UI exposes none) and an entity picker for
  foreign-key values so nobody types a UUID.
- **T3.4** Saved views extending `report_configs`. No second table.
- **T3.5** Extend to further entities, with disabled-but-visible affordances for what is coming.

**Done when:** across **three structurally different entities** — one with a join, one with a
PII-gated field, one plain — you inline-edit and commit, undo from the UI, save a view and
reload it, and paste multiple rows from Excel. Deployed build, signed in as yourself, then
verified in SQL. One cell on one entity is explicitly **not** acceptance.
**T3.1 separately:** on the deployed build, find the entity behind a *business phrase*
without knowing the table name (F-21 — otherwise "findability" is done by adding a search box).

### T1b · Tiers — after T3.2, when there is a real user and real saved views to test against

- **T1b.1 · State the winning predicate, then fixture-test it (F-01).** Converge all four
  platform-scope functions and delete the duplicate `platform_is_developer_or_admin()`.
  **The direction must be written down**: 53 policies call `is_platform_admin`, 17 call
  `is_platform_developer`, and the latter also gates the PII check and catalogue writes.
  Replace the row-scan assertion (which is green today and cannot fail) with **three synthetic
  fixture profiles** — developer-only, platform_admin-only, is_super_admin-only — in a
  rolled-back transaction, asserting a specific expected answer per predicate per fixture.
  Also drop the `uid` parameter from `is_platform_admin()`: any signed-in user can currently
  ask whether an arbitrary account is a platform admin, bypassing `profiles` RLS (F-15).
- **T1b.2 · Cascade, using the walker that already exists.** `tenant_subtree_ids()` is correct
  (`UNION`, `depth < 10`). **DROP or REVOKE** `get_descendant_tenant_ids()` and
  `descendants_of()` rather than merely not calling them (F-08 — converging callers leaves the
  primitive), and repoint `adminDataConsoleService.ts`.
- **T1b.3 · Pin the hierarchy — and repoint BSU in the same change (F-05).** A trigger pinning
  `parent_tenant_id`/`tier`/`tenant_type`/`status` for non-platform callers **would break
  BSU's live sub-org creation and leave orphan root tenants**, because BSU patches the parent
  in a second client-side UPDATE and deliberately does not roll back. So this ships together
  with the developer-only re-parent RPC **and** both BSU functions repointed at it, proven by
  creating a sub-org from BSU's own UI after the trigger lands. Mark the cycle-guard trigger
  `ENABLE ALWAYS`.
- **T1b.4 · The resolver, with the membership mapping stated (F-12).** `admin_scope_tenant_ids`
  must say which table defines each tier — write authority is `user_tenants.role`, read scope
  is `user_tenants.status`, the PII gate and enterprise tier are `org_members.gto_role`, and
  one developer account has zero `org_members` rows. pgTAP fixture per membership shape:
  user_tenants-only, org_members-only, both, neither. Must stay a live table read — **never**
  cache a tier into a JWT claim.
- **T1b.5 · Developer reads all, edits all — operator ruling 2026-08-08, and it costs more
  than the previous draft assumed.**

  > *"developer reads all. edits all. elects which what and scope."*

  The previous draft resolved F-03 with acting-as, one tenant at a time. **That is not "reads
  all" and the ruling overrides it.**

  Measured after the ruling: the engine's step-0 gate refuses any tenant the caller is not a
  member of (developers are members of 3 of 7) — but that is only the outer layer. **Of the 84
  catalogued entities, exactly 1 has a SELECT policy admitting a platform developer.** The
  other 83 block cross-tenant reads at the RLS layer, *underneath* the engine. Because the
  engine is INVOKER, relaxing step 0 alone would return zero rows. This capability has never
  been built.

  Three routes, and the ruling picks the third:

  | Route | Verdict |
  |---|---|
  | Backfill `user_tenants` membership for developers in all 7 | **No.** Grants developers access under *every* policy in the shared database — conduit, throughput, braden, BSU, R80.4 — far beyond this tool, and makes a developer indistinguishable from an ordinary member in the audit trail. |
  | Flip the engine to SECURITY DEFINER | **No.** S-07 — the single most likely route to a cross-tenant leak. |
  | **Add an explicit `OR is_platform_developer()` clause to the SELECT policy on each of the 83 catalogued tables** | **Yes.** Explicit, auditable per table, one reviewable migration, and it grants exactly the named scope and nothing wider. |

  Note this is **not** the thing S-07 warns against. S-07 is about *per-grant dynamic filters*
  needing rows RLS denies. This is one fixed, known predicate applied mechanically — the safe
  branch of the same fork, and the one the security review explicitly recommended taking
  ("one table, one migration" rather than changing the engine's security context).

  The write path needs the same treatment, and `_bulk_data_write_authority` must gain the
  developer branch alongside it — "edits all" is half the ruling.

  **Accept:** the developer login lists 7 tenants and **reads and writes a row in each**, on
  the deployed build. Plus a pgTAP assertion per catalogued entity that a non-developer in
  tenant A still gets zero rows from tenant B — shown failing with the tenant clause removed.
  The developer clause must never widen anyone else.
- **T1b.6 · Client gates in all six apps (F-06)**, not just crm7: BSU `AuthContext` /
  `platformRole` / `isPlatformOperator`, conduit, throughput, braden. BSU still treats
  `tester` as developer-equivalent and 2 accounts hold it.
- **T1b.7 · Retire `is_super_admin` by expand → migrate → contract (F-04).** Verified surface:
  **four database functions, the S-01 guard trigger itself, 68 policies over 27 tables, and
  at least six client files across four submodules.** Function bodies are not dependency-
  tracked, so `DROP COLUMN` succeeds and fails at runtime — 500s on 27 tables across six apps
  at once, recoverable only by another migration. Order: rewrite the functions off the column
  first; ship the client read change in **all six** apps and verify each deployed commit SHA;
  only then drop, gated by a CI grep for the identifier across every submodule.

**Done when:** three real logins land on the right surface with the right nav, **and the
developer login lists 7 tenants and reads *and writes* a row in each** (F-22 — "lands on the
right surface" is passable today; the tenant count is not, and per the 2026-08-08 ruling the
write half is not optional). Plus pgTAP with each assertion shown
failing when its guard is removed, using a **named** negative-control mechanism per guard
(transaction-scoped `ALTER POLICY`, `SET LOCAL ROLE`) and asserting
`session_replication_role = 'origin'` at test start — otherwise the harness property behind
S-01 makes the negative control silently pass (F-07).

### T4 · The permission product

`data_access_grants` · `data_grant_create()` enforcing that a grantor cannot exceed their own
scope · `data_grant_revoke()` · a Grants console · a Field Security panel where `is_pii` and
`min_role` are edited in the UI, never in code.

**The constraint that governs the task (S-07):** `report_run_catalog_query` **stays SECURITY
INVOKER, permanently.** A grant may only narrow what RLS already admits. Anything requiring a
row RLS denies is out of scope for v1 and needs a grants-aware policy on that one table —
never a change to the engine's security context. **CI asserts `prosecdef = false`, shown
failing with the function flipped.** Round 2 verified the baseline is true today.

Built in from both rounds and the research:

- **Delegation cut entirely.** Only a tier-holder may grant. It was the source of two
  escalation paths and is machinery for a hierarchy with zero rows. **But (F-20) `gto_admin`
  exists in only 4 of 7 tenants**, so state the fallback — either a developer grants on
  request, or `user_tenants.role='owner'` is grant-capable. T4's acceptance must include
  creating a grant in a tenant with no `org_members` row.
- **Row filters: one field, `eq` **or** `in` over an enumerated list, plus optionally one date
  range (F-16).** Strict equality alone made the default view unauthorisable — three
  employers meant three grants and no query any of them authorised. `in` already exists in the
  engine, bound as a single array parameter, and collapses them without recreating the
  cross-product.
- **One query is authorised by exactly one grant; never flatten (S-10).** When several could
  satisfy a query, pick the single widest that fully covers fields *and* rows; if none does,
  deny naming what is missing. Research confirms this is the AWS assumed-role pattern, not an
  idiosyncratic call.
- **Snapshot field ids, not names (F-18).** A forged duplicate field row gets a new id and
  falls outside the snapshot. **No "refresh grant" button** — the cheap implementation
  re-enumerates under the current actor, reintroducing exactly the widening wildcards were
  banned for. A stale grant is revoked and re-created, with the diff shown.
- **Re-intersect against the grantor's live access** on every grantor-permission change
  (S-12 + research Q3). A snapshot is a ceiling, not a permanent record.
- **Inert ≠ silent (F-19).** A suspended grant renders "access suspended pending re-approval",
  never an empty grid.
- **Grants intersect the PII gate, never union it (S-08).** `AND`, at all five admission points.
- **A field you cannot read, you cannot filter, group or aggregate on** (research Q4). Our
  catalogue lets those flags disagree today; they must be evaluated together per user.
- **Creating a restricted user is one transaction (F-17)** — membership and grant in a single
  RPC — and holding any grant on an entity denies the ungranted default, or the grant is
  decorative.
- **Two evaluators, two names (S-16):** an explicitly advisory UI summary, and a server-only
  authoriser the client cannot call or parameterise.
- **Prerequisite:** T3.3. Today's filter UI is bare text boxes with no operator picker.
- **Still needs a stated rule:** what happens when a grant's filter references a field the
  grantee cannot see — silent narrowing, or refuse to save.

**Done when:** on the deployed build you grant a **disposable** test account read-minus-PII on
one entity and edit on one field; sign in as that account and confirm it sees exactly that;
**then revoke mid-session, do not refresh, paste into the now-greyed column — assert a refusal
and assert in SQL the row did not change.** Plus a grant created in a tenant with no
`org_members` row, and adversarial pgTAP including one that grants "all fields" and proves the
PII fields stay denied. Each shown failing first.

### T5 · Observability — new, and it has no owner today (F-10)

Neither round caught this until Round 2: **every failure class this plan creates is silent by
construction.** A denial reads as empty, an inert grant reads as empty, a mis-scoped resolver
just returns fewer rows, a partial batch looks like a total failure. Sentry catches
exceptions; none of these throw.

And the detection already exists, unread: `guard_profiles_privileged_columns()` writes an
audit row on **every blocked self-promotion attempt**, and no code in any of the six apps
reads that table.

- A developer panel over `profiles_privileged_audit` and `super_admin_action_audit`.
- Three counters you can see: change sets committed, grants created, grant denials (7 days).

**Done when:** a deliberately-triggered blocked self-promotion appears on the panel within one
refresh. **This is also the only way §6.4's bar becomes observable rather than remembered.**

### T6 · Airtable feel *(not v1)*

Chips, colour rules, group rows, row height, hide fields, **and "Share view"** — which Round 1
found owned by no task at all. Deliberately after the edit loop is proven with a real person.

**Acceptance: none defined, because this is explicitly not v1.** Stated so §6.1 is not
contradicted by its own document (F-21).

### T7 · Unlocks *(not v1)*

Date bucketing (day/week/month/quarter/AU-FY) — cheap and valuable; the unit must come from a
fixed server-side list and sit inside the existing group-by loop so it inherits the access
check (S-Q4). Custom fields end-to-end, pending OP-4.
**Formula columns stay cut** (R1-15). **Acceptance: none defined; not v1.**

### T8 · Reach *(not v1)*

Nav from the other apps; BSU developer console deep-link; conduit `r7_*` entities.
**Acceptance: none defined; not v1.**

## §4 — What needs you

> **These also live in plain language, in a file you can open, at
> [`20260808-operator-decision-register-v1.00W.md`](./20260808-operator-decision-register-v1.00W.md)** —
> including a key to what T1/T2/T3 actually mean. That file is the readable copy and the one
> to work from; agent memory is a mirror of it, not the other way round.
>
> *(This exists because the register was previously kept in agent memory, which the operator
> cannot read. A decision queue nobody can open is not a queue.)*

Format as you asked: the decision, why, and what informed it.

### OP-0 · Do you want the live security fixes shipped now, ahead of this plan?

**Decision required.** The red-team found things that are true in production **today** and
have nothing to do with whether the data workspace is ever built. Round 2's strongest
recommendation was to **split these out and ship them first**, as their own change, rather
than let them wait behind a multi-week authorisation refactor. That is now **T1a**.

**What they are, in plain terms:**

1. **Anyone signed in can make themselves a platform developer — if one trigger is off.**
   The database lets any logged-in user write to their own "am I a developer" and "am I a
   super admin" columns. The only thing stopping it is a single trigger, and that trigger
   is the kind that does **not** run during replication, restores, or the test harness.
   Fix: take the permission away, and make the trigger the always-on kind. Small change.
2. **Two of the three "find all my sub-orgs" functions can hang the database** if the org
   tree ever contains a loop. A correct third version already exists. Fix: use it.
3. **A staff-level user can turn off the "this field is sensitive" flag** by inserting a
   second, tenant-specific copy of the field definition that wins. The sibling table has
   the uniqueness constraint that would prevent this; this one doesn't. Not reachable by
   any account that exists today — but T4 hands exactly this power to a UI.
4. **An org admin can detach their own org from its parent** and become a root org. Today
   that means nothing. After T1 it would mean promoting yourself to enterprise super admin.

**Why I am asking rather than just doing it:** 1 and 2 are contained and I would ship them
now. But 3 and 4 change authorisation behaviour, and this estate's rule is that a change to
who-can-do-what gets your eyes first. Also, revoking a column permission in production is
the kind of change that is quiet when right and loud when wrong.

**What informed it:** I verified all four myself against the live database after the
reviewer raised them — the column grants, the policy text, the trigger states, the missing
index, and the trigger's `WHEN` clause. None is theoretical. **My recommendation: ship 1
and 2 immediately as their own change, and fold 3 and 4 into T1** where they are prerequisites
anyway.

### OP-1 · Try `/settings/data` before I build anything

**Decision required from you.** Spend ten minutes attempting one real bulk edit on
`/settings/data`, and tell me what stopped you.

**Why:** it is built, live, reachable, and correctly permissioned for your account, and in
its entire existence it has been used zero times. Every prior attempt here built more and
asked less. If I build a second editing surface without knowing why the first went unused,
the most likely outcome is two unused editing surfaces.

**What informed it:** `data_change_sets` = 0 measured live. The scope reviewer's conclusion
was blunt — the post-mortem for this plan, if it fails, reads *"we rebuilt the page nobody
had clicked, one level up the stack."*

**My hypothesis, so you are not answering a blank question.** I checked how these pages are
labelled in your navigation. They read:

> **"Data Import & Bulk Update"** · **"Enterprise Data Console"**

Neither of those says *"browse and edit all your data like a spreadsheet"*. The first sounds
like a CSV import wizard — a thing you use once during setup. The second sounds like an
admin diagnostic screen. If you have been scrolling past both for months while asking for an
Airtable-style tool, the most likely explanation is not that the feature is missing; it is
that **nothing in the product told you it was there.**

If that is what happened, the first fix is a rename and a front-door, and it is hours of
work rather than weeks. If instead you open it and it genuinely cannot do what you need,
that answer is worth just as much — it tells us exactly which capability to build first
rather than guessing. Either way this question is cheap and everything downstream is not.

### OP-2 · Is the super-admin tier real yet?

**Decision required.** Zero tenants have a parent. Do you want a real enterprise with
sub-orgs modelled now, or is the tier still hypothetical?

**Why:** it changes how much of T1 and T4 is worth building. The cascade, the descendant
scoping and the delegation chain are all machinery for a structure that has never had a
single row.

**What informed it:** 0 of 7 tenants have a parent, measured. `/admin/data` already renders
its descendant banner only when descendants exist — a previous lane hit this same question
and chose not to fake it. I have followed that precedent and descoped delegation chains to
one hop for v1. **Tell me if that is wrong** and enterprises are imminent.

### OP-3 · Should a placement or timesheet record *which site*?

**Decision required — this is a domain question, and you are the domain expert.**

**The finding:** neither `placements` nor `timesheets` has a `site_id`. Not un-catalogued —
the column does not exist. `sites` links only to `employers`. So the natural instruction
"give this coordinator access to only Sarah's site" cannot be expressed for the two entities
where it matters most. The closest available is "everything at that employer", which is
wider than intended, and nothing would warn the person granting it.

**Why it matters beyond permissions:** if a host employer has three sites and an apprentice
is at one of them, then site visits, incidents and WHS obligations attach to a site the
placement record does not name.

**What informed it:** verified in the live schema, not the catalogue. I have **not** assumed
this is a defect — a GTO may deliberately place at employer level and track site through
site visits. You will know in seconds which it is. If it is a gap, it is a modelling change
that should be decided before T4 hard-codes around its absence.

### OP-4 · Which custom-fields system is the real one?

**Decision required.** Two already exist: a typed registry (`custom_field_definitions` +
`custom_field_values`, with a live admin page) and ad-hoc `custom_fields jsonb` columns on
tables like `apprentices` with no registry at all.

**Why:** the first draft said "+Add field → JSONB, never DDL" — which, unqualified, invents
a *third* convention. Worse, a field added as a key inside a JSONB blob inherits the
sensitivity of the whole blob. Someone adding "Medicare number" as a custom field into a
container catalogued as non-PII gets **zero** protection from the PII gates that are the
entire backbone of both engines.

**What informed it:** the reliability reviewer found both systems; the security reviewer
then found the sharper edge (S-15) — because sensitivity is recorded *per column* and a
JSONB blob is one column holding many fields, once that column is filterable someone can
filter on a key they cannot read and learn its value from the row count. I am not choosing
between two live conventions without you. My recommendation: extend the typed registry, and
give every custom field a real catalogue row so sensitivity gates **per field**, never per
blob.

### OP-5 · Decisions I have already made for you

Yours to overturn; I am not re-asking.

| Decision | Why | What informed it |
|---|---|---|
| **No `/data` route** — build into `/settings/data` and `/admin/data` | Six "data"-named destinations already exist and three collide | Two reviewers independently; `/admin/data`'s header already assigns the tiers |
| **No `workspace_views` table** — extend `report_configs` | A working saved-views table already exists with 0 rows | Building a second would make two dead tables — the exact pattern this plan diagnoses |
| **Formula columns cut from v1** | A wrong number that looks identical to a right one, in the same footer | 1,000-row cap verified in the AST; the client cannot know how wrong it is |
| **Delegation cut entirely** — only a tier-holder may grant | Built for a hierarchy depth with zero rows, **and** it was the sole source of two escalation paths | Scope reviewer said descope; security reviewer said cutting it makes the system safer. Your ask names three *tiers* deciding, not grantees re-delegating |
| **The read engine stays SECURITY INVOKER, permanently, with a CI assertion** | It is the most likely route to a cross-tenant leak — not by anyone deciding to, but by an implementer hitting a grant that INVOKER cannot deliver and taking the one-function route over the 363-policy route | Already rejected in §5; the review showed nothing *stopped* it being re-litigated by accident |
| **Grant row-filters are one field, one value, equality** — not the full filter language | The full version compiles under the grantee's identity, so the *tightest* grants are the ones that break, and it shares a budget the client can exhaust | Every real case named so far is a single equality |
| **T5 (chips, colour, row height) after the edit loop** | "Looks like Airtable" before "editing works" is what produced the zeros | Scope + UX reviewers agreed independently |
| **Fix the write engine before building on it** | Four live defects, including a forgeable audit trail | I verified each against the live database |

---

## §5 — Ruled out, with reasons (do not re-litigate)

| Option | Why |
|---|---|
| **NocoDB** | **Sustainable Use License** — may not be provided to others commercially. BSuite is paid multi-tenant. Legally unusable, fork included. |
| Directus / Budibase / NocoBase | MSCL / BSL / commercial — source-available, not open. |
| Teable · APITable · undb · ToolJet | AGPL-3.0 — would require open-sourcing BSuite, or buying out. |
| Grist · Baserow (licence-clear: Apache-2.0 / MIT core) | **Mirror trap.** Grist is SQLite-per-document; Baserow brings its own schema. Adopting either means mirroring 363 live tables and abandoning RLS, the catalogue and the write engine — i.e. abandoning the permission model, which *is* the requirement. Design references only. |
| Handsontable · HyperFormula | Non-commercial licence / GPLv3. |
| glide-data-grid | MIT, but peer-caps at React 18; the estate is React 19. |
| PostgREST as the engine | Aggregates disabled at project level; no multi-hop, no HAVING. |
| A generated view per question | The old ceiling in costume — every new question becomes DDL, and it moves row security somewhere grants cannot compose. |
| A SECURITY DEFINER read gateway | Inverts the trust model: a builder bug becomes a cross-tenant leak instead of a zero-row result. The estate's only cross-tenant P0 lived in a DEFINER helper. |

*(Licences read from the actual LICENSE files, 2026-08-08, then **independently re-verified**
by a second reviewer fetching each repository's raw LICENSE from its default branch. All
seven conclusions held: NocoDB = Sustainable Use License · Teable / undb / APITable =
AGPL-3.0 · Mathesar = GPL-3.0 · **Baserow core = MIT** · **Grist = Apache-2.0**. Only
Baserow's core tree and Grist are usable inside a closed-source commercial SaaS without
buying a licence — and both still lose on the mirror trap above, which is a design
objection, not a legal one. GitHub's `NOASSERTION` badge is not evidence either way.)*

---

## §6 — The anti-shell contract (rewritten — Round 1 found the old one didn't bind)

The previous version claimed every task was proven from the deployed UI, while three tasks'
actual criteria were unit tests. That gap is how "the plumbing exists and has never carried
water" happened. So:

**1. Every v1 task has a live proof.** A change made from the **deployed** build, signed in
as a real account, then confirmed in SQL. Database-only tasks are not exempt — T1a's proof is
a self-promotion attempt failing *with the trigger disabled*; T1b's is the developer login
listing 7 tenants and reading a row from each; T2's is a forced partial batch reporting
honestly. **T6, T7 and T8 are explicitly not v1 and carry no criteria** — stated openly so
this rule is not quietly contradicted by its own document, which is what Round 2 caught.

**2. Every guard is shown failing.** A pgTAP assertion that has never been observed red is
not evidence. Reintroduce the defect, watch it fail, then fix it.

**3. Breadth, not one cell.** T3 needs three structurally different entities, an undo, a
saved view reloaded, and a multi-row paste. A single edit on the simplest entity is
explicitly **not** acceptance — that test can be passed today, by a page nobody uses.

**4. The counters are the scoreboard, and they are not sufficient.** `data_change_sets` and
saved views leaving zero is necessary. It is not proof: one contrived edit moves both. The
real bar is you doing a real piece of work — open it, fix ten records, close it — without
being prompted.

**5. Silent truncation gets logged.** If a slice caps coverage, say what was dropped. A
silent cap reads as "covered everything".

---

## §7 — Backlog raised by this review (log even if out of scope)

**Live security posture (fix regardless of this plan):** S-01 self-escalation via `profiles`
column grants + origin-only trigger · S-02 four platform-scope functions, three predicates,
one duplicate · S-03 PII gate writable by the roles it restricts (missing unique index) ·
S-04 detach-to-promote · S-05 two unguarded subtree walkers · S-06 constraint errors as a
cross-tenant existence oracle.

**Write path:** R1-01 audit-trail forgery/tamper · R1-02 undo misattribution ·
R1-03 partial-batch divergence · R1-04 overlay resurrection · S-13 TOCTOU tenant check ·
S-14 mass assignment.

**Read path:** R1-06 `count(*) OVER()` cost + opaque timeout · R1-07 RLS-denial reads as
empty · **the blind oracle — `is_pii`/`min_role` are evaluated independently of
`is_filterable`/`is_groupable`/`is_aggregatable`, so a user can filter on a field they may
not read and learn its value from the row count** · Q-7 error text distinguishes "does not
exist" from "restricted" ·
`report_catalog_verify_entity_scope()` counts SELECT policies rather than testing them, so
a `USING (true)` policy passes.

**Product / UX:** R1-13 findability (only 23 of 84 entities described; six ambiguous
"Assessment" entities) · R1-14 raw database errors reaching users · R1-16 flags unflippable
for 6 of 7 tenants · "Documents (legacy)" as a user-visible label · "Share view" previously
owned by no task.

**Observability (F-10, new in Round 2 — nothing owned this):** no app reads
`profiles_privileged_audit`, which already records every blocked self-promotion attempt ·
no counters on change sets, grants, or denials · every failure class in this plan is silent
by construction and none of them throw, so Sentry sees nothing.

**Cross-app (F-06, F-04):** five apps besides crm7 gate on the same columns; BSU treats
`tester` as developer-equivalent (2 accounts hold it) · retiring `is_super_admin` touches
4 DB functions + the guard trigger + 68 policies over 27 tables + 6 client files in 4
submodules, none dependency-tracked.

**Live now, independent of this plan (F-13):** all 22 catalogued `custom_fields` JSONB
columns are `is_filterable`, `is_pii=false`, `min_role='tenant_member'` — any tenant member
can already read the whole blob on `apprentices`, `whs_incidents`, `r7_candidates` and 19
others. Fix in T1a.3; do not wait for OP-4.

**Domain:** R1-17 no `site_id` on `placements` or `timesheets`.

**Retracted, both mine:** R1-05 — `profiles.user_id` is a generated column and cannot
diverge; the real defect is the predicate split (F-01). S-15 — the JSONB filter syntax I
described does not compile; the real exposure is blunter and is listed above (F-13).

---

*Round 2 red-team (fable tier) appended below when complete. This plan is not final until
it is.*
