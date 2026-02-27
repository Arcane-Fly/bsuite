/**
 * Icon component type — compatible with Lucide, HeroIcons, and any
 * React component that renders an SVG.
 *
 * Deliberately avoids importing from `react` to prevent type conflicts
 * when consumed by projects using different React versions (18 vs 19)
 * in a pnpm workspace. The `@types/react` ReactNode definition changed
 * between versions, making any transitive React type reference fail
 * across version boundaries.
 *
 * Type safety for icons is enforced at each project's nav config file
 * where Lucide/HeroIcon types are properly resolved against the
 * project's own React version.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = any;

/** A single navigation item (leaf node). */
export interface NavItem {
  /** Display label */
  label: string;
  /** URL path (or view identifier for state-based routing) */
  href: string;
  /** Optional icon component */
  icon?: IconComponent;
  /** Optional badge text or count shown beside the label */
  badge?: string | number;
  /** If true, opens in a new tab (for cross-app links) */
  external?: boolean;
}

/**
 * A group of nav items. Groups within a section are visually
 * separated by dividers.
 */
export type NavItemGroup = NavItem[];

/** A collapsible navigation section containing grouped items. */
export interface NavSection {
  /** Section heading label */
  label: string;
  /** Section icon (shown in collapsed mode) */
  icon: IconComponent;
  /** Direct link when section itself is clickable */
  href?: string;
  /** Grouped sub-items — each group separated by a divider */
  groups?: NavItemGroup[];
  /** Whether this section starts expanded (default: false) */
  defaultOpen?: boolean;
}

/** Top-level navigation configuration for a BSuite application. */
export interface NavConfig {
  /** Application identity */
  app: {
    /** Full application name */
    name: string;
    /** Short name / abbreviation */
    shortName: string;
    /** Path to logo image */
    logoSrc?: string;
    /** Link target when clicking the logo */
    homeHref: string;
  };
  /** Main navigation sections */
  sections: NavSection[];
  /** Fixed footer items (settings, profile, etc.) */
  footer?: NavItem[];
  /** Cross-app links shown at the bottom of the sidebar */
  suiteLinks?: NavItem[];
}
