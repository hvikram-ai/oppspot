'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Home,
  FileText,
  Users,
  Settings,
  Sparkles,
  Clock,
  BookOpen,
  TrendingUp,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords: string[]
  badge?: string
}

export function CommandPalette() {
  const router = useRouter()
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useDashboardStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Define all commands
  const commands: Command[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      description: 'View your command center',
      icon: Home,
      action: () => router.push('/dashboard'),
      keywords: ['home', 'dashboard', 'overview'],
    },
    {
      id: 'search',
      label: 'New Search',
      description: 'Search for businesses',
      icon: Search,
      action: () => router.push('/search'),
      keywords: ['search', 'find', 'businesses', 'companies'],
      badge: 'N',
    },
    {
      id: 'research',
      label: 'Generate Research',
      description: 'AI-powered company research',
      icon: Sparkles,
      action: () => router.push('/research'),
      keywords: ['research', 'ai', 'generate', 'researchgpt'],
      badge: 'R',
    },
    {
      id: 'saved',
      label: 'Saved Businesses',
      description: 'View your saved companies',
      icon: BookOpen,
      action: () => router.push('/saved'),
      keywords: ['saved', 'bookmarks', 'favorites'],
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Manage your sales pipeline',
      icon: TrendingUp,
      action: () => router.push('/pipeline'),
      keywords: ['pipeline', 'leads', 'opportunities'],
    },
    {
      id: 'recent',
      label: 'Recent Searches',
      description: 'View search history',
      icon: Clock,
      action: () => router.push('/search/history'),
      keywords: ['recent', 'history', 'searches'],
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Manage your account',
      icon: Settings,
      action: () => router.push('/settings'),
      keywords: ['settings', 'preferences', 'account', 'profile'],
    },
  ]

  // Filter commands based on search query
  const filteredCommands = commands.filter((command) => {
    const query = searchQuery.toLowerCase()
    return (
      command.label.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.keywords.some((keyword) => keyword.includes(query))
    )
  })

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Focus input when dialog opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isCommandPaletteOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex])
      }
    }
  }

  const executeCommand = (command: Command) => {
    command.action()
    setCommandPaletteOpen(false)
    setSearchQuery('')
  }

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="p-0 max-w-2xl" aria-describedby="command-palette-description">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div id="command-palette-description" className="sr-only">
          Search and navigate quickly using keyboard shortcuts
        </div>

        <div className="border-b px-4 py-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search commands... (try 'search', 'research', 'dashboard')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 text-base"
            aria-label="Search commands"
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No commands found</p>
              <p className="text-sm mt-2">Try searching for something else</p>
            </div>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon
              const isSelected = index === selectedIndex

              return (
                <button
                  key={command.id}
                  onClick={() => executeCommand(command)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{command.label}</p>
                      {command.badge && (
                        <Badge variant="outline" className="text-xs">
                          {command.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {command.description}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> Close
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
