import '@testing-library/jest-dom'

// Polyfill ResizeObserver for components that depend on it (e.g. cmdk, used
// by EntitySelector's Command primitive) — jsdom doesn't implement it.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
