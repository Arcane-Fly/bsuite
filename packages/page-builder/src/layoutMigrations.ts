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
 * The subset of an item's OLD default that a width-only migration needs.
 *
 * `w` is required because the whole test is "does the stored value still equal
 * what the page used to author?". `minW` is optional: only state it when the
 * bump moved it, because stating it is what makes it a candidate for
 * replacement.
 */
export interface PreviousItemDefault {
  w: number;
  minW?: number;
}

/**
 * A migration for a bump whose only change was DEFAULT WIDTHS.
 *
 * The rule, per item:
 *
 *   saved.w === previousDefault.w  ->  the user never chose it; adopt the new
 *                                      default
 *   saved.w !== previousDefault.w  ->  the user chose it; keep it
 *
 * and the same for `minW`. Position (`x`/`y`), height, `autoHeight`, `chrome`,
 * `hUserSet` and every other field are left exactly as the user left them.
 *
 * NOTE THE RESIDUAL, because it is a real one and a comment is not a substitute
 * for measuring it (`layoutVersionMigration.test.tsx` pins it): a user who
 * never arranged the page gets the new WIDTHS at the OLD `x`/`y`, so the page
 * is not re-laid-out the way a fresh visitor's is. That is the price of not
 * touching positions, and it is still strictly better than the discard it
 * replaces — nothing is lost either way round.
 *
 * @param previousDefaults keyed by layout item id (`i` / `cardKey`). An item
 *   with no entry is passed through untouched, so a bump only has to name the
 *   items whose defaults actually moved.
 */
export function adoptDefaultWidths(
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
        // A fresh object every time — the caller's array is state that other
        // renders still hold, and mutating it in place would edit the "before"
        // out from under anyone comparing the two.
        const next: GridLayoutItem = { ...item };
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
