/**
 * Job Status API
 * Get the status and progress of background jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllQueues } from '@/lib/queue/queue-manager'
import type { JobStatusResponse } from '@/types/jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to view job status' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    // Search for job across all queues
    const queues = getAllQueues()
    let foundJob = null
    let foundQueue = null

    for (const queue of queues) {
      const job = await queue.getJob(jobId)
      if (job) {
        foundJob = job
        foundQueue = queue.name
        break
      }
    }

    if (!foundJob || !foundQueue) {
      return NextResponse.json(
        { error: 'Job not found', message: `No job found with ID: ${jobId}` },
        { status: 404 }
      )
    }

    // Get job state
    const state = await foundJob.getState()
    const progress = (foundJob.progress() as number) || 0

    // Map Bull state to our JobStatus
    const statusMap: Record<string, string> = {
      waiting: 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused',
    }

    const status = statusMap[state] || 'waiting'

    // Build response
    const response: JobStatusResponse = {
      job: {
        id: foundJob.id as string,
        name: foundJob.name,
        queue: foundQueue,
        status: status as any,
        data: foundJob.data,
        result: foundJob.returnvalue,
        error: foundJob.failedReason,
        progress,
        attempts: foundJob.opts.attempts || 3,
        attemptsMade: foundJob.attemptsMade,
        timestamp: foundJob.timestamp,
        processedOn: foundJob.processedOn || undefined,
        finishedOn: foundJob.finishedOn || undefined,
        failedReason: foundJob.failedReason || undefined,
        stacktrace: foundJob.stacktrace || undefined,
      },
      queue: foundQueue,
      status: status as any,
      progress,
      result: foundJob.returnvalue,
      error: foundJob.failedReason || undefined,
      created_at: new Date(foundJob.timestamp).toISOString(),
      started_at: foundJob.processedOn
        ? new Date(foundJob.processedOn).toISOString()
        : undefined,
      completed_at: foundJob.finishedOn
        ? new Date(foundJob.finishedOn).toISOString()
        : undefined,
      estimated_completion: state === 'active' ? estimateCompletion(foundQueue, progress) : undefined,
      poll_interval_ms: state === 'active' ? 2000 : state === 'waiting' ? 5000 : 10000,
    }

    // Return appropriate status code based on job state
    const httpStatus = state === 'completed' ? 200 : state === 'failed' ? 500 : 202

    return NextResponse.json(response, { status: httpStatus })
  } catch (error) {
    console.error('Job status error:', error)

    return NextResponse.json(
      { error: 'Failed to get job status', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint to cancel a job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to cancel jobs' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    // Search for job across all queues
    const queues = getAllQueues()
    let foundJob = null

    for (const queue of queues) {
      const job = await queue.getJob(jobId)
      if (job) {
        foundJob = job
        break
      }
    }

    if (!foundJob) {
      return NextResponse.json(
        { error: 'Job not found', message: `No job found with ID: ${jobId}` },
        { status: 404 }
      )
    }

    // Verify user owns this job (check user_id in job data)
    if (foundJob.data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to cancel this job' },
        { status: 403 }
      )
    }

    // Cancel the job
    await foundJob.remove()

    return NextResponse.json(
      {
        success: true,
        message: 'Job cancelled successfully',
        job_id: jobId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Job cancellation error:', error)

    return NextResponse.json(
      { error: 'Failed to cancel job', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate completion time based on queue type and progress
 */
function estimateCompletion(queueName: string, progress: number): string {
  // Estimated total time per queue (in seconds)
  const estimatedTimes: Record<string, number> = {
    research: 90, // 1.5 minutes
    enrichment: 30, // 30 seconds
    scoring: 15, // 15 seconds
    'buying-signals': 45, // 45 seconds
  }

  const totalTime = estimatedTimes[queueName] || 60
  const remainingProgress = 100 - progress
  const remainingSeconds = Math.ceil((totalTime * remainingProgress) / 100)

  const completionTime = new Date(Date.now() + remainingSeconds * 1000)
  return completionTime.toISOString()
}
