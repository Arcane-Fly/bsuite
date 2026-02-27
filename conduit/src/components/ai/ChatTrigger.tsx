'use client';

/**
 * ChatTrigger — Floating action button to open Jodie's chat panel.
 *
 * Neon Electric themed with pulse animation.
 */

import { Sparkles } from 'lucide-react';

interface ChatTriggerProps {
  onClick: () => void;
}

export function ChatTrigger({ onClick }: ChatTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-[#2563eb] to-[#00cec9] shadow-lg shadow-[#2563eb]/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#2563eb]/30 active:scale-95"
      title="Chat with Jodie"
      aria-label="Open AI assistant"
    >
      <Sparkles className="h-6 w-6 text-white transition-transform group-hover:rotate-12" />
      <span className="absolute -right-1 -top-1 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00cec9] opacity-75" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-[#00cec9]" />
      </span>
    </button>
  );
}
