/**
 * Canonical list of BSuite app keys. Host apps build their own `AppEntry[]`
 * by combining these keys with their resolved URLs + lucide-react icons,
 * because env-var access + icon choice must happen in the consuming
 * environment (Vite vs Next.js resolves differently).
 *
 * Keep this in sync across all 5 apps: changing the order here changes
 * the AppSwitcher ordering everywhere.
 */

export const BSUITE_APP_KEYS = ['bsu', 'crm7', 'conduit', 'r8', 'throughput', 'braden'] as const

export type BSuiteAppKey = (typeof BSUITE_APP_KEYS)[number]

/**
 * Apps offered in a tenant-facing AppSwitcher by default.
 *
 * braden is deliberately EXCLUDED. It is the public corporate marketing site
 * (braden.com.au), not a tenant workspace — a "Braden Group" row in a tenant
 * user's app switcher is noise at best and confusing at worst.
 *
 * It IS a first-class key, because before this it was absent from
 * `BSUITE_APP_KEYS` entirely (bsuite#2011), which meant **no app could link to
 * braden at all** even where that was wanted — while braden itself already
 * implements the inbound `/auth/login` -> `signInWithBusinessSuite()` SSO entry
 * point every other app uses. The receiving side worked; nothing could reach it.
 *
 * Staff-facing surfaces (BSU's developer/admin areas) can opt in with
 * `BSUITE_ALL_APP_KEYS`. Nothing is forced into a tenant's switcher by default,
 * so adding the key changes no existing UI.
 */
export const BSUITE_TENANT_APP_KEYS = ['bsu', 'crm7', 'conduit', 'r8', 'throughput'] as const

/**
 * The five internal workspaces, as a type. Without this every consumer that wants
 * a tenant-only map has to re-derive `(typeof BSUITE_TENANT_APP_KEYS)[number]`
 * locally — six copies of one definition, which is the duplication the whole
 * package exists to prevent.
 */
export type BSuiteTenantAppKey = (typeof BSUITE_TENANT_APP_KEYS)[number]

/** Every app, including public/marketing surfaces. Opt in explicitly. */
export const BSUITE_ALL_APP_KEYS = BSUITE_APP_KEYS

/**
 * Fallback production URLs. Consumers should prefer their own env-var
 * resolution (VITE_BSU_URL, NEXT_PUBLIC_BSU_URL, etc.) and only fall
 * through to these when env is unset. Matches current production domains.
 */
export const BSUITE_PROD_URLS: Record<BSuiteAppKey, string> = {
  bsu: 'https://suite.crm7.app',
  crm7: 'https://crm.crm7.app',
  conduit: 'https://conduit.crm7.app',
  r8: 'https://r8.crm7.app',
  throughput: 'https://ideas.crm7.app',
  braden: 'https://www.braden.com.au',
}

/** Localhost dev ports — matches current vite configs. */
export const BSUITE_DEV_PORTS: Record<BSuiteAppKey, number> = {
  bsu: 5675,
  crm7: 5676,
  r8: 5678,
  conduit: 5680,
  throughput: 5681,
  braden: 5677,
}

export interface AppMetadata {
  key: BSuiteAppKey
  name: string
  shortName: string
  description: string
}

/** Display metadata for each app — icons added by consumers. */
export const BSUITE_APP_METADATA: Record<BSuiteAppKey, AppMetadata> = {
  bsu: {
    key: 'bsu',
    name: 'Business Suite',
    shortName: 'BSU',
    description: 'Portal & dashboard',
  },
  crm7: {
    key: 'crm7',
    name: 'CRM7 Professional',
    shortName: 'CRM7',
    description: 'CRM with AI insights',
  },
  conduit: {
    key: 'conduit',
    name: 'Conduit ATS',
    shortName: 'Conduit',
    description: 'Recruitment & talent',
  },
  r8: {
    key: 'r8',
    name: 'R8 Calculator',
    shortName: 'R8',
    description: 'Wage calculator',
  },
  throughput: {
    key: 'throughput',
    name: 'Throughput Ideas',
    shortName: 'Ideas',
    description: 'Idea management',
  },
  braden: {
    key: 'braden',
    name: 'Braden Group',
    shortName: 'Braden',
    description: 'Corporate site',
  },
}

