/**
 * Bull Queue Manager
 * Central manager for all Bull queues
 */

import Queue, { JobOptions } from 'bull'
import { getRedisClient } from './redis-client'

// Queue names
export const QUEUE_NAMES = {
  RESEARCH: 'research',
  ENRICHMENT: 'enrichment',
  SCORING: 'scoring',
  SIGNALS: 'buying-signals',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// Queue instances cache
const queues = new Map<QueueName, Queue.Queue>()

/**
 * Default job options for all queues
 */
const defaultJobOptions: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
}

/**
 * Queue-specific configurations
 */
const queueConfigs: Record<QueueName, JobOptions> = {
  [QUEUE_NAMES.RESEARCH]: {
    ...defaultJobOptions,
    timeout: 180000, // 3 minutes (AI research generation)
    attempts: 2, // Expensive operation, fewer retries
    priority: 1,
  },
  [QUEUE_NAMES.ENRICHMENT]: {
    ...defaultJobOptions,
    timeout: 60000, // 1 minute (API calls)
    attempts: 3,
    priority: 2,
  },
  [QUEUE_NAMES.SCORING]: {
    ...defaultJobOptions,
    timeout: 30000, // 30 seconds (calculation)
    attempts: 3,
    priority: 3,
  },
  [QUEUE_NAMES.SIGNALS]: {
    ...defaultJobOptions,
    timeout: 60000, // 1 minute (detection logic)
    attempts: 3,
    priority: 2,
  },
}

/**
 * Get or create a Bull queue by name
 */
export function getQueue(name: QueueName): Queue.Queue {
  // Return cached queue if exists
  if (queues.has(name)) {
    return queues.get(name)!
  }

  // Create new queue
  const redis = getRedisClient()
  const queue = new Queue(name, {
    createClient: (type) => {
      switch (type) {
        case 'client':
          return redis
        case 'subscriber':
          return redis.duplicate()
        case 'bclient':
          return redis.duplicate()
        default:
          return redis
      }
    },
    defaultJobOptions: queueConfigs[name],
  })

  // Queue event handlers
  queue.on('error', (error: Error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Queue:${name}] Error:`, errorMessage)
  })

  queue.on('waiting', (jobId: string) => {
    console.log(`[Queue:${name}] Job ${jobId} is waiting`)
  })

  queue.on('active', (job: Queue.Job) => {
    console.log(`[Queue:${name}] Job ${job.id} started processing`)
  })

  queue.on('completed', (job: Queue.Job, result: unknown) => {
    console.log(`[Queue:${name}] Job ${job.id} completed`)
  })

  queue.on('failed', (job: Queue.Job | undefined, error: Error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Queue:${name}] Job ${job?.id} failed:`, errorMessage)
  })

  queue.on('stalled', (job: Queue.Job) => {
    console.warn(`[Queue:${name}] Job ${job.id} stalled`)
  })

  // Cache queue
  queues.set(name, queue)

  return queue
}

/**
 * Get all queues (for Bull Board dashboard)
 */
export function getAllQueues(): Queue.Queue[] {
  return [
    getQueue(QUEUE_NAMES.RESEARCH),
    getQueue(QUEUE_NAMES.ENRICHMENT),
    getQueue(QUEUE_NAMES.SCORING),
    getQueue(QUEUE_NAMES.SIGNALS),
  ]
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  console.log('[Queue Manager] Closing all queues...')

  const closePromises = Array.from(queues.values()).map((queue) =>
    queue.close()
  )

  await Promise.all(closePromises)
  queues.clear()

  console.log('[Queue Manager] All queues closed')
}

/**
 * Get queue statistics
 */
export async function getQueueStats(name: QueueName) {
  const queue = getQueue(name)

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ])

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed + paused,
  }
}

/**
 * Get health status of all queues
 */
export async function getQueuesHealth() {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name))
  )

  return {
    healthy: stats.every((s) => s.failed < s.completed * 0.1), // <10% failure rate
    queues: stats,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Pause a queue
 */
export async function pauseQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name)
  await queue.pause()
  console.log(`[Queue Manager] Queue ${name} paused`)
}

/**
 * Resume a queue
 */
export async function resumeQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name)
  await queue.resume()
  console.log(`[Queue Manager] Queue ${name} resumed`)
}

/**
 * Clear a queue (remove all jobs)
 */
export async function clearQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name)
  await queue.empty()
  console.log(`[Queue Manager] Queue ${name} cleared`)
}

/**
 * Drain a queue (wait for all jobs to complete then pause)
 */
export async function drainQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name) as unknown as { drain: () => Promise<void> }
  await queue.drain()
  console.log(`[Queue Manager] Queue ${name} drained`)
}
