import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
    // When not in edit mode (canEditPage=undefined → isEditing=false), the
    // resize handle is still rendered into the DOM by react-resizable BUT the
    // grid item carries `.react-resizable-hide` so the handle is hidden via
    // CSS (`.react-resizable-hide .react-resizable-handle { display: none }`).
    // The previous assertion `toBeNull()` was a side-effect of the v2 handle
    // bug fixed in 0.2.9 — our GridItem ignored react-resizable's injected
    // children, so the handle silently dropped. Now that we render
    // {injectedChildren} at the outer level, the handle IS in the DOM in both
    // edit and non-edit states; only the .react-resizable-hide class differs.
    expect(view.container.querySelector('.react-resizable-hide')).toBeTruthy();
    const handle = view.container.querySelector('.react-resizable-handle');
    expect(handle).toBeTruthy();
    expect(handle?.closest('.react-resizable-hide')).toBeTruthy();
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

    act(() => {
      window.dispatchEvent(new CustomEvent('page-grid-edit-open'));
    });

    const presetLabels = ['1', '2', '3', '4', '6', '12'];
    const chips = presetLabels
      .map((label) =>
        Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(
          (btn) => btn.textContent?.trim() === label && btn.getAttribute('aria-pressed') !== null,
        ),
      )
      .filter((b): b is HTMLButtonElement => Boolean(b));

    for (const chip of chips) {
      const inline = chip.getAttribute('style') ?? '';
      expect(inline.toLowerCase()).not.toMatch(/#2563eb|#f3f4f6|#6b7280|#e5e7eb/);
      expect(chip.className).toMatch(/data-\[active\]:bg-primary/);
      expect(chip.className).toMatch(/bg-muted/);
      expect(chip.className).toMatch(/text-muted-foreground/);
      expect(chip.className).toMatch(/border-border/);
    }

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

  it('Tab from Reset to Default wraps focus to Cancel (focus trap — ARIA APG SC 2.1.2)', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-tab-forward-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { cancel, confirm } = getDialogButtons(view);
    expect(confirm).not.toBeNull();
    expect(cancel).not.toBeNull();

    act(() => {
      confirm!.focus();
    });
    expect(document.activeElement).toBe(confirm);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(document.activeElement).toBe(cancel);
  });

  it('Shift+Tab from Cancel wraps focus to Reset to Default (focus trap — ARIA APG SC 2.1.2)', () => {
    const view = render(
      <PageGridLayout
        pageKey="reset-tab-backward-test"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditorAndClickReset(view);
    const { cancel, confirm } = getDialogButtons(view);
    expect(cancel).not.toBeNull();
    expect(confirm).not.toBeNull();

    // Initial focus is on Cancel (from the focus-on-open effect).
    expect(document.activeElement).toBe(cancel);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });

    expect(document.activeElement).toBe(confirm);
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

describe('PageGridLayout layers panel', () => {
  function openEditor() {
    act(() => {
      window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
    });
  }

  it('supports keyboard selection and inline rename from the layers tree', () => {
    const view = render(
      <PageGridLayout
        pageKey="layers-keyboard-rename"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditor();
    const tree = view.container.querySelector('[role="tree"]') as HTMLDivElement | null;
    expect(tree).not.toBeNull();

    act(() => {
      tree!.focus();
      fireEvent.keyDown(tree!, { key: 'F2' });
    });

    const renameInput = view.container.querySelector('input[aria-label="Rename alpha"]') as HTMLInputElement | null;
    expect(renameInput).not.toBeNull();
    act(() => {
      fireEvent.change(renameInput!, { target: { value: 'Revenue Card' } });
      fireEvent.keyDown(renameInput!, { key: 'Enter' });
    });

    expect(view.container.querySelector('input[aria-label="Rename alpha"]')).toBeNull();
    expect(screen.getByTitle('Revenue Card')).toBeTruthy();
  });

  it('toggles hidden state from layer controls and restores from Add widget', () => {
    const view = render(
      <PageGridLayout
        pageKey="layers-hide-toggle"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditor();
    const hideButton = view.container.querySelector('button[aria-label="Hide alpha"]') as HTMLButtonElement | null;
    expect(hideButton).not.toBeNull();
    act(() => {
      hideButton!.click();
    });
    expect(screen.queryByText('Alpha widget')).toBeNull();

    const addBackButton = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('alpha'),
    );
    expect(addBackButton).not.toBeUndefined();
    act(() => {
      addBackButton!.click();
    });
    expect(screen.getByText('Alpha widget')).toBeTruthy();
  });

  it('opens a context menu with required layer actions', () => {
    const view = render(
      <PageGridLayout
        pageKey="layers-context-menu"
        defaultLayouts={layouts}
        canEditPage
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    openEditor();
    const row = view.container.querySelector('[data-layer-row-id="alpha"]');
    expect(row).not.toBeNull();
    act(() => {
      fireEvent.contextMenu(row!);
    });

    const menu = view.container.querySelector('[role="menu"][aria-label="Layer actions"]');
    expect(menu).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Save as Symbol' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Wrap in Container' })).toBeTruthy();
  });

  it('virtualizes the layers list when more than 100 rows are present', () => {
    const manyLayouts: GridLayouts = {
      lg: Array.from({ length: 120 }, (_, index) => ({
        i: `widget-${index}`,
        x: 0,
        y: index,
        w: 12,
        h: 1,
      })),
    };
    const manyWidgets = Object.fromEntries(
      Array.from({ length: 120 }, (_, index) => [`widget-${index}`, <div key={index}>Widget {index}</div>]),
    );
    const view = render(
      <PageGridLayout
        pageKey="layers-virtualized"
        defaultLayouts={manyLayouts}
        canEditPage
        widgets={manyWidgets}
      />,
    );

    openEditor();
    const virtualizedContainer = view.container.querySelector('[data-virtualized="true"]');
    expect(virtualizedContainer).not.toBeNull();
  });
});
