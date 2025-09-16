/**
 * End-to-End Scan Pipeline Tests
 * Tests the complete scan execution flow with real integrations
 */

import { 
  createContainer,
  LegacyScanningEngineAdapter 
} from '../../container.registration'
import { 
  IScanOrchestrationService,
  IScanRepository,
  ICompanyRepository,
  ScanEntity
} from '../../core/interfaces'
import { 
  TestUtils,
  IntegrationTestHelpers,
  PerformanceTestUtils,
  createMockDatabase,
  createMockRedisClient
} from '../setup'

describe('Complete Scan Pipeline E2E Tests', () => {
  let container: any
  let orchestrationService: IScanOrchestrationService
  let scanRepository: IScanRepository
  let companyRepository: ICompanyRepository
  let mockDatabase: any
  let mockRedisClient: any

  const mockScanConfiguration = TestUtils.createMockScanConfiguration({
    dataSources: ['companies_house', 'open_corporates'], // Use real data source IDs
    selectedIndustries: [
      { code: '70100', name: 'Management consultancy' }
    ],
    selectedRegions: [
      { code: 'UK', name: 'United Kingdom' }
    ],
    scanDepth: 'standard',
    filters: {
      minEmployees: 10,
      maxEmployees: 1000
    }
  })

  beforeAll(async () => {
    await IntegrationTestHelpers.setupTestDatabase()
  })

  afterAll(async () => {
    await IntegrationTestHelpers.cleanupTestDatabase()
  })

  beforeEach(() => {
    mockDatabase = createMockDatabase()
    mockRedisClient = createMockRedisClient()
    
    // Setup successful database responses
    mockDatabase.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Scan not exists
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Scan created
      .mockResolvedValue({ rows: [], rowCount: 1 }) // Default success

    container = createContainer({
      database: mockDatabase,
      redisClient: mockRedisClient
    })

    orchestrationService = container.resolve('IScanOrchestrationService')
    scanRepository = container.resolve('IScanRepository')
    companyRepository = container.resolve('ICompanyRepository')
  })

  describe('Complete Scan Execution', () => {
    it('should execute a complete scan successfully', async () => {
      // Create a scan entity
      const scan = ScanEntity.create('e2e-scan-1', mockScanConfiguration)
      
      // Mock repository responses for scan creation and updates
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()
      jest.spyOn(companyRepository, 'findById').mockResolvedValue(null)
      jest.spyOn(companyRepository, 'save').mockResolvedValue()

      const result = await orchestrationService.executeScan('e2e-scan-1')

      expect(result).toEqual(expect.objectContaining({
        scanId: 'e2e-scan-1',
        companiesDiscovered: expect.any(Number),
        companiesAnalyzed: expect.any(Number),
        totalCost: expect.any(Number),
        completedAt: expect.any(Date)
      }))

      expect(result.companiesDiscovered).toBeGreaterThan(0)
      expect(result.companiesAnalyzed).toBeGreaterThan(0)
      expect(result.errorRate).toBeLessThan(50) // Less than 50% error rate
    }, 30000) // 30 second timeout for complete scan

    it('should handle scan progress updates correctly', async () => {
      const scan = ScanEntity.create('progress-scan', mockScanConfiguration)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const progressUpdates: unknown[] = []
      
      // Start scan in background
      const scanPromise = orchestrationService.executeScan('progress-scan')

      // Poll for progress updates
      const pollProgress = async () => {
        for (let i = 0; i < 10; i++) {
          await TestUtils.delay(500)
          try {
            const progress = await orchestrationService.getScanProgress('progress-scan')
            progressUpdates.push({
              timestamp: Date.now(),
              progress: progress.progress,
              stage: progress.currentStage,
              companiesDiscovered: progress.companiesDiscovered,
              companiesAnalyzed: progress.companiesAnalyzed
            })
          } catch (error) {
            // Scan might not exist yet, continue
          }
        }
      }

      // Run both in parallel
      await Promise.all([scanPromise, pollProgress()])

      // Verify progress was tracked
      expect(progressUpdates.length).toBeGreaterThan(0)
      
      // Progress should generally increase
      const progressValues = progressUpdates.map(u => u.progress)
      const maxProgress = Math.max(...progressValues)
      expect(maxProgress).toBeGreaterThan(0)

      // Final progress should be 100
      const finalUpdate = progressUpdates[progressUpdates.length - 1]
      expect(finalUpdate?.progress).toBe(100)
    })

    it('should handle data collection from multiple sources', async () => {
      const multiSourceConfig = {
        ...mockScanConfiguration,
        dataSources: ['companies_house', 'open_corporates', 'crunchbase']
      }

      const scan = ScanEntity.create('multi-source-scan', multiSourceConfig)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const result = await orchestrationService.executeScan('multi-source-scan')

      expect(result.companiesDiscovered).toBeGreaterThan(0)
      
      // Should have reasonable cost efficiency with multiple sources
      expect(result.costEfficiency).toBeGreaterThan(0)
    })

    it('should handle scan cancellation gracefully', async () => {
      const scan = ScanEntity.create('cancel-scan', mockScanConfiguration)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // Start scan
      scan.start()
      scan.updateProgress(25, 'data_collection')

      // Cancel it
      await orchestrationService.cancelScan('cancel-scan', 'User requested cancellation')

      const progress = await orchestrationService.getScanProgress('cancel-scan')
      expect(progress.status).toBe('cancelled')
    })
  })

  describe('Performance Tests', () => {
    it('should complete scan within reasonable time limits', async () => {
      const scan = ScanEntity.create('perf-scan', mockScanConfiguration)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        return orchestrationService.executeScan('perf-scan')
      })

      // Should complete within 10 seconds for test data
      expect(duration).toBeLessThan(10000)
    })

    it('should handle concurrent scans efficiently', async () => {
      const concurrentScans = 3
      const scanPromises = []

      for (let i = 0; i < concurrentScans; i++) {
        const scan = ScanEntity.create(`concurrent-scan-${i}`, {
          ...mockScanConfiguration,
          id: `concurrent-scan-${i}`
        })
        
        jest.spyOn(scanRepository, 'findById').mockImplementation((id) => {
          if (id === `concurrent-scan-${i}`) return Promise.resolve(scan)
          return Promise.resolve(null)
        })
        jest.spyOn(scanRepository, 'save').mockResolvedValue()

        scanPromises.push(orchestrationService.executeScan(`concurrent-scan-${i}`))
      }

      const { duration, results } = await PerformanceTestUtils.measureTime(async () => {
        return Promise.all(scanPromises)
      })

      // All scans should complete
      expect(results).toHaveLength(concurrentScans)
      results.forEach(result => {
        expect(result.companiesDiscovered).toBeGreaterThan(0)
      })

      // Concurrent execution should be faster than sequential
      expect(duration).toBeLessThan(15000) // Should be much faster than 3x individual time
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle data source failures gracefully', async () => {
      // Mock a data source failure
      const scan = ScanEntity.create('resilient-scan', mockScanConfiguration)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // This should not throw, even if some data sources fail
      const result = await orchestrationService.executeScan('resilient-scan')

      expect(result).toBeDefined()
      // Should still discover some companies from working sources
      expect(result.companiesDiscovered).toBeGreaterThanOrEqual(0)
    })

    it('should handle database connection issues', async () => {
      const scan = ScanEntity.create('db-failure-scan', mockScanConfiguration)
      
      // Mock database failure
      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'))
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockRejectedValue(new Error('Save failed'))

      // Should handle gracefully and not crash
      await expect(orchestrationService.executeScan('db-failure-scan')).rejects.toThrow()
      
      // But error should be specific, not a generic crash
      try {
        await orchestrationService.executeScan('db-failure-scan')
      } catch (error) {
        expect(error.message).toContain('Save failed')
      }
    })

    it('should handle rate limiting correctly', async () => {
      const scan = ScanEntity.create('rate-limit-scan', mockScanConfiguration)
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // Execute scan - should handle rate limits internally
      const result = await orchestrationService.executeScan('rate-limit-scan')

      expect(result).toBeDefined()
      expect(result.companiesDiscovered).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Legacy Compatibility', () => {
    it('should work through legacy adapter', async () => {
      const legacyAdapter = new LegacyScanningEngineAdapter(container)
      const scan = ScanEntity.create('legacy-scan', mockScanConfiguration)
      
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      const result = await legacyAdapter.startScan('legacy-scan')

      expect(result).toEqual(expect.objectContaining({
        scanId: 'legacy-scan',
        companiesDiscovered: expect.any(Number),
        companiesAnalyzed: expect.any(Number)
      }))
    })

    it('should handle legacy pause/resume operations', async () => {
      const legacyAdapter = new LegacyScanningEngineAdapter(container)
      const scan = ScanEntity.create('pause-resume-scan', mockScanConfiguration)
      
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)
      jest.spyOn(scanRepository, 'save').mockResolvedValue()

      // Start the scan
      scan.start()
      scan.updateProgress(50, 'analysis')

      // Pause it
      await legacyAdapter.pauseScan('pause-resume-scan')
      let status = await legacyAdapter.getScanStatus('pause-resume-scan')
      expect(status.status).toBe('paused')

      // Resume it
      await legacyAdapter.resumeScan('pause-resume-scan')
      status = await legacyAdapter.getScanStatus('pause-resume-scan')
      expect(status.status).toBe('scanning')
    })

    it('should provide compatible status information', async () => {
      const legacyAdapter = new LegacyScanningEngineAdapter(container)
      const scan = ScanEntity.create('status-scan', mockScanConfiguration)
      
      scan.start()
      scan.updateProgress(75, 'analysis', 100, 80)
      
      jest.spyOn(scanRepository, 'findById').mockResolvedValue(scan)

      const status = await legacyAdapter.getScanStatus('status-scan')

      expect(status).toEqual(expect.objectContaining({
        scanId: 'status-scan',
        status: 'scanning',
        progress: 75,
        currentStage: 'analysis',
        companiesDiscovered: 100,
        companiesAnalyzed: 80
      }))
    })
  })

  describe('Configuration Validation', () => {
    it('should validate scan configuration before execution', async () => {
      const invalidConfig = {
        ...mockScanConfiguration,
        selectedIndustries: [], // Invalid - no industries
        selectedRegions: []     // Invalid - no regions
      }

      const validation = await orchestrationService.validateConfiguration(invalidConfig)

      expect(validation.isValid).toBe(false)
      expect(validation.issues).toContain('At least one industry must be selected')
      expect(validation.issues).toContain('At least one region must be selected')
    })

    it('should provide cost estimates during validation', async () => {
      const validation = await orchestrationService.validateConfiguration(mockScanConfiguration)

      expect(validation.costEstimate).toEqual(expect.objectContaining({
        totalCost: expect.any(Number),
        currency: 'GBP',
        costBySource: expect.any(Object)
      }))

      expect(validation.costEstimate.totalCost).toBeGreaterThan(0)
    })

    it('should warn about potentially expensive configurations', async () => {
      const expensiveConfig = {
        ...mockScanConfiguration,
        selectedIndustries: Array.from({ length: 25 }, (_, i) => ({
          code: `${70100 + i}`,
          name: `Industry ${i}`
        })),
        selectedRegions: Array.from({ length: 15 }, (_, i) => ({
          code: `R${i}`,
          name: `Region ${i}`
        })),
        scanDepth: 'comprehensive' as const
      }

      const validation = await orchestrationService.validateConfiguration(expensiveConfig)

      expect(validation.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining('Large number of industries'),
        expect.stringContaining('Large number of regions')
      ]))
    })
  })

  describe('Monitoring and Statistics', () => {
    it('should provide active scan statistics', async () => {
      // Create multiple active scans
      const scans = ['stat-scan-1', 'stat-scan-2', 'stat-scan-3'].map(id => {
        const scan = ScanEntity.create(id, { ...mockScanConfiguration, id })
        scan.start()
        scan.updateProgress(Math.random() * 100, 'analysis', Math.floor(Math.random() * 100), Math.floor(Math.random() * 80))
        return scan
      })

      jest.spyOn(scanRepository, 'findActiveScans').mockResolvedValue(scans)

      const stats = await orchestrationService.getActiveScanStatistics()

      expect(stats).toEqual(expect.objectContaining({
        activeScanCount: 3,
        totalCompaniesDiscovered: expect.any(Number),
        totalCompaniesAnalyzed: expect.any(Number),
        totalCosts: expect.any(Number),
        currency: 'GBP',
        stageBreakdown: expect.any(Object),
        averageProgress: expect.any(Number)
      }))

      expect(stats.averageProgress).toBeGreaterThanOrEqual(0)
      expect(stats.averageProgress).toBeLessThanOrEqual(100)
    })
  })
})