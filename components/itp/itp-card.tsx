'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Target,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Star,
  Copy,
  Power,
  PowerOff,
  TrendingUp,
  Users,
  Calendar,
  Tag,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IdealTargetProfile, ITPWithStats } from '@/types/itp'
import { getScoreRange } from '@/types/itp'
import { formatDistanceToNow } from 'date-fns'

interface ITPCardProps {
  itp: ITPWithStats
  onRun?: (itpId: string) => void
  onEdit?: (itp: IdealTargetProfile) => void
  onDelete?: (itpId: string) => void
  onToggleFavorite?: (itpId: string, isFavorite: boolean) => void
  onToggleActive?: (itpId: string, isActive: boolean) => void
  onDuplicate?: (itp: IdealTargetProfile) => void
  onViewMatches?: (itpId: string) => void
  className?: string
}

export function ITPCard({
  itp,
  onRun,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleActive,
  onDuplicate,
  onViewMatches,
  className,
}: ITPCardProps) {
  const [isRunning, setIsRunning] = useState(false)

  const stats = itp.stats || {
    total_matches: 0,
    pending_matches: 0,
    accepted_matches: 0,
    rejected_matches: 0,
    avg_match_score: 0,
    top_match_score: 0,
    recent_matches: 0,
  }

  const handleRun = async () => {
    if (!onRun || isRunning) return
    setIsRunning(true)
    try {
      await onRun(itp.id)
    } finally {
      setIsRunning(false)
    }
  }

  const scoreRange = stats.avg_match_score
    ? getScoreRange(Math.round(stats.avg_match_score))
    : null

  return (
    <Card className={cn('group hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0',
                !itp.is_active && 'opacity-50'
              )}
            >
              <Target className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base truncate">{itp.name}</CardTitle>
                {itp.is_favorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                {!itp.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              {itp.description && (
                <CardDescription className="line-clamp-2">{itp.description}</CardDescription>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRun && (
                <DropdownMenuItem onClick={handleRun} disabled={!itp.is_active || isRunning}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Matching
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(itp)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(itp)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onToggleFavorite && (
                <DropdownMenuItem onClick={() => onToggleFavorite(itp.id, !itp.is_favorite)}>
                  <Star className="h-4 w-4 mr-2" />
                  {itp.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenuItem>
              )}
              {onToggleActive && (
                <DropdownMenuItem onClick={() => onToggleActive(itp.id, !itp.is_active)}>
                  {itp.is_active ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(itp.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Match Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Total Matches</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_matches}</div>
              {stats.recent_matches > 0 && (
                <div className="text-xs text-green-600">+{stats.recent_matches} this week</div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Avg Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {stats.avg_match_score ? Math.round(stats.avg_match_score) : '—'}
                </span>
                {scoreRange && (
                  <Badge variant={scoreRange.variant} className="text-xs">
                    {scoreRange.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Match Breakdown */}
          {stats.total_matches > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Match Breakdown</span>
                {onViewMatches && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onViewMatches(itp.id)}
                  >
                    View All
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="flex-1 justify-center">
                  {stats.pending_matches} Pending
                </Badge>
                <Badge variant="outline" className="flex-1 justify-center text-green-600">
                  {stats.accepted_matches} Accepted
                </Badge>
                <Badge variant="outline" className="flex-1 justify-center text-red-600">
                  {stats.rejected_matches} Rejected
                </Badge>
              </div>
            </div>
          )}

          {/* Auto-Actions */}
          {(itp.auto_tag || itp.auto_add_to_list_id) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {itp.auto_tag && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  Auto-tag: {itp.auto_tag}
                </Badge>
              )}
              {itp.auto_add_to_list_id && (
                <Badge variant="secondary" className="text-xs">
                  <List className="h-3 w-3 mr-1" />
                  Auto-add to list
                </Badge>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {itp.last_executed_at
                  ? `Run ${formatDistanceToNow(new Date(itp.last_executed_at), { addSuffix: true })}`
                  : 'Never run'}
              </span>
            </div>
            <span>{itp.execution_count} executions</span>
          </div>

          {/* Run Button */}
          {onRun && itp.is_active && (
            <Button
              className="w-full"
              onClick={handleRun}
              disabled={isRunning}
              variant={stats.total_matches === 0 ? 'default' : 'outline'}
            >
              {isRunning ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {stats.total_matches === 0 ? 'Run First Match' : 'Run Again'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
