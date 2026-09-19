# Rehearsing a database change on your own machine

**Status:** v1.00W · Added 2026-08-13 · Audience: the platform operator and anyone about to ship a
database change.

---

## The short version

```bash
cd ~/Desktop/Dev/bsuite
git submodule update --init --recursive     # first time only
pnpm supabase:rehearse
```

It builds a throwaway copy of the production database on your laptop, applies every pending database
change to it in the real order, and tells you whether the one *you* changed actually did anything.
It takes about four minutes. Nothing it does can reach production.

Add `--keep` (`pnpm supabase:rehearse:keep`) to leave the database running afterwards so you can
point an app at it and click around. Stop it with `pnpm supabase:rehearse:stop`.

---

## Why this exists

A **migration** is a file of database instructions — "add this table", "add this column". Migrations
are how the database changes shape.

The problem this solves is structural, and it has cost us real incidents:

- There is **one** shared Supabase project. Not one for testing and one for real — one.
- The development site, `d.crm.crm7.app`, runs the *development code* against the *production
  database shape*.
- So there was **nowhere** a database change could be tried out before it went live. Production was
  the first place a new migration and the code that depends on it ever met.

Every migration therefore shipped on reasoning alone — somebody read the SQL and decided it looked
right. That is exactly the situation in which the failure below survives review.

### The specific failure this catches

The single most expensive defect in this estate's history looks like this:

```sql
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  a_new_column text          -- ← the whole point of the migration
);
```

`public.user_tenants` **already exists**. `IF NOT EXISTS` therefore tells the database to skip the
entire statement — including the new column. The database reports success. The migration ledger
records it as applied. Every text-based check in the estate passes it, because the SQL is perfectly
valid. The column simply never appears, and the feature that needs it fails in production for
reasons nobody can see.

This is why the rehearsal is built the way it is. It does **not** ask "did the migration report
success?" — that question returns yes for the defect above. It photographs the database catalogue
before and after (tables, columns, policies, grants, indexes, constraints) and asks **did anything
actually move?** A migration that reports success and moves nothing is failed, not passed.

It also replays onto a **copy of the real production schema**, not an empty database. On an empty
database the statement above would genuinely create the table *with* the new column and look
perfectly fine. Replaying onto empty is how this defect hides.

---

## What you will see

Five phases, in this order. The order matters — the instrument is checked before it is trusted.

