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

export const useNotesStore = create<NotesStore>((set, get) => {
  const sortNotesByCreatedAtDesc = (
    notes: ApprenticeNote[]
  ): ApprenticeNote[] =>
    [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const initialNotes = sortNotesByCreatedAtDesc(MOCK_NOTES);
  let cachedNotesRef: ApprenticeNote[] = initialNotes;
  let notesByApprenticeCache = new Map<string, ApprenticeNote[]>();

  return {
    notes: initialNotes,

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
      const { notes } = get();

      if (cachedNotesRef !== notes) {
        cachedNotesRef = notes;
        notesByApprenticeCache = new Map<string, ApprenticeNote[]>();
      }

      const cachedNotes = notesByApprenticeCache.get(apprenticeId);
      if (cachedNotes) {
        return cachedNotes;
      }

      const apprenticeNotes = notes.filter(
        (note) => note.apprenticeId === apprenticeId
      );
      notesByApprenticeCache.set(apprenticeId, apprenticeNotes);

      return apprenticeNotes;
    },
  };
});
