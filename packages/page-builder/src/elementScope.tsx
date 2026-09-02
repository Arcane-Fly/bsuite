import * as React from 'react';

/**
 * EVERY ELEMENT NEEDS A NAME BEFORE ANYTHING CAN STYLE IT.
 *
 * The operator's complaint: "I'm sick of seeing buttons that go the full width of
 * cards and not being able to modify it visually." Measured 2026-09-02: 270
 * full-width buttons, 236 of them on pages he can already rearrange — so the
 * mouse obeys him on a card's outside edge and ignores him on its inside.
 *
 * The blocker is not styling. It is IDENTITY. Nothing in the estate has ever
 * stored a per-element property (except `colSpan` on a form field), because
 * there has been no way to say WHICH element a stored value belongs to. A card
 * has a `cardKey`; the button inside it has nothing.
 *
 * This module is that identity, and nothing else. No stored styles, no visual
 * change at rest — a deliberate first step, so the thing everything else hangs
 * off can be reviewed on its own.
 *
 * THE HOT PATH IS THE DESIGN CONSTRAINT. `Button` renders 2,097 times in crm7,
 * and on the 34 EnhancedDataTable pages that is once per row per action column.
 * So:
 *   - the context default is `null`, and a `useContext` returning null is about
 *     the cheapest hook there is;
 *   - NOTHING is computed unless `isEditing` is true. A consumer's whole cost
 *     outside edit mode is one null check.
 * Building the reference string on every render would have been a real
 * regression on the tables, which is why `elementRef` is a function the consumer
 * calls rather than a value this provider computes.
 */

export interface ElementScope {
  /** The page this element lives on — `PageGridLayout`'s own `pageKey`. */
  pageKey: string;
  /** The card it lives in — `GridItem`'s `id`. */
  cardKey: string;
  /** What the card calls itself, for a sentence a person can read. */
  cardLabel?: string;
  /**
   * Whether the page editor is open. Gates every cost above; a consumer that
   * reads this and returns early pays one boolean.
   */
  isEditing: boolean;
}

const ElementScopeContext = React.createContext<ElementScope | null>(null);

/**
 * Provided by `GridItem`, which is the only component that knows both the page
 * and the card. Consumers never construct one.
 */
export function ElementScopeProvider({
  scope,
  children,
}: {
  scope: ElementScope;
  children: React.ReactNode;
}): React.JSX.Element {
  /* Memoised on its fields rather than on the object, or every GridItem render
     would hand its subtree a new context value and re-render every button in
     the card for nothing. */
  const value = React.useMemo(
    () => scope,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.pageKey, scope.cardKey, scope.cardLabel, scope.isEditing],
  );
  return <ElementScopeContext.Provider value={value}>{children}</ElementScopeContext.Provider>;
}

/**
 * The scope this element sits in, or `null` outside a grid page.
 *
 * `null` is a normal answer, not an error: most of the estate renders outside a
 * `PageGridLayout`, and an element with no scope simply cannot be addressed yet.
 */
export function useElementScope(): ElementScope | null {
  return React.useContext(ElementScopeContext);
}

/**
 * A stable address for one element.
 *
 * SHAPE: `page:<pageKey>|card:<cardKey>|el:<name>`. Chosen so it is greppable,
 * sorts by page then card, and survives being read by a human in a database row.
 *
 * `name` is the element's own stable identifier — NOT its visible label. A label
 * is a moving target: rename "Add contact" to "New contact" and every stored
 * override keyed on it orphans silently. Callers pass something that does not
 * change when the copy does.
 */
export function elementRef(scope: ElementScope, name: string): string {
  return `page:${scope.pageKey}|card:${scope.cardKey}|el:${name}`;
}

/**
 * The same address as a sentence, for a tooltip or a property panel.
 *
 * Uses the card's LABEL rather than its key, because "the Contacts card" is what
 * a person sees and `card3` is not.
 */
export function describeElement(scope: ElementScope, name: string): string {
  const where = scope.cardLabel?.trim() ? `the ${scope.cardLabel.trim()} card` : 'this card';
  return `${name}, in ${where}`;
}

/** Parses an address back into its parts, or `null` if it is not one. */
export function parseElementRef(
  ref: string,
): { pageKey: string; cardKey: string; name: string } | null {
  const parts = ref.split('|');
  if (parts.length !== 3) return null;
  const [p, c, e] = parts;
  if (!p.startsWith('page:') || !c.startsWith('card:') || !e.startsWith('el:')) return null;
  const pageKey = p.slice('page:'.length);
  const cardKey = c.slice('card:'.length);
  const name = e.slice('el:'.length);
  if (!pageKey || !cardKey || !name) return null;
  return { pageKey, cardKey, name };
}
