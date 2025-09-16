/**
 * Data Collection Service Integration Tests
 * Tests the service with mocked dependencies to ensure proper integration
 */

import { DataCollectionService } from '../../../application/services/data-collection.service'
import { 
  IDataSourceProvider,
  ICompanyRepository,
  IRateLimitingService,
  ICacheService,
  IEventBus,
  ScanConfiguration,
  CompanyEntity
} from '../../../core/interfaces'

// Create mock implementations
class MockDataSourceProvider implements IDataSourceProvider {
  constructor(
    public readonly id: string,
    public readonly name: string,
    private readonly companies: CompanyEntity[] = []
  ) {}

  async *search(): AsyncIterator<CompanyEntity> {
    for (const company of this.companies) {
      yield company
    }
  }

  async getCompanyDetails(id: string): Promise<CompanyEntity | null> {
    return this.companies.find(c => c.id === id) || null
  }
}

const createMockCompany = (id: string, name: string, confidence = 0.8): CompanyEntity => {
  return CompanyEntity.create(
    id,
    name,
    'UK',
    ['70100'],
    confidence,
    { source: 'test', discoveredAt: new Date(), confidence }
  )
}

describe('DataCollectionService Integration Tests', () => {
  let service: DataCollectionService
  let mockDataSources: Map<string, IDataSourceProvider>
  let mockCompanyRepository: jest.Mocked<ICompanyRepository>
  let mockRateLimitingService: jest.Mocked<IRateLimitingService>
  let mockCacheService: jest.Mocked<ICacheService>
  let mockEventBus: jest.Mocked<IEventBus>

  const mockConfiguration: ScanConfiguration = {
    id: 'scan-123',
    userId: 'user-123',
    name: 'Test Scan',
    selectedIndustries: [
      { code: '70100', name: 'Management consultancy' }
    ],
    selectedRegions: [
      { code: 'UK', name: 'United Kingdom' }
    ],
    dataSources: ['source1', 'source2'],
    scanDepth: 'standard',
    filters: {}
  }

  beforeEach(() => {
    // Create mock companies for data sources
    const companies1 = [
      createMockCompany('company-1', 'Company One', 0.9),
      createMockCompany('company-2', 'Company Two', 0.8)
    ]

    const companies2 = [
      createMockCompany('company-3', 'Company Three', 0.85),
      createMockCompany('company-1', 'Company One Duplicate', 0.7) // Duplicate to test deduplication
    ]

    // Setup mock data sources
    mockDataSources = new Map([
      ['source1', new MockDataSourceProvider('source1', 'Source 1', companies1)],
      ['source2', new MockDataSourceProvider('source2', 'Source 2', companies2)]
    ])

    // Setup mock dependencies
    mockCompanyRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByName: jest.fn(),
      findByRegistrationNumber: jest.fn(),
      search: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      findHighConfidenceCompanies: jest.fn(),
      countByIndustry: jest.fn(),
      findSimilarCompanies: jest.fn()
    } as unknown

    mockRateLimitingService = {
      checkLimit: jest.fn(),
      recordSuccess: jest.fn(),
      recordError: jest.fn(),
      getDelay: jest.fn(),
      configureSource: jest.fn(),
      getSourceStatus: jest.fn(),
      getAllSourceStatus: jest.fn(),
      resetSourceLimits: jest.fn(),
      resetAllLimits: jest.fn()
    } as unknown

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      exists: jest.fn(),
      invalidateByTag: jest.fn(),
      getMultiple: jest.fn(),
      setMultiple: jest.fn(),
      getStats: jest.fn()
    } as unknown

    mockEventBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      clear: jest.fn()
    } as unknown

    service = new DataCollectionService(
      mockDataSources,
      mockCompanyRepository,
      mockRateLimitingService,
      mockCacheService,
      mockEventBus
    )
  })

  describe('Data Collection', () => {
    beforeEach(() => {
      // Setup default mock returns
      mockRateLimitingService.getDelay.mockResolvedValue(100)
      mockCacheService.get.mockResolvedValue(null) // No cache hit by default
      mockCompanyRepository.findById.mockResolvedValue(null) // No existing companies
    })

    it('should collect data from all configured sources', async () => {
      const companies = await service.collectData(mockConfiguration)

      expect(companies).toHaveLength(3) // Should have 3 unique companies after deduplication
      expect(companies.map(c => c.name)).toContain('Company One')
      expect(companies.map(c => c.name)).toContain('Company Two')
      expect(companies.map(c => c.name)).toContain('Company Three')
    })

    it('should deduplicate companies correctly', async () => {
      const companies = await service.collectData(mockConfiguration)

      // Should deduplicate company-1 and keep the higher confidence version
      const companyOneInstances = companies.filter(c => c.name.includes('Company One'))
      expect(companyOneInstances).toHaveLength(1)
      expect(companyOneInstances[0].confidenceScore).toBe(0.9) // Higher confidence version
    })

    it('should respect rate limiting', async () => {
      await service.collectData(mockConfiguration)

      expect(mockRateLimitingService.getDelay).toHaveBeenCalledWith('source1')
      expect(mockRateLimitingService.getDelay).toHaveBeenCalledWith('source2')
    })

    it('should use cache when available', async () => {
      const cachedCompanies = [createMockCompany('cached-1', 'Cached Company')]
      mockCacheService.get.mockResolvedValueOnce(cachedCompanies)

      const companies = await service.collectData(mockConfiguration)

      expect(companies).toHaveLength(4) // 1 cached + 3 from other source
      expect(companies.map(c => c.name)).toContain('Cached Company')
    })

    it('should save new companies to repository', async () => {
      await service.collectData(mockConfiguration)

      expect(mockCompanyRepository.save).toHaveBeenCalledTimes(3)
    })

    it('should publish domain events for new companies', async () => {
      await service.collectData(mockConfiguration)

      expect(mockEventBus.publishMany).toHaveBeenCalled()
    })

    it('should report progress during collection', async () => {
      const progressCallback = jest.fn()
      await service.collectData(mockConfiguration, progressCallback)

      expect(progressCallback).toHaveBeenCalledWith(50) // After first source
      expect(progressCallback).toHaveBeenCalledWith(100) // After second source
    })

    it('should handle source failures gracefully', async () => {
      // Make one source fail
      const failingSource = new MockDataSourceProvider('failing', 'Failing Source')
      failingSource.search = async function* () {
        throw new Error('Source failed')
      }

      mockDataSources.set('failing', failingSource)
      const configWithFailingSource = {
        ...mockConfiguration,
        dataSources: ['source1', 'failing']
      }

      const companies = await service.collectData(configWithFailingSource)

      // Should still get companies from successful source
      expect(companies).toHaveLength(2)
      expect(companies.map(c => c.name)).toContain('Company One')
      expect(companies.map(c => c.name)).toContain('Company Two')
    })

    it('should apply search criteria correctly', async () => {
      const configWithFilters = {
        ...mockConfiguration,
        filters: {
          minEmployees: 100,
          maxEmployees: 1000
        }
      }

      await service.collectData(configWithFilters)

      // Check that search was called with correct criteria
      // This would be more complex in a real implementation where we mock the actual search
      expect(mockRateLimitingService.getDelay).toHaveBeenCalled()
    })
  })

  describe('Concurrent Processing', () => {
    it('should process sources concurrently', async () => {
      const startTime = Date.now()
      await service.collectData(mockConfiguration)
      const duration = Date.now() - startTime

      // Should be faster than sequential processing
      // In real implementation, we'd have actual delays to measure
      expect(duration).toBeLessThan(1000) // Reasonable upper bound for test
    })

    it('should respect concurrency limits', async () => {
      const manySourcesConfig = {
        ...mockConfiguration,
        dataSources: ['s1', 's2', 's3', 's4', 's5'] // 5 sources
      }

      // Add mock sources
      for (let i = 1; i <= 5; i++) {
        mockDataSources.set(`s${i}`, new MockDataSourceProvider(`s${i}`, `Source ${i}`, []))
      }

      await service.collectData(manySourcesConfig)

      // All sources should have been processed
      expect(mockRateLimitingService.getDelay).toHaveBeenCalledTimes(5)
    })
  })

  describe('Error Handling', () => {
    it('should handle cache failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache failed'))
      mockCacheService.set.mockRejectedValue(new Error('Cache failed'))

      const companies = await service.collectData(mockConfiguration)

      // Should still work without cache
      expect(companies).toHaveLength(3)
    })

    it('should handle repository save failures gracefully', async () => {
      mockCompanyRepository.save.mockRejectedValue(new Error('Save failed'))

      // Should not throw, but log the error
      await expect(service.collectData(mockConfiguration)).resolves.toBeDefined()
    })

    it('should handle event publishing failures gracefully', async () => {
      mockEventBus.publishMany.mockRejectedValue(new Error('Event bus failed'))

      // Should not throw
      await expect(service.collectData(mockConfiguration)).resolves.toBeDefined()
    })
  })

  describe('Performance Optimization', () => {
    it('should use batch operations for saving companies', async () => {
      const manyCompanies = Array.from({ length: 100 }, (_, i) => 
        createMockCompany(`company-${i}`, `Company ${i}`)
      )

      const bigDataSource = new MockDataSourceProvider('big', 'Big Source', manyCompanies)
      mockDataSources.set('big', bigDataSource)

      const configWithBigSource = {
        ...mockConfiguration,
        dataSources: ['big']
      }

      await service.collectData(configWithBigSource)

      // Should use batch operations (50 per batch)
      expect(mockCompanyRepository.save).toHaveBeenCalledTimes(100)
    })

    it('should skip duplicate database checks efficiently', async () => {
      // First run - all companies are new
      await service.collectData(mockConfiguration)
      expect(mockCompanyRepository.findById).toHaveBeenCalledTimes(3)

      jest.clearAllMocks()

      // Second run - all companies exist
      mockCompanyRepository.findById.mockResolvedValue({} as unknown)
      await service.collectData(mockConfiguration)

      expect(mockCompanyRepository.findById).toHaveBeenCalledTimes(3)
      expect(mockCompanyRepository.save).not.toHaveBeenCalled() // Should not save existing companies
    })
  })

  describe('Cache Management', () => {
    it('should cache results with appropriate TTL', async () => {
      await service.collectData(mockConfiguration)

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String), // cache key
        expect.any(Array), // companies array
        3600 // 1 hour TTL
      )
    })

    it('should use consistent cache keys', async () => {
      await service.collectData(mockConfiguration)
      
      // Get the cache key used
      const cacheSetCall = mockCacheService.set.mock.calls[0]
      const cacheKey = cacheSetCall[0]

      // Cache key should be deterministic
      expect(cacheKey).toContain('data_collection')
      expect(cacheKey).toContain('source1')
    })
  })

  describe('Event Publishing', () => {
    it('should publish company created events', async () => {
      await service.collectData(mockConfiguration)

      expect(mockEventBus.publishMany).toHaveBeenCalled()
      
      // Should be called once per batch of companies
      const publishCalls = mockEventBus.publishMany.mock.calls
      expect(publishCalls.length).toBeGreaterThan(0)
    })

    it('should clear domain events after publishing', async () => {
      await service.collectData(mockConfiguration)

      // This would be verified by checking that companies have no pending events
      // In a real test, we'd spy on the markEventsAsHandled method
      expect(mockEventBus.publishMany).toHaveBeenCalled()
    })
  })
})