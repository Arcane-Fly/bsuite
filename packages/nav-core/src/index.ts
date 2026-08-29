export type {
  IconComponent,
  NavItem,
  NavItemGroup,
  NavSection,
  NavConfig,
} from './types.js';

export { isActivePath, isSectionActive } from './utils.js';

export { AppSwitcher } from './AppSwitcher.js';
export type { AppEntry, AppSwitcherProps } from './AppSwitcher.js';

export { useSidebarState } from './useSidebarState.js';
export type { UseSidebarStateOptions, SidebarState } from './useSidebarState.js';

export { MobileSidebarDrawer } from './MobileSidebarDrawer.js';
export type { MobileSidebarDrawerProps } from './MobileSidebarDrawer.js';

export { tierSatisfies, tierRank } from './tier.js';
export type { Tier } from './tier.js';

export { useFilteredNav } from './useFilteredNav.js';
export type { GatedNavSection, UseFilteredNavOptions } from './useFilteredNav.js';

export { mergeNavConfigs } from './merge.js';

export {
  BSUITE_APP_KEYS,
  // The tenant/all split shipped in 0.9.0 but was NOT re-exported here, so it was
  // unreachable from the package entry point — consumers could only see it via a
  // deep import into dist/apps.js. That is the same defect class as bsuite#2011
  // itself: shipped, correct, and reachable by nobody. Barrel exports are part of
  // the public API, not bookkeeping.
  BSUITE_TENANT_APP_KEYS,
  BSUITE_ALL_APP_KEYS,
  BSUITE_PROD_URLS,
  BSUITE_DEV_PORTS,
  BSUITE_APP_METADATA,
  BSUITE_APP_LANDING_PATHS,
  isBSuiteAppKey,
} from './apps.js';
export type { BSuiteAppKey, BSuiteTenantAppKey, AppMetadata } from './apps.js';

export { buildLaunchUrl, buildAppLaunchUrl } from './launchUrl.js';
export { sanitizeReturnPath } from './sanitizeReturnPath.js';

export { speedInsightsRoute } from './speedInsightsRoute.js';
export { useSpeedInsightsRoute } from './useSpeedInsightsRoute.js';
