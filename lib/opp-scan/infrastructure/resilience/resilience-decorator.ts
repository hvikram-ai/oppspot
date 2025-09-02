/**
 * Resilience Decorator
 * Combines multiple resilience patterns (circuit breaker, retry, timeout) into a single decorator
 */

import { CircuitBreaker, CircuitBreakerOptions, CircuitBreakerOpenError } from './circuit-breaker'
import { RetryPolicy, RetryOptions, RetryExhaustedError } from './retry-policy'

export interface ResilienceOptions {
  circuitBreaker?: CircuitBreakerOptions
  retry?: RetryOptions
  timeout?: number
  name?: string
  onError?: (error: Error, context: ResilienceContext) => void | Promise<void>
  onSuccess?: (result: any, context: ResilienceContext) => void | Promise<void>
}

export interface ResilienceContext {
  operationName: string
  attempt: number
  startTime: number
  circuitBreakerState?: string
  totalAttempts?: number
}

export class ResilienceDecorator {
  private readonly circuitBreaker?: CircuitBreaker
  private readonly retryPolicy?: RetryPolicy
  private readonly timeout: number
  private readonly name: string

  constructor(private readonly options: ResilienceOptions) {
    this.name = options.name || 'UnnamedOperation'
    this.timeout = options.timeout || 30000

    if (options.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        ...options.circuitBreaker,
        name: this.name
      })
    }

    if (options.retry) {
      this.retryPolicy = new RetryPolicy(options.retry)
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    let totalAttempts = 0

    const executeWithResilience = async (): Promise<T> => {
      totalAttempts++
      const context: ResilienceContext = {
        operationName: this.name,
        attempt: totalAttempts,
        startTime,
        circuitBreakerState: this.circuitBreaker?.getState(),
        totalAttempts
      }

      try {
        // Apply timeout wrapper
        const result = await this.executeWithTimeout(operation)
        
        // Call success callback
        if (this.options.onSuccess) {
          await this.options.onSuccess(result, context)
        }
        
        return result
      } catch (error) {
        // Call error callback
        if (this.options.onError) {
          await this.options.onError(error as Error, context)
        }
        
        throw error
      }
    }

    try {
      // Apply circuit breaker if configured
      if (this.circuitBreaker) {
        // Apply retry policy if configured
        if (this.retryPolicy) {
          return await this.retryPolicy.execute(() => 
            this.circuitBreaker!.execute(executeWithResilience)
          )
        } else {
          return await this.circuitBreaker.execute(executeWithResilience)
        }
      } else if (this.retryPolicy) {
        // Retry only (no circuit breaker)
        return await this.retryPolicy.execute(executeWithResilience)
      } else {
        // Just timeout (no retry or circuit breaker)
        return await executeWithResilience()
      }
    } catch (error) {
      // Enrich error with resilience context
      throw this.enrichError(error as Error, totalAttempts, Date.now() - startTime)
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Operation ${this.name} timed out after ${this.timeout}ms`))
      }, this.timeout)

      operation()
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  private enrichError(error: Error, totalAttempts: number, totalDuration: number): Error {
    if (error instanceof ResilienceError) {
      return error // Already enriched
    }

    if (error instanceof CircuitBreakerOpenError) {
      return new ResilienceError(
        'CircuitBreakerOpen',
        error.message,
        error,
        {
          operationName: this.name,
          totalAttempts,
          totalDuration,
          circuitBreakerState: this.circuitBreaker?.getState()
        }
      )
    }

    if (error instanceof RetryExhaustedError) {
      return new ResilienceError(
        'RetryExhausted',
        error.message,
        error,
        {
          operationName: this.name,
          totalAttempts,
          totalDuration,
          originalError: error.originalError.message
        }
      )
    }

    if (error instanceof TimeoutError) {
      return new ResilienceError(
        'Timeout',
        error.message,
        error,
        {
          operationName: this.name,
          totalAttempts,
          totalDuration,
          timeoutMs: this.timeout
        }
      )
    }

    // Generic error enrichment
    return new ResilienceError(
      'OperationFailed',
      `Operation ${this.name} failed: ${error.message}`,
      error,
      {
        operationName: this.name,
        totalAttempts,
        totalDuration
      }
    )
  }

  getMetrics(): ResilienceMetrics {
    return {
      name: this.name,
      circuitBreakerMetrics: this.circuitBreaker?.getMetrics(),
      hasRetryPolicy: !!this.retryPolicy,
      timeoutMs: this.timeout
    }
  }

  reset(): void {
    if (this.circuitBreaker) {
      this.circuitBreaker.reset()
    }
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class ResilienceError extends Error {
  constructor(
    public readonly category: string,
    message: string,
    public readonly originalError: Error,
    public readonly context: Record<string, any>
  ) {
    super(message)
    this.name = 'ResilienceError'
  }
}

export interface ResilienceMetrics {
  name: string
  circuitBreakerMetrics?: any
  hasRetryPolicy: boolean
  timeoutMs: number
}

/**
 * Predefined resilience configurations for common scenarios
 */
export class ResilienceConfigurations {
  static readonly DATA_SOURCE_API = new ResilienceDecorator({
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 300000,
      expectedErrors: ['timeout', 'rate limit']
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffStrategy: 'exponential',
      retryableErrors: ['timeout', 'network', 'rate limit', '429', '502', '503']
    },
    timeout: 30000,
    name: 'DataSourceAPI'
  })

  static readonly DATABASE_OPERATION = new ResilienceDecorator({
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffStrategy: 'linear',
      retryableErrors: ['connection', 'timeout', 'deadlock']
    },
    timeout: 15000,
    name: 'DatabaseOperation'
  })

  static readonly CACHE_OPERATION = new ResilienceDecorator({
    retry: {
      maxAttempts: 2,
      baseDelay: 100,
      maxDelay: 1000,
      backoffStrategy: 'fixed'
    },
    timeout: 5000,
    name: 'CacheOperation'
  })

  static readonly CRITICAL_EXTERNAL_API = new ResilienceDecorator({
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 60000
    },
    retry: {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffStrategy: 'jitter',
      jitterFactor: 0.2
    },
    timeout: 45000,
    name: 'CriticalExternalAPI'
  })

  /**
   * Creates a resilience decorator for a specific data source
   */
  static forDataSource(sourceId: string): ResilienceDecorator {
    switch (sourceId.toLowerCase()) {
      case 'companies_house':
        return new ResilienceDecorator({
          circuitBreaker: {
            failureThreshold: 3,
            resetTimeout: 120000, // 2 minutes
            monitoringPeriod: 300000,
            expectedErrors: ['rate limit', '429']
          },
          retry: {
            maxAttempts: 5,
            baseDelay: 3000,
            maxDelay: 60000,
            backoffStrategy: 'exponential',
            retryableErrors: ['rate limit', '429', '503', '502', 'timeout']
          },
          timeout: 60000,
          name: `CompaniesHouse_${sourceId}`
        })

      case 'crunchbase':
        return new ResilienceDecorator({
          circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 60000,
            monitoringPeriod: 180000
          },
          retry: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffStrategy: 'jitter'
          },
          timeout: 30000,
          name: `Crunchbase_${sourceId}`
        })

      default:
        return ResilienceConfigurations.DATA_SOURCE_API
    }
  }
}