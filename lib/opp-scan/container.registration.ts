/**
 * Container Registration
 * Registers all services and their dependencies in the DI container
 */

import { Container } from './core/container'

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
  container.registerSingleton<IEventBus>('IEventBus', () => new InMemoryEventBus())
  container.registerSingleton<IEventStore>('IEventStore', () => new InMemoryEventStore())
  
  // Caching
  container.registerSingleton<ICacheService>('ICacheService', (c) => {
    const redisClient = c.tryResolve('redisClient')
    return new CacheService(redisClient)
  })
  
  // Rate Limiting
  container.registerSingleton<IRateLimitingService>('IRateLimitingService', (c) => {
    const redisClient = c.tryResolve('redisClient')
    return new RateLimitingService(redisClient)
  })
  
  // Cost Management
  container.registerSingleton<ICostManagementService>('ICostManagementService', () => {
    return new CostManagementService()
  })

  // ============================================================================
  // REPOSITORY LAYER
  // ============================================================================
  
  container.registerScoped<IScanRepository>('IScanRepository', (c) => {
    const database = c.resolve('database')
    return new ScanRepository(database)
  })
  
  container.registerScoped<ICompanyRepository>('ICompanyRepository', (c) => {
    const database = c.resolve('database')
    return new CompanyRepository(database)
  })

  // ============================================================================
  // DATA SOURCE LAYER
  // ============================================================================
  
  container.registerSingleton('DataSourceFactory', () => new DataSourceFactory())
  
  container.registerFactory('DataSourceProviders', (c) => {
    const factory = c.resolve('DataSourceFactory') as DataSourceFactory
    
    // Initialize and return all available data sources as a Map
    const sources = new Map()
    
    // Register individual data sources
    const availableSources = factory.getAvailableSources()
    for (const sourceId of availableSources) {
      try {
        const provider = factory.createProvider(sourceId, {})
        sources.set(sourceId, provider)
      } catch (error) {
        console.warn(`Failed to initialize data source ${sourceId}:`, error)
      }
    }
    
    return sources
  })

  // ============================================================================
  // APPLICATION LAYER
  // ============================================================================
  
  // Data Collection Service
  container.registerScoped<IDataCollectionService>('IDataCollectionService', (c) => {
    return new DataCollectionService(
      c.resolve('DataSourceProviders'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<IRateLimitingService>('IRateLimitingService'),
      c.resolve<ICacheService>('ICacheService'),
      c.resolve<IEventBus>('IEventBus')
    )
  })
  
  // Company Analysis Service
  container.registerScoped<ICompanyAnalysisService>('ICompanyAnalysisService', (c) => {
    return new CompanyAnalysisService(
      c.resolve('DataSourceProviders'),
      c.resolve<ICacheService>('ICacheService')
    )
  })
  
  // Scan Orchestration Service (replaces ScanningEngine)
  container.registerScoped<IScanOrchestrationService>('IScanOrchestrationService', (c) => {
    return new ScanOrchestrationService(
      c.resolve<IDataCollectionService>('IDataCollectionService'),
      c.resolve<ICompanyAnalysisService>('ICompanyAnalysisService'),
      c.resolve<ICostManagementService>('ICostManagementService'),
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<IEventBus>('IEventBus')
    )
  })

  // ============================================================================
  // USE CASE LAYER
  // ============================================================================
  
  // Execute Scan Use Case
  container.registerScoped<UseCase<any, any>>('ExecuteScanUseCase', (c) => {
    return new ExecuteScanUseCase(
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<IDataCollectionService>('IDataCollectionService'),
      c.resolve<ICompanyAnalysisService>('ICompanyAnalysisService'),
      c.resolve<ICostManagementService>('ICostManagementService'),
      c.resolve<IEventBus>('IEventBus')
    )
  })

  // ============================================================================
  // HEALTH CHECKS AND MONITORING
  // ============================================================================
  
  container.registerSingleton('HealthCheckService', (c) => {
    return new HealthCheckService(
      c.resolve<IScanRepository>('IScanRepository'),
      c.resolve<ICompanyRepository>('ICompanyRepository'),
      c.resolve<ICacheService>('ICacheService'),
      c.resolve<IRateLimitingService>('IRateLimitingService'),
      c.resolve('DataSourceProviders')
    )
  })
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
    private readonly dataSourceProviders: Map<string, any>
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks: Record<string, boolean> = {}
    const errors: string[] = []

    // Database connectivity
    try {
      await this.scanRepository.findRecentScans(1)
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
  return container
}

/**
 * External dependencies that can be injected into the container
 */
export interface ContainerDependencies {
  database?: unknown
  redisClient?: unknown
  logger?: unknown
  metrics?: unknown
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
  private orchestrationService: IScanOrchestrationService

  constructor(container: IContainer) {
    this.orchestrationService = container.resolve<IScanOrchestrationService>('IScanOrchestrationService')
  }

  async startScan(scanId: string): Promise<unknown> {
    return this.orchestrationService.executeScan(scanId)
  }

  async pauseScan(scanId: string): Promise<void> {
    return this.orchestrationService.pauseScan(scanId)
  }

  async resumeScan(scanId: string): Promise<void> {
    return this.orchestrationService.resumeScan(scanId)
  }

  async cancelScan(scanId: string): Promise<void> {
    return this.orchestrationService.cancelScan(scanId, 'User requested cancellation')
  }

  async getScanStatus(scanId: string): Promise<unknown> {
    return this.orchestrationService.getScanProgress(scanId)
  }
}