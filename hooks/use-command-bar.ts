'use client'

import { useEffect, useState, createContext, useContext } from 'react'

type CommandBarContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const CommandBarContext = createContext<CommandBarContextType | null>(null)

export function CommandBarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const toggle = () => setOpen(prev => !prev)

  return (
    <CommandBarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </CommandBarContext.Provider>
  )
}

export function useCommandBar() {
  const context = useContext(CommandBarContext)
  if (!context) {
    throw new Error('useCommandBar must be used within CommandBarProvider')
  }
  return context
}

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<Array<{
    id: string
    type: 'company' | 'stream' | 'scan' | 'list'
    title: string
    href: string
    timestamp: number
  }>>([])

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('oppspot:recent-items')
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse recent items:', e)
      }
    }
  }, [])

  const addRecentItem = (item: Omit<typeof recentItems[0], 'timestamp'>) => {
    const newItem = { ...item, timestamp: Date.now() }
    const updated = [
      newItem,
      ...recentItems.filter(i => !(i.id === item.id && i.type === item.type))
    ].slice(0, 10) // Keep only 10 most recent

    setRecentItems(updated)
    localStorage.setItem('oppspot:recent-items', JSON.stringify(updated))
  }

  return { recentItems, addRecentItem }
}
