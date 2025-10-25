/**
 * Signals Worker
 * Processes buying signal detection jobs from the queue
 */

import { Job } from 'bull'
import { getSignalsQueue } from '../queues/signals-queue'
import type { SignalsJobData, SignalsJobResult } from '@/types/jobs'
import { BuyingSignalDetector } from '@/lib/signals/buying-signal-detector'
import { createClient } from '@/lib/supabase/server'
import { createTeamNotificationService } from '@/lib/collaboration/team-notifications'

/**
 * Process a signals detection job
 */
export async function processSignalsJob(
  job: Job<SignalsJobData>
): Promise<SignalsJobResult> {
  const startTime = Date.now()

  try {
    console.log(`[Signals Worker] Starting job ${job.id} for company ${job.data.company_name}`)

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

    // Create signal detector
    const detector = new BuyingSignalDetector()

    // Detect signals
    console.log(`[Signals Worker] Detecting signals for ${job.data.company_name}...`)

    const lookbackDays = job.data.lookback_days || 30
    const signalTypes = job.data.signal_types || [
      'funding',
      'expansion',
      'hiring',
      'technology_adoption',
      'executive_change',
      'financial_event',
    ]

    await job.progress(40)

    const detectedSignals = await detector.detectSignals(job.data.company_id)

    await job.progress(70)

    // Save signals to database
    const signalsToSave = detectedSignals.map((signal) => {
      const signalAny = signal as any
      const confidence = signalAny.confidence || signalAny.confidence_score || 0.5
      return {
        company_id: job.data.company_id,
        signal_type: signal.signal_type,
        confidence: confidence,
        description: signal.description,
        source: signal.source,
        detected_at: signal.detected_at,
        status: 'active' as const,
        user_id: job.data.user_id,
      }
    })

    if (signalsToSave.length > 0) {
      const { error: saveError } = await supabase
        .from('buying_signals')
        .upsert(signalsToSave as unknown)

      if (saveError) {
        console.error('[Signals Worker] Failed to save signals:', saveError)
        // Continue even if save fails
      }
    }

    await job.progress(90)

    // Send notifications for high-confidence signals
    const highConfidenceSignals = detectedSignals.filter((s) => {
      const signalAny = s as any
      const confidence = signalAny.confidence || signalAny.confidence_score || 0
      return confidence >= 0.8
    })

    if (highConfidenceSignals.length > 0) {
      try {
        const notifier = await createTeamNotificationService()
        if (notifier) {
          for (const signal of highConfidenceSignals) {
            const signalAny = signal as any
            const confidence = signalAny.confidence || signalAny.confidence_score || 0
            await notifier.notifyBuyingSignal(
              job.data.company_id,
              job.data.company_name,
              signal.signal_type,
              signal.description ?? '',
              confidence >= 0.9 ? 'urgent' : 'high'
            )
          }
        }
      } catch (notifyError) {
        console.error('[Signals Worker] Failed to send notifications:', notifyError)
        // Don't fail the job if notifications fail
      }
    }

    await job.progress(100)

    console.log(
      `[Signals Worker] Signal detection completed for ${job.data.company_name} - Found ${detectedSignals.length} signals (${highConfidenceSignals.length} high-confidence)`
    )

    const processingTime = Date.now() - startTime

    return {
      company_id: job.data.company_id,
      signals_detected: detectedSignals.length,
      signals: detectedSignals.map(s => {
        const signalAny = s as any
        const confidence = signalAny.confidence || signalAny.confidence_score || 0
        return {
          signal_type: s.signal_type,
          confidence: confidence,
          description: s.description ?? '',
          source: s.source,
          detected_at: s.detected_at.toISOString(),
        }
      }),
      high_confidence_signals: highConfidenceSignals.length,
      status: 'complete',
      processing_time_ms: processingTime,
    }
  } catch (error) {
    console.error(`[Signals Worker] Job ${job.id} failed:`, error)

    return {
      company_id: job.data.company_id,
      signals_detected: 0,
      signals: [],
      high_confidence_signals: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: Date.now() - startTime,
    }
  }
}

/**
 * Start the signals worker
 */
export function startSignalsWorker(concurrency: number = 5) {
  const queue = getSignalsQueue()

  console.log(`[Signals Worker] Starting worker with concurrency ${concurrency}`)

  // Process jobs
  queue.process('detect', concurrency, async (job) => {
    return processSignalsJob(job)
  })

  // Event handlers
  queue.on('completed', (job, result: SignalsJobResult) => {
    console.log(
      `[Signals Worker] Job ${job.id} completed - Found ${result.signals_detected} signals (${result.processing_time_ms}ms)`
    )
  })

  queue.on('failed', (job, error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `[Signals Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      errorMessage
    )
  })

  queue.on('stalled', (job) => {
    console.warn(`[Signals Worker] Job ${job.id} stalled, will be retried`)
  })

  queue.on('error', (error) => {
    console.error('[Signals Worker] Queue error:', error)
  })

  console.log('[Signals Worker] Worker started and listening for jobs')

  return queue
}

/**
 * Graceful shutdown
 */
export async function stopSignalsWorker() {
  const queue = getSignalsQueue()
  console.log('[Signals Worker] Shutting down...')
  await queue.close()
  console.log('[Signals Worker] Shutdown complete')
}
