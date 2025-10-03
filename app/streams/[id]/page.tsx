'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Stream, StreamItem, StreamMember } from '@/types/streams'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Users, Settings, Loader2, BarChart3, Brain } from 'lucide-react'
import Link from 'next/link'
import { StreamBoard } from '@/components/streams/stream-board'
import { StreamMembersPanel } from '@/components/streams/stream-members-panel'
import { StreamActivityFeed } from '@/components/streams/stream-activity-feed'
import { AddItemDialog } from '@/components/streams/add-item-dialog'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { StreamDashboard } from '@/components/streams/stream-dashboard'
import { MilestoneToast } from '@/components/streams/milestone-toast'
import { AgentList } from '@/components/agents/agent-list'

interface StreamDetailPageProps {
  params: Promise<{ id: string }>
}

export default function StreamDetailPage({ params }: StreamDetailPageProps) {
  const { id: streamId } = use(params)
  const router = useRouter()

  const [stream, setStream] = useState<Stream | null>(null)
  const [items, setItems] = useState<StreamItem[]>([])
  const [members, setMembers] = useState<StreamMember[]>([])
  const [agents, setAgents] = useState<any[]>([])
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
  const [activeTab, setActiveTab] = useState('dashboard')

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

      // Fetch stream agents
      const agentsResponse = await fetch(`/api/streams/${streamId}/agents`)
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData.assignments || [])
      }
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
      {/* Milestone Notifications */}
      <MilestoneToast streamId={streamId} />
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
              <TabsTrigger value="dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="agents">
                <Brain className="h-4 w-4 mr-2" />
                Agents ({agents.length})
              </TabsTrigger>
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
          <TabsContent value="dashboard" className="mt-0">
            <StreamDashboard streamId={streamId} />
          </TabsContent>

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

          <TabsContent value="agents" className="mt-0">
            <AgentList
              streamId={streamId}
              agents={agents.map((a: any) => ({
                id: a.agent_id,
                agent_type: a.agent?.agent_type,
                name: a.agent?.name,
                description: a.agent?.description,
                is_active: a.is_active,
                auto_execute: a.auto_execute,
                execution_order: a.execution_order,
                configuration: a.execution_config || {},
                total_executions: a.total_executions,
                successful_executions: a.successful_executions,
                last_executed_at: a.last_executed_at,
                avg_execution_time_ms: a.avg_execution_time_ms
              }))}
              onAgentAdded={() => fetchStreamDetail()}
              onAgentUpdated={() => fetchStreamDetail()}
              onAgentDeleted={() => fetchStreamDetail()}
              onExecuteAgent={async (agentId) => {
                try {
                  const response = await fetch(`/api/streams/${streamId}/agents/${agentId}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                  })
                  if (response.ok) {
                    alert('Agent execution queued successfully!')
                  }
                } catch (error) {
                  console.error('Error executing agent:', error)
                }
              }}
            />
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
