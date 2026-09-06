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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PACKAGE_LAYOUT_EPOCH,
  migrateSavedLayout,
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

/**
 * The same layout with ONE card placed by hand.
 *
 * `CLIENTS_UNTOUCHED_SAVE` cannot tell a discard from a migration: it holds the
 * old defaults, so "reset to the new defaults" and "adopt the new defaults on
 * every item" produce byte-identical output. Every discard assertion written
 * against it therefore passes with the discard deleted — which is how the
 * headline requirement (a PACKAGE_LAYOUT_EPOCH bump resets everyone) came to be
 * asserted by a test that could not see the reset.
 *
 * `stat-total` at (6, 3) with w 6 is immune under the migration rule and gone
 * under the discard, so `toEqual(CLIENTS_NEW_DEFAULTS)` finally discriminates.
 */
const CLIENTS_ARRANGED_SAVE: GridLayouts = {
  lg: CLIENTS_UNTOUCHED_SAVE.lg.map((item) =>
    item.i === 'stat-total' ? { ...item, x: 6, y: 3, w: 6 } : item,
  ),
};

/*
 * The /clients layouts are NOT hand-typed. Both sides are produced by
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

const withPlaced = (base: GridLayouts, i: string, x: number, y: number): GridLayouts => ({
  lg: base.lg.map((item) => (item.i === i ? { ...item, x, y } : item)),
});

/*
 * THE ACCEPTANCE FIXTURE, AND WHY IT IS NOT WHAT IT FIRST WAS.
 *
 * `OLD_CLIENTS` on its own is a never-arranged layout, and on one of those a
 * migration that adopts every default and a discard that restores every default
 * produce byte-identical output. The acceptance test for adopting position was
 * therefore seeded with a layout that could not tell the feature from its
 * absence — it passed before the feature existed and after.
 *
 * `card3` is hand-placed rather than one of the four stat cards ON PURPOSE: the
 * property being accepted is that all FOUR stats reach 0/3/6/9, so placing one
 * of them by hand would buy discrimination by destroying the thing under test.
 * `card3` is in the migration table, so a discard moves it and a migration does
 * not — and the four stats still un-wrap. The literal case (a hand-placed stat
 * card, three siblings still un-wrapping) is covered separately below.
 */
const OLD_CLIENTS_DIALOG_PLACED = withPlaced(OLD_CLIENTS, 'card3', 8, 40);
const OLD_CLIENTS_STAT_PLACED = withPlaced(OLD_CLIENTS, 'stat-inactive', 2, 33);

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

/** crm7's own app-level epoch, applied by DraggableCardPage before the hook. */
const CRM7_LAYOUT_EPOCH = 101;

/* Saved layouts each scenario starts from, named so the meta-check below can
 * reuse the EXACT fixture a test uses rather than a copy that can drift. */
