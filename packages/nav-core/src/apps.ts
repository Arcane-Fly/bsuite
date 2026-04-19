/**
 * Canonical list of BSuite app keys. Host apps build their own `AppEntry[]`
 * by combining these keys with their resolved URLs + lucide-react icons,
 * because env-var access + icon choice must happen in the consuming
 * environment (Vite vs Next.js resolves differently).
 *
 * Keep this in sync across all 5 apps: changing the order here changes
 * the AppSwitcher ordering everywhere.
 */

export const BSUITE_APP_KEYS = ['bsu', 'crm7', 'conduit', 'r8', 'throughput'] as const

export type BSuiteAppKey = (typeof BSUITE_APP_KEYS)[number]

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
}

/** Localhost dev ports — matches current vite configs. */
export const BSUITE_DEV_PORTS: Record<BSuiteAppKey, number> = {
  bsu: 5675,
  crm7: 5676,
  r8: 5678,
  conduit: 5680,
  throughput: 5681,
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
}
