/**
 * Rate Limiting Service Implementation
 * Provides intelligent rate limiting with backoff strategies and per-source limits
 */

import { IRateLimitingService, RateLimitConfig, RateLimitStatus } from '../../core/interfaces'

export class RateLimitingService implements IRateLimitingService {
  private sourceConfigs = new Map<string, RateLimitConfig>()
  private sourceLimits = new Map<string, SourceRateLimit>()
  private readonly defaultConfig: RateLimitConfig = {
    requestsPerSecond: 1,
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    burstLimit: 5,
    backoffMultiplier: 2,
    maxBackoffDelay: 60000,
    timeoutMs: 30000
  }

  constructor(
    private readonly redisClient?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>; incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<void> }
  ) {
    this.initializeDefaultConfigs()
    
    // Clean up expired limits periodically
    setInterval(() => this.cleanupExpiredLimits(), 60000) // Every minute
  }

  async checkLimit(sourceId: string): Promise<RateLimitStatus> {
    const config = this.sourceConfigs.get(sourceId) || this.defaultConfig
    const limit = this.getOrCreateSourceLimit(sourceId, config)
    
    const now = Date.now()
    
    // Check if we're in a backoff period
    if (limit.backoffUntil && now < limit.backoffUntil) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(limit.backoffUntil),
        retryAfter: Math.ceil((limit.backoffUntil - now) / 1000),
        reason: 'backoff_period'
      }
    }

    // Reset backoff if period has passed
    if (limit.backoffUntil && now >= limit.backoffUntil) {
      limit.backoffUntil = null
      limit.consecutiveErrors = 0
      limit.currentBackoffDelay = 0
    }

    // Check burst limit
    if (limit.burstCount >= config.burstLimit) {
      const timeSinceLastBurst = now - limit.lastBurstReset
      if (timeSinceLastBurst < 1000) { // Within 1 second
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: new Date(limit.lastBurstReset + 1000),
          retryAfter: Math.ceil((1000 - timeSinceLastBurst) / 1000),
          reason: 'burst_limit_exceeded'
        }
      } else {
        // Reset burst counter
        limit.burstCount = 0
        limit.lastBurstReset = now
      }
    }

    // Check per-second limit
    const secondWindow = Math.floor(now / 1000)
    if (limit.secondWindow !== secondWindow) {
      limit.secondWindow = secondWindow
      limit.requestsThisSecond = 0
    }

    if (limit.requestsThisSecond >= config.requestsPerSecond) {
      return {
        allowed: false,
        remainingRequests: Math.max(0, config.requestsPerSecond - limit.requestsThisSecond),
        resetTime: new Date((secondWindow + 1) * 1000),
        retryAfter: 1,
        reason: 'per_second_limit_exceeded'
      }
    }

    // Check per-minute limit
    const minuteWindow = Math.floor(now / 60000)
    if (limit.minuteWindow !== minuteWindow) {
      limit.minuteWindow = minuteWindow
      limit.requestsThisMinute = 0
    }

    if (limit.requestsThisMinute >= config.requestsPerMinute) {
      return {
        allowed: false,
        remainingRequests: Math.max(0, config.requestsPerMinute - limit.requestsThisMinute),
        resetTime: new Date((minuteWindow + 1) * 60000),
        retryAfter: Math.ceil(((minuteWindow + 1) * 60000 - now) / 1000),
        reason: 'per_minute_limit_exceeded'
      }
    }

    // Check per-hour limit
    const hourWindow = Math.floor(now / 3600000)
    if (limit.hourWindow !== hourWindow) {
      limit.hourWindow = hourWindow
      limit.requestsThisHour = 0
    }

    if (limit.requestsThisHour >= config.requestsPerHour) {
      return {
        allowed: false,
        remainingRequests: Math.max(0, config.requestsPerHour - limit.requestsThisHour),
        resetTime: new Date((hourWindow + 1) * 3600000),
        retryAfter: Math.ceil(((hourWindow + 1) * 3600000 - now) / 1000),
        reason: 'per_hour_limit_exceeded'
      }
    }

    // Request allowed - update counters
    limit.requestsThisSecond++
    limit.requestsThisMinute++
    limit.requestsThisHour++
    limit.burstCount++
    limit.lastRequestTime = now

    return {
      allowed: true,
      remainingRequests: Math.min(
        config.requestsPerSecond - limit.requestsThisSecond,
        config.requestsPerMinute - limit.requestsThisMinute,
        config.requestsPerHour - limit.requestsThisHour
      ),
      resetTime: new Date(Math.min(
        (secondWindow + 1) * 1000,
        (minuteWindow + 1) * 60000,
        (hourWindow + 1) * 3600000
      )),
      retryAfter: 0,
      reason: 'allowed'
    }
  }

  async recordSuccess(sourceId: string): Promise<void> {
    const limit = this.sourceLimits.get(sourceId)
    if (limit) {
      limit.consecutiveErrors = 0
      limit.lastSuccessTime = Date.now()
      
      // Gradually reduce backoff delay on success
      if (limit.currentBackoffDelay > 0) {
        limit.currentBackoffDelay = Math.max(0, limit.currentBackoffDelay * 0.5)
      }
    }
  }

  async recordError(sourceId: string, error: Error): Promise<void> {
    const config = this.sourceConfigs.get(sourceId) || this.defaultConfig
    const limit = this.getOrCreateSourceLimit(sourceId, config)
    
    limit.consecutiveErrors++
    limit.lastErrorTime = Date.now()
    limit.lastError = error.message

    // Determine if this error should trigger backoff
    const shouldBackoff = this.shouldTriggerBackoff(error, limit.consecutiveErrors)
    
    if (shouldBackoff) {
      // Calculate backoff delay
      if (limit.currentBackoffDelay === 0) {
        limit.currentBackoffDelay = 1000 // Start with 1 second
      } else {
        limit.currentBackoffDelay = Math.min(
          limit.currentBackoffDelay * config.backoffMultiplier,
          config.maxBackoffDelay
        )
      }
      
      limit.backoffUntil = Date.now() + limit.currentBackoffDelay
      
      console.warn(`Rate limiting triggered for ${sourceId}: ${limit.consecutiveErrors} consecutive errors, backing off for ${limit.currentBackoffDelay}ms`)
    }
  }

  async getDelay(sourceId: string): Promise<number> {
    const config = this.sourceConfigs.get(sourceId) || this.defaultConfig
    const limit = this.sourceLimits.get(sourceId)
    
    if (!limit) {
      return 1000 / config.requestsPerSecond // Base delay
    }

    const now = Date.now()
    
    // If in backoff period, return remaining backoff time
    if (limit.backoffUntil && now < limit.backoffUntil) {
      return limit.backoffUntil - now
    }

    // Calculate adaptive delay based on recent performance
    const timeSinceLastRequest = now - limit.lastRequestTime
    const baseDelay = 1000 / config.requestsPerSecond
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 200 // 0-200ms jitter
    
    // Increase delay if we've had recent errors
    const errorMultiplier = Math.min(2, 1 + (limit.consecutiveErrors * 0.1))
    
    return Math.max(0, baseDelay * errorMultiplier - timeSinceLastRequest) + jitter
  }

  async configureSource(sourceId: string, config: RateLimitConfig): Promise<void> {
    this.sourceConfigs.set(sourceId, { ...this.defaultConfig, ...config })
    
    // Reset existing limits to apply new config
    this.sourceLimits.delete(sourceId)
  }

  async getSourceStatus(sourceId: string): Promise<SourceRateLimit | null> {
    return this.sourceLimits.get(sourceId) || null
  }

  async getAllSourceStatus(): Promise<Record<string, SourceRateLimit>> {
    const status: Record<string, SourceRateLimit> = {}
    
    for (const [sourceId, limit] of this.sourceLimits.entries()) {
      status[sourceId] = { ...limit }
    }
    
    return status
  }

  async resetSourceLimits(sourceId: string): Promise<void> {
    this.sourceLimits.delete(sourceId)
  }

  async resetAllLimits(): Promise<void> {
    this.sourceLimits.clear()
  }

  private getOrCreateSourceLimit(sourceId: string, config: RateLimitConfig): SourceRateLimit {
    let limit = this.sourceLimits.get(sourceId)
    
    if (!limit) {
      const now = Date.now()
      limit = {
        sourceId,
        requestsThisSecond: 0,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        burstCount: 0,
        consecutiveErrors: 0,
        currentBackoffDelay: 0,
        secondWindow: Math.floor(now / 1000),
        minuteWindow: Math.floor(now / 60000),
        hourWindow: Math.floor(now / 3600000),
        lastRequestTime: 0,
        lastSuccessTime: 0,
        lastErrorTime: 0,
        lastBurstReset: now,
        backoffUntil: null,
        lastError: null
      }
      
      this.sourceLimits.set(sourceId, limit)
    }
    
    return limit
  }

  private shouldTriggerBackoff(error: Error, consecutiveErrors: number): boolean {
    // Trigger backoff on rate limit errors immediately
    if (error.message.toLowerCase().includes('rate limit') || 
        error.message.toLowerCase().includes('too many requests')) {
      return true
    }
    
    // Trigger backoff on server errors after 3 consecutive failures
    if (error.message.toLowerCase().includes('server error') ||
        error.message.toLowerCase().includes('internal error') ||
        error.message.toLowerCase().includes('503') ||
        error.message.toLowerCase().includes('502')) {
      return consecutiveErrors >= 3
    }
    
    // Trigger backoff on timeout/connection errors after 5 consecutive failures
    if (error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('connection') ||
        error.message.toLowerCase().includes('network')) {
      return consecutiveErrors >= 5
    }
    
    // Generic backoff after 10 consecutive errors
    return consecutiveErrors >= 10
  }

  private initializeDefaultConfigs(): void {
    // Configure known data sources with appropriate limits
    this.configureSource('companies_house', {
      requestsPerSecond: 0.5, // Very conservative for free tier
      requestsPerMinute: 20,
      requestsPerHour: 600,
      burstLimit: 2,
      backoffMultiplier: 2,
      maxBackoffDelay: 300000, // 5 minutes
      timeoutMs: 60000
    })

    this.configureSource('open_corporates', {
      requestsPerSecond: 1,
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      burstLimit: 3,
      backoffMultiplier: 1.5,
      maxBackoffDelay: 120000, // 2 minutes
      timeoutMs: 30000
    })

    this.configureSource('crunchbase', {
      requestsPerSecond: 2,
      requestsPerMinute: 60,
      requestsPerHour: 2000,
      burstLimit: 5,
      backoffMultiplier: 1.5,
      maxBackoffDelay: 60000, // 1 minute
      timeoutMs: 15000
    })
  }

  private cleanupExpiredLimits(): void {
    const now = Date.now()
    const expiredSources: string[] = []
    
    for (const [sourceId, limit] of this.sourceLimits.entries()) {
      // Clean up sources that haven't been used in the last hour
      if (limit.lastRequestTime > 0 && (now - limit.lastRequestTime) > 3600000) {
        expiredSources.push(sourceId)
      }
    }
    
    expiredSources.forEach(sourceId => {
      this.sourceLimits.delete(sourceId)
    })
    
    if (expiredSources.length > 0) {
      console.log(`Cleaned up ${expiredSources.length} expired rate limit sources`)
    }
  }
}

interface SourceRateLimit {
  sourceId: string
  requestsThisSecond: number
  requestsThisMinute: number
  requestsThisHour: number
  burstCount: number
  consecutiveErrors: number
  currentBackoffDelay: number
  secondWindow: number
  minuteWindow: number
  hourWindow: number
  lastRequestTime: number
  lastSuccessTime: number
  lastErrorTime: number
  lastBurstReset: number
  backoffUntil: number | null
  lastError: string | null
}