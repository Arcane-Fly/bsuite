/**
 * A `layoutVersion` bump must be able to MIGRATE a saved layout, not only
 * destroy it.
 *
 * Until now `usePageGridLayout` had exactly one response to
 * `savedLayoutVersion < effectiveLayoutVersion`: overwrite the stored layout
 * with `defaultLayouts`. That is correct for the reason epoch 8 was raised —
 * saved layouts referencing widgets that no longer exist cannot be repaired —
 * and catastrophic for the far more common reason a version gets bumped: a
 * DEFAULT WIDTH changed. crm7#2490 bumped four routes' versions purely to
 * change default card widths and, measured on one account
 * (braden@braden.com.au), cost 14 stored layouts.
 *
 * The doctrine is already written in this file, forty lines below the
 * discard, in the derived-breakpoint heal:
 *
 *   "`lg` (the only breakpoint that was ever authoritative) is preserved
 *    untouched, so nobody loses the arrangement they made."
 *
 * So: migrate, do not discard — and keep the discard as the fallback for any
 * step nobody registered a migration for.
 */

import { act, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PACKAGE_LAYOUT_EPOCH,
  usePageGridLayout,
} from '../usePageGridLayout.js';
import { adoptUnchangedDefaults } from '../layoutMigrations.js';
import { buildCanvasCardLayout } from '../canvasCardLayout.js';
import { CanvasCard } from '../CanvasCard.js';
import type {
  GridLayoutItem,
  GridLayouts,
  LayoutMigration,
  PageGridPreferenceFactory,
} from '../types.js';

// ---------------------------------------------------------------------------
// Durable preference adapter — the same stand-in
// `usePageGridLayout.persistence.test.tsx` uses. `setValue` really re-renders,
// so a clobber-on-next-render would surface rather than hide.
// ---------------------------------------------------------------------------
const store = new Map<string, unknown>();
const durableAdapter: PageGridPreferenceFactory = <T,>(key: string, fallback: T) => {
  const [value, setStateValue] = useState<T>(() =>
    store.has(key) ? (store.get(key) as T) : fallback,
  );
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      setStateValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
        store.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return { value, setValue, loaded: true };
};

const savedLayoutsFor = (pageKey: string) =>
  store.get(`page:${pageKey}_grid_layouts`) as GridLayouts | undefined;
const savedVersionFor = (pageKey: string) =>
  store.get(`page:${pageKey}_grid_version`) as number | undefined;

const seed = (pageKey: string, version: number, layouts: GridLayouts) => {
  store.set(`page:${pageKey}_grid_version`, version);
  store.set(`page:${pageKey}_grid_layouts`, layouts);
};

const itemOf = (layouts: GridLayouts | undefined, bp: string, i: string) =>
  (layouts?.[bp] ?? []).find((item) => item.i === i);

/*
 * MODULE-SCOPE CONSTANTS, DELIBERATELY.
 *
 * `defaultLayouts` and `layoutMigrations` are both effect dependencies. A
 * fresh object literal per render gives them a new identity every render, and
 * an effect that writes state on a dependency that changes every render is an
 * infinite render loop — which does not FAIL a vitest run, it HANGS it, with
 * no assertion and no stack. Hoisting the returned objects to singletons is
 * the same discipline a mocked return needs.
 */

