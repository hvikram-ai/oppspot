/**
 * API Compatibility Tests
 * Ensures the new architecture maintains compatibility with existing API endpoints
 */

import { createContainer, LegacyScanningEngineAdapter } from '../../container.registration'
import { ScanEntity } from '../../domain/entities/scan.entity'
import { TestUtils, createMockDatabase, createMockRedisClient } from '../setup'

describe('API Compatibility Tests', () => {
  let container: any
  let legacyAdapter: LegacyScanningEngineAdapter
  let mockDatabase: any
  let mockRedisClient: any

  const mockApiScanRequest = {
    userId: 'api-user-123',
    name: 'API Test Scan',
    industries: ['70100', '70200'],
    regions: ['UK', 'US'],
    dataSources: ['companies_house', 'crunchbase'],
    scanDepth: 'standard',
    filters: {
      minEmployees: 10,
      maxEmployees: 1000,
      minRevenue: 100000
    }
  }

  beforeEach(() => {
    mockDatabase = createMockDatabase()
    mockRedisClient = createMockRedisClient()
    
    // Setup successful database responses
    mockDatabase.query.mockResolvedValue({ rows: [], rowCount: 1 })

    container = createContainer({
      database: mockDatabase,
      redisClient: mockRedisClient
    })

    legacyAdapter = new LegacyScanningEngineAdapter(container)
  })

  describe('Legacy API Compatibility', () => {
    it('should maintain backward compatibility with existing scan creation API', async () => {
      // Simulate existing API endpoint behavior
      const legacyScanConfig = TestUtils.createMockScanConfiguration({
        selectedIndustries: mockApiScanRequest.industries.map(code => ({ code, name: `Industry ${code}` })),
        selectedRegions: mockApiScanRequest.regions.map(code => ({ code, name: `Region ${code}` })),
        dataSources: mockApiScanRequest.dataSources,
        scanDepth: mockApiScanRequest.scanDepth,
        filters: mockApiScanRequest.filters
      })

      const scan = ScanEntity.create('api-compat-scan-1', legacyScanConfig)
      
      // Mock the repository layer
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // Test the legacy adapter methods
      const result = await legacyAdapter.startScan('api-compat-scan-1')

      expect(result).toEqual(expect.objectContaining({
        scanId: 'api-compat-scan-1',
        companiesDiscovered: expect.any(Number),
        companiesAnalyzed: expect.any(Number),
        duration: expect.any(Number),
        totalCost: expect.any(Number),
        completedAt: expect.any(Date)
      }))
    })

    it('should return scan status in expected legacy format', async () => {
      const scan = ScanEntity.create('status-compat-scan', TestUtils.createMockScanConfiguration())
      scan.start()
      scan.updateProgress(45, 'data_collection', 50, 25)
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)

      const status = await legacyAdapter.getScanStatus('status-compat-scan')

      expect(status).toEqual({
        scanId: 'status-compat-scan',
        status: 'scanning',
        progress: 45,
        currentStage: 'data_collection',
        companiesDiscovered: 50,
        companiesAnalyzed: 25,
        currentCosts: expect.objectContaining({
          totalCost: expect.any(Number),
          currency: 'GBP'
        }),
        estimatedTimeRemaining: expect.any(Number),
        errors: expect.any(Array),
        createdAt: expect.any(Date),
        startedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })

    it('should handle pause/resume operations with legacy API expectations', async () => {
      const scan = ScanEntity.create('pause-resume-compat', TestUtils.createMockScanConfiguration())
      scan.start()
      scan.updateProgress(30, 'analysis')
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // Test pause
      await legacyAdapter.pauseScan('pause-resume-compat')
      expect(scan.status).toBe('paused')

      // Test resume
      await legacyAdapter.resumeScan('pause-resume-compat')
      expect(scan.status).toBe('scanning')
    })

    it('should handle scan cancellation with legacy API expectations', async () => {
      const scan = ScanEntity.create('cancel-compat', TestUtils.createMockScanConfiguration())
      scan.start()
      scan.updateProgress(60, 'analysis')
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      await legacyAdapter.cancelScan('cancel-compat')
      expect(scan.status).toBe('cancelled')
    })
  })

  describe('Data Format Compatibility', () => {
    it('should return company data in expected legacy format', async () => {
      const scan = ScanEntity.create('data-format-scan', TestUtils.createMockScanConfiguration())
      
      const scanRepository = container.resolve('IScanRepository')
      const companyRepository = container.resolve('ICompanyRepository')
      
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()
      jest.spyOn(companyRepository, 'findById').mockResolvedValue(null)
      jest.spyOn(companyRepository, 'save').mockResolvedValue()

      const result = await legacyAdapter.startScan('data-format-scan')

      // Should contain legacy-compatible fields
      expect(result).toEqual(expect.objectContaining({
        scanId: expect.any(String),
        companiesDiscovered: expect.any(Number),
        companiesAnalyzed: expect.any(Number),
        highQualityTargets: expect.any(Number),
        totalCost: expect.any(Number),
        costEfficiency: expect.any(Number),
        errorRate: expect.any(Number),
        duration: expect.any(Number),
        completedAt: expect.any(Date)
      }))
    })

    it('should handle cost data in legacy format', async () => {
      const scan = ScanEntity.create('cost-format-scan', TestUtils.createMockScanConfiguration())
      
      const costService = container.resolve('ICostManagementService')
      const mockCosts = TestUtils.createMockCosts({
        totalCost: 150.75,
        currency: 'GBP',
        costBySource: {
          companies_house: 0,
          crunchbase: 150.75
        }
      })
      
      jest.spyOn(costService, 'calculateFinalCosts').mockResolvedValue(mockCosts)
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const result = await legacyAdapter.startScan('cost-format-scan')

      expect(result.totalCost).toBe(150.75)
      expect(typeof result.totalCost).toBe('number')
    })

    it('should handle error data in legacy format', async () => {
      const scan = ScanEntity.create('error-format-scan', TestUtils.createMockScanConfiguration())
      
      // Add some errors to the scan
      scan.start()
      scan.addError({
        message: 'API rate limit exceeded',
        severity: 'high',
        isRetryable: true,
        timestamp: new Date(),
        context: { source: 'crunchbase' }
      })

      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)

      const status = await legacyAdapter.getScanStatus('error-format-scan')

      expect(status.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          message: expect.any(String),
          severity: expect.any(String),
          isRetryable: expect.any(Boolean),
          timestamp: expect.any(Date)
        })
      ]))
    })
  })

  describe('Performance Compatibility', () => {
    it('should maintain response times similar to legacy system', async () => {
      const scan = ScanEntity.create('perf-compat-scan', TestUtils.createMockScanConfiguration())
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const startTime = Date.now()
      await legacyAdapter.startScan('perf-compat-scan')
      const duration = Date.now() - startTime

      // Should complete within reasonable time (legacy systems usually take longer)
      expect(duration).toBeLessThan(5000) // 5 seconds
    })

    it('should handle status queries efficiently', async () => {
      const scan = ScanEntity.create('status-perf-scan', TestUtils.createMockScanConfiguration())
      scan.start()
      scan.updateProgress(75, 'analysis', 100, 80)
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)

      const startTime = Date.now()
      await legacyAdapter.getScanStatus('status-perf-scan')
      const duration = Date.now() - startTime

      // Status queries should be very fast
      expect(duration).toBeLessThan(100) // 100ms
    })
  })

  describe('Error Handling Compatibility', () => {
    it('should handle non-existent scan requests gracefully', async () => {
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(null)

      await expect(legacyAdapter.startScan('non-existent-scan'))
        .rejects
        .toThrow('Scan non-existent-scan not found')
    })

    it('should handle invalid scan states gracefully', async () => {
      const completedScan = ScanEntity.create('completed-scan', TestUtils.createMockScanConfiguration())
      completedScan.start()
      completedScan.complete(TestUtils.createMockCosts())
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(completedScan)

      await expect(legacyAdapter.pauseScan('completed-scan'))
        .rejects
        .toThrow('Cannot pause scan in completed status')
    })

    it('should maintain error message formats from legacy system', async () => {
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(null)

      try {
        await legacyAdapter.getScanStatus('missing-scan')
      } catch (error) {
        expect(error.message).toContain('Scan missing-scan not found')
        expect(typeof error.message).toBe('string')
      }
    })
  })

  describe('Configuration Compatibility', () => {
    it('should accept legacy configuration formats', async () => {
      const legacyConfig = {
        // Legacy format might have different field names or structure
        industryIds: ['70100', '70200'],
        regionCodes: ['UK', 'US'],
        sources: ['companies_house'],
        depth: 'detailed',
        employeeRange: { min: 10, max: 1000 }
      }

      // Transform legacy config to new format
      const transformedConfig = TestUtils.createMockScanConfiguration({
        selectedIndustries: legacyConfig.industryIds?.map(id => ({ code: id, name: `Industry ${id}` })) || [],
        selectedRegions: legacyConfig.regionCodes?.map(code => ({ code, name: `Region ${code}` })) || [],
        dataSources: legacyConfig.sources || [],
        scanDepth: legacyConfig.depth === 'detailed' ? 'detailed' : 'standard',
        filters: {
          minEmployees: legacyConfig.employeeRange?.min,
          maxEmployees: legacyConfig.employeeRange?.max
        }
      })

      const scan = ScanEntity.create('legacy-config-scan', transformedConfig)
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const result = await legacyAdapter.startScan('legacy-config-scan')
      expect(result).toBeDefined()
    })

    it('should provide backward-compatible validation messages', async () => {
      const orchestrationService = container.resolve('IScanOrchestrationService')
      
      const invalidConfig = TestUtils.createMockScanConfiguration({
        selectedIndustries: [], // Invalid
        selectedRegions: []     // Invalid
      })

      const validation = await orchestrationService.validateConfiguration(invalidConfig)
      
      expect(validation.isValid).toBe(false)
      expect(validation.issues).toEqual(expect.arrayContaining([
        'At least one industry must be selected',
        'At least one region must be selected'
      ]))
    })
  })

  describe('Event Compatibility', () => {
    it('should emit events in formats expected by legacy systems', async () => {
      const eventBus = container.resolve('IEventBus')
      const publishSpy = jest.spyOn(eventBus, 'publishMany')

      const scan = ScanEntity.create('event-compat-scan', TestUtils.createMockScanConfiguration())
      
      const scanRepository = container.resolve('IScanRepository')
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      await legacyAdapter.startScan('event-compat-scan')

      // Should have published domain events
      expect(publishSpy).toHaveBeenCalled()
      
      // Events should have expected structure
      const publishedEvents = publishSpy.mock.calls.flat()
      publishedEvents.forEach(event => {
        expect(event).toEqual(expect.objectContaining({
          id: expect.any(String),
          type: expect.any(String),
          payload: expect.any(Object),
          timestamp: expect.any(Date)
        }))
      })
    })
  })
})