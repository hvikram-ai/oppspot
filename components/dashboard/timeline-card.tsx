'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  timestamp: Date | string
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  icon?: LucideIcon
  badges?: string[]
  metadata?: Record<string, unknown>
}

export interface TimelineCardProps {
  title: string
  description?: string
  events: TimelineEvent[]
  maxEvents?: number
  showTime?: boolean
  className?: string
}

export function TimelineCard({
  title,
  description,
  events,
  maxEvents = 10,
  showTime = true,
  className
}: TimelineCardProps) {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'danger':
        return 'bg-red-500'
      case 'info':
        return 'bg-blue-500'
      default:
        return 'bg-gray-400'
    }
  }

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString()
  }

  const displayEvents = events.slice(0, maxEvents)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Events */}
          <div className="space-y-4">
            {displayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events to display
              </p>
            ) : (
              displayEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-2.5 w-3 h-3 rounded-full ring-4 ring-background',
                      getTypeColor(event.type)
                    )}
                  />

                  {/* Event content */}
                  <div className="ml-10 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {event.icon && (
                            <event.icon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h4 className="text-sm font-medium">{event.title}</h4>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        {event.badges && event.badges.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {event.badges.map((badge, badgeIndex) => (
                              <Badge key={badgeIndex} variant="secondary" className="text-xs">
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {showTime && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {formatTime(event.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {events.length > maxEvents && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              And {events.length - maxEvents} more events...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}