// The /clients shape, reduced to what the bump actually moved. Old defaults:
// four stat cards authored `w={3}` but stored at 4, because CanvasCard's
// default `minW` is 4 and `buildCanvasCardLayout` clamps `w` UP to `minW`.
const CLIENTS_NEW_DEFAULTS: GridLayouts = {
  lg: [
    { i: 'stat-total', x: 0, y: 0, w: 3, h: 6, minW: 3, minH: 2 },
    { i: 'stat-active', x: 3, y: 0, w: 3, h: 6, minW: 3, minH: 2 },
    { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
    { i: 'dialog', x: 0, y: 12, w: 4, h: 6, minW: 4, minH: 2 },
  ],
};

const CLIENTS_PREVIOUS_DEFAULTS = {
  'stat-total': { w: 4, minW: 4, position: { x: 0, y: 0 } },
  'stat-active': { w: 4, minW: 4, position: { x: 4, y: 0 } },
  dialog: { w: 12, minW: 4, position: { x: 0, y: 12 } },
} as const;

const CLIENTS_MIGRATIONS: Readonly<Record<number, LayoutMigration>> = {
  2: adoptUnchangedDefaults(CLIENTS_PREVIOUS_DEFAULTS),
};

/** What the old defaults stored, verbatim — a user who never dragged anything. */
const CLIENTS_UNTOUCHED_SAVE: GridLayouts = {
  lg: [
    { i: 'stat-total', x: 0, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
    { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
  ],
};

describe('layoutVersion bump migrates a saved layout instead of discarding it', () => {
  beforeEach(() => store.clear());

  // -------------------------------------------------------------------------
  // 1. A width the USER chose survives the bump.
  // -------------------------------------------------------------------------
  it('keeps a width the user chose, and keeps the position they dragged it to', async () => {
    const pageKey = '/clients';
    // stat-total dragged to (6,3) and pulled out to w=6 — none of that is the
    // old default, so all of it is a decision the user made.
    seed(pageKey, 2 - 1 + PACKAGE_LAYOUT_EPOCH, {
      lg: [
        { i: 'stat-total', x: 6, y: 3, w: 6, h: 9, minW: 4, minH: 2, hUserSet: true },
        { i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
        { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
        { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
      ],
    });

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        layoutMigrations: CLIENTS_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    const total = itemOf(saved, 'lg', 'stat-total');
    expect(total).toBeDefined();
    // The chosen width is NOT replaced by the new default of 3.
    expect(total?.w).toBe(6);
    // ...and neither is anything else about it.
    expect(total?.x).toBe(6);
    expect(total?.y).toBe(3);
    expect(total?.h).toBe(9);
    expect(total?.hUserSet).toBe(true);
    // The version still moves, so the migration runs exactly once.
    expect(savedVersionFor(pageKey)).toBe(2 + PACKAGE_LAYOUT_EPOCH);
  });

  // -------------------------------------------------------------------------
  // 2. A width still at the OLD DEFAULT moves to the new default.
  // -------------------------------------------------------------------------
  it('moves a width still sitting at the old default onto the new default', async () => {
    const pageKey = '/clients';
    seed(pageKey, 2 - 1 + PACKAGE_LAYOUT_EPOCH, CLIENTS_UNTOUCHED_SAVE);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        layoutMigrations: CLIENTS_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    // READ THE POSITIONAL ASSERTION AT THE BOTTOM AS THE DISCRIMINATOR. On a
    // layout that is identical to the old defaults, "adopted the new default
    // width" and "was discarded and replaced by the new defaults" produce the
    // same `w` — so these width assertions pass under the defect too, and only
    // the untouched `x` tells the two apart. The next test drives both halves
    // at once on a layout where they cannot agree.
    // w 4 -> 3 and minW 4 -> 3 on both stat cards: the user never chose either.
    expect(itemOf(saved, 'lg', 'stat-total')?.w).toBe(3);
    expect(itemOf(saved, 'lg', 'stat-total')?.minW).toBe(3);
    expect(itemOf(saved, 'lg', 'stat-active')?.w).toBe(3);
    expect(itemOf(saved, 'lg', 'stat-active')?.minW).toBe(3);
    // dialog 12 -> 4.
    expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
    // The table's 12 did not change in the bump and has no previous-default
    // entry, so it is left exactly alone.
    expect(itemOf(saved, 'lg', 'table')?.w).toBe(12);

    // POSITION IS ADOPTED TOO, on exactly the same rule as width.
    //
    // This assertion is INVERTED from what it first pinned. It used to assert
    // the OLD x/y survived — stat-active still at x 4 — and called the result a
    // residual worth measuring. It was: an item narrowed from 4 to 3 but left
    // at x 4 is a layout nobody authored and nobody chose. A saved x/y still
    // equal to the old default was never a decision either; it is inherited
    // furniture, and treating width as inherited while treating position as
    // sacred splits one rule into two.
    expect((saved?.lg ?? []).map((item) => [item.i, item.x, item.y])).toEqual([
      ['stat-total', 0, 0],
      ['stat-active', 3, 0],
      ['table', 0, 6],
      ['dialog', 0, 12],
    ]);
  });

  // -------------------------------------------------------------------------
  // 2b. The real crm7 shape: ONE card dragged, every width still at its
  //     default. Adopting and preserving have to happen in the same pass, and
  //     no discard can produce this result.
  //
  //     NOTE THE CHANGED PREMISE. This case first asserted that the dragged
  //     card adopted the new WIDTH while keeping its position. Under one rule —
  //     adopt what the user never chose, keep what they did — a card the user
  //     placed is immune to both: resizing a hand-placed card underneath
  //     someone is the same category of loss as moving it.
  // -------------------------------------------------------------------------
  it('leaves the one card the user moved entirely alone, while its siblings adopt', async () => {
    const pageKey = '/clients';
    seed(pageKey, 2 - 1 + PACKAGE_LAYOUT_EPOCH, {
      lg: [
        // Dragged to the second row and nowhere near a default position.
        { i: 'stat-total', x: 8, y: 30, w: 4, h: 6, minW: 4, minH: 2 },
        { i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
        { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
        { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
      ],
    });

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        layoutMigrations: CLIENTS_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    const total = itemOf(saved, 'lg', 'stat-total');
    // Placed by hand: immune. Width and position both survive.
    expect(total?.w).toBe(4);
    expect(total?.x).toBe(8);
    expect(total?.y).toBe(30);
    // Its untouched siblings still adopt, so the veto is per item, not per
    // page — and a discard could produce neither half of this.
    expect(itemOf(saved, 'lg', 'stat-active')?.w).toBe(3);
    expect(itemOf(saved, 'lg', 'stat-active')?.x).toBe(3);
    expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
  });

  // -------------------------------------------------------------------------
  // 3. The epoch-8 escape hatch: a step with NO registered migration discards.
  // -------------------------------------------------------------------------
  it('still discards wholesale when a version step has no registered migration', async () => {
    const pageKey = '/dashboard';
    const arranged: GridLayouts = {
      lg: [
        { i: 'stat-total', x: 6, y: 3, w: 6, h: 9, minW: 4, minH: 2 },
        { i: 'stat-active', x: 0, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
        { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
        { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
      ],
    };
    // Saved two steps below the target. Step 2 has a migration; step 3 does
    // not — epoch 8's reason was genuine (saved layouts referenced widgets
    // that no longer existed) and that escape hatch has to survive.
    seed(pageKey, 1 + PACKAGE_LAYOUT_EPOCH, arranged);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 3,
        layoutMigrations: CLIENTS_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    expect(saved).toEqual(CLIENTS_NEW_DEFAULTS);
    expect(savedVersionFor(pageKey)).toBe(3 + PACKAGE_LAYOUT_EPOCH);
  });

  it('discards when NO migrations are registered at all — the pre-existing behaviour', async () => {
    const pageKey = '/legacy';
    seed(pageKey, 1 + PACKAGE_LAYOUT_EPOCH, CLIENTS_UNTOUCHED_SAVE);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    expect(savedLayoutsFor(pageKey)).toEqual(CLIENTS_NEW_DEFAULTS);
    expect(savedVersionFor(pageKey)).toBe(2 + PACKAGE_LAYOUT_EPOCH);
  });

  // -------------------------------------------------------------------------
  // 4. Sequencing, asserted by CALL COUNT.
  // -------------------------------------------------------------------------
  it('applies every registered step in ascending order, exactly once each', async () => {
    const pageKey = '/multi';
    const calls: string[] = [];
    const stepTwo = vi.fn<LayoutMigration>((saved) => {
      calls.push('2');
      return {
        lg: (saved.lg ?? []).map((item) => ({ ...item, w: item.w + 1 })),
      };
    });
    const stepThree = vi.fn<LayoutMigration>((saved) => {
      calls.push('3');
      return {
        lg: (saved.lg ?? []).map((item) => ({ ...item, w: item.w * 10 })),
      };
    });
    const migrations: Readonly<Record<number, LayoutMigration>> = { 2: stepTwo, 3: stepThree };

    seed(pageKey, 1 + PACKAGE_LAYOUT_EPOCH, {
      lg: [{ i: 'a', x: 0, y: 0, w: 2, h: 4 }],
    });

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: { lg: [{ i: 'a', x: 0, y: 0, w: 9, h: 4 }] },
        layoutVersion: 3,
        layoutMigrations: migrations,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    // Order matters and so does the count: (2 + 1) * 10 = 30 proves 2 ran
    // before 3, where 2 * 10 + 1 = 21 would prove the reverse.
    expect(calls).toEqual(['2', '3']);
    expect(stepTwo).toHaveBeenCalledTimes(1);
    expect(stepThree).toHaveBeenCalledTimes(1);
    expect(itemOf(savedLayoutsFor(pageKey), 'lg', 'a')?.w).toBe(30);
  });

  it('does not call a migration when the stored version is already current', async () => {
    const pageKey = '/current';
    const migration = vi.fn<LayoutMigration>((saved) => saved);
    seed(pageKey, 2 + PACKAGE_LAYOUT_EPOCH, CLIENTS_UNTOUCHED_SAVE);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        layoutMigrations: { 2: migration },
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    // A NEGATIVE case asserted as a COUNT, not as a boolean: `not.toHaveBeenCalled()`
    // passes just as happily when the subject was never reached at all.
    expect(migration).toHaveBeenCalledTimes(0);
    expect(savedLayoutsFor(pageKey)).toEqual(CLIENTS_UNTOUCHED_SAVE);
  });

  it('does not call a migration on a first visit — there is no layout to migrate', async () => {
    const pageKey = '/first-visit';
    const migration = vi.fn<LayoutMigration>((saved) => saved);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2,
        layoutMigrations: { 2: migration },
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    expect(migration).toHaveBeenCalledTimes(0);
    expect(savedLayoutsFor(pageKey)).toEqual(CLIENTS_NEW_DEFAULTS);
  });
});

describe('the /clients wrap — the acceptance test for adopting position', () => {
  beforeEach(() => store.clear());

  /*
   * The layouts here are NOT hand-typed. Both sides are produced by
   * `buildCanvasCardLayout` — the same function the page itself goes through —
   * from the CanvasCard props the route authored before and after crm7#2490.
   * Only those props are transcribed, and they were read off the two commits.
   * Hand-typing x/y would be typing the answer into the fixture.
   */
  const clientsCards = (post2490: boolean) => (
    <>
      <CanvasCard cardKey="stat-total" w={3} {...(post2490 ? { minW: 3 } : {})}><div /></CanvasCard>
      <CanvasCard cardKey="stat-active" w={3} {...(post2490 ? { minW: 3 } : {})}><div /></CanvasCard>
      <CanvasCard cardKey="stat-host-employers" w={3} {...(post2490 ? { minW: 3 } : {})}><div /></CanvasCard>
      <CanvasCard cardKey="stat-inactive" w={3} {...(post2490 ? { minW: 3 } : {})}><div /></CanvasCard>
      <CanvasCard cardKey="card2" w={12} h={6}><div /></CanvasCard>
      <CanvasCard cardKey="card3" w={post2490 ? 4 : 12} h={6}><div /></CanvasCard>
    </>
  );

  const OLD_CLIENTS = buildCanvasCardLayout(clientsCards(false)).layouts;
  const NEW_CLIENTS = buildCanvasCardLayout(clientsCards(true)).layouts;

  const row = (layouts: GridLayouts | undefined, i: string) => {
    const item = itemOf(layouts, 'lg', i);
    return item ? [item.x, item.y, item.w] : undefined;
  };

  it('the fixture really does reproduce the wrap, and really does author 0/3/6/9', () => {
    // Positive control on the fixture itself. If `buildCanvasCardLayout` did
    // not wrap the fourth stat card before #2490, this whole describe block
    // would be testing a defect that never existed.
    expect(row(OLD_CLIENTS, 'stat-total')).toEqual([0, 0, 4]);
    expect(row(OLD_CLIENTS, 'stat-active')).toEqual([4, 0, 4]);
    expect(row(OLD_CLIENTS, 'stat-host-employers')).toEqual([8, 0, 4]);
    // THE WRAP: w={3} clamped up to the default minW of 4, so three cards fill
    // the row and the fourth falls to y 6 on its own.
    expect(row(OLD_CLIENTS, 'stat-inactive')).toEqual([0, 6, 4]);
    // ...and after #2490, all four sit on one row.
    expect(row(NEW_CLIENTS, 'stat-total')).toEqual([0, 0, 3]);
    expect(row(NEW_CLIENTS, 'stat-active')).toEqual([3, 0, 3]);
    expect(row(NEW_CLIENTS, 'stat-host-employers')).toEqual([6, 0, 3]);
    expect(row(NEW_CLIENTS, 'stat-inactive')).toEqual([9, 0, 3]);
  });

  const CLIENTS_PREVIOUS = {
    'stat-total': { w: 4, minW: 4, position: { x: 0, y: 0 } },
    'stat-active': { w: 4, minW: 4, position: { x: 4, y: 0 } },
    'stat-host-employers': { w: 4, minW: 4, position: { x: 8, y: 0 } },
    'stat-inactive': { w: 4, minW: 4, position: { x: 0, y: 6 } },
    card3: { w: 12, position: { x: 0, y: 18 } },
  } as const;
  const CLIENTS_FULL_MIGRATIONS: Readonly<Record<number, LayoutMigration>> = {
    2: adoptUnchangedDefaults(CLIENTS_PREVIOUS),
  };

  it('un-wraps the stat row: a never-arranged page reaches the authored 0/3/6/9', async () => {
    const pageKey = '/clients-wrap';
    // A user who has loaded the page and never touched it: the old discard
    // stored the old defaults verbatim.
    seed(pageKey, 2 - 1 + PACKAGE_LAYOUT_EPOCH, OLD_CLIENTS);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: NEW_CLIENTS,
        layoutVersion: 2,
        layoutMigrations: CLIENTS_FULL_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    expect(row(saved, 'stat-total')).toEqual([0, 0, 3]);
    expect(row(saved, 'stat-active')).toEqual([3, 0, 3]);
    expect(row(saved, 'stat-host-employers')).toEqual([6, 0, 3]);
    // The one that used to wrap. All four on one row, y 0.
    expect(row(saved, 'stat-inactive')).toEqual([9, 0, 3]);
    expect(
      ['stat-total', 'stat-active', 'stat-host-employers', 'stat-inactive'].map(
        (i) => itemOf(saved, 'lg', i)?.y,
      ),
    ).toEqual([0, 0, 0, 0]);
  });

  it('leaves a card the user MOVED completely alone — position and width', async () => {
    const pageKey = '/clients-moved';
    // Everything at its old default except stat-active, dragged to (7, 24).
    // Its WIDTH is still the old default 4, so the width rule alone would
    // narrow it; the position rule must veto the whole item, not half of it.
    const arranged: GridLayouts = {
      lg: (OLD_CLIENTS.lg ?? []).map((item) =>
        item.i === 'stat-active' ? { ...item, x: 7, y: 24 } : item,
      ),
    };
    seed(pageKey, 2 - 1 + PACKAGE_LAYOUT_EPOCH, arranged);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: NEW_CLIENTS,
        layoutVersion: 2,
        layoutMigrations: CLIENTS_FULL_MIGRATIONS,
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    const saved = savedLayoutsFor(pageKey);
    // Moved: immune. Position kept AND width kept — a card someone placed by
    // hand must not silently change size underneath them either.
    expect(row(saved, 'stat-active')).toEqual([7, 24, 4]);
    // Its untouched neighbours still adopt, so the veto is per item and not
    // per page.
    expect(row(saved, 'stat-total')).toEqual([0, 0, 3]);
    expect(row(saved, 'stat-host-employers')).toEqual([6, 0, 3]);
  });

  it('adopts x and y atomically — never one without the other', () => {
    // Half a match is not a match. An item whose x still equals the old default
    // but whose y does not was moved, and adopting only x would invent a third
    // position that neither the user nor the page ever chose.
    const saved: GridLayouts = {
      lg: [{ i: 'stat-active', x: 4, y: 30, w: 4, h: 6, minW: 4 }],
    };
    const out = adoptUnchangedDefaults(CLIENTS_PREVIOUS)(saved, NEW_CLIENTS);
    expect(row(out, 'stat-active')).toEqual([4, 30, 4]);
  });

  it('an item whose position did NOT move in the bump is unaffected by the position rule', () => {
    // The /dashboard shape: trainingManagement went w 12 -> 8 at the SAME
    // x 0, y 21. It passes through both rules — position matches the old
    // default so the new position is adopted, and the new position is the old
    // one — so only the width moves. Stated rather than assumed.
    const previous = { trainingManagement: { w: 12, minW: 3, position: { x: 0, y: 21 } } };
    const defaults: GridLayouts = {
      lg: [{ i: 'trainingManagement', x: 0, y: 21, w: 8, h: 8, minW: 3, minH: 3 }],
    };
    const saved: GridLayouts = {
      lg: [{ i: 'trainingManagement', x: 0, y: 21, w: 12, h: 8, minW: 3, minH: 3 }],
    };
    const after = adoptUnchangedDefaults(previous)(saved, defaults).lg[0];
    expect([after?.x, after?.y, after?.w]).toEqual([0, 21, 8]);
    // ...and a user who dragged it keeps everything, width included.
    const dragged: GridLayouts = {
      lg: [{ i: 'trainingManagement', x: 4, y: 2, w: 12, h: 8, minW: 3, minH: 3 }],
    };
    const afterDrag = adoptUnchangedDefaults(previous)(dragged, defaults).lg[0];
    expect([afterDrag?.x, afterDrag?.y, afterDrag?.w]).toEqual([4, 2, 12]);
  });

  it('leaves position alone when the migration records none', () => {
    // `position` is optional. An entry that omits it is a width-only migration
    // and must not move anything — the pre-existing behaviour, kept so a
    // migration written before this rule cannot start moving cards.
    const saved: GridLayouts = {
      lg: [{ i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4 }],
    };
    const out = adoptUnchangedDefaults({ 'stat-active': { w: 4, minW: 4 } })(saved, NEW_CLIENTS);
    expect(row(out, 'stat-active')).toEqual([4, 0, 3]);
  });
});

describe('the real crm7#2490 arithmetic, end to end', () => {
  beforeEach(() => store.clear());

  /*
   * The numbers, not a stand-in for them. `/clients` is a `DraggableCardPage`
   * route, so crm7's `LAYOUT_EPOCH = 101` is added to both `layoutVersion` and
   * the migration keys before either reaches this hook, and
   * `PACKAGE_LAYOUT_EPOCH = 2000` is added to both here. `layoutVersion` 1 -> 2
   * is therefore effective 2102 -> 2103, which is what PR #2490's own table
   * records and what was read back off `user_preferences` on the e2e account.
   *
   * This is the composition the wiring depends on, and it fails SILENTLY if
   * either side is shifted and the other is not — the gate finds no migration
   * and discards, which looks exactly like the defect.
   */
  const CRM7_LAYOUT_EPOCH = 101;

  it('migrates a real /clients layout across effective 2102 -> 2103', async () => {
    const pageKey = '/clients';
    expect(PACKAGE_LAYOUT_EPOCH).toBe(2000);
    expect(1 + CRM7_LAYOUT_EPOCH + PACKAGE_LAYOUT_EPOCH).toBe(2102);
    expect(2 + CRM7_LAYOUT_EPOCH + PACKAGE_LAYOUT_EPOCH).toBe(2103);

    seed(pageKey, 2102, {
      lg: [
        { i: 'stat-total', x: 8, y: 30, w: 4, h: 6, minW: 4, minH: 2 },
        { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
      ],
    });

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        // What DraggableCardPage hands down after applying LAYOUT_EPOCH.
        layoutVersion: 2 + CRM7_LAYOUT_EPOCH,
        layoutMigrations: { [2 + CRM7_LAYOUT_EPOCH]: adoptUnchangedDefaults(CLIENTS_PREVIOUS_DEFAULTS) },
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    expect(savedVersionFor(pageKey)).toBe(2103);
    const saved = savedLayoutsFor(pageKey);
    // stat-total was dragged to (8, 30): immune, width included.
    expect(itemOf(saved, 'lg', 'stat-total')?.w).toBe(4);
    expect(itemOf(saved, 'lg', 'stat-total')?.x).toBe(8);
    expect(itemOf(saved, 'lg', 'stat-total')?.y).toBe(30);
    // dialog is still at its old default position, so it adopts: 12 -> 4.
    expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
  });

  it('discards a layout stored below 2102 — earlier epochs were genuine resets', async () => {
    const pageKey = '/clients';
    seed(pageKey, 2101, CLIENTS_UNTOUCHED_SAVE);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2 + CRM7_LAYOUT_EPOCH,
        layoutMigrations: { [2 + CRM7_LAYOUT_EPOCH]: adoptUnchangedDefaults(CLIENTS_PREVIOUS_DEFAULTS) },
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    expect(savedLayoutsFor(pageKey)).toEqual(CLIENTS_NEW_DEFAULTS);
  });

  it('discards on a PACKAGE_LAYOUT_EPOCH bump, which is what that lever is for', async () => {
    const pageKey = '/clients';
    // A layout stored under the PREVIOUS package epoch: 2 + 101 + 1000.
    seed(pageKey, 1103, CLIENTS_UNTOUCHED_SAVE);

    renderHook(() =>
      usePageGridLayout({
        pageKey,
        defaultLayouts: CLIENTS_NEW_DEFAULTS,
        layoutVersion: 2 + CRM7_LAYOUT_EPOCH,
        layoutMigrations: { [2 + CRM7_LAYOUT_EPOCH]: adoptUnchangedDefaults(CLIENTS_PREVIOUS_DEFAULTS) },
        preferenceAdapter: durableAdapter,
      }),
    );
    await act(async () => {});

    expect(savedLayoutsFor(pageKey)).toEqual(CLIENTS_NEW_DEFAULTS);
    expect(savedVersionFor(pageKey)).toBe(2103);
  });
});

describe('adoptUnchangedDefaults', () => {
  const previous = { a: { w: 12, minW: 4 }, b: { w: 12 } } as const;
  const defaults: GridLayouts = {
    lg: [
      { i: 'a', x: 0, y: 0, w: 6, h: 6, minW: 3 },
      { i: 'b', x: 6, y: 0, w: 4, h: 6, minW: 4 },
      { i: 'c', x: 0, y: 6, w: 12, h: 6, minW: 4 },
    ],
  };

  it('adopts w and minW only where the saved value still equals the old default', () => {
    const saved: GridLayouts = {
      lg: [
        // a: untouched -> adopts both.
        { i: 'a', x: 0, y: 0, w: 12, h: 6, minW: 4 },
        // b: width chosen by the user -> keeps it. No minW entry in `previous`,
        // so minW is never considered for b at all.
        { i: 'b', x: 0, y: 6, w: 7, h: 6, minW: 4 },
        // c: not in `previous` -> nothing about it is a candidate.
        { i: 'c', x: 0, y: 12, w: 12, h: 6, minW: 4 },
      ],
    };
    const out = adoptUnchangedDefaults(previous)(saved, defaults);
    expect(out.lg).toEqual([
      { i: 'a', x: 0, y: 0, w: 6, h: 6, minW: 3 },
      { i: 'b', x: 0, y: 6, w: 7, h: 6, minW: 4 },
      { i: 'c', x: 0, y: 12, w: 12, h: 6, minW: 4 },
    ]);
  });

  it('leaves an item alone when it is absent from the new defaults', () => {
    const saved: GridLayouts = {
      lg: [{ i: 'orphan', x: 0, y: 0, w: 12, h: 6, minW: 4 }],
    };
    const out = adoptUnchangedDefaults({ orphan: { w: 12 } })(saved, defaults);
    expect(out.lg[0]?.w).toBe(12);
  });

  it('migrates every stored breakpoint, not just lg', () => {
    const saved: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 12, h: 6, minW: 4 }],
      md: [{ i: 'a', x: 0, y: 0, w: 12, h: 6, minW: 4 }],
    };
    const out = adoptUnchangedDefaults(previous)(saved, defaults);
    expect(out.lg[0]?.w).toBe(6);
    // md has no authored default of its own, so it falls back to lg's.
    expect((out.md ?? [])[0]?.w).toBe(6);
  });

  it('does not mutate the layout it was handed', () => {
    const item: GridLayoutItem = { i: 'a', x: 0, y: 0, w: 12, h: 6, minW: 4 };
    const saved: GridLayouts = { lg: [item] };
    adoptUnchangedDefaults(previous)(saved, defaults);
    expect(item.w).toBe(12);
    expect(item.minW).toBe(4);
  });
});
