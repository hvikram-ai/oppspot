/**
 * Scoring Worker
 * Processes lead scoring calculation jobs from the queue
 */

import { Job } from 'bull'
import { getScoringQueue } from '../queues/scoring-queue'
import type { ScoringJobData, ScoringJobResult } from '@/types/jobs'
import { LeadScoringService } from '@/lib/ai/scoring/lead-scoring-service'
import { createClient } from '@/lib/supabase/server'

/**
 * Process a scoring job
 */
export async function processScoringJob(
  job: Job<ScoringJobData>
): Promise<ScoringJobResult> {
  const startTime = Date.now()

  try {
    console.log(`[Scoring Worker] Starting job ${job.id} for company ${job.data.company_name}`)

    // Update progress
    await job.progress(10)

    // Get supabase client
    const supabase = await createClient()

    // Fetch company data
    const { data: company, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', job.data.company_id)
      .single()

    if (fetchError || !company) {
      throw new Error(`Company not found: ${job.data.company_id}`)
    }

    // Update progress
    await job.progress(20)

    // Create scoring service
    const scoringService = new LeadScoringService()

    // Calculate scores
    console.log(`[Scoring Worker] Calculating scores for ${job.data.company_name}...`)

    const criteria = job.data.scoring_criteria || {
      financial_health: true,
      growth_indicators: true,
      industry_alignment: true,
      technology_fit: true,
      engagement_tracking: true,
      bant_scoring: true,
    }

    await job.progress(40)

    // Calculate overall score
    const scoreResult = await scoringService.calculateScore(
      company as unknown,
      criteria as unknown
    )

    await job.progress(80)

    // Save scores to database
    const scoreResultAny = scoreResult as any
    const scores = scoreResultAny.scores || scoreResult.score_breakdown
    const recommendations = scoreResultAny.recommendations || []
    const confidence = scoreResultAny.confidence || 0.5

    const { error: saveError } = await supabase
      .from('lead_scores')
      .upsert({
        company_id: job.data.company_id,
        overall_score: scoreResult.overall_score,
        scores: scores,
        recommendations: recommendations,
        confidence: confidence,
        calculated_at: new Date().toISOString(),
        user_id: job.data.user_id,
      } as unknown)

    if (saveError) {
      console.error('[Scoring Worker] Failed to save scores:', saveError)
      throw saveError
    }

    await job.progress(100)

    console.log(
      `[Scoring Worker] Scoring completed for ${job.data.company_name} - Score: ${scoreResult.overall_score}`
    )

    return {
      company_id: job.data.company_id,
      overall_score: scoreResult.overall_score,
      scores: scores,
      recommendations: recommendations,
      confidence: confidence,
      calculated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[Scoring Worker] Job ${job.id} failed:`, error)

    return {
      company_id: job.data.company_id,
      overall_score: 0,
      scores: {},
      recommendations: [],
      confidence: 0,
      calculated_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Start the scoring worker
 */
export function startScoringWorker(concurrency: number = 10) {
  const queue = getScoringQueue()

  console.log(`[Scoring Worker] Starting worker with concurrency ${concurrency}`)

  // Process jobs
  queue.process('calculate', concurrency, async (job) => {
    return processScoringJob(job)
  })

  // Event handlers
  queue.on('completed', (job, result: ScoringJobResult) => {
    console.log(
      `[Scoring Worker] Job ${job.id} completed - Score: ${result.overall_score}/100`
    )
  })

  queue.on('failed', (job, error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `[Scoring Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      errorMessage
    )
  })

  queue.on('stalled', (job) => {
    console.warn(`[Scoring Worker] Job ${job.id} stalled, will be retried`)
  })

  queue.on('error', (error) => {
    console.error('[Scoring Worker] Queue error:', error)
  })

  console.log('[Scoring Worker] Worker started and listening for jobs')

  return queue
}

/**
 * Graceful shutdown
 */
export async function stopScoringWorker() {
  const queue = getScoringQueue()
  console.log('[Scoring Worker] Shutting down...')
  await queue.close()
  console.log('[Scoring Worker] Shutdown complete')
}
