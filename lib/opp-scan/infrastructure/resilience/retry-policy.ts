/**
 * Retry Policy Implementation
 * Provides configurable retry mechanisms with different backoff strategies
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed' | 'jitter'
  jitterFactor?: number
  retryableErrors?: string[]
  onRetry?: (error: Error, attempt: number, delay: number) => void | Promise<void>
}

export class RetryPolicy {
  constructor(private readonly options: RetryOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    let attempt = 0

    while (attempt < this.options.maxAttempts) {
      attempt++
      
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry if this error is not retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError
        }
        
        // Don't delay on the last attempt
        if (attempt >= this.options.maxAttempts) {
          break
        }
        
        const delay = this.calculateDelay(attempt)
        
        // Call the retry callback if provided
        if (this.options.onRetry) {
          await this.options.onRetry(lastError, attempt, delay)
        }
        
        // Wait before retrying
        await this.delay(delay)
      }
    }
    
    throw new RetryExhaustedError(
      `Operation failed after ${this.options.maxAttempts} attempts. Last error: ${lastError!.message}`,
      lastError!,
      this.options.maxAttempts
    )
  }

  private calculateDelay(attempt: number): number {
    let delay: number
    
    switch (this.options.backoffStrategy) {
      case 'exponential':
        delay = this.options.baseDelay * Math.pow(2, attempt - 1)
        break
        
      case 'linear':
        delay = this.options.baseDelay * attempt
        break
        
      case 'fixed':
        delay = this.options.baseDelay
        break
        
      case 'jitter':
        const exponentialDelay = this.options.baseDelay * Math.pow(2, attempt - 1)
        const jitterFactor = this.options.jitterFactor || 0.1
        const jitter = exponentialDelay * jitterFactor * Math.random()
        delay = exponentialDelay + jitter
        break
        
      default:
        delay = this.options.baseDelay
    }
    
    return Math.min(delay, this.options.maxDelay)
  }

  private isRetryableError(error: Error): boolean {
    // If no specific retryable errors are defined, retry all errors
    if (!this.options.retryableErrors || this.options.retryableErrors.length === 0) {
      return true
    }
    
    return this.options.retryableErrors.some(retryableError =>
      error.message.toLowerCase().includes(retryableError.toLowerCase()) ||
      error.constructor.name.toLowerCase().includes(retryableError.toLowerCase())
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly attempts: number
  ) {
    super(message)
    this.name = 'RetryExhaustedError'
  }
}

/**
 * Predefined retry policies for common scenarios
 */
export class RetryPolicies {
  static readonly DEFAULT = new RetryPolicy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffStrategy: 'exponential'
  })

  static readonly NETWORK = new RetryPolicy({
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 30000,
    backoffStrategy: 'jitter',
    jitterFactor: 0.2,
    retryableErrors: ['timeout', 'network', 'connection', 'econnreset', 'enotfound']
  })

  static readonly API_RATE_LIMIT = new RetryPolicy({
    maxAttempts: 10,
    baseDelay: 2000,
    maxDelay: 120000,
    backoffStrategy: 'exponential',
    retryableErrors: ['rate limit', 'too many requests', '429', '503', '502']
  })

  static readonly DATABASE = new RetryPolicy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffStrategy: 'linear',
    retryableErrors: ['connection', 'timeout', 'deadlock', 'lock wait timeout']
  })

  static readonly CACHE = new RetryPolicy({
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 1000,
    backoffStrategy: 'fixed',
    retryableErrors: ['timeout', 'connection']
  })

  /**
   * Creates a custom retry policy for data sources
   */
  static forDataSource(sourceId: string): RetryPolicy {
    switch (sourceId.toLowerCase()) {
      case 'companies_house':
        return new RetryPolicy({
          maxAttempts: 5,
          baseDelay: 2000,
          maxDelay: 60000,
          backoffStrategy: 'exponential',
          retryableErrors: ['rate limit', '429', '503', '502', 'timeout']
        })
        
      case 'crunchbase':
        return new RetryPolicy({
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffStrategy: 'jitter',
          retryableErrors: ['rate limit', '429', '503', 'timeout']
        })
        
      case 'open_corporates':
        return new RetryPolicy({
          maxAttempts: 4,
          baseDelay: 1500,
          maxDelay: 45000,
          backoffStrategy: 'exponential',
          retryableErrors: ['rate limit', '429', '503', '502', 'timeout', 'server error']
        })
        
      default:
        return RetryPolicies.DEFAULT
    }
  }
}