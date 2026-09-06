/**
 * Migrations for a `layoutVersion` bump — the alternative to throwing the
 * user's arrangement away.
 *
 * `usePageGridLayout` had exactly one response to a version bump: overwrite
 * the stored layout with `defaultLayouts`. That is right for the reason
 * crm7's dashboard epoch 8 was raised — a saved layout referencing widgets
 * that no longer exist cannot be repaired — and wrong for the reason a
 * version usually gets bumped, which is that a DEFAULT changed. crm7#2490
 * bumped four routes purely to change default card widths; measured on one
 * account, that discarded 14 stored layouts.
 *
 * The doctrine is already in `usePageGridLayout.ts`, in the derived-breakpoint
 * heal: "`lg` … is preserved untouched, so nobody loses the arrangement they
 * made." A migration is how a version bump keeps that promise.
 */

import type { GridLayoutItem, GridLayouts, LayoutMigration } from './types.js';

/**
 * The subset of an item's OLD default a migration compares against.
 *
 * `w` is required, because the whole test is "does the stored value still equal
 * what the page used to author?". `minW` and `position` are optional: state
 * them only where the bump actually moved them, because stating a value is what
 * makes it a candidate for replacement.
 *
 * `position` is `{x, y}` and not two loose fields ON PURPOSE. Half a match is
 * not a match: an item whose `x` still equals the old default but whose `y` does
 * not was moved, and adopting only `x` would invent a third position that
 * neither the user nor the page ever chose. Making the pair a single object
 * means a caller cannot record half of it by accident.
 */
export interface PreviousItemDefault {
  w: number;
  minW?: number;
  position?: { x: number; y: number };
}

/**
 * A migration for a bump that changed DEFAULTS — widths, positions, or both.
 *
 * One rule, applied per item: **adopt what the user never chose, keep what they
 * did.** A stored value still equal to the old default was never a decision; it
 * is inherited furniture.
 *
 *   saved position === the OLD default position
 *       -> the user never placed this card. Adopt the new default `x` and `y`
 *          (atomically — never one without the other), and go on to consider
 *          its width.
 *   saved position !== the OLD default position
 *       -> the user placed this card. It is IMMUNE: position and width are both
 *          left alone. A card someone put somewhere by hand must not silently
 *          change size underneath them either, and reflowing around a
 *          hand-placed card is how a deliberate arrangement stops making sense.
 *
 *   saved w === the OLD default w  ->  adopt the new default width
 *   saved w !== the OLD default w  ->  the user sized it; keep it
 *
 * and the same comparison for `minW`. Height, `autoHeight`, `chrome`,
 * `hUserSet` and everything else are never touched.
 *
 * An entry that records no `position` is a WIDTH-ONLY migration: nothing moves.
 * That is the pre-existing behaviour and is kept so a migration written before
 * the position rule existed cannot start relocating cards.
 *
 * Why position is in scope at all, since it did not start that way: treating
 * width as inherited while treating position as sacred splits one rule into two,
 * and produces a layout nobody authored. Measured on `/clients` — the four stat
 * cards asked for `w={3}` and stored 4 (the default `minW` clamps `w` up), so
 * three filled the row and the fourth wrapped. Adopting only widths narrowed
 * them to 3 but left them at x 0/4/8 with the fourth still wrapped: neither the
 * arrangement the user had nor the 0/3/6/9 the page now authors. Pinned in
 * `layoutVersionMigration.test.tsx`.
 *
 * @param previousDefaults keyed by layout item id (`i` / `cardKey`). An item
 *   with no entry is passed through untouched, so a bump only has to name the
 *   items whose defaults actually moved.
 */
export function adoptUnchangedDefaults(
  previousDefaults: Readonly<Record<string, PreviousItemDefault>>,
): LayoutMigration {
  return (saved, defaults) => {
    const migrated: GridLayouts = { lg: [] };
    for (const breakpoint of Object.keys(saved)) {
      const defaultItems =
        (defaults as Record<string, GridLayoutItem[] | undefined>)[breakpoint] ??
        defaults.lg ??
        [];
      const defaultByKey = new Map(defaultItems.map((item) => [item.i, item]));
      migrated[breakpoint] = (saved[breakpoint] ?? []).map((item) => {
        const previous = previousDefaults[item.i];
        const current = defaultByKey.get(item.i);
        // No recorded old default, or the item is gone from the new defaults:
        // there is nothing to compare against, so nothing is a candidate.
        if (!previous || !current) return item;

        // Position is decided FIRST, because a moved item is immune to the
        // width rule as well — returning the item itself, not a copy, so the
        // immunity is visible in the object identity too.
        const placed =
          previous.position !== undefined &&
          (item.x !== previous.position.x || item.y !== previous.position.y);
        if (placed) return item;

        // A fresh object every time — the caller's array is state that other
        // renders still hold, and mutating it in place would edit the "before"
        // out from under anyone comparing the two.
        const next: GridLayoutItem = { ...item };
        if (previous.position !== undefined) {
          next.x = current.x;
          next.y = current.y;
        }
        if (item.w === previous.w) next.w = current.w;
        if (previous.minW !== undefined && item.minW === previous.minW) {
          if (current.minW === undefined) delete next.minW;
          else next.minW = current.minW;
        }
        return next;
      });
    }
    if (!migrated.lg) migrated.lg = saved.lg ?? [];
    return migrated;
  };
}
