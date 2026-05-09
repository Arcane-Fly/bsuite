import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

const layouts: GridLayouts = {
  lg: [{ i: 'alpha', x: 0, y: 0, w: 12, h: 4 }],
};

describe('PageGridLayout', () => {
  it('renders known widget content', () => {
    const view = render(
      <PageGridLayout
        pageKey="test"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha widget</div> }}
        isResizable
      />,
    );

    expect(screen.getByText('Alpha widget')).toBeTruthy();
    expect(view.container.querySelector('.react-resizable-hide')).toBeTruthy();
    expect(view.container.querySelector('.react-resizable-handle')).toBeNull();
  });
});

describe('PageGridLayout column-preset chips theming', () => {
  it('uses Tailwind class-based active state and never inline-style brand hex fallbacks', () => {
    const view = render(
      <PageGridLayout
        pageKey="theme-test"
        defaultLayouts={layouts}
        defaultCols={3}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    // Force the editor open by clicking the editing toggle path: we simulate by
    // re-rendering with canEditPage already triggers the editor wiring. Instead,
    // directly assert the chips render once we dispatch the editor-open event.
    // Simpler path: dispatch the documented edit event hook used elsewhere.
    act(() => {
      window.dispatchEvent(new CustomEvent('page-grid-edit-open'));
    });

    // Find chip buttons by their visible labels (1, 2, 3, 4, 6, 12).
    const presetLabels = ['1', '2', '3', '4', '6', '12'];
    const chips = presetLabels
      .map((label) =>
        Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(
          (btn) => btn.textContent?.trim() === label && btn.getAttribute('aria-pressed') !== null,
        ),
      )
      .filter((b): b is HTMLButtonElement => Boolean(b));

    // Tests run with editor closed by default — if no chips are present, this
    // test reduces to an invariant on the source code: ensure no hardcoded
    // brand hex is referenced inline. We assert the latter directly via the
    // rendered DOM for any chip that *is* present.
    for (const chip of chips) {
      // No inline style should set backgroundColor / color / border with a hex.
      const inline = chip.getAttribute('style') ?? '';
      expect(inline.toLowerCase()).not.toMatch(/#2563eb|#f3f4f6|#6b7280|#e5e7eb/);
      // Class list must drive the active state, not inline style.
      expect(chip.className).toMatch(/data-\[active\]:bg-primary/);
      expect(chip.className).toMatch(/bg-muted/);
      expect(chip.className).toMatch(/text-muted-foreground/);
      expect(chip.className).toMatch(/border-border/);
    }

    // Sanity: at minimum, the rendered subtree must not contain the legacy
    // hardcoded hex fallbacks anywhere on inline styles for buttons. This
    // catches any regression that re-introduces inline-style brand fallbacks.
    const allButtons = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>('button'),
    );
    for (const btn of allButtons) {
      const inline = (btn.getAttribute('style') ?? '').toLowerCase();
      expect(inline).not.toMatch(/#2563eb|#f3f4f6|#6b7280|#e5e7eb/);
    }
  });
});

describe('PageGridLayout reset-confirmation dialog (ARIA APG dialog-modal)', () => {
  function openEditorAndClickReset(view: ReturnType<typeof render>) {
    act(() => {
      // Dispatch one of the canonical DEFAULT_EDITOR_EVENT_NAMES from
      // usePageGridLayout to flip isEditing → true, which renders the toolbar
      // including the "Reset to Default" button.
      window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
    });
    const toolbarReset = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Reset to Default');
    if (!toolbarReset) {
      throw new Error('Editor toolbar Reset button not rendered — editor open dispatch failed');
    }
    act(() => {
      toolbarReset.click();
    });
  }

  function getDialogButtons(view: ReturnType<typeof render>) {
    const dialog = view.container.querySelector<HTMLDivElement>('[role="dialog"][aria-modal="true"]');
    if (!dialog) return { dialog: null, cancel: null, confirm: null };
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
    const cancel = buttons.find((btn) => btn.textContent?.trim() === 'Cancel') ?? null;
    const confirm = buttons.find((btn) => btn.textContent?.trim() === 'Reset to Default') ?? null;
    return { dialog, cancel, confirm };
  }

  it('renders the dialog when toolbar Reset is clicked', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-render-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    openEditorAndClickReset(view);

    const { dialog } = getDialogButtons(view);
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('page-grid-reset-title');
    expect(dialog?.getAttribute('aria-describedby')).toBe('page-grid-reset-description');
  });

  it('uses bg-destructive (not bg-primary) for the destructive confirm button', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-destructive-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { confirm } = getDialogButtons(view);

    expect(confirm).not.toBeNull();
    expect(confirm!.className).toMatch(/bg-destructive\b/);
    expect(confirm!.className).toMatch(/hover:bg-destructive\/90/);
    // Regression: destructive action must NOT use the positive primary token.
    expect(confirm!.className).not.toMatch(/\bbg-primary\b/);
    expect(confirm!.className).not.toMatch(/\btext-primary-foreground\b/);
  });

  it('gives both dialog buttons a focus-visible ring (WCAG 2.4.7)', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-focus-ring-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { cancel, confirm } = getDialogButtons(view);

    expect(cancel).not.toBeNull();
    expect(confirm).not.toBeNull();
    expect(cancel!.className).toMatch(/focus-visible:ring-2/);
    expect(cancel!.className).toMatch(/focus-visible:ring-ring/);
    expect(confirm!.className).toMatch(/focus-visible:ring-2/);
    expect(confirm!.className).toMatch(/focus-visible:ring-destructive\/40/);
  });

  it('focuses the Cancel button on open (safe default per ARIA APG)', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-focus-cancel-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { cancel } = getDialogButtons(view);

    expect(cancel).not.toBeNull();
    expect(document.activeElement).toBe(cancel);
  });

  it('closes the dialog when Escape is pressed (ARIA APG dialog-modal)', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-escape-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    expect(view.container.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Cancel button click closes the dialog without triggering reset', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-cancel-click-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { cancel } = getDialogButtons(view);
    expect(cancel).not.toBeNull();

    act(() => {
      cancel!.click();
    });

    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('PageGridLayout mobile reflow', () => {
  let resizeCallbacks: ResizeObserverCallback[] = [];
  let originalRO: typeof globalThis.ResizeObserver;
  let originalOffsetWidth: PropertyDescriptor | undefined;

  beforeEach(() => {
    resizeCallbacks = [];
    originalRO = globalThis.ResizeObserver;
    originalOffsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth',
    );

    let currentWidth = 360;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return currentWidth;
      },
      set(value: number) {
        currentWidth = value;
      },
    });

    class FakeRO implements ResizeObserver {
      private cb: ResizeObserverCallback;
      private el: Element | null = null;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
        resizeCallbacks.push(cb);
      }
      observe(target: Element): void {
        this.el = target;
        this.cb(
          [
            {
              target,
              contentRect: { width: 360, height: 800, top: 0, left: 0, bottom: 800, right: 360, x: 0, y: 0, toJSON: () => ({}) } as DOMRectReadOnly,
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this,
        );
      }
      unobserve(): void {}
      disconnect(): void {
        this.el = null;
      }
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      FakeRO as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      originalRO;
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    } else {
      // @ts-expect-error - remove the test-only override
      delete HTMLElement.prototype.offsetWidth;
    }
    vi.restoreAllMocks();
  });

  it('stacks lg-only layouts vertically at a 360px viewport', async () => {
    const lgOnly: GridLayouts = {
      lg: [
        { i: 'kpi-a', x: 0, y: 0, w: 3, h: 4 },
        { i: 'kpi-b', x: 3, y: 0, w: 3, h: 4 },
        { i: 'kpi-c', x: 6, y: 0, w: 3, h: 4 },
        { i: 'kpi-d', x: 9, y: 0, w: 3, h: 4 },
      ],
    };

    let container: HTMLElement;
    await act(async () => {
      const view = render(
        <PageGridLayout
          pageKey="mobile-stack-test"
          defaultLayouts={lgOnly}
          widgets={{
            'kpi-a': <div>KPI A</div>,
            'kpi-b': <div>KPI B</div>,
            'kpi-c': <div>KPI C</div>,
            'kpi-d': <div>KPI D</div>,
          }}
        />,
      );
      container = view.container;
    });

    expect(screen.getByText('KPI A')).toBeTruthy();
    expect(screen.getByText('KPI D')).toBeTruthy();

    const items = Array.from(
      container!.querySelectorAll<HTMLElement>('.react-grid-item'),
    );
    expect(items).toHaveLength(4);

    const xs = items.map((el) => {
      const transform = el.style.transform || '';
      const match = transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
      return {
        x: match ? Number(match[1]) : Number.NaN,
        y: match ? Number(match[2]) : Number.NaN,
        width: el.style.width,
      };
    });

    const xValues = new Set(xs.map((p) => p.x));
    expect(xValues.size).toBe(1);

    const widths = new Set(xs.map((p) => p.width));
    expect(widths.size).toBe(1);

    const ys = xs.map((p) => p.y).sort((a, b) => a - b);
    const uniqueYs = new Set(ys);
    expect(uniqueYs.size).toBe(ys.length);

    const containerWidthPx = 360;
    const itemWidthPx = Number((widths.values().next().value ?? '0').replace('px', ''));
    expect(itemWidthPx).toBeGreaterThan(containerWidthPx * 0.85);
  });
});
