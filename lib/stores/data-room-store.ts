/**
 * Data Room Zustand Store
 * Client-side state management for Data Room feature
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DocumentFilter = {
  document_type?: string;
  folder_path?: string;
  search?: string;
  uploaded_by?: string;
  date_from?: string;
  date_to?: string;
};

export type SortOption = {
  field: 'filename' | 'created_at' | 'file_size_bytes' | 'confidence_score';
  direction: 'asc' | 'desc';
};

export type UploadProgress = {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
};

export type DataRoomView = 'grid' | 'list' | 'table';

interface DataRoomState {
  // Current data room
  currentDataRoomId: string | null;
  setCurrentDataRoom: (id: string | null) => void;

  // Document filters
  documentFilters: DocumentFilter;
  setDocumentFilters: (filters: DocumentFilter) => void;
  clearDocumentFilters: () => void;

  // Document sorting
  documentSort: SortOption;
  setDocumentSort: (sort: SortOption) => void;

  // Selected documents (for batch actions)
  selectedDocuments: string[];
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: (ids: string[]) => void;
  clearDocumentSelection: () => void;

  // Upload progress tracking
  uploadProgress: Record<string, UploadProgress>;
  updateUploadProgress: (filename: string, progress: UploadProgress) => void;
  removeUploadProgress: (filename: string) => void;
  clearCompletedUploads: () => void;

  // View preferences
  documentView: DataRoomView;
  setDocumentView: (view: DataRoomView) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Current folder path
  currentFolder: string;
  setCurrentFolder: (path: string) => void;

  // Viewer state
  currentDocumentId: string | null;
  setCurrentDocument: (id: string | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
}

export const useDataRoomStore = create<DataRoomState>()(
  persist(
    (set) => ({
      // Current data room
      currentDataRoomId: null,
      setCurrentDataRoom: (id) => set({ currentDataRoomId: id }),

      // Document filters
      documentFilters: {},
      setDocumentFilters: (filters) =>
        set((state) => ({
          documentFilters: { ...state.documentFilters, ...filters },
        })),
      clearDocumentFilters: () => set({ documentFilters: {} }),

      // Document sorting
      documentSort: { field: 'created_at', direction: 'desc' },
      setDocumentSort: (sort) => set({ documentSort: sort }),

      // Selected documents
      selectedDocuments: [],
      toggleDocumentSelection: (id) =>
        set((state) => ({
          selectedDocuments: state.selectedDocuments.includes(id)
            ? state.selectedDocuments.filter((docId) => docId !== id)
            : [...state.selectedDocuments, id],
        })),
      selectAllDocuments: (ids) => set({ selectedDocuments: ids }),
      clearDocumentSelection: () => set({ selectedDocuments: [] }),

      // Upload progress (not persisted)
      uploadProgress: {},
      updateUploadProgress: (filename, progress) =>
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            [filename]: progress,
          },
        })),
      removeUploadProgress: (filename) =>
        set((state) => {
          const { [filename]: _, ...rest } = state.uploadProgress;
          return { uploadProgress: rest };
        }),
      clearCompletedUploads: () =>
        set((state) => {
          const activeUploads = Object.entries(state.uploadProgress).reduce(
            (acc, [filename, progress]) => {
              if (progress.status === 'uploading' || progress.status === 'processing') {
                acc[filename] = progress;
              }
              return acc;
            },
            {} as Record<string, UploadProgress>
          );
          return { uploadProgress: activeUploads };
        }),

      // View preferences
      documentView: 'grid',
      setDocumentView: (view) => set({ documentView: view }),

      // Sidebar state
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Current folder
      currentFolder: '/',
      setCurrentFolder: (path) => set({ currentFolder: path }),

      // Viewer state
      currentDocumentId: null,
      setCurrentDocument: (id) => set({ currentDocumentId: id }),
      currentPage: 1,
      setCurrentPage: (page) => set({ currentPage: page }),
      zoomLevel: 1,
      setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
    }),
    {
      name: 'data-room-storage',
      // Only persist user preferences, not temporary state
      partialize: (state) => ({
        documentFilters: state.documentFilters,
        documentSort: state.documentSort,
        documentView: state.documentView,
        sidebarCollapsed: state.sidebarCollapsed,
        currentFolder: state.currentFolder,
      }),
    }
  )
);

// Selectors for common use cases
export const useCurrentDataRoom = () =>
  useDataRoomStore((state) => state.currentDataRoomId);

export const useDocumentFilters = () =>
  useDataRoomStore((state) => state.documentFilters);

export const useSelectedDocuments = () =>
  useDataRoomStore((state) => state.selectedDocuments);

export const useUploadProgress = () =>
  useDataRoomStore((state) => state.uploadProgress);

export const useActiveUploads = () =>
  useDataRoomStore((state) => {
    const uploads = state.uploadProgress;
    return Object.entries(uploads).filter(
      ([_, progress]) =>
        progress.status === 'uploading' || progress.status === 'processing'
    );
  });

export const useHasActiveUploads = () => {
  const activeUploads = useActiveUploads();
  return activeUploads.length > 0;
};
