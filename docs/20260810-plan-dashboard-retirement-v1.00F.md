# The plan-completion dashboard is retired

**Decision:** Braden, 2026-08-10. **Status:** done in this change.

> **FROZEN 2026-08-24 (W -> F).** `F` is the estate's completion marker — *Finalized, immutable* — and this is the first document to earn it.
>
> The operator's bar has two limbs and both are met, measured rather than asserted:
>
> **(a) It described something that was not best practice, and best practice has since been implemented.** The dashboard was named **"source of truth"** in every `AGENTS.md` and `CLAUDE.md` across the parent and five submodules, and had not been true since May. Today **zero** files make that claim: all ten that still mention it say it *was retired*. The doctrine was corrected, not merely the page removed.
>
> **(b) What it describes is proven, by direct measurement of its own three claims** — not by a citation standing in for one:
>
> | the doc asserts | measured 2026-08-24 |
> |---|---|
> | the URL no longer exists | `HTTP 404` |
> | the page is archived at the stated path | present, 6 files |
> | the three publishing workflows are deleted | 0 remain |
>
> Frozen means immutable. If any of those four measurements ever stops holding, this document is wrong and the marker must come off — that is the contract `F` carries.

`https://garyocean428.github.io/bsuite/` no longer exists. GitHub Pages is disabled
for this repository, the three workflows that published it are deleted, and the
page itself is archived under
[`docs/archive/20260506-plan-completion-dashboard/`](archive/20260506-plan-completion-dashboard/).

## Why

It was doctrine — every `AGENTS.md` and `CLAUDE.md` in the parent and five
submodules named it **"source of truth"**. It had not been true since May.

Measured on 2026-08-10, against the live repositories and database:

| The dashboard said | Actually |
|---|---|
| All six apps on `@bsuite/auth` **v0.2.0** | **0.2.8** in all six |
| Scope and issue table list **R80.3** | Archived; replaced by **R80.4** |
| bsuite **58** open issues | **42** |
| crm7 **77** open issues | **75** |
| "50 reports across 11 domains" | Report catalogue holds **84 entities** |

It also contradicted itself. `open_issues_total: 118` sat beside a per-repo
breakdown summing to **158**. `open_prs_total: 1` sat beside its own note saying
*"no open PRs were present"*. Two freshness fields disagreed by seven weeks:
`last_refresh: 2026-08-06` against `last_refreshed: 2026-06-07`. Every per-repo
card carried `open_issues: null` and rendered blank.

**The worst part was the parts that looked alive.** *"Loading dashboard status…"*,
*"computing…"*, and *"Gap audit running in background. Refresh this page when
complete — data will populate live."* Those were frozen placeholders from May. A
reader waited for something that was never coming.

## Why it could not be fixed by refreshing it harder

Two structural reasons, and both are worth remembering because they will recur in
anything that reports status.

**1. The generator was built to preserve the stale part.** `refresh-data.py` says so
in its own docstring: *"load the existing JSON to preserve hand-curated narrative
fields … then overlay live counts where they can be derived deterministically."*
So a handful of numbers ticked hourly while the prose around them stayed frozen at
6 May — and nothing on the page distinguished the two. A reader could not tell
which half they were looking at, which is worse than either half alone.

**2. Refreshing never republished.** The refresh committed with `[skip ci]`, which
suppressed the deploy workflow. Hourly data landed in the repo and stopped there.
The page happened to redeploy on 2026-08-09 only because the bsuite#1845 promotion
touched `docs/dashboard/**` four seconds earlier. So even the fresh numbers were
usually not the ones being served.

## This was already known

`S-4` in [`docs/20260728-weekly-gap-register-v1.00F.md`](20260728-weekly-gap-register-v1.00F.md)
recorded it on 2026-07-28: *"Dashboard — the doctrinal 'source of truth' — is
structurally unable to be true."* It sat for thirteen days. Retiring the page is
what closes S-4; there is no version of it that survives the finding.

## What replaces it

Nothing, deliberately. A stale status board is worse than none — it answers
questions confidently and wrongly, which is how the estate spent two days believing
migrations had shipped when none had. Ask the live sources instead:

| Question | Where the answer actually lives |
|---|---|
| What is open? | `gh issue list` / `gh pr list` against the repo |
| What is in the database? | `supabase_migrations.schema_migrations`, and better, assert the object — `to_regclass`, `pg_policy`, `information_schema` |
| Did a promotion apply? | The Supabase Migrations workflow run on `main` |
| What did we decide, and why? | [`docs/00-roadmap/20260808-operator-decision-register-v1.00W.md`](00-roadmap/20260808-operator-decision-register-v1.00W.md) |
| What is outstanding? | [`docs/OUTSTANDING.md`](OUTSTANDING.md) and the weekly gap register |
| Is irreplaceable data intact? | `scripts/verify-class-a-preservation.mjs --check <baseline>` |

If a status page is ever rebuilt, the rule it must satisfy: **show only what it
derives at render time, and print nothing it cannot recompute.** A field that
cannot be recomputed does not belong on a dashboard — it belongs in a dated
document, where its age is visible.

## What was NOT done, and why

The historical `docs/plans/**` documents still reference the dashboard. They are
left alone. They record what was true when they were written, and rewriting them
would destroy the record of what was decided and when — the same reasoning that
kept the archived copy rather than deleting it.

Only the **live instruction files** were corrected: `AGENTS.md` and `CLAUDE.md` in
the parent and in crm7, conduit, business-suite-unified, braden and throughput.
Those tell agents what to do now, and a rulebook pointing at a retired page is how
a dead source of truth stays authoritative.
