import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from './index.js';

describe('downloadBlob', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    // jsdom doesn't provide these
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an anchor, clicks it, and cleans up', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    downloadBlob(blob, 'out.txt');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.download).toBe('out.txt');
    expect(anchor.href).toContain('mock-url');
    expect(anchor.rel).toBe('noopener');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(anchor);

    // revoke deferred
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('throws when document is not defined', () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error simulate non-DOM env
    delete globalThis.document;

    expect(() => downloadBlob(new Blob(['x']), 'x.txt')).toThrow(/requires a DOM/);

    globalThis.document = originalDocument;
  });
});
