/*
 * The reader's controls, proven to control something.
 *
 * A toolbar is the easiest component in the estate to ship broken: it renders,
 * it looks right in a screenshot, and every control is inert. So each test
 * here asserts the CALLBACK fires with the right value, and two assert a
 * control is correctly REFUSED — the last visible column cannot be hidden, and
 * the row count only appears once a filter is actually narrowing something.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataGridToolbar, ROW_HEIGHTS, rowHeightNameFor } from '../components/DataGridToolbar.js';
import type { DataGridColumn } from '../types.js';

interface Row {
  id: string;
  host: string;
  started: string;
}

const columns: DataGridColumn<Row>[] = [
  { id: 'host', header: 'Host', accessor: (r) => r.host },
  { id: 'started', header: 'Started', accessor: (r) => r.started },
];

function renderToolbar(over: Partial<React.ComponentProps<typeof DataGridToolbar<Row>>> = {}) {
  const props = {
    columns,
    filter: '',
    onFilterChange: vi.fn(),
    columnVisibility: {},
    onColumnVisibilityChange: vi.fn(),
    rowHeight: 32,
    onRowHeightChange: vi.fn(),
    ...over,
  };
  render(<DataGridToolbar<Row> {...(props as never)} />);
  return props;
}

afterEach(cleanup);

describe('filtering', () => {
  it('reports what the reader typed', () => {
    const p = renderToolbar();
    fireEvent.change(screen.getByLabelText('Filter rows'), { target: { value: 'perth' } });
    expect(p.onFilterChange).toHaveBeenCalledWith('perth');
  });

  it('says how many rows survived, so "no matches" is not mistaken for "no data"', () => {
    renderToolbar({ filter: 'perth', visibleRowCount: 2, totalRowCount: 9 });
    expect(screen.getByText('2 of 9')).toBeInTheDocument();
  });

  it('stays quiet when nothing is being filtered', () => {
    renderToolbar({ filter: '', visibleRowCount: 9, totalRowCount: 9 });
    expect(screen.queryByText('9 of 9')).not.toBeInTheDocument();
  });
});

describe('choosing columns', () => {
  it('hides the column the reader unticked', () => {
    const p = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByLabelText('Started'));
    expect(p.onColumnVisibilityChange).toHaveBeenCalledWith({ started: false });
  });

  it('names how many are hidden — otherwise the reader has no cue they are seeing less', () => {
    renderToolbar({ columnVisibility: { started: false } });
    expect(screen.getByRole('button', { name: 'Columns (1 hidden)' })).toBeInTheDocument();
  });

  it('REFUSES to hide the last visible column — an empty grid is not a preference', () => {
    const p = renderToolbar({ columnVisibility: { started: false } });
    fireEvent.click(screen.getByRole('button', { name: 'Columns (1 hidden)' }));
    const lastOne = screen.getByLabelText('Host') as HTMLInputElement;
    expect(lastOne.disabled).toBe(true);
    fireEvent.click(lastOne);
    expect(p.onColumnVisibilityChange).not.toHaveBeenCalled();
  });
});

describe('row height', () => {
  it('reports the px value for the step the reader picked', () => {
    const p = renderToolbar();
    fireEvent.change(screen.getByLabelText('Row height'), { target: { value: 'tall' } });
    expect(p.onRowHeightChange).toHaveBeenCalledWith(ROW_HEIGHTS.tall);
  });

  it('maps a stored px value back to the nearest named step', () => {
    // A value persisted by an older release must still select something,
    // rather than leaving the control blank.
    expect(rowHeightNameFor(32)).toBe('compact');
    expect(rowHeightNameFor(50)).toBe('comfortable');
    expect(rowHeightNameFor(9999)).toBe('extra tall');
  });

  it('shows the reader’s current height, not a default', () => {
    renderToolbar({ rowHeight: ROW_HEIGHTS.tall });
    expect((screen.getByLabelText('Row height') as HTMLSelectElement).value).toBe('tall');
  });
});
