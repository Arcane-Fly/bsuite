/**
 * mergeNavConfigs — additive merge of a static nav config with a DB-sourced overlay.
 *
 * Merge semantics (ADDITIVE — never destructive):
 * - DB sections whose `label` matches an existing static section → their groups
 *   are APPENDED to the static section's groups (static groups come first).
 *   If the static section has no groups yet, the overlay groups initialise it.
 * - DB sections with a new label (no match in static) → appended after all
 *   static sections. A required `icon` must be provided by the overlay section.
 * - Static sections are never removed or reordered by a DB overlay
 * - Empty DB overlay returns static config unchanged (no mutation, same reference)
 *
 * Note on NavSection shape: NavSection uses `groups?: NavItemGroup[]` (an array
 * of NavItemGroup, where each NavItemGroup is a NavItem[]). There is no flat
 * `items` array on NavSection — use groups to pass items.
 *
 * @param base    The static nav config from the app's navigation.ts file.
 *                This is never mutated.
 * @param overlay The DB-sourced nav config from useTenantNavigation().
 *                May be null/undefined (returns base unchanged).
 * @returns       A new NavConfig with overlay groups additively merged in.
 *
 * @example
 * ```typescript
 * const merged = mergeNavConfigs(staticNav, dbNav);
 * // dbNav sections whose label matches a static section get groups appended
 * // dbNav sections with new labels are appended after static sections
 * ```
 */

import type { NavConfig, NavSection } from './types.js';

export function mergeNavConfigs(
  base: NavConfig,
  overlay: NavConfig | null | undefined,
): NavConfig {
  // Empty overlay — return base unchanged (no copy needed, no mutation)
  if (!overlay || overlay.sections.length === 0) {
    return base;
  }

  // Build a label→index lookup for the base sections
  const baseLabelIndex = new Map<string, number>(
    base.sections.map((section, i) => [section.label, i]),
  );

  // Start with a shallow-copy of base sections (new arrays, same item objects)
  const mergedSections: NavSection[] = base.sections.map((section) => ({
    ...section,
    groups: section.groups ? [...section.groups] : undefined,
  }));

  // Process overlay sections
  for (const overlaySection of overlay.sections) {
    const existingIndex = baseLabelIndex.get(overlaySection.label);

    if (existingIndex !== undefined) {
      // Label matches → append overlay groups to existing section
      const existingGroups = mergedSections[existingIndex].groups ?? [];
      const overlayGroups = overlaySection.groups ?? [];
      mergedSections[existingIndex] = {
        ...mergedSections[existingIndex],
        groups: [...existingGroups, ...overlayGroups],
      };
    } else {
      // New label → append entire section after static sections
      mergedSections.push({
        ...overlaySection,
        groups: overlaySection.groups ? [...overlaySection.groups] : undefined,
      });
    }
  }

  return {
    ...base,
    sections: mergedSections,
  };
}
