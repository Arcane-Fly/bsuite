import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
  noPadding?: boolean;
}

/**
 * Card component with consistent surface styling and optional elevation.
 */
export function Card({
  variant = 'default',
  noPadding = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const base = 'rounded-2xl border border-border';
  const bg = variant === 'elevated' ? 'bg-surface-elevated' : 'bg-surface';
  const padding = noPadding ? '' : 'p-4';

  return (
    <View className={`${base} ${bg} ${padding} ${className}`} {...props}>
      {children}
    </View>
  );
}
