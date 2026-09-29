import { create } from 'zustand';
import { FileAttachment } from '../types';

interface DocumentState {
  activeDocument: FileAttachment | null;
  isInspectorOpen: boolean;
  highlightedLines: { startLine: number; endLine: number } | null;
  searchQuery: string;

  openInspector: (doc: FileAttachment, highlightedLines?: { startLine: number; endLine: number } | null) => void;
  closeInspector: () => void;
  setHighlightedLines: (lines: { startLine: number; endLine: number } | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  activeDocument: null,
  isInspectorOpen: false,
  highlightedLines: null,
  searchQuery: '',

  openInspector: (doc, highlightedLines = null) =>
    set({
      activeDocument: doc,
      isInspectorOpen: true,
      highlightedLines,
      searchQuery: '',
    }),

  closeInspector: () =>
    set({
      isInspectorOpen: false,
      highlightedLines: null,
      searchQuery: '',
    }),

  setHighlightedLines: (lines) => set({ highlightedLines: lines }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
