'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '@/lib/notifications/realtime-notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { 
  Bell, 
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  TrendingUp,
  Users,
  Star,
  MessageCircle,
  AlertCircle,
  Info,
  Settings,
  Archive,
  MoreVertical
} from 'lucide-react'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications()
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (selectedType && n.type !== selectedType) return false
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_competitor':
      case 'competitor_rating_change':
        return <Users className="h-4 w-4" />
      case 'new_review':
      case 'rating_change':
        return <Star className="h-4 w-4" />
      case 'social_mention':
      case 'update_commented':
        return <MessageCircle className="h-4 w-4" />
      case 'market_shift':
      case 'business_update':
        return <TrendingUp className="h-4 w-4" />
      case 'alert_triggered':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const handleNotificationClick = async (notification: unknown) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          
          <Link href="/settings/notifications">
            <Button variant="ghost" size="sm" title="Notification settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {filter === 'unread' 
                ? 'No unread notifications' 
                : 'No notifications yet'}
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              We'll notify you when something important happens
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-accent/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    getPriorityColor(notification.priority)
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true 
                            })}
                          </span>
                          {notification.action_url && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.is_read && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t text-center">
          <Link href="/notifications">
            <Button variant="ghost" size="sm">
              View all notifications
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}