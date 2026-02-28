'use client';

/**
 * AIToolCard — Displays tool execution status and results.
 *
 * Shows pending, running, completed, and error states for AI tool calls.
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import type { ToolExecution } from '@/stores/aiStore';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';

interface AIToolCardProps {
  execution: ToolExecution;
  className?: string;
}

/** Format tool name for display: snake_case to Title Case */
function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AIToolCard({ execution, className }: AIToolCardProps) {
  const { toolName, args, state, result, error } = execution;
  const displayName = formatToolName(toolName);

  if (state === 'pending' || state === 'running') {
    return (
      <div
        className={cn(
          'rounded-lg border border-primary/30 bg-primary/5 p-3',
          className,
        )}
        data-testid="tool-card-running"
      >
        <div className="flex items-start gap-2">
          {state === 'running' ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {state === 'running' ? 'Running' : 'Pending'}: {displayName}
            </p>
            {Object.keys(args).length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {Object.entries(args).map(([key, value]) => (
                  <li key={key} className="text-xs text-muted-foreground">
                    <span className="font-medium">{key}:</span>{' '}
                    {String(value)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'completed') {
    const resultMessage =
      result && 'message' in result
        ? String(result.message)
        : `${displayName} completed`;

    return (
      <div
        className={cn(
          'rounded-lg border border-chart-2/30 bg-chart-2/5 p-3',
          className,
        )}
        data-testid="tool-card-success"
      >
        <div className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-chart-2" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resultMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={cn(
          'rounded-lg border border-destructive/30 bg-destructive/5 p-3',
          className,
        )}
        data-testid="tool-card-error"
      >
        <div className="flex items-start gap-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {displayName} Failed
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {error || 'An error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
