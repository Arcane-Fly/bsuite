import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors, METRIC_ICON_SIZE } from '@/lib/constants';
import type { DashboardMetric } from '@/types';

interface MetricCardProps {
  metric: DashboardMetric;
  icon: React.ReactNode;
}

/**
 * Dashboard metric card with value, label, and optional trend indicator.
 */
export function MetricCard({ metric, icon }: MetricCardProps) {
  const { label, value, trend, trendValue } = metric;

  const trendIcon = () => {
    const size = 14;
    switch (trend) {
      case 'up':
        return <TrendingUp size={size} color={Colors.success} />;
      case 'down':
        return <TrendingDown size={size} color={Colors.destructive} />;
      default:
        return <Minus size={size} color={Colors.muted} />;
    }
  };

  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted';

  return (
    <Card className="flex-1 min-w-[45%]">
      <View className="flex-row items-center justify-between mb-3">
        <View className="rounded-lg bg-primary/10 p-2">{icon}</View>
        {trend && trendValue ? (
          <View className="flex-row items-center gap-1">
            {trendIcon()}
            <Text className={`text-xs font-medium ${trendColor}`}>{trendValue}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-3xl font-bold text-foreground">{value}</Text>
      <Text className="mt-1 text-sm text-muted-foreground">{label}</Text>
    </Card>
  );
}
