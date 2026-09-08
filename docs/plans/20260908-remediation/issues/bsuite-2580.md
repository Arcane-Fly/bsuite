# D-139 scoped: no shared list component exists, the 'inspiration' repo is licence-barred, and the class is invisible to sibling_class

https://github.com/GaryOcean428/bsuite/issues/2580

Snapshot updatedAt: 2026-09-06T09:16:39Z. Open at capture; re-read live.

One of four **cross-cutting** operator asks `estate-align` reports. Filed here because the operator-notes register has no status column to record an answer in.

> **D-139** — *"anything that lists rows like this needs to be brought up to the airtable style design which is still itself sub par. Take inspiration from the GaryOcean428/atmosphere setup."*

## The reference repo is legally unusable, and that was already ruled — twice

`GaryOcean428/atmosphere` is a **rebranded fork of NocoDB** — nine renamed packages, tagline copied verbatim — still carrying `"license": "Sustainable Use License"`. A 2026-08-08 ruling found that licence **bars BSuite use**.

Recorded in `docs/20260822-data-surface-consolidation-decision-v1.00D.md` and the superseding `docs/20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md`.

**So "take inspiration from atmosphere" cannot mean adopt its code.** That door is shut and this issue does not reopen it. What survives is the UX reference: atmosphere is itself just a self-hostable Airtable alternative, so the ask collapses to *"make list surfaces Airtable-style"* — which is independently specific.

## What the operator actually means, from his own words

The register gives no definition, but sibling asks in the same addendum attach concrete criteria to specific pages, which D-139 generalises:

| ask | criterion |
|---|---|
| D-110 | *"presented in a filterable list/table preferably airtable style… filterable by attribute"* |
| D-111 | per-tenant visible/hidden columns and rows; *"Search all, search Active"* |
| D-134 | *"list all placements in a table filterable all active and past and pending etc. customizable columns"* |
| D-138 | related-record tables, *"easily and filterable in tables"* |

Plus the R-1…R-20 requirement register already written in `20260822-data-surface-consolidation-decision-v1.00D.md`: opens on data not a form, column-header filters, grouping with subtotals, saved/shared views, persisted sort, inline edit, add-row.

## There is no shared list component. There are forks.

Method: `grep`/`find` across each app's `src/`, plus package-consumer checks. **This is a grep-derived hypothesis, not a browser measurement** — it over-counts (component definitions mixed with call sites) and under-counts (it cannot see hand-rolled `.map()`-over-`<Card>` lists that use no table primitive).

| signal | crm7 | BSU | conduit | braden | throughput | R80.4 |
|---|---|---|---|---|---|---|
| `@bsuite/data-grid` importers | 5 | 0 | 0 | 0 | 0 | 0 |
| `@tanstack/react-table` declared | yes | yes | no | no | no | no |
| shadcn `ui/table.tsx` vendored | yes | no | no | yes | no | no |
| consumers of that `<Table>` | 94 | 0 | 0 | 12 | 0 | 0 |
| `EnhancedDataTable` / `ReportTable` / `uplift/DataTable` | 38 / 13 / 2 | — / — / 9 | — | — | — | — |
| raw `<table` in tsx | 21 | 25 | 4 | 1 | 1 | 0 |
| **union, distinct files** | **185** | **40** | **5** | **18** | **1** | **0** |

R80.4's three raw hits were false positives — award-rate arrays, not UI. It has four page files total and effectively no list-surface footprint.

**Three rendering strategies coexist inside crm7 alone**, in the very pages the operator's sibling asks name:

- `crm7/src/pages/leads/index.tsx:434` — hand-rolled shadcn `<Table>`, page-local filter/sort/paginate
- `crm7/src/pages/hosts/index.tsx:416` — a **separate** hand-rolled `<Table>`, not shared with leads
- `crm7/src/pages/training-providers/index.tsx:281` — **no table at all**, a `CanvasCard` grid of tiles. This is the exact page D-110 named as needing a filterable Airtable-style table.

**And the cross-app "shared" components are forks that have drifted:**

| pair | divergence |
|---|---|
| `crm7/src/components/uplift/DataTable.tsx` vs BSU's | **999 diff lines** |
| `crm7/src/lib/page-builder/EntityTableWidget.tsx` vs BSU's | **641 diff lines** |

Same names, same doctrine reference, forked rather than extracted into `packages/`, drifted independently since.

## The class is invisible to the estate's own class-enforcement

`bsuite-feature-index.json`'s `sibling_class` field — the mechanism ADR-0010 relies on — has **zero** rows tagged anything like `list-surface` or `data-table`. The class is real and demonstrated above with file:line evidence, but `estate-align`'s `siblingClassViolations` cannot see it until someone assigns it.

## What closing this requires

1. **Ratify or replace** `20260822-data-surface-consolidation-decision-v1.00D.md` — Status **D, not ratified**, `review_by: 2026-09-05`, with four items still needing an operator ruling in its §9. It covers crm7's report/browse engine **only** — not `/leads`, `/hosts`, `/training-providers`, or any app outside crm7.
2. **Pick one grid engine and make it a real `packages/` dependency.** Today only `@bsuite/data-grid` is a package at all, used in 5 files in 1 app.
3. Migrate or wrap the bespoke per-page implementations, one at a time.
4. **Tag the rows with a shared `sibling_class`** so ADR-0010's enforcement can see the class exists.

Multi-week, cross-repo. Not a component swap. Not further broken down because no operator ruling exists to scope it against.

