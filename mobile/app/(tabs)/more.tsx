import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  User,
  Bell,
  Palette,
  Info,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
import { Avatar, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors, APP_VERSION } from '@/lib/constants';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingsRow({ icon, label, onPress, destructive = false }: SettingsRowProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 px-1 min-h-[48px]"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="mr-3">{icon}</View>
      <Text
        className={`flex-1 text-base font-medium ${
          destructive ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
      {!destructive && <ChevronRight size={18} color={Colors.muted} />}
    </TouchableOpacity>
  );
}

/**
 * More / Settings tab — profile, settings links, and sign out.
 */
export default function MoreScreen() {
  const { signOut, user } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const mockName = user?.email
    ? user.email.split('@')[0] ?? 'Field Officer'
    : 'Field Officer';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-8">
      {/* Profile section */}
      <Card className="mx-4 mt-4 flex-row items-center gap-4">
        <Avatar name={mockName} size="lg" />
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground capitalize">
            {mockName}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {user?.email ?? 'field.officer@bsuite.com.au'}
          </Text>
          <Text className="mt-1 text-xs text-accent">Field Officer</Text>
        </View>
      </Card>

      {/* Settings */}
      <View className="mx-4 mt-6">
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Settings
        </Text>
        <Card>
          <SettingsRow
            icon={<Bell size={20} color={Colors.foreground} />}
            label="Notifications"
            onPress={() =>
              Alert.alert('Notifications', 'Notification preferences coming soon.')
            }
          />
          <View className="h-px bg-border" />
          <SettingsRow
            icon={<Palette size={20} color={Colors.foreground} />}
            label="Appearance"
            onPress={() =>
              Alert.alert('Appearance', 'Theme settings coming soon.')
            }
          />
          <View className="h-px bg-border" />
          <SettingsRow
            icon={<Shield size={20} color={Colors.foreground} />}
            label="Security"
            onPress={() =>
              Alert.alert('Security', 'Biometric lock settings coming soon.')
            }
          />
        </Card>
      </View>

      {/* About */}
      <View className="mx-4 mt-6">
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          About
        </Text>
        <Card>
          <SettingsRow
            icon={<Info size={20} color={Colors.foreground} />}
            label="About BSuite"
            onPress={() =>
              Alert.alert(
                'BSuite Mobile',
                `Version ${APP_VERSION}\n\nBuilt for Australian Group Training Organisations.`
              )
            }
          />
        </Card>
      </View>

      {/* Sign Out */}
      <View className="mx-4 mt-6">
        <Card>
          <SettingsRow
            icon={<LogOut size={20} color={Colors.destructive} />}
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </Card>
      </View>

      {/* Version */}
      <View className="items-center mt-8">
        <Text className="text-xs text-muted">BSuite Mobile v{APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}
