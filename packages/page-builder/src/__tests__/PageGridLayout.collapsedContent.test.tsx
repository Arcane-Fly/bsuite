import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * A card whose content is laid out but measures zero renders as an EMPTY CARD,
 * not as a broken one. `reportRows` is guarded by `contentPx > 0`, so the zero
 * is discarded and the card keeps its previous height while `overflow-hidden`
 * clips everything inside. Nothing throws and nothing logs — which is why this
 * survived across 48 measured card bodies in production.
 *
 * WHY THIS FILE FAKES LAYOUT EXPLICITLY. jsdom has no layout engine: every
 * getBoundingClientRect().height and every scrollHeight is 0. A test that just
 * renders a card proves nothing about a height bug, and a warning keyed on
 * "height is 0" would fire on every card in every suite. The warning is keyed on
 * the shape actually measured in production — laid-out content (scrollHeight > 0)
 * inside a zero-height box — so this file fakes precisely that pair and the
 * control that separates them.
 */
const LAYOUTS: GridLayouts = {
  lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 6, autoHeight: true }],
};

const WIDGETS = { card: <div data-testid="body">chart</div> };

function renderCard() {
  return render(
    <PageGridLayout pageKey="collapsed-content" defaultLayouts={LAYOUTS} widgets={WIDGETS} />,
  );
}

describe('an autoHeight card whose content is laid out but measures zero', () => {
  let err: ReturnType<typeof vi.spyOn>;
  let scrollHeight: PropertyDescriptor | undefined;
  let rect: typeof Element.prototype.getBoundingClientRect;
  let offsetWidth: PropertyDescriptor | undefined;

  beforeEach(() => {
    err = vi.spyOn(console, 'error').mockImplementation(() => {});
    scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    rect = Element.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() { return 1200; },
    });
  });

  afterEach(() => {
    err.mockRestore();
    Element.prototype.getBoundingClientRect = rect;
    if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
    if (offsetWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
    vi.resetModules();
  });

  /** Only reachable when the bundle is a dev build; production stays silent by design. */
  const dev = () => (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  it('says so, instead of rendering an empty card in silence', () => {
    // The production signature: 1,938px of laid-out content inside a 0px box.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return 1938; },
    });
    renderCard();
    if (!dev()) return;
    const said = err.mock.calls.some(
      (c: unknown[]) => String(c[0]).includes('@bsuite/page-builder') && String(c[0]).includes('measured 0px'),
    );
    expect(said).toBe(true);
  });

  it('stays silent when there is no laid-out content — the ordinary jsdom and mount case', () => {
    // scrollHeight 0 is what jsdom reports for everything, and what a genuinely
    // empty wrapper reports on first paint. Warning here would make the check
    // fire on every card in every suite and mean nothing.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return 0; },
    });
    renderCard();
    const said = err.mock.calls.some((c: unknown[]) => String(c[0]).includes('measured 0px'));
    expect(said).toBe(false);
  });
});
