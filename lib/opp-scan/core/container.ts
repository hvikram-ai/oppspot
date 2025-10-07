/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */

export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient', 
  SCOPED = 'scoped'
}

export interface ServiceDescriptor<T = unknown> {
  token: string | symbol | Function
  implementation?: new (...args: unknown[]) => T
  factory?: (...args: unknown[]) => T | Promise<T>
  instance?: T
  lifetime: ServiceLifetime
  dependencies?: Array<string | symbol | Function>
}

export interface IContainer {
  register<T>(descriptor: ServiceDescriptor<T>): void
  registerSingleton<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void
  registerTransient<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void
  registerScoped<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void
  registerFactory<T>(token: string | symbol | Function, factory: (...args: unknown[]) => T | Promise<T>, lifetime?: ServiceLifetime): void
  resolve<T>(token: string | symbol | Function): T
  resolveAsync<T>(token: string | symbol | Function): Promise<T>
  createScope(): IContainer
}

export class Container implements IContainer {
  private services = new Map<string | symbol | Function, ServiceDescriptor>()
  private instances = new Map<string | symbol | Function, unknown>()
  private scopedInstances = new Map<string | symbol | Function, unknown>()
  private parent?: Container

  constructor(parent?: Container) {
    this.parent = parent
  }

  register<T>(descriptor: ServiceDescriptor<T>): void {
    this.services.set(descriptor.token, descriptor)
  }

  registerSingleton<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void {
    this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.SINGLETON
    })
  }

  registerTransient<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void {
    this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.TRANSIENT
    })
  }

  registerScoped<T>(token: string | symbol | Function, implementation: new (...args: unknown[]) => T): void {
    this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.SCOPED
    })
  }

  registerFactory<T>(
    token: string | symbol | Function,
    factory: (...args: unknown[]) => T | Promise<T>,
    lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT
  ): void {
    this.register({
      token,
      factory,
      lifetime
    })
  }

  registerInstance<T>(token: string | symbol | Function, instance: T): void {
    this.register({
      token,
      instance,
      lifetime: ServiceLifetime.SINGLETON
    })
  }

  tryResolve<T>(token: string | symbol | Function): T | undefined {
    try {
      return this.resolve<T>(token)
    } catch {
      return undefined
    }
  }

  resolve<T>(token: string | symbol | Function): T {
    const descriptor = this.getDescriptor(token)
    if (!descriptor) {
      throw new Error(`Service ${String(token)} is not registered`)
    }

    // Check for existing instances based on lifetime
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        if (this.instances.has(token)) {
          return this.instances.get(token)
        }
        break
      case ServiceLifetime.SCOPED:
        if (this.scopedInstances.has(token)) {
          return this.scopedInstances.get(token)
        }
        break
      case ServiceLifetime.TRANSIENT:
        // Always create new instance
        break
    }

    const instance = this.createInstance<T>(descriptor)
    
    // Store instance based on lifetime
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        this.instances.set(token, instance)
        break
      case ServiceLifetime.SCOPED:
        this.scopedInstances.set(token, instance)
        break
    }

    return instance
  }

  async resolveAsync<T>(token: string | symbol | Function): Promise<T> {
    const descriptor = this.getDescriptor(token)
    if (!descriptor) {
      throw new Error(`Service ${String(token)} is not registered`)
    }

    // Check for existing instances
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        if (this.instances.has(token)) {
          return this.instances.get(token)
        }
        break
      case ServiceLifetime.SCOPED:
        if (this.scopedInstances.has(token)) {
          return this.scopedInstances.get(token)
        }
        break
    }

    const instance = await this.createInstanceAsync<T>(descriptor)
    
    // Store instance
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        this.instances.set(token, instance)
        break
      case ServiceLifetime.SCOPED:
        this.scopedInstances.set(token, instance)
        break
    }

    return instance
  }

  createScope(): IContainer {
    return new Container(this)
  }

  private getDescriptor(token: string | symbol | Function): ServiceDescriptor | undefined {
    let descriptor = this.services.get(token)
    if (!descriptor && this.parent) {
      descriptor = this.parent.getDescriptor(token)
    }
    return descriptor
  }

  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.instance) {
      return descriptor.instance
    }

    if (descriptor.factory) {
      const dependencies = this.resolveDependencies(descriptor.dependencies || [])
      const result = descriptor.factory(...dependencies)
      if (result instanceof Promise) {
        throw new Error(`Async factory detected for ${String(descriptor.token)}. Use resolveAsync instead.`)
      }
      return result
    }

    if (descriptor.implementation) {
      const dependencies = this.resolveDependencies(descriptor.dependencies || [])
      return new descriptor.implementation(...dependencies)
    }

    throw new Error(`No implementation or factory provided for ${String(descriptor.token)}`)
  }

  private async createInstanceAsync<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    if (descriptor.instance) {
      return descriptor.instance
    }

    if (descriptor.factory) {
      const dependencies = await this.resolveDependenciesAsync(descriptor.dependencies || [])
      const result = descriptor.factory(...dependencies)
      return result instanceof Promise ? await result : result
    }

    if (descriptor.implementation) {
      const dependencies = await this.resolveDependenciesAsync(descriptor.dependencies || [])
      return new descriptor.implementation(...dependencies)
    }

    throw new Error(`No implementation or factory provided for ${String(descriptor.token)}`)
  }

  private resolveDependencies(dependencies: Array<string | symbol | Function>): unknown[] {
    return dependencies.map(dep => this.resolve(dep))
  }

  private async resolveDependenciesAsync(dependencies: Array<string | symbol | Function>): Promise<unknown[]> {
    return Promise.all(dependencies.map(dep => this.resolveAsync(dep)))
  }

  /**
   * Dispose scoped services and clear instances
   */
  dispose(): void {
    // Dispose scoped instances that implement IDisposable
    for (const [token, instance] of this.scopedInstances) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose()
        } catch (error) {
          console.error(`Error disposing service ${String(token)}:`, error)
        }
      }
    }
    this.scopedInstances.clear()
  }
}

// Service tokens for type-safe dependency injection
export const SERVICE_TOKENS = {
  // Core services
  SCAN_ENGINE: Symbol('ScanEngine'),
  DATA_SOURCE_FACTORY: Symbol('DataSourceFactory'),
  COST_MANAGER: Symbol('CostManager'),
  JOB_QUEUE: Symbol('JobQueue'),
  
  // Data sources
  COMPANIES_HOUSE_API: Symbol('CompaniesHouseAPI'),
  IRISH_CRO_API: Symbol('IrishCROAPI'),
  FINANCIAL_DATA_API: Symbol('FinancialDataAPI'),
  
  // Infrastructure
  DATABASE_CLIENT: Symbol('DatabaseClient'),
  CACHE_PROVIDER: Symbol('CacheProvider'),
  LOGGER: Symbol('Logger'),
  EVENT_BUS: Symbol('EventBus'),
  
  // Application services
  DATA_COLLECTION_SERVICE: Symbol('DataCollectionService'),
  DATA_PROCESSING_SERVICE: Symbol('DataProcessingService'),
  ANALYSIS_SERVICE: Symbol('AnalysisService'),
  REPORTING_SERVICE: Symbol('ReportingService')
} as const

// Create and export the global container instance
export const container = new Container()

// Disposable interface for cleanup
export interface IDisposable {
  dispose(): void | Promise<void>
}