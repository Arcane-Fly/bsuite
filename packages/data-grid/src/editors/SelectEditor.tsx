import { useRef, type KeyboardEvent } from 'react';
import type { CellEditorProps } from '../types.js';
import { useAutoFocusSelect } from './useAutoFocusSelect.js';

export function SelectEditor(props: CellEditorProps): React.ReactElement {
  const { value, column, onCommit, onCancel } = props;
  const ref = useRef<HTMLSelectElement>(null);
  useAutoFocusSelect(ref, false);
  const options = column.options ?? [];
  const current = value == null ? '' : String(value);

  const handleKeyDown = (e: KeyboardEvent<HTMLSelectElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <select
      aria-label={`Edit ${column.header}`}
      ref={ref}
      value={current}
      onChange={(e) => onCommit(e.target.value === '' ? null : e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(current === '' ? null : current)}
      className="h-full w-full border-0 bg-transparent px-2 text-sm text-foreground outline-none ring-2 ring-inset ring-primary"
    >
      <option value="" />
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
