# @bsuite/data-grid

## Partial persistence outcomes

`onCellsEdited` still accepts synchronous or asynchronous `void` (every cell
succeeded). A host that saves a batch independently can return `CellEditResult`:

```tsx
<DataGrid
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  onCellsEdited={async (edits) => {
    const failures: CellEditFailure[] = [];
    for (const edit of edits) {
      try {
        await saveCell(edit.rowId!, edit.columnId, edit.value);
      } catch (error) {
        retainRetryDraft(edit); // Host-owned draft, separate from the grid's data.
        failures.push({
          rowId: edit.rowId!,
          columnId: edit.columnId,
          status: 'failed',
          message: error instanceof Error ? error.message : undefined,
        });
      }
    }
    return { failures };
  }}
  onError={showSaveError}
/>
```

Import `CellEditFailure` and `CellEditResult` from `@bsuite/data-grid`. Every edit
emitted by the grid includes `rowId`; the field remains optional in `CellEdit`
for compatibility with existing host-created objects. Match outcomes using
`rowId` and `columnId`, never the current display index. `getRowId` must return
unique, stable record identifiers when rows can be reordered or filtered. The
legacy index fallback cannot identify records across a host data reorder.

Each omitted cell is successful. Failures require `status: 'failed'`; `message`
is optional and defaults to “Failed to save the edit.” Unknown or duplicate
identities invalidate the result and report the submitted cells as failed; the
host must refresh before retrying an uncertain write. Rejecting the callback
continues to mean the whole batch failed. A partial saver must therefore return
the actual failed subset instead of throwing after some writes have succeeded.

Failed optimistic values are removed and the corresponding cells show their
refusal message. Host data/refetch controls their displayed value; discarding a
host retry draft cannot leave a hidden grid overlay behind. Successful overlays
remain until host data acknowledges that value, then release so later server
updates are visible. The host must update or invalidate its authoritative data
on persistence. A fresh edit clears that cell's old refusal.

Undo contains only successful cells. Partial undo and redo move successful
cells to the opposite history and retain refused cells on their original side
for retry. An unavailable row is refused locally instead of sending a write to
the record now occupying its former index. A pending save can be undone; its
late completion cannot replace the newer overlay or undo history.

Per-cell ownership protects **grid state**, not database write ordering. Hosts
must serialize same-cell writes (including undo/redo) or use server conditional
writes. A UI ownership check cannot cancel an already-running database update.
When a host serializes whole batches, capture its promise queue outside render,
chain each batch onto it, and recover the queue's rejection without converting
a failed batch into success. Keep latest-attempt ownership for host draft/error
state as well. `onError` receives only currently owned failed cells; it does not
report stale failures belonging to an older attempt.

## Retrying a retained draft

Use `gridRef.current.applyCells([{ rowId, columnId, value }])` with the already typed
values from failed `CellEdit`s. It rebinds each identity to the current row and
uses the same refusal, persistence and undo pipeline as direct editing. The
promise settles after persistence outcomes are handled; inspect the host draft
store for any remaining failures. Missing/duplicate identities reject before
any write. Do not call the host persistence callback directly for retry: that
would leave grid refusal and history state disconnected from the save.

All value mutations, including paste/fill/clear/undo/retry, require an explicitly
editable column. Linked fields must use their supplied record picker and the
link mutation callback; a pasted label is never a record reference.

## Implementation and verification bounds

This extends the existing grid and undo stack; no replacement engine or new
dependency is used. Stable identity follows the installed TanStack Table 9.2.4
`table_getRowId` implementation (custom extractor, otherwise string index),
confirmed with Context7 and the installed package's
`dist/core/rows/coreRowsFeature.utils.js`. See the official
[TanStack row identity guide](https://tanstack.com/table/latest/docs/guide/rows#row-ids).
The alternative of retaining failed optimistic drafts inside the grid loses
refetch/discard authority and was rejected; retry editing belongs to the host.

Mounted tests exercise actual grid keyboard paste, mixed failures, refetch,
undo/redo, reorder/filter, no-op/void behavior, and overlapping completions.
`ui_touched=true`: the consumer rollout remains open across the 23 existing CRM
render sites, the new Conduit Candidates surface, and other estate consumers.
Package tests do not establish deployed UX acceptance. Consumer wiring, preview
publication/pinning, and the parent's D8/live verification remain required.
