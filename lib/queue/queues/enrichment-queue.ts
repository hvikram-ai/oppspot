/**
 * Enrichment Queue
 * Handles data enrichment jobs for businesses
 */

import { Job } from 'bull'
import { getQueue, QUEUE_NAMES } from '../queue-manager'

// ============================================================================
// JOB DATA TYPES
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
// QUEUE INSTANCE
// ============================================================================

/**
 * Get the enrichment queue instance
 */
export function getEnrichmentQueue() {
  return getQueue(QUEUE_NAMES.ENRICHMENT)
}

// ============================================================================
// JOB PRODUCERS
// ============================================================================

/**
 * Add an enrichment job to the queue
 */
export async function addEnrichmentJob(
  data: EnrichmentJobData,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<Job<EnrichmentJobData>> {
  const queue = getEnrichmentQueue()

  const job = await queue.add('enrich', data, {
    priority: options?.priority || getPriorityValue(data.priority),
    delay: options?.delay,
    jobId: options?.jobId || `enrichment:${data.business_id}:${Date.now()}`,
  })

  console.log(
    `[Enrichment Queue] Added job ${job.id} for business ${data.business_name}`
  )

  return job
}

/**
 * Add a batch of enrichment jobs
 */
export async function addBatchEnrichmentJobs(
  businesses: Array<{
    business_id: string
    business_name: string
    sources?: EnrichmentJobData['sources']
  }>
): Promise<Job<EnrichmentJobData>[]> {
  const queue = getEnrichmentQueue()

  const jobs = businesses.map((business, index) => ({
    name: 'enrich',
    data: {
      ...business,
      priority: 'low' as const,
    },
    opts: {
      jobId: `enrichment:batch:${business.business_id}:${Date.now()}`,
      priority: 10, // Lower priority for batch jobs
      delay: index * 500, // Stagger by 500ms to avoid rate limits
    },
  }))

  const addedJobs = await queue.addBulk(jobs)

  console.log(`[Enrichment Queue] Added ${addedJobs.length} batch jobs`)

  return addedJobs
}

// ============================================================================
// JOB GETTERS
// ============================================================================

/**
 * Get an enrichment job by ID
 */
export async function getEnrichmentJob(
  jobId: string
): Promise<Job<EnrichmentJobData> | null> {
  const queue = getEnrichmentQueue()
  return queue.getJob(jobId)
}

/**
 * Check if a business is already being enriched
 */
export async function isBusinessEnrichmentQueued(
  businessId: string
): Promise<boolean> {
  const queue = getEnrichmentQueue()

  const [active, waiting] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
  ])

  const allJobs = [...active, ...waiting]

  return allJobs.some((job) => job.data.business_id === businessId)
}

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

/**
 * Cancel an enrichment job
 */
export async function cancelEnrichmentJob(jobId: string): Promise<void> {
  const job = await getEnrichmentJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.remove()
  console.log(`[Enrichment Queue] Cancelled job ${jobId}`)
}

/**
 * Retry a failed enrichment job
 */
export async function retryEnrichmentJob(jobId: string): Promise<void> {
  const job = await getEnrichmentJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.retry()
  console.log(`[Enrichment Queue] Retried job ${jobId}`)
}

// ============================================================================
// QUEUE STATS
// ============================================================================

/**
 * Get enrichment queue statistics
 */
export async function getEnrichmentQueueStats() {
  const queue = getEnrichmentQueue()

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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert priority level to Bull priority value (lower number = higher priority)
 */
function getPriorityValue(
  priority: EnrichmentJobData['priority']
): number {
  switch (priority) {
    case 'high':
      return 1
    case 'medium':
      return 5
    case 'low':
      return 10
    default:
      return 5
  }
}

/**
 * Schedule periodic enrichment for a business (e.g., daily refresh)
 */
export async function schedulePeriodicEnrichment(
  data: EnrichmentJobData,
  intervalMs: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): Promise<Job<EnrichmentJobData>> {
  const queue = getEnrichmentQueue()

  const job = await queue.add('enrich', data, {
    repeat: {
      every: intervalMs,
    },
    jobId: `enrichment:periodic:${data.business_id}`,
  })

  console.log(
    `[Enrichment Queue] Scheduled periodic enrichment for ${data.business_name} every ${intervalMs}ms`
  )

  return job
}
