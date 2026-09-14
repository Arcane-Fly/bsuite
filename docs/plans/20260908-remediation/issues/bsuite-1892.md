# No environment can validate a database migration before production — dev app runs dev code against a main-state database

https://github.com/GaryOcean428/bsuite/issues/1892

Snapshot updatedAt: 2026-08-24T03:26:13Z. Open at capture; re-read live.

Surfaced by live testing on 2026-08-11. A tester reported "the migration applier has stalled". **It has not** — but the observation underneath was right, and points at something structural.

## The measurement

| | version |
|---|---|
| Applied to the shared database | `20260812080000` |
| Highest on **`main`** | `20260812080000` — **exact match** |
| Highest on **`development`** | `20260812164500` |

The applier is working exactly as designed: migrations apply on promotion to `main`.

## The structural gap

There is **one** shared Supabase project. `d.crm.crm7.app` serves `development` **code** but talks to a database at **`main`** state.

So any feature whose behaviour depends on a migration **cannot be validated anywhere** before it reaches production:

- a Vercel preview can't be signed into (ephemeral host isn't a registered redirect URI)
- the dev site has the code but not the schema
- production has both — and is the first place the two ever meet

Two features confirmed dead on dev today for exactly this reason, both correctly merged:

1. **National qualifications register** (crm7#1589) — the catalogue entry doesn't exist in the database, so the report builder shows only the old "Qualifications" (6 rows), not the 5,243-row register.
2. **Developer console table listing** — the RPC fix is merged but its migration isn't applied, so `/developer/database` still says "No tables found", the exact bug it fixes.

Neither is a code defect. Both are correct code awaiting schema.

## Why it matters beyond inconvenience

This is the **"merged is not applied"** failure with no safety net. The gate that would catch a bad migration is production. Today that produced two invisible features; the same gap would equally hide a migration that *breaks* something, and the first person to find out would be a user.

## Options, none obviously right

1. **A dev branch database** (Supabase branching) that `d.*` hosts point at, applied from `development`. Real isolation; costs money and adds a second schema to keep honest.
2. **Apply from `development` to the shared database.** Cheap, but then `main`-state and `development`-state schema are the same database and a bad migration hits production data.
3. **Accept it, and make it explicit** — state in the promotion checklist that migration-dependent features are unvalidated until promotion, so nobody reports "tested on dev" for something that couldn't have been.

Option 1 is the only one that actually closes it. Raising rather than choosing — this is an infrastructure and cost decision.

Related: crm7#1601 (dev sign-in broken) compounds this — even non-migration features can't be validated signed-in right now.
