/**
 * Container Registration
 * Registers all services and their dependencies in the DI container
 */

import { Container, ServiceLifetime } from './core/container'

// Domain Services
import { InMemoryEventBus, InMemoryEventStore } from './domain/events/domain-event.base'

// Application Services
import { ExecuteScanUseCase } from './application/use-cases/execute-scan.use-case'
import { DataCollectionService } from './application/services/data-collection.service'
import { CompanyAnalysisService } from './application/services/company-analysis.service'
import { ScanOrchestrationService } from './application/services/scan-orchestration.service'

// Infrastructure Services
import { ScanRepository } from './infrastructure/repositories/scan.repository'
import { CompanyRepository } from './infrastructure/repositories/company.repository'
import { CacheService } from './infrastructure/services/cache.service'
import { RateLimitingService } from './infrastructure/services/rate-limiting.service'
import { CostManagementService } from './infrastructure/services/cost-management.service'

// Legacy Services (to be refactored)
import { DataSourceFactory } from './data-sources/data-source-factory'

// Interfaces
import {
  IEventBus,
  IEventStore,
  IContainer,
  IScanRepository,
  ICompanyRepository,
  IDataCollectionService,
  ICompanyAnalysisService,
  IScanOrchestrationService,
  ICacheService,
  IRateLimitingService,
  ICostManagementService,
  UseCase
} from './core/interfaces'

/**
 * Registers all services in the dependency injection container
 */
