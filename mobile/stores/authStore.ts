import { create } from 'zustand';
import type { AuthStore } from '@/types';
import { supabase } from '@/lib/supabase';

/**
 * Authentication store using Zustand.
 *
 * Manages user session state, sign-in/sign-out flows, and session
 * persistence via Supabase + SecureStore.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Initialize auth by checking for an existing session.
   * Call this once in the root layout on mount.
   */
  initialize: async () => {
    try {
      set({ isLoading: true });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Listen for auth state changes (token refresh, sign-out, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
        });
      });

      // Store unsubscribe for cleanup on sign-out
      (useAuthStore as unknown as { _authSubscription?: { unsubscribe: () => void } })._authSubscription = subscription;
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  /**
   * Sign in with email and password via Supabase.
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({
      user: data.session?.user ?? null,
      session: data.session,
      isAuthenticated: !!data.session,
      isLoading: false,
    });
  },

  /**
   * Sign out, clearing session from state and secure storage.
   */
  signOut: async () => {
    set({ isLoading: true });

    // Clean up auth state change listener
    const sub = (useAuthStore as unknown as { _authSubscription?: { unsubscribe: () => void } })._authSubscription;
    if (sub) {
      sub.unsubscribe();
      (useAuthStore as unknown as { _authSubscription?: { unsubscribe: () => void } })._authSubscription = undefined;
    }

    await supabase.auth.signOut();

    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  /**
   * Manually set a session (used by auth state change listener).
   */
  setSession: (session) => {
    set({
      user: session?.user ?? null,
      session,
      isAuthenticated: !!session,
    });
  },
}));
