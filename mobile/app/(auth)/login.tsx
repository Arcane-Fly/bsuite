import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Button, Input, useToast } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/lib/constants';

function isValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

/**
 * Login screen with email + password authentication.
 * Inline validation on blur, toast for non-blocking feedback.
 */
export default function LoginScreen() {
  const { signIn, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validateEmail = useCallback((value: string, touched: boolean) => {
    if (!touched) return null;
    if (!value.trim()) return 'Email is required.';
    if (!isValidEmail(value.trim())) return 'Enter a valid email address.';
    return null;
  }, []);

  const validatePassword = useCallback((value: string, touched: boolean) => {
    if (!touched) return null;
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }, []);

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (emailTouched) {
        setEmailError(validateEmail(value, true));
      }
    },
    [emailTouched, validateEmail]
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (passwordTouched) {
        setPasswordError(validatePassword(value, true));
      }
    },
    [passwordTouched, validatePassword]
  );

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(email, true));
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password, true));
  }, [password, validatePassword]);

  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    const eErr = validateEmail(email, true);
    const pErr = validatePassword(password, true);
    setEmailError(eErr);
    setPasswordError(pErr);

    if (eErr || pErr) return;

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setPasswordError(null);
      showToast('error', 'Sign In Failed', message);
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
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            error={emailError ?? undefined}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            error={passwordError ?? undefined}
            hint={
              !passwordError && passwordTouched && password.length >= 6
                ? undefined
                : undefined
            }
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

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
              showToast('info', 'Coming Soon', 'Google SSO will be available soon.');
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
