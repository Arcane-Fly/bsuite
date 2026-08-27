# Dashboards — the operator's scope ruling, and what it means for the build

**Date:** 2026-08-10 · **Status:** 1.00F · **Ruling by:** Braden, 19:57 AWST

## The ruling, verbatim in substance

> A developer can set defaults for all, visually in the UI — or none.
>
> The developer elects whether a dashboard shares **common data everywhere**. A dashboard of
> all qualifications up for expiry and the timeframe to teach them out can be common to all.
> A billable-hours report is tenant-specific, so the **same shared report** shows **only that
> tenant's billable hours** in each tenant. The same principle applies at user level.

## What it settles

I had asked a binary question — does a dashboard belong to a tenant or a user? The ruling
rejects the binary. There are **two independent axes**, and conflating them is the mistake:

| Axis | Question it answers | Values |
|---|---|---|
| **Definition scope** | Who can SEE and RUN this dashboard? | platform · enterprise · tenant · user |
| **Data scope** | Whose ROWS appear when they run it? | global (same for everyone) · tenant · user |

A single dashboard is a pair. The operator's own two examples are the two interesting corners:

| Example | Definition scope | Data scope | Result |
|---|---|---|---|
| Qualifications expiring, and time to teach out | platform (default for all) | **global** | every tenant sees the same rows |
| Billable hours | platform (default for all) | **tenant** | every tenant sees only their own hours |

The second is the one that matters architecturally: **one definition, N different answers.**
That is not a copy per tenant. It is one row in one table, run by different callers.

Plus: **"or none"** — a developer may publish a dashboard that is available but not defaulted
on for anyone.

## The good news: the hard half already works

`report_run_catalog_query` is `SECURITY INVOKER`, so **RLS decides the rows at run time, per
caller**. A shared definition therefore returns each caller's own data with no filtering logic
in the dashboard layer at all. Measured 2026-08-10, signed in as a real tenant user:

| Entity | Rows visible | Behaviour |
|---|---|---|
| `training_providers` | 8,119 / 8,119 | global — same for everyone |
| `units_of_competency` | 160 / 160 | global — same for everyone |
| `awards` | 156 | global — same for everyone |
| `qualifications` | **0 / 6** | tenant-scoped — other tenants' rows correctly hidden |

So "shared report, tenant-filtered data" is not a feature to be built. It is what the engine
already does by construction, and it would take deliberate effort to break it.

## What must be built

1. **A `dashboards` entity** carrying the pair: `definition_scope` + `is_default_for_scope`.
   The existing `report_templates.scope` is a SINGLE enum and cannot express the pair — that
   is the concrete schema consequence of this ruling.
2. **A layout** — N visuals on one canvas. `@bsuite/page-builder` already does drag-resize
   canvases across 382 crm7 files; this is reuse, not new infrastructure.
3. **A shared filter context** so visuals cross-filter. This is the genuinely new part.
4. **A developer UI to set the default** — "default for everyone / for this tenant / none".

## A correction to this document — the reference layer already does it

**Superseded 2026-08-10, same day.** This section previously said `tenant_scope` was
mislabelled on `training_providers` and `units_of_competency`, and told the next person to
fix the labels first. That was wrong, and acting on it would have made things worse. The
labels are correct. Recorded here rather than deleted, because the misreading is an easy
one and the reasoning is the useful part.

**What I got wrong.** I read `tenant_scope` as describing who *owns* the data, so 8,119
rows with `tenant_id IS NULL` looked like global data wearing a tenant-scoped label. The
vocabulary (set by migration `20260807074000`) describes the **column**, not the data:

| value | meaning |
|---|---|
| `tenant_column` | the table HAS its own `tenant_id`; the engine adds a predicate |
| `global` | no `tenant_id` column EXISTS; adding no predicate is correct |
| `fk_scoped` | no `tenant_id`; isolation rests on that table's own RLS |

`training_providers` has a nullable `tenant_id`, so `tenant_column` is right. A database
trigger enforces this and refused the relabel when I tried it.

**And the real design is better than the fix I proposed.** A nullable `tenant_id` makes the
engine emit `(tenant_id = $1 OR tenant_id IS NULL)`, so a tenant sees **every shared row
plus any row it added itself**. The schema says so outright — `training_providers.origin`
is an enum of exactly `official_register | user_added`:

| origin | `tenant_id` | who sees it |
|---|---|---|
| `official_register` | NULL | everyone |
| `user_added` | the tenant's | that tenant only |

That is this ruling's model, already built, at the reference-data layer. A GTO can register
its own RTO and see it in reports beside the 8,119 national ones, without it leaking to
anyone else. Flattening those entities to `global` would have thrown that away.

Proven end to end in `crm7/supabase/tests/database/68_global_reference_scope.sql` (11
assertions, merged as crm7#1574): a tenant user runs one report definition and gets the
shared row **and** its own, and **not** a rival tenant's.

## The thing that does still need care

The engine's nullable branch carries this comment:

> "Not reachable today (no seeded entity has one) but shaped correctly in case one ever does."

That is false. `training_providers`, `units_of_competency` and `qualifications` all take it.
Delete it as dead code and 8,279 rows of national training data drop out of every report at
once — silently, because a report returning nothing reads as "no data", not as a fault.

It is now documented as load-bearing on the function, and suite 68 §B fails if the branch
ever stops being reachable.
