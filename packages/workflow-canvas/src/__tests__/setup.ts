import '@testing-library/jest-dom/vitest';

// crypto.randomUUID polyfill for jsdom versions that don't ship it.
if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
  (globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto = {
    randomUUID: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  };
}
