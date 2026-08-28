---
kind: plan
authority: engineering
owner: datum-lane
evidence:
  - scripts/check-airtable-grid-adoption.mjs
  - crm7/src/components/common/DataTable/EnhancedDataTable.tsx
  - packages/data-grid/src/types.ts
---

# `EnhancedDataTable` is not a one-edit conversion

**Date:** 2026-08-29 · **Status:** W (working — the migration is live)
**Corrects:** the "1 component, 43 pages" costing recorded 2026-08-29 earlier the same day.
**Companion to:** `docs/20260821-airtable-class-data-surface-plan-v1.00F.md`

---

## The claim this document exists to kill

> *"`EnhancedDataTable` is the highest-leverage single conversion available — 35 import sites,
> 43 pages reached. Converting that one component to wrap `@bsuite/data-grid` makes 43 pages
> Airtable-style at once."*

**The first sentence is true. The second is false, and acting on it renders blank cells on 36
pages without failing a single check.**

## Why

Both components hand a cell renderer a prop named **`row`**. They do not mean the same thing.

| | what `row` is | how a renderer reads a value |
|---|---|---|
| TanStack `ColumnDef.cell` | a **`Row<TData>` wrapper** | `row.original.foo` |
| `DataGridColumn.renderCell` | the **raw record** | `row.foo` |

A mechanical translation passes the raw record as `row`. Every `row.original.foo` then reads a
property off `undefined`… or rather reads `row.original` — which *is* `undefined` — and renders
nothing. **It does not throw.** TypeScript is content, because a generic `TData` and a
`Row<TData>` both satisfy a loose parameter. The cell simply goes blank.

## Measured, crm7, 2026-08-29

File list from `grep -rln 'EnhancedDataTable' src --include=*.tsx` (46 files, 43 of them pages),
counted with `grep -rhoE`:

| context member the renderers use | uses |
|---|---|
| **`row.original`** | **248** — across **36 of 43** files |
| `column.` | 27 |
| `row.id` | 24 |
| `table.` | 17 |
| `cell.` | 3 |
| `row.getIsSelected` / `row.toggleSelected` | 3 |

Column-definition shapes: **191** `accessorKey`, **1** `accessorFn`, **212** custom `cell:`
renderers, **54** id-only columns (action/select columns with no value at all).

## Why a compatibility shim is the trap, not the fix

A shim passing `{original: row, id, getIsSelected, toggleSelected}` covers 248 + 24 + 3 = **275
of ~292 uses, about 94%**. It cannot faithfully construct TanStack's `table` (17 uses) or
`column` (27 uses) objects — those are live instances wired to the table's own state.

**Those 17 + 27 fail exactly as silently as the ones the shim fixes.** An adapter that is right
94% of the time, on a surface nobody can open, ships the other 6% — and per
`docs/` the `CRM7_E2E_*` account redirects away from these pages, so a signed-in reader cannot
see which cells went blank.

## What is actually true, and how to price the work

| part | cost |
|---|---|
| **chrome** — toolbar, pagination, column visibility, sticky header, empty/loading states | **one edit**, reaches 43 pages |
| **cells** — 212 renderers + 54 action columns | **~292 hand conversions** |

So the leverage is real, and it is in the chrome. Price the migration on the cells.

## The recommended order

1. **Do not swap `EnhancedDataTable`'s engine.** Two grids with different contracts is not a
   defect — `@bsuite/data-grid` is for *editable spreadsheet* surfaces; `EnhancedDataTable` is
   for *read listings with rich JSX cells*. That split is defensible and should be written down
   rather than collapsed by force.
2. **Convert page-by-page**, highest-traffic first, each with its own PR and its own evidence.
   `/hr/disciplinary` (crm7#2205) is the reference conversion: 8 columns, accessors yielding
   **labels not enums**, `onRowClick` into the record.
3. **Never synthesise `onCellsEdited`.** It and `onError` are required props precisely so an
   integration must decide. A no-op handler makes every cell look editable and persist nothing —
   the inert-control defect, at 43× scale.
4. **Set `editable: false` on any column without a real write path.** `DataGrid` gates paste,
   fill, clear and edit-entry on it cleanly (`DataGrid.tsx:397,433,459,548`), so a read-only grid
   is a supported mode, not a workaround.

## The general lesson

Two components with the **same prop name and different prop meaning** is the most dangerous
adapter boundary available: the type checker passes and the failure is a blank cell, not a crash.
**Before costing any "one component, N pages" conversion, diff what the renderers RECEIVE — not
what the components DO.**
