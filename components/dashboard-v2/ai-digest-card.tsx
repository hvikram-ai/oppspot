'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ChevronDown, ChevronUp, Clock, TrendingUp, CheckCircle2, Lightbulb } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import useSWR from 'swr'

interface DigestData {
  overnight_discoveries?: Array<{
    type: string
    title: string
    description: string
    action_url: string
    priority: string
  }>
  urgent_alerts?: Array<{
    type: string
    title: string
    company_ids?: string[]
    days_since_contact?: number
  }>
  completed_work?: Array<{
    type: string
    title: string
    report_ids?: string[]
  }>
  recommendations?: Array<{
    type: string
    title: string
    reason: string
  }>
}

interface AIDigest {
  id: string
  digest_data: DigestData
  priority_score: number
  generated_at: string
  read_at: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function AIDigestCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: digest, error, mutate } = useSWR<AIDigest>('/api/dashboard/digest', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  })

  const markAsRead = async () => {
    if (digest && !digest.read_at) {
      await fetch(`/api/dashboard/digest/${digest.id}/read`, { method: 'POST' })
      mutate()
    }
  }

  useEffect(() => {
    if (digest && !digest.read_at) {
      // Mark as read after 3 seconds of viewing
      const timer = setTimeout(markAsRead, 3000)
      return () => clearTimeout(timer)
    }
  }, [digest])

  // Gracefully handle errors and missing data
  if (error || !digest || !digest.digest_data) {
    return null // Gracefully hide if no digest available
  }

  const { digest_data } = digest

  // Safely check for content with null checks
  const discoveryCount = digest_data?.overnight_discoveries?.length || 0
  const alertCount = digest_data?.urgent_alerts?.length || 0
  const completedCount = digest_data?.completed_work?.length || 0
  const recommendationCount = digest_data?.recommendations?.length || 0

  const hasContent = discoveryCount + alertCount + completedCount + recommendationCount > 0

  if (!hasContent) {
    return null
  }

  return (
    <Card className="border-l-4 border-l-purple-500 w-full" data-testid="ai-digest-card">
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <CardTitle className="text-lg sm:text-xl truncate">AI Daily Digest</CardTitle>
            {!digest.read_at && (
              <Badge variant="secondary" className="ml-auto sm:ml-2 flex-shrink-0">New</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="min-w-[44px] min-h-[44px] flex-shrink-0"
            aria-label={isExpanded ? "Collapse digest" : "Expand digest"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Generated {formatDistanceToNow(new Date(digest.generated_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:px-6">
        {/* Overnight Discoveries */}
        {discoveryCount > 0 && (
          <div className="space-y-2" data-section="overnight_discoveries">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-semibold text-xs sm:text-sm">
                {discoveryCount} new opportunit{discoveryCount === 1 ? 'y' : 'ies'} found overnight
              </h3>
            </div>
            {isExpanded && digest_data.overnight_discoveries?.map((item, idx) => (
              <div key={idx} className="ml-4 sm:ml-6 p-3 rounded-md bg-blue-50 dark:bg-blue-950 touch-manipulation">
                <p className="text-sm font-medium break-words">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{item.description}</p>
                <Link href={item.action_url}>
                  <Button variant="link" size="sm" className="h-auto p-0 mt-2 min-h-[44px]">
                    View →
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Urgent Alerts */}
        {alertCount > 0 && (
          <div className="space-y-2" data-section="urgent_alerts">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <h3 className="font-semibold text-sm">
                {alertCount} lead{alertCount === 1 ? '' : 's'} need{alertCount === 1 ? 's' : ''} follow-up
              </h3>
            </div>
            {isExpanded && digest_data.urgent_alerts?.map((item, idx) => (
              <div key={idx} className="ml-6 p-2 rounded-md bg-orange-50 dark:bg-orange-950">
                <p className="text-sm font-medium">{item.title}</p>
                {item.days_since_contact && (
                  <p className="text-xs text-muted-foreground">
                    Last contacted {item.days_since_contact} days ago
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completed Work */}
        {completedCount > 0 && (
          <div className="space-y-2" data-section="completed_work">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-sm">
                {completedCount} research report{completedCount === 1 ? '' : 's'} completed
              </h3>
            </div>
            {isExpanded && digest_data.completed_work?.map((item, idx) => (
              <div key={idx} className="ml-6 p-2 rounded-md bg-green-50 dark:bg-green-950">
                <p className="text-sm font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendationCount > 0 && (
          <div className="space-y-2" data-section="recommendations">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <h3 className="font-semibold text-sm">Recommendations</h3>
            </div>
            {isExpanded && digest_data.recommendations?.map((item, idx) => (
              <div key={idx} className="ml-6 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        )}

        {!isExpanded && (
          <Button
            variant="outline"
            className="w-full min-h-[44px] touch-manipulation"
            onClick={() => setIsExpanded(true)}
            aria-label="View all digest details"
          >
            View All Details
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
