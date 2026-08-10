# Dashboards — the operator's scope ruling, and what it means for the build

**Date:** 2026-08-10 · **Status:** 1.00W · **Ruling by:** Braden, 19:57 AWST

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

## One correction the ruling exposes

`tenant_scope` on `report_catalog_entities` is the field a developer would read to decide
"is this common or tenant-specific?" — and it is **wrong for at least two entities**.
`training_providers` (8,119 rows, every one `tenant_id IS NULL`) and `units_of_competency`
(160, all NULL) are catalogued `tenant_column` when their data is global.

Run-time behaviour is correct anyway, because RLS decides and not the label. But if the
dashboard builder surfaces this label to the developer making the common-vs-tenant choice,
it will tell them the wrong thing. Fix the labels before building the chooser on top of them.
