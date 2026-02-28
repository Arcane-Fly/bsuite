import React from 'react';
import { View, Text, Image } from 'react-native';
import { AvatarSize, Colors } from '@/lib/constants';

type AvatarSizeKey = keyof typeof AvatarSize;

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: AvatarSizeKey;
}

/**
 * Get initials from a full name (first letter of first and last name).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const textSizeMap: Record<AvatarSizeKey, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * User avatar with image support and initials fallback.
 */
export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  const dimension = AvatarSize[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: Colors.primary,
      }}
      className="items-center justify-center"
    >
      <Text className={`font-bold text-foreground ${textSizeMap[size]}`}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
