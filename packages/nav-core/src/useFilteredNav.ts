'use client'
/**
 * useFilteredNav — filters a list of NavSection items by permission + tier.
 *
 * Filtering inputs are passed in (not imported) so the hook works across
 * any consumer. Each app wires its own permission + tier providers.
 *
 * Filter order (all must pass for the section to be included):
 *   1. `requiredApp` — omits sections tagged for a different app
 *   2. `requiredPermission` — uses the provided hasPermission(id) function
 *   3. `requiredTier` — uses tierSatisfies() against the provided currentTier
 *
 * Sections with no gates are always included.
 */

import { useMemo } from 'react'
import type { NavSection } from './types'
import { type Tier, tierSatisfies } from './tier'

/**
 * Extended NavSection with optional gating metadata. Apps can assign
 * these on sections that should be hidden from unauthorised users.
 */
export interface GatedNavSection extends NavSection {
  /** Permission ID the user must have — format is app-defined (e.g. 'org:admin'). */
  requiredPermission?: string
  /** Minimum tier required. Uses tierSatisfies() — 'team' satisfies 'individual'. */
  requiredTier?: Tier
  /** If set, section is only shown on the listed app keys. */
  requiredApps?: string[]
}

export interface UseFilteredNavOptions {
  /** Permission checker from the host app. Return true if user has the id. */
  hasPermission?: (permissionId: string) => boolean
  /** Current user's tier. Default 'free' means only no-gate sections show. */
  currentTier?: Tier
  /** Current app key. If a section has `requiredApps`, must be included. */
  currentApp?: string
}

/**
 * Returns a memoised filtered view of the sections array.
 *
 * @example
 *   const { hasPermission } = usePermissions()       // app-local
 *   const { tier } = useTierContext()                // app-local
 *   const sections = useFilteredNav(ALL_SECTIONS, {
 *     hasPermission,
 *     currentTier: tier,
 *     currentApp: 'crm7',
 *   })
 */
export function useFilteredNav(
  sections: GatedNavSection[],
  options: UseFilteredNavOptions = {},
): GatedNavSection[] {
  const { hasPermission, currentTier = 'free', currentApp } = options

  return useMemo(
    () =>
      sections.filter((section) => {
        if (section.requiredApps && currentApp && !section.requiredApps.includes(currentApp)) {
          return false
        }
        if (section.requiredPermission && hasPermission) {
          if (!hasPermission(section.requiredPermission)) return false
        }
        if (section.requiredTier && !tierSatisfies(currentTier, section.requiredTier)) {
          return false
        }
        return true
      }),
    [sections, hasPermission, currentTier, currentApp],
  )
}