| Phase | What it means |
|---|---|
| **Preflight** | Counts the migrations in each of the six apps, and the baseline. If an app is missing it stops. A rehearsal missing an app is not a rehearsal — it would find nothing wrong and call that a pass. |
| **Port check** | Makes sure it is about to talk to *its own* database and not one of yours. See "If you see..." below. |
| **Selection self-test** | Proves the *selector* can discriminate — that a migration absent from the applied-versions artefact is replayed even when it sits below `BASELINE_MAX`, and that 0-selected can never read as green (bsuite#3147). Needs no database. |
| **Positive control** | Feeds the checker a good migration, a broken one, and a silent no-op, and requires it to get all three right. **If this step fails, stop** — the instrument is broken and nothing below it means anything. |
| **Substrate** | Builds the production baseline: ~363 tables, ~983 security policies, Postgres 17.6 — the same major version production runs. Since bsuite#3147 it also seeds `supabase_migrations.schema_migrations` from the applied-versions artefact, so the substrate and the replay skip-set describe the same posture. |
| **Rehearse** | Replays every migration the tree still needs in global version order, then reports on the ones you changed. |

The verdict for each migration you changed:

- **APPLIED** — it ran and the catalogue moved. It lists exactly what appeared. This is what you want.
- **NOOP** — it ran, reported success, and **changed nothing**. This is the failure described above.
  Fix it, or if the migration genuinely only moves *data* rather than changing shape, mark it with a
  line reading exactly `-- rehearsal: data-only`.
- **FAILED** — it errored. The first few lines of the database's complaint are printed.
- **in-baseline / below-floor** — already recorded in the applied-versions artefact that ships beside
  the baseline dump (`crm7/supabase/migrations/baseline/applied-versions-*.txt`), or older than the
  cutoff. Since bsuite#3147 the in-baseline rule is **membership**, not version arithmetic: a
  migration whose version is below `BASELINE_MAX` but which the artefact does not record is
  *replayed*, not skipped — that is the planted control that caught the old rule going blind.
  Not judged; nothing to do.

The script exits non-zero and says **"this would not have been safe to ship"** if anything you
changed came back NOOP or FAILED.

---

## Proof that it actually catches things

A check nobody has watched reject a bad change is not a check. This one was proven on 2026-08-13 by
planting two migrations and running the real pipeline over them:

| Planted | Result |
|---|---|
| A migration that creates a real table | **APPLIED** — reported +1 table, +2 columns, +22 grants, +1 index, +1 constraint |
| `CREATE TABLE IF NOT EXISTS` on the existing `public.user_tenants`, adding a column | **NOOP — rejected, exit 1** |

Both directions. It passes good work and catches the estate's exact historical defect. The built-in
positive control (which runs on every invocation) independently reproduces all three verdicts, so
you do not have to take this table's word for it — you watch it happen each time you run.

The planted files were deleted and never committed.

---

## If you see...

**"port 54522 is held by container 'supabase_db_crm7'"**
Something else is already using that port. This message is a **safety refusal, not a bug**. The
first thing the rehearsal does is drop every table in the `public` schema — against the wrong
database that is not a wrong answer, it is your local data destroyed. (Measured: crm7's local
database had 354 tables in it at the time this was built.) Either stop that stack, or give the
rehearsal a different port: `bash scripts/supabase/rehearse-local.sh --port 54622`.

**"submodules not checked out"**
`git worktree add` does not bring the apps with it. Run `git submodule update --init --recursive`.
Without them the rehearsal would replay 22 of 780 migrations and cheerfully report success.

**"baseline dump missing"**
Same cause — the baseline lives inside the crm7 app directory. Same fix.

**"no applied-versions-*.txt found"** or **"N applied-versions artefacts found"**
The in-baseline rule is **membership** (bsuite#3147): the rehearsal skips only migrations recorded
in `applied-versions-*.txt` beside the dump, so that artefact is required, and exactly one of it.
Missing means the submodules are not checked out; more than one means a stale artefact was left
behind after a baseline refresh. Remove the stale one(s) — the engine fails closed rather than
guessing which file is production's.

**"0 migrations selected for replay"**
The selection rule skipped the entire estate and the run refuses to read that as "nothing to do".
This is a hard stop added by bsuite#3147: a refreshed baseline with a raised `BASELINE_MAX` used to
silently select zero migrations for two months while CI stayed green. If you see it, the
applied-versions artefact and the tree have come apart — check which migrations the artefact
records versus what the scopes actually contain.

**"the docker daemon is not reachable"**
Docker isn't running. Start it.

**"the self-test did not reproduce its expected verdicts"**
The checker itself is broken. Do not trust, and do not report, any result from that run.

**The positive control passes but everything else fails**
Look at whether the baseline applied. A partially-built substrate produces failures that belong to
the instrument and read exactly like defects in your code.

---

## How this differs from the CI check, and why

`.github/workflows/supabase-migration-rehearsal.yml` runs the same engine automatically on every
pull request that touches a migration. This script is the same check on your machine, **before** you
push. Two deliberate differences:

1. **It uses its own isolated Supabase project** (`bsuite_rehearsal`, port 54522) rather than the
   shared 54322 that every app in this estate uses. On a CI runner nothing else exists, so 54322 is
   safe there. On a laptop it is the difference between a rehearsal and deleting your own work.
2. **It never moves your tracked files.** The CI job has to shuffle `supabase/migrations` aside
   before starting the database. On a disposable runner an interrupted shuffle costs nothing; on
   your machine it strands 22 tracked files in `/tmp` and makes the repository look like someone
   deleted them. Booting from a temporary project directory removes the need entirely.

Everything that produces the **verdict** — the replay engine, the baseline, the catalogue census —
is shared with CI, so a local pass and a CI pass mean the same thing.

`--keep` is the part CI structurally cannot do. A CI runner has no browser and no app, so it can
only answer "does the SQL apply". Keeping the database up lets you answer the other half: *does the
feature actually work against the resulting schema.* For anything user-facing, do that before you
call it done.

---

## Related

- [`20260716-database-migration-dispatch-guide-v1.00W.md`](20260716-database-migration-dispatch-guide-v1.00W.md)
  — how a migration gets from a merged pull request to the live database. Read that for shipping;
  this one is for checking before you ship.
- `scripts/supabase/rehearse-local.sh` — this script; `--help` prints its full reasoning.
- `scripts/supabase/rehearse-migrations.mjs` — the replay engine, shared with CI.
- `scripts/supabase/rehearsal-bootstrap.sh` — builds the production-baseline substrate.
- `.github/workflows/supabase-migration-rehearsal.yml` — the automatic version.
