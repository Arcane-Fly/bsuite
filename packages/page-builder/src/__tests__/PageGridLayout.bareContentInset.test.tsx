import React, { useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout, hasBareContent } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * crm7#2734. Content that brings no inset must not sit on the chrome border,
 * and content that DOES bring one must not be inset twice.
 *
 * The chrome-on surface paints a border and no padding, so a filter bar placed
 * straight in a CanvasCard touched its edge. The first attempt at a fix
 * (2.8.0-next.0) padded the surface through a CSS `:has()` guard on
 * `data-slot` markers. It double-padded every widget that pads itself without
 * a marker: crm7's dashboard widgets (`p-6`) ended up 52px from the border.
 * CSS cannot read computed padding, so the decision is now measured.
 * Padding is given inline here because jsdom does not compute Tailwind.
 */
const layouts: GridLayouts = { lg: [{ i: 'alpha', x: 0, y: 0, w: 12, h: 4 }] };

function surfaceOf(content: React.ReactNode, itemChrome = true) {
  const { container } = render(
    <PageGridLayout pageKey="inset" itemChrome={itemChrome} defaultLayouts={layouts} widgets={{ alpha: content }} />,
  );
  const el = container.querySelector('[data-slot="grid-item-surface"]');
  expect(el).toBeTruthy();
  return el as HTMLElement;
}
const inset = (el: HTMLElement) => el.hasAttribute('data-bare-content') && el.classList.contains('p-6');

describe('a chrome-on surface insets only content that brings no inset (crm7#2734)', () => {
  it('insets a bare filter bar', () => {
    const el = surfaceOf(<div className="flex gap-4"><input aria-label="Search" /><select aria-label="Type" /></div>);
    expect(inset(el)).toBe(true);
  });

  it('does NOT inset a widget that pads itself: the dashboard double-inset', () => {
    const el = surfaceOf(<div style={{ padding: 24 }}><h2>Pipeline</h2><p>body</p></div>);
    expect(inset(el)).toBe(false);
  });

  it('looks through a pure wrapper to the padded element inside it', () => {
    const el = surfaceOf(<section><div style={{ padding: 24 }}><p>a</p><p>b</p></div></section>);
    expect(inset(el)).toBe(false);
  });

  it('does not inset a slot whose content is a Card, however deep', () => {
    const el = surfaceOf(<div className="grid"><div data-slot="card">a</div><div>b</div></div>);
    expect(inset(el)).toBe(false);
  });

  it('does not inset a PageHeader, which brings p-6 md:p-7 itself', () => {
    const el = surfaceOf(<div data-slot="page-header"><h1>Title</h1></div>);
    expect(inset(el)).toBe(false);
  });

  it('never insets a chrome-off slot', () => {
    const el = surfaceOf(<div className="flex"><span>a</span><span>b</span></div>, false);
    expect(el.hasAttribute('data-bare-content')).toBe(false);
  });

  it('re-decides when the content changes after load', async () => {
    let show: (() => void) | undefined;
    function Loads() {
      const [ready, setReady] = useState(false);
      show = () => setReady(true);
      return ready ? <div data-slot="card">loaded</div> : <div className="flex"><span>…</span><span>…</span></div>;
    }
    const el = surfaceOf(<Loads />);
    expect(inset(el)).toBe(true);
    act(() => show?.());
    await waitFor(() => expect(inset(el)).toBe(false));
  });
});

describe('hasBareContent', () => {
  it('skips the in-edit label strip rather than measuring it', () => {
    const surface = document.createElement('div');
    surface.innerHTML =
      '<div data-slot="grid-item-body"><div data-slot="grid-item-editor-chrome" style="padding:4px">x</div><div class="flex"><span>a</span><span>b</span></div></div>';
    expect(hasBareContent(surface)).toBe(true);
  });
});
