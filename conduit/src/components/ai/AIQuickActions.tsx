'use client';

/**
 * AIQuickActions — Collapsible panel with 4 recruitment quick action buttons.
 *
 * Actions:
 * 1. Find candidates for [job]
 * 2. Pipeline summary
 * 3. Draft rejection email
 * 4. Schedule interview
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface AIQuickActionsProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

interface QuickAction {
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Find candidates for job',
    prompt: 'Find the best candidates for our most recent open job posting',
  },
  {
    label: 'Pipeline summary',
    prompt: 'Give me a pipeline summary with stage counts and any bottlenecks',
  },
  {
    label: 'Draft rejection email',
    prompt:
      'Help me draft a professional and empathetic rejection email for a candidate',
  },
  {
    label: 'Schedule interview',
    prompt:
      'Help me schedule an interview — suggest available time slots for today or tomorrow',
  },
];

export function AIQuickActions({
  onSelectAction,
  disabled = false,
}: AIQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full">
      <div className="border-b border-border px-4 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <span>Quick Actions</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 gap-2 p-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onSelectAction(action.prompt)}
              disabled={disabled}
              className={cn(
                'rounded-full border border-border px-3 py-1.5 text-xs font-medium',
                'text-foreground transition-colors',
                'hover:bg-secondary hover:text-foreground',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
