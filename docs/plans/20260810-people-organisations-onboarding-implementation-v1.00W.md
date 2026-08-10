# People, organisations and onboarding — implementation plan

**Design:** [`20260810-people-organisations-onboarding-design-v1.00D.md`](20260810-people-organisations-onboarding-design-v1.00D.md) · bsuite#1871
**Rulings:** A (front door) · **C3** (deduplicate and link — **move no foreign keys**) · ABN
is the organisation identity, scoped to the **enterprise** · self-service portal onboarding.
**Date:** 2026-08-10. **Status:** ready to execute.

Written for an engineer who is good but has **no context for this estate**. Every task names
the repo it lands in, the skills that govern it, and the evidence required before it can be
called done. Do the waves in order. Within a wave, tasks are independent unless stated.

---

## 0. Read this before touching anything

### 0.1 The eight traps this estate sets

Each has cost a day at least once. They are not hypothetical.

1. **Merging is not applying.** Merging to `development` applies **nothing** to the database.
   The applier (`.github/workflows/supabase-migrate.yml`) runs on push to the **parent repo's
   `main`**. A migration can sit merged and unapplied indefinitely with every check green.
2. **A recorded migration is not an applied one.** `schema_migrations` proves a row was
   written, not that the SQL ran. Verify the **object**: `to_regclass`, `pg_policy`,
   `pg_proc`, `information_schema.column_privileges`.
3. **Every new table and function is granted to `anon` at creation.** This project's
   `ALTER DEFAULT PRIVILEGES` hands `anon` privileges before your `GRANT` runs, and
   `REVOKE ... FROM PUBLIC` does **not** remove an explicit role grant. **Revoke `anon` by
   name, every time.**
4. **A new `SECURITY DEFINER` function fails the advisor sweep** until it is enumerated in
   `docs/security/supabase-advisor-allowlist.json` with a written justification. This is
   deliberate. Budget for it.
5. **Migration versions collide.** An author-time collision check has a shelf life of minutes
   — a sibling lane's uncommitted worktree is invisible to you. Versions are **assigned below**;
   re-check immediately before merge regardless.
6. **The migration floor is `20260611000000`.** Anything below it is never applied.
7. **A column-scoped `REVOKE` is a no-op while a table-level grant exists.** Revoke the table,
   re-grant the benign columns by name.
8. **A grid can render rows with every cell empty.** "The page loaded" is not evidence.

### 0.2 Gates that apply to every task

| Gate | Skill | When |
|---|---|---|
| Confirm library/runtime versions before the first edit | `research-best-practice` | before first edit in a new module |
| Runtime/UI changes need a **deployed** test as a real user | `test-playwright`, `auth-e2e-sso-testing` | before claiming done |
| RLS / authz changes red-teamed | `bsuite-rls-authz-red-team` | any migration touching policies or grants |
| Definition of done, D1–D7 | `agent-definition-of-done`, `general-what-done-looks-like` | before every PR is marked ready |
| Nothing built-but-unreachable | `~/.agents/scripts/wiring-check.sh` | end of every wave |

### 0.3 Governing skills by area

Derived from the full hub at `~/.agents/skills/` — **206 skills**. Worth knowing: the
in-context skill listing is budget-truncated and a plain `ls ~/.claude/skills/` misses every
`bsuite-*` skill, which is where the estate-specific knowledge lives. Enumerate the hub
directly. The `qig-*` skills are a different silo and must not be used here.

| Area | Skills |
|---|---|
| Supabase migrations, RLS, policies | `supabase:supabase`, `db-supabase`, `supabase:supabase-postgres-best-practices`, `bsuite-rls-authz-red-team` |
| Auth, tokens, invite flows | `auth-supabase`, `auth-oauth-native-app-flows`, `check-security` |
| crm7 page/card work | **`bsuite-page-grid-layout`**, `bsuite-react-testing`, `bsuite-brand-system`, `web-ui-styling` |
| Shared package (`@bsuite/page-builder`) | `bsuite-shared-ui-rollouts`, `bsuite-pnpm-monorepo` |
| Forms and validation | `web-forms-validation`, `web-tanstack-query` |
| Entity/selector doctrine | **`general-dry-one-shot-architecture`**, `check-dry-one-shot` |
| Front-end ↔ back-end contract | `web-frontend-backend-mapping` |
| Manuals | `general-user-manual-program`, `bsuite-user-manuals-nav` |
| Domain vocabulary (STA, RTO, training contracts) | `biz-au-apprenticeship` |
| Destructive-change safety | `check-cleanup-scope-safety` |
| Testing and evidence | `test-playwright`, `test-qa-and-verification`, `test-verify-before-completion` |
| **Conduit live validation** | **`bsuite-conduit-deploy-testing`** — d.conduit.crm7.app via BSU OAuth |
| When a live test fails | `bsuite-production-debugging` |
| Canvas / schema-builder context | `bsuite-developer-portal` |
| Shipping, promotion, submodule pointers | `ops-ship-all-apps`, `bsuite-ship-visual-promote`, `git-dev-main-reconcile`, `git-worktrees` |

