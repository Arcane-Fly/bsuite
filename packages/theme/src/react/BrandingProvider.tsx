/**
 * BrandingProvider — runtime enterprise white-labelling
 *
 * On mount:
 *  1. Calls supabase.rpc('branding_json_for_tenant') using the user's authed session.
 *  2. Applies each key as a CSS custom property on document.documentElement.
 *  3. Caches the result in localStorage under BRANDING_STORAGE_KEY for FOUC prevention.
 *  4. Subscribes to tenant row changes via Supabase Realtime so branding updates
 *     propagate without a page reload (within ~1 second).
 *
 * Environment flags:
 *  - VITE_ENABLE_BRANDING_OVERRIDE (default: 'true') — set to 'false' to disable
 *    entirely without code changes (emergency kill switch).
 *
 * Usage:
 *  Wrap BrandingProvider inside ThemeProvider so branding CSS vars override theme defaults:
 *
 *    <ThemeProvider>
 *      <BrandingProvider supabaseClient={supabase}>
 *        {children}
 *      </BrandingProvider>
 *    </ThemeProvider>
 *
 * Colourblind policy (enforced at apply-time):
 *  Tenants can override --role-primary, --role-accent, --role-info, --role-success,
 *  --role-warning, --role-neutral, logo/mark URLs, and font-stack.
 *  Tenants CANNOT override --role-error or --role-destructive. These are fixed to
 *  electric-purple platform-wide. Any attempt to set them via the branding payload
 *  is silently dropped (and logged in dev). This prevents an enterprise tenant from
 *  accidentally or deliberately reintroducing red-as-error, which would break
 *  colourblind safety across their users.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export const BRANDING_STORAGE_KEY = 'bsuite_tenant_branding'
export const BRANDING_OVERRIDE_FLAG = 'VITE_ENABLE_BRANDING_OVERRIDE'

/**
 * Keys that tenants are PERMITTED to override. --role-error /
 * --role-destructive intentionally excluded — platform policy.
 */
const OVERRIDABLE_ROLE_KEYS = [
  'primary',
  'accent',
  'info',
  'success',
  'warning',
  'neutral',
] as const
type OverridableRoleKey = (typeof OVERRIDABLE_ROLE_KEYS)[number]

/** Shape returned by the branding_json_for_tenant RPC */
export interface TenantBranding {
  /** Primary action colour (oklch string). Maps to --role-primary. */
  primary?: string
  /** Accent / secondary colour (oklch string). Maps to --role-accent. */
  accent?: string
  /** Info colour (oklch string). Maps to --role-info. */
  info?: string
  /** Success colour (oklch string). Maps to --role-success. */
  success?: string
  /** Warning colour (oklch string). Maps to --role-warning. */
  warning?: string
  /** Neutral colour (oklch string). Maps to --role-neutral. */
  neutral?: string
  /** Full logo URL (SVG or raster) */
  logo_url?: string
  /** Dark-mode logo URL (optional; falls back to logo_url) */
  logo_dark_url?: string
  /** Mark / icon logo URL */
  mark_url?: string
  /** Favicon URL */
  favicon_url?: string
  /** Optional CSS font-family stack string */
  font_stack?: string | null
}

export interface BrandingContextValue {
  /** Current resolved branding, or null if no tenant override */
  branding: TenantBranding | null
  /** True while the initial RPC call is in flight */
  isLoading: boolean
  /** Any error from the RPC call */
  error: Error | null
  /** Manually trigger a branding refresh */
  refresh: () => Promise<void>
}

export const BrandingContext = createContext<BrandingContextValue | undefined>(undefined)

/**
 * Validate an oklch() string. Rejects hex, rgb, hsl — we require oklch at the
 * tenant-input boundary so the token system can't be polluted.
 * Accepts: oklch(L C H), oklch(L C H / A), with any amount of whitespace.
 */
const OKLCH_PATTERN = /^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*(\/\s*[\d.]+\s*)?\)$/i
function isValidOklch(value: unknown): value is string {
  return typeof value === 'string' && OKLCH_PATTERN.test(value.trim())
}

