import type { NavSection } from './types';

/** Strip a single trailing slash (unless the path is just `/`). */
function normalize(p: string): string {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

/**
 * Check whether `currentPath` matches `itemHref`.
 *
 * Returns true for an exact match **or** a prefix match where the
 * next character is `/` (so `/apprentices` matches
 * `/apprentices/create` but not `/apprentices-old`).
 *
 * Guards:
 * - Empty `itemHref` always returns false.
 * - Root path (`/`) only matches exactly — it does not prefix-match
 *   every route.
 * - Trailing slashes are normalised before comparison.
 */
export function isActivePath(
  currentPath: string,
  itemHref: string,
): boolean {
  if (!itemHref) return false;
  const cp = normalize(currentPath);
  const ih = normalize(itemHref);
  if (ih === '/') return cp === '/';
  if (cp === ih) return true;
  return cp.startsWith(ih + '/');
}

/**
 * Check whether any item inside a section is currently active.
 * Useful for auto-expanding a section when one of its children is
 * the current page.
 */
export function isSectionActive(
  currentPath: string,
  section: Pick<NavSection, 'href' | 'groups'>,
): boolean {
  if (section.href && isActivePath(currentPath, section.href)) {
    return true;
  }
  if (section.groups) {
    return section.groups.some((group) =>
      group.some((item) => isActivePath(currentPath, item.href)),
    );
  }
  return false;
}
