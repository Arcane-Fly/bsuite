'use client';

/**
 * AITypingIndicator — Animated dots shown while Scout is thinking.
 *
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

export function AITypingIndicator() {
  return (
    <div className="flex items-start" data-testid="typing-indicator">
      <div className="rounded-lg bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Scout is thinking
          </span>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
