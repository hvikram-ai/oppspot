'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Building2, 
  Download, 
  UserPlus,
  FileText,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'search' | 'save' | 'export' | 'share' | 'list_create'
  title: string
  description: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface RecentActivityProps {
  userId: string
}

export function RecentActivity({ userId }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'search',
        title: 'Searched for "tech startups"',
        description: 'Found 156 matching businesses in London',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        metadata: { results: 156, location: 'London' }
      },
      {
        id: '2',
        type: 'save',
        title: 'Saved TechCorp Ltd',
        description: 'Added to "Potential Clients" list',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        metadata: { businessName: 'TechCorp Ltd', listName: 'Potential Clients' }
      },
      {
        id: '3',
        type: 'export',
        title: 'Exported 45 businesses',
        description: 'Downloaded as CSV file',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        metadata: { count: 45, format: 'CSV' }
      },
      {
        id: '4',
        type: 'list_create',
        title: 'Created new list',
        description: '"Q4 Prospects" list created',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        metadata: { listName: 'Q4 Prospects' }
      },
      {
        id: '5',
        type: 'share',
        title: 'Shared list with team',
        description: 'Shared "Hot Leads" with 3 team members',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        metadata: { listName: 'Hot Leads', sharedWith: 3 }
      }
    ]
    
    setTimeout(() => {
      setActivities(mockActivities)
      setLoading(false)
    }, 500)
  }, [userId])

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'search':
        return Search
      case 'save':
        return Building2
      case 'export':
        return Download
      case 'share':
        return UserPlus
      case 'list_create':
        return FileText
      default:
        return Clock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'search':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'save':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'export':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'share':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'list_create':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start by searching for businesses or creating a list
            </p>
            <Link href="/search">
              <Button className="mt-4">
                <Search className="h-4 w-4 mr-2" />
                Start Searching
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and searches</CardDescription>
          </div>
          <Link href="/activity">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const colorClass = getActivityColor(activity.type)
              
              return (
                <div key={activity.id} className="flex items-start gap-4 group">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">
                        {activity.title}
                      </p>
                      {activity.metadata?.location && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {activity.metadata.location as any as any}
                        </Badge>
                      ) as any}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}