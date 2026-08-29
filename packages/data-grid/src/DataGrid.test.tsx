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

/*
 * `editable: true` is REQUIRED as of 2.0.0 — a column is read-only unless it
 * says otherwise. These fixtures are used by the editing tests below, so they
 * declare it rather than relying on a default. That is the point of the change:
 * an editable cell is now something a page ASKS for, never something it gets by
 * forgetting.
 */
const columns: DataGridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, dataType: 'text', editable: true },
  { id: 'age', header: 'Age', accessor: (r) => r.age, dataType: 'number', editable: true },
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

describe('DataGrid grouping', () => {
  /*
   * EXISTS BECAUSE crm7's ReportTable lets a reader choose a groupBy column and
   * persists it. Converting those surfaces to a grid with no grouping would
   * have deleted a feature people use — a regression wearing a migration's
   * clothes — so this is the capability that unblocks them.
   */
  const staff: Person[] = [
    { id: '1', name: 'Ada Lovelace', age: 36 },
    { id: '2', name: 'Grace Hopper', age: 85 },
    { id: '3', name: 'Alan Turing', age: 36 },
  ];
  const cols: DataGridColumn<Person>[] = [
    { id: 'name', header: 'Name', accessor: (r) => r.name, dataType: 'text' },
    { id: 'age', header: 'Age', accessor: (r) => r.age, dataType: 'number' },
  ];

  const renderGrouped = (groupBy: string | null, onRowClick?: (r: Person, i: number) => void) =>
    render(
      <DataGrid<Person>
        columns={cols}
        data={staff}
        getRowId={(r) => r.id}
        groupBy={groupBy}
        onRowClick={onRowClick}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );

  it('draws one group header per distinct value, with its row count', () => {
    renderGrouped('age');
    // Two people are 36, one is 85 — so two groups, counted correctly.
    expect(screen.getByText('2 rows')).toBeInTheDocument();
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });

  it('names the group by its COLUMN HEADER, not the raw column id', () => {
    renderGrouped('age');
    /*
     * "Age: 36", never "age: 36" — the reader's noun, not the schema's.
     * The label is two text nodes in one span, so match on the element's
     * combined content. Asserting BOTH groups, because 'Age:' alone is
     * ambiguous across them and an ambiguous matcher is not an assertion.
     */
    const labels = screen
      .getAllByRole('row')
      // split/join, not a regex: operator ruling 2026-08-26 forbids regex in tests
      .map((r) => (r.textContent ?? '').split(' ').filter(Boolean).join(' '))
      .filter((t) => t.includes('Age: '));
    expect(labels.some((t) => t.includes('Age: 36'))).toBe(true);
    expect(labels.some((t) => t.includes('Age: 85'))).toBe(true);
    expect(labels.some((t) => t.includes('age: '))).toBe(false);
  });

  it('shows the underlying rows while expanded — the default is open', () => {
    renderGrouped('age');
    // A grid that opens with every group shut shows headings and no data.
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('collapsing a group hides its rows and keeps the header', async () => {
    const user = userEvent.setup();
    renderGrouped('age');
    // plain-string matcher: operator ruling 2026-08-26 forbids regex in tests
    const toggles = screen
      .getAllByRole('button')
      .filter((el) => (el.getAttribute('aria-label') ?? '').startsWith('Collapse'));
    await user.click(toggles[0]);
    expect(screen.getByText('2 rows')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  it('a group header is NOT a record — clicking it does not open one', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderGrouped('age', onRowClick);
    const header = screen.getByText('2 rows').closest('[role="row"]');
    expect(header).not.toBeNull();
    await user.click(header as HTMLElement);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('a DATA row still opens its record, and with the ORIGINAL index', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderGrouped('age', onRowClick);
    await user.click(screen.getByText('Grace Hopper'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    // The record itself, not a grouping wrapper.
    expect(onRowClick.mock.calls[0][0]).toEqual({ id: '2', name: 'Grace Hopper', age: 85 });
  });

  it('groupBy null is a flat grid — no group headers at all', () => {
    renderGrouped(null);
    expect(screen.queryByText('2 rows')).toBeNull();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });
});

describe('DataGrid controlled sorting', () => {
  /*
   * EXISTS BECAUSE crm7's ReportTable PERSISTS the reader's chosen sort as a
   * view preference. Converting it onto a grid whose sort is internal state
   * would drop that on every reload: the list still renders, the sort silently
   * is not the one they chose, and nothing fails. That is the regression shape
   * this package keeps having to design out.
   */
  const rows: Person[] = [
    { id: '1', name: 'Ada Lovelace', age: 36 },
    { id: '2', name: 'Grace Hopper', age: 85 },
    { id: '3', name: 'Alan Turing', age: 41 },
  ];
  const cols: DataGridColumn<Person>[] = [
    { id: 'name', header: 'Name', accessor: (r) => r.name, dataType: 'text', sortable: true },
    { id: 'age', header: 'Age', accessor: (r) => r.age, dataType: 'number', sortable: true },
  ];

  const namesInOrder = () =>
    screen
      .getAllByRole('row')
      .map((r) => r.textContent ?? '')
      .filter((t) => t.includes('Lovelace') || t.includes('Hopper') || t.includes('Turing'))
      .map((t) => (t.includes('Lovelace') ? 'Ada' : t.includes('Hopper') ? 'Grace' : 'Alan'));

  it('SEEDS the grid from the persisted sort — descending by age puts Grace first', () => {
    render(
      <DataGrid<Person>
        columns={cols}
        data={rows}
        getRowId={(r) => r.id}
        sortBy={[{ id: 'age', desc: true }]}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );
    // 85, 41, 36 — not source order, which would start with Ada.
    expect(namesInOrder()[0]).toBe('Grace');
  });

  it('a DIFFERENT persisted sort produces a different order — the seed is read, not ignored', () => {
    render(
      <DataGrid<Person>
        columns={cols}
        data={rows}
        getRowId={(r) => r.id}
        sortBy={[{ id: 'age', desc: false }]}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );
    /*
     * Assert the FULL order, not just the first name.
     *
     * Ada is first in source order too, so `[0] === 'Ada'` passed even with the
     * seed disabled — it tested nothing. The control caught that. Ascending by
     * age is Ada(36), Alan(41), Grace(85); source order is Ada, Grace, Alan.
     * Only the full sequence tells those apart.
     */
    expect(namesInOrder()).toEqual(['Ada', 'Alan', 'Grace']);
  });

  it('REPORTS the sort back so a host can persist what the reader clicked', async () => {
    const onSortByChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataGrid<Person>
        columns={cols}
        data={rows}
        getRowId={(r) => r.id}
        onSortByChange={onSortByChange}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );
    await user.click(screen.getByText('Age'));
    expect(onSortByChange).toHaveBeenCalled();
    const reported = onSortByChange.mock.calls[onSortByChange.mock.calls.length - 1][0];
    expect(reported[0].id).toBe('age');
  });

  it('stays UNCONTROLLED when no sort is given — previous behaviour is untouched', () => {
    render(
      <DataGrid<Person>
        columns={cols}
        data={rows}
        getRowId={(r) => r.id}
        onCellsEdited={() => {}}
        onError={() => {}}
      />,
    );
    // Source order, because nothing asked for a sort.
    expect(namesInOrder()).toEqual(['Ada', 'Grace', 'Alan']);
  });
});

describe('DataGrid read-only by default (2.0.0)', () => {
  /*
   * THE DEFAULT IS THE POINT. Until 2.0.0 a column that simply did not mention
   * `editable` was fully editable — typing, paste and the fill handle all
   * worked. Every list converted onto this grid became a spreadsheet by
   * omission, and nothing announced it: the page renders, the data is right,
   * and a reader can quietly overwrite a record from a screen only ever meant
   * to display one.
   *
   * ~184 list surfaces remain to convert. A default that must be remembered
   * 184 times is a defect waiting on the one time it is not.
   */
  const readOnlyCols: DataGridColumn<Person>[] = [
    // deliberately silent on `editable`
    { id: 'name', header: 'Name', accessor: (r) => r.name, dataType: 'text' },
  ];

  it('a column that does not mention editable REFUSES to edit', async () => {
    const onCellsEdited = vi.fn();
    const user = userEvent.setup();
    render(
      <DataGrid<Person>
        columns={readOnlyCols}
        data={[{ id: '1', name: 'Ada Lovelace', age: 36 }]}
        getRowId={(r) => r.id}
        onCellsEdited={onCellsEdited}
        onError={() => {}}
      />,
    );
    await user.click(screen.getByText('Ada Lovelace'));
    await user.keyboard('X');
    await user.keyboard('{Enter}');
    expect(onCellsEdited).not.toHaveBeenCalled();
    // and the displayed value is untouched
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('editable: true still edits — the opt-in works', async () => {
    const onCellsEdited = vi.fn();
    const user = userEvent.setup();
    render(
      <DataGrid<Person>
        columns={[{ ...readOnlyCols[0], editable: true }]}
        data={[{ id: '1', name: 'Ada Lovelace', age: 36 }]}
        getRowId={(r) => r.id}
        onCellsEdited={onCellsEdited}
        onError={() => {}}
      />,
    );
    await user.click(screen.getByText('Ada Lovelace'));
    await user.keyboard('X');
    await user.keyboard('{Enter}');
    expect(onCellsEdited).toHaveBeenCalled();
  });
});
