import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-600',
  secondary: 'bg-surface-elevated active:bg-surface',
  outline: 'border border-border bg-transparent active:bg-surface',
  destructive: 'bg-destructive active:opacity-80',
  ghost: 'bg-transparent active:bg-surface',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-foreground font-semibold',
  secondary: 'text-foreground font-medium',
  outline: 'text-foreground font-medium',
  destructive: 'text-foreground font-semibold',
  ghost: 'text-muted-foreground font-medium',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2.5 rounded-lg min-h-[44px]',
  md: 'px-5 py-3 rounded-xl min-h-[48px]',
  lg: 'px-6 py-4 rounded-xl min-h-[56px]',
};

const sizeTextClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * Reusable button component with D2C Neon Electric theme variants.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  label,
  isLoading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled || isLoading ? 'opacity-50' : ''
      }`}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fefefe" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            className={`${variantTextClasses[variant]} ${sizeTextClasses[size]} ${
              icon ? 'ml-2' : ''
            }`}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
