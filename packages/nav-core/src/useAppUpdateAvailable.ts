'use client'
/**
 * useAppUpdateAvailable — "the tab you are looking at is not the build that is
 * deployed".
 *
 * OPERATOR DIRECTIVE 2026-09-03 10:48 (tier 1): "note there are people using the
 * app in production i.e. actual clients so stage all work to development branch
 * and then ensure their is a platform notice and refresh to update prompt so
 * they dont lose work on rebuilds."
 *
 * WHAT IT COMPARES
 * ----------------
 * The commit baked into the RUNNING bundle (`__BUILD_COMMIT__`, see
 * ./buildInfo.ts) against the commit served at `/version.json` (emitted by the
 * same build — see ./vite.ts). ANY difference is `versionChanged` (R2).
 * Deliberately not "a newer version": Vercel's Instant Rollback moves the
 * deployed commit BACKWARDS, and a tab running the rolled-back-from build is
 * just as wrong as one running a stale build. Neither this file nor the banner
 * copy describes the deployed build as newer — the test suite greps for it.
 *
 * WHY IT NEVER RELOADS
 * --------------------
 * Reloading a client's tab discards whatever they had typed. Four code paths in
 * this estate did exactly that without asking (BSU ErrorBoundary:59, crm7
 * App.tsx:1146-1151 and :1155, throughput ErrorBoundary:73). This hook raises a
 * notice; the human presses Refresh. `useUnsavedChanges()` is the second half of
 * that contract.
 *
 * WHY A BROKEN CHECK IS LOUD
 * --------------------------
 * A missing `/version.json` does not 404 on any app in this estate. Five Vite
 * apps answer the SPA catch-all rewrite with `200 text/html` (the index page)
 * and conduit answers `307` to login. `res.json()` on an HTML body throws, and a
 * `catch {}` around it would leave every app permanently, silently un-notified —
 * the exact failure the notice exists to prevent, wearing a green tick. So the
 * content-type is asserted BEFORE parsing, a mismatch logs once and sets
 * `updateCheckBroken`, and polling continues.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { VERSION_JSON_PATH, isSameCommit, normaliseCommit, readInjectedBuildCommit } from './buildInfo.js'

/** Why the check cannot answer. `null` means it can. */
export type UpdateCheckBroken =
  /** No `__BUILD_COMMIT__` in this bundle — no baseline, so nothing to compare. */
  | 'no-build-commit'
  /** The response was not 200. */
  | 'bad-status'
  /** 200, but not `application/json` — almost always the SPA catch-all rewrite. */
  | 'not-json'
  /** JSON, but no usable `commit` field. */
  | 'malformed'
  /** The request never completed (offline, DNS, CORS, aborted mid-flight). */
  | 'unreachable'

/**
 * The kill switch and severity dial, read by the app from its existing
 * system-notice source (slug `update-notice`) and passed straight through.
 * Nothing here needs a deploy to change.
 */
export interface AppUpdateControl {
  /** `false` hides the notice entirely and stops the polling. */
  enabled?: boolean
  /** `critical` cannot be dismissed and re-shows on every poll. */
  severity?: 'info' | 'warning' | 'critical'
}

export interface UseAppUpdateAvailableOptions {
  /** Where the deployed commit is served. Defaults to `/version.json`. */
  url?: string
  /** Poll period in ms. Defaults to 10 minutes. */
  intervalMs?: number
  /** Kill switch / severity from the app's system-notice source. */
  control?: AppUpdateControl
  /**
   * Immediate triggers the app already has — `vite:preloadError`, a chunk-load
   * error caught by an error boundary. Called ONCE on mount with a `raise`
   * function; return a cleanup.
   *
   * Captured on mount deliberately: apps write this inline, and depending on it
   * would re-subscribe on every render. Changing it later does not re-subscribe.
   */
  onSignal?: (raise: (reason?: string) => void) => (() => void) | void
  /**
   * Override the running commit instead of reading `__BUILD_COMMIT__`.
   *
   * The belt-and-braces adoption form is `runningCommit: __BUILD_COMMIT__` from
   * the APP's own source, where the bundler's `define` substitution is
   * unconditional. Reading it inside this package works in a production build
   * (Vite applies `define` at the bundler level, so node_modules is covered) and
   * is `undefined` in a dev server, which is the documented no-op case.
   */
  runningCommit?: string
  /** Storage for the dismissal. Defaults to `sessionStorage`. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export interface AppUpdateState {
  /** The deployed commit differs from the running one. */
  versionChanged: boolean
  /** Something already failed to load — this tab may be actively broken. */
  escalated: boolean
  /** The commit `/version.json` last reported, or `null`. */
  latestCommit: string | null
  /** The commit this bundle was built from, or `null`. */
  runningCommit: string | null
  /** Why the check cannot answer, or `null`. */
  updateCheckBroken: UpdateCheckBroken | null
  /** Hide the notice for THIS detected commit, for this tab session. */
  dismiss: () => void
  /** Whether it is currently dismissed. Always `false` when `critical`. */
  dismissed: boolean
}

