import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';

const layouts: GridLayouts = { lg: [{ i: 'card', x: 0, y: 0, w: 12, h: 4 }] };
const suffixes = ['grid_version', 'grid_layouts', 'grid_cols', 'grid_base_cols',
  'grid_layer_names', 'grid_hidden_layers', 'card_style'];

function fixture(slowSuffix: string) {
  let complete!: () => void;
  let fail!: (error: Error) => void;
  let pending = new Promise<void>((resolve, reject) => { complete = resolve; fail = reject; });
  // The before-fix component never observes this promise. Keep that control's
  // deliberate refusal from becoming an unrelated unhandled-rejection failure.
  void pending.catch(() => undefined);
  const flush = vi.fn((key: string) => key.endsWith('_' + slowSuffix) ? pending : Promise.resolve());
  const adapter: PageGridPreferenceFactory = function useFixture<T>(key: string, fallback: T) {
    const [value, setValue] = useState(fallback);
    return { value, setValue, loaded: true, flush: () => flush(key) };
  };
  return { adapter, flush, complete: () => complete(), fail: () => fail(new Error('Save refused')),
    recover: () => { pending = Promise.resolve(); } };
}
function grid(adapter: PageGridPreferenceFactory, pageKey = 'save-contract') {
  return <PageGridLayout pageKey={pageKey} defaultLayouts={layouts} canEditPage
    preferenceAdapter={adapter} widgets={{ card: <input aria-label="Widget draft" defaultValue="Keep this text" /> }} />;
}
function openEditor() {
  act(() => window.dispatchEvent(new CustomEvent('bsuite-open-page-editor')));
}
afterEach(cleanup);

describe('page editor save acknowledgement', () => {
  it('acknowledges a targeted header save, retains failure, and retries without closing sibling grids', async () => {
    const f = fixture('card_style');
    render(<>{grid(f.adapter)}{grid(f.adapter, 'sibling')}</>);
    openEditor();
    const request = (pageKey: string) => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save', { detail: { pageKey } }));
    act(() => { request('save-contract'); request('save-contract'); });
    expect(f.flush).toHaveBeenCalledTimes(7);
    expect(f.flush.mock.calls.every(([key]) => key.startsWith('page:save-contract_'))).toBe(true);
    expect(screen.getByRole('button', { name: 'Saving…' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { f.fail(); });
    expect(screen.getByRole('alert').textContent).toContain('could not be saved');
    expect(screen.getAllByRole('region', { name: 'Canvas editor controls' })).toHaveLength(2);
    f.recover();
    await act(async () => { request('save-contract'); });
    expect(screen.getAllByRole('region', { name: 'Canvas editor controls' })).toHaveLength(1);
    expect(screen.getAllByRole('textbox', { name: 'Widget draft' }).map(el => (el as HTMLInputElement).value))
      .toEqual(['Keep this text', 'Keep this text']);
  });

  it('ignores header save requests without a matching open editable canvas', () => {
    const f = fixture('card_style');
    render(grid(f.adapter));
    act(() => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save', { detail: { pageKey: 'save-contract' } })));
    openEditor();
    act(() => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save', { detail: { pageKey: 'another-page' } })));
    act(() => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save')));
    expect(f.flush).not.toHaveBeenCalled();
  });

  it('allows implicit edit permission and rejects a permission revoked while editing', async () => {
    const f = fixture('card_style');
    const view = render(<PageGridLayout pageKey="permission" defaultLayouts={layouts}
      preferenceAdapter={f.adapter} widgets={{ card: 'Card' }} />);
    openEditor();
    act(() => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save', { detail: { pageKey: 'permission' } })));
    expect(f.flush).toHaveBeenCalledTimes(7);
    await act(async () => { f.fail(); });
    view.rerender(<PageGridLayout pageKey="permission" defaultLayouts={layouts} canEditPage={false}
      preferenceAdapter={f.adapter} widgets={{ card: 'Card' }} />);
    f.recover();
    act(() => window.dispatchEvent(new CustomEvent('bsuite-page-grid-save', { detail: { pageKey: 'permission' } })));
    expect(f.flush).toHaveBeenCalledTimes(7);
  });

  it('composes appearance fields changed before the next render', () => {
    const f = fixture('card_style');
    render(grid(f.adapter));
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Expand controls: columns, cards and layers' }));
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Card shadow depth' }), { target: { value: '4' } });
      fireEvent.change(screen.getByRole('slider', { name: 'Card inner padding in pixels' }), { target: { value: '8' } });
    });
    expect((screen.getByRole('combobox', { name: 'Card shadow depth' }) as HTMLSelectElement).value).toBe('4');
    expect((screen.getByRole('slider', { name: 'Card inner padding in pixels' }) as HTMLInputElement).value).toBe('8');
  });

  it.each(suffixes)('waits for %s before exiting', async (suffix) => {
    const f = fixture(suffix);
    render(grid(f.adapter));
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
    expect(f.flush.mock.calls.map(([key]) => key).sort()).toEqual(
      suffixes.map(key => 'page:save-contract_' + key).sort());
    expect(screen.getByRole('button', { name: 'Saving…' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('region', { name: 'Canvas editor controls' })).toBeTruthy();
    await act(async () => { f.complete(); });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Canvas editor controls' })).toBeNull());
  });

  it('keeps changes visible on failure and permits retry', async () => {
    const f = fixture('card_style');
    render(grid(f.adapter));
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
    await act(async () => { f.fail(); });
    expect(screen.getByRole('alert').textContent).toContain('could not be saved');
    expect((screen.getByRole('textbox', { name: 'Widget draft' }) as HTMLInputElement).value).toBe('Keep this text');
    expect(screen.getByRole('region', { name: 'Canvas editor controls' })).toBeTruthy();
    f.recover();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Canvas editor controls' })).toBeNull());
  });

  it('does not close the next page when an earlier page finishes saving', async () => {
    const f = fixture('card_style');
    const view = render(grid(f.adapter));
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
    view.rerender(grid(f.adapter, 'next-page'));
    openEditor();
    await act(async () => { f.complete(); });
    expect(screen.getByRole('region', { name: 'Canvas editor controls' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save & Exit' }).hasAttribute('disabled')).toBe(false);
  });
});
