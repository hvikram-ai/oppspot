/**
 * Streams™ - TypeScript Type Definitions
 * Core types for the Streams project workspace system
 */

// ============================================
// ENUMS
// ============================================

export type StreamType = 'project' | 'deal' | 'campaign' | 'research' | 'territory'

export type StreamStatus = 'active' | 'archived' | 'completed'

export type GoalStatus = 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed' | 'failed' | 'paused'

export type GoalCategory = 'acquisition' | 'expansion' | 'partnership' | 'research' | 'monitoring' | 'custom'

export type AgentAssignmentRole = 'primary' | 'enrichment' | 'scoring' | 'monitoring' | 'notification'

export type InsightType = 'progress_update' | 'quality_assessment' | 'recommendation' | 'risk_alert' | 'milestone_achieved' | 'optimization_suggestion'

export type InsightSeverity = 'info' | 'success' | 'warning' | 'critical'

export type StreamMemberRole = 'owner' | 'editor' | 'viewer' | 'guest'

export type StreamItemType =
  | 'company'
  | 'search_query'
  | 'list'
  | 'note'
  | 'ai_research'
  | 'opportunity'
  | 'stakeholder'
  | 'task'
  | 'file'
  | 'link'

export type StreamItemStatus = 'open' | 'in_progress' | 'blocked' | 'completed' | 'archived'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type ActivityType =
  | 'stream_created'
  | 'stream_updated'
  | 'stream_archived'
  | 'member_added'
  | 'member_removed'
  | 'role_changed'
  | 'item_added'
  | 'item_updated'
  | 'item_moved'
  | 'item_deleted'
  | 'comment_added'
  | 'task_completed'
  | 'stage_changed'
  | 'assignment_changed'
  | 'ai_update'

export type NotificationType =
  | 'item_added'
  | 'item_updated'
  | 'item_assigned'
  | 'comment_added'
  | 'mentioned'
  | 'task_due'
  | 'stage_changed'
  | 'member_added'
  | 'ai_insight'
  | 'critical_update'

export type ActivityImportance = 'low' | 'normal' | 'high' | 'critical'

// ============================================
// WORKFLOW STAGE
// ============================================

export interface WorkflowStage {
  id: string
  name: string
  color: string
  position?: number
}

// ============================================
// NOTIFICATION SETTINGS
// ============================================

export interface NotificationSettings {
  new_items: boolean
  status_changes: boolean
  mentions: boolean
  comments: boolean
  daily_digest: boolean
  instant_critical: boolean
}

// ============================================
// CORE ENTITIES
// ============================================

export interface Stream {
  id: string
  org_id: string

  // Basic Info
  name: string
  description: string | null
  emoji: string
  color: string

  // Stream Type
  stream_type: StreamType

  // Workflow
  stages: WorkflowStage[]

  // Metadata
  metadata: Record<string, unknown>

  // Status
  status: StreamStatus
  archived_at: string | null

  // Goal Fields (NEW)
  goal_template_id: string | null
  goal_criteria: GoalCriteria
  target_metrics: TargetMetrics
  success_criteria: SuccessCriteria
  current_progress: ProgressMetrics
  goal_deadline: string | null
  goal_status: GoalStatus

  // Ownership
  created_by: string
  updated_by: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Relations (joined data)
  member_count?: number
  item_count?: number
  members?: StreamMember[]
  creator?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
  assigned_agents?: StreamAgentAssignment[]
  insights?: StreamInsight[]
}

export interface StreamMember {
  id: string
  stream_id: string
  user_id: string

  // Role
  role: StreamMemberRole

  // Notification Preferences
  notification_settings: NotificationSettings

  // Invitation
  invited_by: string | null
  invitation_accepted_at: string | null

  // Timestamps
  joined_at: string
  last_accessed_at: string | null

  // Relations (joined data)
  user?: {
    id: string
    full_name?: string
    email?: string
    avatar_url?: string
  }
}

export interface StreamItem {
  id: string
  stream_id: string

  // Item Type & Reference
  item_type: StreamItemType
  business_id: string | null
  list_id: string | null
  research_id: string | null

  // Item Data
  title: string
  description: string | null
  content: Record<string, unknown>

  // Workflow Stage
  stage_id: string | null

  // Priority & Tags
  priority: Priority
  tags: string[]

  // Assignment
  assigned_to: string | null
  due_date: string | null

  // Progress
  completion_percentage: number
  status: StreamItemStatus

  // Ordering
  position: number

  // Metadata
  metadata: Record<string, unknown>

  // Ownership
  added_by: string
  updated_by: string | null

