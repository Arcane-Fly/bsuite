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
