'use client';

/**
 * AISheet — Responsive slide-out panel for Scout AI assistant.
 *
 * Sizing:
 * - Mobile: 100% width
 * - Tablet (md): 60% width
 * - Desktop (lg): 40% width, max 672px
 *
 * Includes backdrop overlay and smooth slide-in/out transition.
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { useEffect, type ReactNode } from 'react';

interface AISheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function AISheet({ open, onOpenChange, children }: AISheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col',
          'w-full md:w-[60%] lg:w-[40%] lg:max-w-2xl',
          'border-l border-border bg-background shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Scout AI Assistant"
        data-testid="ai-sheet"
      >
        {children}
      </div>
    </>
  );
}