### 0.4 Assigned migration versions

Assigned here so parallel lanes cannot collide. **Re-run the collision check immediately
before merge anyway** — that is trap 5.

| Task | Version | Repo |
|---|---|---|
| W2-2 organisation role flags | `20260812010000` | crm7 |
| W2-3 `contacts.organisation_id` | `20260812020000` | crm7 |
| W2-4 duplicate merge | `20260812030000` | crm7 |
| W2-5 `enterprise_root_id` + trigger | `20260812040000` | crm7 |
| W2-6 ABN normalise + partial unique index | `20260812050000` | crm7 |
| W3-1 invite table + RLS | `20260812060000` | crm7 |
| W3-2 mint/accept RPCs | `20260812070000` | crm7 |

If a lane needs an extra migration, take the next free `…0000` in the block and note it here
in the same PR.

---

## Wave 1 — Reachability

**No database changes. No data risk.** This wave alone fixes the reported problem.

### W1-1 · Front-door router at `/people/new`
**Repo:** crm7 · **Skills:** `bsuite-page-grid-layout`, `bsuite-react-testing`, `web-ui-styling`

Move the existing form to `/people/new/worker`. `/people/new` becomes a three-choice router.

- Existing `src/pages/people/new.tsx` — **do not edit its contents.** Re-route it.
- New `src/pages/people/new.tsx`: three cards, one question — *"Who are you adding?"*
  - *Someone we employ or place* → `/people/onboard`
  - *Someone at another organisation* → `/contacts/create`
  - *Someone who applied through Conduit* → `/people/from-candidate` (W1-4)
- Register routes in `src/App.tsx` alongside the existing lazy imports.
- Copy must not use the words *contact* or *person* as jargon. The user does not know which
  they need — that is the defect being fixed.

**Cards:** use `DraggableCardPage` + `CanvasCard` with an explicit `h`, and bump
`layoutVersion` on the page. Read `bsuite-page-grid-layout` first — a card added without
registering its grid entry moves the whole block as one and truncates content.

**Evidence:** deployed test — from `/people/new`, each choice lands on the right page;
`/people/new/worker` still renders the full form with cards individually draggable.

### W1-2 · `/contacts/create` into the navigation
**Repo:** crm7 · **Skills:** `bsuite-context`, `bsuite-user-manuals-nav`

Add *Add Contact* under **Contacts & Clients** in `src/config/navigation.ts`, after
*Contacts*. Permission-gate it the same way the page is gated.

**Evidence:** deployed test as a tenant admin — the item appears and the page loads. Also as
a role **without** `view_contacts`: the item is absent. A nav item that shows for everyone is
a different bug.

### W1-3 · Rename the two colliding nav labels
**Repo:** crm7 · **Skills:** `bsuite-context`

`Onboarding` → **Onboarding status**. `Onboard Someone` → **Onboard someone**. Labels only;
do not change hrefs — external links and manuals reference them.

**Evidence:** grep shows no remaining `label: 'Onboarding'`; both pages still load.

### W1-4 · crm7-side entry for the Conduit handoff
**Repo:** crm7 (reads conduit) · **Skills:** `bsuite-page-grid-layout`, `web-tanstack-query`, **`bsuite-conduit-deploy-testing`**

`/apprentices/from-candidate` already exists and accepts `handoff_token`, but is only
reachable from conduit. Add `/people/from-candidate`: search hired conduit candidates, and on
selection reuse the **existing** handoff path. Do not write a second transfer.

**Evidence:** a hired candidate found from crm7 lands on the same page conduit's button
reaches, and creates the same record. **Do not build a parallel path** — verify by reading
`_convert-to-apprentice-button.tsx` in conduit first. If the conduit side needs any change,
validate it on `d.conduit.crm7.app` through BSU OAuth per `bsuite-conduit-deploy-testing`;
conduit is a separate deploy and a green crm7 build says nothing about it.

