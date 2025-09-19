'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  UserCheck,
  Target,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react'

interface BANTScore {
  overall_score: number
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
  qualification_status: string
  recommendations: string[]
  next_actions: string[]
}

interface BANTScoreCardProps {
  companyId: string
  companyName?: string
}

export function BANTScoreCard({ companyId, companyName }: BANTScoreCardProps) {
  const [bantScore, setBantScore] = useState<BANTScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBANTScore()
  }, [companyId])

  const fetchBANTScore = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bant?company_id=${companyId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch BANT score')
      }

      const data = await response.json()

      if (data.bant) {
        setBantScore({
          overall_score: data.bant.bant_score || 0,
          budget_score: data.bant.bant_budget || 0,
          authority_score: data.bant.bant_authority || 0,
          need_score: data.bant.bant_need || 0,
          timeline_score: data.bant.bant_timeline || 0,
          qualification_status: data.bant.bant_qualification_status || 'not_qualified',
          recommendations: data.bant.bant_recommendations || [],
          next_actions: data.bant.bant_next_actions || []
        })
      }
    } catch (err) {
      console.error('Error fetching BANT score:', err)
      setError('Unable to load BANT score')
    } finally {
      setLoading(false)
    }
  }

  const calculateBANTScore = async () => {
    try {
      setCalculating(true)
      setError(null)

      const response = await fetch('/api/bant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ company_id: companyId })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate BANT score')
      }

      const data = await response.json()
      setBantScore(data.bant)
    } catch (err) {
      console.error('Error calculating BANT score:', err)
      setError('Unable to calculate BANT score')
    } finally {
      setCalculating(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualificationBadge = (status: string) => {
    switch (status) {
      case 'highly_qualified':
        return <Badge className="bg-green-500 text-white">Highly Qualified</Badge>
      case 'qualified':
        return <Badge className="bg-blue-500 text-white">Qualified</Badge>
      case 'nurture':
        return <Badge className="bg-yellow-500 text-white">Nurture</Badge>
      case 'not_qualified':
        return <Badge className="bg-gray-500 text-white">Not Qualified</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getScoreIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return <DollarSign className="h-4 w-4" />
      case 'authority':
        return <UserCheck className="h-4 w-4" />
      case 'need':
        return <Target className="h-4 w-4" />
      case 'timeline':
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading BANT qualification...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !bantScore) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={calculateBANTScore} disabled={calculating}>
              {calculating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate BANT Score'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!bantScore) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No qualification data available</p>
            <Button onClick={calculateBANTScore} disabled={calculating}>
              {calculating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Analyze Qualification'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>BANT Qualification</CardTitle>
            <CardDescription>
              Lead qualification assessment
            </CardDescription>
          </div>
          {getQualificationBadge(bantScore.qualification_status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(bantScore.overall_score)}`}>
              {bantScore.overall_score}%
            </span>
          </div>
          <Progress value={bantScore.overall_score} className="h-3" />
        </div>

        {/* Individual BANT Scores */}
        <div className="space-y-3">
          {[
            { type: 'budget', label: 'Budget', score: bantScore.budget_score },
            { type: 'authority', label: 'Authority', score: bantScore.authority_score },
            { type: 'need', label: 'Need', score: bantScore.need_score },
            { type: 'timeline', label: 'Timeline', score: bantScore.timeline_score }
          ].map((item) => (
            <div key={item.type} className="flex items-center space-x-3">
              <div className="flex items-center gap-2 w-24">
                {getScoreIcon(item.type)}
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <Progress value={item.score} className="flex-1 h-2" />
              <span className={`text-sm font-medium w-12 text-right ${getScoreColor(item.score)}`}>
                {item.score}%
              </span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {bantScore.recommendations && bantScore.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {bantScore.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-1">
                  <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Actions */}
        {bantScore.next_actions && bantScore.next_actions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Next Actions</h4>
            <ul className="space-y-1">
              {bantScore.next_actions.slice(0, 3).map((action, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-1">
                  <ArrowRight className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={calculateBANTScore}
          disabled={calculating}
        >
          {calculating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Score
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}