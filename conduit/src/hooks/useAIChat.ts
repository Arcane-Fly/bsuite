'use client';

/**
 * useAIChat — Custom hook for Conduit's AI chat with Jodie.
 *
 * Wraps @ai-sdk/react's useChat with Conduit-specific auth and transport.
 * AI SDK v6 uses TextStreamChatTransport for HTTP streaming.
 */

import { createClient } from '@/lib/supabase/client';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useEffect, useMemo, useState } from 'react';

export function useAIChat() {
  const [token, setToken] = useState<string | null>(null);

  // Get the session token for API auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/ai/chat',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    [token],
  );

  const chat = useChat({
    id: 'conduit-jodie',
    transport,
  });

  return {
    ...chat,
    isAuthenticated: !!token,
  };
}
