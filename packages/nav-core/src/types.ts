/**
 * Icon component type — compatible with Lucide, HeroIcons, and any
 * React component that renders an SVG.
 *
 * Uses a **structural type** instead of importing from `react` to
 * prevent type conflicts when consumed by projects using different
 * React versions (18 vs 19) in a pnpm workspace. The `@types/react`
 * ReactNode definition changed between versions, making any transitive
 * React type reference fail across version boundaries.
 *
 * Returns `any` (rather than `unknown`) because JSX tags must satisfy
 * `(props) => ReactNode` — `any` assigns to ReactNode in both React 18
 * and React 19 type universes, while `unknown` does not.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = (props: { className?: string; size?: number | string; [key: string]: any }) => any;

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
