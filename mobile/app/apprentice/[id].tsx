import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
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
  Plus,
  Trash2,
  Eye,
  MessageSquare,
  ClipboardList,
} from 'lucide-react-native';
import { Avatar, Badge, Button, Card, Input } from '@/components/ui';
import { Colors, NOTE_CATEGORY_LABELS, NOTE_CATEGORY_COLORS } from '@/lib/constants';
import { MOCK_APPRENTICES, MOCK_DOCUMENTS } from '@/lib/mock-data';
import { useNotesStore } from '@/stores/notesStore';
import type { ApprenticeDocument, NoteCategory } from '@/types';

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

// ─── Note Category Icons ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<NoteCategory, React.ReactNode> = {
  visit: <ClipboardList size={14} color={NOTE_CATEGORY_COLORS.visit} />,
  observation: <Eye size={14} color={NOTE_CATEGORY_COLORS.observation} />,
  follow_up: <MessageSquare size={14} color={NOTE_CATEGORY_COLORS.follow_up} />,
};

type NoteFilter = 'all' | NoteCategory;

const NOTE_FILTERS: { key: NoteFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'visit', label: 'Visit' },
  { key: 'observation', label: 'Observation' },
  { key: 'follow_up', label: 'Follow-up' },
];

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-AU', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
}

function NotesTab({ apprenticeId }: { apprenticeId: string }) {
  const { addNote, deleteNote, getNotesForApprentice } = useNotesStore();
  const allNotes = getNotesForApprentice(apprenticeId);

  const [filter, setFilter] = useState<NoteFilter>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('visit');

  const filteredNotes = useMemo(
    () =>
      filter === 'all'
        ? allNotes
        : allNotes.filter((n) => n.category === filter),
    [allNotes, filter]
  );

  const handleAdd = useCallback(() => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    addNote(apprenticeId, trimmed, newCategory, 'Field Officer');
    setNewContent('');
    setIsAdding(false);
  }, [addNote, apprenticeId, newContent, newCategory]);

  const handleDelete = useCallback(
    (noteId: string) => {
      Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNote(noteId),
        },
      ]);
    },
    [deleteNote]
  );

  return (
    <View className="gap-3">
      {/* Filter bar */}
      <View className="flex-row rounded-xl bg-surface p-1">
        {NOTE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              className={`flex-1 items-center py-2 rounded-lg min-h-[36px] justify-center ${
                active ? 'bg-primary' : 'bg-transparent'
              }`}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-medium ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add note toggle */}
      {!isAdding ? (
        <Button
          variant="outline"
          size="sm"
          label="Add Note"
          icon={<Plus size={16} color={Colors.foreground} />}
          onPress={() => setIsAdding(true)}
        />
      ) : (
        <Card>
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            New Note
          </Text>

          {/* Category selector */}
          <View className="flex-row gap-2 mb-3">
            {(['visit', 'observation', 'follow_up'] as const).map((cat) => {
              const selected = newCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  className={`flex-row items-center gap-1.5 px-3 py-2 rounded-lg border min-h-[36px] ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface'
                  }`}
                  onPress={() => setNewCategory(cat)}
                  activeOpacity={0.7}
                >
                  {CATEGORY_ICONS[cat]}
                  <Text
                    className={`text-xs font-medium ${
                      selected ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {NOTE_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content input */}
          <Input
            placeholder="Write your note..."
            value={newContent}
            onChangeText={setNewContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-[100px]"
          />

          {/* Actions */}
          <View className="flex-row gap-2 mt-3">
            <View className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onPress={() => {
                  setIsAdding(false);
                  setNewContent('');
                }}
              />
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                size="sm"
                label="Save"
                disabled={!newContent.trim()}
                onPress={handleAdd}
              />
            </View>
          </View>
        </Card>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <Card className="items-center py-8">
          <StickyNote size={28} color={Colors.muted} />
          <Text className="text-sm text-muted-foreground mt-2">
            {filter === 'all'
              ? 'No notes yet. Tap "Add Note" to create one.'
              : `No ${NOTE_CATEGORY_LABELS[filter]?.toLowerCase()} notes.`}
          </Text>
        </Card>
      ) : (
        filteredNotes.map((note) => (
          <Card key={note.id}>
            {/* Header row: category badge + delete */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                {CATEGORY_ICONS[note.category]}
                <Text
                  className="text-xs font-semibold uppercase"
                  style={{ color: NOTE_CATEGORY_COLORS[note.category] }}
                >
                  {NOTE_CATEGORY_LABELS[note.category]}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(note.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="min-h-[32px] min-w-[32px] items-center justify-center"
              >
                <Trash2 size={14} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <Text className="text-sm text-foreground leading-5">
              {note.content}
            </Text>

            {/* Footer: author + date */}
            <View className="flex-row items-center mt-3 gap-1">
              <Text className="text-xs text-muted-foreground">
                {note.createdBy}
              </Text>
              <Text className="text-xs text-muted">·</Text>
              <Text className="text-xs text-muted-foreground">
                {formatNoteDate(note.createdAt)}
              </Text>
            </View>
          </Card>
        ))
      )}
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
 * - Notes: visit notes, observations, and follow-up items
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
        return <NotesTab apprenticeId={apprentice.id} />;
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
