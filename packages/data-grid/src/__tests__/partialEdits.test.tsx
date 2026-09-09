import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataGrid } from '../DataGrid.js';
import type { CellEdit, CellEditResult, DataGridColumn, DataGridHandle } from '../types.js';
interface Row { id: string; name: string }
const initial = [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Grace' }];
const columns: DataGridColumn<Row>[] = [{ id: 'name', header: 'Name', accessor: r => r.name, editable: true, dataType: 'text' }];
const getRowId = (row: Row) => row.id;
function deferred() {
  let resolve!: (value: void | CellEditResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void | CellEditResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function cell(id: string) {
  const found = screen.getAllByRole('gridcell').find(e => e.dataset.rowId === id);
  if (!found) throw new Error(`Missing cell ${id}`);
  return found;
}
async function paste(text: string, id = 'a') {
  fireEvent.mouseDown(cell(id), { button: 0 });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText: vi.fn().mockResolvedValue(text) } });
  await act(async () => { fireEvent.keyDown(screen.getByRole('grid'), { key: 'v', ctrlKey: true }); });
}
function fixture(onCellsEdited: (edits: CellEdit<Row>[]) => void | CellEditResult | Promise<void | CellEditResult>) {
  const ref = createRef<DataGridHandle>();
  const onError = vi.fn();
  const view = (data: Row[]) => <DataGrid ref={ref} columns={columns} data={data} getRowId={getRowId} onCellsEdited={onCellsEdited} onError={onError} />;
  const mounted = render(view(initial));
  return { ref, onError, update: (data: Row[]) => mounted.rerender(view(data)) };
}
const failure = (rowId: string): CellEditResult => ({ failures: [{ rowId, columnId: 'name', status: 'failed', message: 'Not permitted' }] });
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
});
describe('per-cell persistence outcomes', () => {
  it('two-row paste drops only refused overlay, accepts refetch/discard, and undoes only saved cells', async () => {
    const save = vi.fn().mockResolvedValueOnce(failure('b')).mockResolvedValue(undefined);
    const { ref, onError, update } = fixture(save);
    await paste('Alice\nBeth');
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].map((e: CellEdit) => e.rowId)).toEqual(['a', 'b']);
    expect(cell('a')).toHaveTextContent('Alice');
    expect(cell('b')).toHaveTextContent('Grace');
    expect(cell('b')).toHaveAttribute('title', 'Not permitted');
    expect(onError.mock.calls[0][0].edits.map((e: CellEdit) => e.rowId)).toEqual(['b']);
    update([{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Server correction' }]);
    expect(cell('b')).toHaveTextContent('Server correction');
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toEqual([expect.objectContaining({ rowId: 'a', value: 'Ada' })]);
    expect(cell('b')).toHaveTextContent('Server correction');
    await waitFor(() => expect(ref.current!.canRedo()).toBe(true));
    act(() => ref.current!.redo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual([expect.objectContaining({ rowId: 'a', value: 'Alice' })]);
  });
  it.each(['success', 'failure'] as const)('ignores older %s after newer same-cell success', async outcome => {
    const older = deferred(), newer = deferred();
    const save = vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise).mockResolvedValue(undefined);
    const { ref, onError } = fixture(save);
    await paste('Old'); await paste('New');
    await act(async () => newer.resolve());
    await act(async () => outcome === 'success' ? older.resolve() : older.reject(new Error('Old failure')));
    expect(cell('a')).toHaveTextContent('New');
    expect(cell('a')).not.toHaveAttribute('aria-invalid');
    expect(onError).not.toHaveBeenCalled();
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual([expect.objectContaining({ value: outcome === 'success' ? 'Old' : 'Ada' })]);
    await waitFor(() => expect(ref.current!.canUndo()).toBe(outcome === 'success'));
  });
  it('does not resurrect older success after latest failure', async () => {
    const older = deferred(), newer = deferred();
    const { onError } = fixture(vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise));
    await paste('Old'); await paste('New');
    await act(async () => newer.resolve(failure('a')));
    await act(async () => older.resolve());
    expect(cell('a')).toHaveTextContent('Ada');
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it('older failed batch cannot remove newer different-row undo entry', async () => {
    const older = deferred();
    const save = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValue(undefined);
    const { ref } = fixture(save);
    await paste('Old'); await paste('New', 'b');
    await act(async () => older.reject(new Error('Denied')));
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual([expect.objectContaining({ rowId: 'b', value: 'Grace' })]);
  });
  it('keeps pending values/refusals with stable identity on reorder and rebinds undo rowIndex', async () => {
    const pending = deferred();
    const save = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    const { update, ref } = fixture(save);
    await paste('Alice\nBeth'); update([initial[1], initial[0]]);
    expect(cell('a')).toHaveTextContent('Alice'); expect(cell('b')).toHaveTextContent('Beth');
    await act(async () => pending.resolve(failure('b')));
    expect(cell('a')).toHaveTextContent('Alice');
    expect(cell('b')).toHaveAttribute('aria-invalid', 'true');
    expect(cell('a')).not.toHaveAttribute('aria-invalid');
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toEqual([expect.objectContaining({ rowId: 'a', rowIndex: 1, row: initial[0] })]);
  });
  it.each(['success', 'failure'] as const)('pending-save undo survives original late %s', async outcome => {
    const pending = deferred();
    const save = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    const { ref, onError } = fixture(save);
    await paste('Alice'); act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await act(async () => outcome === 'success' ? pending.resolve() : pending.reject(new Error('Late failure')));
    expect(cell('a')).toHaveTextContent('Ada'); expect(onError).not.toHaveBeenCalled();
    expect(ref.current!.canRedo()).toBe(true);
    act(() => ref.current!.redo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(cell('a')).toHaveTextContent('Alice');
  });
  it('partial undo/redo retain refused subsets for retry without replaying saved cells', async () => {
    const save = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(failure('b')).mockResolvedValueOnce(failure('a')).mockResolvedValue(undefined);
    const { ref } = fixture(save);
    await paste('Alice\nBeth'); await act(async () => {});
    act(() => ref.current!.undo());
    await waitFor(() => expect(ref.current!.canRedo()).toBe(true));
    expect(ref.current!.canUndo()).toBe(true);
    act(() => ref.current!.redo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3)); await act(async () => {});
    expect(ref.current!.canRedo()).toBe(true);
    act(() => ref.current!.redo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(4)); await act(async () => {});
    expect(save.mock.calls[3][0]).toEqual([expect.objectContaining({ rowId: 'a', value: 'Alice' })]);
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(5)); await act(async () => {});
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(6));
    expect(save.mock.calls[5][0]).toEqual([expect.objectContaining({ rowId: 'b', value: 'Grace' })]);
  });
  it('releases acknowledged success so later refetch replaces it', async () => {
    const { update } = fixture(() => {});
    await paste('Alice'); await act(async () => {});
    update([{ id: 'a', name: 'Alice' }, initial[1]]);
    update([{ id: 'a', name: 'Latest server value' }, initial[1]]);
    expect(cell('a')).toHaveTextContent('Latest server value');
  });
  it('uses default refusal message when omitted', async () => {
    const { onError, ref } = fixture(() => ({ failures: [{ rowId: 'a', columnId: 'name', status: 'failed' }] }));
    await paste('Alice'); await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(cell('a')).toHaveAttribute('title', 'Failed to save the edit.');
    expect(ref.current!.canUndo()).toBe(false);
  });
  it('preserves no-op edits and legacy void success', async () => {
    const user = userEvent.setup(), save = vi.fn();
    const { ref } = fixture(save);
    fireEvent.doubleClick(cell('a')); await user.keyboard('{Enter}');
    expect(save).not.toHaveBeenCalled(); expect(ref.current!.canUndo()).toBe(false);
    await paste('Alice'); await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(cell('a')).toHaveTextContent('Alice');
    act(() => ref.current!.undo()); await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(cell('a')).toHaveTextContent('Ada');
  });
  it('refuses an outcome identifying a cell outside this batch', async () => {
    const { onError, ref } = fixture(() => failure('not-in-batch'));
    await paste('Alice');
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(cell('a')).toHaveTextContent('Ada');
    expect(onError.mock.calls[0][0].message).toBe('Invalid per-cell edit outcome. Refresh before retrying.');
    expect(ref.current!.canUndo()).toBe(false);
  });
  it('does not send undo to a replacement row when its original row has been filtered out', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { update, ref, onError } = fixture(save);
    await paste('Alice');
    update([initial[1]]);
    act(() => ref.current!.undo());
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(cell('b')).toHaveTextContent('Grace');
    expect(ref.current!.canUndo()).toBe(true);
    update(initial);
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toEqual([expect.objectContaining({ rowId: 'a', value: 'Ada' })]);
  });

  it('undo waits for unresolved predecessor and skips its failed draft', async () => {
    const older = deferred();
    const save = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValue(undefined);
    const { ref } = fixture(save);
    await paste('Old'); await paste('New');
    act(() => ref.current!.undo());
    expect(save).toHaveBeenCalledTimes(2);
    await act(async () => older.resolve(failure('a')));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual([expect.objectContaining({ value: 'Ada' })]);
    expect(cell('a')).toHaveTextContent('Ada');
  });
  it('a newer edit supersedes an undo waiting for an unresolved predecessor', async () => {
    const older = deferred();
    const save = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValue(undefined);
    const { ref } = fixture(save);
    await paste('Old'); await paste('New');
    act(() => ref.current!.undo());
    await paste('Newest');
    await act(async () => older.resolve(failure('a')));
    expect(save).toHaveBeenCalledTimes(3);
    expect(cell('a')).toHaveTextContent('Newest');
  });

  it('queues rapid undo and redo without dropping either successful history entry', async () => {
    const undoOne = deferred(), undoTwo = deferred(), redoOne = deferred(), redoTwo = deferred();
    const save = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(undoOne.promise).mockReturnValueOnce(undoTwo.promise)
      .mockReturnValueOnce(redoOne.promise).mockReturnValueOnce(redoTwo.promise);
    const {ref} = fixture(save);
    await paste('X'); await paste('Y');
    act(() => { ref.current!.undo(); ref.current!.undo(); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    await act(async () => undoOne.resolve());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(4));
    await act(async () => undoTwo.resolve());
    expect(cell('a')).toHaveTextContent('Ada');
    expect(ref.current!.canUndo()).toBe(false);
    act(() => { ref.current!.redo(); ref.current!.redo(); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(5));
    expect(save.mock.calls[4][0][0].value).toBe('X');
    await act(async () => redoOne.resolve());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(6));
    expect(save.mock.calls[5][0][0].value).toBe('Y');
    await act(async () => redoTwo.resolve());
    expect(cell('a')).toHaveTextContent('Y');
    expect(ref.current!.canRedo()).toBe(false);
  });
  it('queued undo retries only the refused subset after a partial first undo', async () => {
    const undoOne = deferred();
    const save = vi.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(undoOne.promise).mockResolvedValue(undefined);
    const {ref} = fixture(save);
    await paste('Alice\nBeth');
    act(() => { ref.current!.undo(); ref.current!.undo(); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await act(async () => undoOne.resolve(failure('b')));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0].map((edit: CellEdit<Row>) => edit.rowId)).toEqual(['b']);
    expect(cell('a')).toHaveTextContent('Ada');
    expect(cell('b')).toHaveTextContent('Grace');
    act(() => {ref.current!.redo(); ref.current!.redo();});
    await waitFor(() => expect(save).toHaveBeenCalledTimes(5));
    expect(cell('a')).toHaveTextContent('Alice');
    expect(cell('b')).toHaveTextContent('Beth');
  });
  it('a new edit cancels queued history intentions', async () => {
    const firstUndo = deferred();
    const save = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(firstUndo.promise).mockResolvedValue(undefined);
    const {ref} = fixture(save);
    await paste('X'); await paste('Y');
    act(() => {ref.current!.undo(); ref.current!.undo();});
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    await paste('Latest');
    await act(async () => firstUndo.resolve());
    expect(save).toHaveBeenCalledTimes(4);
    expect(cell('a')).toHaveTextContent('Latest');
    expect(ref.current!.canRedo()).toBe(false);
  });

  it('retries retained drafts through cell refusal and undo history', async () => {
    const save = vi.fn().mockResolvedValueOnce(failure('b')).mockResolvedValue(undefined);
    const {ref} = fixture(save);
    await paste('Alice\nBeth');
    expect(cell('b')).toHaveAttribute('aria-invalid', 'true');
    await act(async () => ref.current!.applyCells([{rowId: 'b', columnId: 'name', value: 'Beth'}]));
    expect(cell('b')).toHaveTextContent('Beth');
    expect(cell('b')).not.toHaveAttribute('aria-invalid');
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual([expect.objectContaining({rowId: 'b', value: 'Grace'})]);
    act(() => ref.current!.undo());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(4));
    expect(save.mock.calls[3][0]).toEqual([expect.objectContaining({rowId: 'a', value: 'Ada'})]);
  });
  it('rejects missing retry identities before issuing any write', async () => {
    const save = vi.fn(); const {ref} = fixture(save);
    await expect(ref.current!.applyCells([{rowId: 'a', columnId: 'name', value: 'Alice'}, {rowId: 'gone', columnId: 'name', value: 'Other'}])).rejects.toThrow('This row or field is no longer available. Refresh before retrying.');
    expect(save).not.toHaveBeenCalled();
    expect(ref.current!.canUndo()).toBe(false);
  });
  it.each(['readonly', 'linked'] as const)('refuses %s field writes through the common mutation pipeline', async (kind) => {
    const ref = createRef<DataGridHandle>(), save = vi.fn(), onError = vi.fn();
    const guarded: DataGridColumn<Row>[] = [{...columns[0], editable: kind === 'linked' ? true : undefined,
      ...(kind === 'linked' ? {link: {entity: 'person', refId: (row: Row) => row.id}, renderEditor: () => null} : {})}];
    render(<DataGrid ref={ref} columns={guarded} data={initial} getRowId={getRowId} onCellsEdited={save} onError={onError} />);
    await act(async () => ref.current!.applyCells([{rowId: 'a', columnId: 'name', value: 'Unsafe text'}]));
    expect(save).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(cell('a')).toHaveTextContent('Ada');
    expect(ref.current!.canUndo()).toBe(false);
  });

});
