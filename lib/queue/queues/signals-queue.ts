/**
 * Signals Queue
 * Handles buying signal detection jobs
 */

import { Job } from 'bull'
import { getQueue, QUEUE_NAMES } from '../queue-manager'

// ============================================================================
// JOB DATA TYPES
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
  lookback_days?: number // How far back to search for signals
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
// QUEUE INSTANCE
// ============================================================================

/**
 * Get the signals queue instance
 */
export function getSignalsQueue() {
  return getQueue(QUEUE_NAMES.SIGNALS)
}

// ============================================================================
// JOB PRODUCERS
// ============================================================================

/**
 * Add a signal detection job to the queue
 */
export async function addSignalsJob(
  data: SignalsJobData,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<Job<SignalsJobData>> {
  const queue = getSignalsQueue()

  const job = await queue.add('detect', data, {
    priority: options?.priority || 2,
    delay: options?.delay,
    jobId: options?.jobId || `signals:${data.company_id}:${Date.now()}`,
  })

  console.log(
    `[Signals Queue] Added job ${job.id} for company ${data.company_name}`
  )

  return job
}

/**
 * Add a batch of signal detection jobs
 */
export async function addBatchSignalsJobs(
  companies: Array<{
    company_id: string
    company_name: string
    user_id?: string
  }>
): Promise<Job<SignalsJobData>[]> {
  const queue = getSignalsQueue()

  const jobs = companies.map((company, index) => ({
    name: 'detect',
    data: {
      ...company,
      lookback_days: 30, // Last 30 days
    },
    opts: {
      jobId: `signals:batch:${company.company_id}:${Date.now()}`,
      priority: 5, // Medium priority for batch jobs
      delay: index * 200, // Stagger by 200ms
    },
  }))

  const addedJobs = await queue.addBulk(jobs)

  console.log(`[Signals Queue] Added ${addedJobs.length} batch jobs`)

  return addedJobs
}

/**
 * Add a high-priority signal detection job (urgent monitoring)
 */
export async function addUrgentSignalsJob(
  data: SignalsJobData
): Promise<Job<SignalsJobData>> {
  return addSignalsJob(data, {
    priority: 1, // Highest priority
  })
}

// ============================================================================
// JOB GETTERS
// ============================================================================

/**
 * Get a signals job by ID
 */
export async function getSignalsJob(
  jobId: string
): Promise<Job<SignalsJobData> | null> {
  const queue = getSignalsQueue()
  return queue.getJob(jobId)
}

/**
 * Check if a company signals job is already queued
 */
export async function isCompanySignalsQueued(
  companyId: string
): Promise<boolean> {
  const queue = getSignalsQueue()

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
 * Cancel a signals job
 */
export async function cancelSignalsJob(jobId: string): Promise<void> {
  const job = await getSignalsJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.remove()
  console.log(`[Signals Queue] Cancelled job ${jobId}`)
}

/**
 * Retry a failed signals job
 */
export async function retrySignalsJob(jobId: string): Promise<void> {
  const job = await getSignalsJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.retry()
  console.log(`[Signals Queue] Retried job ${jobId}`)
}

// ============================================================================
// QUEUE STATS
// ============================================================================

/**
 * Get signals queue statistics
 */
export async function getSignalsQueueStats() {
  const queue = getSignalsQueue()

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
 * Schedule periodic signal detection for a company
 */
export async function schedulePeriodicSignalDetection(
  data: SignalsJobData,
  intervalMs: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): Promise<Job<SignalsJobData>> {
  const queue = getSignalsQueue()

  const job = await queue.add('detect', data, {
    repeat: {
      every: intervalMs,
    },
    jobId: `signals:periodic:${data.company_id}`,
  })

  console.log(
    `[Signals Queue] Scheduled periodic signal detection for ${data.company_name} every ${intervalMs}ms`
  )

  return job
}

/**
 * Monitor a list of companies for signals (continuous monitoring)
 */
export async function monitorCompaniesForSignals(
  companyIds: string[],
  intervalMs: number = 60 * 60 * 1000 // Default: 1 hour
): Promise<void> {
  console.log(
    `[Signals Queue] Setting up continuous monitoring for ${companyIds.length} companies`
  )

  // This would typically be implemented as a cron job or repeatable job
  // For now, we'll add individual monitoring jobs
  for (const companyId of companyIds) {
    await schedulePeriodicSignalDetection(
      {
        company_id: companyId,
        company_name: `Company ${companyId}`,
        lookback_days: 1, // Check last 24 hours
      },
      intervalMs
    )
  }
}
