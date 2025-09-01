'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Bell, 
  BellOff,
  Play,
  Trash2,
  Plus,
  Filter
} from 'lucide-react'
import Link from 'next/link'

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: {
    location?: string
    category?: string
    rating?: number
  }
  resultsCount: number
  hasAlerts: boolean
  lastRun: Date
  createdAt: Date
}

interface SavedSearchesProps {
  userId: string
}

export function SavedSearches({ userId }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockSearches: SavedSearch[] = [
      {
        id: '1',
        name: 'Tech Startups London',
        query: 'technology startup',
        filters: {
          location: 'London',
          category: 'Technology',
          rating: 4
        },
        resultsCount: 156,
        hasAlerts: true,
        lastRun: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 1 week ago
      },
      {
        id: '2',
        name: 'Manufacturing Partners',
        query: 'manufacturing',
        filters: {
          location: 'Manchester',
          category: 'Manufacturing'
        },
        resultsCount: 89,
        hasAlerts: false,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) // 2 weeks ago
      },
      {
        id: '3',
        name: 'Retail Opportunities',
        query: 'retail stores',
        filters: {
          category: 'Retail',
          rating: 3
        },
        resultsCount: 234,
        hasAlerts: true,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) // 1 month ago
      }
    ]
    
    setTimeout(() => {
      setSearches(mockSearches)
      setLoading(false)
    }, 500)
  }, [userId])

  const toggleAlert = (searchId: string) => {
    setSearches(searches.map(search => 
      search.id === searchId 
        ? { ...search, hasAlerts: !search.hasAlerts }
        : search
    ))
  }

  const runSearch = (search: SavedSearch) => {
    // Navigate to search with pre-filled query and filters
    const params = new URLSearchParams({
      q: search.query,
      ...search.filters
    })
    window.location.href = `/search?${params.toString()}`
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Saved Searches</CardTitle>
          <CardDescription>Your frequent searches with alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (searches.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Saved Searches</CardTitle>
          <CardDescription>Your frequent searches with alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No saved searches yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Save searches to get alerts for new matches
            </p>
            <Link href="/search">
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Search
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Saved Searches</CardTitle>
            <CardDescription>Your frequent searches with alerts</CardDescription>
          </div>
          <Link href="/searches">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {searches.map((search) => (
              <div 
                key={search.id} 
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{search.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      "{search.query}"
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleAlert(search.id)}
                  >
                    {search.hasAlerts ? (
                      <Bell className="h-4 w-4 text-blue-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {search.filters.location && (
                    <Badge variant="secondary" className="text-xs">
                      📍 {search.filters.location}
                    </Badge>
                  )}
                  {search.filters.category && (
                    <Badge variant="secondary" className="text-xs">
                      {search.filters.category}
                    </Badge>
                  )}
                  {search.filters.rating && (
                    <Badge variant="secondary" className="text-xs">
                      ⭐ {search.filters.rating}+
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {search.resultsCount} results
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Last run: {new Date(search.lastRun).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => runSearch(search)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}