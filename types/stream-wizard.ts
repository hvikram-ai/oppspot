import { StreamType, WorkflowStage, GoalCriteria, TargetMetrics, SuccessCriteria } from './streams'
import { AssignedAgentConfig } from '@/components/streams/agent-assignment-panel'

export type StreamWizardStep = 'basics' | 'goal_template' | 'goal_criteria' | 'agents' | 'workflow' | 'team' | 'integration' | 'review'

export interface StreamMemberInvite {
  email: string
  name: string
  role: 'owner' | 'editor' | 'viewer' | 'guest'
}

export interface StreamWizardData extends Record<string, unknown> {
  // Step 1: Basics
  name: string
  description: string
  emoji: string
  color: string
  stream_type: StreamType

  // Step 2: Goal Template (NEW)
  isGoalOriented: boolean
  goal_template_id: string | null
  goal_deadline: string | null

  // Step 3: Goal Criteria (NEW)
  goal_criteria: GoalCriteria
  target_metrics: TargetMetrics
  success_criteria: SuccessCriteria

  // Step 4: Agent Assignment (NEW)
  assign_agents: boolean
  assigned_agents: AssignedAgentConfig[]

  // Step 5: Workflow
  workflowTemplate: 'deal_pipeline' | 'project_stages' | 'research_phases' | 'custom'
  stages: WorkflowStage[]

  // Step 6: Team
  members: StreamMemberInvite[]
  privacy: 'private' | 'team' | 'organization'
  defaultRole: 'viewer' | 'editor'

  // Step 7: Integration
  autoImportCompanies: boolean
  enableNotifications: boolean
  notificationChannels: ('email' | 'in_app' | 'slack')[]
  aiProcessing: boolean

  // Step 8: Review
  termsAccepted: boolean
  broadcastMessage?: string
}

export const WORKFLOW_TEMPLATES = {
  deal_pipeline: {
    id: 'deal_pipeline',
    name: 'M&A Deal Pipeline',
    description: 'Track acquisition targets from discovery to close',
    stages: [
      { id: 'sourcing', name: 'Sourcing', color: '#94a3b8', order: 0 },
      { id: 'screening', name: 'Initial Screening', color: '#60a5fa', order: 1 },
      { id: 'diligence', name: 'Due Diligence', color: '#a78bfa', order: 2 },
      { id: 'negotiation', name: 'Negotiation', color: '#f59e0b', order: 3 },
      { id: 'closing', name: 'Closing', color: '#10b981', order: 4 },
    ],
  },
  project_stages: {
    id: 'project_stages',
    name: 'Project Stages',
    description: 'Standard project workflow from planning to completion',
    stages: [
      { id: 'planning', name: 'Planning', color: '#94a3b8', order: 0 },
      { id: 'in_progress', name: 'In Progress', color: '#3b82f6', order: 1 },
      { id: 'review', name: 'Review', color: '#f59e0b', order: 2 },
      { id: 'completed', name: 'Completed', color: '#10b981', order: 3 },
    ],
  },
  research_phases: {
    id: 'research_phases',
    name: 'Research Phases',
    description: 'Market research and analysis workflow',
    stages: [
      { id: 'discovery', name: 'Discovery', color: '#94a3b8', order: 0 },
      { id: 'analysis', name: 'Analysis', color: '#3b82f6', order: 1 },
      { id: 'insights', name: 'Insights', color: '#a78bfa', order: 2 },
      { id: 'recommendations', name: 'Recommendations', color: '#10b981', order: 3 },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom Workflow',
    description: 'Create your own stages',
    stages: [
      { id: 'todo', name: 'To Do', color: '#94a3b8', order: 0 },
      { id: 'doing', name: 'Doing', color: '#3b82f6', order: 1 },
      { id: 'done', name: 'Done', color: '#10b981', order: 2 },
    ],
  },
} as const

export type WorkflowTemplateId = keyof typeof WORKFLOW_TEMPLATES
