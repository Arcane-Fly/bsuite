import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './utils.js'

/**
 * DataUnavailable — the honest state.
 *
 * WHY THIS EXISTS
 * ---------------
 * Five live surfaces across crm7 and business-suite-unified shared one idiom:
 *
 *     const rows = query.data ?? HARDCODED_FALLBACK
 *
 * That line turns every failure into a confident-looking answer. The worst
 * instance rendered a fabricated 95% compliance score — including "Fair Work
 * Compliance — Award rates verified" — when the underlying query was denied by
 * RLS. An authorization failure was presented to the user as a compliance
 * assurance. Another exported invented dollar figures to a file that then looks
 * authoritative to whoever opens it.
 *
 * The operator's standing rule is: never display mock data in the UI,
 * especially for financial or account-related information.
 *
 * THE CONTRACT
 * ------------
 * This component renders the ABSENCE of data. It therefore:
 *
 *   1. Takes no numeric prop and renders no number of its own. There is
 *      nothing here that can be misread as a measurement.
 *   2. Never uses the success tone. A failure is never green.
 *   3. Separates "nothing exists" from "we could not find out", and separates
 *      "you may not see this" from "this broke". Collapsing those is precisely
 *      the defect it replaces.
 *   4. Surfaces the real reason verbatim, in a monospace diagnostic block, so
 *      the reader can tell a permission denial from a network fault.
 *   5. Carries `data-slot="data-unavailable"` and `data-state`, so tests and
 *      lints can assert that a surface degraded honestly.
 *
 * Pair it with `resolveDataState` so the call site never re-derives the
 * branching, and the `??` idiom has nowhere to come back.
 */

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export type DataUnavailableState =
  /** The query is in flight. Nothing is known yet. */
  | 'loading'
  /** The query succeeded and the answer is genuinely "none". */
  | 'empty'
  /** The query failed. We do not know the answer. */
  | 'error'
  /** The query was refused. The data may exist; this caller may not see it. */
  | 'forbidden'
  /** No queryable source is reachable from this surface at all. */
  | 'unavailable'

type Tone = 'neutral' | 'info' | 'warning' | 'destructive'

interface StatePreset {
  tone: Tone
  /** Default heading — every site should override with a specific noun. */
  title: string
  description: string
  icon: 'spinner' | 'empty' | 'alert' | 'lock' | 'unplugged'
  live: 'polite' | 'assertive'
  role: 'status' | 'alert'
}

const PRESETS: Record<DataUnavailableState, StatePreset> = {
  loading: {
    tone: 'info',
    title: 'Loading…',
    description: 'Fetching the current figures.',
    icon: 'spinner',
    live: 'polite',
    role: 'status',
  },
  empty: {
    tone: 'neutral',
    title: 'Nothing recorded yet',
    description: 'This is a real answer, not a failure — no records exist for the current selection.',
    icon: 'empty',
    live: 'polite',
    role: 'status',
  },
  error: {
    tone: 'destructive',
    title: 'Could not load this',
    description: 'The request failed, so nothing is shown. This is not an empty result — the real value is unknown.',
    icon: 'alert',
    live: 'assertive',
    role: 'alert',
  },
  forbidden: {
    tone: 'warning',
    title: 'You do not have access to this',
    description: 'The request was refused. Data may exist that this account is not permitted to read, so nothing is shown.',
    icon: 'lock',
    live: 'assertive',
    role: 'alert',
  },
  unavailable: {
    tone: 'warning',
    title: 'Not readable from here',
    description: 'No queryable source for this information is reachable from this surface, so nothing is shown.',
    icon: 'unplugged',
    live: 'polite',
    role: 'status',
  },
}

// Role-bound only. `success` is deliberately absent: an honest state is never green.
const TONE_SURFACE: Record<Tone, string> = {
  neutral: 'border-border bg-muted/30 text-muted-foreground',
  info: 'border-primary/30 bg-primary/5 text-primary',
  warning: 'border-status-warning/40 bg-status-warning/5 text-status-warning',
  destructive: 'border-destructive/40 bg-destructive/5 text-destructive',
}

// ---------------------------------------------------------------------------
// Icons — inline SVG, `currentColor` only, so they inherit the tone token.
// (The package has no icon dependency; `loading-spinner.tsx` sets this
// precedent. Adding lucide-react here would push it onto every consumer.)
// ---------------------------------------------------------------------------

function StateIcon({ icon }: { icon: StatePreset['icon'] }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-6 w-6',
    'aria-hidden': true,
  }

  switch (icon) {
    case 'spinner':
      return (
        <svg {...common} className={cn(common.className, 'animate-spin')}>
          <circle cx="12" cy="12" r="9" className="opacity-25" />
          <path d="M21 12a9 9 0 0 0-9-9" className="opacity-90" />
        </svg>
      )
    case 'empty':
      // An empty tray — "we looked, there was nothing".
      return (
        <svg {...common}>
          <path d="M3 14h4l1.5 3h7L17 14h4" />
          <path d="M5 14 7 5h10l2 9v5H5z" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 3.5 2.5 20h19L12 3.5z" />
          <path d="M12 10v4" />
          <path d="M12 17.5h.01" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v2" />
        </svg>
      )
    case 'unplugged':
      return (
        <svg {...common}>
          <path d="M7 3v5" />
          <path d="M13 3v5" />
          <path d="M4 8h12v3a6 6 0 0 1-6 6v4" />
          <path d="m3 3 18 18" />
        </svg>
      )
  }
}

