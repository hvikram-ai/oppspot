'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { StepIndicator, Step } from '@/components/ui/step-indicator'
import { useWizardState } from '@/lib/hooks/use-wizard-state'
import { StreamWizardData, StreamWizardStep, WORKFLOW_TEMPLATES } from '@/types/stream-wizard'
import { ChevronLeft, ChevronRight, Rocket, Target, Workflow, Users, Link2, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateStreamRequest } from '@/types/streams'

const WIZARD_STEPS: readonly Step[] = [
  {
    id: 'basics',
    title: 'Stream Basics',
    description: 'Name, type & appearance',
    icon: Target,
  },
  {
    id: 'workflow',
    title: 'Workflow',
    description: 'Configure stages',
    icon: Workflow,
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Invite members',
    icon: Users,
  },
  {
    id: 'integration',
    title: 'Integration',
    description: 'Setup & preferences',
    icon: Link2,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Final review',
    icon: FileCheck,
  },
] as const

interface StreamWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (data: CreateStreamRequest) => Promise<void>
  orgId: string
}

export function StreamWizard({ open, onOpenChange, onComplete, orgId }: StreamWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialData: StreamWizardData = {
    name: '',
    description: '',
    emoji: '📁',
    color: '#6366f1',
    stream_type: 'project',
    workflowTemplate: 'project_stages',
    stages: WORKFLOW_TEMPLATES.project_stages.stages,
    members: [],
    privacy: 'team',
    defaultRole: 'viewer',
    autoImportCompanies: false,
    enableNotifications: true,
    notificationChannels: ['email', 'in_app'],
    aiProcessing: true,
    termsAccepted: false,
  }

  const {
    currentStep,
    currentStepIndex,
    data,
    isFirstStep,
    isLastStep,
    updateData,
    goToNextStep,
    goToPreviousStep,
    reset,
    clearDraft,
  } = useWizardState<StreamWizardData>({
    steps: WIZARD_STEPS,
    initialData,
    storageKey: 'stream-wizard-draft',
  })

  // Validation for each step
  const isStepValid = useCallback((step: StreamWizardStep) => {
    switch (step) {
      case 'basics':
        return data.name.trim().length > 0 && data.stream_type.length > 0
      case 'workflow':
        return data.stages.length > 0
      case 'team':
        return true // Optional step
      case 'integration':
        return true // Optional step
      case 'review':
        return data.termsAccepted
      default:
        return false
    }
  }, [data])

  const canProceed = isStepValid(currentStep as StreamWizardStep)

  // Submit handler
  const handleComplete = useCallback(async () => {
    if (!canProceed) return

    setIsSubmitting(true)
    try {
      const requestData: CreateStreamRequest = {
        org_id: orgId,
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        color: data.color,
        stream_type: data.stream_type,
        stages: data.stages,
      }

      await onComplete(requestData)
      reset()
      clearDraft()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create stream:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [data, orgId, canProceed, onComplete, reset, clearDraft, onOpenChange])

  const handleClose = useCallback(() => {
    if (confirm('Are you sure? Your progress will be saved as a draft.')) {
      onOpenChange(false)
    }
  }, [onOpenChange])

  console.log('StreamWizard rendering, open:', open)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'bg-background rounded-xl shadow-2xl w-full max-w-5xl h-[calc(100vh-8rem)] flex flex-col border'
            )}
          >
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Create New Stream
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

          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
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
              <StepContent
                step={currentStep as StreamWizardStep}
                data={data}
                onUpdate={updateData}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isFirstStep}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-2">
              {!isLastStep ? (
                <Button
                  onClick={goToNextStep}
                  disabled={!canProceed}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed || isSubmitting}
                  className="flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Creating...' : 'Create Stream'}</span>
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

// Import step components
import { BasicsStep } from './wizard-steps/basics-step'
import { WorkflowStep } from './wizard-steps/workflow-step'
import { TeamStep } from './wizard-steps/team-step'
import { IntegrationStep } from './wizard-steps/integration-step'
import { ReviewStep } from './wizard-steps/review-step'

// Step content component
function StepContent({
  step,
  data,
  onUpdate,
}: {
  step: StreamWizardStep
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}) {
  switch (step) {
    case 'basics':
      return <BasicsStep data={data} onUpdate={onUpdate} />
    case 'workflow':
      return <WorkflowStep data={data} onUpdate={onUpdate} />
    case 'team':
      return <TeamStep data={data} onUpdate={onUpdate} />
    case 'integration':
      return <IntegrationStep data={data} onUpdate={onUpdate} />
    case 'review':
      return <ReviewStep data={data} onUpdate={onUpdate} />
    default:
      return <div>Step not implemented</div>
  }
}
