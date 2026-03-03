import { describe, it, expect } from 'vitest';

describe('Vitest infrastructure', () => {
  it('runs tests in jsdom environment', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('supports path aliases', async () => {
    // Verify @/ alias resolves (will fail if vitest config is wrong)
    const utils = await import('@/lib/utils');
    expect(utils).toBeDefined();
    expect(typeof utils.cn).toBe('function');
  });

  it('has localStorage mock available', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
    localStorage.clear();
    expect(localStorage.getItem('test-key')).toBeNull();
  });
});
