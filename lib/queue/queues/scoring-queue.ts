/**
 * Scoring Queue
 * Handles lead scoring calculation jobs
 */

import { Job } from 'bull'
import { getQueue, QUEUE_NAMES } from '../queue-manager'

// ============================================================================
// JOB DATA TYPES
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
// QUEUE INSTANCE
// ============================================================================

/**
 * Get the scoring queue instance
 */
export function getScoringQueue() {
  return getQueue(QUEUE_NAMES.SCORING)
}

// ============================================================================
// JOB PRODUCERS
// ============================================================================

/**
 * Add a scoring job to the queue
 */
export async function addScoringJob(
  data: ScoringJobData,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<Job<ScoringJobData>> {
  const queue = getScoringQueue()

  const job = await queue.add('calculate', data, {
    priority: options?.priority || 3,
    delay: options?.delay,
    jobId: options?.jobId || `scoring:${data.company_id}:${Date.now()}`,
  })

  console.log(
    `[Scoring Queue] Added job ${job.id} for company ${data.company_name}`
  )

  return job
}

/**
 * Add a batch of scoring jobs
 */
export async function addBatchScoringJobs(
  companies: Array<{
    company_id: string
    company_name: string
    user_id?: string
  }>
): Promise<Job<ScoringJobData>[]> {
  const queue = getScoringQueue()

  const jobs = companies.map((company, index) => ({
    name: 'calculate',
    data: {
      ...company,
      scoring_criteria: {
        financial_health: true,
        growth_indicators: true,
        industry_alignment: true,
        technology_fit: true,
        engagement_tracking: true,
        bant_scoring: true,
      },
    },
    opts: {
      jobId: `scoring:batch:${company.company_id}:${Date.now()}`,
      priority: 5, // Medium priority for batch jobs
      delay: index * 100, // Stagger by 100ms
    },
  }))

  const addedJobs = await queue.addBulk(jobs)

  console.log(`[Scoring Queue] Added ${addedJobs.length} batch jobs`)

  return addedJobs
}

/**
 * Add a high-priority scoring job (for hot leads)
 */
export async function addUrgentScoringJob(
  data: ScoringJobData
): Promise<Job<ScoringJobData>> {
  return addScoringJob(data, {
    priority: 1, // Highest priority
  })
}

// ============================================================================
// JOB GETTERS
// ============================================================================

/**
 * Get a scoring job by ID
 */
export async function getScoringJob(
  jobId: string
): Promise<Job<ScoringJobData> | null> {
  const queue = getScoringQueue()
  return queue.getJob(jobId)
}

/**
 * Check if a company scoring job is already queued
 */
export async function isCompanyScoringQueued(
  companyId: string
): Promise<boolean> {
  const queue = getScoringQueue()

  const [active, waiting] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
  ])

  const allJobs = [...active, ...waiting]

  return allJobs.some((job) => job.data.company_id === companyId)
}

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

/**
 * Cancel a scoring job
 */
export async function cancelScoringJob(jobId: string): Promise<void> {
  const job = await getScoringJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.remove()
  console.log(`[Scoring Queue] Cancelled job ${jobId}`)
}

/**
 * Retry a failed scoring job
 */
export async function retryScoringJob(jobId: string): Promise<void> {
  const job = await getScoringJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.retry()
  console.log(`[Scoring Queue] Retried job ${jobId}`)
}

// ============================================================================
// QUEUE STATS
// ============================================================================

/**
 * Get scoring queue statistics
 */
export async function getScoringQueueStats() {
  const queue = getScoringQueue()

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

/**
 * Schedule periodic scoring for a company (e.g., weekly recalculation)
 */
export async function schedulePeriodicScoring(
  data: ScoringJobData,
  intervalMs: number = 7 * 24 * 60 * 60 * 1000 // Default: 7 days
): Promise<Job<ScoringJobData>> {
  const queue = getScoringQueue()

  const job = await queue.add('calculate', data, {
    repeat: {
      every: intervalMs,
    },
    jobId: `scoring:periodic:${data.company_id}`,
  })

  console.log(
    `[Scoring Queue] Scheduled periodic scoring for ${data.company_name} every ${intervalMs}ms`
  )

  return job
}
