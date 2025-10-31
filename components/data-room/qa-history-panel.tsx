'use client'

/**
 * Q&A History Panel Component
 * Feature: 008-oppspot-docs-dataroom
 * Task: T029
 *
 * Sidebar/modal displaying query history with pagination,
 * export functionality, and deletion options
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  History,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { HistoricalQuery, HistoryResponse } from '@/types/data-room-qa'

interface HistoryPanelProps {
  dataRoomId: string
  onQuerySelect?: (query: HistoricalQuery) => void
  className?: string
  trigger?: React.ReactNode
}

export function HistoryPanel({
  dataRoomId,
  onQuerySelect,
  className,
  trigger
}: HistoryPanelProps) {
  const [queries, setQueries] = useState<HistoricalQuery[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set())

  const DEFAULT_LIMIT = 50

  useEffect(() => {
    loadHistory()
  }, [dataRoomId])

  const loadHistory = async (cursor?: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: DEFAULT_LIMIT.toString(),
        order: 'desc'
      })
      if (cursor) {
        params.append('cursor', cursor)
      }

      const response = await fetch(
        `/api/data-room/${dataRoomId}/history?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to load history')
      }

      const data: HistoryResponse = await response.json()

      setQueries(prev => cursor ? [...prev, ...data.queries] : data.queries)
      setHasMore(data.has_more)
      setNextCursor(data.next_cursor)
    } catch (err) {
      console.error('Error loading history:', err)
      setError('Failed to load query history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (nextCursor && !loading) {
      loadHistory(nextCursor)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true)

    try {
      const response = await fetch(
        `/api/data-room/${dataRoomId}/export?format=${format}`
      )

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const data = await response.json()

      // Open download URL in new tab
      window.open(data.download_url, '_blank')

      toast.success(`Query history exported as ${format.toUpperCase()}`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export history. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteQuery = async (queryId: string) => {
    setDeleting(queryId)

    try {
      const response = await fetch(`/api/data-room/${dataRoomId}/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_ids: [queryId]
        })
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      // Remove from local state
      setQueries(prev => prev.filter(q => q.query_id !== queryId))
      setSelectedQueries(prev => {
        const next = new Set(prev)
        next.delete(queryId)
        return next
      })

      toast.success('Query deleted successfully')
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete query. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    setDeleting('all')

    try {
      const response = await fetch(`/api/data-room/${dataRoomId}/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Delete all failed')
      }

      const data = await response.json()

      // Clear local state
      setQueries([])
      setSelectedQueries(new Set())
      setHasMore(false)
      setNextCursor(undefined)

      toast.success(`Deleted ${data.deleted_count} queries`)
    } catch (err) {
      console.error('Delete all error:', err)
      toast.error('Failed to delete all queries. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    }

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) {
      return `${diffDays}d ago`
    }

    return date.toLocaleDateString()
  }

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const getAnswerTypeBadge = (answerType: string | null) => {
    switch (answerType) {
      case 'grounded':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Answered
          </Badge>
        )
      case 'insufficient_evidence':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Insufficient
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  const getFeedbackIcon = (rating: string | null) => {
    if (rating === 'helpful') {
      return <ThumbsUp className="h-3.5 w-3.5 text-green-600 fill-green-600" />
    }
    if (rating === 'not_helpful') {
      return <ThumbsDown className="h-3.5 w-3.5 text-red-600 fill-red-600" />
    }
    return null
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">
              {queries.length} {queries.length === 1 ? 'query' : 'queries'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadHistory()}
                    disabled={loading}
                  >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={exporting || queries.length === 0}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={queries.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {queries.length} queries and their answers.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Separator />
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Queries List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        {loading && queries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No queries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your question history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {queries.map((query) => (
              <Card
                key={query.query_id}
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => onQuerySelect?.(query)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Question */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">
                        {truncateText(query.question, 120)}
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            disabled={deleting === query.query_id}
                          >
                            {deleting === query.query_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete query?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this query and its answer.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteQuery(query.query_id)
                              }}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {query.answer && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {truncateText(query.answer, 150)}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {getAnswerTypeBadge(query.answer_type)}

                    {query.citation_count > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {query.citation_count}
                      </Badge>
                    )}

                    {query.feedback_rating && (
                      <Badge variant="outline" className="gap-1">
                        {getFeedbackIcon(query.feedback_rating)}
                      </Badge>
                    )}

                    <span className="text-muted-foreground">
                      {formatTimestamp(query.created_at)}
                    </span>

                    {query.total_time_ms && (
                      <span className="text-muted-foreground">
                        • {(query.total_time_ms / 1000).toFixed(1)}s
                      </span>
                    )}

                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More */}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // If trigger provided, render as Sheet (sidebar)
  if (trigger) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Query History
            </SheetTitle>
            <SheetDescription>
              View and manage your previous questions
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  // Default: render as standalone component
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Query History
        </CardTitle>
        <CardDescription>View and manage your previous questions</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {content}
      </CardContent>
    </Card>
  )
}
