# A migration can depend on an ancestor no replay path runs, and it is only caught at the parent pointer bump

https://github.com/GaryOcean428/bsuite/issues/3136

Snapshot updatedAt: 2026-09-07T09:43:20Z. Open at capture; re-read live.

## The class

A migration can depend on an object created by an **ancestor that no replay path runs**. It
applies cleanly on production — where the object already exists — and fails only when the tree
is rebuilt from scratch. Nothing catches it at authoring time.

Found on bsuite#3119, in a file I shipped:

```
psql:.../crm7/supabase/migrations/20260906120000_host_supervisor_employers_clients_scope.sql:151:
ERROR:  function public.is_host_supervisor_of_tenant(uuid) does not exist
```

Fixed for that instance in crm7#2526. This issue is the **class**, not the instance.

## The two structural holes that produce it

**1. `archive/` is invisible to replay.** `scripts/supabase/rehearse-migrations.mjs` discovers
migrations with:

```js
for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!entry.name.endsWith('.sql')) continue;
```

No recursion, so `archive/` and `baseline/` are never replayed. Moving a migration into
`archive/` therefore **silently deletes whatever it created** from every future rebuild — and
nothing warns. In this case the archived file was the sole creator of two RLS helpers.

**2. The substrate is a point-in-time dump.** The rehearsal bootstraps from
`crm7/supabase/migrations/baseline/20260807_prod_baseline_schema_dump.sql`. Anything created
**after 2026-08-07** by a migration that is below the floor, in-baseline, or archived exists on
production and nowhere in the replay. Measured, with controls:

| symbol | occurrences in the 2026-08-07 dump |
|---|---|
| `is_host_supervisor_of_tenant` | **0** |
| `get_host_employer_id_for_tenant` | **0** |
| `auth_tenant_id` (control) | 17 |
| `is_platform_developer` (control) | 9 |

## Why the existing gate does not catch it early enough

The rehearsal **does** catch it — that is how it was found, and the gate did its job. The problem
is **when**: only once the migration reaches a PR that replays the whole tree, which for a
submodule is the **parent pointer bump**, potentially days after the migration went to
production. By then the migration is applied and cannot simply be edited, because
`Production migration history drift` compares the tree against the ledger.

So the failure is discovered at the point where it is most expensive to fix.

## Suggested gate

At **authoring** time, in the scope's own CI: for each migration changed by the PR, resolve
every `public.<fn>(...)` and every relation it references against **the set of objects the replay
path can actually create** — the substrate dump plus non-archived, at-or-above-floor migrations
with a lower version. Fail with the missing symbol named.

The cheap version catches this exact case: **any symbol referenced by a changed migration that
appears in `archive/` but not in the substrate dump and not in any replayable migration.**

Also worth doing independently, and cheaper still: **fail when a file is moved into `archive/`
if anything it `CREATE`s is still referenced by a replayable migration.** That is a pure
tree-level check needing no database.

## Acceptance

- A migration referencing a symbol no replay path creates **fails in its own scope's CI**, not
  three days later on a parent pointer bump.
- The check names **the missing symbol and the file that used to create it** — not just a count.
  (Same requirement as bsuite#3126: a gate that banks a count instead of a list cannot tell
  "checked nothing" from "found nothing".)
- A **positive control**: plant a reference to a deliberately absent function and watch the gate
  fail by name. A gate that has never been seen to fail is not known to work.

## Related

- crm7#2526 — the instance fix
- bsuite#3126 — the migration gate that banks a count rather than a list
- crm7#2512 — the production migration-history audit deleted 2026-07-28 and never replaced
- crm7#2514 — half-built Supabase preview branches reused broken

## Not this issue

The same run reports three **pre-existing** replay failures, untouched estate debt:

- `conduit/…20260816030000_conduit_451_signing_token_oracle_and_throttle.sql` — `relation "public.document_signing_tokens" does not exist`
- `business-suite-unified/…20260821050000_platform_oauth_client_registry.sql` — `cannot change return type of existing function`
- `business-suite-unified/…20261119235000_a_recruiter_can_book_on_a_colleagues_calendar.sql` — `relation "public.capability_catalogue" does not exist`

The run's own advice is to track each in the owning scope's `KNOWN-BROKEN-IN-CI.txt` or fix it.
Two of the three are the **same class as this issue** — a migration whose prerequisite the
replay never creates.
