'use client'

/**
 * Goal Criteria Builder Component
 * Visual ICP builder for defining goal criteria, target metrics, and success criteria
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { GoalCriteria, TargetMetrics, SuccessCriteria } from '@/types/streams'
import { Plus, X, Target, TrendingUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoalCriteriaBuilderProps {
  criteria: GoalCriteria
  targetMetrics: TargetMetrics
  successCriteria: SuccessCriteria
  onCriteriaChange: (criteria: GoalCriteria) => void
  onTargetMetricsChange: (metrics: TargetMetrics) => void
  onSuccessCriteriaChange: (criteria: SuccessCriteria) => void
}

const INDUSTRY_OPTIONS = [
  'SaaS', 'Fintech', 'E-commerce', 'Healthcare', 'Manufacturing',
  'Retail', 'Technology', 'Consulting', 'Real Estate', 'Education'
]

const LOCATION_OPTIONS = [
  'UK', 'London', 'Manchester', 'Birmingham', 'Scotland',
  'Ireland', 'Europe', 'USA', 'Asia'
]

const FUNDING_STAGES = [
  'Bootstrapped', 'Seed', 'Series A', 'Series B', 'Series C+', 'IPO'
]

const SIGNAL_TYPES = [
  'Funding Round', 'Hiring', 'Expansion', 'Product Launch',
  'Executive Change', 'Technology Adoption', 'News Mention'
]

export function GoalCriteriaBuilder({
  criteria,
  targetMetrics,
  successCriteria,
  onCriteriaChange,
  onTargetMetricsChange,
  onSuccessCriteriaChange
}: GoalCriteriaBuilderProps) {
  // Helper functions
  const addArrayItem = (field: 'industry' | 'location' | 'funding_stage' | 'signals', value: string) => {
    const current = criteria[field] as string[] || []
    if (!current.includes(value)) {
      onCriteriaChange({
        ...criteria,
        [field]: [...current, value]
      })
    }
  }

  const removeArrayItem = (field: 'industry' | 'location' | 'funding_stage' | 'signals', value: string) => {
    const current = criteria[field] as string[] || []
    onCriteriaChange({
      ...criteria,
      [field]: current.filter(item => item !== value)
    })
  }

  const updateRange = (field: 'revenue' | 'growth_rate' | 'employee_count', type: 'min' | 'max', value: number) => {
    onCriteriaChange({
      ...criteria,
      [field]: {
        ...(criteria[field] as any || {}),
        [type]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ICP Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>ICP Criteria</CardTitle>
              <CardDescription>
                Define the ideal company profile you&apos;re looking for
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Industry */}
          <div className="space-y-2">
            <Label>Industry</Label>
            <div className="flex gap-2">
              <Select onValueChange={(value) => addArrayItem('industry', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add industry..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.filter(opt => !criteria.industry?.includes(opt)).map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {criteria.industry?.map(industry => (
                <Badge key={industry} variant="secondary" className="gap-1">
                  {industry}
                  <button
                    onClick={() => removeArrayItem('industry', industry)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="flex gap-2">
              <Select onValueChange={(value) => addArrayItem('location', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add location..." />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.filter(opt => !criteria.location?.includes(opt)).map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {criteria.location?.map(location => (
                <Badge key={location} variant="secondary" className="gap-1">
                  {location}
                  <button
                    onClick={() => removeArrayItem('location', location)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Revenue Range */}
          <div className="space-y-4">
            <Label>Annual Revenue (£)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={criteria.revenue?.min || ''}
                  onChange={(e) => updateRange('revenue', 'min', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={criteria.revenue?.max || ''}
                  onChange={(e) => updateRange('revenue', 'max', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {criteria.revenue?.min && criteria.revenue?.max
                ? `£${(criteria.revenue.min / 1000000).toFixed(1)}M - £${(criteria.revenue.max / 1000000).toFixed(1)}M`
                : criteria.revenue?.min
                ? `Minimum £${(criteria.revenue.min / 1000000).toFixed(1)}M`
                : criteria.revenue?.max
                ? `Maximum £${(criteria.revenue.max / 1000000).toFixed(1)}M`
                : 'Any revenue'}
            </p>
          </div>

          {/* Employee Count */}
          <div className="space-y-4">
            <Label>Employee Count</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={criteria.employee_count?.min || ''}
                  onChange={(e) => updateRange('employee_count', 'min', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={criteria.employee_count?.max || ''}
                  onChange={(e) => updateRange('employee_count', 'max', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Growth Rate */}
          <div className="space-y-4">
            <Label>Minimum Growth Rate (%)</Label>
            <Input
              type="number"
              placeholder="e.g., 20"
              value={criteria.growth_rate?.min || ''}
              onChange={(e) => updateRange('growth_rate', 'min', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Funding Stage */}
          <div className="space-y-2">
            <Label>Funding Stage</Label>
            <div className="flex gap-2">
              <Select onValueChange={(value) => addArrayItem('funding_stage', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add funding stage..." />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STAGES.filter(opt => !criteria.funding_stage?.includes(opt)).map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {criteria.funding_stage?.map(stage => (
                <Badge key={stage} variant="secondary" className="gap-1">
                  {stage}
                  <button
                    onClick={() => removeArrayItem('funding_stage', stage)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Required Signals */}
          <div className="space-y-2">
            <Label>Required Buying Signals</Label>
            <div className="flex gap-2">
              <Select onValueChange={(value) => addArrayItem('signals', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add signal type..." />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_TYPES.filter(opt => !criteria.signals?.includes(opt)).map(signal => (
                    <SelectItem key={signal} value={signal}>
                      {signal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {criteria.signals?.map(signal => (
                <Badge key={signal} variant="secondary" className="gap-1">
                  {signal}
                  <button
                    onClick={() => removeArrayItem('signals', signal)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Target Metrics</CardTitle>
              <CardDescription>
                Set goals for what you want to achieve
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Companies to Find</Label>
              <Input
                type="number"
                placeholder="e.g., 50"
                value={targetMetrics.companies_to_find || ''}
                onChange={(e) => onTargetMetricsChange({
                  ...targetMetrics,
                  companies_to_find: parseInt(e.target.value) || undefined
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Quality Score (1-5)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g., 4.0"
                value={targetMetrics.min_quality_score || ''}
                onChange={(e) => onTargetMetricsChange({
                  ...targetMetrics,
                  min_quality_score: parseFloat(e.target.value) || undefined
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Success Criteria</CardTitle>
              <CardDescription>
                Define what success looks like for this goal
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Qualified</Label>
              <Input
                type="number"
                placeholder="e.g., 30"
                value={successCriteria.min_qualified || ''}
                onChange={(e) => onSuccessCriteriaChange({
                  ...successCriteria,
                  min_qualified: parseInt(e.target.value) || undefined
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Researched</Label>
              <Input
                type="number"
                placeholder="e.g., 20"
                value={successCriteria.min_researched || ''}
                onChange={(e) => onSuccessCriteriaChange({
                  ...successCriteria,
                  min_researched: parseInt(e.target.value) || undefined
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
