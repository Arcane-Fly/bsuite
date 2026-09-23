---
kind: record
authority: none
owner: bsuite
---

# A half-built Supabase preview branch is reused by the next run, so every rerun collides on its predecessor's partial state

https://github.com/GaryOcean428/crm7/issues/2514

Snapshot updatedAt: 2026-09-07T05:57:31Z. Open at capture; re-read live.

## What

A Supabase preview branch that fails partway through its migrations is **reused in that broken
state by the next run**, so every subsequent run on the same git branch dies on a collision
against the partial state its predecessor left behind. Nothing resets it.

It is currently blocking two PRs, including a promotion carrying a **live cross-tenant read**
fix.

## Measured — same cause, three different collisions

| branch | preview ref | died on |
|---|---|---|
| `development` | `qljcxqkyskikpkfjgjsr` | `duplicate key value violates unique constraint "schema_migrations_pkey", Key (version)=(20260922000000)` |
| `fix/lighthouse-cannot-audit-a-signed-in-route-on-push` | `wksyezpawchagxvcsgzc` | `type "dashboard_data_scope" already exists (SQLSTATE 42710)` |
| `perf/table-row-audit` | `fyenkvxpzznpfsgcgyup` | — |

**All four branches** — including `main`, which *is* the production project
`tuybltdrdefjblnplpqo` — report `status: MIGRATIONS_FAILED`.

The collisions differ (a ledger row, a type) because they depend on **how far the previous run
got before failing**. That is the signature of resumed partial state, not of a bad migration:
a genuinely broken migration fails at the same statement every time.

## The reuse is explicit, in the workflow's own words

`e2e.yml`'s cleanup step:

> "Could not delete the preview branch for '$HEAD_REF'. **It will be reused by the next run on
> this branch**, and the Supabase integration removes it when the PR closes."

So deletion is best-effort, reuse is the documented fallback, and **nothing checks whether what
is being reused is usable**. A branch left half-built by a failed run is handed to the next run
as if it were clean.

## What is working, and should not be changed

Both jobs **refuse** rather than proceeding:

> "The branch is half-built; refusing to hand it to a suite that would report its emptiness as
> failing specs."

That is the correct behaviour and the only reason this was diagnosable. A suite that ran against
an empty database would have reported its emptiness as failing specs, and someone would have
gone looking for the wrong bug. **Do not soften the refusal** — the defect is upstream of it.

## Confirmed remedy, and why it is not the fix

Resetting the branch works: `development` was reset, the `lighthouse` `pull_request` run then
**passed**, having failed immediately before. So the diagnosis holds.

But a human resetting a branch by hand each time a run fails is not a control — it is a person
standing in for one. Note also that **`reset_branch` returns `success: true` while leaving
`status: MIGRATIONS_FAILED` and `updated_at` unchanged**, so the status field cannot be used to
confirm the reset landed; only a rerun tells you.

## What this needs

1. **Make reuse conditional on health.** Before reusing a branch, check its status; if it is
   `MIGRATIONS_FAILED`, reset or recreate it rather than applying onto it.
2. **Make the failed-delete path loud.** Today a failed deletion downgrades to a `::warning::`
   and the run continues. That warning is the moment the next run's failure becomes inevitable.
3. **Decide what `MIGRATIONS_FAILED` on `main` means.** It is the production project, it has
   read that way since **2026-08-26**, and production serves correctly — a migration applied
   cleanly against it on 6 September. Establish whether it is stale metadata or a real
   unresolved apply, and record which. A status nobody reads is not a status.
4. Related: **crm7#2512** — the production migration-history audit was deleted on 2026-07-28 and
   never replaced, and four ledger rows carry `NULL` statements. That is the same family: state
   the ledger cannot attest to.

## Acceptance

- A run that finds a `MIGRATIONS_FAILED` preview branch resets it and proceeds, or fails with
  that named reason — never applies onto it.
- A failed branch deletion fails the run or is otherwise surfaced, rather than warning and
  continuing.
- `main`'s status carries a dated disposition.
- Reproduce: fail a migration partway on a preview branch, rerun, and confirm the second run
  does not collide.
