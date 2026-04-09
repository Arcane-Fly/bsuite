import { create } from 'zustand';
import type { ApprenticeNote, NoteCategory } from '@/types';
import { MOCK_NOTES } from '@/lib/mock-data';

interface NotesState {
  notes: ApprenticeNote[];
}

interface NotesActions {
  addNote: (
    apprenticeId: string,
    content: string,
    category: NoteCategory,
    createdBy: string
  ) => void;
  deleteNote: (noteId: string) => void;
  getNotesForApprentice: (apprenticeId: string) => ApprenticeNote[];
}

type NotesStore = NotesState & NotesActions;

let nextId = 100;

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: MOCK_NOTES,

  addNote: (apprenticeId, content, category, createdBy) => {
    const now = new Date().toISOString();
    const note: ApprenticeNote = {
      id: `note-${++nextId}`,
      apprenticeId,
      content,
      category,
      createdBy,
      createdAt: now,
      updatedAt: null,
    };
    set((state) => ({ notes: [note, ...state.notes] }));
  },

  deleteNote: (noteId) => {
    set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
  },

  getNotesForApprentice: (apprenticeId) => {
    return get()
      .notes.filter((n) => n.apprenticeId === apprenticeId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },
}));
