/**
 * Navigation utility types and helpers.
 * Inlined from @bsuite/nav-core for standalone Vercel deployment.
 */

export type IconComponent = (props: {
  className?: string
  size?: number | string
}) => React.ReactNode;

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
  if (!currentPath || !itemHref) return false;

  // Normalise trailing slashes for comparison
  const norm = (s: string) => (s.length > 1 && s.endsWith('/') ? s.slice(0, -1) : s);
  const current = norm(currentPath);
  const href = norm(itemHref);

  if (current === href) return true;

  // Root path should only match exactly, not as a prefix
  if (href === '/') return false;

  return current.startsWith(href + '/');
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
