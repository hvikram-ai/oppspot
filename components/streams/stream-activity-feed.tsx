'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus,
  Edit,
  Trash,
  UserPlus,
  MessageSquare,
  FileText,
  CheckCircle,
} from 'lucide-react'

interface Activity {
  id: string
  activity_type: string
  description: string
  created_at: string
  user?: {
    full_name?: string
    avatar_url?: string
  }
  metadata?: Record<string, any>
}

interface StreamActivityFeedProps {
  activities: Activity[]
}

const activityIcons = {
  stream_created: Plus,
  stream_updated: Edit,
  stream_deleted: Trash,
  item_added: Plus,
  item_updated: Edit,
  item_deleted: Trash,
  item_moved: Edit,
  member_added: UserPlus,
  member_removed: UserPlus,
  comment_added: MessageSquare,
  status_changed: CheckCircle,
}

const activityColors = {
  stream_created: 'text-green-600',
  stream_updated: 'text-blue-600',
  stream_deleted: 'text-red-600',
  item_added: 'text-green-600',
  item_updated: 'text-blue-600',
  item_deleted: 'text-red-600',
  item_moved: 'text-purple-600',
  member_added: 'text-green-600',
  member_removed: 'text-red-600',
  comment_added: 'text-blue-600',
  status_changed: 'text-orange-600',
}

export function StreamActivityFeed({ activities }: StreamActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || FileText
        const iconColor = activityColors[activity.activity_type as keyof typeof activityColors] || 'text-gray-600'

        return (
          <div key={activity.id} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-2 rounded-full bg-muted h-fit ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {activity.user && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.user.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {activity.user.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {activity.user.full_name || 'Unknown User'}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {JSON.stringify(activity.metadata, null, 2)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