export function registerServices(
  container: Container,
  dependencies: ContainerDependencies = {}
): void {
  
  // ============================================================================
  // EXTERNAL DEPENDENCIES
  // ============================================================================
  
  // Database connection (passed from external system)
  if (dependencies.database) {
    container.registerInstance('database', dependencies.database)
  }
  
  // Redis client (optional, passed from external system)
  if (dependencies.redisClient) {
    container.registerInstance('redisClient', dependencies.redisClient)
  }

  // ============================================================================
  // INFRASTRUCTURE LAYER
  // ============================================================================

  // Event System
  container.registerFactory<IEventBus>('IEventBus', () => new InMemoryEventBus(), ServiceLifetime.SINGLETON)
  container.registerFactory<IEventStore>('IEventStore', () => new InMemoryEventStore(), ServiceLifetime.SINGLETON)

  // Caching
  container.registerFactory<ICacheService>('ICacheService', ((c: IContainer) => {
    const redisClient = c.resolve<RedisClient>('redisClient') || null
    return new CacheService(redisClient) as unknown as ICacheService
  }), ServiceLifetime.SINGLETON)

  // Rate Limiting
  container.registerFactory<IRateLimitingService>('IRateLimitingService', ((c: IContainer) => {
    const redisClient = c.resolve<RedisClient>('redisClient') || null
    return new RateLimitingService(redisClient) as unknown as IRateLimitingService
  }), ServiceLifetime.SINGLETON)

  // Cost Management
  container.registerFactory<ICostManagementService>('ICostManagementService', () => {
    return new CostManagementService() as unknown as ICostManagementService
  }, ServiceLifetime.SINGLETON)

  // ============================================================================
  // REPOSITORY LAYER
  // ============================================================================

  container.registerFactory<IScanRepository>('IScanRepository', ((c: IContainer) => {
    const database = c.resolve<DatabaseClient>('database')
    return new ScanRepository(database) as unknown as IScanRepository
  }), ServiceLifetime.SCOPED)

  container.registerFactory<ICompanyRepository>('ICompanyRepository', ((c: IContainer) => {
    const database = c.resolve<DatabaseClient>('database')
    return new CompanyRepository(database) as unknown as ICompanyRepository
  }), ServiceLifetime.SCOPED)

  // ============================================================================
  // DATA SOURCE LAYER
  // ============================================================================

  container.registerFactory('DataSourceFactory', () => new DataSourceFactory(), ServiceLifetime.SINGLETON)

  container.registerFactory('DataSourceProviders', ((c: IContainer) => {
    const factory = c.resolve<DataSourceFactory>('DataSourceFactory')

    // Initialize and return all available data sources as a Map
    const sources = new Map<string, DataSourceProvider>()

    // Register individual data sources
    const availableSources = factory.getAvailableDataSources?.() || []
    for (const sourceId of availableSources) {
      try {
        const provider = factory.createDataSource?.(sourceId, {}) as DataSourceProvider
        sources.set(sourceId, provider)
      } catch (error) {
        console.warn(`Failed to initialize data source ${sourceId}:`, error)
      }
    }

    return sources
  }))

  // ============================================================================
  // APPLICATION LAYER
  // ============================================================================

  // Data Collection Service
  container.registerFactory<IDataCollectionService>('IDataCollectionService', ((c: IContainer) => {
    return new DataCollectionService(
      c.resolve<Map<string, DataSourceProvider>>('DataSourceProviders'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<IRateLimitingService>('IRateLimitingService'),
      c.resolve<ICacheService>('ICacheService'),
      c.resolve<IEventBus>('IEventBus')
    ) as unknown as IDataCollectionService
  }), ServiceLifetime.SCOPED)

  // Company Analysis Service
  container.registerFactory<ICompanyAnalysisService>('ICompanyAnalysisService', ((c: IContainer) => {
    return new CompanyAnalysisService(
      c.resolve<Map<string, DataSourceProvider>>('DataSourceProviders'),
      c.resolve<ICacheService>('ICacheService')
    ) as unknown as ICompanyAnalysisService
  }), ServiceLifetime.SCOPED)

  // Scan Orchestration Service (replaces ScanningEngine)
  container.registerFactory<IScanOrchestrationService>('IScanOrchestrationService', ((c: IContainer) => {
    return new ScanOrchestrationService(
      c.resolve<IDataCollectionService>('IDataCollectionService'),
      c.resolve<ICompanyAnalysisService>('ICompanyAnalysisService'),
      c.resolve<ICostManagementService>('ICostManagementService'),
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<IEventBus>('IEventBus')
    ) as unknown as IScanOrchestrationService
  }))

  // ============================================================================
  // USE CASE LAYER
  // ============================================================================
  
  // Execute Scan Use Case
  container.registerScoped<UseCase<ExecuteScanInput, ExecuteScanOutput>>('ExecuteScanUseCase', ((c: IContainer) => {
    return new ExecuteScanUseCase(
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<IDataCollectionService>('IDataCollectionService'),
      c.resolve<ICompanyAnalysisService>('ICompanyAnalysisService'),
      c.resolve<ICostManagementService>('ICostManagementService'),
      c.resolve<IEventBus>('IEventBus')
    )
  }))

  // ============================================================================
  // HEALTH CHECKS AND MONITORING
  // ============================================================================
  
  container.registerSingleton('HealthCheckService', ((c: IContainer) => {
    return new HealthCheckService(
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<ICacheService>('ICacheService'),
      c.resolve<IRateLimitingService>('IRateLimitingService'),
      c.resolve<Map<string, DataSourceProvider>>('DataSourceProviders')
    )
  }))
}

/**
 * Simple health check service for monitoring system health
 */
class HealthCheckService {
  constructor(
    private readonly scanRepository: IScanRepository,
    private readonly companyRepository: ICompanyRepository,
    private readonly cacheService: ICacheService,
    private readonly rateLimitingService: IRateLimitingService,
    private readonly dataSourceProviders: Map<string, DataSourceProvider>
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks: Record<string, boolean> = {}
    const errors: string[] = []

    // Database connectivity
    try {
      const repo = this.scanRepository as IScanRepository & { findRecentScans?: (limit: number) => Promise<unknown> }
      await repo.findRecentScans?.(1)
      checks.database = true
    } catch (error) {
      checks.database = false
      errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Cache connectivity
    try {
      await this.cacheService.set('health_check', Date.now(), 60)
      await this.cacheService.get('health_check')
      checks.cache = true
    } catch (error) {
      checks.cache = false
      errors.push(`Cache: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Data source availability
    let healthyDataSources = 0
    const totalDataSources = this.dataSourceProviders.size
    
    for (const [sourceId, provider] of this.dataSourceProviders.entries()) {
      try {
        // Simple health check - would be more sophisticated in real implementation
        if (provider && typeof provider.search === 'function') {
          healthyDataSources++
        }
      } catch (error) {
        errors.push(`Data source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    checks.dataSources = healthyDataSources === totalDataSources

    const overallHealth = Object.values(checks).every(Boolean)

    return {
      healthy: overallHealth,
      checks,
      errors,
      timestamp: new Date(),
      version: '2.0.0',
      uptime: process.uptime()
    }
  }
}

/**
 * Creates and configures the main DI container
 */
export function createContainer(dependencies: ContainerDependencies = {}): IContainer {
  const container = new Container()
  registerServices(container, dependencies)
  return container as unknown as IContainer
}

/**
 * External dependencies that can be injected into the container
 */
export interface ContainerDependencies {
  database?: DatabaseClient
  redisClient?: RedisClient
  logger?: unknown
  metrics?: unknown
}

// Type definitions for external dependencies
type DatabaseClient = {
  from: (table: string) => unknown
  [key: string]: unknown
}

type RedisClient = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttl?: number) => Promise<void>
  [key: string]: unknown
} | null

type DataSourceProvider = {
  search?: (query: unknown) => Promise<unknown>
  [key: string]: unknown
}

// Use case types
type ExecuteScanInput = {
  scanId: string
  [key: string]: unknown
}

type ExecuteScanOutput = {
  success: boolean
  scanId: string
  [key: string]: unknown
}

interface HealthCheckResult {
  healthy: boolean
  checks: Record<string, boolean>
  errors: string[]
  timestamp: Date
  version: string
  uptime: number
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy wrapper for the old ScanningEngine interface
 * Provides backward compatibility while using the new architecture
 */
export class LegacyScanningEngineAdapter {
  private orchestrationService: IScanOrchestrationService & {
    executeScan?: (scanId: string) => Promise<unknown>
    pauseScan?: (scanId: string) => Promise<void>
    resumeScan?: (scanId: string) => Promise<void>
    cancelScan?: (scanId: string, reason: string) => Promise<void>
    getScanProgress?: (scanId: string) => Promise<unknown>
  }

  constructor(container: IContainer) {
    this.orchestrationService = container.resolve<IScanOrchestrationService>('IScanOrchestrationService') as IScanOrchestrationService & {
      executeScan?: (scanId: string) => Promise<unknown>
      pauseScan?: (scanId: string) => Promise<void>
      resumeScan?: (scanId: string) => Promise<void>
      cancelScan?: (scanId: string, reason: string) => Promise<void>
      getScanProgress?: (scanId: string) => Promise<unknown>
    }
  }

  async startScan(scanId: string): Promise<unknown> {
    return this.orchestrationService.executeScan?.(scanId)
  }

  async pauseScan(scanId: string): Promise<void> {
    return this.orchestrationService.pauseScan?.(scanId)
  }

  async resumeScan(scanId: string): Promise<void> {
    return this.orchestrationService.resumeScan?.(scanId)
  }

  async cancelScan(scanId: string): Promise<void> {
    return this.orchestrationService.cancelScan?.(scanId, 'User requested cancellation')
  }

  async getScanStatus(scanId: string): Promise<unknown> {
    return this.orchestrationService.getScanProgress?.(scanId)
  }
}