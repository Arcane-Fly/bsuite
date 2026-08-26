import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * WHICH SLOT IS THIS?
 *
 * The rendered grid item exposed only a transform and a class. Nothing in the
 * DOM said which slot it was, so identifying one meant ENTERING EDIT MODE and
 * reading the `Hide <label>` button's aria-label — a three-click path through a
 * launcher, a dialog and a collapsed disclosure.
 *
 * Two datasets were voided on 2026-08-27 because of what that path costs. Every
 * step is a way to measure the wrong thing: a create dialog that intercepts the
 * click, a route that navigates mid-sequence, a permission gate that renders a
 * plausible placeholder rather than the page you asked for. And edit mode is the
 * mode in which a gesture WRITES `user_preferences` — keyed by USER and shared
 * across environments — so identifying a slot put a real person's saved layout
 * at risk.
 *
 * These assertions render the REAL grid and read the REAL DOM, per the standard
 * set by the chrome suite: a change of this class is exactly what a hook-level
 * test cannot see.
 */
const layouts: GridLayouts = {
  lg: [
    { i: 'alpha', x: 0, y: 0, w: 6, h: 4 },
    { i: 'beta', x: 6, y: 0, w: 6, h: 4 },
  ],
};

function surfaces(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('[data-slot="grid-item-surface"]'),
  ) as HTMLElement[];
}

describe('a grid slot is identifiable from a read-only render', () => {
  it('carries its cardKey WITHOUT entering edit mode', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="identity-read-only"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const found = surfaces(container);
    // A vacuous pass is not a pass: assert the denominator before the property.
    expect(found.length, 'expected two rendered slots to assert against').toBe(2);
    expect(found.map((el) => el.dataset.cardKey).sort()).toEqual(['alpha', 'beta']);
  });

  it('gives each slot a DISTINCT key, so records cannot be conflated', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="identity-distinct"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const keys = surfaces(container).map((el) => el.dataset.cardKey);
    expect(keys.length).toBe(2);
    expect(new Set(keys).size, 'two slots must not share one identity').toBe(2);
  });

  it('carries the identity whether chrome is ON or OFF', () => {
    // Identity is not styling. A slot that opts out of the painted surface is
    // still a slot, and an audit of the chrome default has to be able to name it.
    for (const itemChrome of [true, false]) {
      const { container, unmount } = render(
        <PageGridLayout
          pageKey={`identity-chrome-${String(itemChrome)}`}
          defaultLayouts={layouts}
          itemChrome={itemChrome}
          widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
        />,
      );
      const found = surfaces(container);
      expect(found.length).toBe(2);
      for (const el of found) {
        expect(el.dataset.chrome).toBe(itemChrome ? 'on' : 'off');
        expect(
          el.dataset.cardKey,
          `identity must survive chrome=${String(itemChrome)}`,
        ).toBeTruthy();
      }
      unmount();
    }
  });

  it('exposes the human label too, so a reading is legible without the source', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="identity-label"
        defaultLayouts={layouts}
        widgetMeta={{ alpha: { label: 'Quick Actions' } }}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const el = surfaces(container).find((s) => s.dataset.cardKey === 'alpha');
    expect(el, 'the alpha slot must render').toBeTruthy();
    expect(el!.dataset.cardLabel).toBe('Quick Actions');
  });
});
