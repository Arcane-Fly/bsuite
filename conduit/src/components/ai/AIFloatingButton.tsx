'use client';

/**
 * AIFloatingButton — Fixed bottom-right trigger button for Scout.
 *
 * Features:
 * - Animated pulse indicator
 * - Usage warning badge when near quota
 * - Disabled state when AI is off
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { ScoutIcon } from './ScoutIcon';

interface AIFloatingButtonProps {
  onClick: () => void;
  showUsageWarning?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AIFloatingButton({
  onClick,
  showUsageWarning = false,
  disabled = false,
  className,
}: AIFloatingButtonProps) {
  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="ai-floating-button"
        className={cn(
          'relative flex h-14 w-14 items-center justify-center overflow-visible rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-all hover:scale-105 hover:shadow-xl',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        aria-label="Open Scout AI assistant"
      >
        <ScoutIcon className="h-6 w-6" />

        {/* Sparkle decoration */}
        <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-chart-4" />

        {/* Usage warning badge */}
        {showUsageWarning && (
          <span
            className={cn(
              'absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center',
              'rounded-full bg-destructive text-[10px] font-bold text-primary-foreground',
            )}
          >
            !
          </span>
        )}

        {/* Pulse indicator */}
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-chart-2" />
        </span>
      </button>
    </div>
  );
}
