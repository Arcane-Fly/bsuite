import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * THE DOUBLED BOTTOM BORDER — D-46, D-98, D-136.
 *
 * The operator has raised this repeatedly, most recently as
 * "Bottom border still double for cards which we have raised 100s of times now."
 * It was flagged REGRESSION in the register.
 *
 * WHY IT HAPPENS, AND WHY 2.3.1 DID NOT FIX IT
 * --------------------------------------------
 * `computeAutoHeightRows` uses `Math.ceil` to round content height up to whole
 * rows, because react-grid-layout only accepts integer row units. So an
 * autoHeight slot is up to (rowHeight + marginY - 1)px TALLER than its content —
 * measured on /placements: 6.6px at 1440 and 768, 28.6px at 1024.
 *
 * That remainder is unavoidable. It is what "whole rows" means.
 *
 * With `h-full` the painted surface FILLS the remainder, so its bottom border is
 * drawn BELOW the content's own bottom edge. When the content also paints a Card
 * — which ~90% of slots do — the user sees two bottom borders with a few px of
 * card background between them.
 *
 * 2.3.1 changed the row ARITHMETIC and could not fix it, because no arithmetic
 * removes a ceil remainder. The fix is in the PAINT: on an autoHeight slot the
 * surface hugs its content, and the remainder becomes transparent space nobody
 * can see.
 *
 * WHY THIS TEST IS AT THE CLASS LEVEL AND THAT IS CORRECT HERE
 * -----------------------------------------------------------
 * jsdom has no layout engine, so it cannot measure a 6.6px gap — a previous
 * attempt to test this class by measuring boxes was correctly rejected for that
 * reason. But this defect is not a measurement: it is literally WHICH CLASS the
 * surface carries. `h-full` fills the remainder; `h-fit` does not. Asserting the
 * class is asserting the defect, not a proxy for it.
 *
 * Asserted with `classList.contains`, never a regex. Operator ruling 2026-08-26 bans
 * regex assertions, and it is the better instrument here anyway: classList is EXACT
 * token matching, so it cannot be fooled by `h-fullscreen` or by word-boundary
 * subtleties the way /\bh-full\b/ can.
 *
 * Both directions are exercised. A test that only checked the autoHeight case
 * would pass if someone removed `h-full` everywhere, which would break every
 * manually-resized slot.
 */
const layouts: GridLayouts = {
  lg: [{ i: 'alpha', x: 0, y: 0, w: 6, h: 4 }],
};

function surface(container: HTMLElement) {
  const el = container.querySelector('[data-slot="grid-item-surface"]');
  expect(el, 'the grid item surface must exist in the DOM').toBeTruthy();
  return el as HTMLElement;
}

/** The wrapper directly inside the surface — the one that must not stretch. */
function inner(container: HTMLElement) {
  const el = surface(container).firstElementChild;
  expect(el, 'the surface must wrap its content in a flex child').toBeTruthy();
  return el as HTMLElement;
}

/**
 * Does this element paint a border, whatever utility form expresses it?
 *
 * These assertions used to read `classList.contains('border')`. That is the
 * MECHANISM, not the contract -- when the border width and colour became
 * operator-editable custom properties the class became
 * `border-[length:var(--card-border-width,1px)]` and the literal check went
 * red on a surface that was still painting a 1px border exactly as before.
 * The contract is "a border is painted"; this predicate states that, and stays
 * true across any future utility spelling.
 */
function paintsBorder(el: Element): boolean {
  return [...el.classList].some((c) => c === 'border' || c.startsWith('border-['));
}

describe('an autoHeight slot must not paint the ceil remainder', () => {
  it('the surface HUGS its content rather than filling the over-allocated row', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-autoheight"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: true }] }}
        defaultAutoHeight
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);

    // The regression, stated as the operator sees it: a painted surface that is
    // taller than its content shows a second bottom border.
    expect(
      el.classList.contains('h-full'),
      'h-full makes the chrome fill the Math.ceil remainder, and its bottom border ' +
        'is then drawn below the content card\'s — this is the doubled bottom border',
    ).toBe(false);
    expect(el.classList.contains('h-fit'), 'the chrome must hug its content').toBe(true);

    // ...and the surface must still actually be painting, or this test would
    // pass on a slot with no chrome at all and prove nothing.
    expect(el.dataset.chrome).toBe('on');
    expect(paintsBorder(el), 'the surface must still be painting').toBe(true);
  });

  it('the inner wrapper does not stretch, which would re-create the gap inside the surface', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-autoheight-inner"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: true }] }}
        defaultAutoHeight
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = inner(container);
    expect(
      el.classList.contains('flex-1'),
      'flex-1 claims all remaining vertical space, so the wrapper stretches to the ' +
        'over-allocated height and the surface hugs THAT — undoing the fix',
    ).toBe(false);
    expect(el.classList.contains('flex-none')).toBe(true);
  });
});

