'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface SimpleStep {
  number: number;
  title: string;
  description: string;
}

interface SimpleStepIndicatorProps {
  steps: SimpleStep[];
  currentStep: number;
  className?: string;
}

/**
 * Simple step indicator for multi-step forms
 * Displays step numbers with connecting lines
 */
export function StepIndicator({ steps, currentStep, className }: SimpleStepIndicatorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const stepNumber = step.number;

          return (
            <div
              key={step.number}
              className={cn(
                'flex items-center',
                index < steps.length - 1 && 'flex-1'
              )}
            >
              <div className="flex flex-col items-center">
                {/* Number circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    !isActive && !isCompleted && 'border-border bg-background text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>

                {/* Title and description */}
                <div className="mt-2 text-center max-w-[120px]">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-primary',
                      isCompleted && 'text-primary',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight mt-1">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-4 transition-colors duration-200',
                    step.number < currentStep ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