/**
 * Where a cross-app launch should LAND in each destination app.
 *
 * ═══ WHY THIS MAP EXISTS ═══
 *
 * `buildLaunchUrl` defaulted `return_path` to `/dashboard` for every
 * destination, because the first two apps wired up (bsu, crm7) both serve
 * `/dashboard`. They are the only two that do.
 *
 * The operator hit the consequence on 2026-08-24: the "R8 Calculator" row in
 * BSU's sidebar pointed at
 * `https://r8.crm7.app/auth/login?return_path=%2Fdashboard`, the OAuth round
 * trip completed correctly, and R8 then rendered its not-found page — because
 * R80.4's router (`main.tsx::Root`) serves the calculator at `/` and 404s
 * everything it does not recognise. Sign-in worked; the landing did not.
 *
 * The other two mismatches were quieter and would have stayed hidden: both
 * `throughput` and `braden` catch unknown paths with
 * `<Route path="*" element={<Navigate to="/" replace />} />`, so a launch to
 * their `/dashboard` silently drops the user on the public home page instead
 * of the authenticated surface the link promised.
 *
 * A per-destination landing path is not a preference — it is a property of the
 * destination's own router, so it belongs beside that app's URL and metadata
 * rather than in each of the six callers that link to it. Prefer
 * `buildAppLaunchUrl(key, url)` over `buildLaunchUrl(url)` wherever the app key
 * is known; the two-argument `buildLaunchUrl(url, path)` stays for content
 * deep-links, which target a specific page rather than an app's front door.
 *
 * Sourced from each app's own `/auth/login` default, and cross-checked against
 * its router:
 *   - bsu        `src/pages/auth/login.tsx`  → `/dashboard` (route exists)
 *   - crm7       `src/pages/auth/login.tsx`  → `/dashboard` (route exists)
 *   - conduit    `src/app/auth/login/page.tsx` → `/`
 *   - r8         `src/pages/AuthLogin.tsx`   → `/`  (R80.4 has NO `/dashboard`)
 *   - throughput `src/pages/Login.tsx`       → `/`
 *   - braden     `src/pages/auth/Login.tsx`  → `/admin/branding`
 *
 * Keep this in sync with the per-app table in AUTH_CANONICAL.md §"/auth/login
 * route on every consuming app". A `Record<BSuiteAppKey, string>` is deliberate:
 * adding a key to `BSUITE_APP_KEYS` without deciding where launches land is a
 * type error, not a 404 discovered in production.
 */
export const BSUITE_APP_LANDING_PATHS: Record<BSuiteAppKey, string> = {
  bsu: '/dashboard',
  crm7: '/dashboard',
  conduit: '/',
  r8: '/',
  throughput: '/',
  braden: '/admin/branding',
}

/**
 * Narrow an arbitrary string to a `BSuiteAppKey`.
 *
 * `AppEntry.key` is typed `string`, not `BSuiteAppKey` — deliberately, so a
 * consumer can list an app this package does not know about. That means
 * `AppSwitcher` cannot index `BSUITE_APP_LANDING_PATHS` directly: an unknown
 * key would yield `undefined` and serialise into `?return_path=undefined`,
 * which every destination's `sanitizeReturnPath` then discards — a silent
 * fallback that looks like it worked. Narrow first, and let an unknown app keep
 * the generic launch URL.
 */
export function isBSuiteAppKey(value: string): value is BSuiteAppKey {
  return (BSUITE_APP_KEYS as readonly string[]).includes(value)
}
