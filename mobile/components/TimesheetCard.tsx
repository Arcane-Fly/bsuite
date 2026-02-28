import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Calendar } from 'lucide-react-native';
import { Card, Badge } from '@/components/ui';
import { Colors } from '@/lib/constants';
import type { Timesheet } from '@/types';

interface TimesheetCardProps {
  timesheet: Timesheet;
}

/**
 * Format a date string (YYYY-MM-DD) to a short display format (DD Mon).
 */
function formatShortDate(dateStr: string): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${months[monthIdx] ?? '???'}`;
}

/**
 * Timesheet approval card showing apprentice, hours, date range, and status.
 */
export function TimesheetCard({ timesheet }: TimesheetCardProps) {
  const {
    apprenticeName,
    weekStarting,
    weekEnding,
    totalHours,
    ordinaryHours,
    overtimeHours,
    status,
    notes,
  } = timesheet;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {apprenticeName}
          </Text>
        </View>
        <Badge label={status} status={status} />
      </View>

      <View className="flex-row items-center gap-4 mb-2">
        <View className="flex-row items-center gap-1.5">
          <Calendar size={14} color={Colors.mutedForeground} />
          <Text className="text-sm text-muted-foreground">
            {formatShortDate(weekStarting)} - {formatShortDate(weekEnding)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Clock size={14} color={Colors.mutedForeground} />
          <Text className="text-sm text-foreground font-medium">{totalHours}h</Text>
        </View>
      </View>

      <View className="flex-row gap-4">
        <Text className="text-xs text-muted-foreground">
          Ordinary: <Text className="text-foreground">{ordinaryHours}h</Text>
        </Text>
        {overtimeHours > 0 && (
          <Text className="text-xs text-muted-foreground">
            Overtime: <Text className="text-warning">{overtimeHours}h</Text>
          </Text>
        )}
      </View>

      {notes ? (
        <Text className="mt-2 text-xs text-muted-foreground italic" numberOfLines={2}>
          {notes}
        </Text>
      ) : null}
    </Card>
  );
}
