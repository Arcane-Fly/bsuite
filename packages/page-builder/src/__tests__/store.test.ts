import { afterEach, describe, expect, it } from 'vitest';
import {
  getResolvedLayoutStyles,
  resetPageBuilderStore,
  usePageBuilderStore,
} from '../state/store.js';

describe('page builder store breakpoint style overrides', () => {
  afterEach(() => {
    resetPageBuilderStore();
  });

  it('writes non-desktop edits into tablet/mobile override maps and keeps desktop immutable', () => {
    usePageBuilderStore.getState().setLayoutStyles('layout-1', {
      desktop: { color: '#111111', marginTop: 8 },
    });
    usePageBuilderStore.getState().setCurrentBreakpoint('tablet');
    usePageBuilderStore.getState().updateStyleProperty('layout-1', 'marginTop', 12);
    usePageBuilderStore.getState().setCurrentBreakpoint('mobile');
    usePageBuilderStore.getState().updateStyleProperty('layout-1', 'color', '#222222');

    const styles = usePageBuilderStore.getState().layoutStyles['layout-1'];
    expect(styles.desktop).toEqual({ color: '#111111', marginTop: 8 });
    expect(styles.tablet).toEqual({ marginTop: 12 });
    expect(styles.mobile).toEqual({ color: '#222222' });
  });

  it('resetStyleProperty removes the override at the active breakpoint and falls back to parent', () => {
    usePageBuilderStore.getState().setLayoutStyles('layout-1', {
      desktop: { color: '#111111', marginTop: 8 },
      tablet: { marginTop: 12 },
      mobile: { color: '#222222' },
    });

    usePageBuilderStore.getState().setCurrentBreakpoint('mobile');
    expect(getResolvedLayoutStyles('layout-1', 'mobile').styles.color).toBe('#222222');

    usePageBuilderStore.getState().resetStyleProperty('layout-1', 'color');

    expect(usePageBuilderStore.getState().layoutStyles['layout-1'].mobile).toBeUndefined();
    expect(getResolvedLayoutStyles('layout-1', 'mobile').styles.color).toBe('#111111');
  });
});