  // Timestamps
  created_at: string
  updated_at: string
  completed_at: string | null

  // Relations (joined data)
  business?: {
    id: string
    name: string
    website?: string
  }
  assigned_user?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
  comment_count?: number
}

export interface StreamActivity {
  id: string
  stream_id: string
  user_id: string

  // Activity Type
  activity_type: ActivityType

  // Activity Target
  target_type: string | null
  target_id: string | null

  // Activity Description
  description: string
  metadata: Record<string, unknown>

  // Visibility
  is_system: boolean
  importance: ActivityImportance

  // Timestamps
  created_at: string

  // Relations (joined data)
  user?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
}

export interface StreamComment {
  id: string
  stream_id: string
  item_id: string | null

  // Comment Content
  content: string
  content_html: string | null

  // Threading
  parent_comment_id: string | null
  thread_id: string | null

  // Mentions
  mentioned_users: string[]

  // Reactions
  reactions: Record<string, string[]> // { "👍": ["user_id1", "user_id2"] }

  // Status
  is_edited: boolean
  edited_at: string | null
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null

  // Ownership
  author_id: string

  // Timestamps
  created_at: string
  updated_at: string

  // Relations (joined data)
  author?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
  replies?: StreamComment[]
}

export interface StreamPresence {
  id: string
  stream_id: string
  user_id: string

  // Presence Data
  current_view: string | null
  cursor_position: { x: number; y: number } | null
  last_action: string | null

  // Session
  session_id: string
  last_seen_at: string

  // Timestamps
  joined_at: string

  // Relations (joined data)
  user?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
}

export interface StreamNotification {
  id: string
  stream_id: string
  user_id: string

  // Notification Type
  notification_type: NotificationType

  // Notification Content
  title: string
  body: string
  action_url: string | null

  // Related Entities
  item_id: string | null
  comment_id: string | null
  actor_id: string | null

  // Priority
  priority: Priority

  // Status
  is_read: boolean
  read_at: string | null
  is_archived: boolean

  // Delivery
  delivered_via: string[]

  // Timestamps
  created_at: string

  // Relations (joined data)
  actor?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateStreamRequest {
  name: string
  description?: string
  emoji?: string
  color?: string
  stream_type?: StreamType
  stages?: WorkflowStage[]
  metadata?: Record<string, unknown>
}

export interface UpdateStreamRequest {
  name?: string
  description?: string
  emoji?: string
  color?: string
  stages?: WorkflowStage[]
  metadata?: Record<string, unknown>
  status?: StreamStatus
}

export interface AddStreamMemberRequest {
  user_id: string
  role: StreamMemberRole
  notification_settings?: Partial<NotificationSettings>
}

export interface CreateStreamItemRequest {
  item_type: StreamItemType
  title: string
  description?: string
  content?: Record<string, unknown>
  business_id?: string
  list_id?: string
  research_id?: string
  stage_id?: string
  priority?: Priority
  tags?: string[]
  assigned_to?: string
  due_date?: string
  metadata?: Record<string, unknown>
}

export interface UpdateStreamItemRequest {
  title?: string
  description?: string
  content?: Record<string, unknown>
  stage_id?: string
  priority?: Priority
  tags?: string[]
  assigned_to?: string
  due_date?: string
  completion_percentage?: number
  status?: StreamItemStatus
  position?: number
  metadata?: Record<string, unknown>
}

export interface CreateStreamCommentRequest {
  item_id?: string
  content: string
  parent_comment_id?: string
  mentioned_users?: string[]
}

export interface UpdateStreamCommentRequest {
  content?: string
  is_resolved?: boolean
}

export interface StreamFilters {
  stream_type?: StreamType
  status?: StreamStatus
  search?: string
  created_by?: string
  member_id?: string
}

export interface StreamItemFilters {
  item_type?: StreamItemType
  status?: StreamItemStatus
  stage_id?: string
  assigned_to?: string
  priority?: Priority
  tags?: string[]
  search?: string
}

export interface StreamListResponse {
  streams: Stream[]
  total: number
  page: number
  limit: number
}

export interface StreamDetailResponse {
  stream: Stream
  items: StreamItem[]
  members: StreamMember[]
  recent_activity: StreamActivity[]
}

// ============================================
// UI STATE TYPES
// ============================================

export interface StreamBoardState {
  view: 'board' | 'list' | 'timeline'
  groupBy: 'stage' | 'assignee' | 'priority'
  filters: StreamItemFilters
  selectedItems: string[]
}

export interface PresenceState {
  users: Map<string, StreamPresence>
  isOnline: boolean
  currentView: string | null
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface StreamAnalytics {
  stream_id: string
  total_items: number
  completed_items: number
  completion_rate: number
  items_by_stage: Record<string, number>
  items_by_priority: Record<Priority, number>
  active_members: number
  avg_completion_time_days: number | null
  overdue_tasks: number
}

// ============================================
// GOAL-ORIENTED TYPES (NEW)
// ============================================

export interface GoalCriteria {
  industry?: string[]
  revenue?: { min?: number; max?: number }
  location?: string[]
  growth_rate?: { min?: number; max?: number }
  employee_count?: { min?: number; max?: number }
  funding_stage?: string[]
  tech_stack?: string[]
  signals?: string[]
  [key: string]: unknown
}

export interface TargetMetrics {
  companies_to_find?: number
  min_quality_score?: number
  required_signals?: string[]
  top_targets?: number
  meetings_to_schedule?: number
  [key: string]: unknown
}

export interface SuccessCriteria {
  min_qualified?: number
  min_researched?: number
  min_contacted?: number
  partnerships_initiated?: number
  agreements_signed?: number
  [key: string]: unknown
}

export interface ProgressMetrics {
  completed: number
  total: number
  percentage: number
  last_updated?: string
  items_by_stage?: Record<string, number>
  quality_score?: number
  signals_detected?: number
}

export interface SuggestedAgent {
  agent_type: string
  role: AgentAssignmentRole
  order: number
  config?: Record<string, unknown>
}

export interface GoalTemplate {
  id: string
  name: string
  description: string
  category: GoalCategory
  icon: string

