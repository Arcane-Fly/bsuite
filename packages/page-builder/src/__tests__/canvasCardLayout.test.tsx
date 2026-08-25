import { describe, expect, it, vi } from 'vitest';
import { Fragment } from 'react';
import { CanvasCard } from '../CanvasCard.js';
import {
  buildCanvasCardLayout,
  clampColumns,
  describeNode,
  flattenCanvasCards,
  isCanvasCardElement,
} from '../canvasCardLayout.js';

/**
 * These tests are the promoted form of behaviour that previously existed only
 * inside three hand-copied app-local components. Each block names the defect it
 * exists to prevent, because the algorithm's edge cases are exactly the ones
 * that regressed before.
 */

describe('isCanvasCardElement', () => {
  it('matches by displayName, not identity', () => {
    // Identity would break across bundler chunk splits and duplicated package
    // instances. The string check is deliberate.
    const Impostor = () => null;
    Impostor.displayName = 'CanvasCard';
    expect(isCanvasCardElement(<Impostor />)).toBe(true);
    expect(isCanvasCardElement(<CanvasCard cardKey="a">x</CanvasCard>)).toBe(
      true,
    );
    expect(isCanvasCardElement(<div />)).toBe(false);
    expect(isCanvasCardElement(null)).toBe(false);
  });
});

describe('flattenCanvasCards', () => {
  it('keeps CanvasCards and drops nothing for the conditional-falsy shape', () => {
    // `{cond && <CanvasCard/>}` collapses to `false`. That is the documented
    // way to write a conditional card and must stay SILENT.
    const { cards, dropped } = flattenCanvasCards([
      <CanvasCard key="a" cardKey="a">
        A
      </CanvasCard>,
      false,
      null,
      undefined,
      '',
      <CanvasCard key="b" cardKey="b">
        B
      </CanvasCard>,
    ]);
    expect(cards).toHaveLength(2);
    expect(dropped).toEqual([]);
  });

  it('flattens Fragment children (crm7 burn-7 CI class)', () => {
    // Children.forEach is SHALLOW: it sees one Fragment node, not the
    // CanvasCards inside. Before this was fixed, a Fragment-wrapped
    // conditional branch silently dropped every nested card and the page
    // rendered with only its header.
    const { cards, dropped } = flattenCanvasCards(
      <Fragment>
        <CanvasCard cardKey="a">A</CanvasCard>
        <CanvasCard cardKey="b">B</CanvasCard>
      </Fragment>,
    );
    expect(cards.map((c) => c.props.cardKey)).toEqual(['a', 'b']);
    expect(dropped).toEqual([]);
  });

  it('flattens nested Fragments depth-first', () => {
    const { cards } = flattenCanvasCards(
      <Fragment>
        <CanvasCard cardKey="a">A</CanvasCard>
        <Fragment>
          <CanvasCard cardKey="b">B</CanvasCard>
          <Fragment>
            <CanvasCard cardKey="c">C</CanvasCard>
          </Fragment>
        </Fragment>
      </Fragment>,
    );
    expect(cards.map((c) => c.props.cardKey)).toEqual(['a', 'b', 'c']);
  });

  it('RECORDS a dropped non-CanvasCard child rather than vanishing it', () => {
    // The dropping is correct — a node with no cardKey has no slot. The defect
    // was that it happened in total silence, so a page could render with a
    // confirm dialog missing and look completely fine.
    function ConfirmDialog() {
      return null;
    }
    const { cards, dropped } = flattenCanvasCards([
      <CanvasCard key="a" cardKey="a">
        A
      </CanvasCard>,
      <ConfirmDialog key="d" />,
      <div key="x" />,
    ]);
    expect(cards).toHaveLength(1);
    expect(dropped).toEqual(['<ConfirmDialog>', '<div>']);
  });

  it('reports dropped children from INSIDE a Fragment', () => {
    function Modal() {
      return null;
    }
    const { dropped } = flattenCanvasCards(
      <Fragment>
        <Modal />
      </Fragment>,
    );
    expect(dropped).toEqual(['<Modal>']);
  });
});

describe('describeNode', () => {
  it('names components, host elements and text', () => {
    function Named() {
      return null;
    }
    expect(describeNode(<Named />)).toBe('<Named>');
    expect(describeNode(<section />)).toBe('<section>');
    expect(describeNode('hello')).toBe('text "hello"');
    expect(describeNode(42)).toBe('42');
  });
});

describe('clampColumns', () => {
  it('clamps into the 12-column grid', () => {
    expect(clampColumns(0)).toBe(1);
    expect(clampColumns(99)).toBe(12);
    expect(clampColumns(6)).toBe(6);
    expect(clampColumns(2, 4)).toBe(4);
  });
});

