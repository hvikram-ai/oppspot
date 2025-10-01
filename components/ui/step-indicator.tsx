'use client'

import { Check, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export interface Step {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: string
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = index < currentStepIndex
          const StepIcon = step.icon

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center',
                index < steps.length - 1 && 'flex-1'
              )}
            >
              <div className="flex flex-col items-center">
                {/* Icon circle */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  !isActive && !isCompleted && 'border-border bg-background text-muted-foreground'
                )}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>

                {/* Title and description */}
                <div className="mt-2 text-center max-w-[120px]">
                  <div className={cn(
                    'text-sm font-medium',
                    isActive && 'text-primary',
                    isCompleted && 'text-primary',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight mt-1">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-px mx-4 transition-colors duration-200',
                  index < currentStepIndex ? 'bg-primary' : 'bg-border'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
