/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance and prevents cascading failures
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
  expectedErrors?: string[]
  name?: string
}

export class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private successCount = 0
  private readonly metrics = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    lastRequestTime: 0
  }

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++
    this.metrics.lastRequestTime = Date.now()

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
        this.successCount = 0
        console.log(`Circuit breaker ${this.options.name} transitioning to HALF_OPEN`)
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker ${this.options.name} is OPEN. Next attempt in ${this.getTimeUntilNextAttempt()}ms`
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      throw error
    }
  }

  private onSuccess(): void {
    this.metrics.totalSuccesses++
    this.failureCount = 0

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++
      // Require multiple successes before closing
      if (this.successCount >= Math.ceil(this.options.failureThreshold / 2)) {
        this.state = CircuitBreakerState.CLOSED
        console.log(`Circuit breaker ${this.options.name} transitioning to CLOSED`)
      }
    }
  }

  private onFailure(error: Error): void {
    this.metrics.totalFailures++
    this.lastFailureTime = Date.now()

    // Don't count expected errors as failures
    if (this.isExpectedError(error)) {
      return
    }

    this.failureCount++

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN
      console.log(`Circuit breaker ${this.options.name} transitioning to OPEN (failure in HALF_OPEN)`)
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
      console.log(`Circuit breaker ${this.options.name} transitioning to OPEN (threshold reached)`)
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout
  }

  private getTimeUntilNextAttempt(): number {
    return Math.max(0, this.options.resetTimeout - (Date.now() - this.lastFailureTime))
  }

  private isExpectedError(error: Error): boolean {
    if (!this.options.expectedErrors) return false
    
    return this.options.expectedErrors.some(expectedError => 
      error.message.toLowerCase().includes(expectedError.toLowerCase()) ||
      error.constructor.name.toLowerCase().includes(expectedError.toLowerCase())
    )
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now()
    const periodStart = now - this.options.monitoringPeriod
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      totalRequests: this.metrics.totalRequests,
      totalFailures: this.metrics.totalFailures,
      totalSuccesses: this.metrics.totalSuccesses,
      failureRate: this.metrics.totalRequests > 0 
        ? (this.metrics.totalFailures / this.metrics.totalRequests) * 100 
        : 0,
      lastFailureTime: this.lastFailureTime,
      timeUntilNextAttempt: this.state === CircuitBreakerState.OPEN 
        ? this.getTimeUntilNextAttempt() 
        : 0
    }
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    console.log(`Circuit breaker ${this.options.name} manually reset`)
  }
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failureCount: number
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
  failureRate: number
  lastFailureTime: number
  timeUntilNextAttempt: number
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}