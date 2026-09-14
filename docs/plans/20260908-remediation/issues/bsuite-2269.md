# Weekly issue triage — Datum

https://github.com/GaryOcean428/bsuite/issues/2269

Snapshot updatedAt: 2026-08-24T02:25:41Z. Open at capture; re-read live.

## Standing thread for the weekly issue triage

Each week's digest is posted as a **comment on this issue**, so the history sits in one place
and week-over-week movement is readable by scrolling rather than by hunting.

### What the run does

Across all seven repos (`bsuite`, `crm7`, `business-suite-unified`, `conduit`, `R80.4`,
`braden`, `throughput`) it sorts every open issue into four buckets:

1. **Already fixed** — the defect no longer reproduces, established **by measurement**: reading
   current source, querying the live Supabase catalog, curling production, or reading live
   Actions runs. Never from the issue text, and never from a migration file (AGENTS.md
   tripwire 6).
2. **Duplicates and clusters** — issues sharing one underlying cause, named once with the
   ticket numbers listed under it.
3. **Stale** — no activity in 60+ days *and* no longer matching current architecture
   (R80.3 references, cookie SSO, superseded package versions, retired model names).
4. **The five that matter** — ranked, with one line each on why it earns its place. A defect on
   a production surface a person actually opens beats an internal cleanup every time.

### Method: plant a positive

Before any "this no longer reproduces" verdict, the probe must be shown to still **detect that
class of defect somewhere** — a known-good case, a planted absent object, a sibling that still
carries the bug. A probe that has never caught the thing it looks for is not evidence, only a
query that returned nothing.

This is not ceremony. In the first run, **three issues read as live defects until the control
was run** and turned out to be fixed; separately, one probe's control surfaced a finding
larger than the issue it was checking (315 tables carrying `anon` DML).

### Authority

**Comment and label only.** This run does not close, merge, or delete anything — closing is
Braden's call, and the recommendations are what he acts on. Every digest states its
recommended disposition; none of it is applied.

### Reading a digest

Verdicts are anchored to run logs, catalog rows, HTTP responses and file contents — not to
issue text. Where an issue's stated root cause is contradicted by its own evidence, the digest
says so. Where a probe could not settle something (auth-gated surfaces, ledger rows without
statement text), it is marked inconclusive rather than guessed.
