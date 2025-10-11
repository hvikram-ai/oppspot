/**
 * Resilient Data Source Provider
 * Wraps data source providers with comprehensive resilience patterns
 */

import { 
  IDataSourceProvider,
  SearchCriteria,
  SearchOptions,
  CompanyEntity
} from '../../core/interfaces'
import { ResilienceDecorator, ResilienceConfigurations } from '../resilience/resilience-decorator'

  // @ts-ignore - Interface implementation mismatch
export class ResilientDataSourceProvider implements IDataSourceProvider {
  private readonly searchResilience: ResilienceDecorator
  private readonly detailResilience: ResilienceDecorator
  private readonly metrics = {
    searchRequests: 0,
    searchFailures: 0,
    detailRequests: 0,
    detailFailures: 0,
    lastRequestTime: 0,
    averageResponseTime: 0
  }

  constructor(
    private readonly baseProvider: IDataSourceProvider,
    private readonly customResilience?: ResilienceDecorator
  ) {
    // Use custom resilience or create one based on provider ID
    const resilience = customResilience || ResilienceConfigurations.forDataSource(this.id)
    
    // Clone for different operations to track metrics separately
    this.searchResilience = new ResilienceDecorator({
      ...resilience.getMetrics(),
      name: `${this.id}_search`,
      onError: (error, context) => this.onOperationError('search', error, context),
      onSuccess: (result, context) => this.onOperationSuccess('search', result, context)
    })
    
    this.detailResilience = new ResilienceDecorator({
      ...resilience.getMetrics(),
      name: `${this.id}_details`,
      onError: (error, context) => this.onOperationError('details', error, context),
      onSuccess: (result, context) => this.onOperationSuccess('details', result, context)
    })
  }

  get id(): string {
    return this.baseProvider.id
  }

  get name(): string {
    return this.baseProvider.name
  }

  async *search(criteria: SearchCriteria, options?: SearchOptions): AsyncGenerator<CompanyEntity> {
    const startTime = Date.now()
    this.metrics.searchRequests++
    this.metrics.lastRequestTime = startTime

    try {
      // Execute search with resilience
      const searchGenerator = await this.searchResilience.execute(async () => {
        return this.baseProvider.search(criteria, options)
      })

      // Yield results as they come in
      for await (const company of searchGenerator) {
        yield company
      }

      // Update success metrics
      this.updateResponseTimeMetrics(startTime)

    } catch (error) {
      this.metrics.searchFailures++
      console.error(`Resilient search failed for ${this.id}:`, error)
      throw error
    }
  }

  async getCompanyDetails(id: string): Promise<CompanyEntity | null> {
    const startTime = Date.now()
    this.metrics.detailRequests++
    this.metrics.lastRequestTime = startTime

    try {
      const result = await this.detailResilience.execute(async () => {
        return this.baseProvider.getCompanyDetails(id)
      })

      this.updateResponseTimeMetrics(startTime)
      return result

    } catch (error) {
      this.metrics.detailFailures++
      console.error(`Resilient company details failed for ${this.id}:`, error)
      throw error
    }
  }

