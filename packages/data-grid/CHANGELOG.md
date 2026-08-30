# `@bsuite/data-grid` Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this package
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] — 2026-08-30 — Addressing moves to the CELL

### Added

- **`data-row-id`, `data-column-id` and `data-editable-cell` on every cell.**

### Why the cell and not the row

2.2.0 put `data-row-id` on the row. That was the wrong level: cell-to-cell navigation and
external tooling address a **cell**, and a row-level attribute cannot be read from one
without walking the DOM upward and guessing at structure.

Found the same way as the rest — by running crm7's own contract test, which queries
`[data-editable-cell][data-column-id="…"]` and reads `data-row-id` off the **cell**. The
row-level attribute is kept, because row-level tooling is a real thing too; it is simply
not what navigation needs.

`data-editable-cell` is present only where the column actually accepts edits, so a caller
can find the editable cells without re-deriving the rule.

### Verification

122 tests. The addressing test asserts both directions: the editable column is findable as
editable, and the read-only one is **not**.

## [2.2.0] — 2026-08-30 — The three gaps that blocked the report viewer

All three are the same shape: something a page has today that the grid could not carry, and
would have lost **quietly** — the page renders, the data is right, and the saved view is
simply not the one the reader saved.

### Added

- **`data-row-id` on every data row** — the real record id, from `getRowId`. An array index
  *looks* like an identifier, addresses the wrong record the moment the data is sorted,
  grouped or filtered, and gives no sign it has done so. Group headers deliberately carry
  none: there is no record behind a heading.
- **`columnOrder` / `onColumnOrderChange`** — seed and observe the column order so a host
  can persist it. Uncontrolled when omitted. Same shape as the sort gap `sortBy` closed.
- **A refusal is shown AT THE CELL** — a rejected edit marks its own cell and announces via
  `role="alert"`, instead of reverting and reporting only through `onError`. A revert the
  reader cannot see is the "edited, nothing happened" defect this package exists to close.
  A fresh attempt clears the marker; a stale one on a cell since fixed is its own small lie.

### Verification

122 tests. Three new ones, each **proven to fail without its capability** — checked by
removing each.

The column-order control initially **passed with the seed removed**, because the injection
disabled the sync effect and left the `useState` initialiser seeding anyway. That is a
half-disabled control reporting a pass; re-run against **both** halves, it fails correctly.

## [2.1.0] — 2026-08-30 — The grid has an accessible name

### Added

- **`ariaLabel`** — lands on the `role="grid"` element.

### Why

The grid renders `role="grid"` and had **no way to supply a name**, so every render site
announced as an unnamed table: a screen-reader user lands in a mesh of cells with nothing
saying what they are looking at. All 20 sites were affected — not one of them had omitted
something optional, because there was nothing to omit.

Found while converting crm7's `ReportTable`, which passes an `ariaLabel` to its `<table>`
today. Dropping it in the conversion would have been an accessibility regression hidden
inside a visual improvement.

### Verification

17 tests; the new one fails when the attribute is removed — checked by removing it.

## [2.0.0] — 2026-08-30 — Read-only by default

### Changed — BREAKING

- **A column is read-only unless it declares `editable: true`.**

Until now the test was `editable === false`, so a column that simply did not mention
`editable` was **fully editable** — typing, paste and the fill handle all worked.

Every list converted onto this grid became a spreadsheet **by omission**, and nothing
announced it: the page renders, the data is right, and a reader can quietly overwrite a
record from a screen only ever meant to display one. There is no error, no visual
difference, and no failing test — the defect is invisible until someone types.

The estate has roughly **184 list surfaces still to convert**. A default that has to be
remembered 184 times is a defect waiting on the one time it is not. This is a default in the
wrong place, not a mistake to repeat at every call site.

### Migration

Add `editable: true` to any column you intend to be editable. Nothing else changes.

**Measured before flipping:** all **18** existing render sites across the estate already
declare `editable` on every column, so **no consumer depended on the old default**. The only
code that did was this package's own editing tests, which now declare `editable: true` —
which is honest, since they exist to test editing.

### Verification

116 tests. Two new ones pin the default in both directions: a column that does not mention
`editable` **refuses** the edit and never calls `onCellsEdited`; `editable: true` still
edits. The first fails under the old default — checked by restoring it.

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
