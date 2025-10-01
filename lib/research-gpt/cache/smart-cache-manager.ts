/**
 * Smart Cache Manager for ResearchGPT™
 *
 * Implements differential TTL caching:
 * - Company fundamentals (snapshot): 7 days
 * - Buying signals: 6 hours
 *
 * Reduces API costs while maintaining data freshness for time-sensitive signals.
 */

import { SectionType, CacheMetadata } from '@/types/research-gpt';

// ============================================================================
// CACHE TTL CONSTANTS
// ============================================================================

const CACHE_TTL = {
  // Static company data (rarely changes)
  SNAPSHOT: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  // Dynamic signals (time-sensitive)
  BUYING_SIGNALS: 6 * 60 * 60 * 1000, // 6 hours
  DECISION_MAKERS: 6 * 60 * 60 * 1000, // 6 hours
  REVENUE_SIGNALS: 6 * 60 * 60 * 1000, // 6 hours
  RECOMMENDED_APPROACH: 6 * 60 * 60 * 1000, // 6 hours
  SOURCES: 6 * 60 * 60 * 1000, // 6 hours
} as const;

// ============================================================================
// CACHE EXPIRATION CALCULATION
// ============================================================================

/**
 * Calculate cache expiration timestamp based on section type
 *
 * @param sectionType - Type of research section
 * @param baseTimestamp - Base timestamp (defaults to now)
 * @returns ISO timestamp when cache expires
 */
export function calculateCacheExpiration(
  sectionType: SectionType,
  baseTimestamp: Date = new Date()
): string {
  const ttl = getCacheTTL(sectionType);
  const expiresAt = new Date(baseTimestamp.getTime() + ttl);
  return expiresAt.toISOString();
}

/**
 * Get TTL duration in milliseconds for a section type
 *
 * @param sectionType - Type of research section
 * @returns TTL in milliseconds
 */
export function getCacheTTL(sectionType: SectionType): number {
  switch (sectionType) {
    case 'snapshot':
      return CACHE_TTL.SNAPSHOT;
    case 'buying_signals':
      return CACHE_TTL.BUYING_SIGNALS;
    case 'decision_makers':
      return CACHE_TTL.DECISION_MAKERS;
    case 'revenue_signals':
      return CACHE_TTL.REVENUE_SIGNALS;
    case 'recommended_approach':
      return CACHE_TTL.RECOMMENDED_APPROACH;
    case 'sources':
      return CACHE_TTL.SOURCES;
    default:
      // Default to 6 hours for unknown sections
      return CACHE_TTL.BUYING_SIGNALS;
  }
}

/**
 * Get human-readable TTL description
 *
 * @param sectionType - Type of research section
 * @returns Human-readable duration (e.g., "7 days", "6 hours")
 */
