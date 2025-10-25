'use client'

/**
 * Create AI Agent Page
 * Form to create new autonomous AI agents
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

const agentTypes = [
  {
    value: 'opportunity_bot',
    label: 'OpportunityBot',
    description: 'Autonomous deal finder - finds qualified leads based on ICP criteria'
  },
  {
    value: 'scout_agent',
    label: 'Scout Agent',
    description: 'Monitors companies 24/7 for buying signals (jobs, filings, news)'
  },
  {
    value: 'research_gpt',
    label: 'ResearchGPT',
    description: 'Deep company intelligence - researches companies in 30 seconds'
  },
]

const cronExamples = [
  { value: '0 9 * * *', label: 'Daily at 9am UTC' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 * * * *', label: 'Hourly' },
  { value: '0 0 * * 1', label: 'Weekly on Monday' },
]

export default function CreateAgentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    agent_type: 'opportunity_bot',
    name: '',
    description: '',
    is_active: true,
    schedule_cron: '0 9 * * *',
    configuration: {
      // OpportunityBot config
      criteria: {
        industries: [] as string[],
        location: [] as string[],
      },
      minScore: 70,
      maxOpportunities: 10,
      // Scout Agent config
      signals: ['job_posting', 'companies_house_filing'] as string[],
      maxCompanies: 100,
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agent')
      }

      router.push('/admin/agents')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/agents')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Button>
        <h1 className="text-3xl font-bold">Create AI Agent</h1>
        <p className="text-muted-foreground">
          Configure a new autonomous AI agent
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Agent Type */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Type</CardTitle>
            <CardDescription>Choose the type of AI agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={formData.agent_type}
              onValueChange={(value) =>
                setFormData({ ...formData, agent_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Fintech Lead Finder"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What does this agent do?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>When should this agent run?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cron">Cron Expression</Label>
              <Select
                value={formData.schedule_cron}
                onValueChange={(value) =>
                  setFormData({ ...formData, schedule_cron: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cronExamples.map(example => (
                    <SelectItem key={example.value} value={example.value}>
                      {example.label} ({example.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Leave empty for manual execution only
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Start running immediately
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        {formData.agent_type === 'opportunity_bot' && (
          <Card>
            <CardHeader>
              <CardTitle>OpportunityBot Configuration</CardTitle>
              <CardDescription>Define your ideal customer profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="industries">Industries (SIC Codes)</Label>
                <Input
                  id="industries"
                  placeholder="e.g., 62, 64 (comma-separated)"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        criteria: {
                          ...formData.configuration.criteria,
                          industries: e.target.value.split(',').map(s => s.trim())
                        }
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="location">Locations</Label>
                <Input
                  id="location"
                  placeholder="e.g., London, Manchester (comma-separated)"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        criteria: {
                          ...formData.configuration.criteria,
                          location: e.target.value.split(',').map(s => s.trim())
                        }
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="minScore">Minimum Score (0-100)</Label>
                <Input
                  id="minScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.configuration.minScore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        minScore: parseInt(e.target.value)
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="maxOpportunities">Max Opportunities per Run</Label>
                <Input
                  id="maxOpportunities"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.configuration.maxOpportunities}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        maxOpportunities: parseInt(e.target.value)
                      }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {formData.agent_type === 'scout_agent' && (
          <Card>
            <CardHeader>
              <CardTitle>Scout Agent Configuration</CardTitle>
              <CardDescription>Which signals should be monitored?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Signals to Monitor</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'job_posting', label: 'Job Postings' },
                    { value: 'companies_house_filing', label: 'Companies House Filings' },
                    { value: 'news_mention', label: 'News Mentions' },
                    { value: 'funding_round', label: 'Funding Rounds' },
                  ].map(signal => (
                    <div key={signal.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={signal.value}
                        checked={formData.configuration.signals.includes(signal.value)}
                        onChange={(e) => {
                          const signals = e.target.checked
                            ? [...formData.configuration.signals, signal.value]
                            : formData.configuration.signals.filter(s => s !== signal.value)
                          setFormData({
                            ...formData,
                            configuration: { ...formData.configuration, signals }
                          })
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={signal.value} className="text-sm">
                        {signal.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="maxCompanies">Max Companies to Monitor per Run</Label>
                <Input
                  id="maxCompanies"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.configuration.maxCompanies}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        maxCompanies: parseInt(e.target.value)
                      }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Agent'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/agents')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