### W1-5 · Manuals for the three roles
**Repo:** crm7 · **Skills:** `general-user-manual-program`, `bsuite-user-manuals-nav`, `biz-au-apprenticeship`

Ships **in the same PR as W1-1**, not after.

- **GTO staff** — the three doors, in the words the router uses.
- **Worker being onboarded** — what the portal asks for; that a document they upload still
  needs staff verification. (Write now; it goes live with W3.)
- **Client / host-employer administrator** — they are recorded as a contact at their
  organisation.

**Evidence:** manuals reachable from the in-app Manuals menu, not just present as files.

---

## Wave 2 — Organisations

**Data risk lives here.** Ruling C3: **no foreign key moves.** If a task in this wave finds
itself repointing an FK, stop — that is C1 and it is out of scope.

Read `general-dry-one-shot-architecture` before starting: one owning record per entity,
never a mirror table, never a free-text field where an entity exists. That doctrine is what
this wave restores.

### W2-1 · Populate and validate ABNs — **do this first, no migration**
**Repo:** crm7 (script) · **Skills:** `check-cleanup-scope-safety`, `biz-au-apprenticeship`

ABN cannot yet confirm any of the six duplicate pairs: zero have an ABN on both sides. Until
that is fixed, every later step in this wave is guesswork.

1. For the 6 pairs (and ideally all 41 organisation rows), obtain the ABN — ABN Lookup, or by
   hand for six rows.
2. Fix `37 602 010 097]` — it has a stray bracket, which proves nothing validates on entry.
3. Add a modulus-89 ABN checksum validator and wire it into every ABN input.

**Evidence:** each of the six pairs has an ABN on **both** sides, or a written human decision
recorded in the W2-4 migration explaining why the pair is the same entity without one.

### W2-2 · Organisation role flags · `20260812010000`
**Repo:** crm7 · **Skills:** `supabase:supabase`, `bsuite-rls-authz-red-team`

Add to `employers`: `is_client`, `is_host_employer`, `is_training_provider`, `is_sta`
(boolean, default false, NOT NULL). Backfill `is_host_employer` from the existing
`clients.is_host_employer` where the pair is known; `is_client` true where a `clients` row
points at the employer.

**Do not drop `clients.is_host_employer` yet.** Both are read; retiring one is a later step
once every reader moves.

**Evidence:** `to_regclass` and `information_schema.columns` confirm the columns exist live
after promotion. Row counts before and after are identical.

### W2-3 · `contacts.organisation_id` · `20260812020000`
**Repo:** crm7 · **Skills:** `supabase:supabase`, `general-dry-one-shot-architecture`

Add `contacts.organisation_id uuid REFERENCES employers(id)`. Backfill from `client_id` via
`clients.employer_id` where it resolves. **Keep `client_id`** until every reader moves — a
dual-read period, not a cutover.

Then handle the orphans, which is most of the table: **55 of 79 contacts have no
organisation, and 7 more have a free-text company only.** Do not invent a rule for them in
this migration. Produce a report; the operator decides.

**Evidence:** `contacts` row count unchanged; every backfilled `organisation_id` resolves to a
real `employers` row; the orphan report is attached to the PR.

### W2-4 · Merge the six duplicate pairs · `20260812030000`
**Repo:** crm7 · **Skills:** `check-cleanup-scope-safety`, `test-qa-and-verification`

**The only destructive task in the plan.** `check-cleanup-scope-safety` governs: execute
exactly the six approved pairs, never expand scope mid-run.

For each pair: keep the `employers` row as the survivor, ensure the `clients` row points at it
via `employer_id`, copy across any field the client row holds and the employer row does not
(**field-by-field, decided in advance — this has not been surveyed, so survey it first**),
and set the role flags.

- **Do not delete the `clients` row.** Under C3 it remains as the commercial relationship.
- **No foreign key is repointed.** If one looks necessary, stop.

**Evidence, mandatory:**
- `scripts/verify-class-a-preservation.mjs --check <baseline>` passes before **and** after.
- Each of `clients` and `employers` has an unchanged row count.
- A named before/after for all six pairs in the PR body.
- Dry-run inside a guaranteed rollback first.

### W2-5 · `enterprise_root_id` + maintaining trigger · `20260812040000`
**Repo:** crm7 · **Skills:** `supabase:supabase`, `machine-db-postgres-best-practices`

