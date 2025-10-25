/**
 * Redis Client Singleton
 * Provides a shared Redis connection for Bull queues
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  // Get Redis URL from environment
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  // Create Redis client
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for Bull
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET']
      return targetErrors.some((targetError) => err.message.includes(targetError))
    },
  })

  // Connection event handlers
  redisClient.on('connect', () => {
    console.log('[Redis] Connected to Redis server')
  })

  redisClient.on('ready', () => {
    console.log('[Redis] Redis client ready')
  })

  redisClient.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message)
  })

  redisClient.on('close', () => {
    console.log('[Redis] Connection closed')
  })

  redisClient.on('reconnecting', (delay: number) => {
    console.log(`[Redis] Reconnecting in ${delay}ms...`)
  })

  return redisClient
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    console.log('[Redis] Client closed gracefully')
  }
}

/**
 * Health check for Redis connection
 */
export async function isRedisHealthy(): Promise<boolean> {
  if (!redisClient) {
    return false
  }

  try {
    const pong = await redisClient.ping()
    return pong === 'PONG'
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}

/**
 * Get Redis connection info
 */
export function getRedisInfo(): {
  connected: boolean
  url: string
  status: string
} {
  return {
    connected: redisClient?.status === 'ready',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    status: redisClient?.status || 'not_initialized',
  }
}
