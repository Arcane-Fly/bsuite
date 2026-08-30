import { useRef, useState, type KeyboardEvent } from 'react';
import type { CellEditorProps } from '../types.js';
import { useAutoFocusSelect } from './useAutoFocusSelect.js';

export function NumberEditor(props: CellEditorProps): React.ReactElement {
  const { value, initialInputChar, onCommit, onCancel, column } = props;
  const [text, setText] = useState<string>(() => initialInputChar ?? (value == null ? '' : String(value)));
  const ref = useRef<HTMLInputElement>(null);
  useAutoFocusSelect(ref, Boolean(initialInputChar));

  const commit = (): void => {
    if (text.trim() === '') {
      onCommit(null);
      return;
    }
    const num = Number(text);
    onCommit(Number.isNaN(num) ? text : num);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <input
      aria-label={`Edit ${column.header}`}
      ref={ref}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      className="h-full w-full border-0 bg-transparent px-2 text-right text-sm text-foreground outline-none ring-2 ring-inset ring-primary"
    />
  );
}
