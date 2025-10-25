'use client'

/**
 * TeamPlay™ - Multiplayer Collaboration Dashboard
 * Real-time team activity feed and presence indicators
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ActivityTracker, PresenceTracker } from '@/lib/teamplay/activity-tracker'
import { Users, Activity, Clock, Eye, Save, Bot, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ProtectedLayout } from '@/components/layout/protected-layout'

const ACTIVITY_ICONS: Record<string, any> = {
  company_viewed: Eye,
  company_saved: Save,
  research_generated: Zap,
  agent_created: Bot,
  agent_run: Activity,
  stream_created: Users
}

const ACTIVITY_LABELS: Record<string, string> = {
  company_viewed: 'viewed',
  company_saved: 'saved',
  research_generated: 'generated research for',
  agent_created: 'created agent',
  agent_run: 'ran agent',
  stream_created: 'created stream'
}

export default function TeamPlayPage() {
  const [activities, setActivities] = useState<Array<{
    id: string
    activity_type: string
    entity_name?: string
    created_at: string
    user?: { full_name?: string; email?: string }
  }>>([])
  const [onlineUsers, setOnlineUsers] = useState<Array<{
    id: string
    status: string
    current_page?: string
    user?: { full_name?: string; email?: string }
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Start presence tracking
    PresenceTracker.start()

    loadData()

    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000)

    return () => {
      clearInterval(interval)
      PresenceTracker.stop()
    }
  }, [])

  const loadData = async () => {
    const [activitiesData, presenceData] = await Promise.all([
      ActivityTracker.getRecentActivities(50),
      PresenceTracker.getOnlineUsers()
    ])

    setActivities(activitiesData)
    setOnlineUsers(presenceData)
    setLoading(false)
  }

  return (


    <ProtectedLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          TeamPlay™
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time team collaboration and activity tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Online Users Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Online Now
              </CardTitle>
              <CardDescription>{onlineUsers.length} team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {onlineUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No one else is online</p>
              )}
              {onlineUsers.map((presence: any) => (
                <div key={presence.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {presence.user?.full_name?.[0] || presence.user?.email?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {presence.user?.full_name || presence.user?.email}
                    </p>
                    {presence.current_page && (
                      <p className="text-xs text-muted-foreground truncate">
                        {presence.current_page}
                      </p>
                    )}
                  </div>
                  <Badge variant={presence.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                    {presence.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Team Activity Feed
              </CardTitle>
              <CardDescription>Recent team actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No recent activity</div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity: any) => {
                    const Icon = ACTIVITY_ICONS[activity.activity_type] || Activity
                    const label = ACTIVITY_LABELS[activity.activity_type] || activity.activity_type

                    return (


                      <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="text-sm">
                              <span className="font-medium">
                                {activity.user?.full_name || activity.user?.email || 'Someone'}
                              </span>
                              {' '}
                              <span className="text-muted-foreground">{label}</span>
                              {' '}
                              <span className="font-medium">{activity.entity_name}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </ProtectedLayout>

  )
}
