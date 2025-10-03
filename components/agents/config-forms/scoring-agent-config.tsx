'use client'

/**
 * Scoring Agent Configuration Form
 * Configure scoring and prioritization parameters
 */

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Zap, Target, TrendingUp, Scale } from 'lucide-react'

interface ScoringAgentConfigProps {
  configuration: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function ScoringAgentConfig({ configuration, onChange }: ScoringAgentConfigProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({
      ...configuration,
      [key]: value
    })
  }

  const criteriaWeight = configuration.criteria_weight || 2.0
  const dataCompletenessWeight = configuration.data_completeness_weight || 1.0
  const enrichmentWeight = configuration.enrichment_weight || 1.0
  const signalsWeight = configuration.signals_weight || 1.0

  const autoReorder = configuration.auto_reorder ?? true
  const rescore Interval = configuration.rescore_interval || 24

  const totalWeight = criteriaWeight + dataCompletenessWeight + enrichmentWeight + signalsWeight

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Scoring Weights
          </CardTitle>
          <CardDescription>
            Adjust how different factors influence quality scores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="criteria-weight">ICP Criteria Match</Label>
              <Badge variant="outline">{criteriaWeight.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="criteria-weight"
              min={0}
              max={5}
              step={0.1}
              value={[criteriaWeight]}
              onValueChange={([value]) => updateConfig('criteria_weight', value)}
            />
            <p className="text-xs text-muted-foreground">
              How well the company matches your ideal customer profile
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="completeness-weight">Data Completeness</Label>
              <Badge variant="outline">{dataCompletenessWeight.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="completeness-weight"
              min={0}
              max={5}
              step={0.1}
              value={[dataCompletenessWeight]}
              onValueChange={([value]) => updateConfig('data_completeness_weight', value)}
            />
            <p className="text-xs text-muted-foreground">
              How much company data is available (website, contacts, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enrichment-weight">Enrichment Quality</Label>
              <Badge variant="outline">{enrichmentWeight.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="enrichment-weight"
              min={0}
              max={5}
              step={0.1}
              value={[enrichmentWeight]}
              onValueChange={([value]) => updateConfig('enrichment_weight', value)}
            />
            <p className="text-xs text-muted-foreground">
              Quality of enriched data (tech stack, social media, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signals-weight">Buying Signals</Label>
              <Badge variant="outline">{signalsWeight.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="signals-weight"
              min={0}
              max={5}
              step={0.1}
              value={[signalsWeight]}
              onValueChange={([value]) => updateConfig('signals_weight', value)}
            />
            <p className="text-xs text-muted-foreground">
              Detected buying signals (hiring, funding, expansion, etc.)
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Weight</span>
              <Badge>{totalWeight.toFixed(1)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scores will be normalized to 0-5 scale based on these weights
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Scoring Behavior
          </CardTitle>
          <CardDescription>
            Configure how scoring is performed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="auto-reorder">Auto-Reorder by Score</Label>
              <p className="text-xs text-muted-foreground">
                Automatically reorder stream items by quality score
              </p>
            </div>
            <Switch
              id="auto-reorder"
              checked={autoReorder}
              onCheckedChange={(checked) => updateConfig('auto_reorder', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority Thresholds</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/20">
                <span className="text-sm font-medium">Critical</span>
                <Badge variant="destructive">≥ 4.5</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-950/20">
                <span className="text-sm font-medium">High</span>
                <Badge className="bg-orange-500">≥ 4.0</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                <span className="text-sm font-medium">Medium</span>
                <Badge className="bg-blue-500">≥ 3.0</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-950/20">
                <span className="text-sm font-medium">Low</span>
                <Badge variant="secondary">< 3.0</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Companies are automatically assigned priority levels based on their score
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scoring Algorithm:</span>
            <span className="font-medium">Multi-factor weighted</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Weight:</span>
            <span className="font-medium">{totalWeight.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-Reorder:</span>
            <span className="font-medium">{autoReorder ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
