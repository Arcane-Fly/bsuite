import { useEffect, type RefObject } from 'react';

/**
 * Dismisses a non-modal floating surface (tip panel, popover-like hint) on
 * an outside pointer-down or the Escape key.
 *
 * This is intentionally NOT a focus trap / modal primitive — the surfaces it
 * targets in this package (e.g. the Schema Builder quick-start tip) sit
 * beside interactive canvas content rather than blocking it, so trapping
 * focus would be wrong. For a true modal, use the package's native
 * `<dialog>` pattern (see RelationshipConfigDialog / FieldCreateDialog),
 * which gets Escape-to-close and a backdrop for free from the browser.
 *
 * Self-contained on purpose: `EntityPropertiesPanel`'s docblock records the
 * package's "zero design-system dependency" rule (plain HTML + Tailwind, no
 * `@bsuite/ui`/shadcn import), so this hook stays pure React rather than
 * pulling in a Radix primitive. It is small enough to duplicate the
 * one BSuite already has in `packages/nav-core/src/AppSwitcher.tsx` without
 * meaningfully growing the bundle either app depends on.
 */
export function useDismissOnOutsideOrEscape(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current && !ref.current.contains(target)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDismiss();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onDismiss]);
}
