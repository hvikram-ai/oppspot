'use client'

/**
 * Data Room Card Component
 * Display data room summary in a card format
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  HardDrive,
  Users,
  Calendar,
  Archive,
  Trash2,
  MoreVertical,
  ExternalLink,
  Edit,
  Share2,
  Eye
} from 'lucide-react'
import type { DataRoomWithStats } from '@/lib/data-room/types'

interface DataRoomCardProps {
  dataRoom: DataRoomWithStats
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
}

export function DataRoomCard({ dataRoom, onArchive, onDelete, onShare }: DataRoomCardProps) {
  const router = useRouter()

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
      case 'due_diligence': return '🔍'
      default: return '📁'
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'viewer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'commenter': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const canEdit = dataRoom.my_permission === 'owner' || dataRoom.my_permission === 'editor'
  const canDelete = dataRoom.my_permission === 'owner'

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => router.push(`/data-rooms/${dataRoom.id}`)}
          >
            <CardTitle className="flex items-center gap-2 text-lg group-hover:text-blue-600 transition-colors">
              <span className="text-2xl">{getDealTypeIcon(dataRoom.deal_type)}</span>
              <span className="line-clamp-1">{dataRoom.name}</span>
            </CardTitle>
            <CardDescription className="mt-1.5 line-clamp-2">
              {dataRoom.description || 'No description provided'}
            </CardDescription>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/data-rooms/${dataRoom.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`/data-rooms/${dataRoom.id}`, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => router.push(`/data-rooms/${dataRoom.id}/settings`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare?.(dataRoom.id)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onArchive?.(dataRoom.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(dataRoom.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {dataRoom.document_count} {dataRoom.document_count === 1 ? 'doc' : 'docs'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">
              {formatBytes(dataRoom.storage_used_bytes)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {dataRoom.access_count} {dataRoom.access_count === 1 ? 'member' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">
              {new Date(dataRoom.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Owner */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {dataRoom.owner_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate">{dataRoom.owner_name}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="text-xs capitalize">
            {dataRoom.deal_type.replace('_', ' ')}
          </Badge>
          {dataRoom.my_permission && (
            <Badge className={`text-xs ${getPermissionColor(dataRoom.my_permission)}`}>
              {dataRoom.my_permission}
            </Badge>
          )}
          {dataRoom.status === 'archived' && (
            <Badge variant="secondary" className="text-xs">
              <Archive className="h-3 w-3 mr-1" />
              Archived
            </Badge>
          )}
        </div>

        {/* Recent Activity Preview */}
        {dataRoom.recent_activity && dataRoom.recent_activity.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
            <div className="space-y-1">
              {dataRoom.recent_activity.slice(0, 2).map((activity) => (
                <div key={activity.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                  <span className="truncate">{activity.actor_name} {activity.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
