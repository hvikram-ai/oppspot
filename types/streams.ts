/**
 * Streams™ - TypeScript Type Definitions
 * Core types for the Streams project workspace system
 */

// ============================================
// ENUMS
// ============================================

export type StreamType = 'project' | 'deal' | 'campaign' | 'research' | 'territory'

export type StreamStatus = 'active' | 'archived' | 'completed'

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
