import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // User preferences
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        theme: 'system',
        sidebarOpen: true,
        
        // Actions
        setTheme: (theme) => set({ theme }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      }),
      {
        name: 'app-storage',
      }
    )
  )
)