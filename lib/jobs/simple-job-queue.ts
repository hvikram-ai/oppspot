import { getErrorMessage } from '@/lib/utils/error-handler'

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface JobState<Result = unknown> {
  id: string
  name: string
  userId?: string
  status: JobStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  result?: Result
}

/**
 * Minimal in-memory job queue to offload long-running tasks.
 * Not suitable for multi-instance deployments; replace with Redis/BullMQ for production.
 */
export class SimpleJobQueue {
  private jobs: Map<string, JobState> = new Map()

  enqueue<Result>(
    name: string,
    userId: string | undefined,
    handler: () => Promise<Result>,
    customId?: string
  ): string {
    const id =
      customId ||
      `${name}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`

    const job: JobState = {
      id,
      name,
      userId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }

    this.jobs.set(id, job)

    setImmediate(async () => {
      const current = this.jobs.get(id)
      if (!current) return

      current.status = 'processing'
      current.startedAt = new Date().toISOString()
      this.jobs.set(id, current)

      try {
        const result = await handler()
        current.status = 'completed'
        current.result = result
      } catch (error) {
        current.status = 'failed'
        current.error = getErrorMessage(error)
      } finally {
        current.completedAt = new Date().toISOString()
        this.jobs.set(id, current)
      }
    })

    return id
  }

  getJob(id: string): JobState | null {
    return this.jobs.get(id) || null
  }

  getJobForUser(id: string, userId?: string): JobState | null {
    const job = this.jobs.get(id)
    if (!job) return null
    if (job.userId && userId && job.userId !== userId) {
      return null
    }
    return job
  }
}

export const simpleJobQueue = new SimpleJobQueue()
