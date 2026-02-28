'use client';

/**
 * AIHeader — Panel header with Scout branding, usage badge, and controls.
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { ScoutIcon } from './ScoutIcon';

interface AIHeaderProps {
  usageQuota?: {
    used: number;
    limit: number;
  };
  showUsageBadge?: boolean;
  onClose: () => void;
  onNewConversation?: () => void;
}

export function AIHeader({
  usageQuota,
  showUsageBadge = false,
  onClose,
  onNewConversation,
}: AIHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <ScoutIcon className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Scout</h2>
          <p className="text-xs text-muted-foreground">
            Recruitment AI Assistant
          </p>
        </div>

        {/* Usage badge */}
        {showUsageBadge && usageQuota && (
          <span
            className={cn(
              'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
              usageQuota.used / usageQuota.limit >= 0.9
                ? 'bg-destructive/10 text-destructive'
                : 'bg-secondary text-secondary-foreground',
            )}
            data-testid="usage-badge"
          >
            {usageQuota.used}/{usageQuota.limit}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            data-testid="new-conversation-button"
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          data-testid="close-button"
          aria-label="Close Scout"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
