/**
 * bsuite#3277 — a failed preference read must never lead to a write.
 *
 * On a device with no local copy, crm7 and business-suite-unified reported a
 * failed `_grid_version` read as "loaded, version 0". The version gate then took
 * its discard branch and wrote the defaults over the user's saved
 * `_grid_layouts` — measured on 200 of 200 pages with the real 2.7.0 hook
 * (r9-independent-redteam instrument ir1b).
 *
 * The rule these tests hold the hook to: no version gate, no migration, no
 * discard and no write of ANY kind while any key the hook reads or writes is
 * still loading or has failed. `status` is authoritative over `loaded` when an
 * adapter reports it, because an adapter that merely adds `status` beside its
 * old "the read settled" `loaded` is the first thing a consumer will ship.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PACKAGE_LAYOUT_EPOCH, usePageGridLayout } from '../usePageGridLayout.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';
import { createRemoteHarness, keyHasSuffix, type ReadOutcome } from './readFailureHarness.js';

const PAGE = 'read-failure';
const key = (suffix: string) => `page:${PAGE}_${suffix}`;

// Module-scope: `defaultLayouts` is an effect dependency (see layoutVersionMigration.test.tsx).
const DEFAULTS: GridLayouts = {
  lg: [
    { i: 'a', x: 0, y: 0, w: 6, h: 4 },
    { i: 'b', x: 6, y: 0, w: 6, h: 4 },
    { i: 'c', x: 0, y: 4, w: 12, h: 4 },
  ],
};
/** The user's own arrangement: the same cards, rearranged. Distinct from DEFAULTS
 *  in every position, so a discard is visible rather than coincidentally equal. */
const SAVED: GridLayouts = {
  lg: [
    { i: 'c', x: 0, y: 0, w: 12, h: 4 },
    { i: 'a', x: 0, y: 4, w: 6, h: 4 },
    { i: 'b', x: 6, y: 4, w: 6, h: 4 },
  ],
};
const CURRENT_VERSION = 1 + PACKAGE_LAYOUT_EPOCH;
const STALE_VERSION = PACKAGE_LAYOUT_EPOCH;

function seedSaved(store: Map<string, unknown>, version = CURRENT_VERSION) {
  store.set(key('grid_layouts'), SAVED);
  store.set(key('grid_version'), version);
  store.set(key('grid_cols'), 12);
  store.set(key('grid_base_cols'), 12);
}

/** Every key except the named one reads successfully on every attempt. */
const only = (suffix: string, outcome: ReadOutcome, onRetry: ReadOutcome = outcome) =>
  (k: string, attempt: number): ReadOutcome =>
    keyHasSuffix(k, suffix) ? (attempt === 0 ? outcome : onRetry) : 'ok';

const settle = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function renderGrid(adapter: PageGridPreferenceFactory) {
  return renderHook(() =>
    usePageGridLayout({ pageKey: PAGE, defaultLayouts: DEFAULTS, layoutVersion: 1, preferenceAdapter: adapter }),
  );
}

