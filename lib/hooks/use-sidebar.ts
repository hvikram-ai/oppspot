'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapsed: () => void
  toggleMobile: () => void
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
)
