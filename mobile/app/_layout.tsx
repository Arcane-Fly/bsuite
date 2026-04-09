import '../global.css';

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/lib/constants';

/**
 * Root layout — handles auth gating and global providers.
 *
 * Checks auth state on mount and redirects to the appropriate route group:
 * - Authenticated users go to (tabs)
 * - Unauthenticated users go to (auth)/login
 */
export default function RootLayout() {
  const { isLoading, isAuthenticated, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="apprentice/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Apprentice',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.foreground,
              headerTitleStyle: { fontWeight: '600' },
              animation: 'slide_from_right',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ToastProvider>
    </ErrorBoundary>
  );
}