describe('buildCanvasCardLayout', () => {
  it('gives every card its own widget key and its own grid item', () => {
    // This is the whole point: N cards -> N independently draggable items,
    // NOT one widget containing N cards.
    const { widgets, layouts } = buildCanvasCardLayout([
      <CanvasCard key="a" cardKey="header" h={4}>
        A
      </CanvasCard>,
      <CanvasCard key="b" cardKey="details" h={12}>
        B
      </CanvasCard>,
    ]);
    expect(Object.keys(widgets)).toEqual(['header', 'details']);
    expect(layouts.lg).toHaveLength(2);
    expect(layouts.lg.map((i) => i.i)).toEqual(['header', 'details']);
  });

  it('supports a runtime-variable card count from .map() with NO registration mechanism', () => {
    // This is the test that refutes the "dynamic card lists cannot be split
    // into static widget keys without a dynamic-widget registration mechanism"
    // claim recorded in app exclusion ledgers. The widget dict is derived from
    // the children AT RENDER TIME, so a 0..N array from a database already
    // produces N independent grid items.
    const rows = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }];
    const { widgets, layouts } = buildCanvasCardLayout(
      rows.map((r) => (
        <CanvasCard key={r.id} cardKey={r.id} w={6} h={8}>
          {r.id}
        </CanvasCard>
      )),
    );
    expect(Object.keys(widgets)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(layouts.lg).toHaveLength(4);
    // Each is a distinct grid item, not one shared backing card.
    expect(new Set(layouts.lg.map((i) => i.i)).size).toBe(4);
  });

  it('defaults autoHeight to true so cards are never clipped at their seed h', () => {
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a">A</CanvasCard>,
    );
    expect(layouts.lg[0].autoHeight).toBe(true);
  });

  it('omits autoHeight entirely when a card opts out', () => {
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a" autoHeight={false}>
        A
      </CanvasCard>,
    );
    expect(layouts.lg[0].autoHeight).toBeUndefined();
  });

  it('defaults to HALF width, not full — the 1.1.0 inversion', () => {
    // Twelve on a twelve-column grid meant every card that omitted `w` filled
    // the row and the page became one vertical stack. 1,068 of 1,729 usages
    // across the estate omit `w`, so 62% of BSuite's cards were stacked by a
    // default rather than by a decision. That is the operator's "the cards
    // don't use the available space" report.
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a">A</CanvasCard>,
    );
    expect(layouts.lg[0]).toMatchObject({
      i: 'a',
      x: 0,
      y: 0,
      w: 6,
      h: 6,
      minW: 4,
      minH: 2,
    });
  });

  it('flows two default-width cards SIDE BY SIDE on one row', () => {
    // The behaviour the width default exists to produce. Asserting the number
    // alone would pass on a default of 6 that still stacked because of a wrap
    // bug, so assert the geometry the user actually sees.
    const { layouts } = buildCanvasCardLayout([
      <CanvasCard key="a" cardKey="a">A</CanvasCard>,
      <CanvasCard key="b" cardKey="b">B</CanvasCard>,
    ]);
    expect(layouts.lg[0]).toMatchObject({ i: 'a', x: 0, y: 0, w: 6 });
    expect(layouts.lg[1]).toMatchObject({ i: 'b', x: 6, y: 0, w: 6 });
  });

  it('an EXPLICIT w={12} still wins — 661 usages already say so', () => {
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a" w={12}>A</CanvasCard>,
    );
    expect(layouts.lg[0]).toMatchObject({ i: 'a', w: 12 });
  });

  it('an app not ready for the new default can restore the old one', () => {
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a">A</CanvasCard>,
      { defaultWidth: 12 },
    );
    expect(layouts.lg[0]).toMatchObject({ i: 'a', w: 12 });
  });

  it('flows cards left-to-right and wraps at the 12-column boundary', () => {
    const { layouts } = buildCanvasCardLayout([
      <CanvasCard key="a" cardKey="a" w={8} h={5}>
        A
      </CanvasCard>,
      <CanvasCard key="b" cardKey="b" w={6} h={3}>
        B
      </CanvasCard>,
    ]);
    // 8 + 6 > 12, so b wraps to a new row at y = rowHeight of the first row.
    expect(layouts.lg[0]).toMatchObject({ i: 'a', x: 0, y: 0, w: 8 });
    expect(layouts.lg[1]).toMatchObject({ i: 'b', x: 0, y: 5, w: 6 });
  });

  it('packs cards side by side when they fit in one row', () => {
    const { layouts } = buildCanvasCardLayout([
      <CanvasCard key="a" cardKey="a" w={6}>
        A
      </CanvasCard>,
      <CanvasCard key="b" cardKey="b" w={6}>
        B
      </CanvasCard>,
    ]);
    expect(layouts.lg[0]).toMatchObject({ x: 0, y: 0 });
    expect(layouts.lg[1]).toMatchObject({ x: 6, y: 0 });
  });

  it('never lets w fall below minW', () => {
    const { layouts } = buildCanvasCardLayout(
      <CanvasCard cardKey="a" w={2} minW={6}>
        A
      </CanvasCard>,
    );
    expect(layouts.lg[0].w).toBe(6);
  });

  it('returns an empty layout for no children rather than throwing', () => {
    const { widgets, layouts, dropped } = buildCanvasCardLayout(null);
    expect(widgets).toEqual({});
    expect(layouts.lg).toEqual([]);
    expect(dropped).toEqual([]);
  });
});

describe('the defect this whole module exists to prevent', () => {
  it('does NOT produce a single "content" widget holding every card', () => {
    // The retired anti-pattern: `widgets={{ content: <Card/><Card/><Card/> }}`
    // with one grid item spanning the page. The canvas editor then drags the
    // whole page as one block. If this assertion ever fails, that regression
    // is back.
    const { widgets, layouts } = buildCanvasCardLayout([
      <CanvasCard key="1" cardKey="one">
        1
      </CanvasCard>,
      <CanvasCard key="2" cardKey="two">
        2
      </CanvasCard>,
      <CanvasCard key="3" cardKey="three">
        3
      </CanvasCard>,
    ]);
    expect(Object.keys(widgets)).not.toContain('content');
    expect(Object.keys(widgets).length).toBeGreaterThan(1);
    expect(layouts.lg.length).toBeGreaterThan(1);
  });
});
