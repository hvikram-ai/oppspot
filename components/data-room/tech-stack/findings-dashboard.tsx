'use client'

/**
 * Findings Dashboard Component
 * Display tech stack findings organized by type and severity
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Lightbulb,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { TechStackFindingWithTechnologies, TechFindingType } from '@/lib/data-room/types'

interface FindingsDashboardProps {
  findings: TechStackFindingWithTechnologies[]
}

export function FindingsDashboard({ findings }: FindingsDashboardProps) {
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set())

  const toggleFinding = (id: string) => {
    const newExpanded = new Set(expandedFindings)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFindings(newExpanded)
  }

  const getFindingTypeIcon = (type: TechFindingType) => {
    switch (type) {
      case 'red_flag':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'risk':
        return <ShieldAlert className="h-5 w-5 text-orange-600" />
      case 'opportunity':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'strength':
        return <Star className="h-5 w-5 text-blue-600" />
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-purple-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300'
      case 'info':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300'
    }
  }

  const getImpactBadge = (impactScore: number | null) => {
    if (impactScore === null) return null
    if (impactScore >= 80)
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Critical Impact: {impactScore}
        </Badge>
      )
    if (impactScore >= 60)
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          High Impact: {impactScore}
        </Badge>
      )
    if (impactScore >= 40)
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Medium Impact: {impactScore}
        </Badge>
      )
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        Low Impact: {impactScore}
      </Badge>
    )
  }

  const filterByType = (type: TechFindingType) => findings.filter((f) => f.finding_type === type)

  const redFlags = filterByType('red_flag')
  const risks = filterByType('risk')
  const opportunities = filterByType('opportunity')
  const strengths = filterByType('strength')
  const recommendations = filterByType('recommendation')

  const FindingCard = ({ finding }: { finding: TechStackFindingWithTechnologies }) => {
    const isExpanded = expandedFindings.has(finding.id)

    return (
      <Card className={`border ${finding.is_resolved ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getFindingTypeIcon(finding.finding_type)}
                <CardTitle className="text-base">{finding.title}</CardTitle>
                {finding.is_resolved && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={getSeverityColor(finding.severity)}>
                  {finding.severity}
                </Badge>
                {getImpactBadge(finding.impact_score)}
                {finding.technologies.length > 0 && (
                  <Badge variant="outline">
                    {finding.technologies.length}{' '}
                    {finding.technologies.length === 1 ? 'technology' : 'technologies'}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFinding(finding.id)}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Description */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Description</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{finding.description}</p>
            </div>

            {/* Affected Technologies */}
            {finding.technologies.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Affected Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {finding.technologies.map((tech) => (
                    <Badge key={tech.id} variant="secondary">
                      {tech.name}
                      {tech.version && ` ${tech.version}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {finding.recommendation && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recommendation</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  {finding.recommendation}
                </p>
              </div>
            )}

            {/* Resolution Status */}
            {finding.is_resolved && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold text-sm">Resolved</span>
                </div>
                {finding.resolution_notes && (
                  <p className="text-sm mt-2 text-green-600 dark:text-green-400">
                    {finding.resolution_notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  const EmptyState = ({ type }: { type: string }) => (
    <div className="text-center py-8 text-gray-500">
      <p>No {type} findings detected</p>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings & Recommendations</CardTitle>
        <CardDescription>
          {findings.length} {findings.length === 1 ? 'finding' : 'findings'} identified
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="red_flags" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="red_flags" className="relative">
              Red Flags
              {redFlags.length > 0 && (
                <Badge className="ml-2 bg-red-600 text-white" variant="secondary">
                  {redFlags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="risks" className="relative">
              Risks
              {risks.length > 0 && (
                <Badge className="ml-2 bg-orange-600 text-white" variant="secondary">
                  {risks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="relative">
              Opportunities
              {opportunities.length > 0 && (
                <Badge className="ml-2 bg-green-600 text-white" variant="secondary">
                  {opportunities.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="strengths" className="relative">
              Strengths
              {strengths.length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white" variant="secondary">
                  {strengths.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="relative">
              Actions
              {recommendations.length > 0 && (
                <Badge className="ml-2 bg-purple-600 text-white" variant="secondary">
                  {recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="red_flags" className="space-y-3 mt-4">
            {redFlags.length === 0 ? (
              <EmptyState type="red flag" />
            ) : (
              redFlags.map((finding) => <FindingCard key={finding.id} finding={finding} />)
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-3 mt-4">
            {risks.length === 0 ? (
              <EmptyState type="risk" />
            ) : (
              risks.map((finding) => <FindingCard key={finding.id} finding={finding} />)
            )}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-3 mt-4">
            {opportunities.length === 0 ? (
              <EmptyState type="opportunity" />
            ) : (
              opportunities.map((finding) => <FindingCard key={finding.id} finding={finding} />)
            )}
          </TabsContent>

          <TabsContent value="strengths" className="space-y-3 mt-4">
            {strengths.length === 0 ? (
              <EmptyState type="strength" />
            ) : (
              strengths.map((finding) => <FindingCard key={finding.id} finding={finding} />)
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-3 mt-4">
            {recommendations.length === 0 ? (
              <EmptyState type="recommendation" />
            ) : (
              recommendations.map((finding) => <FindingCard key={finding.id} finding={finding} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
