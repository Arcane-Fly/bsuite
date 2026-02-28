'use client';

/**
 * AICommandPalette — Keyboard shortcut listener for Cmd/Ctrl+K
 *
 * Renders nothing visible. Listens for keyboard events to open Scout.
 */

import { useEffect } from 'react';

interface AICommandPaletteProps {
  onOpenAI: () => void;
  enabled?: boolean;
}

export function AICommandPalette({
  onOpenAI,
  enabled = true,
}: AICommandPaletteProps) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenAI();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAI, enabled]);

  return null;
}
