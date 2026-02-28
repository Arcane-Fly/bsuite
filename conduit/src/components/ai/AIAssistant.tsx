'use client';

/**
 * AIAssistant — Root orchestrator for Scout (Conduit AI recruitment assistant).
 *
 * Connects all 11 AI components into a complete chat interface:
 * - Manages panel open/close state via Zustand
 * - Handles quick action submission
 * - Shows upsell when quota exceeded
 * - Hides input when quota exceeded
 * - Integrates keyboard shortcuts via AICommandPalette
 *
 * Mounted in the DashboardShell layout to be available on all pages.
 */

import { useAIChat } from '@/hooks/useAIChat';
import { useAIStore } from '@/stores/aiStore';
import { AICommandPalette } from './AICommandPalette';
import { AIFloatingButton } from './AIFloatingButton';
import { AIHeader } from './AIHeader';
import { AIInputArea } from './AIInputArea';
import { AIMessageList } from './AIMessageList';
import { AIQuickActions } from './AIQuickActions';
import { AISheet } from './AISheet';
import { AIUpsellCard } from './AIUpsellCard';

export function AIAssistant() {
  // ─── Store State ────────────────────────────────────────────────
  const {
    isOpen,
    setIsOpen,
    isNearQuota,
    isQuotaExceeded,
    aiEnabled,
    userTier,
    usageQuota,
    clearMessages: clearStoreMessages,
  } = useAIStore();

  // ─── Chat Hook ─────────────────────────────────────────────────
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    submitMessage,
    setMessages,
    isLoading,
    isAuthenticated,
  } = useAIChat();

  // ─── Derived State ─────────────────────────────────────────────
  const showUsageWarning = isNearQuota();
  const quotaExceeded = isQuotaExceeded();

  // ─── Handlers ──────────────────────────────────────────────────
  const handleOpen = () => {
    if (!aiEnabled) return;
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleQuickAction = (prompt: string) => {
    submitMessage(prompt);
  };

  const handleNewConversation = () => {
    setMessages([]);
    clearStoreMessages();
  };

  const handleUpgrade = () => {
    // Navigate to billing/upgrade page
    // TODO: Implement upgrade flow
    console.info('[Scout] Upgrade clicked, current tier:', userTier);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Keyboard Shortcut Listener (Cmd/Ctrl+K) */}
      <AICommandPalette onOpenAI={handleOpen} enabled={aiEnabled} />

      {/* Floating Trigger Button */}
      {!isOpen && (
        <AIFloatingButton
          onClick={handleOpen}
          showUsageWarning={showUsageWarning}
          disabled={!aiEnabled || !isAuthenticated}
        />
      )}

      {/* Chat Panel */}
      <AISheet open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <AIHeader
          usageQuota={usageQuota}
          showUsageBadge={showUsageWarning}
          onClose={handleClose}
          onNewConversation={handleNewConversation}
        />

        {/* Quick Actions */}
        <AIQuickActions
          onSelectAction={handleQuickAction}
          disabled={quotaExceeded || isLoading || !isAuthenticated}
        />

        {/* Message List */}
        <AIMessageList
          messages={messages}
          isLoading={isLoading}
          className="flex-1"
        />

        {/* Upsell Card (when quota exceeded) */}
        {quotaExceeded && (
          <div className="p-4">
            <AIUpsellCard
              reason="quota_exceeded"
              currentTier={userTier}
              targetTier={
                userTier === 'essentials' ? 'professional' : 'enterprise'
              }
              onUpgrade={handleUpgrade}
            />
          </div>
        )}

        {/* Input Area (hidden when quota exceeded) */}
        {!quotaExceeded && (
          <AIInputArea
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading || !isAuthenticated}
            placeholder={
              isAuthenticated
                ? 'Ask Scout about recruitment...'
                : 'Sign in to chat with Scout'
            }
          />
        )}
      </AISheet>
    </>
  );
}
