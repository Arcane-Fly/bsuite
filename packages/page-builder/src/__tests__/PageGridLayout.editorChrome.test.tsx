import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

/**
 * Edit-mode label + hide must occupy a measured in-flow strip, not sit
 * absolute on top of card content. These assertions render the REAL grid.
 * Geometry (intersection of boxes) lives in scripts/editor-chrome-geometry.mjs
 * because jsdom has no layout engine — a 0×0 vs 0×0 "non-overlap" here would
 * be the toy-box pass the brief forbids.
 */

const layouts: GridLayouts = {
  lg: [{ i: 'candidates', x: 0, y: 0, w: 12, h: 4, autoHeight: false }],
};

const autoHeightLayouts: GridLayouts = {
  lg: [{ i: 'candidates', x: 0, y: 0, w: 12, h: 4, autoHeight: true }],
};

function openEditor() {
  act(() => {
    window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
  });
}

function closeEditor() {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('bsuite-open-page-editor', { detail: { editing: false } }),
    );
  });
}

let mountSeq = 0;

function mount(options?: { autoHeight?: boolean; itemChrome?: boolean }) {
  const defaultLayouts = options?.autoHeight ? autoHeightLayouts : layouts;
  mountSeq += 1;
  return render(
    <PageGridLayout
      pageKey={`editor-chrome-contract-${mountSeq}`}
      defaultLayouts={defaultLayouts}
      canEditPage
      itemChrome={options?.itemChrome}
      widgets={{
        candidates: (
          <article data-slot="card-content">
            <h2 data-slot="card-heading">Candidates</h2>
            <p>Pipeline rows</p>
          </article>
        ),
      }}
      widgetMeta={{ candidates: { label: 'Candidates' } }}
    />,
  );
}

function editorChrome(container: HTMLElement) {
  return container.querySelector('[data-slot="grid-item-editor-chrome"]') as HTMLElement | null;
}