export function getCacheTTLDescription(sectionType: SectionType): string {
  const ttl = getCacheTTL(sectionType);
  const hours = ttl / (60 * 60 * 1000);
  const days = hours / 24;

  if (days >= 1) {
    return `${Math.floor(days)} day${Math.floor(days) > 1 ? 's' : ''}`;
  }
  return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''}`;
}

// ============================================================================
// CACHE VALIDITY CHECKING
// ============================================================================

/**
 * Check if cached data is still valid
 *
 * @param cachedAt - When data was cached (ISO string)
 * @param expiresAt - When cache expires (ISO string)
 * @returns true if cache is still valid
 */
export function isCacheValid(
  cachedAt: string | Date,
  expiresAt: string | Date
): boolean {
  const now = new Date();
  const expiration = new Date(expiresAt);

  // Check if expiration is in the future
  return expiration > now;
}

/**
 * Check if cache needs refresh based on age threshold
 * Useful for "stale-while-revalidate" pattern
 *
 * @param cachedAt - When data was cached
 * @param threshold - Age threshold (0-1, where 1 = full TTL)
 * @param sectionType - Type of section to determine TTL
 * @returns true if cache age exceeds threshold
 */
export function shouldRefreshCache(
  cachedAt: string | Date,
  threshold: number,
  sectionType: SectionType
): boolean {
  const now = new Date();
  const cached = new Date(cachedAt);
  const ageMs = now.getTime() - cached.getTime();
  const ttlMs = getCacheTTL(sectionType);

  return ageMs > ttlMs * threshold;
}

/**
 * Get cache metadata for display
 *
 * @param cachedAt - When data was cached
 * @param expiresAt - When cache expires
 * @returns Cache metadata object
 */
export function getCacheMetadata(
  cachedAt: string | Date,
  expiresAt: string | Date
): CacheMetadata {
  const now = new Date();
  const cached = new Date(cachedAt);
  const expires = new Date(expiresAt);

  const ageMs = now.getTime() - cached.getTime();
  const ttlMs = expires.getTime() - cached.getTime();
  const isValid = expires > now;

  return {
    cached_at: cached.toISOString(),
    expires_at: expires.toISOString(),
    is_valid: isValid,
    age_ms: ageMs,
    ttl_ms: ttlMs,
  };
}

// ============================================================================
// CACHE AGE FORMATTING
// ============================================================================

/**
 * Format cache age for user-friendly display
 * Examples: "2 minutes ago", "3 hours ago", "2 days ago"
 *
 * @param cachedAt - When data was cached
 * @returns Human-readable age string
 */
export function formatCacheAge(cachedAt: string | Date): string {
  const now = new Date();
  const cached = new Date(cachedAt);
  const ageMs = now.getTime() - cached.getTime();

  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Format remaining cache lifetime
 * Examples: "5 hours remaining", "2 days remaining", "expired"
 *
 * @param expiresAt - When cache expires
 * @returns Human-readable time remaining
 */
export function formatCacheRemaining(expiresAt: string | Date): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const remainingMs = expires.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 'expired';
  }

  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
  return 'expires soon';
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Calculate if cache should be invalidated based on force refresh
 *
 * @param forceRefresh - User requested force refresh
 * @param cachedAt - When data was cached
 * @param expiresAt - When cache expires
 * @returns true if cache should be invalidated
 */
export function shouldInvalidateCache(
  forceRefresh: boolean,
  cachedAt: string | Date,
  expiresAt: string | Date
): boolean {
  // Always invalidate if force refresh requested
  if (forceRefresh) {
    return true;
  }

  // Check if cache has expired
  return !isCacheValid(cachedAt, expiresAt);
}

/**
 * Get cache invalidation reasons
 * Used for logging and debugging
 *
 * @param forceRefresh - User requested force refresh
 * @param cachedAt - When data was cached
 * @param expiresAt - When cache expires
 * @returns Array of invalidation reasons
 */
export function getCacheInvalidationReasons(
  forceRefresh: boolean,
  cachedAt: string | Date,
  expiresAt: string | Date
): string[] {
  const reasons: string[] = [];

  if (forceRefresh) {
    reasons.push('User requested force refresh');
  }

  if (!isCacheValid(cachedAt, expiresAt)) {
    reasons.push(`Cache expired (cached ${formatCacheAge(cachedAt)})`);
  }

  return reasons;
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Calculate cache hit/miss rate
 * Used for monitoring and optimization
 */
export interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number; // 0-1
  average_age_ms: number;
}

/**
 * Calculate cache statistics from metadata
 *
 * @param requests - Array of request metadata with cache_hit flag
 * @returns Cache statistics object
 */
export function calculateCacheStats(
  requests: Array<{ cache_hit: boolean; cache_age_ms?: number }>
): CacheStats {
  const totalRequests = requests.length;
  const cacheHits = requests.filter((r) => r.cache_hit).length;
  const cacheMisses = totalRequests - cacheHits;
  const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

  const ages = requests
    .filter((r) => r.cache_hit && r.cache_age_ms !== undefined)
    .map((r) => r.cache_age_ms!);

  const averageAgeMs = ages.length > 0
    ? ages.reduce((sum, age) => sum + age, 0) / ages.length
    : 0;

  return {
    total_requests: totalRequests,
    cache_hits: cacheHits,
    cache_misses: cacheMisses,
    hit_rate: hitRate,
    average_age_ms: averageAgeMs,
  };
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate cache key for a company research request
 * Used for external caching systems (Redis, etc.)
 *
 * @param companyId - Company UUID
 * @param sectionType - Optional specific section
 * @returns Cache key string
 */
export function generateCacheKey(
  companyId: string,
  sectionType?: SectionType
): string {
  const base = `research:${companyId}`;
  return sectionType ? `${base}:${sectionType}` : base;
}

/**
 * Parse cache key back into components
 *
 * @param cacheKey - Cache key string
 * @returns Parsed components or null if invalid
 */
export function parseCacheKey(cacheKey: string): {
  companyId: string;
  sectionType?: SectionType;
} | null {
  const parts = cacheKey.split(':');

  if (parts[0] !== 'research' || parts.length < 2) {
    return null;
  }

  return {
    companyId: parts[1],
    sectionType: parts[2] as SectionType | undefined,
  };
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const SmartCacheManager = {
  // TTL utilities
  calculateCacheExpiration,
  getCacheTTL,
  getCacheTTLDescription,

  // Validity checking
  isCacheValid,
  shouldRefreshCache,
  getCacheMetadata,

  // Formatting
  formatCacheAge,
  formatCacheRemaining,

  // Invalidation
  shouldInvalidateCache,
  getCacheInvalidationReasons,

  // Statistics
  calculateCacheStats,

  // Cache keys
  generateCacheKey,
  parseCacheKey,

  // Constants
  CACHE_TTL,
} as const;

export default SmartCacheManager;
