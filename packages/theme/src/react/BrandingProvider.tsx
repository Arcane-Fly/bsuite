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
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export const BRANDING_STORAGE_KEY = 'bsuite_tenant_branding'
export const BRANDING_OVERRIDE_FLAG = 'VITE_ENABLE_BRANDING_OVERRIDE'

/** Shape returned by the branding_json_for_tenant RPC */
export interface TenantBranding {
  /** Primary action colour as an OKLCH string, e.g. "oklch(0.55 0.22 265)" */
  primary?: string
  /** Accent / secondary colour as an OKLCH string */
  accent?: string
  /** Full logo URL (SVG or raster) */
  logo_url?: string
  /** Mark / icon logo URL */
  mark_url?: string
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

const BRANDING_CSS_MAP: Record<keyof TenantBranding, string | null> = {
  primary: '--primary',
  accent: '--accent',
  logo_url: '--logo-url',
  mark_url: '--mark-url',
  font_stack: '--font-stack',
}

function applyBrandingToRoot(branding: TenantBranding | null) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (!branding) {
    // Remove any previously applied overrides
    Object.values(BRANDING_CSS_MAP).forEach((cssVar) => {
      if (cssVar) root.style.removeProperty(cssVar)
    })
    // Also remove aliased vars
    root.style.removeProperty('--accent-primary')
    root.style.removeProperty('--app-primary')
    root.style.removeProperty('--app-accent')
    root.removeAttribute('data-branding-loaded')
    return
  }

  if (branding.primary) {
    root.style.setProperty('--primary', branding.primary)
    root.style.setProperty('--accent-primary', branding.primary)
    root.style.setProperty('--app-primary', branding.primary)
    root.style.setProperty('--ring', branding.primary)
  }
  if (branding.accent) {
    root.style.setProperty('--accent', branding.accent)
    root.style.setProperty('--accent-secondary', branding.accent)
    root.style.setProperty('--app-accent', branding.accent)
  }
  if (branding.logo_url) {
    root.style.setProperty('--logo-url', `url(${branding.logo_url})`)
  }
  if (branding.mark_url) {
    root.style.setProperty('--mark-url', `url(${branding.mark_url})`)
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
    const flag = (import.meta as Record<string, unknown>).env as Record<string, string> | undefined
    const value = flag?.VITE_ENABLE_BRANDING_OVERRIDE ?? flag?.['VITE_ENABLE_BRANDING_OVERRIDE']
    if (value === 'false' || value === '0') return false
  } catch {
    // Not in a Vite context (e.g. Next.js) — fall through to next check
  }
  try {
    // Next.js / Node env var
    const value = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_BRANDING_OVERRIDE)
    if (value === 'false' || value === '0') return false
  } catch {
    // ignore
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
}

export function BrandingProvider({
  children,
  supabaseClient,
  applyPersistedOnMount = true,
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)

  const fetchBranding = useCallback(async () => {
    if (!isBrandingEnabled()) {
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

  // Subscribe to Realtime tenant row changes so branding propagates without reload
  useEffect(() => {
    if (!isBrandingEnabled()) return

    const channel = supabaseClient
      .channel('tenant-branding-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenants',
          // filter is applied server-side via RLS — only own tenant rows are received
        },
        (_payload) => {
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
  }, [supabaseClient, fetchBranding])

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, isLoading, error, refresh: fetchBranding }),
    [branding, isLoading, error, fetchBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
