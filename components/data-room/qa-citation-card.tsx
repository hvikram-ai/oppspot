'use client'

/**
 * Citation Card Component
 * Feature: 008-oppspot-docs-dataroom
 * Task: T028
 *
 * Displays a citation as a clickable card/chip with document metadata,
 * page number, text preview, and relevance score
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FileText, ExternalLink, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CitationResponse } from '@/types/data-room-qa'

interface CitationCardProps {
  citation: CitationResponse
  index?: number
  onClick?: () => void
  showRelevanceScore?: boolean
  variant?: 'card' | 'chip' | 'compact'
  className?: string
}

export function CitationCard({
  citation,
  index,
  onClick,
  showRelevanceScore = false,
  variant = 'card',
  className
}: CitationCardProps) {
  const relevancePercentage = Math.round(citation.relevance_score * 100)

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-50'
    if (score >= 0.6) return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }

  const truncatePreview = (text: string, maxLength: number = 240): string => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Chip variant - compact inline display
  if (variant === 'chip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'bg-primary/10 hover:bg-primary/20 text-primary',
                'text-xs font-medium transition-colors',
                'border border-primary/20 hover:border-primary/30',
                className
              )}
            >
              {index !== undefined && (
                <span className="font-semibold">[{index}]</span>
              )}
              <FileText className="h-3 w-3" />
              <span className="max-w-[150px] truncate">
                {citation.document_title}
              </span>
              <span className="opacity-70">p.{citation.page_number}</span>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{truncatePreview(citation.text_preview, 120)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Compact variant - minimal display
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-start gap-2 p-2 rounded-lg text-left',
          'hover:bg-muted/50 transition-colors w-full',
          className
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          {index !== undefined && (
            <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {index}
            </Badge>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {citation.document_title}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Page {citation.page_number}
          </p>

          {showRelevanceScore && (
            <div className="flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">
                {relevancePercentage}% relevant
              </span>
            </div>
          )}
        </div>

        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
    )
  }

  // Card variant - full display with preview
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        'group',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {index !== undefined && (
              <Badge
                variant="outline"
                className="flex-shrink-0 h-6 w-6 p-0 flex items-center justify-center font-semibold"
              >
                {index}
              </Badge>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {citation.document_title}
                </h4>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Page {citation.page_number}
                {citation.rank && <span className="ml-2">• Rank #{citation.rank}</span>}
              </p>
            </div>
          </div>

          {showRelevanceScore && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      'flex-shrink-0',
                      getRelevanceColor(citation.relevance_score)
                    )}
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {relevancePercentage}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Relevance score</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Text Preview */}
        <div className="rounded-md bg-muted/50 p-3 border border-border/40">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {truncatePreview(citation.text_preview, 240)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Click to view in document
          </span>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}

interface CitationListProps {
  citations: CitationResponse[]
  onCitationClick?: (citation: CitationResponse, index: number) => void
  showRelevanceScores?: boolean
  variant?: 'card' | 'chip' | 'compact'
  className?: string
}

/**
 * CitationList - Renders a list of citations
 * Helper component for displaying multiple citations
 */
export function CitationList({
  citations,
  onCitationClick,
  showRelevanceScores = false,
  variant = 'card',
  className
}: CitationListProps) {
  if (citations.length === 0) {
    return null
  }

  // For chip variant, render inline
  if (variant === 'chip') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {citations.map((citation, idx) => (
          <CitationCard
            key={idx}
            citation={citation}
            index={idx + 1}
            onClick={() => onCitationClick?.(citation, idx)}
            variant="chip"
            showRelevanceScore={showRelevanceScores}
          />
        ))}
      </div>
    )
  }

  // For card/compact variants, render as vertical list
  return (
    <div className={cn('space-y-3', className)}>
      {citations.map((citation, idx) => (
        <CitationCard
          key={idx}
          citation={citation}
          index={idx + 1}
          onClick={() => onCitationClick?.(citation, idx)}
          variant={variant}
          showRelevanceScore={showRelevanceScores}
        />
      ))}
    </div>
  )
}
