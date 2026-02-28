'use client';

/**
 * AIMessage — Individual message bubble for user/assistant messages.
 *
 * Supports markdown-like rendering with whitespace preservation.
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { ScoutIcon } from './ScoutIcon';

interface AIMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  className?: string;
}

export function AIMessage({
  role,
  content,
  timestamp,
  className,
}: AIMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex items-start gap-2.5',
        isUser ? 'flex-row-reverse' : '',
        className,
      )}
      data-testid="ai-message"
      data-role={role}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary/20' : 'bg-primary',
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ScoutIcon className="h-3.5 w-3.5 text-primary-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div className="flex max-w-[80%] flex-col">
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser
              ? 'rounded-tr-none bg-primary text-primary-foreground'
              : 'rounded-tl-none bg-muted text-foreground',
          )}
        >
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">
            {timestamp.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
