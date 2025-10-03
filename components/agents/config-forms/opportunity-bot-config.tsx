'use client'

/**
 * OpportunityBot Configuration Form
 * Configure parameters for company discovery
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Target, Search, Filter } from 'lucide-react'

interface OpportunityBotConfigProps {
  configuration: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function OpportunityBotConfig({ configuration, onChange }: OpportunityBotConfigProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({
      ...configuration,
      [key]: value
    })
  }

  const maxCandidates = configuration.max_candidates || 100
  const minQualityScore = configuration.min_quality_score || 3.0
  const detectSignals = configuration.detect_signals ?? true
  const signalThreshold = configuration.signal_threshold || 0.7
  const batchSize = configuration.batch_size || 5

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Discovery Parameters
          </CardTitle>
          <CardDescription>
            Control how OpportunityBot searches for companies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-candidates">Maximum Candidates to Search</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="max-candidates"
                min={20}
                max={500}
                step={10}
                value={[maxCandidates]}
                onValueChange={([value]) => updateConfig('max_candidates', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[4rem] justify-center">
                {maxCandidates}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              OpportunityBot will search through this many companies to find qualified matches
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-size">Progress Update Frequency</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="batch-size"
                min={1}
                max={20}
                step={1}
                value={[batchSize]}
                onValueChange={([value]) => updateConfig('batch_size', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[4rem] justify-center">
                Every {batchSize}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              How often to broadcast progress updates (e.g., every 5 companies)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Quality Filtering
          </CardTitle>
          <CardDescription>
            Set quality thresholds for discovered companies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min-quality">Minimum Quality Score</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="min-quality"
                min={1}
                max={5}
                step={0.1}
                value={[minQualityScore]}
                onValueChange={([value]) => updateConfig('min_quality_score', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[4rem] justify-center">
                {minQualityScore.toFixed(1)} / 5
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Only add companies with quality score above this threshold
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Buying Signal Detection
          </CardTitle>
          <CardDescription>
            Automatically detect buying signals for high-quality companies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="detect-signals">Enable Signal Detection</Label>
              <p className="text-xs text-muted-foreground">
                Detect job postings, funding, and other buying signals
              </p>
            </div>
            <Switch
              id="detect-signals"
              checked={detectSignals}
              onCheckedChange={(checked) => updateConfig('detect_signals', checked)}
            />
          </div>

          {detectSignals && (
            <div className="space-y-2">
              <Label htmlFor="signal-threshold">Signal Confidence Threshold</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="signal-threshold"
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  value={[signalThreshold]}
                  onValueChange={([value]) => updateConfig('signal_threshold', value)}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[4rem] justify-center">
                  {Math.round(signalThreshold * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Only create signals with confidence above this threshold
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Search Strategy:</span>
            <span className="font-medium">Quality-focused</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Candidate Pool:</span>
            <span className="font-medium">{maxCandidates} companies</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quality Filter:</span>
            <span className="font-medium">≥ {minQualityScore.toFixed(1)} / 5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Signal Detection:</span>
            <span className="font-medium">{detectSignals ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