function applyBrandingToRoot(branding: TenantBranding | null) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (!branding) {
    // Remove any previously applied overrides
    OVERRIDABLE_ROLE_KEYS.forEach((key) => {
      root.style.removeProperty(`--role-${key}`)
    })
    // Legacy shadcn bridge vars also cleared
    root.style.removeProperty('--primary')
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-primary')
    root.style.removeProperty('--app-primary')
    root.style.removeProperty('--app-accent')
    root.style.removeProperty('--ring')
    root.style.removeProperty('--logo-url')
    root.style.removeProperty('--mark-url')
    root.style.removeProperty('--favicon-url')
    root.style.removeProperty('--font-stack')
    root.removeAttribute('data-branding-loaded')
    return
  }

  // Apply role overrides — only for keys present in the payload AND valid oklch.
  OVERRIDABLE_ROLE_KEYS.forEach((key) => {
    const v = branding[key]
    if (v === undefined || v === null) return
    if (!isValidOklch(v)) {
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          `[BrandingProvider] rejected invalid oklch for role "${key}": ${v}. ` +
            'Tenant branding values must be oklch() strings.',
        )
      }
      return
    }
    root.style.setProperty(`--role-${key}`, v)
  })

  // Legacy aliases for older consumers that haven't migrated to role vars yet.
  // Kept until the cross-app codemod completes.
  if (branding.primary && isValidOklch(branding.primary)) {
    root.style.setProperty('--primary', branding.primary)
    root.style.setProperty('--accent-primary', branding.primary)
    root.style.setProperty('--app-primary', branding.primary)
    root.style.setProperty('--ring', branding.primary)
  }
  if (branding.accent && isValidOklch(branding.accent)) {
    root.style.setProperty('--accent', branding.accent)
    root.style.setProperty('--app-accent', branding.accent)
  }

  // Asset overrides (logo / mark / favicon / font) — no oklch validation,
  // just URL shape. Trust server-side RPC to have validated.
  if (branding.logo_url) {
    root.style.setProperty('--logo-url', `url("${branding.logo_url}")`)
  }
  if (branding.logo_dark_url) {
    root.style.setProperty('--logo-dark-url', `url("${branding.logo_dark_url}")`)
  }
  if (branding.mark_url) {
    root.style.setProperty('--mark-url', `url("${branding.mark_url}")`)
  }
  if (branding.favicon_url) {
    root.style.setProperty('--favicon-url', `url("${branding.favicon_url}")`)
  }
  if (branding.font_stack) {
    root.style.setProperty('--font-stack', branding.font_stack)
  }

  root.setAttribute('data-branding-loaded', 'true')
}

function persistBranding(branding: TenantBranding | null) {
  try {
    if (branding) {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding))
    } else {
      localStorage.removeItem(BRANDING_STORAGE_KEY)
    }
  } catch {
    // localStorage not available — silently ignore
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
  try {
    // Vite env var — only present in client bundles that set it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flag = (import.meta as any).env as Record<string, string> | undefined
    const value = flag?.VITE_ENABLE_BRANDING_OVERRIDE ?? flag?.['VITE_ENABLE_BRANDING_OVERRIDE']
    if (value === 'false' || value === '0') return false
  } catch {
    // Not in a Vite context — default to enabled
  }
  return true
}

export interface BrandingProviderProps {
  children: ReactNode
  /** Authenticated Supabase client from the consuming app */
  supabaseClient: SupabaseClient
  /**
   * If true, apply persisted branding immediately on mount (before the RPC
   * resolves) to prevent FOUC. Default: true.
   */
  applyPersistedOnMount?: boolean
  /**
   * Brand baseline in use. 'braden' short-circuits white-label entirely —
   * the marketing site has no tenants and no overrides apply. Default 'd2c'.
   */
  brand?: 'd2c' | 'braden'
}

export function BrandingProvider({
  children,
  supabaseClient,
  applyPersistedOnMount = true,
  brand = 'd2c',
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)

  // Braden marketing site — no tenants, no overrides, short-circuit.
  const isBraden = brand === 'braden'

  const fetchBranding = useCallback(async () => {
    if (isBraden || !isBrandingEnabled()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabaseClient.rpc(
        'branding_json_for_tenant',
      )

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      const resolved = (data as TenantBranding) ?? null
      setBranding(resolved)
      applyBrandingToRoot(resolved)
      persistBranding(resolved)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      // On error keep any persisted branding applied (already done at mount)
    } finally {
      setIsLoading(false)
    }
  }, [supabaseClient, isBraden])

  // Apply persisted branding immediately to prevent FOUC
  useEffect(() => {
    if (isBraden) return
    if (applyPersistedOnMount && isBrandingEnabled()) {
      const persisted = loadPersistedBranding()
      if (persisted) {
        applyBrandingToRoot(persisted)
        setBranding(persisted)
      }
    }
  }, [applyPersistedOnMount, isBraden])

  // Fetch fresh branding on mount
  useEffect(() => {
    void fetchBranding()
  }, [fetchBranding])

  // Subscribe to Realtime tenant row changes so branding propagates without reload
  useEffect(() => {
    if (isBraden || !isBrandingEnabled()) return

    const channel = supabaseClient
      .channel('tenant-branding-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenants',
          // filter applied server-side via RLS — only own tenant rows received
        },
        (_payload: unknown) => {
          // Re-fetch to get the full branding_json_for_tenant RPC result
          void fetchBranding()
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void supabaseClient.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabaseClient, fetchBranding, isBraden])

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, isLoading, error, refresh: fetchBranding }),
    [branding, isLoading, error, fetchBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
