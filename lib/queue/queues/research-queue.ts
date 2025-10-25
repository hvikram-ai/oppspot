/**
 * Research Queue
 * Handles AI-powered research generation jobs
 */

import { Job } from 'bull'
import { getQueue, QUEUE_NAMES } from '../queue-manager'

// ============================================================================
// JOB DATA TYPES
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
// QUEUE INSTANCE
// ============================================================================

/**
 * Get the research queue instance
 */
export function getResearchQueue() {
  return getQueue(QUEUE_NAMES.RESEARCH)
}

// ============================================================================
// JOB PRODUCERS
// ============================================================================

/**
 * Add a research generation job to the queue
 */
export async function addResearchJob(
  data: ResearchJobData,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<Job<ResearchJobData>> {
  const queue = getResearchQueue()

  const job = await queue.add('generate', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId || `research:${data.company_id}:${Date.now()}`,
    attempts: data.force_refresh ? 1 : 2, // Don't retry forced refreshes as much
  })

  console.log(
    `[Research Queue] Added job ${job.id} for company ${data.company_name}`
  )

  return job
}

/**
 * Add a batch of research jobs
 */
export async function addBatchResearchJobs(
  companies: Array<{
    user_id: string
    company_id: string
    company_name: string
    company_number?: string
    website_url?: string
  }>
): Promise<Job<ResearchJobData>[]> {
  const queue = getResearchQueue()

  const jobs = companies.map((company, index) => ({
    name: 'generate',
    data: {
      ...company,
      force_refresh: false,
    },
    opts: {
      jobId: `research:batch:${company.company_id}:${Date.now()}`,
      priority: 5, // Lower priority for batch jobs
      delay: index * 1000, // Stagger by 1 second to avoid rate limits
    },
  }))

  const addedJobs = await queue.addBulk(jobs)

  console.log(`[Research Queue] Added ${addedJobs.length} batch jobs`)

  return addedJobs
}

// ============================================================================
// JOB GETTERS
// ============================================================================

/**
 * Get a research job by ID
 */
export async function getResearchJob(
  jobId: string
): Promise<Job<ResearchJobData> | null> {
  const queue = getResearchQueue()
  return queue.getJob(jobId)
}

/**
 * Get all active research jobs for a user
 */
export async function getUserResearchJobs(
  userId: string
): Promise<Job<ResearchJobData>[]> {
  const queue = getResearchQueue()

  const [active, waiting, delayed] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
    queue.getDelayed(),
  ])

  const allJobs = [...active, ...waiting, ...delayed]

  return allJobs.filter((job) => job.data.user_id === userId)
}

/**
 * Check if a company research job is already queued or processing
 */
export async function isCompanyResearchQueued(
  companyId: string
): Promise<boolean> {
  const queue = getResearchQueue()

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
 * Cancel a research job
 */
export async function cancelResearchJob(jobId: string): Promise<void> {
  const job = await getResearchJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.remove()
  console.log(`[Research Queue] Cancelled job ${jobId}`)
}

/**
 * Retry a failed research job
 */
export async function retryResearchJob(jobId: string): Promise<void> {
  const job = await getResearchJob(jobId)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await job.retry()
  console.log(`[Research Queue] Retried job ${jobId}`)
}

/**
 * Get job progress (0-100)
 */
export async function getResearchJobProgress(
  jobId: string
): Promise<number | null> {
  const job = await getResearchJob(jobId)

  if (!job) {
    return null
  }

  // Bull stores progress as a number 0-100
  return job.progress() as number
}

/**
 * Update job progress
 */
export async function updateResearchJobProgress(
  job: Job<ResearchJobData>,
  progress: number
): Promise<void> {
  await job.progress(progress)
}

// ============================================================================
// QUEUE STATS
// ============================================================================

/**
 * Get research queue statistics
 */
export async function getResearchQueueStats() {
  const queue = getResearchQueue()

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