Add `employers.enterprise_root_id uuid NOT NULL`, resolved by walking
`tenants.parent_tenant_id` to the top. **Use `tenant_subtree_ids()` — it is the only
cycle-safe walker of the four** (`ancestors_of`, `descendants_of`,
`get_descendant_tenant_ids` are not).

Trigger maintains it on insert and on `tenant_id` change. Re-parenting a tenant must
recompute every organisation it owns and **fail loudly naming the colliding pair**, not with
a bare constraint violation.

Any new `SECURITY DEFINER` helper: pin `SET search_path = public, pg_temp`, **revoke `anon`
by name**, and add it to the advisor allowlist with a justification in the same PR (traps 3
and 4).

**Evidence:** every row has a root that is genuinely a root (`parent_tenant_id IS NULL`);
inserting a tenant three levels deep resolves correctly; the cycle case is tested.

### W2-6 · ABN normalisation + partial unique index · `20260812050000`
**Repo:** crm7 · **Skills:** `supabase:supabase`, `bsuite-rls-authz-red-team`

Generated column `abn_normalised` (digits only), then:

```sql
CREATE UNIQUE INDEX ... ON public.employers (enterprise_root_id, abn_normalised)
  WHERE abn_normalised IS NOT NULL;
```

**Partial**, because ABN is optional — only 12 of 17 employers and 13 of 24 clients have one.
Two unrelated GTOs must each be able to hold the same company; two tenants under one
enterprise share.

**This must run after W2-1 and W2-4.** Adding it earlier is a gate that never fires.

**Evidence:** positive control — attempt a duplicate ABN within one enterprise (must be
refused) **and** the same ABN under a different enterprise root (must be allowed), both inside
a rollback. A constraint never seen refusing anything is not a constraint.

### W2-7 · Selector and catalogue
**Repo:** crm7 · **Skills:** `general-dry-one-shot-architecture`, `web-forms-validation`

- `ClientSelector` reads organisations filtered by role flag, scoped to the caller's tenant.
  **Keep its existing validation** — refusing a typed name that does not resolve is what
  stopped 7 contacts becoming free-text orphans.
- Refresh the report catalogue so `organisation_id` and the role flags are reportable. The
  `report_catalog_* drift vs live schema` CI check must stay green.
- Close or re-scope **crm7#660**, which overlaps this wave.

**Evidence:** a report can group contacts by organisation; the drift check passes.

---

## Wave 3 — The portal invite

The unblocking work. **0 of 50 people have `people.user_id`**, so no worker can use the
portal today.

### W3-1 · Invite table + RLS · `20260812060000`
**Repo:** crm7 · **Skills:** `auth-supabase`, `bsuite-rls-authz-red-team`, `check-security`

`people_portal_invites`: `person_id`, token **hash** (never the raw token), `expires_at`,
`accepted_at`, `created_by`, audit columns. Single use.

RLS: no client-side read of the token hash at all. **Revoke `anon` by name** (trap 3).

**Evidence:** pgTAP with an explicit `plan(N)` — `PERFORM` discards TAP output, so a test
without a declared plan can pass while asserting nothing. Prove `anon` and a signed-in
non-admin both get zero rows.

### W3-2 · Mint and accept RPCs · `20260812070000`
**Repo:** crm7 · **Skills:** `auth-supabase`, `auth-oauth-native-app-flows`, `check-security`

- `mint(person_id)` — staff only, gated on `check_user_portal_role(auth.uid(), tenant,
  ['owner','admin'])`, returns the raw token **once**.
- `accept(token)` — reachable by `anon` **by necessity**. Verifies hash, expiry, single use;
  on success writes `people.user_id = auth.uid()` and stamps `accepted_at`.

**Do not create the auth user at mint time.** Create on acceptance — an unaccepted invite
that has already minted an account is an orphan that looks like a user.

Both are `SECURITY DEFINER`: pin `search_path`, revoke `anon` from **mint** by name, and add
both to the advisor allowlist with justification (trap 4). `accept` joins the four existing
anon-reachable token endpoints tracked on bsuite#1869 — give it expiry and rate limiting from
day one.

**Evidence:** live, inside a rollback — an expired token is refused, a reused token is
refused, a valid token writes `user_id` exactly once. **Positive-control the refusals**: a
dead endpoint refuses everything perfectly.

