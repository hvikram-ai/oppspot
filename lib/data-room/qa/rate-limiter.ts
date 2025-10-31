/**
 * Rate Limiting Service
 * Task: T015
 *
 * Implements Redis-based sliding window rate limiting for Q&A queries.
 * Limits: 60 queries per hour per user per data room (FR-014)
 * Reference: research.md section 6 (rate limiting)
 */

import { getRedisClient } from '@/lib/queue/redis-client';
import type { Redis } from 'ioredis';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;    // Maximum requests per window
  windowMs: number;       // Time window in milliseconds
  keyPrefix?: string;     // Custom key prefix
}

/**
 * Default rate limit: 60 queries per hour per user per data room
 */
export const DEFAULT_QA_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  keyPrefix: 'qa:ratelimit',
};

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;          // Whether the request is allowed
  remaining: number;         // Remaining requests in current window
  limit: number;             // Total limit
  resetAt: Date;             // When the limit resets
  ttl?: number;              // Time to live in seconds (for blocked requests)
  retryAfter?: number;       // Seconds until retry allowed (for blocked requests)
}

/**
 * Rate limit error with retry information
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: Date,
    public retryAfter: number,
    public limit: number
  ) {
    super(message);
    this.name = 'RateLimitError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Generate rate limit key for Redis
 */
function getRateLimitKey(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): string {
  const prefix = config.keyPrefix || 'qa:ratelimit';
  const hour = getCurrentHour();
  return `${prefix}:${userId}:${dataRoomId}:${hour}`;
}

/**
 * Get current hour timestamp (used for key generation)
 * Returns: YYYY-MM-DD-HH format
 */
function getCurrentHour(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

/**
 * Check if user has exceeded rate limit
 *
 * @param userId - User ID
 * @param dataRoomId - Data room ID
 * @param config - Optional rate limit configuration
 * @returns Rate limit check result
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(userId, dataRoomId);
 *
 * if (!result.allowed) {
 *   throw new RateLimitError(
 *     `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
 *     result.resetAt,
 *     result.retryAfter!,
 *     result.limit
 *   );
 * }
 *
 * console.log(`${result.remaining} queries remaining`);
 * ```
 */
export async function checkRateLimit(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = getRateLimitKey(userId, dataRoomId, config);
  const ttlSeconds = Math.ceil(config.windowMs / 1000);

  try {
    // Increment counter atomically
    const currentCount = await redis.incr(key);

    // Set expiry on first request in this window
    if (currentCount === 1) {
      await redis.expire(key, ttlSeconds);
    }

    // Calculate reset time
    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + (ttl * 1000));

    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    if (allowed) {
      return {
        allowed: true,
        remaining,
        limit: config.maxRequests,
        resetAt,
      };
    } else {
      return {
        allowed: false,
        remaining: 0,
        limit: config.maxRequests,
        resetAt,
        ttl,
        retryAfter: ttl,
      };
    }
  } catch (error) {
    // If Redis fails, allow the request but log the error
    console.error('[RateLimiter] Redis error, allowing request:', error);

    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Check rate limit and throw error if exceeded
 * Convenience function for use in API handlers
 */
export async function enforceRateLimit(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<RateLimitResult> {
  const result = await checkRateLimit(userId, dataRoomId, config);

  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. You can make ${result.limit} requests per hour. Try again in ${Math.ceil(result.retryAfter! / 60)} minutes.`,
      result.resetAt,
      result.retryAfter!,
      result.limit
    );
  }

  return result;
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = getRateLimitKey(userId, dataRoomId, config);

  try {
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const ttl = currentCount ? await redis.ttl(key) : config.windowMs / 1000;
    const resetAt = new Date(Date.now() + (ttl * 1000));

    const allowed = count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    return {
      allowed,
      remaining,
      limit: config.maxRequests,
      resetAt,
      ttl: allowed ? undefined : ttl,
      retryAfter: allowed ? undefined : ttl,
    };
  } catch (error) {
    console.error('[RateLimiter] Failed to get status:', error);

    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Reset rate limit for a user/data room
 * Useful for testing or administrative purposes
 */
export async function resetRateLimit(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<void> {
  const redis = getRedisClient();
  const key = getRateLimitKey(userId, dataRoomId, config);

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[RateLimiter] Failed to reset limit:', error);
    throw error;
  }
}

/**
 * Increment rate limit counter without checking
 * Useful for manual tracking or testing
 */
export async function incrementRateLimit(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<number> {
  const redis = getRedisClient();
  const key = getRateLimitKey(userId, dataRoomId, config);
  const ttlSeconds = Math.ceil(config.windowMs / 1000);

  try {
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, ttlSeconds);
    }

    return currentCount;
  } catch (error) {
    console.error('[RateLimiter] Failed to increment:', error);
    throw error;
  }
}

/**
 * Format rate limit error message for display to user
 */
export function formatRateLimitMessage(result: RateLimitResult): string {
  if (result.allowed) {
    return `You have ${result.remaining} of ${result.limit} queries remaining this hour.`;
  }

  const minutesRemaining = Math.ceil(result.retryAfter! / 60);
  const resetTime = result.resetAt.toLocaleTimeString();

  return `Rate limit exceeded. You've used all ${result.limit} queries this hour. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'} (at ${resetTime}).`;
}

/**
 * Get rate limit headers for HTTP responses
 * Follows standard X-RateLimit-* header convention
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetTimestamp = Math.floor(result.resetAt.getTime() / 1000);

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': resetTimestamp.toString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString(),
    }),
  };
}

/**
 * Middleware-friendly rate limiter
 * Returns null if allowed, or error response data if blocked
 */
export async function rateLimitMiddleware(
  userId: string,
  dataRoomId: string,
  config: RateLimitConfig = DEFAULT_QA_RATE_LIMIT
): Promise<null | {
  status: number;
  headers: Record<string, string>;
  body: {
    error: string;
    code: string;
    limit: number;
    resetAt: string;
    retryAfter: number;
  };
}> {
  const result = await checkRateLimit(userId, dataRoomId, config);
  const headers = getRateLimitHeaders(result);

  if (result.allowed) {
    return null;
  }

  return {
    status: 429,
    headers,
    body: {
      error: formatRateLimitMessage(result),
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      resetAt: result.resetAt.toISOString(),
      retryAfter: result.retryAfter!,
    },
  };
}

/**
 * Constants export
 */
export const CONSTANTS = {
  DEFAULT_MAX_REQUESTS: DEFAULT_QA_RATE_LIMIT.maxRequests,
  DEFAULT_WINDOW_MS: DEFAULT_QA_RATE_LIMIT.windowMs,
  DEFAULT_KEY_PREFIX: DEFAULT_QA_RATE_LIMIT.keyPrefix,
} as const;
