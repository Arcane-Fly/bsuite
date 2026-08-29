# `@bsuite/data-grid` Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this package
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] — 2026-08-30 — Controlled sorting, so a host can persist it

### Added

- **`sortBy` / `onSortByChange`** — seed the grid's sort and observe changes, so a host can
  persist the reader's choice. **Uncontrolled when omitted**: the grid keeps its own sort,
  exactly as before.

### Why

crm7's `ReportTable` saves the chosen sort as a view preference. The grid's sort was
internal state, so converting that surface without this would have dropped the saved sort
on every reload — **the list still renders, the sort silently is not the one they chose,
and nothing fails.** That is the regression shape this package keeps having to design out,
and it is the same reason 1.2.0 added grouping.

### Detail worth knowing

The seeding effect compares by **value**, not identity. Comparing by identity would re-seed
on every render for any caller that builds the array inline — which is most of them — and
that would fight the reader's own clicks on the header.

### Verification

14/14 tests, of which **2 fail with the seed disabled** — checked by disabling it.

One of those two originally passed *with the seed disabled*, because it asserted only the
first row and the fixture's first row was the same in source order. It tested nothing. The
control caught it and the assertion now checks the **full** sequence.

## [1.2.0] — 2026-08-30 — Grouping, so the report surfaces can convert

### Added

- **`groupBy`** — group rows by a column id, or `null` for a flat grid. Controlled by the
  host so the choice can be persisted, because a locally-held copy would silently diverge
  from a saved view preference on reload.
- **`groupExpanded` / `onGroupExpandedChange`** — collapse state per group, so a host can
  persist it. Default is **expanded**: a grid that opens with every group shut shows a list
  of headings and none of their data, which is a worse first screen than the flat grid it
  replaced.

### Why this exists

crm7's `ReportTable` (832 lines, **7 consumers**, including the report viewer at
`/reports/:key`) lets a reader choose a groupBy column and persists it. Converting those
surfaces to a grid with no grouping would have **deleted a feature people use** — a
regression wearing a migration's clothes. That is the reason the report pages stayed
hand-rolled while the rest of the estate converted, and this release removes the blocker
rather than working around it.

### Behaviour worth knowing

- A **group header is not a record.** It spans the full width, carries its own row count,
  and `onRowClick` does **not** fire on it — there is no record behind it. Drawing a header
  as a data row is how a grouped grid becomes unreadable: the heading lines up under the
  first column, every other column is blank, and a heading is indistinguishable from an
  empty record.
- A **data row still opens its record**, and `onRowClick` receives the original record and
  its original data index — grouping is a view, not a mutation.
- The group label uses the column's **header**, not its id — the reader's noun.

### Verification

10/10 tests, of which **4 fail without the grouped row model** — verified by removing it
and watching them go red. No regex in any assertion (operator ruling 2026-08-26).
