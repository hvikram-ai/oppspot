'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { StepIndicator, Step } from '@/components/ui/step-indicator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Settings,
  Calendar,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Search,
  Brain,
  TrendingUp,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const WIZARD_STEPS: readonly Step[] = [
  {
    id: 'type',
    title: 'Agent Type',
    description: 'Choose your AI agent',
    icon: Bot,
  },
  {
    id: 'config',
    title: 'Configuration',
    description: 'Set parameters',
    icon: Settings,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Automation settings',
    icon: Calendar,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Final review',
    icon: FileCheck,
  },
] as const

const AGENT_TYPES = [
  {
    id: 'opportunity_bot',
    name: 'OpportunityBot™',
    description: '24/7 autonomous deal finder that scans for companies matching your ICP',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    features: ['ICP-based filtering', 'Buying signal detection', 'Auto-scoring', 'Email notifications'],
    schedulable: true
  },
  {
    id: 'scout_agent',
    name: 'Scout Agent',
    description: 'Monitors buying signals like funding, hiring, and expansion activities',
    icon: Search,
    color: 'from-blue-500 to-cyan-600',
    features: ['Signal detection', 'News monitoring', 'Job posting tracking', 'Funding alerts'],
    schedulable: true
  },
  {
    id: 'research_gpt',
    name: 'ResearchGPT™',
    description: 'On-demand deep company intelligence (use from Research page)',
    icon: Brain,
    color: 'from-purple-500 to-pink-600',
    features: ['Company research', 'Tech stack analysis', 'Competitor insights', 'Contact finder'],
    schedulable: false
  },
  {
    id: 'scoring_agent',
    name: 'Scoring Agent',
    description: 'Continuous lead scoring and prioritization (coming soon)',
    icon: Activity,
    color: 'from-orange-500 to-red-600',
    features: ['Lead scoring', 'Priority ranking', 'Deal probability', 'Timing prediction'],
    schedulable: false
  }
]

interface AgentWizardData {
  agent_type: string
  name: string
  description: string
  configuration: Record<string, any>
  is_active: boolean
  schedule_cron: string
  scheduleEnabled: boolean
}

interface AgentWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (data: any) => Promise<void>
}

