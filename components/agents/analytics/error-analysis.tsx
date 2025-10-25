'use client'

/**
 * Error Analysis Component
 * Visualize error patterns and common failures
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'

interface ErrorAnalysis {
  errorType: string
  errorMessage: string
  count: number
  lastOccurrence: string
  affectedAgents: string[]
}

interface ErrorAnalysisProps {
  errors: ErrorAnalysis[]
  isLoading?: boolean
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function ErrorRow({ error }: { error: ErrorAnalysis }) {
  return (
    <div className="border-b border-border p-4 last:border-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h4 className="font-medium">{error.errorType}</h4>
            <Badge variant="destructive" className="text-xs">
              {error.count}x
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{error.errorMessage}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last: {formatDate(error.lastOccurrence)}
            </span>
            <span>Affected: {error.affectedAgents.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="border-b border-border p-4">
      <div className="flex items-start gap-3">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function ErrorAnalysis({ errors, isLoading }: ErrorAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="border-b border-border p-6">
          <h3 className="text-lg font-semibold">Error Analysis</h3>
          <p className="text-sm text-muted-foreground">Common errors and failure patterns</p>
        </div>
        <div>
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </Card>
    )
  }

  if (errors.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold">No Errors Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          All agent executions completed successfully in the selected time range
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Error Analysis</h3>
            <p className="text-sm text-muted-foreground">Common errors and failure patterns</p>
          </div>
          <Badge variant="destructive">{errors.length} error types</Badge>
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {errors.map((error, index) => (
          <ErrorRow key={index} error={error} />
        ))}
      </div>
    </Card>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
