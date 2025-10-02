'use client'

/**
 * Data Room Detail Page
 * View documents, activity, and team for a specific data room
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  HardDrive,
  Users,
  Activity,
  Upload,
  Settings,
  Archive,
  Trash2,
  Loader2,
  FolderOpen,
  Clock,
  Download
} from 'lucide-react'
import type { DataRoom } from '@/lib/data-room/types'
import { UploadZone } from '@/components/data-room/upload-zone'
import { DocumentList } from '@/components/data-room/document-list'
import { ActivityFeed } from '@/components/data-room/activity-feed'
import { ProtectedLayout } from '@/components/layout/protected-layout'

interface DataRoomWithDetails extends DataRoom {
  owner_name: string
  my_permission: string | null
  data_room_access?: any[]
  documents?: any[]
  activity_logs?: any[]
}

export default function DataRoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [dataRoom, setDataRoom] = useState<DataRoomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents')

  useEffect(() => {
    fetchDataRoom()
  }, [params.id])

  const fetchDataRoom = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/data-rooms/${params.id}`)
      const result = await response.json()

      if (result.success) {
        setDataRoom(result.data)
      } else {
        console.error('Failed to fetch data room:', result.error)
        router.push('/data-rooms')
      }
    } catch (error) {
      console.error('Error fetching data room:', error)
      router.push('/data-rooms')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Archive this data room? You can restore it later.')) return

    try {
      const response = await fetch(`/api/data-rooms/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      })

      if (response.ok) {
        router.push('/data-rooms')
      }
    } catch (error) {
      console.error('Archive error:', error)
      alert('Failed to archive data room')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this data room permanently? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/data-rooms/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/data-rooms')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete data room')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedLayout>
    )
  }

  if (!dataRoom) {
    return null
  }

  const isOwner = dataRoom.my_permission === 'owner'
  const canEdit = isOwner || dataRoom.my_permission === 'editor'

  return (


    <ProtectedLayout>
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/data-rooms">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Data Rooms
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">{dataRoom.name}</h1>
              {dataRoom.status === 'archived' && (
                <Badge variant="secondary">
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              )}
              {dataRoom.my_permission && (
                <Badge variant={isOwner ? 'default' : 'secondary'}>
                  {dataRoom.my_permission}
                </Badge>
              )}
            </div>
            {dataRoom.description && (
              <p className="text-muted-foreground">{dataRoom.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Owner: {dataRoom.owner_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Created {new Date(dataRoom.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{dataRoom.document_count}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">{formatBytes(dataRoom.storage_used_bytes)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">
                  {(dataRoom.data_room_access?.length || 0) + 1}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {canEdit && (
            <UploadZone
              dataRoomId={dataRoom.id}
              onUploadComplete={fetchDataRoom}
            />
          )}
          <DocumentList
            dataRoomId={dataRoom.id}
            documents={dataRoom.documents || []}
            onDocumentDeleted={fetchDataRoom}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityFeed
            activities={dataRoom.activity_logs || []}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Access</CardTitle>
              <CardDescription>
                Manage who has access to this data room
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Owner */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{dataRoom.owner_name}</p>
                    <p className="text-sm text-muted-foreground">Owner</p>
                  </div>
                  <Badge>Owner</Badge>
                </div>

                {/* Team members */}
                {dataRoom.data_room_access?.map((access: any) => (
                  <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{access.invite_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {access.accepted_at
                          ? `Joined ${new Date(access.accepted_at).toLocaleDateString()}`
                          : 'Invited'}
                      </p>
                    </div>
                    <Badge variant="secondary">{access.permission_level}</Badge>
                  </div>
                ))}

                {dataRoom.data_room_access?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No team members yet</p>
                    <p className="text-sm">Invite colleagues to collaborate</p>
                  </div>
                )}

                {isOwner && (
                  <Button className="w-full mt-4">
                    <Users className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </ProtectedLayout>

  )
}
