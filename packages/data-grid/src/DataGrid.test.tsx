import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid } from './DataGrid.js';
import type { DataGridColumn } from './types.js';

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Ada Lovelace', age: 36 },
  { id: '2', name: 'Grace Hopper', age: 85 },
  { id: '3', name: 'Alan Turing', age: 41 },
];

const columns: DataGridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, dataType: 'text' },
  { id: 'age', header: 'Age', accessor: (r) => r.age, dataType: 'number' },
];

beforeEach(() => {
  // jsdom reports 0 for layout metrics. @tanstack/react-virtual measures
  // the scroll container via `offsetWidth`/`offsetHeight` (see
  // observeElementRect -> getRect in @tanstack/virtual-core) to decide
  // which rows/columns are "visible" and therefore rendered — clientWidth/
  // clientHeight are NOT what it reads, so those must be stubbed instead.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 800,
  });
});

describe('DataGrid', () => {
  it('renders column headers and visible cell values', () => {
    render(
      <DataGrid
        columns={columns}
        data={people}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /age/i })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
  });

  it('typing a printable character over the focused cell starts editing, and Enter commits via onCellsEdited', async () => {
    const user = userEvent.setup();
    const onCellsEdited = vi.fn();
    render(
      <DataGrid
        columns={columns}
        data={people}
        onCellsEdited={onCellsEdited}
        onError={() => {}}
      />,
    );

    const grid = screen.getByRole('grid');
    grid.focus();

    // Default focus/selection is the top-left cell (row 0 = Ada, col 0 = name).
    await user.keyboard('Z');
    const input = await screen.findByDisplayValue('Z');
    expect(input).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(onCellsEdited).toHaveBeenCalledTimes(1);
    const edits = onCellsEdited.mock.calls[0][0];
    expect(edits).toEqual([
      expect.objectContaining({ rowIndex: 0, columnId: 'name', value: 'Z', previousValue: 'Ada Lovelace' }),
    ]);

    // The optimistic overlay shows the new value immediately.
    expect(await screen.findByText('Z')).toBeInTheDocument();
  });

  it('reports a failed edit via the required onError callback and reverts the optimistic value', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onCellsEdited = vi.fn().mockRejectedValue(new Error('RLS denied the write'));
    render(
      <DataGrid
        columns={columns}
        data={people}
        onCellsEdited={onCellsEdited}
        onError={onError}
      />,
    );

    const grid = screen.getByRole('grid');
    grid.focus();
    await user.keyboard('Z');
    await user.keyboard('{Enter}');

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    const error = onError.mock.calls[0][0];
    expect(error.phase).toBe('edit');
    expect(error.message).toContain('RLS denied the write');

    // Reverted back to the original value after telling the host.
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });
});
