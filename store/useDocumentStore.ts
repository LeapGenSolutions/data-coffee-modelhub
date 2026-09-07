import { create } from 'zustand';
import { FileAttachment, UploadedDocument } from '../types';

interface DocumentState {
  activeDocument: FileAttachment | null;
  isInspectorOpen: boolean;
  highlightedLines: { startLine: number; endLine: number } | null;
  searchQuery: string;

  /** Server-side uploaded documents indexed for RAG */
  uploadedDocuments: UploadedDocument[];
  uploadingCount: number;

  openInspector: (doc: FileAttachment, highlightedLines?: { startLine: number; endLine: number } | null) => void;
  closeInspector: () => void;
  setHighlightedLines: (lines: { startLine: number; endLine: number } | null) => void;
  setSearchQuery: (query: string) => void;

  addUploadedDocument: (doc: UploadedDocument) => void;
  updateUploadedDocument: (id: string, updates: Partial<UploadedDocument>) => void;
  removeUploadedDocument: (id: string) => void;
  setUploadingCount: (count: number) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  activeDocument: null,
  isInspectorOpen: false,
  highlightedLines: null,
  searchQuery: '',
  uploadedDocuments: [],
  uploadingCount: 0,

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

  addUploadedDocument: (doc) =>
    set((state) => ({
      uploadedDocuments: [doc, ...state.uploadedDocuments],
    })),

  updateUploadedDocument: (id, updates) =>
    set((state) => ({
      uploadedDocuments: state.uploadedDocuments.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),

  removeUploadedDocument: (id) =>
    set((state) => ({
      uploadedDocuments: state.uploadedDocuments.filter((d) => d.id !== id),
    })),

  setUploadingCount: (count) => set({ uploadingCount: count }),
}));
