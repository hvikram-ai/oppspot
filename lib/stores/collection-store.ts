/**
 * Collection Zustand Store
 * Client-side state management for Collections feature
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Collection, StreamWithCounts, SharedCollection } from '@/lib/collections/types';

export type SaveOperation = {
  itemId: string;
  itemType: string;
  collectionId: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
};

interface CollectionState {
  // Active collection for the current session
  activeCollectionId: string | null;
  setActiveCollection: (id: string | null) => void;
  clearActiveCollection: () => void;

  // Cached collections list (for quick UI updates)
  ownedCollections: StreamWithCounts[];
  sharedCollections: SharedCollection[];
  setOwnedCollections: (collections: StreamWithCounts[]) => void;
  setSharedCollections: (collections: SharedCollection[]) => void;
  addCollection: (collection: StreamWithCounts) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  clearCollections: () => void;

  // Save operations tracking
  saveOperations: Record<string, SaveOperation>;
  addSaveOperation: (operation: SaveOperation) => void;
  updateSaveOperation: (itemId: string, updates: Partial<SaveOperation>) => void;
  removeSaveOperation: (itemId: string) => void;
  clearCompletedSaves: () => void;

  // UI state
  isCollectionSelectorOpen: boolean;
  toggleCollectionSelector: () => void;
  setCollectionSelectorOpen: (open: boolean) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Recently used collections (for quick access)
  recentCollections: string[];
  addRecentCollection: (id: string) => void;
  clearRecentCollections: () => void;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      // Active collection
      activeCollectionId: null,
      setActiveCollection: (id) => {
        set({ activeCollectionId: id });
        // Add to recent collections
        if (id) {
          get().addRecentCollection(id);
        }
      },
      clearActiveCollection: () => set({ activeCollectionId: null }),

      // Collections cache
      ownedCollections: [],
      sharedCollections: [],
      setOwnedCollections: (collections) => set({ ownedCollections: collections }),
      setSharedCollections: (collections) => set({ sharedCollections: collections }),
      addCollection: (collection) =>
        set((state) => ({
          ownedCollections: [collection, ...state.ownedCollections],
        })),
      updateCollection: (id, updates) =>
        set((state) => ({
          ownedCollections: state.ownedCollections.map((col) =>
            col.id === id ? { ...col, ...updates } : col
          ),
          sharedCollections: state.sharedCollections.map((col) =>
            col.id === id ? { ...col, ...updates } : col
          ),
        })),
      removeCollection: (id) =>
        set((state) => ({
          ownedCollections: state.ownedCollections.filter((col) => col.id !== id),
          sharedCollections: state.sharedCollections.filter((col) => col.id !== id),
          // Clear active if removed
          activeCollectionId:
            state.activeCollectionId === id ? null : state.activeCollectionId,
        })),
      clearCollections: () =>
        set({
          ownedCollections: [],
          sharedCollections: [],
        }),

      // Save operations (not persisted - temporary state)
      saveOperations: {},
      addSaveOperation: (operation) =>
        set((state) => ({
          saveOperations: {
            ...state.saveOperations,
            [operation.itemId]: operation,
          },
        })),
      updateSaveOperation: (itemId, updates) =>
        set((state) => ({
          saveOperations: {
            ...state.saveOperations,
            [itemId]: {
              ...state.saveOperations[itemId],
              ...updates,
            },
          },
        })),
      removeSaveOperation: (itemId) =>
        set((state) => {
          const { [itemId]: _, ...rest } = state.saveOperations;
          return { saveOperations: rest };
        }),
      clearCompletedSaves: () =>
        set((state) => {
          const pendingOps = Object.entries(state.saveOperations).reduce(
            (acc, [itemId, op]) => {
              if (op.status === 'pending') {
                acc[itemId] = op;
              }
              return acc;
            },
            {} as Record<string, SaveOperation>
          );
          return { saveOperations: pendingOps };
        }),

      // UI state
      isCollectionSelectorOpen: false,
      toggleCollectionSelector: () =>
        set((state) => ({ isCollectionSelectorOpen: !state.isCollectionSelectorOpen })),
      setCollectionSelectorOpen: (open) => set({ isCollectionSelectorOpen: open }),

      // Loading states
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Recent collections
      recentCollections: [],
      addRecentCollection: (id) =>
        set((state) => {
          const recent = [id, ...state.recentCollections.filter((cid) => cid !== id)];
          // Keep only last 5 recent collections
          return { recentCollections: recent.slice(0, 5) };
        }),
      clearRecentCollections: () => set({ recentCollections: [] }),
    }),
    {
      name: 'collection-storage',
      // Only persist user preferences and active state
      partialize: (state) => ({
        activeCollectionId: state.activeCollectionId,
        recentCollections: state.recentCollections,
        // Don't persist collections cache - fetch fresh from API
      }),
    }
  )
);

// ============================================================================
// Selectors for common use cases
// ============================================================================

export const useActiveCollection = () =>
  useCollectionStore((state) => state.activeCollectionId);

export const useOwnedCollections = () =>
  useCollectionStore((state) => state.ownedCollections);

export const useSharedCollections = () =>
  useCollectionStore((state) => state.sharedCollections);

export const useAllCollections = () => {
  const owned = useOwnedCollections();
  const shared = useSharedCollections();
  return [...owned, ...shared];
};

export const useCollectionById = (id: string | null) => {
  const owned = useOwnedCollections();
  const shared = useSharedCollections();
  if (!id) return null;
  return [...owned, ...shared].find((col) => col.id === id) || null;
};

export const useActiveCollectionDetails = () => {
  const activeId = useActiveCollection();
  return useCollectionById(activeId);
};

export const useSaveOperations = () =>
  useCollectionStore((state) => state.saveOperations);

export const useActiveSaves = () =>
  useCollectionStore((state) => {
    const ops = state.saveOperations;
    return Object.entries(ops).filter(([_, op]) => op.status === 'pending');
  });

export const useHasActiveSaves = () => {
  const activeSaves = useActiveSaves();
  return activeSaves.length > 0;
};

export const useRecentCollections = () => {
  const recentIds = useCollectionStore((state) => state.recentCollections);
  const owned = useOwnedCollections();
  const shared = useSharedCollections();
  const allCollections = [...owned, ...shared];

  return recentIds
    .map((id) => allCollections.find((col) => col.id === id))
    .filter((col): col is StreamWithCounts | SharedCollection => col !== undefined);
};

// Helper to get general collection (system collection)
export const useGeneralCollection = () => {
  const owned = useOwnedCollections();
  return owned.find((col) => col.is_system) || null;
};
