import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { Input, SkeletonApprenticeRow } from '@/components/ui';
import { ApprenticeRow } from '@/components/ApprenticeRow';
import { Colors } from '@/lib/constants';
import { MOCK_APPRENTICES } from '@/lib/mock-data';
import type { Apprentice } from '@/types';

/**
 * Apprentices list tab with skeleton loading, search, and pull-to-refresh.
 */
export default function ApprenticesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial data load
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_APPRENTICES;
    const q = search.toLowerCase();
    return MOCK_APPRENTICES.filter(
      (a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.hostEmployer.name.toLowerCase().includes(q) ||
        a.qualification.toLowerCase().includes(q)
    );
  }, [search]);

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/apprentice/${id}`);
    },
    [router]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate a refresh — will be replaced with real Supabase fetch
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Apprentice }) => (
      <ApprenticeRow apprentice={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const keyExtractor = useCallback((item: Apprentice) => item.id, []);

  return (
    <View className="flex-1 bg-background">
      {/* Search bar */}
      <View className="px-4 py-3 bg-surface border-b border-border">
        <View className="flex-row items-center bg-background rounded-xl px-3 py-2 gap-2">
          <Search size={18} color={Colors.muted} />
          <Input
            placeholder="Search apprentices..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 border-0 bg-transparent p-0"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Results count */}
      <View className="px-4 py-2">
        <Text className="text-xs text-muted-foreground">
          {isLoading ? ' ' : `${filtered.length} apprentice${filtered.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Skeleton loading state */}
      {isLoading ? (
        <View>
          <SkeletonApprenticeRow />
          <SkeletonApprenticeRow />
          <SkeletonApprenticeRow />
          <SkeletonApprenticeRow />
          <SkeletonApprenticeRow />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-base text-muted-foreground">
                No apprentices found.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}
