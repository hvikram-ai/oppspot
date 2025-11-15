'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RotateCcw, TrendingUp } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ScoringWeights } from '@/types/itp'
import { DEFAULT_SCORING_WEIGHTS, validateScoringWeights } from '@/types/itp'

interface ScoringWeightsConfiguratorProps {
  weights: ScoringWeights
  onChange: (weights: ScoringWeights) => void
}

const WEIGHT_CATEGORIES = [
  {
    key: 'firmographics' as keyof ScoringWeights,
    label: 'Firmographics',
    description: 'Location, industry, ownership type',
    icon: '🏢',
  },
  {
    key: 'size' as keyof ScoringWeights,
    label: 'Company Size',
    description: 'Revenue, employees, assets',
    icon: '📊',
  },
  {
    key: 'growth' as keyof ScoringWeights,
    label: 'Growth Metrics',
    description: 'Revenue growth, employee growth',
    icon: '📈',
  },
  {
    key: 'funding' as keyof ScoringWeights,
    label: 'Funding',
    description: 'Funding stage, total raised, investors',
    icon: '💰',
  },
  {
    key: 'marketPresence' as keyof ScoringWeights,
    label: 'Market Presence',
    description: 'Social media, website traffic, reviews',
    icon: '🌐',
  },
  {
    key: 'workflow' as keyof ScoringWeights,
    label: 'Workflow Status',
    description: 'Saved, lists, CRM stages',
    icon: '⚙️',
  },
]

export function ScoringWeightsConfigurator({
  weights,
  onChange,
}: ScoringWeightsConfiguratorProps) {
  const [localWeights, setLocalWeights] = useState<ScoringWeights>(weights)
  const [totalWeight, setTotalWeight] = useState(1.0)

  // Calculate total weight
  useEffect(() => {
    const sum = Object.values(localWeights).reduce((acc, val) => acc + (val || 0), 0)
    setTotalWeight(sum)
  }, [localWeights])

  // Update weight for a category
  const handleWeightChange = (category: keyof ScoringWeights, value: number) => {
    const newWeights = {
      ...localWeights,
      [category]: value,
    }
    setLocalWeights(newWeights)
    onChange(newWeights)
  }

  // Reset to defaults
  const handleReset = () => {
    setLocalWeights(DEFAULT_SCORING_WEIGHTS)
    onChange(DEFAULT_SCORING_WEIGHTS)
  }

  // Auto-normalize weights to sum to 1.0
  const handleNormalize = () => {
    const sum = Object.values(localWeights).reduce((acc, val) => acc + (val || 0), 0)
    if (sum === 0) return

    const normalized: ScoringWeights = {}
    Object.entries(localWeights).forEach(([key, value]) => {
      normalized[key as keyof ScoringWeights] = value ? value / sum : 0
    })

    setLocalWeights(normalized)
    onChange(normalized)
  }

  const isValid = validateScoringWeights(localWeights)
  const tolerance = 0.01
  const needsNormalization = Math.abs(totalWeight - 1.0) > tolerance

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Category Weights
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust how much each category contributes to the match score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isValid ? 'default' : 'destructive'} className="font-mono">
            Σ = {totalWeight.toFixed(2)}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {needsNormalization && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Weights must sum to 1.0 for accurate scoring</span>
            <Button variant="outline" size="sm" onClick={handleNormalize}>
              Auto-Normalize
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {WEIGHT_CATEGORIES.map(({ key, label, description, icon }) => {
          const weight = localWeights[key] || 0
          const percentage = Math.round(weight * 100)

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {description}
                    </div>
                  </div>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono tabular-nums w-12 text-right">
                    {weight.toFixed(2)}
                  </span>
                  <Badge variant="secondary" className="w-12 justify-center font-mono">
                    {percentage}%
                  </Badge>
                </div>
              </div>
              <Slider
                value={[weight]}
                onValueChange={([value]) => handleWeightChange(key, value)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
          )
        })}
      </div>

      <div className="pt-4 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>How scoring works:</strong> Each category is scored 0-1 based on how well the
            business matches your criteria. The weighted average is then scaled to 0-100.
          </p>
          <p>
            <strong>Example:</strong> If a business scores 0.8 in Firmographics (weight 0.2) and
            0.6 in Size (weight 0.2), it contributes (0.8 × 0.2) + (0.6 × 0.2) = 0.28 to the final
            score.
          </p>
        </div>
      </div>
    </div>
  )
}
