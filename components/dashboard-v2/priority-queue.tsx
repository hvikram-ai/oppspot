'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Flame, AlertCircle, Sparkles, Check, X } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'

interface QueueItem {
  id: string
  item_type: string
  status: string
  priority_level: 'critical' | 'high' | 'medium' | 'low'
  priority_score: number
  title: string
  description: string
  action_label: string
  action_url: string
  created_at: string
  age_days: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const priorityConfig = {
  critical: { icon: Flame, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950', emoji: '🔥' },
  high: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950', emoji: '⚠️' },
  medium: { icon: Sparkles, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950', emoji: '✨' },
  low: { icon: Sparkles, color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-950', emoji: '📋' }
}

export function PriorityQueue() {
  const { data, error, mutate } = useSWR<{ items: QueueItem[], total: number }>(
    '/api/dashboard/priority-queue?status=pending&limit=20',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const updateItemStatus = async (id: string, status: 'in_progress' | 'completed' | 'dismissed') => {
    await fetch(`/api/dashboard/priority-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    mutate()
  }

  if (error || !data?.items?.length) {
    return (
      <Card data-testid="priority-queue">
        <CardHeader>
          <CardTitle>Priority Queue</CardTitle>
          <CardDescription>No pending actions right now</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p>You&apos;re all caught up! Great work.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="priority-queue" className="w-full">
      <CardHeader className="px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl">Priority Queue</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {data.total} pending action{data.total === 1 ? '' : 's'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6">
        <ScrollArea className="h-[400px] sm:h-[500px] pr-2 sm:pr-4">
          <div className="space-y-3">
            {data.items.map((item) => {
              const config = priorityConfig[item.priority_level]
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  data-testid="queue-item"
                  data-priority={item.priority_level}
                  data-status={item.status}
                  className={`p-3 sm:p-4 rounded-lg border ${config.bgColor} transition-all hover:shadow-md touch-manipulation`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm" data-field="title">
                            {config.emoji} {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1" data-field="description">
                            {item.description}
                          </p>
                        </div>
                        <Badge
                          variant={item.priority_level === 'critical' ? 'destructive' : 'secondary'}
                          data-testid="priority-badge"
                        >
                          {item.priority_level}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={item.action_url}>
                          <Button size="sm" variant="default">
                            {item.action_label}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemStatus(item.id, 'completed')}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateItemStatus(item.id, 'dismissed')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {item.age_days > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Created {item.age_days} day{item.age_days === 1 ? '' : 's'} ago
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
