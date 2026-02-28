import { create } from 'zustand';
import type { AppStore } from '@/types';

/**
 * General application state store.
 *
 * Tracks connectivity, sync status, and notification counts.
 */
export const useAppStore = create<AppStore>((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  isOnline: true,
  lastSyncAt: null,
  notificationCount: 0,

  // ── Actions ────────────────────────────────────────────────────────────────

  setOnline: (online: boolean) => set({ isOnline: online }),

  setLastSync: (date: string) => set({ lastSyncAt: date }),

  setNotificationCount: (count: number) => set({ notificationCount: count }),

  incrementNotifications: () =>
    set((state) => ({ notificationCount: state.notificationCount + 1 })),

  clearNotifications: () => set({ notificationCount: 0 }),
}));