  // Enhanced methods for resilience management
  async healthCheck(): Promise<DataSourceHealthStatus> {
    try {
      // Attempt a lightweight operation to check health
      const testCriteria: SearchCriteria = {
        industries: [{ sic_code: 'test', industry: 'test' }] as any,
        regions: [{ code: 'test', name: 'test' }] as any,
        // scanDepth: 'basic',
        filters: {}
      }

      const testOptions: SearchOptions = {
        maxResults: 1,
        timeout: 5000
      }

      const startTime = Date.now()
      const searchIterator = this.baseProvider.search(testCriteria, testOptions)

      // Try to get first result or timeout
      const firstResult = await Promise.race([
        (searchIterator as unknown as AsyncIterator<CompanyEntity>).next(),
        new Promise<IteratorResult<CompanyEntity>>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ])

      const responseTime = Date.now() - startTime
      const searchMetrics = this.searchResilience.getMetrics()
      const detailMetrics = this.detailResilience.getMetrics()

      return {
        sourceId: this.id,
        healthy: true,
        responseTime,
        lastChecked: new Date(),
        circuitBreakerState: searchMetrics.circuitBreakerMetrics?.state || 'CLOSED',
        metrics: this.getProviderMetrics(),
        message: 'Data source is healthy'
      }

    } catch (error) {
      const searchMetrics = this.searchResilience.getMetrics()
      
      return {
        sourceId: this.id,
        healthy: false,
        responseTime: -1,
        lastChecked: new Date(),
        circuitBreakerState: searchMetrics.circuitBreakerMetrics?.state || 'UNKNOWN',
        metrics: this.getProviderMetrics(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Data source health check failed'
      }
    }
  }

  getProviderMetrics(): DataSourceMetrics {
    const searchMetrics = this.searchResilience.getMetrics()
    const detailMetrics = this.detailResilience.getMetrics()

    return {
      sourceId: this.id,
      requests: {
        search: this.metrics.searchRequests,
        details: this.metrics.detailRequests,
        total: this.metrics.searchRequests + this.metrics.detailRequests
      },
      failures: {
        search: this.metrics.searchFailures,
        details: this.metrics.detailFailures,
        total: this.metrics.searchFailures + this.metrics.detailFailures
      },
      successRate: {
        search: this.calculateSuccessRate(this.metrics.searchRequests, this.metrics.searchFailures),
        details: this.calculateSuccessRate(this.metrics.detailRequests, this.metrics.detailFailures),
        overall: this.calculateSuccessRate(
          this.metrics.searchRequests + this.metrics.detailRequests,
          this.metrics.searchFailures + this.metrics.detailFailures
        )
      },
      averageResponseTime: this.metrics.averageResponseTime,
      lastRequestTime: new Date(this.metrics.lastRequestTime),
      circuitBreaker: {
        search: searchMetrics.circuitBreakerMetrics,
        details: detailMetrics.circuitBreakerMetrics
      }
    }
  }

  resetResilience(): void {
    this.searchResilience.reset()
    this.detailResilience.reset()
    console.log(`Reset resilience patterns for data source ${this.id}`)
  }

  private onOperationError(operation: 'search' | 'details', error: Error, context: any): void {
    console.warn(
      `${this.id} ${operation} operation failed:`,
      {
        error: error.message,
        attempt: context.attempt,
        totalAttempts: context.totalAttempts,
        circuitBreakerState: context.circuitBreakerState
      }
    )
  }

  private onOperationSuccess(operation: 'search' | 'details', result: any, context: any): void {
    const duration = Date.now() - context.startTime
    console.debug(
      `${this.id} ${operation} operation succeeded:`,
      {
        duration,
        attempts: context.totalAttempts,
        circuitBreakerState: context.circuitBreakerState
      }
    )
  }

  private updateResponseTimeMetrics(startTime: number): void {
    const responseTime = Date.now() - startTime
    const totalRequests = this.metrics.searchRequests + this.metrics.detailRequests
    
    if (totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime
    } else {
      // Exponential moving average for response time
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1)
    }
  }

  private calculateSuccessRate(requests: number, failures: number): number {
    if (requests === 0) return 100
    return ((requests - failures) / requests) * 100
  }
}

export interface DataSourceHealthStatus {
  sourceId: string
  healthy: boolean
  responseTime: number
  lastChecked: Date
  circuitBreakerState: string
  metrics: DataSourceMetrics
  error?: string
  message: string
}

export interface DataSourceMetrics {
  sourceId: string
  requests: {
    search: number
    details: number
    total: number
  }
  failures: {
    search: number
    details: number
    total: number
  }
  successRate: {
    search: number
    details: number
    overall: number
  }
  averageResponseTime: number
  lastRequestTime: Date
  circuitBreaker: {
    search?: any
    details?: any
  }
}

/**
 * Factory for creating resilient data source providers
 */
export class ResilientDataSourceFactory {
  static wrap(baseProvider: IDataSourceProvider): ResilientDataSourceProvider {
    return new ResilientDataSourceProvider(baseProvider)
  }

  static wrapWithCustomResilience(
    baseProvider: IDataSourceProvider,
    resilience: ResilienceDecorator
  ): ResilientDataSourceProvider {
    return new ResilientDataSourceProvider(baseProvider, resilience)
  }

  static wrapMultiple(baseProviders: IDataSourceProvider[]): Map<string, ResilientDataSourceProvider> {
    const resilientProviders = new Map<string, ResilientDataSourceProvider>()
    
    for (const provider of baseProviders) {
      const resilientProvider = this.wrap(provider)
      resilientProviders.set(provider.id, resilientProvider)
    }
    
    return resilientProviders
  }
}