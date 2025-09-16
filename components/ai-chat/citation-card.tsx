'use client'

import { ExternalLink, FileText, Globe, Database, BarChart2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Citation {
  id: string
  source_type: 'web' | 'platform' | 'document' | 'analysis'
  title: string
  url?: string
  snippet: string
  confidence: number
  relevance: number
  metadata?: Record<string, unknown>
}

interface CitationCardProps {
  citation: Citation
  index: number
  compact?: boolean
}

export function CitationCard({ citation, index, compact = false }: CitationCardProps) {
  const getSourceIcon = () => {
    switch (citation.source_type) {
      case 'web':
        return <Globe className="h-3 w-3" />
      case 'platform':
        return <Database className="h-3 w-3" />
      case 'document':
        return <FileText className="h-3 w-3" />
      case 'analysis':
        return <BarChart2 className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getSourceColor = () => {
    switch (citation.source_type) {
      case 'web':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'platform':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
      case 'document':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'analysis':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  if (compact) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        [{index}] {citation.title}
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    )
  }

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium line-clamp-1">
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  {citation.title}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                citation.title
              )}
            </h4>
            <Badge variant="secondary" className={cn('text-xs shrink-0', getSourceColor())}>
              <span className="flex items-center gap-1">
                {getSourceIcon()}
                {citation.source_type}
              </span>
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {citation.snippet}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${citation.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px]">
                {Math.round(citation.confidence * 100)}%
              </span>
            </div>

            {citation.metadata?.source && (
              <span className="text-[10px]">
                Source: {citation.metadata.source}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}