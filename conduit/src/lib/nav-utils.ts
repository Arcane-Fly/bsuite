/**
 * Navigation utility types and helpers.
 * Inlined from @bsuite/nav-core for standalone Vercel deployment.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = any;

export interface NavItem {
  label: string;
  href: string;
  icon?: IconComponent;
  badge?: string | number;
  external?: boolean;
}

export type NavItemGroup = NavItem[];

export interface NavSection {
  label: string;
  icon: IconComponent;
  href?: string;
  groups?: NavItemGroup[];
  defaultOpen?: boolean;
}

export interface NavConfig {
  app: {
    name: string;
    shortName: string;
    logoSrc?: string;
    homeHref: string;
  };
  sections: NavSection[];
  footer?: NavItem[];
  suiteLinks?: NavItem[];
}

export function isActivePath(currentPath: string, itemHref: string): boolean {
  if (currentPath === itemHref) return true;
  return currentPath.startsWith(itemHref + '/');
}

export function isSectionActive(
  currentPath: string,
  section: Pick<NavSection, 'href' | 'groups'>,
): boolean {
  if (section.href && isActivePath(currentPath, section.href)) return true;
  if (section.groups) {
    return section.groups.some((group) =>
      group.some((item) => isActivePath(currentPath, item.href)),
    );
  }
  return false;
}
