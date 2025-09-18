'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Cpu,
  Building,
  Zap,
  Users
} from 'lucide-react'

interface ScoreCardProps {
  companyName: string
  companyNumber?: string
  overallScore: number
  financialScore: number
  technologyScore: number
  industryScore: number
  growthScore: number
  engagementScore: number
  confidenceLevel: 'high' | 'medium' | 'low'
  lastUpdated: string
  onRefresh?: () => void
  loading?: boolean
}

export function ScoreCard({
  companyName,
  companyNumber,
  overallScore,
  financialScore,
  technologyScore,
  industryScore,
  growthScore,
  engagementScore,
  confidenceLevel,
  lastUpdated,
  onRefresh,
  loading = false
}: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false)

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Very Good'
    if (score >= 60) return 'Good'
    if (score >= 45) return 'Average'
    if (score >= 30) return 'Below Average'
    return 'Poor'
  }

  const getConfidenceBadgeVariant = (level: string): 'default' | 'secondary' | 'outline' => {
    switch (level) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const componentScores = [
    {
      name: 'Financial Health',
      score: financialScore,
      icon: DollarSign,
      description: 'Revenue, profitability, and financial stability'
    },
    {
      name: 'Technology Fit',
      score: technologyScore,
      icon: Cpu,
      description: 'Technology stack compatibility and digital maturity'
    },
    {
      name: 'Industry Alignment',
      score: industryScore,
      icon: Building,
      description: 'Industry sector and market fit'
    },
    {
      name: 'Growth Indicators',
      score: growthScore,
      icon: Zap,
      description: 'Expansion signals and growth potential'
    },
    {
      name: 'Engagement Level',
      score: engagementScore,
      icon: Users,
      description: 'Interaction history and buying signals'
    }
  ]

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (score >= 40) return <Minus className="w-4 h-4 text-gray-600" />
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{companyName}</CardTitle>
            {companyNumber && (
              <p className="text-sm text-muted-foreground mt-1">#{companyNumber}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant={getConfidenceBadgeVariant(confidenceLevel)}>
              {confidenceLevel} confidence
            </Badge>
            {onRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Overall Lead Score</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weighted average of all component scores</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
              {getTrendIcon(overallScore)}
            </div>
          </div>
          <Progress value={overallScore} className="h-3" />
          <div className="flex justify-between items-center">
            <Badge variant="outline">{getScoreLabel(overallScore)}</Badge>
            <span className="text-xs text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show Details
            </>
          )}
        </Button>

        {/* Component Scores */}
        {expanded && (
          <div className="space-y-3 pt-2">
            {componentScores.map((component) => (
              <div key={component.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <component.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{component.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getScoreColor(component.score)}`}>
                      {component.score}
                    </span>
                    {getTrendIcon(component.score)}
                  </div>
                </div>
                <Progress value={component.score} className="h-2" />
                <p className="text-xs text-muted-foreground">{component.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {expanded && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1">
              View Analysis
            </Button>
            <Button size="sm" variant="default" className="flex-1">
              Take Action
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}