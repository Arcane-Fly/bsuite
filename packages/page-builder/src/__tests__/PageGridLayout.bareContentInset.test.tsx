import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * crm7#2734 — content that brings no surface must not sit on the chrome border.
 *
 * The chrome-on surface painted a border and no padding, so a hand-rolled
 * header or a filter bar placed straight in a CanvasCard touched its edge. The
 * surface now carries an inset variant that applies only while nothing inside
 * it declares its own surface (`data-slot="card"` / `"page-header"`).
 *
 * The inset is a Tailwind variant, which jsdom does not compute, so the
 * contract is asserted in two halves against the REAL rendered surface: the
 * class carries the inset, and the variant's selector matches a bare slot and
 * stops matching once a Card or PageHeader is inside it.
 */
const layouts: GridLayouts = { lg: [{ i: 'alpha', x: 0, y: 0, w: 12, h: 4 }] };
const INSET = /^\[&:not\(:has\(\[data-slot=card\]\)\):not\(:has\(\[data-slot=page-header\]\)\)\]:p-6$/;
const SELECTOR = ':not(:has([data-slot=card])):not(:has([data-slot=page-header]))';

function surfaceOf(content: React.ReactNode, itemChrome = true) {
  const { container } = render(
    <PageGridLayout pageKey="inset" itemChrome={itemChrome} defaultLayouts={layouts} widgets={{ alpha: content }} />,
  );
  const el = container.querySelector('[data-slot="grid-item-surface"]');
  expect(el).toBeTruthy();
  return el as HTMLElement;
}

describe('a chrome-on surface insets content that brings no surface (crm7#2734)', () => {
  it('pads a bare filter bar', () => {
    const el = surfaceOf(<div className="flex gap-4"><input aria-label="Search" /></div>);
    expect([...el.classList].some((c) => INSET.test(c))).toBe(true);
    expect(el.matches(SELECTOR)).toBe(true);
  });

  it('does not pad a slot whose content is a Card, however deep', () => {
    const el = surfaceOf(<section><div data-slot="card">body</div></section>);
    expect(el.matches(SELECTOR)).toBe(false);
  });

  it('does not pad a PageHeader, which brings p-6 md:p-7 itself', () => {
    const el = surfaceOf(<div data-slot="page-header"><h1>Title</h1></div>);
    expect(el.matches(SELECTOR)).toBe(false);
  });

  it('never insets a chrome-off slot — layout only, no paint, no inset', () => {
    const el = surfaceOf(<div>bare</div>, false);
    expect([...el.classList].some((c) => INSET.test(c))).toBe(false);
  });
});
