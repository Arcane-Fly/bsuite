import { useEffect, useRef } from 'react';
import type { CellEditorProps } from '../types.js';

/** Booleans commit immediately on toggle — there is no intermediate "typed
 * but not yet committed" state for a checkbox, unlike text/number/date. */
export function BooleanEditor(props: CellEditorProps): React.ReactElement {
  const { value, onCommit, onCancel, column } = props;
  const ref = useRef<HTMLInputElement>(null);
  const checked = Boolean(value);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <input
      aria-label={`Edit ${column.header}`}
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCommit(e.target.checked)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(!checked);
        }
      }}
      className="h-4 w-4 accent-primary"
    />
  );
}
