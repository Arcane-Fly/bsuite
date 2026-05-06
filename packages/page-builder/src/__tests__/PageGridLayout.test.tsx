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
