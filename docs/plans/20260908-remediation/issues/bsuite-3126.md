# check-migration-owns-no-transaction names the wrong file, and add+remove passes silently — it banks a count, not a list

https://github.com/GaryOcean428/bsuite/issues/3126

Snapshot updatedAt: 2026-09-06T12:35:20Z. Open at capture; re-read live.

## What

`scripts/check-migration-owns-no-transaction.mjs` **names the wrong file** when it fires, and
a simultaneous add+remove passes it silently. Both come from banking a *count* rather than a
*list*.

## Measured

Found while gating crm7#2496. A `BEGIN;`/`COMMIT;` pair was deliberately injected into a
**crm7** migration to prove the gate bites. It bit — and reported:

```
::error::1 NEW migration(s) carry their own BEGIN;/COMMIT;
    packages/schema-builder/supabase/migrations/20260506000000_rename_physical_column_rpc.sql
```

A different file, in a different scope, that had not been touched.

**Cause** — line 250:

```js
for (const o of offenders.slice(-(offenders.length - banked))) {
```

`offenders` is accumulated in `SCOPES` order, and `packages/schema-builder` is last. So
`slice(-N)` always names the **last-scoped** offenders, never the newly-added one. The script
banks `BANKED = 44`, a **count**, so it structurally has no way to know *which* offender is
new.

## Two consequences, and the second is worse

1. **It sends a developer to edit an applied migration.** The named file is already applied,
   and this estate forbids rewriting applied migrations — the script's own header says so, and
   `docs/20260227-dry-one-shot-architecture-v1.04A.md:609` is the rule. The gate's remedy
   instruction points at the one action that is not allowed.

2. **A simultaneous add + remove passes silently.** Fix one banked offender and introduce one
   new one in the same PR: the count stays 44, the gate goes green, and a migration that owns
   its own transaction ships. That is the exact failure the gate exists to prevent.

## Why it survived

`--self-test` is **9/9 green**, and the string `offenders` appears **zero times** inside
`selfTest()`:

```
$ awk '/function selfTest/,/^}/' scripts/check-migration-owns-no-transaction.mjs | grep -c offenders
0
```

Every case exercises `transactionStatements()` — the parser. **None exercises the reporting
path.** The gate is thoroughly tested on the half that was already right.

## This is a recurrence, one day later

bsuite#3107 (2026-09-06) recorded exactly this: *"assert the OUTPUT a guard must produce, not
only its EXIT CODE"* — nine self-test cases, all green, every one asserting only an exit code,
while the new pass path was silent. Same shape, different script, next day.

## Fix

**Bank a list, not a count.** Store the offender paths, diff against them, and name the
entries that are genuinely new. That fixes both consequences at once: the diagnostic points at
the right file, and add+remove can no longer net to zero.

## Acceptance

- Injecting a transaction pair into a file in scope reports **that file**, by path.
- Removing one banked offender **and** adding one new one **fails**, naming the new one.
- `--self-test` covers the **reporting** path, not only the parser — with a case that would
  fail under the current `slice(-N)` implementation.
- The remedy text never instructs anyone to edit an applied migration.

Found while gating crm7#2496 (the live cross-host RLS leak), where this gate correctly caught
a real defect — the migration owned its own transaction, which on two of nine tables would
have failed **open**. It works; it just cannot say what it found.

