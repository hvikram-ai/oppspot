/**
 * Data Collection Service
 * Orchestrates data collection from multiple sources with parallel processing
 */

import { 
  IDataCollectionService,
  IDataSourceProvider,
  ICompanyRepository,
  IRateLimitingService,
  ICacheService,
  IEventBus,
  ScanConfiguration,
  CompanyEntity,
  SearchCriteria,
  SearchOptions
} from '../../core/interfaces'
import { CompanyEventFactory } from '../../domain/events/company.events'

export class DataCollectionService implements IDataCollectionService {
  private readonly maxConcurrentSources = 3
  private readonly maxCompaniesPerSource = 1000
  
  constructor(
    private readonly dataSources: Map<string, IDataSourceProvider>,
    private readonly companyRepository: ICompanyRepository,
    private readonly rateLimitingService: IRateLimitingService,
    private readonly cacheService: ICacheService,
    private readonly eventBus: IEventBus
  ) {}

  async collectData(
    configuration: ScanConfiguration,
    progressCallback?: (progress: number) => void
  ): Promise<CompanyEntity[]> {
    const searchCriteria = this.buildSearchCriteria(configuration)
    const allCompanies: CompanyEntity[] = []
    const totalSources = configuration.dataSources.length
    let completedSources = 0

    // Process data sources in parallel with concurrency control
    const sourcePromises = configuration.dataSources.map(async (sourceId, index) => {
      // Stagger source start times to avoid overwhelming rate limits
      await this.delay(index * 500)
      
      try {
        const companies = await this.collectFromSource(sourceId, searchCriteria, configuration)
        
        completedSources++
        progressCallback?.(completedSources / totalSources * 100)
        
        return companies
      } catch (error) {
        console.error(`Error collecting from source ${sourceId}:`, error)
        completedSources++
        progressCallback?.(completedSources / totalSources * 100)
        return []
      }
    })

    // Execute with concurrency limit
    const results = await this.executeWithConcurrencyLimit(sourcePromises, this.maxConcurrentSources)
    
    // Flatten and deduplicate results
    for (const sourceResults of results) {
      allCompanies.push(...sourceResults)
    }

    const deduplicatedCompanies = await this.deduplicateCompanies(allCompanies)
    
    // Save new companies to repository
    await this.saveNewCompanies(deduplicatedCompanies)
    
    return deduplicatedCompanies
  }

  private async collectFromSource(
    sourceId: string,
    criteria: SearchCriteria,
    configuration: ScanConfiguration
  ): Promise<CompanyEntity[]> {
    const dataSource = this.dataSources.get(sourceId)
    if (!dataSource) {
      throw new Error(`Data source ${sourceId} not found`)
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(sourceId, criteria)
    const cachedResults = await this.cacheService.get<CompanyEntity[]>(cacheKey)
    
    if (cachedResults && cachedResults.length > 0) {
      console.log(`Using cached results for ${sourceId}`)
      return cachedResults
    }

    const companies: CompanyEntity[] = []
    const searchOptions: SearchOptions = {
      maxResults: this.maxCompaniesPerSource,
      timeout: 30000,
      rateLimitDelay: await this.rateLimitingService.getDelay(sourceId)
    }

    try {
      // Use async iterator for streaming results
      const searchIterator = dataSource.search(criteria, searchOptions)
      
      for await (const company of searchIterator) {
        companies.push(company)
        
        // Apply rate limiting between companies
        const delay = await this.rateLimitingService.getDelay(sourceId)
        if (delay > 0) {
          await this.delay(delay)
        }
        
        // Respect max companies limit
        if (companies.length >= this.maxCompaniesPerSource) {
          break
        }
      }
    } catch (error) {
      console.error(`Error searching ${sourceId}:`, error)
      throw error
    }

    // Cache results for 1 hour
    await this.cacheService.set(cacheKey, companies, 3600)
    
    return companies
  }

  private buildSearchCriteria(configuration: ScanConfiguration): SearchCriteria {
    return {
      industries: configuration.selectedIndustries.map(i => i.code),
      regions: configuration.selectedRegions.map(r => r.code),
      scanDepth: configuration.scanDepth,
      filters: {
        minEmployees: configuration.filters?.minEmployees,
        maxEmployees: configuration.filters?.maxEmployees,
        minRevenue: configuration.filters?.minRevenue,
        maxRevenue: configuration.filters?.maxRevenue,
        foundingYear: configuration.filters?.foundingYear,
        excludeIndustries: configuration.filters?.excludeIndustries
      }
    }
  }

  private generateCacheKey(sourceId: string, criteria: SearchCriteria): string {
    const criteriaHash = Buffer.from(JSON.stringify(criteria)).toString('base64')
    return `data_collection:${sourceId}:${criteriaHash}`
  }

  private async executeWithConcurrencyLimit<T>(
    promises: Promise<T>[],
    limit: number
  ): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit)
      const batchResults = await Promise.allSettled(batch)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Promise rejected:', result.reason)
          results.push([] as unknown as T) // Return empty array for failed sources
        }
      }
    }
    
    return results
  }

  private async deduplicateCompanies(companies: CompanyEntity[]): Promise<CompanyEntity[]> {
    const uniqueCompanies = new Map<string, CompanyEntity>()
    const similarityThreshold = 0.85

    for (const company of companies) {
      // Check for exact matches first (by registration number or ID)
      if (company.registrationNumber) {
        const existingByRegNum = Array.from(uniqueCompanies.values())
          .find(c => c.registrationNumber === company.registrationNumber)
        
        if (existingByRegNum) {
          // Keep the one with higher confidence
          if (company.confidenceScore > existingByRegNum.confidenceScore) {
            uniqueCompanies.set(existingByRegNum.id, company)
          }
          continue
        }
      }

      // Check for similar companies
      let isDuplicate = false
      for (const [existingId, existingCompany] of uniqueCompanies) {
        if (company.isSimilarTo(existingCompany, similarityThreshold)) {
          isDuplicate = true
          // Keep the one with higher confidence
          if (company.confidenceScore > existingCompany.confidenceScore) {
            uniqueCompanies.set(existingId, company)
          }
          break
        }
      }

      if (!isDuplicate) {
        uniqueCompanies.set(company.id, company)
      }
    }

    return Array.from(uniqueCompanies.values())
  }

  private async saveNewCompanies(companies: CompanyEntity[]): Promise<void> {
    const newCompanies: CompanyEntity[] = []
    
    // Check which companies are actually new
    for (const company of companies) {
      const existing = await this.companyRepository.findById(company.id)
      if (!existing) {
        newCompanies.push(company)
      }
    }

    if (newCompanies.length > 0) {
      // Save in batches to avoid overwhelming the database
      const batchSize = 50
      for (let i = 0; i < newCompanies.length; i += batchSize) {
        const batch = newCompanies.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async company => {
          await this.companyRepository.save(company)
          
          // Publish domain events
          await this.eventBus.publishMany(company.domainEvents)
          company.markEventsAsHandled()
        }))
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}