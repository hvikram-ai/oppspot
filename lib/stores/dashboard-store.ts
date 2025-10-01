import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Dashboard UI state interface
interface DashboardState {
  // Sidebar state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Active tab/section
  activeTab: 'overview' | 'queue' | 'research' | 'pipeline'
  setActiveTab: (tab: 'overview' | 'queue' | 'research' | 'pipeline') => void

  // Filters
  queueFilter: {
    status: 'all' | 'pending' | 'in_progress' | 'completed' | 'dismissed'
    priority: 'all' | 'critical' | 'high' | 'medium' | 'low'
    type: 'all' | 'search' | 'research' | 'lead' | 'task'
  }
  setQueueFilter: (filter: Partial<DashboardState['queueFilter']>) => void
  resetQueueFilter: () => void

  // Metrics period selection
  metricsPeriod: '7d' | '30d' | '90d'
  setMetricsPeriod: (period: '7d' | '30d' | '90d') => void

  // View preferences
  viewMode: 'grid' | 'list' | 'compact'
  setViewMode: (mode: 'grid' | 'list' | 'compact') => void

  // Card visibility (personalization)
  visibleCards: {
    aiDigest: boolean
    priorityQueue: boolean
    metrics: boolean
    researchGPT: boolean
    spotlight: boolean
    recentSearches: boolean
    savedLists: boolean
  }
  toggleCardVisibility: (card: keyof DashboardState['visibleCards']) => void
  setCardVisibility: (cards: Partial<DashboardState['visibleCards']>) => void

  // Theme preference
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Command palette state
  isCommandPaletteOpen: boolean
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void

  // Notification preferences
  notificationsEnabled: boolean
  toggleNotifications: () => void

  // Digest preferences
  digestPreferences: {
    autoExpand: boolean
    showOvernightDiscoveries: boolean
    showUrgentAlerts: boolean
    showCompletedWork: boolean
    showRecommendations: boolean
  }
  setDigestPreferences: (prefs: Partial<DashboardState['digestPreferences']>) => void

  // Last viewed timestamp (for "new" badges)
  lastViewedAt: string | null
  updateLastViewedAt: () => void

  // Onboarding/tour state
  hasCompletedTour: boolean
  setHasCompletedTour: (completed: boolean) => void
  tourStep: number
  setTourStep: (step: number) => void

  // Reset all state
  reset: () => void
}

// Default state values
const defaultState = {
  isSidebarOpen: true,
  activeTab: 'overview' as const,
  queueFilter: {
    status: 'all' as const,
    priority: 'all' as const,
    type: 'all' as const,
  },
  metricsPeriod: '7d' as const,
  viewMode: 'grid' as const,
  visibleCards: {
    aiDigest: true,
    priorityQueue: true,
    metrics: true,
    researchGPT: true,
    spotlight: true,
    recentSearches: true,
    savedLists: true,
  },
  theme: 'system' as const,
  isCommandPaletteOpen: false,
  notificationsEnabled: true,
  digestPreferences: {
    autoExpand: false,
    showOvernightDiscoveries: true,
    showUrgentAlerts: true,
    showCompletedWork: true,
    showRecommendations: true,
  },
  lastViewedAt: null,
  hasCompletedTour: false,
  tourStep: 0,
}

/**
 * Zustand store for dashboard UI state
 *
 * Features:
 * - Persisted to localStorage
 * - Handles sidebar, tabs, filters, and preferences
 * - Supports theme switching
 * - Command palette state
 * - Personalization (card visibility)
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      ...defaultState,

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) =>
        set({ isSidebarOpen: open }),

      // Tab actions
      setActiveTab: (tab) =>
        set({ activeTab: tab }),

      // Queue filter actions
      setQueueFilter: (filter) =>
        set((state) => ({
          queueFilter: { ...state.queueFilter, ...filter },
        })),
      resetQueueFilter: () =>
        set({ queueFilter: defaultState.queueFilter }),

      // Metrics period actions
      setMetricsPeriod: (period) =>
        set({ metricsPeriod: period }),

      // View mode actions
      setViewMode: (mode) =>
        set({ viewMode: mode }),

      // Card visibility actions
      toggleCardVisibility: (card) =>
        set((state) => ({
          visibleCards: {
            ...state.visibleCards,
            [card]: !state.visibleCards[card],
          },
        })),
      setCardVisibility: (cards) =>
        set((state) => ({
          visibleCards: { ...state.visibleCards, ...cards },
        })),

      // Theme actions
      setTheme: (theme) =>
        set({ theme }),

      // Command palette actions
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
      setCommandPaletteOpen: (open) =>
        set({ isCommandPaletteOpen: open }),

      // Notification actions
      toggleNotifications: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

      // Digest preferences actions
      setDigestPreferences: (prefs) =>
        set((state) => ({
          digestPreferences: { ...state.digestPreferences, ...prefs },
        })),

      // Last viewed actions
      updateLastViewedAt: () =>
        set({ lastViewedAt: new Date().toISOString() }),

      // Tour actions
      setHasCompletedTour: (completed) =>
        set({ hasCompletedTour: completed }),
      setTourStep: (step) =>
        set({ tourStep: step }),

      // Reset action
      reset: () =>
        set(defaultState),
    }),
    {
      name: 'dashboard-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields (exclude temporary UI state)
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        queueFilter: state.queueFilter,
        metricsPeriod: state.metricsPeriod,
        viewMode: state.viewMode,
        visibleCards: state.visibleCards,
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
        digestPreferences: state.digestPreferences,
        lastViewedAt: state.lastViewedAt,
        hasCompletedTour: state.hasCompletedTour,
        // Exclude: activeTab, isCommandPaletteOpen, tourStep (session-only)
      }),
    }
  )
)

// Selectors for optimized re-renders
export const selectSidebarState = (state: DashboardState) => ({
  isOpen: state.isSidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
})

export const selectQueueFilter = (state: DashboardState) => ({
  filter: state.queueFilter,
  setFilter: state.setQueueFilter,
  reset: state.resetQueueFilter,
})

export const selectVisibleCards = (state: DashboardState) => ({
  cards: state.visibleCards,
  toggle: state.toggleCardVisibility,
  setCards: state.setCardVisibility,
})

export const selectTheme = (state: DashboardState) => ({
  theme: state.theme,
  setTheme: state.setTheme,
})

export const selectCommandPalette = (state: DashboardState) => ({
  isOpen: state.isCommandPaletteOpen,
  toggle: state.toggleCommandPalette,
  setOpen: state.setCommandPaletteOpen,
})
