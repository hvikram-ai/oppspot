'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Cog, 
  MapPin, 
  Shield,
  RotateCcw,
  Save,
  Zap,
  Briefcase
} from 'lucide-react'

export interface ScoringWeights {
  financial: number
  strategic: number
  operational: number
  market: number
  risk: number
  esg: number
}

export interface ScoringStrategy {
  id: string
  name: string
  description: string
  weights: ScoringWeights
  icon: any
  color: string
  useCase: string
}

interface ScoringWeightsConfiguratorProps {
  initialWeights: ScoringWeights
  onWeightsChange: (weights: ScoringWeights) => void
  onStrategySelect?: (strategy: ScoringStrategy) => void
  disabled?: boolean
}

export function ScoringWeightsConfigurator({
  initialWeights,
  onWeightsChange,
  onStrategySelect,
  disabled = false
}: ScoringWeightsConfiguratorProps) {
  const [weights, setWeights] = useState<ScoringWeights>(initialWeights)
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  
  const predefinedStrategies: ScoringStrategy[] = [
    {
      id: 'financial-focused',
      name: 'Financial-Focused',
      description: 'Prioritizes financial metrics and profitability',
      weights: { financial: 45, strategic: 15, operational: 15, market: 10, risk: 10, esg: 5 },
      icon: DollarSign,
      color: 'bg-green-500',
      useCase: 'Private Equity, Value Investing'
    },
    {
      id: 'strategic-growth',
      name: 'Strategic Growth',
      description: 'Emphasizes strategic fit and market expansion',
      weights: { financial: 20, strategic: 35, operational: 15, market: 20, risk: 5, esg: 5 },
      icon: Target,
      color: 'bg-blue-500',
      useCase: 'Corporate Development, Market Expansion'
    },
    {
      id: 'operational-synergy',
      name: 'Operational Synergy',
      description: 'Focuses on operational efficiency and cost synergies',
      weights: { financial: 25, strategic: 20, operational: 35, market: 10, risk: 5, esg: 5 },
      icon: Cog,
      color: 'bg-purple-500',
      useCase: 'Industrial Consolidation, Operational Improvement'
    },
    {
      id: 'market-expansion',
      name: 'Market Expansion',
      description: 'Targets geographic and market diversification',
      weights: { financial: 20, strategic: 25, operational: 15, market: 30, risk: 5, esg: 5 },
      icon: MapPin,
      color: 'bg-orange-500',
      useCase: 'Geographic Expansion, Market Entry'
    },
    {
      id: 'risk-conservative',
      name: 'Risk Conservative',
      description: 'Emphasizes risk management and stability',
      weights: { financial: 30, strategic: 15, operational: 20, market: 10, risk: 20, esg: 5 },
      icon: Shield,
      color: 'bg-red-500',
      useCase: 'Conservative Investing, Pension Funds'
    },
    {
      id: 'esg-sustainable',
      name: 'ESG Sustainable',
      description: 'Prioritizes environmental, social, and governance factors',
      weights: { financial: 25, strategic: 20, operational: 15, market: 15, risk: 10, esg: 15 },
      icon: Briefcase,
      color: 'bg-emerald-500',
      useCase: 'Impact Investing, Sustainable Growth'
    }
  ]

  const dimensionConfig = [
    { key: 'financial' as keyof ScoringWeights, label: 'Financial', icon: DollarSign, color: 'text-green-600', description: 'Revenue, profitability, cash flow, and financial health metrics' },
    { key: 'strategic' as keyof ScoringWeights, label: 'Strategic', icon: Target, color: 'text-blue-600', description: 'Market position, competitive advantages, and strategic alignment' },
    { key: 'operational' as keyof ScoringWeights, label: 'Operational', icon: Cog, color: 'text-purple-600', description: 'Operational efficiency, scalability, and process optimization' },
    { key: 'market' as keyof ScoringWeights, label: 'Market', icon: MapPin, color: 'text-orange-600', description: 'Market size, growth potential, and competitive landscape' },
    { key: 'risk' as keyof ScoringWeights, label: 'Risk', icon: Shield, color: 'text-red-600', description: 'Financial, operational, and regulatory risk assessment' },
    { key: 'esg' as keyof ScoringWeights, label: 'ESG', icon: Briefcase, color: 'text-emerald-600', description: 'Environmental, social, and governance factors' }
  ]

  // Ensure weights always sum to 100%
  const normalizeWeights = (newWeights: Partial<ScoringWeights>): ScoringWeights => {
    const updatedWeights = { ...weights, ...newWeights }
    const total = Object.values(updatedWeights).reduce((sum, value) => sum + value, 0)
    
    if (total === 0) return weights
    
    // Proportionally adjust all weights to sum to 100
    const normalized = Object.entries(updatedWeights).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: Math.round((value / total) * 100)
    }), {} as ScoringWeights)
    
    // Handle rounding errors - ensure total is exactly 100
    const normalizedTotal = Object.values(normalized).reduce((sum, value) => sum + value, 0)
    if (normalizedTotal !== 100) {
      const diff = 100 - normalizedTotal
      normalized.financial += diff // Add difference to financial weight
    }
    
    return normalized
  }

  const handleWeightChange = (dimension: keyof ScoringWeights, value: number[]) => {
    const newWeights = normalizeWeights({ [dimension]: value[0] })
    setWeights(newWeights)
    onWeightsChange(newWeights)
    setSelectedStrategy(null) // Clear selected strategy when manually adjusting
  }

  const handleStrategySelect = (strategy: ScoringStrategy) => {
    setWeights(strategy.weights)
    setSelectedStrategy(strategy.id)
    onWeightsChange(strategy.weights)
    if (onStrategySelect) {
      onStrategySelect(strategy)
    }
  }

  const handleReset = () => {
    setWeights(initialWeights)
    setSelectedStrategy(null)
    onWeightsChange(initialWeights)
  }

  return (
    <div className="space-y-6">
      {/* Predefined Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Investment Strategies
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a predefined strategy or customize weights manually
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predefinedStrategies.map((strategy) => {
              const Icon = strategy.icon
              return (
                <div
                  key={strategy.id}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedStrategy === strategy.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && handleStrategySelect(strategy)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${strategy.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{strategy.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {strategy.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {strategy.useCase}
                      </Badge>
                      
                      {/* Weight Preview */}
                      <div className="mt-2 space-y-1">
                        {Object.entries(strategy.weights).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="capitalize">{key}:</span>
                            <span className="font-mono">{value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Weight Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Custom Weight Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fine-tune scoring weights for your specific use case (Total: 100%)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {dimensionConfig.map((dimension) => {
            const Icon = dimension.icon
            return (
              <div key={dimension.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${dimension.color}`} />
                    <label className="text-sm font-medium">
                      {dimension.label}
                    </label>
                    <HelpTooltip
                      content={dimension.description}
                      side="right"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono min-w-[3ch] text-right">
                      {weights[dimension.key]}%
                    </span>
                  </div>
                </div>
                <Slider
                  value={[weights[dimension.key]]}
                  onValueChange={(value) => handleWeightChange(dimension.key, value)}
                  max={100}
                  min={0}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
            )
          })}
          
          {/* Weight Summary */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total Weight:</span>
              <span className={`text-sm font-mono font-bold ${
                Object.values(weights).reduce((sum, value) => sum + value, 0) === 100
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {Object.values(weights).reduce((sum, value) => sum + value, 0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ 
                  width: `${Math.min(Object.values(weights).reduce((sum, value) => sum + value, 0), 100)}%` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}