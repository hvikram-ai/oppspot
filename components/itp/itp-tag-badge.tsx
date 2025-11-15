'use client'

import { Badge } from '@/components/ui/badge'
import { Target, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ITPTagBadgeProps {
  itpName: string
  itpId?: string
  matchScore?: number
  onRemove?: (itpId: string) => void
  onViewITP?: (itpId: string) => void
  className?: string
  showScore?: boolean
  removable?: boolean
}

export function ITPTagBadge({
  itpName,
  itpId,
  matchScore,
  onRemove,
  onViewITP,
  className,
  showScore = false,
  removable = false,
}: ITPTagBadgeProps) {
  const scoreColor =
    matchScore !== undefined
      ? matchScore >= 90
        ? 'text-green-600'
        : matchScore >= 75
        ? 'text-blue-600'
        : matchScore >= 60
        ? 'text-yellow-600'
        : 'text-orange-600'
      : ''

  const badgeContent = (
    <Badge
      variant="secondary"
      className={cn(
        'flex items-center gap-1 hover:bg-secondary/80 transition-colors',
        onViewITP && itpId && 'cursor-pointer',
        className
      )}
      onClick={() => onViewITP && itpId && onViewITP(itpId)}
    >
      <Target className="h-3 w-3" />
      <span className="font-medium">{itpName}</span>
      {showScore && matchScore !== undefined && (
        <span className={cn('font-bold ml-1', scoreColor)}>{matchScore}</span>
      )}
      {removable && onRemove && itpId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 ml-1 p-0 hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(itpId)
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )

  if (matchScore !== undefined || onViewITP) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">{itpName}</p>
              {matchScore !== undefined && (
                <p className={scoreColor}>Match Score: {matchScore}/100</p>
              )}
              {onViewITP && itpId && <p className="text-muted-foreground">Click to view ITP</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}
