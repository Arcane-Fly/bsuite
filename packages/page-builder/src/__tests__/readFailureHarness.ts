import { useCallback, useEffect, useState } from 'react';
import type { PageGridPreferenceFactory, PageGridPreferenceStatus } from '../types.js';

/**
 * A remote-backed preference adapter with the read lifecycle every real one has
 * (bsuite#3277): the value starts at the fallback — a device with no local copy
 * — each key is read once, and a read can succeed, fail, or stay in flight until
 * the test releases it.
 *
 * `loadedOnSettle` models crm7 and business-suite-unified as they shipped:
 * `loaded` flips true when the read SETTLES, an error included. With it on, the
 * adapter still reports the new `status` beside `loaded`, which is exactly the
 * adapter a consumer produces by adding `status` and changing nothing else. The
 * package has to be safe against that adapter, so the tests drive it.
 */
export type ReadOutcome = 'ok' | 'fail' | 'hold';

export interface RemoteHarness {
  adapter: PageGridPreferenceFactory;
  /** What is stored — the server row, in effect. Seed it before rendering. */
  store: Map<string, unknown>;
  /** Every key a `setValue` call reached, in call order. */
  writes: string[];
  /** Every key whose `retry()` was called, in call order. */
  retries: string[];
  /** Every key whose `flush()` was called, in call order. */
  flushes: string[];
  /** Settle a read the script held (`'hold'`). `suffix` is e.g. `grid_version`. */
  release: (suffix: string, outcome: 'ok' | 'fail') => void;
}

export const keyHasSuffix = (key: string, suffix: string) => key.endsWith(`_${suffix}`);

export function createRemoteHarness({
  script,
  loadedOnSettle = false,
  retryable = true,
}: {
  script: (key: string, attempt: number) => ReadOutcome;
  loadedOnSettle?: boolean;
  retryable?: boolean;
}): RemoteHarness {
  const store = new Map<string, unknown>();
  const writes: string[] = [];
  const retries: string[] = [];
  const flushes: string[] = [];
  const held = new Map<string, (outcome: 'ok' | 'fail') => void>();

  const adapter: PageGridPreferenceFactory = function useRemotePreference<T>(key: string, fallback: T) {
    const [read, setRead] = useState<{ status: PageGridPreferenceStatus; value: T }>(() => ({
      status: 'loading',
      value: fallback,
    }));
    const [attempt, setAttempt] = useState(0);
    const [settledOnce, setSettledOnce] = useState(false);

    useEffect(() => {
      let live = true;
      const settle = (outcome: 'ok' | 'fail') => {
        if (!live) return;
        setSettledOnce(true);
        setRead((previous) =>
          outcome === 'ok'
            ? { status: 'loaded', value: store.has(key) ? (store.get(key) as T) : previous.value }
            : { status: 'failed', value: previous.value },
        );
      };
      const outcome = script(key, attempt);
      if (outcome === 'hold') {
        held.set(key, settle);
      } else {
        void Promise.resolve().then(() => settle(outcome));
      }
      return () => {
        live = false;
      };
    }, [key, attempt]);

    const setValue = useCallback(
      (next: T | ((previous: T) => T)) => {
        writes.push(key);
        setRead((previous) => {
          const value = typeof next === 'function' ? (next as (p: T) => T)(previous.value) : next;
          store.set(key, value);
          return { ...previous, value };
        });
      },
      [key],
    );

    const retry = useCallback(() => {
      retries.push(key);
      setRead((previous) => ({ ...previous, status: 'loading' }));
      setAttempt((count) => count + 1);
    }, [key]);

    const flush = useCallback(() => {
      flushes.push(key);
      return Promise.resolve();
    }, [key]);

    return {
      value: read.value,
      setValue,
      loaded: loadedOnSettle ? settledOnce : read.status === 'loaded',
      status: read.status,
      ...(retryable ? { retry } : {}),
      flush,
    };
  };

  const release = (suffix: string, outcome: 'ok' | 'fail') => {
    for (const [key, settle] of held) {
      if (keyHasSuffix(key, suffix)) {
        held.delete(key);
        settle(outcome);
      }
    }
  };

  return { adapter, store, writes, retries, flushes, release };
}
