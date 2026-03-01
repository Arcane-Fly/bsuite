/**
 * AI Store — Zustand store for Scout (AI recruitment assistant) state
 *
 * Manages:
 * - Chat panel visibility
 * - Chat history (persisted to localStorage)
 * - Usage quota tracking
 * - Active context (job/candidate currently being viewed)
 * - Tool execution state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────

export interface ToolExecution {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'pending' | 'running' | 'completed' | 'error';
  result?: Record<string, unknown>;
  error?: string;
}

export interface UsageQuota {
  used: number;
  limit: number;
}

export type UserTier = 'essentials' | 'professional' | 'enterprise';

export type ActiveContextType = 'job' | 'candidate' | null;

interface ActiveContext {
  type: ActiveContextType;
  id: string | null;
}

// ─── Store Interface ─────────────────────────────────────────────────

interface AIStore {
  // Panel State
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;

  // Conversation Reset
  clearConversation: () => void;

  // Loading State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Usage Quota
  quotaRemaining: number;
  setQuotaRemaining: (quota: number) => void;
  decrementQuota: () => void;
  usageQuota: UsageQuota;
  setUsageQuota: (quota: UsageQuota) => void;

  // Active Context
  activeContext: ActiveContext;
  setActiveContext: (ctx: ActiveContext) => void;
  clearActiveContext: () => void;

  // Tool Executions
  toolExecutions: ToolExecution[];
  addToolExecution: (exec: ToolExecution) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  clearToolExecutions: () => void;

  // Subscription State
  userTier: UserTier;
  setUserTier: (tier: UserTier) => void;
  aiEnabled: boolean;
  setAIEnabled: (enabled: boolean) => void;

  // Helpers
  isQuotaExceeded: () => boolean;
  isNearQuota: () => boolean;
}

// ─── Default Quota by Tier ───────────────────────────────────────────

const TIER_QUOTAS: Record<UserTier, number> = {
  essentials: 100,
  professional: 500,
  enterprise: 10_000,
};

// ─── Store ───────────────────────────────────────────────────────────

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // Panel
      isOpen: false,
      setIsOpen: (open) => set({ isOpen: open }),
      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

      // Conversation Reset
      clearConversation: () => set({ toolExecutions: [] }),

      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Quota
      quotaRemaining: TIER_QUOTAS.essentials,
      setQuotaRemaining: (quota) => set({ quotaRemaining: quota }),
      decrementQuota: () =>
        set((s) => ({
          quotaRemaining: Math.max(0, s.quotaRemaining - 1),
          usageQuota: {
            ...s.usageQuota,
            used: s.usageQuota.used + 1,
          },
        })),
      usageQuota: { used: 0, limit: TIER_QUOTAS.essentials },
      setUsageQuota: (quota) => set({ usageQuota: quota }),

      // Active Context
      activeContext: { type: null, id: null },
      setActiveContext: (ctx) => set({ activeContext: ctx }),
      clearActiveContext: () =>
        set({ activeContext: { type: null, id: null } }),

      // Tool Executions
      toolExecutions: [],
      addToolExecution: (exec) =>
        set((s) => ({ toolExecutions: [...s.toolExecutions, exec] })),
      updateToolExecution: (id, updates) =>
        set((s) => ({
          toolExecutions: s.toolExecutions.map((te) =>
            te.id === id ? { ...te, ...updates } : te,
          ),
        })),
      clearToolExecutions: () => set({ toolExecutions: [] }),

      // Subscription
      userTier: 'essentials',
      setUserTier: (tier) =>
        set({
          userTier: tier,
          quotaRemaining: TIER_QUOTAS[tier],
          usageQuota: { used: 0, limit: TIER_QUOTAS[tier] },
        }),
      aiEnabled: true,
      setAIEnabled: (enabled) => set({ aiEnabled: enabled }),

      // Helpers
      isQuotaExceeded: () => {
        const { usageQuota } = get();
        return usageQuota.used >= usageQuota.limit;
      },
      isNearQuota: () => {
        const { usageQuota } = get();
        if (usageQuota.limit === 0) return false;
        return usageQuota.used / usageQuota.limit >= 0.8;
      },
    }),
    {
      name: 'conduit-ai-store',
      partialize: (state) => ({
        usageQuota: state.usageQuota,
        quotaRemaining: state.quotaRemaining,
        userTier: state.userTier,
      }),
    },
  ),
);
