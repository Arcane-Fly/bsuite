/**
 * @vitest-environment jsdom
 *
 * The operator's report, verbatim: "across the suite as shown here on conduit's
 * Schema Builder, 'i' messages, menues and toast like notices dont close when
 * the user clicks away. this obscurer's view."
 *
 * All five native <dialog> modals in this package were opened with showModal()
 * and none closed on a backdrop click, because the sibling hook's docblock said
 * the browser gives you "a backdrop for free". It gives you a backdrop ELEMENT.
 *
 * jsdom does not lay anything out, so getBoundingClientRect() is all zeros and
 * every click would read as "outside". Each test therefore states the rect it
 * is testing against — which is also what makes the inside-click case provable.
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useLightDismissDialog } from './useLightDismissDialog.js';

beforeAll(() => {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  }
});

/** A dialog occupying x 100..300, y 100..300. */
const RECT = { left: 100, top: 100, width: 200, height: 200 };

function Harness({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open] = useState(true);
  useLightDismissDialog(ref, open);
  return (
    <dialog
      ref={(el) => {
        ref.current = el;
        if (el) {
          el.getBoundingClientRect = () =>
            ({ ...RECT, right: 300, bottom: 300, x: 100, y: 100, toJSON: () => ({}) }) as DOMRect;
          if (!el.open) el.showModal();
        }
      }}
      onClose={onClose}
      data-testid="dlg"
    >
      <button type="button" data-testid="submit">
        Save
      </button>
    </dialog>
  );
}

function clickAt(el: Element, clientX: number, clientY: number, detail = 1) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY, detail }));
}

describe('useLightDismissDialog', () => {
  it('closes when the click lands on the backdrop, outside the dialog rect', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dlg = screen.getByTestId('dlg') as HTMLDialogElement;
    expect(dlg.open).toBe(true);

    clickAt(dlg, 20, 20); // top-left of the viewport — backdrop

    expect(dlg.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on a click inside the dialog, including its own padding', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dlg = screen.getByTestId('dlg') as HTMLDialogElement;

    clickAt(dlg, 200, 200); // dead centre
    clickAt(dlg, 100, 100); // exactly the top-left corner — inside, inclusive
    clickAt(dlg, 300, 300); // exactly the bottom-right corner — inside, inclusive

    expect(dlg.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT close on a keyboard-synthesised click (Enter on a button)', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dlg = screen.getByTestId('dlg') as HTMLDialogElement;

    // Enter on a focused button fires click with detail 0 and coordinates 0,0 —
    // which is outside every rect. Without the detail guard this dismisses the
    // dialog instead of submitting the form.
    clickAt(screen.getByTestId('submit'), 0, 0, 0);

    expect(dlg.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing while inactive — a dialog the caller says is closed stays untouched', () => {
    function Inactive({ onClose }: { onClose: () => void }) {
      const ref = useRef<HTMLDialogElement>(null);
      useLightDismissDialog(ref, false);
      return (
        <dialog
          ref={(el) => {
            ref.current = el;
            if (el) {
              el.getBoundingClientRect = () =>
                ({ ...RECT, right: 300, bottom: 300, x: 100, y: 100, toJSON: () => ({}) }) as DOMRect;
              if (!el.open) el.showModal();
            }
          }}
          onClose={onClose}
          data-testid="dlg"
        />
      );
    }
    const onClose = vi.fn();
    render(<Inactive onClose={onClose} />);
    const dlg = screen.getByTestId('dlg') as HTMLDialogElement;

    clickAt(dlg, 20, 20);

    expect(dlg.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
