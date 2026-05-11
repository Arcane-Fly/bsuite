import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_DATE_FORMAT,
  dateFormatToLocale,
  type DateFormatPreference,
  type SupportedLocale,
} from './formatDate';

/**
 * Shape returned by {@link useLocale}.
 *
 * - `locale` — BCP-47 tag, ready to pass to `formatDate(..., locale)`.
 * - `dateFormat` — short on-disk preference (`'au'` | `'us'`).
 * - `setDateFormat` — updates the in-memory state and, if the provider
 *   was given an `onSetDateFormat` callback, persists it. Returns the
 *   callback's promise (or a resolved one) so callers can `await` the
 *   save and show toast feedback.
 */
export interface LocaleContextValue {
  locale: SupportedLocale;
  dateFormat: DateFormatPreference;
  setDateFormat: (next: DateFormatPreference) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  /**
   * Initial preference to seed the provider with. Callers typically hydrate
   * this from `user_preferences.date_format` (BSU Supabase) or fall back to
   * the locale default.
   */
  initialDateFormat?: DateFormatPreference;
  /**
   * Optional persistence hook. Called after the in-memory state is updated;
   * if it throws, the in-memory change is rolled back so the UI doesn't lie
   * about a save that failed.
   *
   * Decoupled from Supabase by design — the consumer wires this to whichever
   * data layer they use (Supabase upsert, server action, etc.).
   */
  onSetDateFormat?: (next: DateFormatPreference) => Promise<void> | void;
  children: ReactNode;
}

/**
 * React context provider for BSuite's per-user date-format preference.
 *
 * Wrap the app root (after `<AuthProvider>`) and pass the hydrated
 * preference + a persistence callback. Children can call {@link useLocale}
 * to read the current locale or update it.
 *
 * Decoupled from Supabase intentionally — keeps `@bsuite/dates` free of
 * runtime peer deps beyond React, which is enough for unit tests that only
 * need to exercise the formatters and the context behaviour.
 */
export function LocaleProvider({
  initialDateFormat = DEFAULT_DATE_FORMAT,
  onSetDateFormat,
  children,
}: LocaleProviderProps) {
  const [dateFormat, setDateFormatState] =
    useState<DateFormatPreference>(initialDateFormat);

  const setDateFormat = useCallback(
    async (next: DateFormatPreference) => {
      const prev = dateFormat;
      setDateFormatState(next);
      if (!onSetDateFormat) return;
      try {
        await onSetDateFormat(next);
      } catch (err) {
        // Roll back so the displayed preference matches reality.
        setDateFormatState(prev);
        throw err;
      }
    },
    [dateFormat, onSetDateFormat],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: dateFormatToLocale(dateFormat),
      dateFormat,
      setDateFormat,
    }),
    [dateFormat, setDateFormat],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Read the current locale + setter. Falls back to defaults
 * (`en-AU` / `'au'`) when called outside a {@link LocaleProvider}, so
 * components remain renderable in isolation (Storybook, tests, etc.).
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: dateFormatToLocale(DEFAULT_DATE_FORMAT),
    dateFormat: DEFAULT_DATE_FORMAT,
    setDateFormat: async () => {
      // No-op outside a provider. Intentional — avoids forcing every test
      // to wrap children in a provider just to render.
    },
  };
}
