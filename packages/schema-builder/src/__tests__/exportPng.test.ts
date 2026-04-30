import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

import { toPng } from 'html-to-image';
import {
  defaultPngFilename,
  exportCanvasToPng,
} from '../utils/exportPng.js';

const mockedToPng = toPng as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.restoreAllMocks();
  mockedToPng.mockReset();
});

describe('defaultPngFilename', () => {
  it('produces a safe, colon-free filename ending in .png', () => {
    const name = defaultPngFilename();
    expect(name.endsWith('.png')).toBe(true);
    expect(name.includes(':')).toBe(false);
    expect(name.startsWith('schema-')).toBe(true);
  });
});

describe('exportCanvasToPng', () => {
  it('calls toPng with pixelRatio=2 + backgroundColor + filter', async () => {
    mockedToPng.mockResolvedValue('data:image/png;base64,abc');
    const el = document.createElement('div');
    await exportCanvasToPng(el, 'test.png');

    expect(mockedToPng).toHaveBeenCalledTimes(1);
    const [callEl, opts] = mockedToPng.mock.calls[0];
    expect(callEl).toBe(el);
    expect(opts.pixelRatio).toBe(2);
    expect(opts.backgroundColor).toBe('#ffffff');
    expect(opts.cacheBust).toBe(true);
    expect(typeof opts.filter).toBe('function');
  });

  it('filter excludes minimap, controls, and panel overlays', async () => {
    mockedToPng.mockResolvedValue('data:image/png;base64,abc');
    const el = document.createElement('div');
    await exportCanvasToPng(el);
    const { filter } = mockedToPng.mock.calls[0][1];

    const minimap = document.createElement('div');
    minimap.className = 'react-flow__minimap';
    const controls = document.createElement('div');
    controls.className = 'react-flow__controls';
    const panel = document.createElement('div');
    panel.className = 'react-flow__panel';
    const regular = document.createElement('div');
    regular.className = 'react-flow__node';

    expect(filter(minimap)).toBe(false);
    expect(filter(controls)).toBe(false);
    expect(filter(panel)).toBe(false);
    expect(filter(regular)).toBe(true);
  });

  it('triggers an anchor download with the provided filename', async () => {
    mockedToPng.mockResolvedValue('data:image/png;base64,abc');
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a');
    Object.defineProperty(anchor, 'click', { value: clickSpy });
    const createElSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return anchor;
        return originalCreateElement(tag);
      });

    const el = originalCreateElement('div');
    await exportCanvasToPng(el, 'schema-test.png');

    expect(anchor.href).toContain('data:image/png;base64,abc');
    expect(anchor.download).toBe('schema-test.png');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    createElSpy.mockRestore();
  });

  it('propagates toPng failures to the caller', async () => {
    mockedToPng.mockRejectedValue(new Error('snapshot failed'));
    const el = document.createElement('div');
    // NOTE: deliberately avoid `.rejects.toThrow('snapshot failed')` here.
    // Under vitest 2.1.9 + jsdom, Error `.message` is stripped across the async
    // rejection boundary and the string matcher blows up with
    // `TypeError: Cannot read properties of undefined (reading 'indexOf')`.
    // See packages/schema-builder/docs/testing-notes.md (vitest/jsdom gotcha).
    const caught = await exportCanvasToPng(el).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('snapshot failed');
  });
});
