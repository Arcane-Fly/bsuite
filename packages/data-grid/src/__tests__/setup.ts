import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no ResizeObserver — @tanstack/react-virtual registers one on
 * the scroll container and (optionally) on measured items. A no-op stub is
 * enough for tests that don't assert on dynamically-measured sizes; the
 * virtualizer falls back to its `estimateSize` for every item, which is
 * exactly what the smoke test exercises.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}
