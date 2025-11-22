/**
 * Background Job Types
 * Unified type definitions for all job queues
 */

// ============================================================================
// JOB STATUS TYPES
// ============================================================================

export type JobStatus =
  | 'waiting'    // Job is queued but not yet started
  | 'active'     // Job is currently being processed
  | 'completed'  // Job finished successfully
  | 'failed'     // Job failed after all retry attempts
  | 'delayed'    // Job is delayed (scheduled for future)
  | 'paused'     // Queue is paused

// ============================================================================
// GENERIC JOB INFO
// ============================================================================

export interface JobInfo<TData = unknown, TResult = unknown> {
  id: string
  name: string
  queue: string
  status: JobStatus
  data: TData
  result?: TResult
  error?: string
  progress?: number // 0-100
  attempts: number
  attemptsMade: number
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
  stacktrace?: string[]
}

// ============================================================================
// RESEARCH JOB TYPES
// ============================================================================

export interface ResearchJobData {
  user_id: string
  company_id: string
  company_name: string
  company_number?: string
  website_url?: string
  force_refresh?: boolean
  user_context?: string
  focus_areas?: string[]
}

export interface ResearchJobResult {
  report_id: string
  status: 'complete' | 'failed'
  sections_complete?: number
  total_sources?: number
  confidence_score?: number
  error?: string
  generation_time_ms?: number
}

// ============================================================================
// ENRICHMENT JOB TYPES
// ============================================================================

export interface EnrichmentJobData {
  business_id: string
  business_name: string
  sources?: ('companies_house' | 'google_places' | 'social_media' | 'web_scraping')[]
  priority?: 'high' | 'medium' | 'low'
  user_id?: string
}

export interface EnrichmentJobResult {
  business_id: string
  success: boolean
  sources_processed: string[]
  sources_successful: string[]
  sources_failed: string[]
  fields_enriched: string[]
  completeness_before: number
  completeness_after: number
  error?: string
  processing_time_ms: number
}

// ============================================================================
// SCORING JOB TYPES
// ============================================================================

export interface ScoringJobData {
  company_id: string
  company_name: string
  scoring_criteria?: {
    financial_health?: boolean
    growth_indicators?: boolean
    industry_alignment?: boolean
    technology_fit?: boolean
    engagement_tracking?: boolean
    bant_scoring?: boolean
  }
  user_id?: string
  force_recalculate?: boolean
}

export interface ScoringJobResult {
  company_id: string
  overall_score: number
  scores: {
    financial_health?: number
    growth_indicators?: number
    industry_alignment?: number
    technology_fit?: number
    engagement?: number
    bant?: number
  }
  recommendations: string[]
  confidence: number
  calculated_at: string
  error?: string
}

// ============================================================================
// SIGNALS JOB TYPES
// ============================================================================

export interface SignalsJobData {
  company_id: string
  company_name: string
  signal_types?: (
    | 'funding'
    | 'expansion'
    | 'hiring'
    | 'technology_adoption'
    | 'executive_change'
    | 'financial_event'
  )[]
  sources?: ('news' | 'linkedin' | 'companies_house' | 'web_scraping')[]
  user_id?: string
  lookback_days?: number
}

export interface SignalsJobResult {
  company_id: string
  signals_detected: number
  signals: Array<{
    signal_type: string
    confidence: number
    description: string
    source: string
    detected_at: string
  }>
  high_confidence_signals: number
  status: 'complete' | 'partial' | 'failed'
  error?: string
  processing_time_ms: number
}

// ============================================================================
// QUEUE STATS TYPES
// ============================================================================

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
  total: number
}

export interface QueuesHealth {
  healthy: boolean
  queues: QueueStats[]
  timestamp: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface JobStatusResponse {
  job: JobInfo
  queue: string
  status: JobStatus
  progress?: number
  result?: unknown
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
  estimated_completion?: string
  poll_interval_ms: number
}

export interface JobQueuedResponse {
  job_id: string
  queue: string
  status: 'queued'
  estimated_completion_seconds: number
  poll_url: string
}

export interface BatchJobResponse {
  total: number
  queued: number
  job_ids: string[]
  poll_url: string
}