### W3-3 · Send the invite
**Repo:** crm7 · **Skills:** `web-frontend-backend-mapping`

Use the existing communications path. Do not add a mail provider.

**Evidence:** a real email arrives with a working link.

### W3-4 · Portal onboarding
**Repo:** crm7 · **Skills:** `bsuite-page-grid-layout`, `web-forms-validation`, `test-playwright`

The portal reads `onboarding_status_for_person` and the requirements registry — the **same
resolver** `/people/onboard` uses, so the promise made at intake and the assessment made later
cannot disagree — and collects against it.

**`prevent_document_self_verification` must not be weakened.** A self-uploader may never mark
their own document verified.

**Evidence:** deployed test end to end as a real invited worker — accept, sign in, see the
requirements for their employment type, upload, and confirm the document shows **unverified**.

### W3-5 · Wire the invite into both onboarding paths
**Repo:** crm7 · **Skills:** `bsuite-page-grid-layout`

Add the invite step to `/people/onboard` and to the `/apprentices/from-candidate` landing.

**Evidence:** both paths end with an invite sent, and `people.user_id` is populated after the
worker accepts. Re-run the `0 of 50` query — it must no longer be 0.

---

## Wave 4 — The relationship-field widget

**Repo:** `packages/page-builder` (parent) + crm7 · **Skills:** `bsuite-shared-ui-rollouts`,
`bsuite-pnpm-monorepo`, `bsuite-page-grid-layout`, `web-forms-validation`, `bsuite-developer-portal`

The canvas has an **entity list** widget and no **relationship field**. That is why choosing
*Client* produced a table of every organisation.

### W4-1 · The widget
Second widget kind alongside the entity-list one: a typeahead over a single entity, scoped to
the caller's tenant, writing one foreign key on the host record. **Reuse `ClientSelector`'s
validation** — a picker that accepts a typed non-matching name recreates the orphan problem.

### W4-2 · The catalogue must say what is writable
The picker may only be offered where the host record **actually has a foreign key**. That is a
schema fact, read from the catalogue — otherwise the canvas offers relationships that cannot
be saved.

### W4-3 · Scope the existing list widget
Default the entity-list widget to the caller's tenant. A platform developer currently sees
every tenant's rows in it, so the same control shows different things to different people
with no indication.

**Rollout:** `packages/page-builder` is a published package — one publish workflow per
package, and a caret on a `0.x` version pins the minor (`^0.6.0` never resolves `0.7.0`).
Read `bsuite-shared-ui-rollouts` before bumping.

**Evidence:** place an organisation picker on the contact page through the canvas, with no
code change, and confirm it saves. That is the acceptance test for the whole wave.

---

## 5. Shipping

**Skills:** `ops-ship-all-apps`, `bsuite-ship-visual-promote`, `git-dev-main-reconcile`, `git-worktrees`

- Feature branch → `development` → parent pointer bump → `development` → **`main`**. Only the
  last step applies migrations.
- **Two or more agents on one submodule need separate worktrees.** A shared clone switches
  branches under them.
- Verify a gitlink is pushed **from the submodule** — the parent cannot see its objects.
- After any hotfix to `main`, **back-merge to `development`** or the next promotion conflicts
  on the gitlink.
- Commits must be GPG-signed; unsigned means Vercel silently cancels the deploy.
- **Never put a CI directive token in a commit message**, even quoting one. A message
  containing the skip-ci marker skips every check, including required ones, and the PR becomes
  unmergeable with no explanation.

## 6. Definition of done for the whole plan

- [ ] From `/people/new`, a contact at any organisation can be created **and the organisation
      assigned** — the original report, verified on the deployed site.
- [ ] The six duplicate organisations are one each, with Class A preservation passing.
- [ ] A duplicate ABN within an enterprise is refused; across enterprises it is allowed. Both
      demonstrated.
- [ ] `people.user_id` is populated for at least one real worker who onboarded themselves.
- [ ] An organisation picker can be placed on a page through the canvas with no code.
- [ ] Manuals live for all three roles, reachable in-app.
- [ ] `wiring-check.sh` clean — nothing built and unreachable.
- [ ] `agent-definition-of-done` D1–D7 returns **APPROVE**.

## 7. Not in this plan

- Decomposing the 1,816-line apprentice form.
- C1 — merging `employers` and `clients` structurally.
- Merging `training_providers` (8,119 reference rows).
- Any change to `prevent_document_self_verification`.
