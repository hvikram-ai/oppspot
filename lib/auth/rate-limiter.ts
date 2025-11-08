/**
 * Rate Limiter for Authentication Endpoints
 * Prevents abuse of magic link and OTP sending
 *
 * Uses in-memory store for development, can be upgraded to Redis for production
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (replace with Redis/Upstash in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds until next attempt allowed
}

/**
 * Check if an action is rate limited
 */
export async function checkRateLimit(
  identifier: string, // email or IP address
  config: RateLimitConfig = {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes default
  }
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Get or create entry
  let entry = rateLimitStore.get(key);

  // Clean up expired entry
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(key);
    entry = undefined;
  }

  // Create new entry if needed
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const key = `ratelimit:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries periodically
 */
export function startRateLimitCleanup(intervalMs: number = 60000) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, intervalMs);
}

// Auto-start cleanup in Node environment
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  startRateLimitCleanup();
}