/**
 * Diagonal hatch. This is the load-bearing visual: hatched ground is not a
 * texture any populated surface in the estate uses, so "this panel is not
 * data" is legible before a single word is read. `currentColor` keeps it on
 * the tone token in both themes.
 */
function Hatch() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="bs-du-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bs-du-hatch)" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DataUnavailableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  state: DataUnavailableState
  /**
   * What could not be shown, as a specific noun — "Budgets", "Compliance
   * checks", "OAuth clients". Overrides the generic preset heading.
   */
  title?: ReactNode
  description?: ReactNode
  /**
   * The real, verbatim failure reason — an error message, a Postgres code.
   * Rendered as monospace diagnostics, never as prose. Pass the actual thing;
   * a sanitised reason is how "unknown" becomes "fine" again.
   */
  reason?: ReactNode
  /** Retry handler. Omit when retrying cannot help (`forbidden`). */
  onRetry?: () => void
  retryLabel?: string
  /** Escape hatch for a site-specific action (e.g. "Request access"). */
  action?: ReactNode
  /** `compact` suits an inline card slot; `block` a full page region. */
  size?: 'compact' | 'block'
}

export function DataUnavailable({
  state,
  title,
  description,
  reason,
  onRetry,
  retryLabel = 'Try again',
  action,
  size = 'block',
  className,
  ...props
}: DataUnavailableProps) {
  const preset = PRESETS[state]
  const showRetry = Boolean(onRetry) && state !== 'forbidden'

  return (
    <div
      data-slot="data-unavailable"
      data-state={state}
      role={preset.role}
      aria-live={preset.live}
      aria-busy={state === 'loading' || undefined}
      className={cn(
        // Dashed + hatched: deliberately unlike every populated surface.
        'relative isolate flex flex-col items-center justify-center overflow-hidden',
        'rounded-lg border border-dashed text-center',
        size === 'compact' ? 'min-h-32 gap-2 p-4' : 'min-h-48 gap-3 p-8',
        TONE_SURFACE[preset.tone],
        className,
      )}
      {...props}
    >
      <Hatch />

      <div className="relative flex flex-col items-center gap-3">
        <StateIcon icon={preset.icon} />

        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{title ?? preset.title}</p>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {description ?? preset.description}
          </p>
        </div>

        {reason ? (
          <div className="mx-auto w-full max-w-prose">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card/80 px-3 py-2 text-left font-mono text-xs text-muted-foreground">
              {reason}
            </pre>
          </div>
        ) : null}

        {showRetry || action ? (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {showRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  'inline-flex items-center rounded-md border border-border-interactive bg-card px-3 py-1.5',
                  'text-sm font-medium text-foreground',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {retryLabel}
              </button>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// resolveDataState — the idiom replacement
// ---------------------------------------------------------------------------

/**
 * Structural subset of a TanStack Query result. Declared structurally on
 * purpose: `@bsuite/ui` must not take a dependency on the data layer, and this
 * shape is equally satisfiable by a hand-rolled hook.
 */
export interface QueryLike<T> {
  data: T | undefined
  isPending?: boolean
  isLoading?: boolean
  isError?: boolean
  error?: unknown
}

/**
 * Postgres/PostgREST codes that mean "refused", not "broken".
 *
 * 42501 insufficient_privilege · PGRST301 JWT problem ·
 * PGRST116 no rows returned where one was required under RLS.
 */
const FORBIDDEN_MARKERS = ['42501', 'PGRST301', 'PGRST116', 'permission denied', 'row-level security']

function looksForbidden(error: unknown): boolean {
  if (!error) return false
  const parts: string[] = []
  if (typeof error === 'string') parts.push(error)
  else if (typeof error === 'object') {
    const e = error as { message?: unknown; code?: unknown; status?: unknown }
    if (typeof e.message === 'string') parts.push(e.message)
    if (typeof e.code === 'string') parts.push(e.code)
    if (e.status === 401 || e.status === 403) return true
  }
  const haystack = parts.join(' ').toLowerCase()
  return FORBIDDEN_MARKERS.some((m) => haystack.includes(m.toLowerCase()))
}

/** Human-readable reason string for the `reason` prop. */
export function describeError(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object') {
    const e = error as { message?: unknown; code?: unknown }
    const code = typeof e.code === 'string' ? `[${e.code}] ` : ''
    if (typeof e.message === 'string') return `${code}${e.message}`
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Map a query result to either `'ready'` (render the real data) or the honest
 * state to render instead.
 *
 * The point is that there is no fourth answer. A call site cannot get a
 * fallback out of this function, which is what makes the class fix stick.
 *
 * @param isEmpty how to decide the data is genuinely empty. Defaults to
 *   "an array with no elements". Pass explicitly for object-shaped payloads.
 */
export function resolveDataState<T>(
  query: QueryLike<T>,
  isEmpty: (data: T) => boolean = (d) => Array.isArray(d) && d.length === 0,
): DataUnavailableState | 'ready' {
  if (query.isError) return looksForbidden(query.error) ? 'forbidden' : 'error'
  if (query.isPending ?? query.isLoading ?? false) return 'loading'
  if (query.data === undefined || query.data === null) return 'error'
  return isEmpty(query.data) ? 'empty' : 'ready'
}
