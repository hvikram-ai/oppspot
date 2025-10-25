'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { commandBarAnalytics } from '@/lib/analytics/command-bar-analytics'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Building2,
  Folder,
  Search,
  Plus,
  TrendingUp,
  Sparkles,
  Clock,
  FileText,
  Scan,
  Users,
  Settings,
  LayoutDashboard,
  Target,
  Zap,
  Brain,
} from 'lucide-react'
import { useCommandBar, useRecentItems } from '@/hooks/use-command-bar'

interface SearchResult {
  id: string
  type: 'company' | 'stream' | 'scan' | 'list' | 'search'
  title: string
  subtitle?: string
  href: string
}

interface QuickAction {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  keywords: string[]
}

export function CommandBar() {
  const router = useRouter()
  const { open, setOpen } = useCommandBar()
  const { recentItems, addRecentItem } = useRecentItems()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    title: string
    description: string
    href?: string
  }>>([])
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'create-stream',
      title: 'Create New Stream',
      subtitle: 'Start a new deal or project',
      icon: <Plus className="size-4" />,
      action: () => {
        router.push('/streams?create=true')
        setOpen(false)
      },
      keywords: ['create', 'new', 'stream', 'deal', 'project'],
    },
    {
      id: 'start-scan',
      title: 'Start Opportunity Scan',
      subtitle: 'Find acquisition targets',
      icon: <Scan className="size-4" />,
      action: () => {
        router.push('/opp-scan/new')
        setOpen(false)
      },
      keywords: ['scan', 'opportunity', 'search', 'find', 'acquisition', 'targets'],
    },
    {
      id: 'search-companies',
      title: 'Search Companies',
      subtitle: 'Find businesses',
      icon: <Building2 className="size-4" />,
      action: () => {
        router.push('/search')
        setOpen(false)
      },
      keywords: ['search', 'company', 'business', 'find'],
    },
    {
      id: 'view-signals',
      title: 'View Buying Signals',
      subtitle: 'See recent signals',
      icon: <Zap className="size-4" />,
      action: () => {
        router.push('/signals')
        setOpen(false)
      },
      keywords: ['signals', 'buying', 'intent', 'alerts'],
    },
    {
      id: 'ai-chat',
      title: 'Ask AI Assistant',
      subtitle: 'Natural language queries',
      icon: <Brain className="size-4" />,
      action: () => {
        router.push('/?chat=true')
        setOpen(false)
      },
      keywords: ['ai', 'assistant', 'chat', 'ask', 'query'],
    },
  ]

  // Navigation shortcuts
  const navigationItems = [
    { title: 'Dashboard', href: '/', icon: <LayoutDashboard className="size-4" /> },
    { title: 'Streams', href: '/streams', icon: <Folder className="size-4" /> },
    { title: 'Companies', href: '/companies', icon: <Building2 className="size-4" /> },
    { title: 'Opportunity Scans', href: '/opp-scan', icon: <Target className="size-4" /> },
    { title: 'Signals', href: '/signals', icon: <Zap className="size-4" /> },
    { title: 'Analytics', href: '/analytics', icon: <TrendingUp className="size-4" /> },
    { title: 'Stakeholders', href: '/stakeholders', icon: <Users className="size-4" /> },
    { title: 'Settings', href: '/settings', icon: <Settings className="size-4" /> },
  ]

  // Track when command bar opens
  useEffect(() => {
    if (open) {
      commandBarAnalytics.track({ event: 'command_bar_opened' })
    } else if (!open && query) {
      commandBarAnalytics.track({ event: 'command_bar_closed' })
    }
  }, [open, query])

  // Search API call
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setAiSuggestions([])
      setShowAiSuggestions(false)
      return
    }

    // Track search query
    commandBarAnalytics.track({
      event: 'search_query',
      query
    })

    const searchTimeout = setTimeout(async () => {
      setLoading(true)
      try {
        // Run both search and AI processing in parallel
        const [searchResponse, aiResponse] = await Promise.all([
          fetch(`/api/command-search?q=${encodeURIComponent(query)}`),
          fetch('/api/command-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          })
        ])

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          setSearchResults(searchData.results || [])
        }

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          if (aiData.suggestions && aiData.suggestions.length > 0) {
            setAiSuggestions(aiData.suggestions)
            setShowAiSuggestions(true)
          } else {
            setShowAiSuggestions(false)
          }
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce

    return () => clearTimeout(searchTimeout)
  }, [query, open])

  const handleSelect = useCallback((item: SearchResult | { title: string; href: string; type?: string }, eventType?: 'ai_suggestion' | 'search_result' | 'quick_action' | 'navigation' | 'recent') => {
    // Track the selection
    if ('type' in item && item.type && 'id' in item) {
      commandBarAnalytics.track({
        event: `${eventType || item.type}_clicked` as any,
        resultType: item.type as any,
        resultId: item.id,
        resultTitle: item.title,
        query: query || undefined
      })

      addRecentItem({
        id: item.id,
        type: item.type as any,
        title: item.title,
        href: item.href,
      })
    } else if (eventType) {
      commandBarAnalytics.track({
        event: `${eventType}_clicked` as any,
        resultTitle: item.title,
        query: query || undefined
      })
    }

    router.push(item.href)
    setOpen(false)
    setQuery('')
  }, [router, setOpen, addRecentItem, query])

  const filteredActions = quickActions.filter(action =>
    query.length === 0 || action.keywords.some(keyword => keyword.includes(query.toLowerCase()))
  )

  const filteredNav = navigationItems.filter(item =>
    query.length === 0 || item.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search companies, streams, or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {/* AI Suggestions */}
        {showAiSuggestions && aiSuggestions.length > 0 && (
          <>
            <CommandGroup heading="AI Suggestions">
              {aiSuggestions.map((suggestion, idx) => (
                <CommandItem
                  key={`ai-${idx}`}
                  value={suggestion.title}
                  onSelect={() => suggestion.href && handleSelect({ title: suggestion.title, href: suggestion.href }, 'ai_suggestion')}
                >
                  <Sparkles className="size-4 text-purple-500" />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{suggestion.title}</span>
                    <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent Items */}
        {query.length === 0 && recentItems.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentItems.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={item.title}
                  onSelect={() => handleSelect(item, 'recent')}
                >
                  <Clock className="size-4" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Results">
              {searchResults.map((result) => {
                const Icon = result.type === 'company' ? Building2 :
                           result.type === 'stream' ? Folder :
                           result.type === 'scan' ? Target :
                           result.type === 'list' ? FileText : Search

                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.title}
                    onSelect={() => handleSelect(result, 'search_result')}
                  >
                    <Icon className="size-4" />
                    <div className="flex flex-col flex-1">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        {filteredActions.length > 0 && (
          <>
            <CommandGroup heading="Quick Actions">
              {filteredActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.title}
                  onSelect={() => {
                    commandBarAnalytics.track({
                      event: 'quick_action_clicked',
                      resultTitle: action.title,
                      query: query || undefined
                    })
                    action.action()
                  }}
                >
                  {action.icon}
                  <div className="flex flex-col flex-1">
                    <span>{action.title}</span>
                    {action.subtitle && (
                      <span className="text-xs text-muted-foreground">{action.subtitle}</span>
                    )}
                  </div>
                  <Sparkles className="size-3 text-muted-foreground ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        {filteredNav.length > 0 && query.length > 0 && (
          <CommandGroup heading="Go to">
            {filteredNav.map((item) => (
              <CommandItem
                key={item.href}
                value={item.title}
                onSelect={() => handleSelect(item, 'navigation')}
              >
                {item.icon}
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
