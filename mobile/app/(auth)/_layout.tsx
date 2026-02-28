import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/lib/constants';

/**
 * Auth group layout — no tabs, simple stack navigation for login/forgot-password.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
