/**
 * BrandingProvider — runtime enterprise white-labelling
 * Version 0.4.2
 *
 * On mount:
 *  1. Calls supabase.rpc('branding_json_for_tenant') using the user's authed session.
 *  2. Validates each colour value is a well-formed oklch() string.
 *  3. Applies each key as a CSS custom property on document.documentElement.
 *  4. Caches the result in localStorage under BRANDING_STORAGE_KEY for FOUC prevention.
 *  5. Subscribes to tenant row changes via Supabase Realtime so branding updates
 *     propagate without a page reload (within ~1 second).
 *
 * Security / brand policies:
 *  - Only oklch() values are accepted for colour fields — hex/rgb/hsl are rejected.
 *  - --role-error and --role-destructive are NOT overridable by tenants.
 *    Colourblind policy (purple error) is a system-level requirement, not a brand pref.
 *  - brand="braden" short-circuits all Supabase calls — Braden corporate site uses
 *    static CSS tokens, not runtime tenant overrides.
 *  - SEC-002 / SEC-003 (added 0.4.1) — tenant-controlled URL fields
 *    (`logo_url`, `logo_light_url`, `logo_dark_url`, `mark_url`,
 *    `favicon_url`) and `font_stack` are routed through `branding-sanitize`
 *    at the DOM-apply sink. Dangerous schemes (`javascript:`, `data:`,
 *    `vbscript:`, `blob:`, `file:`) are rejected; the URL is parsed and
 *    re-serialised so breakout chars are percent-encoded; the `url()`
 *    token is emitted in the safe quoted form with `"` and `\` escaped;
 *    font values carrying CSS-breakout tokens (`< > ( ) { } ; @ \ /* *\/`)
 *    are rejected and the var is cleared so the default font applies.
 *  - 0.4.2 — `font_stack` now goes through `sanitizeFontFamilyForCss`, not
 *    `sanitizeFontFamily`: a syntactically legitimate bare family name (no
 *    injection attempt) with no matching `@font-face` used to reach
 *    `--font-stack` with nothing to fall back to. Confirmed live on a
 *    consumer app: an inline `--font-body: Geist` (a sibling write, same
 *    class) beat this package's own correctly-chained `vars.css` default
 *    and rendered the page in the browser's serif default. The fix
 *    validates + resolves a known alias to the face this package actually
 *    ships (`Geist` → `"Geist Variable"`, `Geist Mono` → `"Geist Mono
 *    Variable"`) + appends a `system-ui, sans-serif` fallback, so any
 *    family with no shipped face degrades to system sans, never to serif.
 *
 * Environment flags:
 *  - VITE_ENABLE_BRANDING_OVERRIDE (default: 'true') — set 'false' as kill switch.
 *
 * Usage:
 *    <ThemeProvider>
 *      <BrandingProvider supabaseClient={supabase}>
 *        {children}
 *      </BrandingProvider>
 *    </ThemeProvider>
 *
 *   For Braden corporate (skips all RPC/Realtime):
 *    <BrandingProvider brand="braden" supabaseClient={supabase}>
 *      {children}
 *    </BrandingProvider>
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    sanitizeBrandingUrl,
    sanitizeFontFamilyForCss,
    toCssUrl,
} from './branding-sanitize.js'

export const BRANDING_STORAGE_KEY = 'bsuite_tenant_branding'
export const BRANDING_OVERRIDE_FLAG = 'VITE_ENABLE_BRANDING_OVERRIDE'

/** Shape returned by the branding_json_for_tenant RPC */
export interface TenantBranding {
  /** Primary action colour — MUST be an oklch() string */
  primary?: string
  /** Accent / secondary colour — MUST be an oklch() string */
  accent?: string
  /** Full logo URL (SVG or raster) */
  logo_url?: string
  /** Light-mode full logo URL */
  logo_light_url?: string
  /** Dark-mode full logo URL */
  logo_dark_url?: string
  /** Mark / icon logo URL */
  mark_url?: string
  /** Favicon URL */
  favicon_url?: string
  /** Display name used for generated logo alt text */
  company_name?: string
  /** Optional CSS font-family stack string */
  font_stack?: string | null
}

