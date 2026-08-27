import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import { CanvasCard } from '../CanvasCard.js';
import { buildCanvasCardLayout } from '../canvasCardLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * G1 — the grid-item chrome inversion.
 *
 * These assertions render the REAL grid and read the REAL DOM. Three
 * page-builder releases this week shipped green and broken because every test
 * drove the hook with no grid attached; a chrome change is exactly the class of
 * defect a hook-level test cannot see, so nothing here is allowed to assert on
 * a prop.
 */
const layouts: GridLayouts = {
  lg: [{ i: 'alpha', x: 0, y: 0, w: 6, h: 4 }],
};

function surface(container: HTMLElement) {
  const el = container.querySelector('[data-slot="grid-item-surface"]');
  expect(el, 'the grid item surface must exist in the DOM').toBeTruthy();
  return el as HTMLElement;
}

describe('grid-item chrome is OFF by default (the 2.0.0 inversion)', () => {
  it('paints NO border, radius or background on a default grid item', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-off"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    expect(el.dataset.chrome).toBe('off');
    expect(el.classList.contains('bg-card'), 'chrome off must not paint a background').toBe(false);
    expect(el.classList.contains('border'), 'chrome off must not paint a border').toBe(false);
    expect(
      [...el.classList].some((c) => c.startsWith('rounded')),
      'chrome off must not round the corners',
    ).toBe(false);
  });

  it('keeps the LAYOUT identical with chrome off — only the paint is conditional', () => {
    // If turning chrome off also changed the box, every card in the estate would
    // change size, and the inversion would be a layout change wearing a styling
    // change's clothes.
    //
    // ASSERTED AS AN INVARIANT, NOT AS A CONSTANT. This used to hardcode `h-full`.
    // The height class is now conditional on `autoHeight` — an autoHeight slot's
    // chrome HUGS its content so it cannot paint the Math.ceil row remainder as a
    // second bottom border (D-46/D-98/D-136). Hardcoding the old value made this
    // test fail on the fix for a defect it was never about, which is what a test
    // asserting a constant always eventually does.
    //
    // What actually matters is that chrome-on and chrome-off produce the SAME box.
    // Comparing them directly says that, and keeps saying it whatever the height
    // class becomes.
    // No regex (operator ruling 2026-08-26). Exact token prefixes, checked with
    // startsWith — which is also what "a layout class" actually means here.
    const LAYOUT_PREFIXES = ['h-', 'w-', 'flex', 'min-h-'];
    const layoutClasses = (el: HTMLElement) =>
      [...el.classList]
        .filter((c) => LAYOUT_PREFIXES.some((prefix) => c.startsWith(prefix)))
        .sort()
        .join(' ');

    const off = render(
      <PageGridLayout
        pageKey="chrome-off-layout"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const on = render(
      <PageGridLayout
        pageKey="chrome-on-layout"
        defaultLayouts={layouts}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );

    const offClasses = layoutClasses(surface(off.container));
    expect(offClasses, 'the surface must carry real layout classes, or this compares nothing')
      .not.toBe('');
    expect(layoutClasses(surface(on.container)), 'chrome must change the PAINT, never the BOX')
      .toBe(offClasses);
  });

  it('still renders the widget content — chrome off is not content off', () => {
    const { getByText } = render(
      <PageGridLayout
        pageKey="chrome-off-content"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    expect(getByText('Alpha')).toBeTruthy();
  });
});

describe('chrome is opt-in, at two levels, and per-item wins', () => {
  it('the app-level `itemChrome` prop restores the pre-2.0.0 surface exactly', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-app"
        defaultLayouts={layouts}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    expect(el.dataset.chrome).toBe('on');
    for (const cls of ['bg-card', 'border', 'border-border', 'shadow-sm']) {
      expect(el.classList.contains(cls), `chrome on must paint ${cls}`).toBe(true);
    }
  });

  it('a per-item `chrome` flag turns ONE slot back on while the app default stays off', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-item"
        defaultLayouts={{
          lg: [
            { i: 'bare', x: 0, y: 0, w: 6, h: 4, chrome: true },
            { i: 'carded', x: 6, y: 0, w: 6, h: 4 },
          ],
        }}
        widgets={{ bare: <div>Bare</div>, carded: <div>Carded</div> }}
      />,
    );
    const surfaces = [
      ...container.querySelectorAll('[data-slot="grid-item-surface"]'),
    ] as HTMLElement[];
    expect(surfaces).toHaveLength(2);
    expect(surfaces.map((s) => s.dataset.chrome).sort()).toEqual(['off', 'on']);
  });

  it('a per-item `chrome: false` beats an app-level `itemChrome` — per-item always wins', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-item-off"
        defaultLayouts={{ lg: [{ i: 'alpha', x: 0, y: 0, w: 6, h: 4, chrome: false }] }}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    expect(surface(container).dataset.chrome).toBe('off');
  });
});

