/**
 * `DraggableCardPage` shifts `layoutVersion` by the app's `layoutEpoch` before
 * handing it to the grid. It has to shift `layoutMigrations`' KEYS by the same
 * amount, or every migration a page registers silently never matches.
 *
 * Silently is the whole problem. An unshifted key is not an error and not a
 * crash — the version gate simply finds no migration for the step and falls
 * back to the wholesale discard, which is exactly the behaviour the migration
 * was written to prevent. It would look wired and do nothing.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DraggableCardPage } from '../DraggableCardPage.js';
import { CanvasCard } from '../CanvasCard.js';
import type { LayoutMigration, PageGridLayoutProps } from '../types.js';

const CRM7_LAYOUT_EPOCH = 101;

/** Hoisted to module scope: a fresh function identity per render would give
 *  the migration map a new identity per render too, which is exactly what the
 *  hook's effect dependency must not see. */
const migration: LayoutMigration = (saved) => saved;
const MIGRATIONS: Readonly<Record<number, LayoutMigration>> = { 2: migration };

function captureProps() {
  const seen: PageGridLayoutProps[] = [];
  const Spy = (props: PageGridLayoutProps) => {
    seen.push(props);
    return null;
  };
  return { seen, Spy };
}

describe('DraggableCardPage — layoutMigrations cross the epoch boundary', () => {
  it('shifts migration keys by layoutEpoch, exactly as it shifts layoutVersion', () => {
    const { seen, Spy } = captureProps();

    render(
      <DraggableCardPage
        pageKey="/clients"
        layoutVersion={2}
        layoutEpoch={CRM7_LAYOUT_EPOCH}
        layoutMigrations={MIGRATIONS}
        gridComponent={Spy}
      >
        <CanvasCard cardKey="a">
          <div>a</div>
        </CanvasCard>
      </DraggableCardPage>,
    );

    expect(seen).toHaveLength(1);
    const props = seen[0]!;
    // The version the grid receives.
    expect(props.layoutVersion).toBe(2 + CRM7_LAYOUT_EPOCH);
    // ...and the key the migration is filed under must be the same number, or
    // the lookup misses and the layout is discarded instead of migrated.
    expect(Object.keys(props.layoutMigrations ?? {})).toEqual([
      String(2 + CRM7_LAYOUT_EPOCH),
    ]);
    expect(props.layoutMigrations?.[2 + CRM7_LAYOUT_EPOCH]).toBe(migration);
  });

  it('passes migrations through untouched when the app has no epoch', () => {
    const { seen, Spy } = captureProps();

    render(
      <DraggableCardPage pageKey="/plain" layoutVersion={2} layoutMigrations={MIGRATIONS} gridComponent={Spy}>
        <CanvasCard cardKey="a">
          <div>a</div>
        </CanvasCard>
      </DraggableCardPage>,
    );

    expect(seen[0]?.layoutVersion).toBe(2);
    expect(seen[0]?.layoutMigrations).toBe(MIGRATIONS);
  });

  it('keeps a stable migration-map identity across re-renders', () => {
    const { seen, Spy } = captureProps();

    // `className` is the irrelevant prop being changed — rerendering the
    // IDENTICAL element bails out of reconciliation entirely and would prove
    // nothing about memoisation.
    const tree = (className: string) => (
      <DraggableCardPage
        pageKey="/clients"
        layoutVersion={2}
        layoutEpoch={CRM7_LAYOUT_EPOCH}
        layoutMigrations={MIGRATIONS}
        className={className}
        gridComponent={Spy}
      >
        <CanvasCard cardKey="a">
          <div>a</div>
        </CanvasCard>
      </DraggableCardPage>
    );

    const { rerender } = render(tree('one'));
    rerender(tree('two'));

    expect(seen.length).toBeGreaterThanOrEqual(2);
    // The shifted map is an effect dependency two levels down. A new object per
    // render re-runs that effect on every render — which, in an effect that
    // writes state, is an infinite loop that HANGS a suite rather than failing
    // it.
    expect(seen[0]?.layoutMigrations).toBe(seen[seen.length - 1]?.layoutMigrations);
  });

  it('leaves layoutMigrations absent when the page registers none', () => {
    const { seen, Spy } = captureProps();

    render(
      <DraggableCardPage pageKey="/none" layoutVersion={2} layoutEpoch={CRM7_LAYOUT_EPOCH} gridComponent={Spy}>
        <CanvasCard cardKey="a">
          <div>a</div>
        </CanvasCard>
      </DraggableCardPage>,
    );

    expect(seen[0]?.layoutMigrations).toBeUndefined();
  });
});