export interface BrandingContextValue {
  branding: TenantBranding | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export const BrandingContext = createContext<BrandingContextValue | undefined>(undefined)

export type BrandContext = 'bsuite' | 'braden'

export interface BrandingProviderProps {
  children: ReactNode
  /** Authenticated Supabase client from the consuming app */
  supabaseClient: SupabaseClient
  /**
   * Brand context. 'braden' short-circuits all Supabase RPC/Realtime calls —
   * the Braden corporate site uses static CSS tokens only, not runtime overrides.
   * Default: 'bsuite'
   */
  brand?: BrandContext
  /**
   * If true, apply persisted branding immediately on mount (before RPC resolves)
   * to prevent FOUC. Default: true. Ignored when brand='braden'.
   */
  applyPersistedOnMount?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// OKLCH validation
// Accepts: oklch(L C H) or oklch(L C H / A)
// where each component is a number or percentage.
// Rejects: hex, rgb(), hsl(), and any non-oklch value.
// ─────────────────────────────────────────────────────────────────────────────
const OKLCH_RE = /^oklch\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?\s*\)$/i

function isValidOklch(value: string): boolean {
  return OKLCH_RE.test(value.trim())
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERRIDABLE KEYS
// --role-error and --role-destructive are EXCLUDED — colourblind policy.
// Tenants cannot change the error signifier to red.
// ─────────────────────────────────────────────────────────────────────────────
const OVERRIDABLE_ROLE_KEYS = new Set<string>([
  '--primary',
  '--accent',
  '--accent-primary',
  '--app-primary',
  '--app-accent',
  '--accent-secondary',
  '--ring',
  '--logo-url',
  '--mark-url',
  '--font-stack',
])

const BRANDING_CSS_MAP: Record<keyof TenantBranding, string> = {
  primary: '--primary',
  accent: '--accent',
  logo_url: '--logo-url',
  logo_light_url: '--logo-light-url',
  logo_dark_url: '--logo-dark-url',
  mark_url: '--mark-url',
  favicon_url: '--favicon-url',
  company_name: '',
  font_stack: '--font-stack',
}

function applyBrandingToRoot(branding: TenantBranding | null): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (!branding) {
    Object.values(BRANDING_CSS_MAP).forEach((cssVar) => {
      if (cssVar) root.style.removeProperty(cssVar)
    })
    root.style.removeProperty('--accent-primary')
    root.style.removeProperty('--app-primary')
    root.style.removeProperty('--app-accent')
    root.style.removeProperty('--accent-secondary')
    root.removeAttribute('data-branding-loaded')
    return
  }

  if (branding.primary) {
    if (!isValidOklch(branding.primary)) {
      if (isDevEnvironment()) {
        console.warn(
          `[BrandingProvider] Rejected primary colour "${branding.primary}" — must be oklch(). ` +
            'Only oklch() values are accepted. Hex/rgb/hsl are not permitted in the token system.',
        )
      }
    } else {
      root.style.setProperty('--primary', branding.primary)
      root.style.setProperty('--accent-primary', branding.primary)
      root.style.setProperty('--app-primary', branding.primary)
      root.style.setProperty('--ring', branding.primary)
    }
  }

  if (branding.accent) {
    if (!isValidOklch(branding.accent)) {
      if (isDevEnvironment()) {
        console.warn(
          `[BrandingProvider] Rejected accent colour "${branding.accent}" — must be oklch().`,
        )
      }
    } else {
      root.style.setProperty('--accent', branding.accent)
      root.style.setProperty('--accent-secondary', branding.accent)
      root.style.setProperty('--app-accent', branding.accent)
    }
  }

  // Tenant-controlled URL and font values pass through `branding-sanitize`
  // (SEC-002 / SEC-003) so a crafted row cannot break out of the `url(...)`
  // token or the font declaration and inject arbitrary CSS. Each setter is
  // paired with a removeProperty fall-through so a malicious value clears
  // the var (caller falls back to the default) rather than persisting a
  // previous tenant's URL.
  const setOrClearUrlVar = (cssVar: string, raw: string | null | undefined): void => {
    const safe = toCssUrl(sanitizeBrandingUrl(raw))
    if (safe) root.style.setProperty(cssVar, safe)
    else root.style.removeProperty(cssVar)
  }

  setOrClearUrlVar('--logo-url', branding.logo_url)
  setOrClearUrlVar('--logo-light-url', branding.logo_light_url)
  setOrClearUrlVar('--logo-dark-url', branding.logo_dark_url)
  setOrClearUrlVar('--mark-url', branding.mark_url)
  setOrClearUrlVar('--favicon-url', branding.favicon_url)

  // sanitizeFontFamilyForCss both validates (rejects an injection attempt,
  // same contract as sanitizeFontFamily) and appends the system-sans
  // fallback chain — required because this writes straight to a CSS custom
  // property a stylesheet resolves as `font-family: var(--font-stack)`. A
  // bare family name with no matching @font-face (confirmed live on a
  // sibling consumer app: `--font-body: Geist`, no fallback, rendering as
  // Times) must degrade to system-ui/sans-serif, never the browser's serif
  // default.
  const safeFontStack = sanitizeFontFamilyForCss(branding.font_stack ?? null)
  if (safeFontStack) {
    root.style.setProperty('--font-stack', safeFontStack)
  } else {
    root.style.removeProperty('--font-stack')
  }

  root.setAttribute('data-branding-loaded', 'true')
}

// Warn in dev if a caller tries to set a protected key
function warnIfProtectedKeyAttempted(branding: TenantBranding): void {
  if (!isDevEnvironment()) return
  // Check for any attempt to set error/destructive via unexpected RPC fields
  const raw = branding as unknown as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    const cssVar = `--${key.replace(/_/g, '-')}`
    if (!OVERRIDABLE_ROLE_KEYS.has(cssVar) && cssVar.includes('error')) {
      console.warn(
        `[BrandingProvider] Blocked attempt to override "${cssVar}" from tenant payload. ` +
          'Error/destructive colours are protected by the colourblind policy.',
      )
    }
  }
}