/**
 * NOTE ON REACH. `DEFAULT_ITEM_AUTO_HEIGHT = true` in usePageGridLayout, so EVERY slot
 * in the estate is autoHeight unless a page explicitly opts out. These two cases must
 * therefore set `autoHeight: false` by hand — and that is also why the defect is
 * estate-wide rather than confined to a few pages, which is exactly how the operator
 * described it: "all card surfaces", "estate-wide".
 */
describe('a manually-resized slot still fills the height the user chose', () => {
  it('keeps h-full when autoHeight is off', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-manual"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: false }] }}
        defaultAutoHeight={false}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    expect(
      el.classList.contains('h-full'),
      'the user picked this height; the chrome must fill it, not hug the content',
    ).toBe(true);
    expect(el.classList.contains('h-fit')).toBe(false);
  });

  it('keeps flex-1 on the inner wrapper when autoHeight is off', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-manual-inner"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: false }] }}
        defaultAutoHeight={false}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    expect(inner(container).classList.contains('flex-1')).toBe(true);
  });
});

describe('hugging the content must not CLIP it (the 2.4.1 regression)', () => {
  /**
   * 2.4.0 made the inner wrapper `flex-none` so the chrome would stop painting the
   * Math.ceil remainder as a second bottom border. That was right, and it had a cost
   * nobody measured until the visual gate ran against production BSU:
   *
   *   FAIL clippedHeading: heading text is CLIPPED — overflows its box by 0x3px
   *   and it is cut by div.min-h-0.flex-none.overflow-hidden
   *
   * Until 2.4.0 the wrapper was `flex-1`, stretching to fill a slot Math.ceil had
   * already rounded UP. That slack happened to hide any glyph painting outside its
   * own line box. Made exact, `overflow-hidden` started CUTTING what the slack hid.
   *
   * A height fix cannot solve it — 3px of glyph outside a line box is not a short
   * box — so the clip goes on the autoHeight branch. The fixed-height branch keeps
   * its scroll container, because there the user chose a height and the content
   * genuinely must be contained.
   */
  it('an autoHeight slot does not clip its own content', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-noclip"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: true }] }}
        defaultAutoHeight
        itemChrome
        widgets={{ alpha: <h2>Alpha</h2> }}
      />,
    );
    const el = inner(container);
    expect(
      el.classList.contains('overflow-hidden'),
      'overflow-hidden on a flex-none wrapper cuts any glyph that paints outside its ' +
        'own line box — measured at 3px on a production h2',
    ).toBe(false);
    expect(el.classList.contains('overflow-visible')).toBe(true);
    // ...and it must still hug, or this would pass by reverting the border fix.
    expect(el.classList.contains('flex-none'), 'the wrapper must still hug its content').toBe(true);
  });

  it('a manually-resized slot STILL contains and scrolls its content', () => {
    // NEGATIVE CONTROL. Without this, removing overflow everywhere would pass the
    // case above while breaking every card the user resized smaller than its content.
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-noclip-manual"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: false }] }}
        defaultAutoHeight={false}
        itemChrome
        widgets={{ alpha: <h2>Alpha</h2> }}
      />,
    );
    const el = inner(container);
    expect(el.classList.contains('overflow-auto'), 'a fixed-height card must still scroll').toBe(true);
    expect(el.classList.contains('overflow-visible')).toBe(false);
  });
});

describe('the fix does not depend on chrome being on', () => {
  it('a chrome-off autoHeight slot also hugs, so nesting stays consistent', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="dbl-chromeless"
        defaultLayouts={{ lg: [{ ...layouts.lg![0], autoHeight: true }] }}
        defaultAutoHeight
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    expect(el.dataset.chrome).toBe('off');
    expect(el.classList.contains('h-full')).toBe(false);
    expect(el.classList.contains('h-fit')).toBe(true);
  });
});