describe('the chrome radius is tenant-configurable, not a literal', () => {
  it('reads --radius-card so the grid item and an app card can align on ONE var', () => {
    // A literal here would align the two surfaces AND lock white-label out.
    // `--radius-preset` is written by every branding resolver in the estate and
    // read by nothing; the fix is a var with a reader, not a hardcoded 24px.
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-radius"
        defaultLayouts={layouts}
        itemChrome
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    expect(
      el.classList.contains('rounded-[var(--radius-card,1.5rem)]'),
      'the radius must read the token so a tenant can set it',
    ).toBe(true);
    expect(el.classList.contains('rounded-3xl'), 'no hardcoded radius may remain').toBe(false);
  });
});

// ── The CanvasCard authoring path can reach the opt-out (2.1.0) ─────────────
//
// This is the assertion whose ABSENCE let 2.0.0 ship an escape hatch nobody
// could use. `GridLayoutItem.chrome` was tested above and worked; what was
// never tested is the path that ~1,729 pages across six apps actually take —
// `<CanvasCard>` → `buildCanvasCardLayout` → `defaultLayouts` → the painted
// surface. It rendered nothing of the sort, and the PR that promised the hatch
// said so in a comment instead of in a test.
//
// Every case here renders the REAL grid and reads the REAL `data-chrome`
// attribute for a NAMED slot, so a change to the default flips these red.
describe('a CanvasCard can opt out of chrome (the path 1,729 usages take)', () => {
  const surfaces = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-slot="grid-item-surface"]')] as HTMLElement[];

  /** `data-chrome` for one slot, addressed by the widget text it wraps. */
  const chromeFor = (container: HTMLElement, text: string) => {
    const el = surfaces(container).find((surface) => surface.textContent?.includes(text));
    expect(el, `no grid-item surface rendered around "${text}"`).toBeTruthy();
    return el!.dataset.chrome;
  };

  function renderPage(node: React.ReactNode, itemChrome: boolean) {
    const { widgets, layouts: built } = buildCanvasCardLayout(node);
    return render(
      <PageGridLayout
        pageKey={`canvas-chrome-${itemChrome ? 'on' : 'off'}`}
        defaultLayouts={built}
        itemChrome={itemChrome}
        widgets={widgets}
      />,
    );
  }

  const page = (
    <>
      <CanvasCard cardKey="hero" chrome={false}>
        Marketing hero
      </CanvasCard>
      <CanvasCard cardKey="bare" chrome>
        Bare list
      </CanvasCard>
      <CanvasCard cardKey="quiet">Ordinary card</CanvasCard>
    </>
  );

  it('chrome={false} beats an app that sets itemChrome — the /pricing case', () => {
    const { container } = renderPage(page, true);
    expect(surfaces(container), 'all three slots must render or the rest is vacuous').toHaveLength(3);
    expect(chromeFor(container, 'Marketing hero')).toBe('off');
    // …and the slot next to it is untouched, so this is an OPT-OUT and not a
    // page-wide flip.
    expect(chromeFor(container, 'Ordinary card')).toBe('on');
  });

  it('chrome beats an app that leaves itemChrome off — the bare-slot case', () => {
    const { container } = renderPage(page, false);
    expect(surfaces(container)).toHaveLength(3);
    expect(chromeFor(container, 'Bare list')).toBe('on');
    expect(chromeFor(container, 'Ordinary card')).toBe('off');
  });

  it('a card that says nothing follows itemChrome in BOTH directions', () => {
    expect(chromeFor(renderPage(page, true).container, 'Ordinary card')).toBe('on');
    expect(chromeFor(renderPage(page, false).container, 'Ordinary card')).toBe('off');
  });
});
