import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Custom storage adapter using expo-secure-store for native platforms.
 * Falls back to localStorage on web.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Supabase client configured for React Native with secure token storage.
 *
 * IMPORTANT: Do not hardcode credentials. Use EXPO_PUBLIC_* env vars.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    // supabase-js DEFAULTS flowType to 'implicit' — see its own
    // dist/main/lib/constants.js: DEFAULT_AUTH_OPTIONS. Omitting this does not fall back
    // to PKCE; it silently selects the implicit flow, which returns tokens in a URL
    // fragment and is the wrong choice for a native app holding a secure store.
    //
    // Every other client in the estate declares it, and @supabase/ssr hardcodes it. This
    // file was the only one running implicit, and the guard that should have caught it
    // was skipping mobile/ as "out of scope" while its own gate checked out no
    // submodules and passed 0/0.
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
