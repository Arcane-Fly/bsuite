import { useCallback, useState } from 'react';
import type { PageGridPreferenceAdapter, PageGridPreferenceFactory } from './types.js';

const STORAGE_PREFIX = 'bsuite-page-builder:';

function readLocal<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be disabled or full; layout still works for the session.
  }
}

export function useLocalPreference<T>(key: string, fallback: T): PageGridPreferenceAdapter<T> {
  const [value, setStateValue] = useState<T>(() => readLocal(key, fallback));
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      setStateValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
        writeLocal(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return { value, setValue, loaded: true };
}

export const defaultPreferenceAdapter: PageGridPreferenceFactory = useLocalPreference;
