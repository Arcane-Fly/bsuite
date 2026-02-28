'use client';

/**
 * AIMessageList — Scrollable message list with auto-scroll and empty state.
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { ScoutIcon } from './ScoutIcon';
import { useEffect, useRef } from 'react';

import { AIMessage } from './AIMessage';
import { AITypingIndicator } from './AITypingIndicator';

interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface AIMessageListProps {
  messages: MessageData[];
  isLoading?: boolean;
  className?: string;
}

export function AIMessageList({
  messages,
  isLoading = false,
  className,
}: AIMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto', className)}
      data-testid="message-list"
    >
      <div className="flex flex-col gap-4 p-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ScoutIcon className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mb-2 text-lg font-semibold text-foreground">
              Hi, I&apos;m Scout!
            </h4>
            <p className="max-w-xs text-sm text-muted-foreground">
              I can help you search candidates, manage your pipeline,
              schedule interviews, and analyse recruitment metrics.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <AIMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))
        )}

        {isLoading && <AITypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
