/*
 * The capabilities the operator asked for on 2026-08-28, each proven to work
 * AND proven not to fire when it should not.
 *
 * Operator, verbatim: "each row clickable and live, filterable and columns
 * added and removed on users preference. row higheght adjustible so nothing
 * vertically truncated and similar for column width."
 *
 * The negative cases carry as much weight as the positive ones. A row-click
 * handler that also fires while you are dragging out a cell range would make
 * the grid unusable as a grid, and that failure is invisible in a test that
 * only checks the happy path.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataGrid } from '../DataGrid.js';
import type { DataGridColumn } from '../types.js';

interface Row {
  id: string;
  name: string;
  city: string;
  joined: string;
}

const rows: Row[] = [
  { id: '1', name: 'Ada', city: 'Perth', joined: '2026-08-23' },
  { id: '2', name: 'Grace', city: 'Sydney', joined: '2026-01-05' },
  { id: '3', name: 'Alan', city: 'Perth', joined: '2026-03-17' },
];

const columns: DataGridColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, editable: false },
  { id: 'city', header: 'City', accessor: (r) => r.city, editable: false },
  {
    id: 'joined',
    header: 'Joined',
    accessor: (r) => r.joined,
    editable: false,
    // Shown Australian; STORED ISO. The filter must match what is shown.
    formatValue: (v) =>
      typeof v === 'string' ? v.split('-').reverse().join('/') : '',
  },
];

function renderGrid(extra: Record<string, unknown> = {}) {
  return render(
    <DataGrid<Row>
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      onCellsEdited={() => {}}
      onError={() => {}}
      {...extra}
    />,
  );
}

beforeEach(() => {
  // jsdom has no layout; @tanstack/react-virtual reads offset*, not client*.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
});
afterEach(cleanup);

describe('rows are clickable and live', () => {
  it('opens the record for the row that was clicked', () => {
    const onRowClick = vi.fn();
    renderGrid({ onRowClick });
    fireEvent.click(screen.getByText('Grace'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: '2', name: 'Grace' });
  });

  it('does NOT fire on a modified click — that already means extend the selection', () => {
    const onRowClick = vi.fn();
    renderGrid({ onRowClick });
    fireEvent.click(screen.getByText('Grace'), { shiftKey: true });
    fireEvent.click(screen.getByText('Grace'), { ctrlKey: true });
    fireEvent.click(screen.getByText('Grace'), { metaKey: true });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('opens from the keyboard too — a row you can click is a row you can open', () => {
    const onRowClick = vi.fn();
    renderGrid({ onRowClick });
    fireEvent.keyDown(screen.getByText('Alan').closest('[role="row"]')!, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: '3' });
  });

  it('leaves the grid alone when no handler is supplied', () => {
    const { container } = renderGrid();
    const row = container.querySelector('[role="row"]');
    expect(row?.className).not.toContain('cursor-pointer');
  });
});

describe('columns are added and removed on the reader’s preference', () => {
  it('hides a column the reader switched off', () => {
    renderGrid({ columnVisibility: { city: false } });
    expect(screen.queryByText('City')).not.toBeInTheDocument();
    expect(screen.queryByText('Sydney')).not.toBeInTheDocument();
    // and the others survive
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows every column when nothing is hidden', () => {
    renderGrid();
    for (const h of ['Name', 'City', 'Joined']) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
  });
});

describe('the grid is filterable, on what the reader can SEE', () => {
  it('filters on a plain value', () => {
    renderGrid({ globalFilter: 'perth' });
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Alan')).toBeInTheDocument();
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
  });

  it('matches the FORMATTED date, not the ISO one underneath', () => {
    // Stored 2026-08-23, shown 23/08/2026. Filtering "23/08" must find it —
    // matching the raw value would return nothing for the string on screen.
    renderGrid({ globalFilter: '23/08' });
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
  });

  it('does not match a hidden column — you cannot filter on what you cannot see', () => {
    renderGrid({ globalFilter: 'sydney', columnVisibility: { city: false } });
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
  });

  it('an empty filter shows everything', () => {
    renderGrid({ globalFilter: '' });
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Alan')).toBeInTheDocument();
  });
});

describe('row height is adjustable so nothing is vertically truncated', () => {
  /*
   * Select a BODY row, not `[role="row"]`.
   *
   * The header is also role="row" and comes first in document order, so a bare
   * querySelector returns it — and it is sized by `headerHeight`, which
   * happens to share the 32px default. The first version of this test read the
   * header, saw 32, and reported the rowHeight prop as inert when it was
   * working correctly. A selector that can match the wrong element will.
   */
  const bodyRowOf = (text: string) =>
    screen.getByText(text).closest('[role="row"]') as HTMLElement;

  it('honours a taller row height', () => {
    renderGrid({ rowHeight: 96 });
    expect(bodyRowOf('Ada').style.height).toBe('96px');
  });

  it('still renders at the compact default', () => {
    renderGrid();
    expect(bodyRowOf('Ada').style.height).toBe('32px');
  });

  it('the header keeps its OWN height, independent of the row height', () => {
    const { container } = renderGrid({ rowHeight: 96 });
    const header = container.querySelector('[role="row"]') as HTMLElement;
    expect(header.style.height).toBe('32px');
    expect(bodyRowOf('Ada').style.height).toBe('96px');
  });
});