export function AgentWizard({ open, onOpenChange, onComplete }: AgentWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [data, setData] = useState<AgentWizardData>({
    agent_type: '',
    name: '',
    description: '',
    configuration: {},
    is_active: true,
    schedule_cron: '0 9 * * *', // Daily at 9am
    scheduleEnabled: true
  })

  const currentStep = WIZARD_STEPS[currentStepIndex].id
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  const updateData = (updates: Partial<AgentWizardData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const goToNextStep = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 'type':
        return data.agent_type.length > 0
      case 'config':
        return data.name.trim().length > 0
      case 'schedule':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const handleComplete = async () => {
    if (!isStepValid()) return

    setIsSubmitting(true)
    try {
      // Build configuration based on agent type
      let configuration = data.configuration

      // OpportunityBot needs default criteria
      if (data.agent_type === 'opportunity_bot' && Object.keys(configuration).length === 0) {
        configuration = {
          criteria: {
            industries: [], // Empty = all industries
            location: [], // Empty = all locations
            employeeRange: { min: 1, max: 10000 },
            revenueRange: { min: 0, max: 1000000000 }
          },
          minScore: 70,
          maxOpportunities: 50,
          notifications: {
            email: true,
            threshold: 85
          }
        }
      }

      // Scout Agent needs default signal types
      if (data.agent_type === 'scout_agent' && Object.keys(configuration).length === 0) {
        configuration = {
          signals: ['job_posting', 'funding_round', 'executive_change', 'companies_house_filing', 'news_mention'],
          threshold: 70,
          maxCompanies: 100
        }
      }

      const requestData = {
        agent_type: data.agent_type,
        name: data.name,
        description: data.description,
        configuration: configuration,
        is_active: data.is_active,
        schedule_cron: data.scheduleEnabled ? data.schedule_cron : null
      }

      await onComplete(requestData)

      // Reset form
      setData({
        agent_type: '',
        name: '',
        description: '',
        configuration: {},
        is_active: true,
        schedule_cron: '0 9 * * *',
        scheduleEnabled: true
      })
      setCurrentStepIndex(0)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create agent:', error)
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (confirm('Are you sure? Your progress will be lost.')) {
      setCurrentStepIndex(0)
      onOpenChange(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background rounded-xl shadow-2xl w-full max-w-5xl h-[calc(100vh-8rem)] flex flex-col border"
          >
            {/* Header */}
            <div className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Bot className="h-6 w-6 text-purple-600" />
                  Create AI Agent
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>

              <StepIndicator steps={WIZARD_STEPS as any} currentStep={currentStep} />
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {/* STEP 1: Agent Type Selection */}
                  {currentStep === 'type' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Choose Your AI Agent</h3>
                        <p className="text-muted-foreground">
                          Select the type of autonomous AI agent you want to deploy
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {AGENT_TYPES.map((type) => {
                          const Icon = type.icon
                          const isSelected = data.agent_type === type.id

                          return (
                            <Card
                              key={type.id}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-lg",
                                isSelected && "ring-2 ring-purple-500 shadow-lg"
                              )}
                              onClick={() => {
                                updateData({
                                  agent_type: type.id,
                                  name: type.name,
                                  description: type.description
                                })
                              }}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "h-12 w-12 rounded-lg flex items-center justify-center bg-gradient-to-br",
                                    type.color
                                  )}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-lg mb-1">{type.name}</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {type.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {type.features.slice(0, 3).map((feature) => (
                                        <Badge key={feature} variant="secondary" className="text-xs">
                                          {feature}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="h-6 w-6 rounded-full bg-purple-600 flex items-center justify-center">
                                      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Configuration */}
                  {currentStep === 'config' && (
                    <div className="space-y-6 max-w-2xl">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Configure Your Agent</h3>
                        <p className="text-muted-foreground">
                          Customize the agent&apos;s name, description, and parameters
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Agent Name</Label>
                          <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => updateData({ name: e.target.value })}
                            placeholder="e.g., Daily Opportunity Scanner"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => updateData({ description: e.target.value })}
                            placeholder="What does this agent do?"
                            rows={3}
                            className="mt-1.5"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <Label htmlFor="is-active" className="text-base">Activate Agent</Label>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Start running this agent immediately after creation
                            </p>
                          </div>
                          <Switch
                            id="is-active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => updateData({ is_active: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Schedule */}
                  {currentStep === 'schedule' && (
                    <div className="space-y-6 max-w-2xl">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Automation Schedule</h3>
                        <p className="text-muted-foreground">
                          Configure when and how often this agent runs
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <Label htmlFor="schedule-enabled" className="text-base">Enable Scheduling</Label>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Run this agent automatically on a schedule
                            </p>
                          </div>
                          <Switch
                            id="schedule-enabled"
                            checked={data.scheduleEnabled}
                            onCheckedChange={(checked) => updateData({ scheduleEnabled: checked })}
                          />
                        </div>

                        {data.scheduleEnabled && (
                          <div>
                            <Label htmlFor="schedule">Run Frequency</Label>
                            <Select
                              value={data.schedule_cron}
                              onValueChange={(value) => updateData({ schedule_cron: value })}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0 * * * *">Every hour</SelectItem>
                                <SelectItem value="0 */6 * * *">Every 6 hours</SelectItem>
                                <SelectItem value="0 9 * * *">Daily at 9:00 AM</SelectItem>
                                <SelectItem value="0 9 * * 1">Weekly (Monday 9:00 AM)</SelectItem>
                                <SelectItem value="0 9 1 * *">Monthly (1st day, 9:00 AM)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                              Cron expression: {data.schedule_cron}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Review */}
                  {currentStep === 'review' && (
                    <div className="space-y-6 max-w-2xl">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Review & Launch</h3>
                        <p className="text-muted-foreground">
                          Verify your agent configuration before launching
                        </p>
                      </div>

                      <Card>
                        <CardContent className="p-6 space-y-4">
                          <div>
                            <Label className="text-muted-foreground text-sm">Agent Type</Label>
                            <div className="flex items-center gap-2 mt-1">
                              {AGENT_TYPES.find(t => t.id === data.agent_type)?.icon && (
                                <div className={cn(
                                  "h-8 w-8 rounded flex items-center justify-center bg-gradient-to-br",
                                  AGENT_TYPES.find(t => t.id === data.agent_type)?.color
                                )}>
                                  {(() => {
                                    const Icon = AGENT_TYPES.find(t => t.id === data.agent_type)!.icon
                                    return <Icon className="h-4 w-4 text-white" />
                                  })()}
                                </div>
                              )}
                              <p className="font-medium">
                                {AGENT_TYPES.find(t => t.id === data.agent_type)?.name}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Name</Label>
                            <p className="font-medium mt-1">{data.name}</p>
                          </div>

                          {data.description && (
                            <div>
                              <Label className="text-muted-foreground text-sm">Description</Label>
                              <p className="text-sm mt-1">{data.description}</p>
                            </div>
                          )}

                          <div className="flex gap-8">
                            <div>
                              <Label className="text-muted-foreground text-sm">Status</Label>
                              <div className="mt-1">
                                <Badge variant={data.is_active ? 'default' : 'secondary'}>
                                  {data.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <Label className="text-muted-foreground text-sm">Schedule</Label>
                              <p className="text-sm mt-1">
                                {data.scheduleEnabled ? (
                                  data.schedule_cron === '0 9 * * *' ? 'Daily at 9:00 AM' :
                                  data.schedule_cron === '0 * * * *' ? 'Every hour' :
                                  data.schedule_cron === '0 */6 * * *' ? 'Every 6 hours' :
                                  data.schedule_cron === '0 9 * * 1' ? 'Weekly (Monday)' :
                                  data.schedule_cron === '0 9 1 * *' ? 'Monthly' :
                                  data.schedule_cron
                                ) : (
                                  'Manual only'
                                )}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={goToPreviousStep}
                  disabled={isFirstStep || isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  {!isLastStep ? (
                    <Button
                      onClick={goToNextStep}
                      disabled={!isStepValid() || isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      disabled={!isStepValid() || isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-1" />
                          Launch Agent
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
