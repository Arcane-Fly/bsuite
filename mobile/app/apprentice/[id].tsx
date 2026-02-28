import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  User,
  FileText,
  StickyNote,
  AlertCircle,
} from 'lucide-react-native';
import { Avatar, Badge, Card } from '@/components/ui';
import { Colors } from '@/lib/constants';
import { MOCK_APPRENTICES, MOCK_DOCUMENTS } from '@/lib/mock-data';
import type { ApprenticeDocument } from '@/types';

type TabKey = 'details' | 'placement' | 'documents' | 'notes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'placement', label: 'Placement' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
];

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View className="flex-row items-start py-2.5 gap-3">
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-sm text-foreground mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

function DocumentRow({ doc }: { doc: ApprenticeDocument }) {
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="rounded-lg bg-primary/10 p-2 mr-3">
        <FileText size={16} color={Colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{doc.name}</Text>
        <Text className="text-xs text-muted-foreground capitalize">{doc.type}</Text>
      </View>
      <View className="items-end">
        <Badge label={doc.status.replace('_', ' ')} status={doc.status} />
        {doc.expiryDate && (
          <Text className="text-xs text-muted-foreground mt-1">
            Exp: {doc.expiryDate}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Apprentice detail screen with tabbed sections.
 *
 * Shows:
 * - Details: contact info, emergency contact, qualification
 * - Placement: host employer, supervisor, site address
 * - Documents: certificates/licenses with expiry dates
 * - Notes: placeholder for future notes feature
 */
export default function ApprenticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const apprentice = useMemo(
    () => MOCK_APPRENTICES.find((a) => a.id === id),
    [id]
  );

  if (!apprentice) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <AlertCircle size={40} color={Colors.muted} />
        <Text className="text-base text-muted-foreground mt-4">
          Apprentice not found.
        </Text>
      </View>
    );
  }

  const fullName = `${apprentice.firstName} ${apprentice.lastName}`;
  const documents = MOCK_DOCUMENTS[apprentice.id] ?? [];
  const iconSize = 16;
  const iconColor = Colors.mutedForeground;

  const renderContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <View className="gap-2">
            <Card>
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Contact
              </Text>
              <InfoRow
                icon={<Mail size={iconSize} color={iconColor} />}
                label="Email"
                value={apprentice.email}
              />
              <InfoRow
                icon={<Phone size={iconSize} color={iconColor} />}
                label="Phone"
                value={apprentice.phone}
              />
              <InfoRow
                icon={<Calendar size={iconSize} color={iconColor} />}
                label="Start Date"
                value={apprentice.startDate}
              />
              <InfoRow
                icon={<Calendar size={iconSize} color={iconColor} />}
                label="Expected Completion"
                value={apprentice.expectedEndDate}
              />
            </Card>

            <Card>
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Qualification
              </Text>
              <Text className="text-sm text-foreground">
                {apprentice.qualification}
              </Text>
            </Card>

            <Card>
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Emergency Contact
              </Text>
              <InfoRow
                icon={<User size={iconSize} color={iconColor} />}
                label={apprentice.emergencyContact.relationship}
                value={apprentice.emergencyContact.name}
              />
              <InfoRow
                icon={<Phone size={iconSize} color={iconColor} />}
                label="Phone"
                value={apprentice.emergencyContact.phone}
              />
            </Card>
          </View>
        );

      case 'placement':
        return (
          <Card>
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Host Employer
            </Text>
            <InfoRow
              icon={<Building2 size={iconSize} color={iconColor} />}
              label="Company"
              value={apprentice.hostEmployer.name}
            />
            <InfoRow
              icon={<User size={iconSize} color={iconColor} />}
              label="Contact"
              value={apprentice.hostEmployer.contactName}
            />
            <InfoRow
              icon={<Phone size={iconSize} color={iconColor} />}
              label="Phone"
              value={apprentice.hostEmployer.contactPhone}
            />
            <InfoRow
              icon={<Mail size={iconSize} color={iconColor} />}
              label="Email"
              value={apprentice.hostEmployer.contactEmail}
            />
            <InfoRow
              icon={<MapPin size={iconSize} color={iconColor} />}
              label="Site Address"
              value={apprentice.hostEmployer.address}
            />
          </Card>
        );

      case 'documents':
        return (
          <Card>
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Certificates & Licenses
            </Text>
            {documents.length === 0 ? (
              <Text className="text-sm text-muted-foreground py-4 text-center">
                No documents on file.
              </Text>
            ) : (
              documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)
            )}
          </Card>
        );

      case 'notes':
        return (
          <Card className="items-center py-8">
            <StickyNote size={32} color={Colors.muted} />
            <Text className="text-base text-muted-foreground mt-3">
              Notes feature coming soon
            </Text>
            <Text className="text-sm text-muted mt-1 text-center px-8">
              Field officers will be able to add visit notes, observations, and
              follow-up items here.
            </Text>
          </Card>
        );
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="items-center pt-6 pb-4 px-4">
        <Avatar name={fullName} imageUrl={apprentice.avatarUrl} size="xl" />
        <Text className="text-xl font-bold text-foreground mt-3">{fullName}</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          {apprentice.qualification}
        </Text>
        <View className="mt-2">
          <Badge label={apprentice.status} status={apprentice.status} />
        </View>
      </View>

      {/* Tab bar */}
      <View className="flex-row mx-4 mb-4 rounded-xl bg-surface p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              className={`flex-1 items-center py-3 rounded-lg min-h-[44px] justify-center ${
                isActive ? 'bg-primary' : 'bg-transparent'
              }`}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <View className="px-4">{renderContent()}</View>
    </ScrollView>
  );
}
