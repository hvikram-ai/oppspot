'use client'

/**
 * Activity Feed Component
 * Display activity log for a data room
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Eye,
  Download,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  FileText,
  FolderPlus,
  Archive,
  Activity as ActivityIcon
} from 'lucide-react'
import type { ActivityLog, ActivityAction } from '@/lib/data-room/types'

interface ActivityFeedProps {
  activities: ActivityLog[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (action: ActivityAction) => {
    const icons = {
      upload: <Upload className="h-4 w-4 text-blue-600" />,
      view: <Eye className="h-4 w-4 text-green-600" />,
      download: <Download className="h-4 w-4 text-purple-600" />,
      edit: <Edit className="h-4 w-4 text-orange-600" />,
      delete: <Trash2 className="h-4 w-4 text-red-600" />,
      share: <UserPlus className="h-4 w-4 text-blue-600" />,
      revoke: <UserMinus className="h-4 w-4 text-red-600" />,
      generate_report: <FileText className="h-4 w-4 text-green-600" />,
      create_room: <FolderPlus className="h-4 w-4 text-blue-600" />,
      archive_room: <Archive className="h-4 w-4 text-gray-600" />,
      delete_room: <Trash2 className="h-4 w-4 text-red-600" />
    }
    return icons[action] || <ActivityIcon className="h-4 w-4 text-muted-foreground" />
  }

  const getActivityDescription = (activity: ActivityLog) => {
    const actor = activity.actor_name || activity.actor_email
    const details = activity.details || {}

    switch (activity.action) {
      case 'upload':
        return `${actor} uploaded "${details.filename || 'a document'}"`
      case 'view':
        return `${actor} viewed "${details.filename || 'a document'}"`
      case 'download':
        return `${actor} downloaded "${details.filename || 'a document'}"`
      case 'edit':
        return `${actor} edited data room settings`
      case 'delete':
        return `${actor} deleted "${details.filename || 'a document'}"`
      case 'share':
        return `${actor} invited ${details.invited_user_email || 'a team member'}`
      case 'revoke':
        return `${actor} removed ${details.invited_user_email || 'a team member'}`
      case 'generate_report':
        return `${actor} generated a ${details.report_type || 'report'}`
      case 'create_room':
        return `${actor} created data room "${details.name || ''}"`
      case 'archive_room':
        return `${actor} archived the data room`
      case 'delete_room':
        return `${actor} deleted the data room`
      default:
        return `${actor} performed an action`
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Complete audit trail of all actions in this data room
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-muted-foreground">
              Activity will appear here as team members upload, view, and share documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.action)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {getActivityDescription(activity)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatTimeAgo(activity.created_at)}</span>
                    {activity.ip_address && (
                      <>
                        <span>•</span>
                        <span>IP: {activity.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {new Date(activity.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
