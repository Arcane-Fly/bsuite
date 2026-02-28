import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Clock,
  CalendarCheck,
  ShieldAlert,
  Plus,
  Search,
} from 'lucide-react-native';
import { Button } from '@/components/ui';
import { MetricCard } from '@/components/MetricCard';
import { Colors, METRIC_ICON_SIZE } from '@/lib/constants';
import { MOCK_METRICS } from '@/lib/mock-data';

const METRIC_ICONS = [
  <Users key="users" size={METRIC_ICON_SIZE} color={Colors.primary} />,
  <Clock key="clock" size={METRIC_ICON_SIZE} color={Colors.warning} />,
  <CalendarCheck key="cal" size={METRIC_ICON_SIZE} color={Colors.accent} />,
  <ShieldAlert key="whs" size={METRIC_ICON_SIZE} color={Colors.destructive} />,
];

/**
 * Dashboard tab — overview metrics and quick actions for field officers.
 */
export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">Good morning</Text>
        <Text className="text-base text-muted-foreground mt-1">
          Here is your daily overview
        </Text>
      </View>

      {/* Metric Cards Grid */}
      <View className="px-4 mt-4 flex-row flex-wrap gap-3">
        {MOCK_METRICS.map((metric, idx) => (
          <MetricCard key={metric.label} metric={metric} icon={METRIC_ICONS[idx]} />
        ))}
      </View>

      {/* Quick Actions */}
      <View className="px-4 mt-8">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Quick Actions
        </Text>
        <View className="gap-3">
          <Button
            label="New Timesheet"
            variant="secondary"
            icon={<Plus size={18} color={Colors.primary} />}
            onPress={() => router.push('/(tabs)/timesheets')}
          />
          <Button
            label="Log WHS Incident"
            variant="secondary"
            icon={<ShieldAlert size={18} color={Colors.destructive} />}
            onPress={() => router.push('/(tabs)/whs')}
          />
          <Button
            label="Find Apprentice"
            variant="secondary"
            icon={<Search size={18} color={Colors.accent} />}
            onPress={() => router.push('/(tabs)/apprentices')}
          />
        </View>
      </View>
    </ScrollView>
  );
}
