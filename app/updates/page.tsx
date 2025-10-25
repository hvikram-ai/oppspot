'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic'
import { useSearchParams } from 'next/navigation'
import { UpdateCard } from '@/components/updates/update-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import {
  TrendingUp,
  Users,
  Globe,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Sparkles
} from 'lucide-react'

interface BusinessUpdate {
  id: string
  business_id: string
  business?: {
    id: string
    name: string
    logo_url?: string
  }
  title: string
  content?: string
  type: string
  category?: string
  tags?: string[]
  image_url?: string
  link_url?: string
  link_title?: string
  published_at: string
  is_featured?: boolean
  is_verified?: boolean
  views_count: number
  likes_count: number
  shares_count?: number
  has_liked?: boolean
  has_saved?: boolean
  is_following?: boolean
}

function UpdatesPageContent() {
  const searchParams = useSearchParams()
  const [updates, setUpdates] = useState<BusinessUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [feedType, setFeedType] = useState<'all' | 'following'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        setIsAuthenticated(response.ok)
      } catch (error) {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  // Fetch updates
  const fetchUpdates = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setPage(1)
        setUpdates([])
      }

      const currentPage = reset ? 1 : page
      const params = new URLSearchParams({
        type: feedType,
        page: currentPage.toString(),
        limit: '20'
      })

      if (filterType !== 'all') {
        params.append('filter', filterType)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/updates?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (reset) {
          setUpdates(data.updates)
        } else {
          setUpdates(prev => [...prev, ...data.updates])
        }
        setHasMore(data.pagination.hasMore)
      } else if (response.status === 401 && feedType === 'following') {
        toast.error('Please sign in to see updates from businesses you follow')
        setFeedType('all')
      } else {
        toast.error(data.error || 'Failed to fetch updates')
      }
    } catch (error) {
      console.error('Error fetching updates:', error)
      toast.error('Failed to load updates')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [feedType, filterType, searchQuery, page])

  // Initial load and refetch on filter changes
  useEffect(() => {
    setLoading(true)
    fetchUpdates(true)
  }, [fetchUpdates, feedType, filterType])

  // Load more functionality
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    if (page > 1) {
      fetchUpdates()
    }
  }, [page, fetchUpdates])

  // Refresh feed
  const refreshFeed = async () => {
    setRefreshing(true)
    await fetchUpdates(true)
    toast.success('Feed refreshed')
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUpdates(true)
  }

  // Handle update interaction
  const handleInteraction = (updateId: string, action: string) => {
    // Update local state optimistically
    setUpdates(prev => prev.map(update => {
      if (update.id === updateId) {
        if (action === 'like') {
          return {
            ...update,
            has_liked: !update.has_liked,
            likes_count: update.has_liked ? update.likes_count - 1 : update.likes_count + 1
          }
        }
        if (action === 'save') {
          return {
            ...update,
            has_saved: !update.has_saved
          }
        }
      }
      return update
    }))
  }

  const updateTypes = [
    { value: 'all', label: 'All Updates' },
    { value: 'announcement', label: 'Announcements' },
    { value: 'product_launch', label: 'Product Launches' },
    { value: 'partnership', label: 'Partnerships' },
    { value: 'funding', label: 'Funding' },
    { value: 'award', label: 'Awards' },
    { value: 'event', label: 'Events' },
    { value: 'hiring', label: 'Hiring' },
    { value: 'expansion', label: 'Expansion' }
  ]

  return (


    <ProtectedLayout>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Business Updates</h1>
            <p className="text-muted-foreground">
              Stay informed about the latest news and announcements from businesses
            </p>
          </div>
          <Button
            onClick={refreshFeed}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAuthenticated && (
              <div className="flex gap-2">
                <Badge 
                  variant={feedType === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFeedType('all')}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  All Updates
                </Badge>
                <Badge 
                  variant={feedType === 'following' ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFeedType('following')}
                >
                  <Users className="h-3 w-3 mr-1" />
                  Following
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="space-y-6">
        {loading && updates.length === 0 ? (
          // Loading skeletons
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-40 w-full" />
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
          // Empty state
          <div className="text-center py-12 border rounded-lg">
            <div className="mb-4">
              {feedType === 'following' ? (
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              ) : (
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {feedType === 'following' 
                ? 'No updates from businesses you follow'
                : 'No updates found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {feedType === 'following'
                ? 'Follow businesses to see their updates here'
                : 'Check back later for new business updates'}
            </p>
            {feedType === 'following' && (
              <Button onClick={() => setFeedType('all')}>
                Browse All Updates
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Featured updates */}
            {updates.filter(u => u.is_featured).length > 0 && page === 1 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Featured Updates</h2>
                </div>
                <div className="space-y-4">
                  {updates.filter(u => u.is_featured).map(update => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      onInteraction={handleInteraction}
                      showBusinessInfo={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular updates */}
            <div className="space-y-4">
              {updates.filter(u => !u.is_featured || page > 1).map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onInteraction={handleInteraction}
                  showBusinessInfo={true}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-6">
                <Button
                  onClick={loadMore}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Updates'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </ProtectedLayout>

  )
}

export default function UpdatesPage() {
  return (

    <ProtectedLayout>
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading updates...</p>
          </div>
        </div>
      </div>
    }>
      <UpdatesPageContent />
    </Suspense>
  </ProtectedLayout>

  )
}