import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
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
    expect(el.className).not.toMatch(/\bbg-card\b/);
    expect(el.className).not.toMatch(/\bborder\b/);
    expect(el.className).not.toMatch(/\brounded/);
  });

  it('keeps the LAYOUT identical with chrome off — only the paint is conditional', () => {
    // If turning chrome off also dropped `h-full w-full flex flex-col`, every
    // card in the estate would change size, and the inversion would be a
    // layout change wearing a styling change's clothes.
    const { container } = render(
      <PageGridLayout
        pageKey="chrome-off-layout"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div> }}
      />,
    );
    const el = surface(container);
    for (const cls of ['h-full', 'w-full', 'flex', 'flex-col']) {
      expect(el.className, `layout class ${cls} must survive chrome removal`).toMatch(
        new RegExp(`\\b${cls}\\b`),
      );
    }
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
    expect(el.className).toMatch(/\bbg-card\b/);
    expect(el.className).toMatch(/\bborder\b/);
    expect(el.className).toMatch(/\bborder-border\b/);
    expect(el.className).toMatch(/\bshadow-sm\b/);
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
    expect(el.className).toMatch(/rounded-\[var\(--radius-card,1\.5rem\)\]/);
    expect(el.className, 'no hardcoded radius may remain').not.toMatch(/\brounded-3xl\b/);
  });
});
