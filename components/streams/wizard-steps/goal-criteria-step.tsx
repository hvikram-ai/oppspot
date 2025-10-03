'use client'

import { GoalCriteriaBuilder } from '@/components/streams/goal-criteria-builder'
import { StreamWizardData } from '@/types/stream-wizard'

interface GoalCriteriaStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function GoalCriteriaStep({ data, onUpdate }: GoalCriteriaStepProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Define Your Goal</h3>
        <p className="text-sm text-muted-foreground">
          Set specific criteria, targets, and success measures for your goal
        </p>
      </div>

      <GoalCriteriaBuilder
        criteria={data.goal_criteria}
        targetMetrics={data.target_metrics}
        successCriteria={data.success_criteria}
        onCriteriaChange={(criteria) => onUpdate({ goal_criteria: criteria })}
        onTargetMetricsChange={(metrics) => onUpdate({ target_metrics: metrics })}
        onSuccessCriteriaChange={(criteria) => onUpdate({ success_criteria: criteria })}
      />
    </div>
  )
}
