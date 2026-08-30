import { useRef, useState, type KeyboardEvent } from 'react';
import type { CellEditorProps } from '../types.js';
import { useAutoFocusSelect } from './useAutoFocusSelect.js';

export function TextEditor(props: CellEditorProps): React.ReactElement {
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
      onCommit(text);
    }
  };

  return (
    <input
      aria-label={`Edit ${column.header}`}
      ref={ref}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(text)}
      className="h-full w-full border-0 bg-transparent px-2 text-sm text-foreground outline-none ring-2 ring-inset ring-primary"
    />
  );
}
