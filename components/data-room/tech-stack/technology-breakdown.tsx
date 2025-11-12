'use client'

/**
 * Technology Breakdown Component
 * Visual breakdown of technologies by category and risk
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Code2,
  Database,
  Cloud,
  Layers,
  Cpu,
  Shield,
  TestTube,
  Activity,
  GitBranch,
  MoreHorizontal,
} from 'lucide-react'
import type { TechStackAnalysisWithDetails, TechCategory } from '@/lib/data-room/types'

interface TechnologyBreakdownProps {
  analysis: TechStackAnalysisWithDetails
}

export function TechnologyBreakdown({ analysis }: TechnologyBreakdownProps) {
  const getCategoryIcon = (category: TechCategory) => {
    switch (category) {
      case 'frontend':
        return <Code2 className="h-5 w-5" />
      case 'backend':
        return <Layers className="h-5 w-5" />
      case 'database':
        return <Database className="h-5 w-5" />
      case 'infrastructure':
        return <Cloud className="h-5 w-5" />
      case 'ml_ai':
        return <Cpu className="h-5 w-5" />
      case 'security':
        return <Shield className="h-5 w-5" />
      case 'testing':
        return <TestTube className="h-5 w-5" />
      case 'monitoring':
        return <Activity className="h-5 w-5" />
      case 'devops':
        return <GitBranch className="h-5 w-5" />
      default:
        return <MoreHorizontal className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: TechCategory) => {
    switch (category) {
      case 'frontend':
        return 'text-blue-600 dark:text-blue-400'
      case 'backend':
        return 'text-purple-600 dark:text-purple-400'
      case 'database':
        return 'text-green-600 dark:text-green-400'
      case 'infrastructure':
        return 'text-orange-600 dark:text-orange-400'
      case 'ml_ai':
        return 'text-pink-600 dark:text-pink-400'
      case 'security':
        return 'text-red-600 dark:text-red-400'
      case 'testing':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'monitoring':
        return 'text-indigo-600 dark:text-indigo-400'
      case 'devops':
        return 'text-teal-600 dark:text-teal-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 75) return 'bg-red-500'
    if (riskScore >= 50) return 'bg-orange-500'
    if (riskScore >= 25) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getCategoryLabel = (category: TechCategory) => {
    switch (category) {
      case 'ml_ai':
        return 'ML/AI'
      case 'devops':
        return 'DevOps'
      default:
        return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  const totalTechnologies = analysis.technologies_identified
  const categoriesWithTech = analysis.technologies_by_category.filter((c) => c.count > 0)

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Overview</CardTitle>
          <CardDescription>
            {totalTechnologies} {totalTechnologies === 1 ? 'technology' : 'technologies'} detected
            across {categoriesWithTech.length} categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoriesWithTech.map((categoryData) => (
              <div
                key={categoryData.category}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={getCategoryColor(categoryData.category)}>
                    {getCategoryIcon(categoryData.category)}
                  </div>
                  <div>
                    <div className="font-semibold">{getCategoryLabel(categoryData.category)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {categoryData.count} {categoryData.count === 1 ? 'tech' : 'techs'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-medium">
                    Risk: {Math.round(categoryData.avg_risk_score)}
                  </div>
                  <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${getRiskColor(categoryData.avg_risk_score)}`}
                      style={{ width: `${categoryData.avg_risk_score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Breakdown Card (if AI technologies exist) */}
      {analysis.ai_breakdown && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-pink-600" />
              <CardTitle>AI/ML Technology Breakdown</CardTitle>
            </div>
            <CardDescription>
              Classification of AI technologies by authenticity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Proprietary */}
              {analysis.ai_breakdown.proprietary > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Proprietary
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Custom models, training pipelines
                      </span>
                    </div>
                    <span className="font-bold text-purple-600">
                      {analysis.ai_breakdown.proprietary}
                    </span>
                  </div>
                  <Progress
                    value={
                      (analysis.ai_breakdown.proprietary /
                        (analysis.ai_breakdown.proprietary +
                          analysis.ai_breakdown.wrapper +
                          analysis.ai_breakdown.hybrid +
                          analysis.ai_breakdown.third_party +
                          analysis.ai_breakdown.unknown)) *
                      100
                    }
                    className="h-2 bg-purple-200"
                  />
                </div>
              )}

              {/* Hybrid */}
              {analysis.ai_breakdown.hybrid > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Hybrid
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Mix of proprietary and third-party
                      </span>
                    </div>
                    <span className="font-bold text-blue-600">{analysis.ai_breakdown.hybrid}</span>
                  </div>
                  <Progress
                    value={
                      (analysis.ai_breakdown.hybrid /
                        (analysis.ai_breakdown.proprietary +
                          analysis.ai_breakdown.wrapper +
                          analysis.ai_breakdown.hybrid +
                          analysis.ai_breakdown.third_party +
                          analysis.ai_breakdown.unknown)) *
                      100
                    }
                    className="h-2 bg-blue-200"
                  />
                </div>
              )}

              {/* Third Party */}
              {analysis.ai_breakdown.third_party > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Third Party
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Open source models (LLaMA, Mistral)
                      </span>
                    </div>
                    <span className="font-bold text-green-600">
                      {analysis.ai_breakdown.third_party}
                    </span>
                  </div>
                  <Progress
                    value={
                      (analysis.ai_breakdown.third_party /
                        (analysis.ai_breakdown.proprietary +
                          analysis.ai_breakdown.wrapper +
                          analysis.ai_breakdown.hybrid +
                          analysis.ai_breakdown.third_party +
                          analysis.ai_breakdown.unknown)) *
                      100
                    }
                    className="h-2 bg-green-200"
                  />
                </div>
              )}

              {/* Wrapper */}
              {analysis.ai_breakdown.wrapper > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Wrapper
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        GPT API wrappers only
                      </span>
                    </div>
                    <span className="font-bold text-red-600">{analysis.ai_breakdown.wrapper}</span>
                  </div>
                  <Progress
                    value={
                      (analysis.ai_breakdown.wrapper /
                        (analysis.ai_breakdown.proprietary +
                          analysis.ai_breakdown.wrapper +
                          analysis.ai_breakdown.hybrid +
                          analysis.ai_breakdown.third_party +
                          analysis.ai_breakdown.unknown)) *
                      100
                    }
                    className="h-2 bg-red-200"
                  />
                </div>
              )}

              {/* Unknown */}
              {analysis.ai_breakdown.unknown > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        Unknown
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Requires verification
                      </span>
                    </div>
                    <span className="font-bold text-gray-600">
                      {analysis.ai_breakdown.unknown}
                    </span>
                  </div>
                  <Progress
                    value={
                      (analysis.ai_breakdown.unknown /
                        (analysis.ai_breakdown.proprietary +
                          analysis.ai_breakdown.wrapper +
                          analysis.ai_breakdown.hybrid +
                          analysis.ai_breakdown.third_party +
                          analysis.ai_breakdown.unknown)) *
                      100
                    }
                    className="h-2 bg-gray-200"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
