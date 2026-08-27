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
    expect(found.map((el) => el.dataset.gridSlotKey).sort()).toEqual(['alpha', 'beta']);
  });

  it('gives each slot a DISTINCT key, so records cannot be conflated', () => {
    const { container } = render(
      <PageGridLayout
        pageKey="identity-distinct"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const keys = surfaces(container).map((el) => el.dataset.gridSlotKey);
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
          el.dataset.gridSlotKey,
          `identity must survive chrome=${String(itemChrome)}`,
        ).toBeTruthy();
      }
      unmount();
    }
  });

  it('does NOT ship the human label — it is user free text and Sentry does not mask data-*', () => {
    // Sentry Session Replay masks exactly ['title','placeholder','aria-label'].
    // maskAllText masks TEXT NODES; maskAllInputs masks INPUT VALUES. An arbitrary
    // data-* attribute ships verbatim to the processor. The label resolves as
    // layerNames[i] || widgetMeta[i].label || i, and layerNames is FREE TEXT the
    // user types into the layer-rename input — persisted to user_preferences and
    // masked there by maskAllInputs. Copying it into a data attribute would move it
    // from a masked channel to an unmasked one, permanently.
    const { container } = render(
      <PageGridLayout
        pageKey="identity-no-label"
        defaultLayouts={layouts}
        widgetMeta={{ alpha: { label: 'FutureBuild rates' } }}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const found = surfaces(container);
    expect(found.length, 'expected two rendered slots to assert against').toBe(2);
    for (const el of found) {
      expect(el.dataset.cardLabel, 'no label attribute may reach the DOM').toBeUndefined();
      expect(el.outerHTML).not.toContain('FutureBuild');
    }
  });

  it('uses a name that does not collide with an app-level data-card-key', () => {
    // crm7 InPlaceCardEditing.tsx:396 renders data-card-key={cardKey} INSIDE each
    // grid item. Sharing the name makes querySelector('[data-card-key=X]') match two
    // nested elements and silently return whichever is first in document order.
    const { container } = render(
      <PageGridLayout
        pageKey="identity-no-collision"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha</div>, beta: <div>Beta</div> }}
      />,
    );
    const found = surfaces(container);
    expect(found.length).toBe(2);
    for (const el of found) {
      expect(el.dataset.cardKey, 'must not claim the app-level attribute name').toBeUndefined();
      expect(el.dataset.gridSlotKey).toBeTruthy();
    }
  });
});
