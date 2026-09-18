---
kind: record
authority: none
owner: bsuite
---

# The production migration-history audit was deleted 41 days ago and never replaced — its script is npm-wired and CI-unreferenced

https://github.com/GaryOcean428/crm7/issues/2512

Snapshot updatedAt: 2026-09-06T17:49:04Z. Open at capture; re-read live.

## What

The production migration-history audit was **deleted on 2026-07-28** and never restored. Its
script still exists and is still wired into `package.json` — but **no workflow calls it**, so
the capability is present and nothing runs it.

Forty-one days later, the exact drift it existed to catch blocked a promotion.

## Measured

- **`1d2b876bb`, 2026-07-28** — *"fix(deploy): disable broken production migration-history
  audit"*. `.github/workflows/prod-migration-history-audit.yml` deleted. Honestly labelled: it
  **was** broken — 62 runs, **54 failures / 8 successes**, an 87% failure rate.
- **Last run: 2026-07-27.** GitHub has no registered workflow by that name today.
- **`crm7/scripts/audit-supabase-migration-history.mjs` survives**, referenced by `package.json` and
  its own test file, and by nothing in `.github/`. `scripts/audit-prod-migration-history.mjs`
  exists in the parent repo as well.
- No replacement: no workflow greps for `schema_migrations` drift or `statement_count` (the two
  hits, `pgtap.yml` and `db-lint.yml`, do different jobs).

## What it was for, and what happened without it

The audit's own documented purpose — recorded in
`crm7/supabase/migrations/CLAUDE.md`, §2026-06-10 — is that
`supabase migration repair --status applied` can insert a `schema_migrations` row **without
running the migration SQL**, producing a row with `statement_count = 0`: a claim that something
ran, with no record of what. The file says plainly: *"do not auto-repair it… verify the live
schema/ACL/policy/function state against the migration file."*

Today, three crm7 versions sit in the shared production ledger with **`statements` length 0**:

```
20260916000000  branding_rpc_ignores_the_acting_tenant                   stmts 0
20260919000000  r8_quote_return_tickets                                  stmts 0
20260922000000  guard_the_two_unguarded_cross_tenant_sharing_readers     stmts 0
```

(For contrast, `20260906120000`, applied and recorded by hand earlier today, carries **19**.)

The consequence surfaced as a **blocked promotion**, not as a database fault. The Supabase
preview branch build re-applied those versions and died on:

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20260922000000) already exists.
```

The job then refused correctly — *"The branch is half-built; refusing to hand it to a suite that
would report its emptiness as failing specs"* — which is good design and is why this was
diagnosable at all.

## The shape worth naming

The commit message is accurate: the gate **was** broken. Disabling a gate that fails 87% of the
time is defensible. What did not happen is the second half — **the capability was never
restored, and nothing recorded that the estate was now unguarded against this class.** The
script sitting in `package.json`, callable and uncalled, is the tell: it reads as covered.

A gate removed for being broken and a gate that was never needed look identical six weeks later.

## Also worth checking

`list_branches` reports the **`main` branch — which is the production project
`tuybltdrdefjblnplpqo`** — with `status: MIGRATIONS_FAILED`, `updated_at 2026-08-26`. Production
serves correctly and a migration applied cleanly against it today, so this is not an outage;
it is a status nobody is reading. Determine whether it is stale metadata or a real unresolved
apply, and say which.

## What this needs

1. **Fix the audit rather than leaving it deleted**, or state explicitly that the class is
   accepted and why. The 87% failure rate is itself a finding — establish whether it was failing
   on real drift (in which case the drift has gone unexamined for six weeks) or on a broken
   query.
2. **Wire the surviving script to something.** An npm script no workflow calls is not a control.
3. **Disposition the three 0-statement rows** per the recorded procedure — verify live
   schema/ACL/policy state against each migration file, then either forward-fix or document why
   each is a genuine no-op. Do **not** auto-repair.
4. **Add the preview-branch failure mode to the audit**, since that is how this surfaced: a
   half-built branch is a downstream symptom of ledger drift and was the loudest signal in six
   weeks.

## Acceptance

- A workflow runs the migration-history audit on a schedule, and it is **green** — or a dated
  document states the class is accepted, names who accepted it, and what replaced it.
- The three 0-statement rows each carry a disposition backed by a live check.
- Removing the audit again fails a test, so "disabled and forgotten" cannot recur silently.

Found while diagnosing a red `lighthouse` check on crm7#2505 (a promotion carrying a live
cross-tenant read fix). The preview branch was reset to unblock it.
