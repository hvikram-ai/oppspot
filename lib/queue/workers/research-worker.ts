/**
 * Research Worker
 * Processes research generation jobs from the queue
 */

import { Job } from 'bull'
import { getResearchQueue, updateResearchJobProgress } from '../queues/research-queue'
import type { ResearchJobData, ResearchJobResult } from '@/types/jobs'
import { getResearchGPTService } from '@/lib/research-gpt/research-gpt-service'
import { createTeamNotificationService } from '@/lib/collaboration/team-notifications'

/**
 * Process a research generation job
 */
export async function processResearchJob(
  job: Job<ResearchJobData>
): Promise<ResearchJobResult> {
  const startTime = Date.now()

  try {
    console.log(`[Research Worker] Starting job ${job.id} for company ${job.data.company_name}`)

    // Update progress: Starting
    await updateResearchJobProgress(job, 10)

    // Get research service
    const service = getResearchGPTService()

    // Update progress: Service initialized
    await updateResearchJobProgress(job, 20)

    // Generate research
    console.log(`[Research Worker] Generating research for ${job.data.company_name}...`)
    const report = await service.generateResearch({
      user_id: job.data.user_id,
      company_id: job.data.company_id,
      company_name: job.data.company_name,
      company_number: job.data.company_number ?? null,
      website_url: job.data.website_url,
      force_refresh: job.data.force_refresh,
      user_context: job.data.user_context,
      focus_areas: job.data.focus_areas,
    })

    // Update progress: Research complete
    await updateResearchJobProgress(job, 90)

    console.log(`[Research Worker] Research completed for ${job.data.company_name}`)

    // Send team notification
    try {
      const notifier = await createTeamNotificationService()
      if (notifier) {
        await notifier.notifyResearchComplete(
          job.data.company_id,
          job.data.company_name,
          report.id
        )
      }
    } catch (notifyError) {
      console.error('[Research Worker] Failed to send team notification:', notifyError)
      // Don't fail the job if notification fails
    }

    // Update progress: Done
    await updateResearchJobProgress(job, 100)

    const generationTime = Date.now() - startTime

    return {
      report_id: report.id,
      status: 'complete',
      sections_complete: report.sections_complete,
      total_sources: report.total_sources,
      confidence_score: report.confidence_score ?? undefined,
      generation_time_ms: generationTime,
    }
  } catch (error) {
    console.error(`[Research Worker] Job ${job.id} failed:`, error)

    return {
      report_id: '',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      generation_time_ms: Date.now() - startTime,
    }
  }
}

/**
 * Start the research worker
 */
export function startResearchWorker(concurrency: number = 2) {
  const queue = getResearchQueue()

  console.log(`[Research Worker] Starting worker with concurrency ${concurrency}`)

  // Process jobs
  queue.process('generate', concurrency, async (job) => {
    return processResearchJob(job)
  })

  // Event handlers
  queue.on('completed', (job, result: ResearchJobResult) => {
    console.log(
      `[Research Worker] Job ${job.id} completed - Report ID: ${result.report_id} (${result.generation_time_ms}ms)`
    )
  })

  queue.on('failed', (job, error) => {
    console.error(
      `[Research Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      error.message
    )
  })

  queue.on('stalled', (job) => {
    console.warn(`[Research Worker] Job ${job.id} stalled, will be retried`)
  })

  queue.on('error', (error) => {
    console.error('[Research Worker] Queue error:', error)
  })

  console.log('[Research Worker] Worker started and listening for jobs')

  return queue
}

/**
 * Graceful shutdown
 */
export async function stopResearchWorker() {
  const queue = getResearchQueue()
  console.log('[Research Worker] Shutting down...')
  await queue.close()
  console.log('[Research Worker] Shutdown complete')
}
