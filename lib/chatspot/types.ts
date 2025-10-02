/**
 * ChatSpot™ - Type Definitions
 * Conversational AI interface for oppSpot
 */

// ============================================================================
// Core Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export type IntentType =
  | 'search_companies'       // Find companies matching criteria
  | 'research_company'       // Deep-dive research on company
  | 'find_similar'           // Find similar companies
  | 'check_signals'          // Check buying signals
  | 'find_stakeholder'       // Find decision makers
  | 'create_list'            // Create/update list
  | 'export_data'            // Export data
  | 'get_recommendations'    // Get AI recommendations
  | 'analyze_market'         // Market analysis
  | 'answer_question'        // General questions
  | 'execute_workflow'       // Multi-step workflows
  | 'unknown'

export type ActionType =
  | 'search'
  | 'research'
  | 'add_to_list'
  | 'export'
  | 'draft_email'
  | 'book_meeting'
  | 'analyze'
  | 'summarize'
  | 'compare'

// ============================================================================
// Message Types
// ============================================================================

export interface ChatMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string

  // AI metadata
  intent?: IntentType
  confidence?: number

  // Actions and results
  actions?: ChatAction[]
  results?: ChatResult[]

  // UI metadata
  streaming?: boolean
  error?: string

  // Timestamps
  created_at: string
}

export interface ChatAction {
  type: ActionType
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: any
  error?: string
}

export interface ChatResult {
  type: 'companies' | 'research' | 'list' | 'export' | 'summary' | 'error'
  data: any
  count?: number
  preview?: string
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string
  org_id: string
  user_id: string

  title: string
  context?: ConversationContext

  // Messages
  message_count: number
  last_message_at?: string

  // Status
  is_active: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

export interface ConversationContext {
  // Current focus
  focused_companies?: string[]
  focused_lists?: string[]

  // Recent actions
  recent_searches?: string[]
  recent_exports?: string[]

  // User preferences
  preferred_actions?: ActionType[]
  default_filters?: Record<string, any>
}

// ============================================================================
// Intent Recognition
// ============================================================================

export interface Intent {
  type: IntentType
  confidence: number
  parameters: IntentParameters
  suggested_actions: SuggestedAction[]
}

export interface IntentParameters {
  // Search parameters
  industries?: string[]
  locations?: string[]
  company_size?: { min?: number; max?: number }
  funding_stage?: string[]
  technologies?: string[]
  keywords?: string[]

  // Company references
  company_ids?: string[]
  company_names?: string[]

  // Temporal
  date_range?: { from?: string; to?: string }

  // Actions
  action_type?: ActionType
  list_name?: string
  export_format?: string

  // Advanced
  similarity_to?: string
  exclude?: string[]
  limit?: number
}

export interface SuggestedAction {
  type: ActionType
  label: string
  description: string
  parameters?: Record<string, any>
  priority: number
}

// ============================================================================
// Query Processing
// ============================================================================

export interface ProcessedQuery {
  original_query: string
  intent: Intent
  sql_query?: string
  api_calls?: APICall[]
  workflow?: WorkflowStep[]
}

export interface APICall {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, any>
  body?: Record<string, any>
}

export interface WorkflowStep {
  step_number: number
  action: ActionType
  description: string
  parameters: Record<string, any>
  depends_on?: number[]
}

// ============================================================================
// Response Types
// ============================================================================

export interface ChatResponse {
  message: ChatMessage
  intent: Intent
  results?: ChatResult[]
  suggested_actions?: SuggestedAction[]
  streaming?: boolean
}

export interface StreamChunk {
  type: 'text' | 'action' | 'result' | 'complete'
  content: string
  metadata?: Record<string, any>
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SendMessageRequest {
  conversation_id?: string
  message: string
  context?: Partial<ConversationContext>
}

export interface SendMessageResponse {
  success: boolean
  conversation_id: string
  message: ChatMessage
  response: ChatMessage
  suggested_actions?: SuggestedAction[]
}

export interface ExecuteActionRequest {
  conversation_id: string
  message_id: string
  action: {
    type: ActionType
    parameters: Record<string, any>
  }
}

export interface ExecuteActionResponse {
  success: boolean
  action_result: ChatResult
  follow_up_message?: string
  suggested_actions?: SuggestedAction[]
}

export interface GetConversationsRequest {
  limit?: number
  include_inactive?: boolean
}

export interface GetConversationsResponse {
  success: boolean
  conversations: Conversation[]
  total_count: number
}

export interface GetMessagesRequest {
  conversation_id: string
  limit?: number
  before?: string
}

export interface GetMessagesResponse {
  success: boolean
  messages: ChatMessage[]
  conversation: Conversation
  has_more: boolean
}

// ============================================================================
// Intent Templates
// ============================================================================

export interface IntentTemplate {
  intent_type: IntentType
  patterns: string[]
  parameter_extraction: ParameterExtractor[]
  default_actions: ActionType[]
  examples: string[]
}

export interface ParameterExtractor {
  parameter_name: string
  extraction_type: 'keyword' | 'entity' | 'number' | 'date' | 'location'
  patterns?: RegExp[]
  required: boolean
}

// ============================================================================
// Context Management
// ============================================================================

export interface ChatContext {
  conversation: Conversation
  recent_messages: ChatMessage[]
  user_profile?: {
    name: string
    email: string
    preferences?: Record<string, any>
  }
  org_context?: {
    name: string
    industry?: string
    target_markets?: string[]
  }
}

// ============================================================================
// Action Execution
// ============================================================================

export interface ActionExecutor {
  type: ActionType
  execute: (params: Record<string, any>, context: ChatContext) => Promise<ChatResult>
  validate: (params: Record<string, any>) => { valid: boolean; errors?: string[] }
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamOptions {
  conversation_id: string
  message: string
  on_chunk?: (chunk: StreamChunk) => void
  on_complete?: (response: ChatResponse) => void
  on_error?: (error: Error) => void
}

// ============================================================================
// Helper Types
// ============================================================================

export interface CompanySearchResult {
  companies: Array<{
    id: string
    name: string
    industry?: string
    location?: string
    employee_count?: number
    funding_stage?: string
    match_score?: number
  }>
  total_count: number
  query_interpretation: string
}

export interface ResearchResult {
  company_id: string
  company_name: string
  research_summary: string
  key_facts: Array<{
    category: string
    fact: string
    confidence: number
  }>
  stakeholders?: Array<{
    name: string
    role: string
    contact?: string
  }>
  buying_signals?: Array<{
    type: string
    strength: number
    description: string
  }>
}

export interface ExportResult {
  format: 'csv' | 'json' | 'pdf'
  file_url: string
  file_name: string
  record_count: number
}
