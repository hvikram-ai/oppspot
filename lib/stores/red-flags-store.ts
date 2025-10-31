/**
 * Red Flags Zustand Store
 *
 * Client-side state management for Red Flag Radar UI:
 * - Filter state (category, severity, status, search)
 * - Selected flags for bulk actions
 * - Loading and error states
 * - URL query param synchronization
 *
 * Pattern: Zustand store with TypeScript
 */

import { create } from 'zustand';
import { FlagFilters, FlagCategory, FlagSeverity, FlagStatus } from '../red-flags/types';

/**
 * Red Flags Store State
 */
interface RedFlagsState {
  // Current entity being viewed
  currentEntityType: 'company' | 'data_room' | null;
  currentEntityId: string | null;

  // Filters
  filters: FlagFilters;

  // Selected flags for bulk actions
  selectedFlags: Set<string>;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Drawer/modal state
  selectedFlagId: string | null;
  isDetailDrawerOpen: boolean;
  isExportDialogOpen: boolean;

  // Actions
  setCurrentEntity: (entityType: 'company' | 'data_room', entityId: string) => void;
  updateFilters: (filters: Partial<FlagFilters>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  addCategoryFilter: (category: FlagCategory) => void;
  removeCategoryFilter: (category: FlagCategory) => void;
  addSeverityFilter: (severity: FlagSeverity) => void;
  removeSeverityFilter: (severity: FlagSeverity) => void;
  addStatusFilter: (status: FlagStatus) => void;
  removeStatusFilter: (status: FlagStatus) => void;
  toggleFlagSelection: (flagId: string) => void;
  selectAllFlags: (flagIds: string[]) => void;
  clearFlagSelection: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  openFlagDetail: (flagId: string) => void;
  closeFlagDetail: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
}

/**
 * Default filter state
 */
const DEFAULT_FILTERS: FlagFilters = {
  status: undefined,
  category: undefined,
  severity: undefined,
  search: undefined,
  sort: 'severity',
  page: 1,
  limit: 20,
};

/**
 * Red Flags Store
 */
export const useRedFlagsStore = create<RedFlagsState>((set, get) => ({
  // Initial state
  currentEntityType: null,
  currentEntityId: null,
  filters: { ...DEFAULT_FILTERS },
  selectedFlags: new Set<string>(),
  isLoading: false,
  error: null,
  selectedFlagId: null,
  isDetailDrawerOpen: false,
  isExportDialogOpen: false,

  // Actions
  setCurrentEntity: (entityType, entityId) => {
    set({
      currentEntityType: entityType,
      currentEntityId: entityId,
      // Reset filters and selection when switching entities
      filters: { ...DEFAULT_FILTERS },
      selectedFlags: new Set<string>(),
      error: null,
    });
  },

  updateFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
        // Reset to page 1 when filters change (except when changing page)
        page: newFilters.page !== undefined ? newFilters.page : 1,
      },
    }));
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  setSearch: (search) => {
    set((state) => ({
      filters: {
        ...state.filters,
        search: search || undefined,
        page: 1, // Reset to page 1 on search
      },
    }));
  },

  addCategoryFilter: (category) => {
    set((state) => {
      const currentCategories = state.filters.category || [];
      if (currentCategories.includes(category)) {
        return state; // Already included
      }
      return {
        filters: {
          ...state.filters,
          category: [...currentCategories, category],
          page: 1,
        },
      };
    });
  },

  removeCategoryFilter: (category) => {
    set((state) => {
      const currentCategories = state.filters.category || [];
      const updatedCategories = currentCategories.filter((c) => c !== category);
      return {
        filters: {
          ...state.filters,
          category: updatedCategories.length > 0 ? updatedCategories : undefined,
          page: 1,
        },
      };
    });
  },

  addSeverityFilter: (severity) => {
    set((state) => {
      const currentSeverities = state.filters.severity || [];
      if (currentSeverities.includes(severity)) {
        return state;
      }
      return {
        filters: {
          ...state.filters,
          severity: [...currentSeverities, severity],
          page: 1,
        },
      };
    });
  },

  removeSeverityFilter: (severity) => {
    set((state) => {
      const currentSeverities = state.filters.severity || [];
      const updatedSeverities = currentSeverities.filter((s) => s !== severity);
      return {
        filters: {
          ...state.filters,
          severity: updatedSeverities.length > 0 ? updatedSeverities : undefined,
          page: 1,
        },
      };
    });
  },

  addStatusFilter: (status) => {
    set((state) => {
      const currentStatuses = state.filters.status || [];
      if (currentStatuses.includes(status)) {
        return state;
      }
      return {
        filters: {
          ...state.filters,
          status: [...currentStatuses, status],
          page: 1,
        },
      };
    });
  },

  removeStatusFilter: (status) => {
    set((state) => {
      const currentStatuses = state.filters.status || [];
      const updatedStatuses = currentStatuses.filter((s) => s !== status);
      return {
        filters: {
          ...state.filters,
          status: updatedStatuses.length > 0 ? updatedStatuses : undefined,
          page: 1,
        },
      };
    });
  },

  toggleFlagSelection: (flagId) => {
    set((state) => {
      const newSelection = new Set(state.selectedFlags);
      if (newSelection.has(flagId)) {
        newSelection.delete(flagId);
      } else {
        newSelection.add(flagId);
      }
      return { selectedFlags: newSelection };
    });
  },

  selectAllFlags: (flagIds) => {
    set({ selectedFlags: new Set(flagIds) });
  },

  clearFlagSelection: () => {
    set({ selectedFlags: new Set<string>() });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  openFlagDetail: (flagId) => {
    set({
      selectedFlagId: flagId,
      isDetailDrawerOpen: true,
    });
  },

  closeFlagDetail: () => {
    set({
      selectedFlagId: null,
      isDetailDrawerOpen: false,
    });
  },

  openExportDialog: () => {
    set({ isExportDialogOpen: true });
  },

  closeExportDialog: () => {
    set({ isExportDialogOpen: false });
  },
}));

/**
 * Helper hook to get filter count (for badge display)
 */
export function useActiveFilterCount(): number {
  const filters = useRedFlagsStore((state) => state.filters);

  let count = 0;
  if (filters.category && filters.category.length > 0) count += filters.category.length;
  if (filters.severity && filters.severity.length > 0) count += filters.severity.length;
  if (filters.status && filters.status.length > 0) count += filters.status.length;
  if (filters.search) count += 1;

  return count;
}

/**
 * Helper hook to check if any filters are active
 */
export function useHasActiveFilters(): boolean {
  return useActiveFilterCount() > 0;
}
