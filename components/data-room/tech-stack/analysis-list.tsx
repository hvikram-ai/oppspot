'use client'

/**
 * Tech Stack Analysis List Component
 * Display list of tech stack analyses for a data room
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  PlayCircle,
  Shield,
} from 'lucide-react'
import type { TechStackAnalysisListItem } from '@/lib/data-room/types'
import { formatDistanceToNow } from 'date-fns'

interface AnalysisListProps {
  dataRoomId: string
  analyses: TechStackAnalysisListItem[]
  onAnalyze?: (id: string) => void
  onDelete?: (id: string) => void
}

export function AnalysisList({ dataRoomId, analyses, onAnalyze, onDelete }: AnalysisListProps) {
  const router = useRouter()

  const getRiskLevelColor = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'analyzing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'analyzing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Code2 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Tech Stack Analyses</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            Create your first tech stack analysis to start evaluating technologies.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => (
        <Card
          key={analysis.id}
          className="hover:shadow-lg transition-all duration-200 group cursor-pointer"
          onClick={() => router.push(`/data-room/${dataRoomId}/tech-stack/${analysis.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(analysis.status)}
                  <CardTitle className="text-lg truncate">{analysis.title}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getStatusColor(analysis.status)}>
                    {analysis.status}
                  </Badge>
                  {analysis.risk_level && (
                    <Badge variant="outline" className={getRiskLevelColor(analysis.risk_level)}>
                      {analysis.risk_level} risk
                    </Badge>
                  )}
                  {analysis.critical_findings_count > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {analysis.critical_findings_count} critical
                    </Badge>
                  )}
                </CardDescription>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/data-room/${dataRoomId}/tech-stack/${analysis.id}`)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {(analysis.status === 'pending' || analysis.status === 'failed') && onAnalyze && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onAnalyze(analysis.id)
                      }}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {analysis.status === 'failed' ? 'Retry Analysis' : 'Start Analysis'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(analysis.id)
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Technologies Count */}
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysis.technologies_identified}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Technologies</div>
              </div>

              {/* Modernization Score */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      analysis.modernization_score
                    )}`}
                  >
                    {analysis.modernization_score ?? '-'}
                  </div>
                  {analysis.modernization_score !== null &&
                    analysis.modernization_score >= 70 && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                  {analysis.modernization_score !== null &&
                    analysis.modernization_score < 50 && (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Modernization</div>
              </div>

              {/* AI Authenticity Score */}
              {analysis.ai_authenticity_score !== null && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <div
                      className={`text-2xl font-bold ${getScoreColor(
                        analysis.ai_authenticity_score
                      )}`}
                    >
                      {analysis.ai_authenticity_score}
                    </div>
                    <Shield className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">AI Authenticity</div>
                </div>
              )}

              {/* Technical Debt Score */}
              <div className="flex flex-col">
                <div
                  className={`text-2xl font-bold ${getScoreColor(
                    analysis.technical_debt_score !== null
                      ? 100 - analysis.technical_debt_score
                      : null
                  )}`}
                >
                  {analysis.technical_debt_score ?? '-'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Technical Debt</div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Created by {analysis.creator_name}</span>
              </div>
              <div>
                {analysis.last_analyzed_at
                  ? `Analyzed ${formatDistanceToNow(new Date(analysis.last_analyzed_at), {
                      addSuffix: true,
                    })}`
                  : `Created ${formatDistanceToNow(new Date(analysis.created_at), {
                      addSuffix: true,
                    })}`}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
