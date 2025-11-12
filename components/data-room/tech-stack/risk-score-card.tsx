'use client'

/**
 * Risk Score Card Component
 * Display risk scores with visual indicators
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Code2,
  Zap,
} from 'lucide-react'
import type { TechStackAnalysisWithDetails } from '@/lib/data-room/types'

interface RiskScoreCardProps {
  analysis: TechStackAnalysisWithDetails
}

export function RiskScoreCard({ analysis }: RiskScoreCardProps) {
  const getRiskLevelIcon = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'low':
        return <Shield className="h-8 w-8 text-green-500" />
      case 'medium':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />
      case 'high':
        return <AlertTriangle className="h-8 w-8 text-orange-500" />
      case 'critical':
        return <AlertTriangle className="h-8 w-8 text-red-500 animate-pulse" />
      default:
        return <Shield className="h-8 w-8 text-gray-400" />
    }
  }

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

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number | null) => {
    if (score === null) return 'bg-gray-400'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const ScoreBar = ({ label, score, inverse = false }: { label: string; score: number | null; inverse?: boolean }) => {
    const displayScore = score ?? 0
    const effectiveScore = inverse && score ? 100 - score : displayScore

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className={`text-sm font-bold ${getScoreColor(effectiveScore)}`}>
            {score !== null ? `${score}/100` : 'N/A'}
          </span>
        </div>
        <div className="relative">
          <Progress value={displayScore} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
              effectiveScore
            )}`}
            style={{ width: `${displayScore}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Overall Risk Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Risk Level</CardTitle>
              <CardDescription>Aggregated risk assessment</CardDescription>
            </div>
            {getRiskLevelIcon(analysis.risk_level)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`${getRiskLevelColor(analysis.risk_level)} text-lg py-1 px-3`}
              >
                {analysis.risk_level?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analysis.critical_findings_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Critical Issues</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {analysis.high_findings_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {analysis.medium_findings_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Medium Priority</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysis.low_findings_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Low Priority</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scores Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Scores</CardTitle>
          <CardDescription>Technology stack health metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modernization Score */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <ScoreBar label="Modernization" score={analysis.modernization_score} />
          </div>

          {/* AI Authenticity Score (only for AI companies) */}
          {analysis.ai_authenticity_score !== null && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <ScoreBar label="AI Authenticity" score={analysis.ai_authenticity_score} />
            </div>
          )}

          {/* Technical Debt Score (inverse display) */}
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-orange-500" />
            <ScoreBar
              label="Technical Debt"
              score={analysis.technical_debt_score}
              inverse={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
