import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/lib/constants';

/**
 * Login screen with email + password authentication.
 * Google SSO button is present but not wired (scaffold only).
 */
export default function LoginScreen() {
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      Alert.alert('Sign In Failed', message);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View className="items-center mb-10">
          <View className="rounded-2xl bg-primary/10 p-4 mb-4">
            <Zap size={40} color={Colors.primary} />
          </View>
          <Text className="text-3xl font-bold text-foreground">BSuite</Text>
          <Text className="mt-2 text-base text-muted-foreground text-center">
            GTO workforce management
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <Input
            label="Email"
            placeholder="you@company.com.au"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          {error && (
            <Text className="text-sm text-destructive text-center">{error}</Text>
          )}

          <Button
            label="Sign In"
            onPress={handleLogin}
            isLoading={isLoading}
            size="lg"
          />

          <Button
            label="Continue with Google"
            variant="outline"
            size="lg"
            onPress={() => {
              Alert.alert('Coming Soon', 'Google SSO will be available soon.');
            }}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Button label="Forgot password?" variant="ghost" size="sm" />
          </Link>
        </View>

        {/* Footer */}
        <View className="mt-12 items-center">
          <Text className="text-xs text-muted">
            BSuite v1.0.0 — Built for Australian GTOs
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
