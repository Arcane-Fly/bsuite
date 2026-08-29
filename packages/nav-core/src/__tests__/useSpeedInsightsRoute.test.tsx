import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';

import { useSpeedInsightsRoute } from '../useSpeedInsightsRoute.js';

function Probe({ onRoute }: { onRoute: (r: string) => void }) {
  const route = useSpeedInsightsRoute();
  onRoute(route);
  return <span data-testid="route">{route}</span>;
}

describe('useSpeedInsightsRoute', () => {
  it('normalises the route at mount', () => {
    window.history.replaceState({}, '', '/apprentices/9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f');
    const { getByTestId } = render(<Probe onRoute={() => {}} />);
    expect(getByTestId('route').textContent).toBe('/apprentices/:uuid');
  });

  it('updates on pushState, which emits no event of its own', () => {
    window.history.replaceState({}, '', '/leads');
    const { getByTestId } = render(<Probe onRoute={() => {}} />);
    expect(getByTestId('route').textContent).toBe('/leads');
    act(() => {
      window.history.pushState({}, '', '/invoices/40912');
    });
    expect(getByTestId('route').textContent).toBe('/invoices/:id');
  });

  it('updates on popstate', () => {
    window.history.replaceState({}, '', '/settings');
    const { getByTestId } = render(<Probe onRoute={() => {}} />);
    act(() => {
      window.history.replaceState({}, '', '/reports/2026-08-29');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(getByTestId('route').textContent).toBe('/reports/:date');
  });

  it('restores the original history methods when the last consumer unmounts', () => {
    const before = window.history.pushState;
    const first = render(<Probe onRoute={() => {}} />);
    const second = render(<Probe onRoute={() => {}} />);
    expect(window.history.pushState).not.toBe(before);
    first.unmount();
    // still patched — one consumer remains
    expect(window.history.pushState).not.toBe(before);
    second.unmount();
    expect(window.history.pushState).toBe(before);
  });

  it('always calls through, so a router reading the return value is unaffected', () => {
    window.history.replaceState({}, '', '/a');
    const { unmount } = render(<Probe onRoute={() => {}} />);
    act(() => {
      window.history.pushState({}, '', '/b');
    });
    expect(window.location.pathname).toBe('/b');
    unmount();
  });
});
