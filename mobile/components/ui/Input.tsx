import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { Colors } from '@/lib/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Text input with label, error, and hint support.
 * Styled for dark theme with D2C palette.
 */
export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  const borderColor = error ? 'border-destructive' : 'border-border';

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      )}
      <TextInput
        className={`rounded-xl border ${borderColor} bg-surface px-4 py-3 text-base text-foreground ${className}`}
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.primary}
        {...props}
      />
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      {hint && !error && (
        <Text className="text-sm text-muted-foreground">{hint}</Text>
      )}
    </View>
  );
}
