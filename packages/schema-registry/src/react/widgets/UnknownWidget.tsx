'use client';
import React from 'react';

interface Props { type: string; }
export function UnknownWidget({ type }: Props) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      Widget type unknown: {type}
    </div>
  );
}
