import { useEffect, type RefObject } from 'react';

/**
 * Closes a native modal `<dialog>` when the user clicks its backdrop.
 *
 * THE BROWSER DOES NOT DO THIS FOR YOU, and the sibling hook in this directory
 * says it does. `useDismissOnOutsideOrEscape`'s docblock reads:
 *
 *   "For a true modal, use the package's native `<dialog>` pattern ... which
 *    gets Escape-to-close and a backdrop for free from the browser."
 *
 * `showModal()` gets you Escape-to-close and a backdrop ELEMENT. It does not
 * get you backdrop-click dismissal — that is `closedby="any"`, which is not yet
 * safe to rely on across the browsers this estate supports. Reading "a backdrop
 * for free" as "light dismiss for free" is how all five modal dialogs in this
 * package shipped unable to close on a click away.
 *
 * The operator reported it against conduit's Schema Builder: "'i' messages,
 * menus and toast like notices dont close when the user clicks away. this
 * obscures view." This package is consumed by conduit, crm7, BSU and
 * throughput, so one omission presented as a suite-wide fault.
 *
 * Closes via `dialog.close()` rather than a caller-supplied callback, so a
 * backdrop click travels the exact path Escape already does — through the
 * element's own `onClose`. There is no second way to close a dialog here that
 * could drift from the first.
 *
 * Self-contained plain React, per this package's zero-design-system-dependency
 * rule (see `EntityPropertiesPanel`'s docblock).
 */
export function useLightDismissDialog(
  ref: RefObject<HTMLDialogElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    function handleClick(event: MouseEvent) {
      const dialog = ref.current;
      if (!dialog?.open) return;

      // A click synthesised by the keyboard — Enter or Space on a focused
      // button — reports clientX/clientY of 0, which lies outside every
      // dialog's rect. Without this guard, submitting the form from the
      // keyboard would dismiss the dialog instead of submitting it.
      if (event.detail === 0) return;

      // Hit-test the rect rather than comparing `event.target`, because a
      // dialog with inner padding receives clicks on its own padding: those
      // land on the dialog element itself and must NOT dismiss.
      const r = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= r.left &&
        event.clientX <= r.left + r.width &&
        event.clientY >= r.top &&
        event.clientY <= r.top + r.height;

      if (!inside) dialog.close();
    }

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [ref, active]);
}
