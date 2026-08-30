import { useRef, useState, type KeyboardEvent } from 'react';
import type { CellEditorProps } from '../types.js';
import { useAutoFocusSelect } from './useAutoFocusSelect.js';

/** Value convention: ISO date string 'YYYY-MM-DD'. Kept as a plain string
 * (not a Date object) deliberately — a Date carries a timezone the grid has
 * no basis to guess, and a bare ISO date string round-trips exactly through
 * TSV copy/paste with no ambiguity. */
export function DateEditor(props: CellEditorProps): React.ReactElement {
  const { value, initialInputChar, onCommit, onCancel, column } = props;
  const [text, setText] = useState<string>(() => initialInputChar ?? (value == null ? '' : String(value)));
  const ref = useRef<HTMLInputElement>(null);
  useAutoFocusSelect(ref, Boolean(initialInputChar));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(text === '' ? null : text);
    }
  };

  return (
    <input
      aria-label={`Edit ${column.header}`}
      ref={ref}
      type="date"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(text === '' ? null : text)}
      className="h-full w-full border-0 bg-transparent px-2 text-sm text-foreground outline-none ring-2 ring-inset ring-primary"
    />
  );
}
