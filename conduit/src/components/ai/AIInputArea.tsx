'use client';

/**
 * AIInputArea — Auto-resizing textarea with send button for Scout.
 *
 * Features:
 * - Auto-resize from 1 to 4 lines
 * - Enter to send, Shift+Enter for new line
 * - Disabled state when loading or quota exceeded
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface AIInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AIInputArea({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask Scout about recruitment...',
}: AIInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea (1-4 lines)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = 24;
    const minHeight = lineHeight;
    const maxHeight = lineHeight * 4;
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight,
    );
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleSendClick = () => {
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  const isSendDisabled = disabled || !value.trim();

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full min-h-[24px] max-h-[96px] resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Press Cmd+K from anywhere
          </p>
        </div>
        <button
          onClick={handleSendClick}
          disabled={isSendDisabled}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-primary text-primary-foreground',
            'transition-colors hover:bg-primary/90',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