function isDevEnvironment(): boolean {
  // SECURITY: direct static key access only — assigning `import.meta.env` to a
  // variable makes consumer bundlers (Vite) inline the ENTIRE env object into
  // every client bundle, leaking every VITE_* secret. try/catch keeps this
  // safe in non-Vite runtimes where import.meta.env does not exist.
  try {
    return (
      (import.meta as ImportMeta & { env: { DEV?: boolean } }).env.DEV === true ||
      (import.meta as ImportMeta & { env: { MODE?: string } }).env.MODE === 'development'
    )
  } catch {
    return false
  }
}

function persistBranding(branding: TenantBranding | null): void {
  try {
    if (branding) {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding))
    } else {
      localStorage.removeItem(BRANDING_STORAGE_KEY)
    }
  } catch {
    // localStorage not available
  }
}

function loadPersistedBranding(): TenantBranding | null {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TenantBranding
  } catch {
    return null
  }
}

function isBrandingEnabled(): boolean {
  // SECURITY: direct static key access only (see isDevEnvironment) — reading
  // `import.meta.env` wholesale leaks every VITE_* secret into client bundles.
  try {
    const value = (
      import.meta as ImportMeta & { env: { VITE_ENABLE_BRANDING_OVERRIDE?: string } }
    ).env.VITE_ENABLE_BRANDING_OVERRIDE
    if (value === 'false' || value === '0') return false
  } catch {
    // Not in a Vite context — default enabled
  }
  return true
}

export function BrandingProvider({
  children,
  supabaseClient,
  brand = 'bsuite',
  applyPersistedOnMount = true,
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(brand !== 'braden')
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)
  // True when the last fetch was skipped (or failed) for lack of a session —
  // the SIGNED_IN listener uses this to refetch exactly once when auth lands.
  const needsAuthedRefetchRef = useRef<boolean>(false)

  // ── Braden short-circuit ──────────────────────────────────────────────────
  // Braden corporate uses static CSS from @bsuite/theme/braden-css — no runtime
  // tenant overrides needed. Skip all Supabase calls entirely.
  if (brand === 'braden') {
    const staticValue = useMemo<BrandingContextValue>(
      () => ({ branding: null, isLoading: false, error: null, refresh: async () => {} }),
      [],
    )
    return (<BrandingContext.Provider value={staticValue}>{children}</BrandingContext.Provider>)
  }

  // ── BSuite / D2C runtime branding ─────────────────────────────────────────
  const fetchBranding = useCallback(async () => {
    if (!isBrandingEnabled()) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // branding_json_for_tenant is granted to `authenticated` only — calling
      // it in anon context is a guaranteed PostgREST 401 (42501). Consumers
      // can mount this provider before session hydration completes (or on
      // genuinely public pages); skip the RPC and let defaults stand. The
      // SIGNED_IN listener below refetches once auth arrives.
      const { data: sessionData } = await supabaseClient.auth.getSession()
      if (!sessionData.session) {
        needsAuthedRefetchRef.current = true
        setIsLoading(false)
        return
      }
      needsAuthedRefetchRef.current = false
      const { data, error: rpcError } = await supabaseClient.rpc('branding_json_for_tenant')
      if (rpcError) throw new Error(rpcError.message)
      const resolved: TenantBranding | null = data ?? null
      if (resolved) warnIfProtectedKeyAttempted(resolved)
      setBranding(resolved)
      applyBrandingToRoot(resolved)
      persistBranding(resolved)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [supabaseClient])

  // Apply persisted branding immediately to prevent FOUC
  useEffect(() => {
    if (applyPersistedOnMount && isBrandingEnabled()) {
      const persisted = loadPersistedBranding()
      if (persisted) {
        applyBrandingToRoot(persisted)
        setBranding(persisted)
      }
    }
  }, [applyPersistedOnMount])

  // Fetch fresh branding on mount
  useEffect(() => {
    void fetchBranding()
  }, [fetchBranding])

  // Refetch once when a session arrives after an anon-skipped mount (session
  // hydration race). Deferred via setTimeout: onAuthStateChange callbacks run
  // while supabase-js holds the auth lock, and fetchBranding calls
  // getSession() — invoking it inline would self-deadlock (see the suite-wide
  // "never await supabase calls inside onAuthStateChange" rule).
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' && needsAuthedRefetchRef.current) {
        setTimeout(() => { void fetchBranding() }, 0)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [supabaseClient, fetchBranding])

  // Subscribe to Realtime tenant row changes
  useEffect(() => {
    if (!isBrandingEnabled()) return
    const channel = supabaseClient
      .channel('tenant-branding-updates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'tenants' }, (_payload: unknown) => { void fetchBranding() })
      .subscribe()
    channelRef.current = channel
    return () => {
      if (channelRef.current) {
        void supabaseClient.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabaseClient, fetchBranding])

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, isLoading, error, refresh: fetchBranding }),
    [branding, isLoading, error, fetchBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
