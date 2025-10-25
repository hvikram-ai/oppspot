'use client'

/**
 * Data Rooms List Page
 * View all accessible data rooms with create option
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  FolderOpen,
  FileText,
  HardDrive,
  Users,
  Calendar,
  Loader2,
  Archive,
  Briefcase
} from 'lucide-react'
import type { DataRoom } from '@/lib/data-room/types'
import { ProtectedLayout } from '@/components/layout/protected-layout'

interface DataRoomWithStats extends DataRoom {
  owner_name: string
  my_permission: string | null
}

export default function DataRoomsPage() {
  const router = useRouter()
  const [dataRooms, setDataRooms] = useState<DataRoomWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active')

  const fetchDataRooms = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/data-rooms?status=${statusFilter}`)
      const result = await response.json()

      if (result.success) {
        setDataRooms(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch data rooms:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchDataRooms()
  }, [fetchDataRooms])

  const filteredRooms = dataRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getDealTypeIcon = (dealType: string) => {
    switch (dealType) {
      case 'acquisition': return '🏢'
      case 'investment': return '💰'
      case 'partnership': return '🤝'
      case 'merger': return '🔀'
      case 'sale': return '💼'
      default: return '📁'
    }
  }

  return (


    <ProtectedLayout>
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Data Rooms
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered due diligence workspaces
          </p>
        </div>
        <Link href="/data-rooms/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Data Room
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
                <p className="text-2xl font-bold">{dataRooms.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">
                  {dataRooms.reduce((sum, room) => sum + room.document_count, 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">
                  {formatBytes(dataRooms.reduce((sum, room) => sum + room.storage_used_bytes, 0))}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shared Rooms</p>
                <p className="text-2xl font-bold">
                  {dataRooms.filter(r => r.my_permission !== 'owner').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search data rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'archived' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('archived')}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </Button>
        </div>
      </div>

      {/* Data Rooms Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data rooms found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first data room to get started'}
            </p>
            {!searchQuery && (
              <Link href="/data-rooms/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Data Room
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/data-rooms/${room.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{getDealTypeIcon(room.deal_type)}</span>
                      {room.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {room.description || 'No description'}
                    </CardDescription>
                  </div>
                  {room.my_permission && (
                    <Badge variant={room.my_permission === 'owner' ? 'default' : 'secondary'}>
                      {room.my_permission}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {room.document_count} {room.document_count === 1 ? 'doc' : 'docs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatBytes(room.storage_used_bytes)}
                      </span>
                    </div>
                  </div>

                  {/* Owner & Date */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{room.owner_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Created {new Date(room.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Deal Type Badge */}
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {room.deal_type.replace('_', ' ')}
                    </Badge>
                    {room.status === 'archived' && (
                      <Badge variant="secondary" className="text-xs">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  </ProtectedLayout>

  )
}