describe('edit-mode editor chrome is a measured in-flow strip', () => {
  it('does not render the strip in view mode — content is not labelled over', () => {
    const { container } = mount();
    expect(editorChrome(container)).toBeNull();
    expect(screen.getByText('Candidates')).toBeTruthy();
    expect(container.querySelector('[aria-label="Hide Candidates"]')).toBeNull();
  });

  it('renders one labelled strip per card in edit mode, with hide still callable', () => {
    const { container } = mount();
    openEditor();

    const strip = editorChrome(container);
    expect(strip, 'edit mode must expose the in-flow editor strip').toBeTruthy();
    expect(strip!.textContent).toContain('Candidates');

    const hide = strip!.querySelector<HTMLButtonElement>('[aria-label="Hide Candidates"]');
    expect(hide, 'hide must live on the strip, not as a floating overlay').toBeTruthy();
    expect(hide!.tagName).toBe('BUTTON');
    expect(hide!.hasAttribute('data-no-drag')).toBe(true);
    expect(hide!.getAttribute('type')).toBe('button');
  });

  it('the strip is in-flow — it does not use the overlapping absolute top-left/top-right placement', () => {
    const { container } = mount();
    openEditor();
    const strip = editorChrome(container)!;
    expect(strip.classList.contains('absolute'), 'in-flow strip must not be position:absolute').toBe(
      false,
    );
    expect(strip.classList.contains('top-2')).toBe(false);
    expect(strip.classList.contains('left-2')).toBe(false);
    expect(strip.classList.contains('right-2')).toBe(false);
    expect(strip.classList.contains('inset-0')).toBe(false);

    const hide = strip.querySelector<HTMLButtonElement>('[aria-label="Hide Candidates"]')!;
    expect(hide.classList.contains('absolute')).toBe(false);
    expect(hide.classList.contains('top-2')).toBe(false);
    expect(hide.classList.contains('right-2')).toBe(false);
  });

  it('keeps the label visible — the fix is separation, not hiding the name', () => {
    const { container } = mount();
    openEditor();
    const strip = editorChrome(container)!;
    const label = [...strip.querySelectorAll('span')].find((el) =>
      el.textContent?.includes('Candidates'),
    );
    expect(label, 'the card name must remain on screen in edit mode').toBeTruthy();
    expect(label!.classList.contains('sr-only')).toBe(false);
    expect(label!.classList.contains('hidden')).toBe(false);
    expect(label!.getAttribute('hidden')).toBeNull();
    expect(label!.classList.contains('opacity-80'), 'do not dim the label below the token').toBe(
      false,
    );
  });

  it('uses role tokens on native control edges, not palette or opacity-tinted destructive', () => {
    const { container } = mount();
    openEditor();
    const strip = editorChrome(container)!;
    expect(strip.classList.contains('bg-muted')).toBe(true);
    expect(strip.classList.contains('text-muted-foreground')).toBe(true);

    const hide = strip.querySelector<HTMLButtonElement>('[aria-label="Hide Candidates"]')!;
    expect(hide.classList.contains('bg-destructive')).toBe(true);
    expect(hide.classList.contains('text-destructive-foreground')).toBe(true);
    expect(
      [...hide.classList].some((c) => c.startsWith('bg-destructive/')),
      'destructive must be the solid semantic fill, not an opacity tint',
    ).toBe(false);
    expect([...hide.classList].some((c) => c.startsWith('bg-red-'))).toBe(false);
    expect([...hide.classList].some((c) => c.startsWith('text-red-'))).toBe(false);
  });

  it('per-item hide still removes the card; the layers panel is not the only path', async () => {
    const { container } = mount();
    openEditor();
    const hide = editorChrome(container)!.querySelector<HTMLButtonElement>(
      '[aria-label="Hide Candidates"]',
    )!;
    act(() => {
      hide.click();
    });
    await waitFor(() => {
      expect(screen.queryByText('Pipeline rows')).toBeNull();
    });
    expect(editorChrome(container)).toBeNull();
  });

  it('leaving edit mode removes the strip and leaves the card content in place', () => {
    const { container } = mount();
    openEditor();
    expect(editorChrome(container)).toBeTruthy();
    closeEditor();
    expect(editorChrome(container)).toBeNull();
    expect(screen.getByText('Pipeline rows')).toBeTruthy();
    expect(screen.getByText('Candidates')).toBeTruthy();
  });

  it('drag-handle stays on the grid item so the card remains draggable from the strip', () => {
    const { container } = mount();
    openEditor();
    const item = container.querySelector('.react-grid-item') as HTMLElement;
    expect(item.classList.contains('drag-handle')).toBe(true);
    expect(item.classList.contains('cursor-move')).toBe(true);
  });

  it('resize handle remains in the DOM while editing — autoHeight is not a resize trade-off', () => {
    const { container } = mount({ autoHeight: true });
    openEditor();
    const item = container.querySelector('.react-grid-item') as HTMLElement;
    expect(item.classList.contains('react-resizable-hide')).toBe(false);
    expect(item.querySelector('.react-resizable-handle')).toBeTruthy();
  });

  it('autoHeight measures the strip: chrome is inside the unconstrained flow-root wrapper', () => {
    const { container } = mount({ autoHeight: true });
    openEditor();
    const strip = editorChrome(container)!;
    const measure = strip.closest('.flow-root');
    expect(measure, 'strip must sit inside the autoHeight measure wrapper').toBeTruthy();
    expect(measure!.contains(container.querySelector('[data-slot="card-heading"]')!)).toBe(true);
  });

  it('a fixed-height card keeps the strip outside the scroll wrapper so hide stays on screen', () => {
    const { container } = mount({ autoHeight: false });
    openEditor();
    const strip = editorChrome(container)!;
    const body = container.querySelector('[data-slot="grid-item-body"]') as HTMLElement | null;
    expect(body, 'fixed-height cards must still have a body wrapper').toBeTruthy();
    expect(body!.classList.contains('overflow-auto')).toBe(true);
    expect(body!.contains(strip), 'the strip must not scroll away with content').toBe(false);
    expect(body!.contains(container.querySelector('[data-slot="card-heading"]')!)).toBe(true);
  });
});
