/**
 * useSpeedInsightsRoute — the current pathname, normalised to a route.
 *
 * Pass the result to `<SpeedInsights route={…} />`. Without it the library
 * falls back to `window.location.pathname` and every record id becomes its own
 * row in the report — see speedInsightsRoute.ts for what that does to the
 * scores.
 *
 * WHY IT LISTENS TO HISTORY RATHER THAN A ROUTER
 *
 * `<SpeedInsights />` is mounted ABOVE the router in crm7 and R80.4, so a
 * router hook returns nothing there, and moving the mount would change
 * ordering on the app's most contended boundary for a telemetry change. This
 * subscribes to history itself, so it is correct at any mount position and
 * identical across wouter, react-router and no router at all.
 *
 * `pushState` and `replaceState` do not emit an event — that is a documented
 * gap in the History API, not an oversight here — so they are wrapped. The
 * wrappers are installed once per module and restored on the last unmount, and
 * they always call through, so a router that reads the return value is
 * unaffected.
 */
import { useEffect, useState } from 'react';

import { speedInsightsRoute } from './speedInsightsRoute.js';

type Listener = () => void;

const listeners = new Set<Listener>();
let patched = false;
let originalPush: typeof history.pushState | null = null;
let originalReplace: typeof history.replaceState | null = null;

function notify(): void {
  for (const l of listeners) l();
}

function patchHistory(): void {
  if (patched || typeof history === 'undefined') return;
  patched = true;
  originalPush = history.pushState;
  originalReplace = history.replaceState;
  history.pushState = function pushState(this: History, ...args) {
    const result = originalPush!.apply(this, args as Parameters<typeof history.pushState>);
    notify();
    return result;
  };
  history.replaceState = function replaceState(this: History, ...args) {
    const result = originalReplace!.apply(this, args as Parameters<typeof history.replaceState>);
    notify();
    return result;
  };
}

function unpatchHistory(): void {
  if (!patched) return;
  patched = false;
  if (originalPush) history.pushState = originalPush;
  if (originalReplace) history.replaceState = originalReplace;
  originalPush = null;
  originalReplace = null;
}

export function useSpeedInsightsRoute(): string {
  const [route, setRoute] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : speedInsightsRoute(window.location.pathname),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = (): void => {
      setRoute(speedInsightsRoute(window.location.pathname));
    };

    listeners.add(update);
    patchHistory();
    window.addEventListener('popstate', update);
    // A router may have navigated between the initial state and this effect.
    update();

    return () => {
      window.removeEventListener('popstate', update);
      listeners.delete(update);
      if (listeners.size === 0) unpatchHistory();
    };
  }, []);

  return route;
}
