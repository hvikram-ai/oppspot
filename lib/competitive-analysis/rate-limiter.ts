/**
 * Rate Limiter Service
 *
 * Implements rate limiting for expensive operations using in-memory storage.
 * In production, consider using Redis/Upstash for distributed rate limiting.
 *
 * Features:
 * - Sliding window algorithm
 * - Per-user and per-IP rate limiting
 * - Configurable limits per operation type
 * - Automatic cleanup of expired entries
 */

import {
  RATE_LIMIT_REFRESH_PER_HOUR,
  RATE_LIMIT_EXPORT_PER_HOUR,
  RATE_LIMIT_SHARE_PER_HOUR,
  RATE_LIMIT_API_PER_MINUTE,
} from './constants';
import { RateLimitError } from './errors';

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

type RateLimitOperation = 'refresh' | 'export' | 'share' | 'api';

/**
 * In-memory rate limiter using sliding window algorithm
 */
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get rate limit configuration for operation type
   */
  private getLimit(operation: RateLimitOperation): { max: number; windowMs: number } {
    switch (operation) {
      case 'refresh':
        return { max: RATE_LIMIT_REFRESH_PER_HOUR, windowMs: 60 * 60 * 1000 }; // 1 hour
      case 'export':
        return { max: RATE_LIMIT_EXPORT_PER_HOUR, windowMs: 60 * 60 * 1000 }; // 1 hour
      case 'share':
        return { max: RATE_LIMIT_SHARE_PER_HOUR, windowMs: 60 * 60 * 1000 }; // 1 hour
      case 'api':
        return { max: RATE_LIMIT_API_PER_MINUTE, windowMs: 60 * 1000 }; // 1 minute
      default:
        return { max: 100, windowMs: 60 * 1000 }; // Default: 100/minute
    }
  }

  /**
   * Generate rate limit key
   */
  private getKey(operation: RateLimitOperation, identifier: string): string {
    return `${operation}:${identifier}`;
  }

  /**
   * Check if request is allowed and update rate limit counter
   * @throws RateLimitError if limit exceeded
   */
  async checkLimit(operation: RateLimitOperation, identifier: string): Promise<void> {
    const key = this.getKey(operation, identifier);
    const { max, windowMs } = this.getLimit(operation);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create entry
    let entry = this.limits.get(key);
    if (!entry) {
      entry = { timestamps: [], lastCleanup: now };
      this.limits.set(key, entry);
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (entry.timestamps.length >= max) {
      const oldestTimestamp = entry.timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      throw new RateLimitError(retryAfter, operation);
    }

    // Add current timestamp
    entry.timestamps.push(now);
    entry.lastCleanup = now;
  }

  /**
   * Get current usage for an identifier
   */
  async getUsage(
    operation: RateLimitOperation,
    identifier: string
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetAt: Date;
  }> {
    const key = this.getKey(operation, identifier);
    const { max, windowMs } = this.getLimit(operation);
    const now = Date.now();
    const windowStart = now - windowMs;

    const entry = this.limits.get(key);
    if (!entry) {
      return {
        current: 0,
        limit: max,
        remaining: max,
        resetAt: new Date(now + windowMs),
      };
    }

    // Filter to current window
    const currentTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
    const current = currentTimestamps.length;
    const remaining = Math.max(0, max - current);

    // Calculate reset time (when oldest timestamp expires)
    const oldestTimestamp = currentTimestamps[0] || now;
    const resetAt = new Date(oldestTimestamp + windowMs);

    return {
      current,
      limit: max,
      remaining,
      resetAt,
    };
  }

  /**
   * Reset rate limit for a specific identifier (admin use only)
   */
  async reset(operation: RateLimitOperation, identifier: string): Promise<void> {
    const key = this.getKey(operation, identifier);
    this.limits.delete(key);
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.lastCleanup > maxAge) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Middleware-style wrapper for rate limiting
 * Use this in API routes to automatically enforce rate limits
 */
export async function withRateLimit<T>(
  operation: RateLimitOperation,
  identifier: string,
  handler: () => Promise<T>
): Promise<T> {
  await rateLimiter.checkLimit(operation, identifier);
  return handler();
}

/**
 * Get rate limit headers for HTTP responses
 */
export async function getRateLimitHeaders(
  operation: RateLimitOperation,
  identifier: string
): Promise<Record<string, string>> {
  const usage = await rateLimiter.getUsage(operation, identifier);

  return {
    'X-RateLimit-Limit': usage.limit.toString(),
    'X-RateLimit-Remaining': usage.remaining.toString(),
    'X-RateLimit-Reset': usage.resetAt.toISOString(),
  };
}
