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
    el.style.setProperty('--role-bg-panel', 'oklch(0.98 0.006 260)');
    await exportCanvasToPng(el, 'test.png');

    expect(mockedToPng).toHaveBeenCalledTimes(1);
    const [callEl, opts] = mockedToPng.mock.calls[0];
    expect(callEl).toBe(el);
    expect(opts.pixelRatio).toBe(2);
    // Read from the live element, not pinned.
    // It read `toBe('oklch(1 0 0)')` — theme-audit-ok: quoting the value this
    // assertion used to pin, so the reason survives — locking the pure-white
    // plate in as an invariant. The suite then went red on the change that
    // REMOVED it, which is the whole point of the note. A test
    // written from the same assumption as the code cannot detect that
    // assumption being wrong; it only defends it.
    expect(opts.backgroundColor).toBe('oklch(0.98 0.006 260)');
    expect(opts.cacheBust).toBe(true);
    expect(typeof opts.filter).toBe('function');
  });

  it('never falls back to an opaque plate when the token is absent', async () => {
    mockedToPng.mockResolvedValue('data:image/png;base64,abc');
    // No --role-bg-panel set: the export must go transparent rather than
    // guess. A wrong opaque plate is baked into the PNG and unrecoverable;
    // transparency is not. This is the case that would silently reintroduce
    // pure white if someone added a literal fallback.
    await exportCanvasToPng(document.createElement('div'), 'test.png');
    expect(mockedToPng.mock.calls[0][1].backgroundColor).toBeUndefined();
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
    await expect(exportCanvasToPng(el)).rejects.toThrow('snapshot failed');
  });
});
