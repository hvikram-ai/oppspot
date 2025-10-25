'use client'

/**
 * Enrichment Agent Configuration Form
 * Configure data enrichment parameters
 */

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, Database, Globe, Code } from 'lucide-react'

interface EnrichmentAgentConfigProps {
  configuration: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const ENRICHMENT_SOURCES = [
  {
    id: 'companies_house',
    name: 'Companies House',
    description: 'Filing history, accounts, and company status',
    icon: Database
  },
  {
    id: 'tech_stack',
    name: 'Tech Stack Detection',
    description: 'Identify technologies used by the company',
    icon: Code
  },
  {
    id: 'social_media',
    name: 'Social Media Analysis',
    description: 'LinkedIn, Twitter, and other social profiles',
    icon: Globe
  },
]

export function EnrichmentAgentConfig({ configuration, onChange }: EnrichmentAgentConfigProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({
      ...configuration,
      [key]: value
    })
  }

  const enabledSources = configuration.enabled_sources || [
    'companies_house',
    'tech_stack',
    'social_media'
  ]

  const autoEnrich = configuration.auto_enrich ?? true
  const reEnrichDays = configuration.re_enrich_days || 7
  const enrichmentDepth = configuration.enrichment_depth || 'standard'

  const toggleSource = (sourceId: string) => {
    const newSources = enabledSources.includes(sourceId)
      ? enabledSources.filter((s: string) => s !== sourceId)
      : [...enabledSources, sourceId]

    updateConfig('enabled_sources', newSources)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Enrichment Sources
          </CardTitle>
          <CardDescription>
            Choose which data sources to use for enrichment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENRICHMENT_SOURCES.map((source) => {
            const Icon = source.icon
            const isEnabled = enabledSources.includes(source.id)

            return (
              <div
                key={source.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleSource(source.id)}
              >
                <Checkbox
                  checked={isEnabled}
                  onCheckedChange={() => toggleSource(source.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium cursor-pointer">{source.name}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {source.description}
                  </p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Enrichment Behavior
          </CardTitle>
          <CardDescription>
            Configure how enrichment is performed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="auto-enrich">Auto-Enrich New Companies</Label>
              <p className="text-xs text-muted-foreground">
                Automatically enrich companies as they&apos;re added to the stream
              </p>
            </div>
            <Switch
              id="auto-enrich"
              checked={autoEnrich}
              onCheckedChange={(checked) => updateConfig('auto_enrich', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Enrichment Depth</Label>
            <div className="grid grid-cols-3 gap-2">
              {['basic', 'standard', 'deep'].map((depth) => (
                <button
                  key={depth}
                  type="button"
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                    enrichmentDepth === depth
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => updateConfig('enrichment_depth', depth)}
                >
                  {depth.charAt(0).toUpperCase() + depth.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Basic:</strong> Essential data only •
              <strong> Standard:</strong> Comprehensive data •
              <strong> Deep:</strong> Maximum detail (slower)
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
            <span className="text-muted-foreground">Active Sources:</span>
            <span className="font-medium">{enabledSources.length} enabled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Enrichment Depth:</span>
            <span className="font-medium capitalize">{enrichmentDepth}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-Enrichment:</span>
            <span className="font-medium">{autoEnrich ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
