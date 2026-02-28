import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Avatar, Badge } from '@/components/ui';
import { Colors } from '@/lib/constants';
import type { Apprentice } from '@/types';

interface ApprenticeRowProps {
  apprentice: Apprentice;
  onPress: (id: string) => void;
}

/**
 * List row for an apprentice with avatar, name, employer, and status.
 */
export function ApprenticeRow({ apprentice, onPress }: ApprenticeRowProps) {
  const fullName = `${apprentice.firstName} ${apprentice.lastName}`;

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface border-b border-border px-4 py-3"
      onPress={() => onPress(apprentice.id)}
      activeOpacity={0.7}
    >
      <Avatar
        name={fullName}
        imageUrl={apprentice.avatarUrl}
        size="md"
      />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-foreground">{fullName}</Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {apprentice.hostEmployer.name}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Badge label={apprentice.status} status={apprentice.status} />
      </View>
      <ChevronRight size={18} color={Colors.muted} className="ml-2" />
    </TouchableOpacity>
  );
}
