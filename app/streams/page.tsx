'use client'

import { useState, useEffect } from 'react'
import { Plus, Grid3x3, List, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StreamCard } from '@/components/streams/stream-card'
import { StreamWizard } from '@/components/streams/stream-wizard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stream, CreateStreamRequest, StreamFilters } from '@/types/streams'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import type { Row } from '@/lib/supabase/helpers'

export default function StreamsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [streams, setStreams] = useState<Stream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'completed'>('active')
  const [orgId, setOrgId] = useState<string>('')

  // Get user's org_id
  useEffect(() => {
    async function getOrgId() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('Auth user:', user?.id, 'Error:', authError)

        if (!user) {
          console.error('No user found')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single() as { data: Row<'profiles'> | null; error: any }

        console.log('Profile:', profile, 'Error:', profileError)

        if (profile?.org_id) {
          console.log('Setting org_id from profile:', profile.org_id)
          setOrgId(profile.org_id)
        } else {
          // If user doesn't have org_id, the API will create one when they create their first stream
          // Set a temporary placeholder to enable the wizard
          setOrgId('pending')
          console.log('No org_id found - will be created when first stream is created')
        }
      } catch (error) {
        console.error('Error in getOrgId:', error)
      }
    }
    getOrgId()
  }, [supabase])

  // Fetch streams
  useEffect(() => {
    if (!orgId || orgId === 'pending') return
    fetchStreams()
  }, [orgId, statusFilter, searchQuery])

  const fetchStreams = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/streams?${params}`)
      if (!response.ok) throw new Error('Failed to fetch streams')

      const data = await response.json()
      setStreams(data.streams || [])
    } catch (error) {
      console.error('Error fetching streams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStream = async (data: CreateStreamRequest) => {
    try {
      console.log('[StreamsPage] Creating stream with data:', data)
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      console.log('[StreamsPage] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[StreamsPage] Error response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to create stream')
      }

      const newStream = await response.json()
      console.log('[StreamsPage] Stream created:', newStream)
      setStreams([newStream, ...streams])

      // If org_id was pending, refresh the profile to get the actual org_id
      if (orgId === 'pending') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single() as { data: Row<'profiles'> | null; error: any }

          if (profile?.org_id) {
            setOrgId(profile.org_id)
          }
        }
      }
    } catch (error) {
      console.error('[StreamsPage] Error creating stream:', error)
      throw error
    }
  }

  const handleDeleteStream = async (stream: Stream) => {
    if (!confirm(`Are you sure you want to delete "${stream.name}"?`)) return

    try {
      const response = await fetch(`/api/streams/${stream.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete stream')

      setStreams(streams.filter(s => s.id !== stream.id))
    } catch (error) {
      console.error('Error deleting stream:', error)
    }
  }

  return (


    <ProtectedLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-14 z-30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Streams</h1>
              <p className="text-muted-foreground mt-1">
                Organize your deals, research, and collaboration in dedicated workspaces
              </p>
            </div>
            <Button onClick={() => {
              console.log('Button clicked, opening wizard')
              setIsWizardOpen(true)
            }} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              New Stream
            </Button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search streams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Filter className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No streams found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first stream to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setIsWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Stream
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                onDelete={handleDeleteStream}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stream Wizard */}
      {console.log('Rendering wizard with open:', isWizardOpen, 'orgId:', orgId)}
      <StreamWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onComplete={handleCreateStream}
        orgId={orgId}
      />
    </div>
  </ProtectedLayout>

  )
}