/** Ten minutes. A stale tab is a slow problem; a chatty poll is a fast one. */
export const DEFAULT_UPDATE_POLL_MS = 10 * 60 * 1000

const DISMISS_PREFIX = 'bsuite:update-dismissed:'

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    // Safari private mode and some embedded webviews throw on ACCESS, not on use.
    return null
  }
}

function readDismissed(
  store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  commit: string,
): boolean {
  if (!store) return false
  try {
    return store.getItem(DISMISS_PREFIX + commit) === '1'
  } catch {
    return false
  }
}

/**
 * The update check. Returns state only — it renders nothing and never reloads.
 *
 * Written to the React Compiler's rules (react-hooks v7 `refs` and
 * `set-state-in-effect`), which every app in this estate lints with: no ref is
 * written during render, no state is set synchronously in an effect body, and
 * anything derivable is derived rather than mirrored into state.
 *
 * @example
 * const update = useAppUpdateAvailable({ control: updateNotice })
 * if (update.versionChanged) { … }
 */
export function useAppUpdateAvailable(options: UseAppUpdateAvailableOptions = {}): AppUpdateState {
  const {
    url = VERSION_JSON_PATH,
    intervalMs = DEFAULT_UPDATE_POLL_MS,
    control,
    onSignal,
    runningCommit: runningCommitOption,
    storage,
  } = options

  const enabled = control?.enabled !== false
  const isCritical = control?.severity === 'critical'

  // The storage is reached through a ref (written in an effect, never during
  // render) so that an app passing an inline `storage` object — a new identity
  // every render — cannot restart the poll on every render. Only the fetch
  // callback and the two event handlers read it.
  const storeRef = useRef<Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null>(null)
  useEffect(() => {
    storeRef.current = storage ?? defaultStorage()
  }, [storage])

  // Resolved once: the running bundle cannot change under a live tab, and
  // re-reading it would only add a dependency that never varies.
  const [runningCommit] = useState<string | null>(
    () => normaliseCommit(runningCommitOption) ?? readInjectedBuildCommit() ?? null,
  )

  const [latestCommit, setLatestCommit] = useState<string | null>(null)
  const [versionChanged, setVersionChanged] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [pollFault, setPollFault] = useState<UpdateCheckBroken | null>(null)
  /**
   * The commit a dismissal was recorded for, or `null`. Explicit state rather
   * than a read of sessionStorage in render: storage is not reactive, and a
   * memo that re-reads it needs a fake dependency to recompute, which the
   * exhaustive-deps rule rightly rejects.
   */
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)

  // Adjusting state during render (the React-documented pattern) rather than
  // in an effect: flipping the kill switch clears everything the previous
  // enabled period learned, so switching it back on cannot flash a stale
  // notice before the first fresh poll answers.
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    setVersionChanged(false)
    setEscalated(false)
    setPollFault(null)
    setDismissedFor(null)
  }

  // One console.error per distinct fault, not one per poll. A check that fails
  // every ten minutes for an hour should say so once, or the console becomes
  // noise and the message stops being read.
  const loggedRef = useRef<Set<string>>(new Set())
  const logOnce = useCallback((key: string, message: string) => {
    if (loggedRef.current.has(key)) return
    loggedRef.current.add(key)
    console.error(message)
  }, [])

  // Written only from the fetch callback and read only from event handlers —
  // never touched during render.
  const latestCommitRef = useRef<string | null>(null)

  const raise = useCallback(
    (reason?: string) => {
      setEscalated(true)
      // A dismissal said "I know, I will refresh later". A chunk failing AFTER
      // that changes the situation — it is not the same notice again — so the
      // dismissal for the current commit is cleared rather than respected.
      const commit = latestCommitRef.current
      const store = storeRef.current
      if (commit && store) {
        try {
          store.removeItem(DISMISS_PREFIX + commit)
        } catch { /* storage unavailable — the state below still re-shows it */ }
      }
      setDismissedFor(null)
      if (reason) {
        logOnce(
          'escalated:' + reason,
          `[bsuite] this tab failed to load part of the app (${reason}) — the update notice has escalated`,
        )
      }
    },
    [logOnce],
  )

  // Captured on mount, deliberately — see the `onSignal` docblock. `raise` is
  // stable (its only dependency is the stable `logOnce`), so the subscription
  // reaches it directly.
  const [subscribeOnce] = useState(() => onSignal)
  useEffect(() => {
    if (!subscribeOnce) return
    const cleanup = subscribeOnce((reason) => raise(reason))
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [subscribeOnce, raise])

  useEffect(() => {
    if (!enabled) return
    if (!runningCommit) {
      // Reported through the derived `updateCheckBroken` below; only the log
      // is a side effect.
      logOnce(
        'no-build-commit',
        '[bsuite] update check disabled: this bundle carries no __BUILD_COMMIT__. ' +
          'Add versionJsonPlugin() from @bsuite/nav-core/vite to the app’s vite config, ' +
          'or pass runningCommit to useAppUpdateAvailable().',
      )
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const check = async (): Promise<void> => {
      let res: Response
      try {
        res = await fetch(url, { cache: 'no-store', signal: controller.signal })
      } catch (err) {
        if (cancelled) return
        setPollFault('unreachable')
        logOnce('unreachable', `[bsuite] ${url} could not be fetched: ${String(err)}`)
        return
      }
      if (cancelled) return

      const contentType = res.headers.get('content-type') ?? ''
      // ASSERT BEFORE PARSING. Every app in this estate answers a missing
      // /version.json with 200 text/html (SPA rewrite) or a 307 to login.
      // `res.json()` on that throws a SyntaxError, and a bare catch would turn
      // "the notice is wired to nothing" into "everything is fine".
      if (!res.ok || !contentType.toLowerCase().startsWith('application/json')) {
        setPollFault(res.ok ? 'not-json' : 'bad-status')
        logOnce(
          'not-json',
          `[bsuite] ${url} is not served as JSON: status ${res.status} content-type ${contentType || '(none)'}`,
        )
        return
      }

      let body: unknown
      try {
        body = await res.json()
      } catch (err) {
        if (cancelled) return
        setPollFault('malformed')
        logOnce('malformed-parse', `[bsuite] ${url} returned application/json that did not parse: ${String(err)}`)
        return
      }
      if (cancelled) return

      const served = normaliseCommit((body as { commit?: unknown } | null)?.commit)
      if (!served) {
        setPollFault('malformed')
        logOnce('malformed', `[bsuite] ${url} carries no usable "commit" field`)
        return
      }

      setPollFault(null)
      latestCommitRef.current = served
      setLatestCommit(served)
      setVersionChanged(!isSameCommit(runningCommit, served))
      // A dismissal recorded for THIS commit (this tab session) still holds; a
      // different commit is a different notice and starts undismissed.
      setDismissedFor(readDismissed(storeRef.current, served) ? served : null)
    }

    void check()
    const timer = setInterval(() => { void check() }, intervalMs)

    // A backgrounded tab's interval is throttled to minutes by every browser, so
    // coming back to a tab is the moment the answer is most likely to be stale
    // and the moment the person is about to type into it.
    const onVisibility = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') void check()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [enabled, runningCommit, url, intervalMs, logOnce])

  const dismiss = useCallback(() => {
    if (isCritical) return
    const commit = latestCommitRef.current
    if (!commit) return
    const store = storeRef.current
    if (store) {
      try {
        store.setItem(DISMISS_PREFIX + commit, '1')
      } catch { /* storage unavailable — the state below still hides it in-memory */ }
    }
    setDismissedFor(commit)
  }, [isCritical])

  // Derived, not mirrored: `runningCommit` never changes, so "no baseline" is a
  // fact about this render, not an event to store.
  const updateCheckBroken: UpdateCheckBroken | null = !enabled
    ? null
    : !runningCommit
      ? 'no-build-commit'
      : pollFault

  const dismissed = !isCritical && latestCommit !== null && dismissedFor === latestCommit

  return {
    versionChanged: enabled && versionChanged,
    escalated: enabled && escalated,
    latestCommit,
    runningCommit,
    updateCheckBroken,
    dismiss,
    dismissed,
  }
}
