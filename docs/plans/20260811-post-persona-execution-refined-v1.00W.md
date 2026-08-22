# Refined execution prompt — closing the persona/red-team findings

**Tier:** Heavy · **Written:** 2026-08-11, after the persona, red-team, wiring and DoD stages ran.
**Operator gate (unchanged):** *"nothing can be moved on until all awards calculate perfectly."*

## Intent

Close the findings the adversarial stages produced, in leverage order — starting with the single cause
behind four of six developer-advocate failures — while the award engine continues toward the gate.

## Decomposition

| # | Workstream | Leverage | Repo |
|---|---|---|---|
| **W1** | **Fixed 44-entity catalogue → live registry** across 3 screens | **Fixes 4 of 6 dev steps with one change** | crm7 + BSU |
| W2 | Generated migration SQL not idempotent — `create policy` throws on re-apply | Blocks retry of any entity build | BSU |
| W3 | Two crm7 routes built with zero nav link | Working features nobody can find | crm7 |
| W4 | R80.4 `Save` → localStorage `r80_4_quotes_v1`, no UI caveat | Silent data loss shape | R80.4 |
| W5 | **45 rate-scope partials across 18 awards** | **The operator gate** | R80.4 |
| W6 | No worker / host-employer credentials — personas 3 and 4 unverified | Unblocks the persona stage | all |

## Best-practice citations

- **`CREATE POLICY IF NOT EXISTS` is not valid Postgres.** The repo's own migration doctrine already
  says so: `DROP POLICY IF EXISTS` then `CREATE`. W2's generator must emit that pair. This is the
  fourth time this exact rule has come up in this codebase.
- **`auth-e2e-sso-testing`** (never used) covers **password-grant session seeding** and custom
  `storageKey` discovery for BSU/Supabase OAuth 2.1 apps. **This is the answer to W6** — personas 3
  and 4 can be verified by seeding a session, without provisioning new accounts.
- **`check-dry-one-shot`** (never used) audits exactly W1's defect class: *free-text or fixed lists
  where an entity registry exists*, plus cross-app writes.
- **`biz-au-award-modelling`** — for W5, the source-of-truth ranking (MAPD API > pay guide > bundled
  table) and the harness proving the **shipped** path reproduces published dollars.
- **`awards/docx-text/`** is the clause authority. `awards/*.md` destroys `(a)/(b)/(c)` lettering.
- **FWC MAPD API:** paging truncates silently; a 200 with no `_meta` is an error; superseded rows sit
  beside current ones; **a classification NAME is not a unique key** — use `classification_fixed_id`.

## Blindspots to counter — every one drawn from a real failure this session

1. **Reporting capability at the wrong layer.** I did this three times: engine mistaken for product
   twice, dev build mistaken for production once. *Counter:* state which layer a claim is true at, and
   verify production by fetching the deployed bundle, not by reading a branch.
2. **A gate satisfied by describing the work.** Naming functions in a `reachability.mjs` comment
   flipped them to REACHED — the scanner whole-word matches its own comments. *Counter:* after
   touching any gate's inputs, re-run it and confirm the result changed for the right reason.
3. **A ledger status used as a lever.** Six false-completes. *Counter:* a partial closes only with
   code plus a test that fails without it.
4. **Local green ≠ CI green.** `audit` and `verify` are different scripts; only `audit` runs
   reachability and the schedule harness. *Counter:* run both.
5. **A fresh worktree has no `node_modules`** — `build` exits 0 with no `dist/`. *Counter:* install first.
6. **Unpushed work dies on a stall.** 40 minutes lost. *Counter:* push at the first commit.
7. **Promotion silently retargets open PRs to `main`.** It deleted `development` and GitHub
   re-pointed an open PR at production. *Counter:* check `baseRefName` before and after CI.
8. **Counting without partitioning** produced a false duplicate claim. *Counter:* state the GROUP BY.
9. **Trusting a success toast.** The developer advocate re-checked every save with direct SQL and was
   right to. *Counter:* verify persistence independently of the UI that claims it.

## Skills & MCPs to use

| Use | When |
|---|---|
| `check-dry-one-shot` | W1 — its exact defect class |
| `general-dry-one-shot-architecture` | W1 — one owning app per entity; others READ |
| `bsuite-developer-portal` | W1, W2 — the 16 tabs, schema-builder, known gaps |
| `bsuite-rls-authz-red-team` | W1, W2 — anything touching RLS or generated policy SQL |
| `auth-e2e-sso-testing` | **W6 — password-grant seeding, the unblock** |
| `test-playwright` | W3, W4, W6 — live verification |
| `bsuite-user-manuals-nav` | W3 — nav wiring precedent |
| `biz-au-award-modelling` | W5 — harness and source ranking |
| `agent-definition-of-done` | every stage close — D1–D7 |
| supabase · vercel · playwright · context7 · qig-memory MCP | live schema, deploy state, browser, library docs, coordination |

## The refined prompt

> Close these in leverage order. Each stage ends with both gates green, a DoD verdict, and — for
> anything user-facing — live browser proof at the deployed layer, not a branch.
>
> **W1 first, because it is one change that fixes four.** Three screens read a fixed 44-entity
> catalogue instead of the live registry of entities applied through `apply_feature_migration`. Replace
> the fixed list with a registry read. Prove it by creating an entity in the UI and watching it appear
> in the form builder's picker, in "browse existing entities", and in "assign to tenants" — then delete
> the test artefact and confirm the delete.
>
> **W2:** the generated migration must be re-runnable. `DROP POLICY IF EXISTS` then `CREATE`, never
> `CREATE POLICY IF NOT EXISTS`. Prove by applying the same entity twice.
>
> **W3:** wire `/settings/feature-flags` and `/settings/custom-pages` into navigation where a real
> admin would look, respecting existing section ordering.
>
> **W4:** either persist rate cards to the shared database, or say plainly in the UI that a save is
> device-local. Do not leave the current silence.
>
> **W5 continues in parallel** — 45 partials, allowance pricing first (MA000017 Schedule D's 32 rows,
> MA000036 Schedule F's ~84), then the missing junior/apprentice penalty functions.
>
> **W6 unblocks the persona stage:** seed worker and host-employer sessions via password grant rather
> than waiting for accounts, then finish personas 3 and 4.
>
> **Binding everywhere:** award text from `awards/docx-text/`. A ledger status is never the
> deliverable. Refuse rather than return a wrong number. Push early. Run `audit` **and** `verify`.
> Confirm PR base is `development` before and after CI. Verify production by fetching the deployed
> bundle. Nothing promotes without the operator's sign-off.

## Definition of done

W1 proven by a round-trip entity appearing in all three screens · W2 proven by double-apply · W3
reachable without typing a URL · W4 either persistent or honestly labelled · W5 measured before and
after on the same count · W6 personas 3 and 4 walked in a live browser · D1–D7 APPROVE per stage.