describe('bsuite#3277 — a failed read never leads to a write', () => {
  it('control: every read succeeds and the stored version is current — nothing is written', async () => {
    const h = createRemoteHarness({ script: () => 'ok' });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('loaded');
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  it('a failed _grid_version read on a device with no local copy writes nothing (adapter reports loaded on settle)', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail'), loadedOnSettle: true });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
    expect(h.store.get(key('grid_version'))).toBe(CURRENT_VERSION);
  });

  it('a failed _grid_version read writes nothing (adapter keeps loaded false on failure)', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail') });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  it('status wins over loaded: an adapter still loading but claiming loaded does not open the gate', async () => {
    const writes: string[] = [];
    const lying: PageGridPreferenceFactory = <T,>(k: string, fallback: T) => ({
      value: fallback,
      setValue: () => writes.push(k),
      loaded: true,
      status: keyHasSuffix(k, 'grid_version') ? 'loading' : 'loaded',
    });
    const { result } = renderGrid(lying);
    await settle();
    expect(result.current.preferencesStatus).toBe('loading');
    expect(writes).toEqual([]);
  });

  it('an adapter without status keeps the pre-3277 meaning of loaded', async () => {
    const legacy: PageGridPreferenceFactory = <T,>(k: string, fallback: T) => ({
      value: fallback,
      setValue: () => undefined,
      loaded: !keyHasSuffix(k, 'grid_layouts'),
    });
    const { result } = renderGrid(legacy);
    await settle();
    expect(result.current.preferencesStatus).toBe('loading');
  });

  it('a late-landing _grid_version: nothing runs until it lands, and a current version then writes nothing', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'hold') });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('loading');
    expect(h.writes).toEqual([]);
    act(() => h.release('grid_version', 'ok'));
    await settle();
    expect(result.current.preferencesStatus).toBe('loaded');
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  it('a late-landing stale _grid_version runs the gate exactly once, after it lands', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'hold') });
    seedSaved(h.store, STALE_VERSION);
    renderGrid(h.adapter);
    await settle();
    expect(h.writes).toEqual([]);
    act(() => h.release('grid_version', 'ok'));
    await settle();
    expect([...h.writes].sort()).toEqual(
      [key('grid_base_cols'), key('grid_cols'), key('grid_layouts'), key('grid_version')].sort(),
    );
    expect(h.store.get(key('grid_version'))).toBe(CURRENT_VERSION);
  });

  it('a late-landing key the gate WRITES but does not read (_grid_cols) holds a stale-version discard until it lands', async () => {
    const h = createRemoteHarness({ script: only('grid_cols', 'hold') });
    seedSaved(h.store, STALE_VERSION);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('loading');
    expect(h.writes).toEqual([]);
    act(() => h.release('grid_cols', 'ok'));
    await settle();
    expect(h.writes).toContain(key('grid_layouts'));
    expect(h.store.get(key('grid_version'))).toBe(CURRENT_VERSION);
  });

  it('a failed key the gate writes (_grid_base_cols) blocks a stale-version discard', async () => {
    const h = createRemoteHarness({ script: only('grid_base_cols', 'fail') });
    seedSaved(h.store, STALE_VERSION);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  it.each([
    ['failed', 'fail'],
    ['still loading', 'hold'],
  ] as const)('refuses every user-driven write while _grid_layouts is %s', async (_label, outcome) => {
    const h = createRemoteHarness({ script: only('grid_layouts', outcome) });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    act(() => result.current.setIsEditing(true));
    const r = result.current;
    act(() => {
      r.onLayoutChange(null, { lg: [{ i: 'a', x: 6, y: 8, w: 6, h: 4 }] }, true);
      r.handleCompact();
      r.handleReset();
      r.addWidget('d');
      r.moveWidget('a', 'down');
      r.setWidgetLocked('a', true);
      r.removeWidget('b');
      r.handleColumnChange(4);
    });
    await act(async () => {
      await nextFrame();
    });
    await settle();
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  it('Retry re-reads ONLY the failed key, in place — the editor stays open and nothing is written', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail', 'ok') });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    act(() => result.current.setIsEditing(true));
    expect(result.current.preferencesStatus).toBe('failed');
    expect(result.current.canRetryPreferences).toBe(true);
    act(() => result.current.retryPreferences());
    expect(h.retries).toEqual([key('grid_version')]);
    await settle();
    expect(result.current.preferencesStatus).toBe('loaded');
    expect(result.current.isEditing).toBe(true);
    expect(h.writes).toEqual([]);
    expect(h.store.get(key('grid_layouts'))).toEqual(SAVED);
  });

  /*
   * The pause must LIFT as completely as it fell. A mutator that closed over the
   * paused write funnel keeps refusing after the failed key loads, and the user
   * — told "editing starts as soon as they arrive" — clicks Move and nothing
   * happens. Retrying `_grid_version` changes no layout value, so nothing else
   * re-creates the mutator; only an honest dependency on the funnel does.
   */
  it.each([
    ['moveWidget', (r: ReturnType<typeof usePageGridLayout>) => r.moveWidget('a', 'down')],
    ['setWidgetLocked', (r: ReturnType<typeof usePageGridLayout>) => r.setWidgetLocked('a', true)],
    ['removeWidget', (r: ReturnType<typeof usePageGridLayout>) => r.removeWidget('b')],
    ['addWidget', (r: ReturnType<typeof usePageGridLayout>) => r.addWidget('d')],
  ] as const)('after Retry loads the failed key, %s saves again', async (_name, mutate) => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail', 'ok') });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    act(() => result.current.setIsEditing(true));
    act(() => result.current.retryPreferences());
    await settle();
    expect(result.current.preferencesStatus).toBe('loaded');
    expect(h.writes).toEqual([]);
    act(() => mutate(result.current));
    await settle();
    expect(h.writes).toContain(key('grid_layouts'));
    expect(h.store.get(key('grid_layouts'))).not.toEqual(SAVED);
  });

  it('a retry that fails again stays failed, and a later retry can still recover', async () => {
    let versionAttempts = 0;
    const h = createRemoteHarness({
      script: (k) => {
        if (!keyHasSuffix(k, 'grid_version')) return 'ok';
        versionAttempts += 1;
        return versionAttempts < 3 ? 'fail' : 'ok';
      },
    });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    act(() => result.current.retryPreferences());
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    act(() => result.current.retryPreferences());
    await settle();
    expect(result.current.preferencesStatus).toBe('loaded');
    expect(h.writes).toEqual([]);
  });

  it('a failed key whose adapter cannot retry reports that no retry is possible', async () => {
    const h = createRemoteHarness({ script: only('grid_version', 'fail'), retryable: false });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    expect(result.current.canRetryPreferences).toBe(false);
    expect(() => act(() => result.current.retryPreferences())).not.toThrow();
    expect(h.writes).toEqual([]);
  });

  it('a failure outranks a key still loading in the aggregate status', async () => {
    const h = createRemoteHarness({
      script: (k) => (keyHasSuffix(k, 'grid_version') ? 'fail' : keyHasSuffix(k, 'grid_layouts') ? 'hold' : 'ok'),
    });
    seedSaved(h.store);
    const { result } = renderGrid(h.adapter);
    await settle();
    expect(result.current.preferencesStatus).toBe('failed');
    expect(h.writes).toEqual([]);
  });
});
