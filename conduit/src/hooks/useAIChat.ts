'use client';

/**
 * useAIChat — Full chat hook for Scout (Conduit AI assistant)
 *
 * Wraps @ai-sdk/react's useChat with:
 * - Supabase SSR auth token management
 * - Zustand store integration for quota tracking
 * - Tool execution state management
 * - Streaming status derived from chat.status
 *
 * Uses AI SDK v3 conventions:
 * - Input state managed locally via useState
 * - DefaultChatTransport for full-featured streaming (tools, usage, finish reasons)
 * - UIMessage uses parts[] for content extraction
 */

import { createClient } from '@/lib/supabase/client';
import { useAIStore } from '@/stores/aiStore';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Extract text content from v3 UIMessage parts */
function extractTextContent(
  parts: ReadonlyArray<{ type: string; text?: string }>,
): string {
  return parts
    .filter(
      (p): p is { type: 'text'; text: string } =>
        p.type === 'text' && typeof p.text === 'string',
    )
    .map((p) => p.text)
    .join('');
}

export function useAIChat() {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const timestampsRef = useRef<Map<string, Date>>(new Map());

  const {
    decrementQuota,
    isQuotaExceeded,
    addToolExecution,
  } = useAIStore();

  // ─── Auth Token Management ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Transport Configuration ────────────────────────────────────
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    [token],
  );

  // ─── AI SDK Chat Hook ──────────────────────────────────────────
  const chat = useChat({
    id: 'conduit-scout',
    transport,
    onFinish: () => {
      decrementQuota();
    },
    onToolCall: ({ toolCall }) => {
      const toolArgs = 'args' in toolCall
        ? (toolCall.args as Record<string, unknown>)
        : {};
      addToolExecution({
        id: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolArgs,
        state: 'running',
      });
    },
  });

  // ─── Derived State ─────────────────────────────────────────────
  const isLoading = chat.status === 'submitted' || chat.status === 'streaming';
  const quotaExceeded = isQuotaExceeded();

  // Map UIMessages to stable format with timestamps
  // eslint-disable-next-line react-hooks/refs -- timestampsRef is an intentional stable cache, not a DOM ref
  const mappedMessages = useMemo(() => {
    return chat.messages.map((msg) => {
      if (!timestampsRef.current.has(msg.id)) {
        timestampsRef.current.set(msg.id, new Date());
      }

      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: extractTextContent(msg.parts ?? []),
        timestamp: timestampsRef.current.get(msg.id)!,
        parts: msg.parts,
      };
    });
  }, [chat.messages]);

  // ─── Submit Handlers ───────────────────────────────────────────
  const submitMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || quotaExceeded) return;
      chat.sendMessage({ text: trimmed });
    },
    [quotaExceeded, chat],
  );

  const handleSubmit = useCallback(() => {
    submitMessage(input);
    setInput('');
  }, [input, submitMessage]);

  // ─── Return ────────────────────────────────────────────────────
  return {
    messages: mappedMessages,
    rawMessages: chat.messages,
    input,
    setInput,
    handleSubmit,
    submitMessage,
    sendMessage: chat.sendMessage,
    setMessages: chat.setMessages,
    status: chat.status,
    isLoading,
    isAuthenticated: !!token,
    isQuotaExceeded: quotaExceeded,
    error: chat.error,
  };
}
