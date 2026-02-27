import type { NavSection } from './types';

/**
 * Check whether `currentPath` matches `itemHref`.
 *
 * Returns true for an exact match **or** a prefix match where the
 * next character is `/` (so `/apprentices` matches
 * `/apprentices/create` but not `/apprentices-old`).
 */
export function isActivePath(
  currentPath: string,
  itemHref: string,
): boolean {
  if (currentPath === itemHref) return true;
  return currentPath.startsWith(itemHref + '/');
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
