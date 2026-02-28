import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { WHSIncidentCard } from '@/components/WHSIncidentCard';
import { Colors } from '@/lib/constants';
import { MOCK_INCIDENTS } from '@/lib/mock-data';
import type { WHSIncident } from '@/types';

/**
 * WHS incidents tab with incident list and floating "Report Incident" button.
 */
export default function WHSScreen() {
  const renderItem = ({ item }: { item: WHSIncident }) => (
    <WHSIncidentCard incident={item} />
  );

  return (
    <View className="flex-1 bg-background">
      {/* Count header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs text-muted-foreground">
          {MOCK_INCIDENTS.length} incident{MOCK_INCIDENTS.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Incident list */}
      <FlatList
        data={MOCK_INCIDENTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-24"
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-base text-muted-foreground">
              No incidents reported.
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        onPress={() => {
          Alert.alert(
            'Report Incident',
            'Incident reporting form will be available in the next update.'
          );
        }}
        activeOpacity={0.8}
        style={{
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={24} color={Colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}