const CLIENTS_SAVE_DRAGGED_WIDE: GridLayouts = {
  lg: [
    // stat-total dragged to (6,3) and pulled out to w 6 — none of that is the
    // old default, so all of it is a decision the user made.
    { i: 'stat-total', x: 6, y: 3, w: 6, h: 9, minW: 4, minH: 2, hUserSet: true },
    { i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
    { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
  ],
};
const CLIENTS_SAVE_ONE_MOVED: GridLayouts = {
  lg: [
    // Dragged to the second row and nowhere near a default position.
    { i: 'stat-total', x: 8, y: 30, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'stat-active', x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'table', x: 0, y: 6, w: 12, h: 6, minW: 4, minH: 2 },
    { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
  ],
};
const CLIENTS_SAVE_ACTIVE_MOVED = withPlaced(OLD_CLIENTS, 'stat-active', 7, 24);
const CRM7_SAVE_TOTAL_MOVED: GridLayouts = {
  lg: [
    { i: 'stat-total', x: 8, y: 30, w: 4, h: 6, minW: 4, minH: 2 },
    { i: 'dialog', x: 0, y: 12, w: 12, h: 6, minW: 4, minH: 2 },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * THE MIGRATION SCENARIOS, AS DATA — and why they are data.
 *
 * Every one of these is a case where a stored layout MUST come back migrated.
 * They are a table rather than six hand-written tests so that the meta-check at
 * the bottom of this file can re-run THE SAME fixture and THE SAME assertions
 * with the feature switched off, and demand that each one fails. A meta-check
 * holding its own copy of a scenario proves only that the copy is well written.
 *
 * The failure this closes: three times in this suite, an assertion was seeded
 * with a NEVER-ARRANGED layout — and on one of those, "migrated every item onto
 * the new defaults" and "discarded and restored the new defaults" are the same
 * bytes. Two of the three were the section-2 headline case and the named
 * acceptance test for adopting position. Both passed with the feature deleted.
 * Every seed below therefore carries at least one hand-placed card.
 * ═══════════════════════════════════════════════════════════════════════════ */
interface MigrationScenario {
  name: string;
  pageKey: string;
  seedVersion: number;
  seedLayout: GridLayouts;
  defaults: GridLayouts;
  layoutVersion: number;
  migrations: Readonly<Record<number, LayoutMigration>>;
  assert: (saved: GridLayouts | undefined, pageKey: string) => void;
}

const MIGRATION_SCENARIOS: readonly MigrationScenario[] = [
  {
    name: 'keeps a width the user chose, and keeps the position they dragged it to',
    pageKey: '/clients-chosen',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    seedLayout: CLIENTS_SAVE_DRAGGED_WIDE,
    defaults: CLIENTS_NEW_DEFAULTS,
    layoutVersion: 2,
    migrations: CLIENTS_MIGRATIONS,
    assert: (saved, pageKey) => {
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
    },
  },
  {
    name: 'moves a width still sitting at the old default onto the new default',
    pageKey: '/clients-adopt',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    // ARRANGED, not untouched. On an untouched layout this whole assertion set
    // is satisfied by the discard, which is how this case passed before the
    // feature existed.
    seedLayout: CLIENTS_ARRANGED_SAVE,
    defaults: CLIENTS_NEW_DEFAULTS,
    layoutVersion: 2,
    migrations: CLIENTS_MIGRATIONS,
    assert: (saved) => {
      // THE DISCRIMINATOR: stat-total was dragged to (6,3) and widened to 6, so
      // it is immune and survives intact. A discard puts it at (0,0,w3).
      expect(row(saved, 'stat-total')).toEqual([6, 3, 6]);
      // Everything nobody touched adopts: w 4 -> 3, minW 4 -> 3.
      expect(itemOf(saved, 'lg', 'stat-active')?.w).toBe(3);
      expect(itemOf(saved, 'lg', 'stat-active')?.minW).toBe(3);
      // dialog 12 -> 4.
      expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
      // The table's 12 did not change in the bump and has no previous-default
      // entry, so it is left exactly alone.
      expect(itemOf(saved, 'lg', 'table')?.w).toBe(12);
      // Position is adopted on the same rule as width — everywhere except the
      // card the user placed.
      expect((saved?.lg ?? []).map((item) => [item.i, item.x, item.y])).toEqual([
        ['stat-total', 6, 3],
        ['stat-active', 3, 0],
        ['table', 0, 6],
        ['dialog', 0, 12],
      ]);
    },
  },
  {
    name: 'leaves the one card the user moved entirely alone, while its siblings adopt',
    pageKey: '/clients-one-moved',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    seedLayout: CLIENTS_SAVE_ONE_MOVED,
    defaults: CLIENTS_NEW_DEFAULTS,
    layoutVersion: 2,
    migrations: CLIENTS_MIGRATIONS,
    assert: (saved) => {
      // Placed by hand: immune. Width and position both survive.
      expect(row(saved, 'stat-total')).toEqual([8, 30, 4]);
      // Its untouched siblings still adopt, so the veto is per item, not per
      // page — and a discard could produce neither half of this.
      expect(itemOf(saved, 'lg', 'stat-active')?.w).toBe(3);
      expect(itemOf(saved, 'lg', 'stat-active')?.x).toBe(3);
      expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
    },
  },
  {
    name: 'un-wraps the stat row: a never-arranged page reaches the authored 0/3/6/9',
    pageKey: '/clients-wrap',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    // card3 is hand-placed so the case can tell migrate from discard; the four
    // stats are all still untouched, so the acceptance property is intact.
    seedLayout: OLD_CLIENTS_DIALOG_PLACED,
    defaults: NEW_CLIENTS,
    layoutVersion: 2,
    migrations: CLIENTS_FULL_MIGRATIONS,
    assert: (saved) => {
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
      // THE DISCRIMINATOR: the hand-placed dialog is untouched. A discard sends
      // it to the authored (0, 12, w 4).
      expect(row(saved, 'card3')).toEqual([8, 40, 12]);
    },
  },
  {
    name: 'un-wraps the three stat cards nobody touched, and leaves the fourth where it was put',
    pageKey: '/clients-wrap-partial',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    seedLayout: OLD_CLIENTS_STAT_PLACED,
    defaults: NEW_CLIENTS,
    layoutVersion: 2,
    migrations: CLIENTS_FULL_MIGRATIONS,
    assert: (saved) => {
      // Three un-wrap onto the authored row...
      expect(row(saved, 'stat-total')).toEqual([0, 0, 3]);
      expect(row(saved, 'stat-active')).toEqual([3, 0, 3]);
      expect(row(saved, 'stat-host-employers')).toEqual([6, 0, 3]);
      // ...and the one the user dragged keeps its place AND its old width, so
      // the un-wrap never reflows a card someone positioned by hand.
      expect(row(saved, 'stat-inactive')).toEqual([2, 33, 4]);
    },
  },
  {
    name: 'leaves a card the user MOVED completely alone — position and width',
    pageKey: '/clients-moved',
    seedVersion: 2 - 1 + PACKAGE_LAYOUT_EPOCH,
    seedLayout: CLIENTS_SAVE_ACTIVE_MOVED,
    defaults: NEW_CLIENTS,
    layoutVersion: 2,
    migrations: CLIENTS_FULL_MIGRATIONS,
    assert: (saved) => {
      // Moved: immune. Position kept AND width kept — a card someone placed by
      // hand must not silently change size underneath them either.
      expect(row(saved, 'stat-active')).toEqual([7, 24, 4]);
      // Its untouched neighbours still adopt, so the veto is per item and not
      // per page.
      expect(row(saved, 'stat-total')).toEqual([0, 0, 3]);
      expect(row(saved, 'stat-host-employers')).toEqual([6, 0, 3]);
    },
  },
  {
    name: 'migrates a real /clients layout across effective 2102 -> 2103',
    pageKey: '/clients-crm7',
    // The real numbers. /clients is a DraggableCardPage route, so crm7's
    // LAYOUT_EPOCH 101 is added to both layoutVersion and the migration keys
    // before either reaches the hook, and PACKAGE_LAYOUT_EPOCH 2000 is added to
    // both here: 1 -> 2 is effective 2102 -> 2103, the numbers PR #2490's own
    // table records and that were read back off user_preferences.
    seedVersion: 2102,
    seedLayout: CRM7_SAVE_TOTAL_MOVED,
    defaults: CLIENTS_NEW_DEFAULTS,
    layoutVersion: 2 + CRM7_LAYOUT_EPOCH,
    migrations: { [2 + CRM7_LAYOUT_EPOCH]: adoptUnchangedDefaults(CLIENTS_PREVIOUS_DEFAULTS) },
    assert: (saved, pageKey) => {
      expect(savedVersionFor(pageKey)).toBe(2103);
      // stat-total was dragged to (8, 30): immune, width included.
      expect(row(saved, 'stat-total')).toEqual([8, 30, 4]);
      // dialog is still at its old default position, so it adopts: 12 -> 4.
      expect(itemOf(saved, 'lg', 'dialog')?.w).toBe(4);
    },
  },
];

/**
 * Render one scenario. `migrations` is a parameter rather than read off the
 * scenario so the meta-check can run the identical fixture with the feature
 * switched off — passing no migrations is exactly the pre-PR call site, where
 * the discard branch was the only branch.
 */
async function runScenario(
  scenario: MigrationScenario,
  migrations: Readonly<Record<number, LayoutMigration>> | undefined,
): Promise<GridLayouts | undefined> {
  seed(scenario.pageKey, scenario.seedVersion, scenario.seedLayout);
  renderHook(() =>
    usePageGridLayout({
      pageKey: scenario.pageKey,
      defaultLayouts: scenario.defaults,
      layoutVersion: scenario.layoutVersion,
      layoutMigrations: migrations,
      preferenceAdapter: durableAdapter,
    }),
  );
  await act(async () => {});
  return savedLayoutsFor(scenario.pageKey);
}

describe('a layoutVersion bump migrates a saved layout instead of discarding it', () => {
  beforeEach(() => store.clear());

  it.each(MIGRATION_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    async (_name, scenario) => {
      scenario.assert(await runScenario(scenario, scenario.migrations), scenario.pageKey);
    },
  );
});

describe('layoutVersion bump migrates a saved layout instead of discarding it', () => {
  beforeEach(() => store.clear());

  // -------------------------------------------------------------------------
  // 1. A width the USER chose survives the bump.
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // 2. A width still at the OLD DEFAULT moves to the new default.
  // -------------------------------------------------------------------------
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
    // ARRANGED, and this one is HARDENING WITH AN UNVERIFIED REASON — said
    // plainly rather than carried as a claim. It was changed alongside the two
    // cases that demonstrably needed it, on the argument that it shared their
    // blindness. That could not be reproduced: this case registers no
    // migrations at all, so the transform that makes an untouched fixture
    // indistinguishable needs a registry it deliberately omits, and no
    // reachable mutation tells the two fixtures apart here. The arranged
    // fixture is kept because it costs nothing and cannot mislead; the reason
    // for it is not established.
    seed(pageKey, 1 + PACKAGE_LAYOUT_EPOCH, CLIENTS_ARRANGED_SAVE);

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
  it('discards a layout stored below 2102 — earlier epochs were genuine resets', async () => {
    const pageKey = '/clients';
    // ARRANGED — see CLIENTS_ARRANGED_SAVE. With the untouched fixture this
    // assertion passed with the discard removed entirely.
    seed(pageKey, 2101, CLIENTS_ARRANGED_SAVE);

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
    // A layout stored under the PREVIOUS package epoch: 2 + 101 + 1000, with
    // one card placed by hand so that "was reset" and "was migrated" are
    // distinguishable outputs. This is the headline requirement for the whole
    // fallback — it must fail when the reset breaks.
    seed(pageKey, 1103, CLIENTS_ARRANGED_SAVE);

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

describe('the two discard guards, each on its own', () => {
  /*
   * `migrateSavedLayout` refuses an uncoverable span twice over, and until now
   * the suite could only see that AT LEAST ONE refusal existed: breaking either
   * one alone left 285 tests green, because the other silently covered for it.
   * A guard that cannot fail on its own is a guard that can rot unnoticed.
   *
   * They are not the same guard, and the tests differ accordingly:
   *
   *   - the IN-LOOP bail is the CORRECTNESS one. It is what makes "a step with
   *     no registered migration discards" true, and it is the epoch-8 escape
   *     hatch.
   *   - the O(1) `to - from > size` refusal is a COST guard. It never changes
   *     the answer — the loop would reach the same `null` — it stops a first
   *     visit (`from` 0, `to` 2103) walking two thousand versions on every
   *     mount. So it is tested by what it does not do, not by what it returns.
   */
  const saved: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 4, h: 4 }] };
  const defaults: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }] };
  const passthrough: LayoutMigration = (layout) => layout;

  it('refuses a SPARSE registry whose span the O(1) check cannot catch', () => {
    // {2002, 2004} over the span 2002 -> 2004 is TWO registered migrations
    // across a span of two, so `to - from > size` is false and the O(1) refusal
    // lets it through. 2003 has no migration and the layout must still be
    // discarded — a production-reachable hole that only the in-loop bail
    // closes, and that nothing in the suite could previously see.
    const stepTwo = vi.fn<LayoutMigration>(passthrough);
    const stepFour = vi.fn<LayoutMigration>(passthrough);
    const sparse = new Map<number, LayoutMigration>([
      [2002, stepTwo],
      [2004, stepFour],
    ]);
    expect(2004 - 2002).toBeLessThanOrEqual(sparse.size); // the O(1) check passes

    const out = migrateSavedLayout({ saved, defaults, from: 2002, to: 2004, migrations: sparse });

    expect(out).toBeNull();
    // Counts, not booleans: the gap is hit at 2003, so nothing runs at all. A
    // negative case asserted as `not.toHaveBeenCalled()` passes just as happily
    // when the subject was never reached.
    expect(stepTwo).toHaveBeenCalledTimes(0);
    expect(stepFour).toHaveBeenCalledTimes(0);
  });

  it('...and migrates the CONTIGUOUS registry of the same size and span', () => {
    // The positive control. Without it the case above passes trivially for any
    // implementation that refuses every span of two.
    const stepThree = vi.fn<LayoutMigration>(passthrough);
    const stepFour = vi.fn<LayoutMigration>(passthrough);
    const contiguous = new Map<number, LayoutMigration>([
      [2003, stepThree],
      [2004, stepFour],
    ]);

    const out = migrateSavedLayout({
      saved,
      defaults,
      from: 2002,
      to: 2004,
      migrations: contiguous,
    });

    expect(out).not.toBeNull();
    expect(stepThree).toHaveBeenCalledTimes(1);
    expect(stepFour).toHaveBeenCalledTimes(1);
  });

  it('refuses an uncoverable span WITHOUT walking it', () => {
    // A first visit: nothing stored, `to` is 2103. The answer is null either
    // way — the loop would miss at the first unregistered version — so the only
    // observable difference is the WORK, and the work is what this guard exists
    // to avoid. Counting registry lookups is how that becomes an assertion.
    //
    // The registry here is CONTIGUOUS from `from + 1`, which is the worst case
    // and the only shape that reaches the bound: the walk stops at the first
    // miss, so it costs `size + 1` lookups and never anything proportional to
    // the span. Asserted below rather than described.
    let lookups = 0;
    const counting = new Map<number, LayoutMigration>(
      [1, 2, 3, 4, 5].map((v) => [v, passthrough] as const),
    );
    const instrumented = {
      size: counting.size,
      get(version: number) {
        lookups += 1;
        return counting.get(version);
      },
    } as unknown as ReadonlyMap<number, LayoutMigration>;

    const out = migrateSavedLayout({
      saved,
      defaults,
      from: 0,
      to: 2103,
      migrations: instrumented,
    });

    expect(out).toBeNull();
    // Zero with the guard. Without it: `size + 1` = 6, which the bite confirms —
    // NOT the 2103 a "proportional to the span" reading would predict, and not
    // the "two thousand" an earlier version of this comment claimed.
    expect(lookups).toBe(0);
    expect(counting.size + 1).toBe(6);
  });

  it('still consults the registry when the span IS coverable', () => {
    // Control for the case above: the O(1) refusal must not swallow work it has
    // no business refusing.
    let lookups = 0;
    const counting = new Map<number, LayoutMigration>([[2003, passthrough]]);
    const instrumented = {
      size: counting.size,
      get(version: number) {
        lookups += 1;
        return counting.get(version);
      },
    } as unknown as ReadonlyMap<number, LayoutMigration>;

    const out = migrateSavedLayout({
      saved,
      defaults,
      from: 2002,
      to: 2003,
      migrations: instrumented,
    });

    expect(out).not.toBeNull();
    expect(lookups).toBe(1);
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

/* ═══════════════════════════════════════════════════════════════════════════
 * THE STANDING META-CHECK
 *
 * Four times in this one suite an assertion was seeded with a never-arranged
 * layout, where a migration and a discard produce identical output — and two of
 * those were the section-2 headline case and the named acceptance test for
 * adopting position. Both passed with the feature deleted. Fixing them one at a
 * time leaves the fifth for whoever comes next.
 *
 * So the plant becomes part of the suite. `layoutMigrations: undefined` is
 * exactly the pre-PR call site — `migrateSavedLayout` is never consulted and the
 * discard branch is the only branch — and under it EVERY migration scenario must
 * fail. A scenario that still passes is not a passing test; it is a test that
 * cannot see the feature.
 *
 * The allowlist below is the other half, and it is the half that survives
 * contact with the next author: a hook-rendering test that is neither a scenario
 * nor listed here fails BY NAME, so a new case cannot quietly join the file
 * without declaring which side of the plant it is on.
 * ═══════════════════════════════════════════════════════════════════════════ */
const PLANT_MAY_SURVIVE: Readonly<Record<string, string>> = {
  'still discards wholesale when a version step has no registered migration':
    'the discard IS the expected outcome, so removing the migration path cannot change it',
  'discards when NO migrations are registered at all — the pre-existing behaviour':
    'registers no migrations by construction — it is already running under the plant',
  'applies every registered step in ascending order, exactly once each':
    'asserts call ORDER and counts on the migrations themselves, not the stored layout',
  'does not call a migration when the stored version is already current':
    'the version gate returns before any migration is considered',
  'does not call a migration on a first visit — there is no layout to migrate':
    'nothing is stored, so there is no arrangement for a migration to preserve',
  'discards a layout stored below 2102 — earlier epochs were genuine resets':
    'the discard IS the expected outcome — the escape hatch, asserted on an ARRANGED fixture so it can still see the reset',
  'discards on a PACKAGE_LAYOUT_EPOCH bump, which is what that lever is for':
    'the discard IS the expected outcome — likewise asserted on an ARRANGED fixture',
};

describe('META: every migration scenario must fail with the feature switched off', () => {
  beforeEach(() => store.clear());

  it.each(MIGRATION_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    'plant (always discard) breaks: %s',
    async (_name, scenario) => {
      const saved = await runScenario(scenario, undefined);
      // `assert` is the SAME function the real test runs, on the SAME fixture —
      // a meta-check holding its own copy would only prove the copy is good.
      expect(() => scenario.assert(saved, scenario.pageKey)).toThrow();
    },
  );

  const HOOK_CALL_NEEDLE = 'usePageGridLayout' + '({';

  it('every hook-rendering test is either a scenario or an allowlisted survivor', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    let marker = '<file scope>';
    const sites: string[] = [];
    for (const line of source) {
      const named = /^\s*it\('(.+)',/.exec(line);
      if (named) marker = named[1]!;
      else if (/^async function runScenario\b/.test(line)) marker = '<runScenario>';
      // Built by concatenation, not written whole: a scanner that greps for a
      // literal it also CONTAINS matches itself, and this one duly reported its
      // own body as an unaccounted hook site on the first run.
      if (line.includes(HOOK_CALL_NEEDLE) && marker !== '<file scope>') sites.push(marker);
    }

    // Positive control: a scan that finds nothing would make every assertion
    // below pass vacuously, and this file's whole subject is that class of
    // failure.
    expect(sites.length).toBeGreaterThanOrEqual(8);
    expect(sites).toContain('<runScenario>');

    const unaccounted = sites.filter(
      (name) =>
        name !== '<runScenario>' &&
        !(name in PLANT_MAY_SURVIVE) &&
        !MIGRATION_SCENARIOS.some((scenario) => scenario.name === name),
    );
    expect(
      unaccounted,
      'A test renders usePageGridLayout but is neither in MIGRATION_SCENARIOS nor in ' +
        'PLANT_MAY_SURVIVE. Add it to the scenario table so the plant covers it, or ' +
        'allowlist it with a reason saying why a discard satisfies it.',
    ).toEqual([]);

    // ...and the allowlist may not rot either: an entry naming a test that no
    // longer exists is a permission nobody is using and a claim nobody checks.
    const stale = Object.keys(PLANT_MAY_SURVIVE).filter((name) => !sites.includes(name));
    expect(stale, 'PLANT_MAY_SURVIVE names a test that no longer renders the hook').toEqual([]);
  });
});
