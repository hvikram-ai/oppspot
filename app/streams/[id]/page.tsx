'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Stream, StreamItem, StreamMember } from '@/types/streams'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Users, Settings, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { StreamBoard } from '@/components/streams/stream-board'
import { StreamMembersPanel } from '@/components/streams/stream-members-panel'
import { StreamActivityFeed } from '@/components/streams/stream-activity-feed'
import { AddItemDialog } from '@/components/streams/add-item-dialog'
import { ProtectedLayout } from '@/components/layout/protected-layout'

interface StreamDetailPageProps {
  params: Promise<{ id: string }>
}

export default function StreamDetailPage({ params }: StreamDetailPageProps) {
  const { id: streamId } = use(params)
  const router = useRouter()

  const [stream, setStream] = useState<Stream | null>(null)
  const [items, setItems] = useState<StreamItem[]>([])
  const [members, setMembers] = useState<StreamMember[]>([])
  const [activities, setActivities] = useState<Array<{
    id: string
    activity_type: string
    description: string
    created_at: string
    user?: { full_name?: string; avatar_url?: string }
    metadata?: Record<string, unknown>
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('board')

  useEffect(() => {
    fetchStreamDetail()
  }, [streamId])

  const fetchStreamDetail = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/streams/${streamId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/streams')
          return
        }
        throw new Error('Failed to fetch stream')
      }

      const data = await response.json()
      setStream(data.stream)
      setItems(data.items || [])
      setMembers(data.members || [])
      setActivities(data.recent_activity || [])
    } catch (error) {
      console.error('Error fetching stream:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddItem = async (itemData: Partial<StreamItem>) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      })

      if (!response.ok) throw new Error('Failed to add item')

      const newItem = await response.json()
      setItems([...items, newItem])
    } catch (error) {
      console.error('Error adding item:', error)
      throw error
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<StreamItem>) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update item')

      const updatedItem = await response.json()
      setItems(items.map(item => item.id === itemId ? updatedItem : item))
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/streams/${streamId}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete item')

      setItems(items.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedLayout>
    )
  }

  if (!stream) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Stream not found</h3>
            <Link href="/streams">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Streams
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (


    <ProtectedLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-14 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/streams">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${stream.color}20` }}
            >
              {stream.emoji}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{stream.name}</h1>
              {stream.description && (
                <p className="text-sm text-muted-foreground">{stream.description}</p>
              )}
            </div>

            <Button onClick={() => setIsAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>

            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members ({members.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab}>
          <TabsContent value="board" className="mt-0">
            <StreamBoard
              stream={stream}
              items={items}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No items yet</p>
                  <Button onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50">
                    <h4 className="font-semibold">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <StreamActivityFeed activities={activities} />
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <StreamMembersPanel streamId={streamId} members={members} setMembers={setMembers} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        onSubmit={handleAddItem}
        stream={stream}
      />
    </div>
  </ProtectedLayout>

  )
}
