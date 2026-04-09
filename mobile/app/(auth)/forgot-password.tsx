import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Button, Input, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/constants';

function isValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

/**
 * Forgot password screen with inline email validation and toast feedback.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = useCallback((value: string, touched: boolean) => {
    if (!touched) return null;
    if (!value.trim()) return 'Email is required.';
    if (!isValidEmail(value.trim())) return 'Enter a valid email address.';
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

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(email, true));
  }, [email, validateEmail]);

  const handleReset = async () => {
    setEmailTouched(true);
    const err = validateEmail(email, true);
    setEmailError(err);
    if (err) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setIsSent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset email.';
      showToast('error', 'Reset Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="rounded-2xl bg-success/10 p-4 mb-4">
          <Mail size={40} color={Colors.success} />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center mb-2">
          Check your email
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-8">
          We sent a password reset link to{' '}
          <Text className="text-foreground font-medium">{email}</Text>
        </Text>
        <Button
          label="Back to Sign In"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Button
          label="Back"
          variant="ghost"
          icon={<ArrowLeft size={18} color={Colors.mutedForeground} />}
          onPress={() => router.back()}
          size="sm"
        />

        <View className="mt-8 mb-8">
          <Text className="text-2xl font-bold text-foreground mb-2">
            Reset password
          </Text>
          <Text className="text-base text-muted-foreground">
            Enter the email address associated with your BSuite account and we will
            send you a link to reset your password.
          </Text>
        </View>

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

          <Button
            label="Send Reset Link"
            onPress={handleReset}
            isLoading={isLoading}
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
