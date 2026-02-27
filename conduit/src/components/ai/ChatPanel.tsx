'use client';

/**
 * ChatPanel — Sliding AI chat panel for Jodie in Conduit.
 *
 * Neon Electric themed, slides in from the right.
 * Uses the useAIChat hook for AI SDK v6 streaming.
 */

import { useAIChat } from '@/hooks/useAIChat';
import type { UIMessage } from 'ai';
import {
    Bot,
    ChevronDown,
    Loader2,
    Send,
    Sparkles,
    User,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { messages, sendMessage, status, error, isAuthenticated, setMessages } =
    useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || !isAuthenticated) return;
      sendMessage({ text: input.trim() });
      setInput('');
    },
    [input, isLoading, isAuthenticated, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[#00cec9]/20 bg-[#0a0e1a] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00cec9]/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#2563eb] to-[#00cec9]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Jodie</h3>
              <p className="text-xs text-[#00cec9]/70">
                Recruitment AI Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              title="Clear chat"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#2563eb]/20 to-[#00cec9]/20">
                <Bot className="h-8 w-8 text-[#00cec9]" />
              </div>
              <h4 className="mb-2 text-lg font-semibold text-white">
                Hi, I&apos;m Jodie!
              </h4>
              <p className="max-w-xs text-sm text-gray-400">
                I can help you search candidates, manage your pipeline, schedule
                interviews, and analyse recruitment metrics.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  'Show pipeline overview',
                  'Find candidates with React skills',
                  'Upcoming interviews this week',
                  'Recruitment summary',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      sendMessage({ text: suggestion });
                    }}
                    className="rounded-full border border-[#00cec9]/30 px-3 py-1.5 text-xs text-[#00cec9] transition-colors hover:bg-[#00cec9]/10"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message: UIMessage) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="mb-3 flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#2563eb] to-[#00cec9]">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-lg rounded-tl-none bg-white/5 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#00cec9]" />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg border border-[#ff4757]/30 bg-[#ff4757]/10 px-3 py-2 text-sm text-[#ff4757]">
              {error.message || 'An error occurred. Please try again.'}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[#00cec9]/20 px-4 py-3"
        >
          <div className="flex items-end gap-2 rounded-lg border border-[#00cec9]/20 bg-white/5 px-3 py-2 focus-within:border-[#00cec9]/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAuthenticated
                  ? 'Ask Jodie anything about recruitment...'
                  : 'Sign in to chat with Jodie'
              }
              disabled={!isAuthenticated || isLoading}
              rows={1}
              className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isAuthenticated}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2563eb] text-white transition-colors hover:bg-[#2563eb]/80 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-600">
            AI-generated content — always verify important information
          </p>
        </form>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  // Extract text content from parts
  const textContent = message.parts
    ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n') || '';

  return (
    <div className={`mb-3 flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-[#2563eb]/20'
            : 'bg-linear-to-br from-[#2563eb] to-[#00cec9]'
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-[#2563eb]" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-white" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'rounded-tr-none bg-[#2563eb]/20 text-white'
            : 'rounded-tl-none bg-white/5 text-gray-200'
        }`}
      >
        <div className="whitespace-pre-wrap wrap-break-word">{textContent}</div>
      </div>
    </div>
  );
}
