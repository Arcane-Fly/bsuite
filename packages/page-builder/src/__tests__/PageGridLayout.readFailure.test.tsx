/**
 * bsuite#3277 — the edit gate. While any preference the canvas reads or writes
 * is loading or has failed, the editor stays open but paused: it says why,
 * offers Retry for a failed read, disables every editing control and refuses
 * every write — including the component's own keys (layer names, hidden layers,
 * card appearance), which the hook never sees.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import { PACKAGE_LAYOUT_EPOCH } from '../usePageGridLayout.js';
import type { GridLayouts, PageGridLayoutProps, PageGridPreferenceFactory } from '../types.js';
import { createRemoteHarness, keyHasSuffix, type ReadOutcome } from './readFailureHarness.js';

const PAGE = 'edit-gate';
const key = (suffix: string) => `page:${PAGE}_${suffix}`;
const LAYOUTS: GridLayouts = {
  lg: [
    { i: 'alpha', x: 0, y: 0, w: 6, h: 4 },
    { i: 'beta', x: 6, y: 0, w: 6, h: 4 },
  ],
};
const WIDGETS = { alpha: <div>Alpha card</div>, beta: <div>Beta card</div> };
const WIDGET_META = { alpha: { label: 'Alpha' }, beta: { label: 'Beta' } };

const only = (suffix: string, outcome: ReadOutcome, onRetry: ReadOutcome = outcome) =>
  (k: string, attempt: number): ReadOutcome =>
    keyHasSuffix(k, suffix) ? (attempt === 0 ? outcome : onRetry) : 'ok';

function seed(store: Map<string, unknown>) {
  store.set(key('grid_layouts'), LAYOUTS);
  store.set(key('grid_version'), 1 + PACKAGE_LAYOUT_EPOCH);
  store.set(key('grid_cols'), 12);
  store.set(key('grid_base_cols'), 12);
}

const settle = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });

async function mount(adapter: PageGridPreferenceFactory, extra: Partial<PageGridLayoutProps> = {}) {
  const view = render(
    <PageGridLayout
      pageKey={PAGE}
      defaultLayouts={LAYOUTS}
      layoutVersion={1}
      canEditPage
      preferenceAdapter={adapter}
      widgets={WIDGETS}
      widgetMeta={WIDGET_META}
      {...extra}
    />,
  );
  await settle();
  act(() => window.dispatchEvent(new CustomEvent('bsuite-open-page-editor')));
  return view;
}

const expand = () => fireEvent.click(screen.getByRole('button', { name: 'Expand controls: columns, cards and layers' }));
const isDisabled = (el: Element) => el.matches(':disabled') || Boolean(el.closest('fieldset[disabled]'));

afterEach(cleanup);

describe('bsuite#3277 — the edit gate pauses editing after a failed read', () => {
  it('shows why editing is paused, with Retry, when a read failed', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    await mount(h.adapter);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/couldn.t be loaded/i);
    expect(alert.textContent).toMatch(/paused/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('says it is loading, without Retry, while a read is still in flight', async () => {
    const h = createRemoteHarness({ script: only('grid_layouts', 'hold') });
    seed(h.store);
    const { container } = await mount(h.adapter);
    const status = screen.getByRole('status');
    expect(status.getAttribute('data-page-grid-editing-paused')).toBe('loading');
    expect(container.querySelectorAll('[data-page-grid-editing-paused]')).toHaveLength(1);
    expect(status.textContent).toMatch(/loading/i);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables every editing control while paused', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    await mount(h.adapter);
    expand();
    const controls = [
      screen.getByRole('slider', { name: 'Column count' }),
      ...screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') !== null),
      screen.getByRole('slider', { name: 'Card corner radius in pixels' }),
      screen.getByRole('combobox', { name: 'Card border colour' }),
      screen.getByRole('textbox', { name: 'Rename Alpha' }),
      screen.getByRole('button', { name: 'Move Alpha down' }),
      screen.getByRole('button', { name: 'Lock Alpha' }),
      screen.getByRole('button', { name: /Compact Layout/ }),
      screen.getByRole('button', { name: /Reset to Default/ }),
    ];
    expect(controls.length).toBeGreaterThan(9);
    expect(controls.filter((el) => !isDisabled(el)).map((el) => el.getAttribute('aria-label') ?? el.textContent)).toEqual([]);
    // The card's own hide button, on the canvas rather than in the banner.
    const hideOnCard = screen.getAllByRole('button', { name: 'Hide Alpha' });
    expect(hideOnCard.length).toBeGreaterThan(0);
    expect(hideOnCard.filter((el) => !isDisabled(el))).toEqual([]);
    // The two controls that must stay usable: expanding, and leaving.
    expect(isDisabled(screen.getByRole('button', { name: 'Collapse controls' }))).toBe(false);
    expect(isDisabled(screen.getByRole('button', { name: 'Exit' }))).toBe(false);
  });

  it('turns dragging and resizing off while paused', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    const { container } = await mount(h.adapter);
    const item = container.querySelector('.react-grid-item') as HTMLElement;
    expect(item.classList.contains('react-draggable')).toBe(false);
    expect(item.classList.contains('react-resizable-hide')).toBe(true);
  });

  it('refuses every write while paused, including the canvas’s own keys', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    const onRegisterEntityWidget = vi.fn();
    const onRegisterRelationshipWidget = vi.fn();
    await mount(h.adapter, {
      createEntityWidget: ({ widgetId }) => <div>{widgetId}</div>,
      onRegisterEntityWidget,
      createRelationshipWidget: ({ widgetId }) => <div>{widgetId}</div>,
      onRegisterRelationshipWidget,
      relationshipCatalog: [{ hostEntityType: 'people', fkColumn: 'client_id', targetEntityType: 'organisations' }],
    });
    expand();
    // jsdom dispatches these even to disabled controls; the writes must be refused underneath.
    fireEvent.change(screen.getByRole('slider', { name: 'Column count' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Card corner radius in pixels' }), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset cards/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename Alpha' }), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move Alpha down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock Alpha' }));
    for (const hide of screen.getAllByRole('button', { name: 'Hide Alpha' })) fireEvent.click(hide);
    fireEvent.click(screen.getByRole('button', { name: /Compact Layout/ }));
    act(() =>
      window.dispatchEvent(new CustomEvent('bsu-add-entity-widget', { detail: { entityType: 'contacts' } })),
    );
    act(() =>
      window.dispatchEvent(
        new CustomEvent('bsu-add-relationship-widget', {
          detail: { hostEntityType: 'people', fkColumn: 'client_id', targetEntityType: 'organisations' },
        }),
      ),
    );
    await settle();
    expect(h.writes).toEqual([]);
    // A consumer's registration callback may persist the widget; it must not run either.
    expect(onRegisterEntityWidget).not.toHaveBeenCalled();
    expect(onRegisterRelationshipWidget).not.toHaveBeenCalled();
    // The request still lands the user in the editor, where the reason is shown.
    expect(screen.getByRole('alert').textContent).toMatch(/paused/i);
  });

  it('Retry re-reads only the failed key and resumes editing in place', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail', 'ok') });
    seed(h.store);
    await mount(h.adapter);
    const banner = screen.getByRole('region', { name: 'Canvas editor controls' });
    expand();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(h.retries).toEqual([key('grid_version')]);
    await settle();
    expect(screen.queryByRole('alert')).toBeNull();
    // Same DOM node, still expanded: nothing remounted.
    expect(screen.getByRole('region', { name: 'Canvas editor controls' })).toBe(banner);
    expect(screen.getByRole('button', { name: 'Collapse controls' })).toBeTruthy();
    expect(isDisabled(screen.getByRole('slider', { name: 'Column count' }))).toBe(false);
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toBeTruthy();
    expect(h.writes).toEqual([]);
  });

  it('after Retry, a card move saves — the pause lifts for every control, not only the banner', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail', 'ok') });
    seed(h.store);
    await mount(h.adapter);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();
    expand();
    fireEvent.click(screen.getByRole('button', { name: 'Move Alpha down' }));
    await settle();
    expect(h.writes).toContain(key('grid_layouts'));
  });

  it('does not promise dragging while paused', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    await mount(h.adapter);
    expand();
    const banner = screen.getByRole('region', { name: 'Canvas editor controls' });
    expect(banner.textContent).not.toMatch(/drag anywhere/i);
  });

  it('says so when a retry fails again, and keeps Retry', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail', 'fail') });
    seed(h.store);
    await mount(h.adapter);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/still couldn.t/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('pauses on a failed read of the canvas’s own key (card appearance)', async () => {
    const h = createRemoteHarness({ script: only('card_style', 'fail', 'ok') });
    seed(h.store);
    await mount(h.adapter);
    expect(screen.getByRole('alert').textContent).toMatch(/couldn.t be loaded/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(h.retries).toEqual([key('card_style')]);
    await settle();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Exit while paused closes the editor without asking any key to save', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seed(h.store);
    await mount(h.adapter);
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await settle();
    expect(screen.queryByRole('region', { name: 'Canvas editor controls' })).toBeNull();
    expect(h.flushes).toEqual([]);
  });

  it('a failed read whose adapter cannot retry says to reload instead of offering Retry', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail'), retryable: false });
    seed(h.store);
    await mount(h.adapter);
    expect(screen.getByRole('alert').textContent).toMatch(/reload the page/i);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('control: with every read loaded there is no pause and controls are enabled', async () => {
    const h = createRemoteHarness({ script: () => 'ok' });
    seed(h.store);
    const { container } = await mount(h.adapter);
    expand();
    expect(screen.queryByRole('alert')).toBeNull();
    // Not `queryByRole('status')`: the card-appearance readout is an <output>, whose role IS status.
    expect(container.querySelector('[data-page-grid-editing-paused]')).toBeNull();
    expect(isDisabled(screen.getByRole('slider', { name: 'Column count' }))).toBe(false);
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toBeTruthy();
  });
});
