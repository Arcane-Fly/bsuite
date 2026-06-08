import React from 'react';
import { View, Text } from 'react-native';
import { STATUS_COLORS } from '@/lib/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'accent' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Use a status string to auto-resolve color from STATUS_COLORS map */
  status?: string;
}

const variantClasses: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-primary/20', text: 'text-primary-400' },
  success: { bg: 'bg-success/20', text: 'text-success' },
  warning: { bg: 'bg-warning/20', text: 'text-warning' },
  destructive: { bg: 'bg-destructive/20', text: 'text-destructive' },
  accent: { bg: 'bg-accent/20', text: 'text-accent' },
  muted: { bg: 'bg-muted/20', text: 'text-muted-foreground' },
};

/**
 * Resolve a status string to a badge variant.
 */
function statusToVariant(status: string): BadgeVariant {
  const color = STATUS_COLORS[status];
  if (!color) return 'muted';

  if (color === STATUS_COLORS.active) return 'success';
  if (color === STATUS_COLORS.pending) return 'warning';
  if (color === STATUS_COLORS.rejected) return 'destructive';
  if (color === STATUS_COLORS.completed) return 'accent';
  if (color === STATUS_COLORS.investigating) return 'default';
  return 'muted';
}

/**
 * Status badge with colored background.
 * Pass a `status` string to auto-resolve color, or use `variant` directly.
 */
export function Badge({ label, variant, status }: BadgeProps) {
  const resolved = variant ?? (status ? statusToVariant(status) : 'default');
  const { bg, text } = variantClasses[resolved];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold capitalize ${text}`}>{label}</Text>
    </View>
  );
}
