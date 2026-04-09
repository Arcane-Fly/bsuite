import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SkeletonTimesheetCard } from '@/components/ui';
import { TimesheetCard } from '@/components/TimesheetCard';
import { Colors } from '@/lib/constants';
import { MOCK_TIMESHEETS } from '@/lib/mock-data';
import type { Timesheet, TimesheetStatus } from '@/types';

type FilterOption = 'all' | TimesheetStatus;

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: 'all' },
];

/**
 * Timesheets tab with skeleton loading state and status filter.
 */
export default function TimesheetsScreen() {
  const [filter, setFilter] = useState<FilterOption>('pending');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial data load
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return MOCK_TIMESHEETS;
    return MOCK_TIMESHEETS.filter((t) => t.status === filter);
  }, [filter]);

  const renderItem = useCallback(
    ({ item }: { item: Timesheet }) => <TimesheetCard timesheet={item} />,
    []
  );

  return (
    <View className="flex-1 bg-background">
      {/* Segmented control */}
      <View className="flex-row mx-4 mt-4 mb-2 rounded-xl bg-surface p-1">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              className={`flex-1 items-center py-3 rounded-lg min-h-[44px] justify-center ${
                isActive ? 'bg-primary' : 'bg-transparent'
              }`}
              onPress={() => setFilter(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Count */}
      <View className="px-4 py-2">
        <Text className="text-xs text-muted-foreground">
          {isLoading ? ' ' : `${filtered.length} timesheet${filtered.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Skeleton loading state */}
      {isLoading ? (
        <View className="px-4">
          <SkeletonTimesheetCard />
          <SkeletonTimesheetCard />
          <SkeletonTimesheetCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-4"
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-base text-muted-foreground">
                No timesheets to show.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