  // Template configuration
  default_criteria: GoalCriteria
  default_metrics: TargetMetrics
  default_success_criteria: SuccessCriteria
  suggested_agents: SuggestedAgent[]

  // Template metadata
  use_count: number
  avg_success_rate: number | null
  avg_completion_days: number | null

  // Visibility
  is_public: boolean
  created_by: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface StreamAgentAssignment {
  id: string
  stream_id: string
  agent_id: string

  // Assignment details
  assignment_role: AgentAssignmentRole
  execution_order: number

  // Execution settings
  is_active: boolean
  auto_execute: boolean
  execution_frequency: string | null
  execution_config: Record<string, unknown>

  // Dependencies
  depends_on_agent_ids: string[]
  trigger_conditions: Record<string, unknown>

  // Metrics
  total_executions: number
  successful_executions: number
  last_executed_at: string | null
  avg_execution_time_ms: number | null

  // Timestamps
  created_at: string
  updated_at: string

  // Relations (joined data)
  agent?: {
    id: string
    name: string
    agent_type: string
    is_active: boolean
  }
}

export interface StreamInsight {
  id: string
  stream_id: string

  // Insight details
  insight_type: InsightType
  title: string
  description: string

  // Insight data
  severity: InsightSeverity
  data: Record<string, unknown>

  // Source
  generated_by: string
  agent_execution_id: string | null

  // Status
  is_read: boolean
  is_actionable: boolean
  action_taken: boolean
  action_taken_at: string | null

  // Timestamps
  created_at: string

  // Relations (joined data)
  agent?: {
    id: string
    name: string
    agent_type: string
  }
}

// ============================================
// GOAL-ORIENTED REQUEST/RESPONSE TYPES
// ============================================

export interface CreateGoalStreamRequest extends CreateStreamRequest {
  goal_template_id?: string
  goal_criteria?: GoalCriteria
  target_metrics?: TargetMetrics
  success_criteria?: SuccessCriteria
  goal_deadline?: string
  assign_agents?: boolean // Auto-assign agents from template
}

export interface AssignAgentToStreamRequest {
  agent_id: string
  assignment_role?: AgentAssignmentRole
  execution_order?: number
  is_active?: boolean
  auto_execute?: boolean
  execution_frequency?: string
  execution_config?: Record<string, unknown>
  depends_on_agent_ids?: string[]
}

export interface ExecuteStreamAgentRequest {
  agent_id: string
  execution_config?: Record<string, unknown>
  force_execute?: boolean // Ignore dependencies
}

export interface StreamProgressResponse {
  stream: Stream
  progress: ProgressMetrics
  goal_status: GoalStatus
  insights: StreamInsight[]
  recent_agent_executions: AgentExecutionSummary[]
  quality_metrics: {
    avg_quality_score: number
    high_quality_count: number
    signals_detected: number
  }
}

export interface AgentExecutionSummary {
  id: string
  agent_id: string
  agent_name: string
  agent_type: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  results_summary: {
    items_created?: number
    items_updated?: number
    items_qualified?: number
    avg_score?: number
  }
}
