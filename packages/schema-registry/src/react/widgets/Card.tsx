'use client';
import React, { useState } from 'react';
interface Props { title: string; collapsible?: boolean; children?: React.ReactNode; }
export function CardWidget({ title, collapsible = false, children }: Props) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">{title}</span>
        {collapsible && (
          <button onClick={() => setOpen(o => !o)} className="text-xs text-muted-foreground" aria-label={open ? 'Collapse' : 'Expand'}>
            {open ? '▲' : '▼'}
          </button>
        )}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
