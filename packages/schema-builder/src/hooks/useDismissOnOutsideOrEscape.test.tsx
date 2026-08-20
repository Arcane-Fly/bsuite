import { act, render } from '@testing-library/react';
import { createRef, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismissOnOutsideOrEscape } from './useDismissOnOutsideOrEscape.js';

function Harness({
  active,
  onDismiss,
}: {
  active: boolean;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissOnOutsideOrEscape(ref, active, onDismiss);
  return (
    <div>
      <div ref={ref} data-testid="panel">
        panel content
      </div>
      <button type="button" data-testid="outside">
        outside
      </button>
    </div>
  );
}

describe('useDismissOnOutsideOrEscape', () => {
  it('calls onDismiss on an outside pointerdown', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness active onDismiss={onDismiss} />);
    act(() => {
      getByTestId('outside').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      );
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss on a pointerdown inside the ref', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness active onDismiss={onDismiss} />);
    act(() => {
      getByTestId('panel').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      );
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss on Escape', () => {
    const onDismiss = vi.fn();
    render(<Harness active onDismiss={onDismiss} />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does nothing when inactive', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(
      <Harness active={false} onDismiss={onDismiss} />,
    );
    act(() => {
      getByTestId('outside').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not throw when the ref is unattached', () => {
    const onDismiss = vi.fn();
    const ref = createRef<HTMLDivElement>();
    function UnattachedHarness() {
      useDismissOnOutsideOrEscape(ref, true, onDismiss);
      return <button type="button" data-testid="outside">outside</button>;
    }
    const { getByTestId } = render(<UnattachedHarness />);
    expect(() => {
      act(() => {
        getByTestId('outside').dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true }),
        );
      });
    }).not.toThrow();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
