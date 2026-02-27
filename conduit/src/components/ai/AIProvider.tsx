'use client';

/**
 * AIProvider — Wraps the chat panel + trigger state management.
 *
 * Drop this into the layout to add Jodie AI to any page.
 */

import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { ChatTrigger } from './ChatTrigger';

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {children}
      <ChatTrigger onClick={() => setIsChatOpen(true)} />
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
