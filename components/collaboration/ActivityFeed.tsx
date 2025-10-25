'use client'

/**
 * Activity Feed Component
 * Real-time feed of team activities
 */

import { useActivityFeed } from '@/hooks/use-activity-feed'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  Eye,
  Bookmark,
  Share2,
  FileText,
  Activity,
  Bot,
  Play,
  List,
  MessageCircle,
  AtSign,
  Upload,
  Download,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ActivityFeedProps {
  entityType?: string
  entityId?: string
  limit?: number
  showLoadMore?: boolean
  className?: string
}

export function ActivityFeed({
  entityType,
  entityId,
  limit = 50,
  showLoadMore = true,
  className = ''
}: ActivityFeedProps) {
  const { activities, loading, hasMore, loadMore } = useActivityFeed({
    limit,
    entityType,
    entityId
  })

  if (loading && activities.length === 0) {
    return <ActivityFeedSkeleton />
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team activity yet</p>
      </div>
    )
  }

  // Group activities by date
  const groupedActivities = groupActivitiesByDate(activities)

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <div key={date}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sticky top-0 bg-white py-2 z-10">
            {date}
          </h3>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {dateActivities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity as any}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {showLoadMore && hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}

interface Activity {
  id: string
  created_at: string
  activity_type: string
  entity_type: string
  entity_id: string
  entity_name?: string
  user_name?: string
  user_avatar?: string
  metadata?: {
    items_created?: number
    [key: string]: unknown
  }
}

function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  const icon = getActivityIcon(activity.activity_type)
  const description = getActivityDescription(activity)
  const url = getActivityUrl(activity)
  const relativeTime = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {activity.user_avatar ? (
          <img
            src={activity.user_avatar}
            alt={activity.user_name || 'User'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {(activity.user_name || '?').substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium text-gray-900">
                {activity.user_name || 'Someone'}
              </span>
              {' '}
              <span className="text-gray-600">{description}</span>
              {' '}
              {url ? (
                <Link
                  href={url}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {activity.entity_name}
                </Link>
              ) : (
                <span className="font-medium text-gray-900">
                  {activity.entity_name}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{relativeTime}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function getActivityIcon(activityType: string) {
  const iconClass = "w-4 h-4"

  switch (activityType) {
    case 'company_viewed':
      return <Eye className={`${iconClass} text-blue-500`} />
    case 'company_saved':
      return <Bookmark className={`${iconClass} text-yellow-500`} />
    case 'company_shared':
      return <Share2 className={`${iconClass} text-green-500`} />
    case 'research_generated':
      return <FileText className={`${iconClass} text-purple-500`} />
    case 'signal_detected':
      return <Activity className={`${iconClass} text-orange-500`} />
    case 'agent_created':
      return <Bot className={`${iconClass} text-indigo-500`} />
    case 'agent_run':
      return <Play className={`${iconClass} text-green-500`} />
    case 'stream_created':
      return <TrendingUp className={`${iconClass} text-blue-500`} />
    case 'list_created':
      return <List className={`${iconClass} text-gray-500`} />
    case 'comment_added':
      return <MessageCircle className={`${iconClass} text-blue-500`} />
    case 'mention_added':
      return <AtSign className={`${iconClass} text-purple-500`} />
    case 'file_uploaded':
      return <Upload className={`${iconClass} text-green-500`} />
    case 'export_created':
      return <Download className={`${iconClass} text-blue-500`} />
    default:
      return <Activity className={`${iconClass} text-gray-500`} />
  }
}

function getActivityDescription(activity: Activity): string {
  switch (activity.activity_type) {
    case 'company_viewed':
      return 'viewed'
    case 'company_saved':
      return 'saved'
    case 'company_shared':
      return 'shared'
    case 'research_generated':
      return 'generated research for'
    case 'signal_detected':
      return 'detected a buying signal in'
    case 'agent_created':
      return 'created agent'
    case 'agent_run':
      return `ran agent ${activity.metadata?.items_created ? `and found ${activity.metadata.items_created} companies` : ''}`
    case 'stream_created':
      return 'created stream'
    case 'list_created':
      return 'created list'
    case 'comment_added':
      return 'commented on'
    case 'mention_added':
      return 'mentioned you in'
    case 'file_uploaded':
      return 'uploaded a file to'
    case 'export_created':
      return 'exported'
    default:
      return 'interacted with'
  }
}

function getActivityUrl(activity: Activity): string | null {
  const { entity_type, entity_id } = activity

  switch (entity_type) {
    case 'company':
      return `/business/${entity_id}`
    case 'stream':
      return `/streams/${entity_id}`
    case 'agent':
      return `/agents/${entity_id}`
    case 'list':
      return `/lists/${entity_id}`
    case 'data_room':
      return `/data-rooms/${entity_id}`
    default:
      return null
  }
}

function groupActivitiesByDate(activities: Array<{
  id: string
  created_at: string
  activity_type: string
  entity_name?: string
  user_name?: string
}>): Record<string, Array<{
  id: string
  created_at: string
  activity_type: string
  entity_name?: string
  user_name?: string
}>> {
  const groups: Record<string, Array<{
    id: string
    created_at: string
    activity_type: string
    entity_name?: string
    user_name?: string
  }>> = {}
  const now = new Date()

  activities.forEach(activity => {
    const activityDate = new Date(activity.created_at)
    const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

    let label: string
    if (daysDiff === 0) {
      label = 'Today'
    } else if (daysDiff === 1) {
      label = 'Yesterday'
    } else if (daysDiff < 7) {
      label = 'This Week'
    } else if (daysDiff < 30) {
      label = 'This Month'
    } else {
      label = format(activityDate, 'MMMM yyyy')
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(activity)
  })

  return groups
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
