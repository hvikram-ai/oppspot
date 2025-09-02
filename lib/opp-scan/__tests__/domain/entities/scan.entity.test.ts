/**
 * Scan Entity Unit Tests
 * Tests the business logic and state transitions of the Scan domain entity
 */

import { ScanEntity } from '../../../domain/entities/scan.entity'
import { 
  ScanCreatedEvent, 
  ScanStartedEvent, 
  ScanProgressUpdatedEvent,
  ScanCompletedEvent,
  ScanFailedEvent,
  ScanCancelledEvent
} from '../../../domain/events/scan.events'

describe('ScanEntity', () => {
  const mockConfiguration = {
    id: 'scan-123',
    userId: 'user-123',
    name: 'Test Scan',
    selectedIndustries: [
      { code: '70100', name: 'Activities of head offices' },
      { code: '70200', name: 'Management consultancy activities' }
    ],
    selectedRegions: [
      { code: 'UK', name: 'United Kingdom' },
      { code: 'US', name: 'United States' }
    ],
    dataSources: ['companies_house', 'crunchbase'],
    scanDepth: 'standard' as const,
    filters: {
      minEmployees: 10,
      maxEmployees: 1000,
      minRevenue: 100000,
      maxRevenue: 50000000
    }
  }

  describe('Creation and Validation', () => {
    it('should create a valid scan entity', () => {
      const scan = ScanEntity.create('scan-123', mockConfiguration)

      expect(scan.id).toBe('scan-123')
      expect(scan.configuration).toEqual(mockConfiguration)
      expect(scan.status).toBe('configuring')
      expect(scan.progress).toBe(0)
      expect(scan.currentStage).toBe('initialization')
      expect(scan.companiesDiscovered).toBe(0)
      expect(scan.companiesAnalyzed).toBe(0)
    })

    it('should raise domain event on creation', () => {
      const scan = ScanEntity.create('scan-123', mockConfiguration)

      expect(scan.domainEvents).toHaveLength(1)
      expect(scan.domainEvents[0]).toBeInstanceOf(ScanCreatedEvent)
      
      const event = scan.domainEvents[0] as ScanCreatedEvent
      expect(event.payload.scanId).toBe('scan-123')
      expect(event.payload.userId).toBe('user-123')
      expect(event.payload.name).toBe('Test Scan')
    })

    it('should validate required configuration fields', () => {
      expect(() => {
        const invalidConfig = { ...mockConfiguration, id: '' }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have a valid ID')

      expect(() => {
        const invalidConfig = { ...mockConfiguration, userId: '' }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have a valid user ID')

      expect(() => {
        const invalidConfig = { ...mockConfiguration, name: '' }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have a valid name')

      expect(() => {
        const invalidConfig = { ...mockConfiguration, selectedIndustries: [] }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have at least one selected industry')

      expect(() => {
        const invalidConfig = { ...mockConfiguration, selectedRegions: [] }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have at least one selected region')

      expect(() => {
        const invalidConfig = { ...mockConfiguration, dataSources: [] }
        ScanEntity.create('scan-123', invalidConfig)
      }).toThrow('Scan configuration must have at least one data source')
    })
  })

  describe('State Transitions', () => {
    let scan: ScanEntity

    beforeEach(() => {
      scan = ScanEntity.create('scan-123', mockConfiguration)
      scan.markEventsAsHandled() // Clear creation event
    })

    describe('Starting a Scan', () => {
      it('should start a scan successfully', () => {
        const estimatedCompletion = new Date(Date.now() + 3600000) // 1 hour from now
        scan.start(estimatedCompletion)

        expect(scan.status).toBe('scanning')
        expect(scan.currentStage).toBe('initialization')
        expect(scan.progress).toBe(0)
        expect(scan.startedAt).toBeDefined()
        expect(scan.estimatedCompletion).toEqual(estimatedCompletion)
      })

      it('should raise scan started event', () => {
        scan.start()

        expect(scan.domainEvents).toHaveLength(1)
        expect(scan.domainEvents[0]).toBeInstanceOf(ScanStartedEvent)
        
        const event = scan.domainEvents[0] as ScanStartedEvent
        expect(event.payload.scanId).toBe('scan-123')
        expect(event.payload.userId).toBe('user-123')
      })

      it('should not start a scan that is already running', () => {
        scan.start()
        expect(() => scan.start()).toThrow('Cannot start scan in scanning status')
      })

      it('should allow restarting a failed scan', () => {
        // First start the scan
        scan.start()
        // Then fail it
        scan.fail({
          message: 'Test error',
          severity: 'critical',
          isRetryable: true,
          timestamp: new Date(),
          context: {}
        })
        // Clear events
        scan.markEventsAsHandled()
        
        // Should be able to restart
        expect(() => scan.start()).not.toThrow()
        expect(scan.status).toBe('scanning')
      })
    })

    describe('Progress Updates', () => {
      beforeEach(() => {
        scan.start()
        scan.markEventsAsHandled()
      })

      it('should update progress successfully', () => {
        scan.updateProgress(25, 'data_collection', 10, 5)

        expect(scan.progress).toBe(25)
        expect(scan.currentStage).toBe('data_collection')
        expect(scan.companiesDiscovered).toBe(10)
        expect(scan.companiesAnalyzed).toBe(5)
      })

      it('should raise progress updated event', () => {
        scan.updateProgress(25, 'data_collection', 10, 5)

        expect(scan.domainEvents).toHaveLength(1)
        expect(scan.domainEvents[0]).toBeInstanceOf(ScanProgressUpdatedEvent)
        
        const event = scan.domainEvents[0] as ScanProgressUpdatedEvent
        expect(event.payload.scanId).toBe('scan-123')
        expect(event.payload.newProgress).toBe(25)
        expect(event.payload.newStage).toBe('data_collection')
        expect(event.payload.companiesDiscovered).toBe(10)
        expect(event.payload.companiesAnalyzed).toBe(5)
      })

      it('should validate progress range', () => {
        expect(() => {
          scan.updateProgress(-5, 'data_collection')
        }).toThrow('Progress must be between 0 and 100')

        expect(() => {
          scan.updateProgress(105, 'data_collection')
        }).toThrow('Progress must be between 0 and 100')
      })

      it('should prevent progress from decreasing', () => {
        scan.updateProgress(50, 'analysis')
        
        expect(() => {
          scan.updateProgress(25, 'data_collection')
        }).toThrow('Progress cannot decrease')
      })

      it('should only increase company counts', () => {
        scan.updateProgress(25, 'data_collection', 10, 5)
        scan.updateProgress(50, 'analysis', 8, 10) // Discovered decreased, but should stay the same
        
        expect(scan.companiesDiscovered).toBe(10) // Should not decrease
        expect(scan.companiesAnalyzed).toBe(10) // Should increase
      })

      it('should update estimated completion time', () => {
        const initialEstimation = scan.estimatedCompletion

        scan.updateProgress(50, 'analysis')
        
        expect(scan.estimatedCompletion).toBeDefined()
        expect(scan.estimatedCompletion).not.toEqual(initialEstimation)
      })
    })

    describe('Completing a Scan', () => {
      const mockCosts = {
        totalCost: 123.45,
        currency: 'GBP',
        costBySource: {
          companies_house: 0,
          crunchbase: 123.45
        },
        requestCounts: {
          companies_house: { search: 10, details: 50 },
          crunchbase: { search: 8, details: 40 }
        }
      }

      beforeEach(() => {
        scan.start()
        scan.updateProgress(50, 'analysis', 100, 75)
        scan.markEventsAsHandled()
      })

      it('should complete a scan successfully', () => {
        scan.complete(mockCosts)

        expect(scan.status).toBe('completed')
        expect(scan.progress).toBe(100)
        expect(scan.currentStage).toBe('finalization')
        expect(scan.completedAt).toBeDefined()
        expect(scan.costs).toEqual(mockCosts)
      })

      it('should raise scan completed event', () => {
        scan.complete(mockCosts)

        expect(scan.domainEvents).toHaveLength(1)
        expect(scan.domainEvents[0]).toBeInstanceOf(ScanCompletedEvent)
        
        const event = scan.domainEvents[0] as ScanCompletedEvent
        expect(event.payload.scanId).toBe('scan-123')
        expect(event.payload.companiesDiscovered).toBe(100)
        expect(event.payload.companiesAnalyzed).toBe(75)
        expect(event.payload.finalCosts).toEqual(mockCosts)
      })

      it('should calculate success rate correctly', () => {
        scan.complete(mockCosts)
        
        const event = scan.domainEvents[0] as ScanCompletedEvent
        expect(event.payload.successRate).toBe(75) // 75/100 * 100
      })

      it('should not complete a scan that is not running', () => {
        scan.cancel('Test cancellation')
        
        expect(() => {
          scan.complete(mockCosts)
        }).toThrow('Cannot complete scan in cancelled status')
      })
    })

    describe('Failing a Scan', () => {
      const mockError = {
        message: 'API rate limit exceeded',
        severity: 'high' as const,
        isRetryable: true,
        timestamp: new Date(),
        context: { source: 'crunchbase' }
      }

      beforeEach(() => {
        scan.start()
        scan.updateProgress(30, 'data_collection', 50, 20)
        scan.markEventsAsHandled()
      })

      it('should fail a scan successfully', () => {
        scan.fail(mockError)

        expect(scan.status).toBe('failed')
        expect(scan.completedAt).toBeDefined()
        expect(scan.hasErrors()).toBe(true)
        expect(scan.errors).toHaveLength(1)
      })

      it('should raise scan failed event', () => {
        scan.fail(mockError)

        expect(scan.domainEvents).toHaveLength(1)
        expect(scan.domainEvents[0]).toBeInstanceOf(ScanFailedEvent)
        
        const event = scan.domainEvents[0] as ScanFailedEvent
        expect(event.payload.scanId).toBe('scan-123')
        expect(event.payload.error).toEqual(mockError)
        expect(event.payload.progressAtFailure).toBe(30)
        expect(event.payload.companiesDiscovered).toBe(50)
        expect(event.payload.isRetryable).toBe(true)
      })

      it('should determine failure stage correctly', () => {
        scan.updateProgress(5, 'initialization')
        scan.fail(mockError)
        
        const event = scan.domainEvents[0] as ScanFailedEvent
        expect(event.payload.failureStage).toBe('initialization')

        scan.markEventsAsHandled()
        scan.updateProgress(25, 'data_collection')
        scan.fail(mockError)
        
        const event2 = scan.domainEvents[0] as ScanFailedEvent
        expect(event2.payload.failureStage).toBe('data_collection')
      })
    })

    describe('Cancelling a Scan', () => {
      beforeEach(() => {
        scan.start()
        scan.updateProgress(40, 'analysis', 80, 30)
        scan.markEventsAsHandled()
      })

      it('should cancel a scan successfully', () => {
        scan.cancel('User requested cancellation')

        expect(scan.status).toBe('cancelled')
        expect(scan.completedAt).toBeDefined()
      })

      it('should raise scan cancelled event', () => {
        scan.cancel('User requested cancellation')

        expect(scan.domainEvents).toHaveLength(1)
        expect(scan.domainEvents[0]).toBeInstanceOf(ScanCancelledEvent)
        
        const event = scan.domainEvents[0] as ScanCancelledEvent
        expect(event.payload.scanId).toBe('scan-123')
        expect(event.payload.reason).toBe('User requested cancellation')
        expect(event.payload.progressAtCancellation).toBe(40)
        expect(event.payload.companiesDiscovered).toBe(80)
      })

      it('should not cancel a completed scan', () => {
        const mockCosts = {
          totalCost: 100,
          currency: 'GBP',
          costBySource: {},
          requestCounts: {}
        }
        scan.complete(mockCosts)
        
        expect(() => {
          scan.cancel('Too late')
        }).toThrow('Cannot cancel scan in completed status')
      })
    })

    describe('Pause and Resume', () => {
      beforeEach(() => {
        scan.start()
        scan.updateProgress(30, 'data_collection')
        scan.markEventsAsHandled()
      })

      it('should pause a running scan', () => {
        scan.pause()
        expect(scan.status).toBe('paused')
      })

      it('should resume a paused scan', () => {
        scan.pause()
        scan.resume()
        expect(scan.status).toBe('scanning')
      })

      it('should not pause a completed scan', () => {
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        
        expect(() => scan.pause()).toThrow('Cannot pause scan in completed status')
      })

      it('should not resume a non-paused scan', () => {
        expect(() => scan.resume()).toThrow('Cannot resume scan in scanning status')
      })
    })
  })

  describe('Business Logic Methods', () => {
    let scan: ScanEntity

    beforeEach(() => {
      scan = ScanEntity.create('scan-123', mockConfiguration)
    })

    describe('Status Checking', () => {
      it('should identify in-progress scans correctly', () => {
        expect(scan.isInProgress()).toBe(false)
        
        scan.start()
        expect(scan.isInProgress()).toBe(true)
        
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        expect(scan.isInProgress()).toBe(false)
      })

      it('should identify completed scans correctly', () => {
        expect(scan.isCompleted()).toBe(false)
        
        scan.start()
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        expect(scan.isCompleted()).toBe(true)
      })

      it('should identify failed scans correctly', () => {
        expect(scan.isFailed()).toBe(false)
        
        scan.start()
        scan.fail({
          message: 'Test error',
          severity: 'critical',
          isRetryable: false,
          timestamp: new Date(),
          context: {}
        })
        expect(scan.isFailed()).toBe(true)
      })

      it('should identify cancelled scans correctly', () => {
        expect(scan.isCancelled()).toBe(false)
        
        scan.start()
        scan.cancel('Test cancellation')
        expect(scan.isCancelled()).toBe(true)
      })
    })

    describe('Capability Checking', () => {
      beforeEach(() => {
        scan.start()
      })

      it('should identify when scan can be cancelled', () => {
        expect(scan.canBeCancelled()).toBe(true)
        
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        expect(scan.canBeCancelled()).toBe(false)
      })

      it('should identify when scan can be paused', () => {
        expect(scan.canBePaused()).toBe(true)
        
        scan.pause()
        expect(scan.canBePaused()).toBe(false)
      })

      it('should identify when scan can be resumed', () => {
        expect(scan.canBeResumed()).toBe(false)
        
        scan.pause()
        expect(scan.canBeResumed()).toBe(true)
      })
    })

    describe('Error Management', () => {
      beforeEach(() => {
        scan.start()
      })

      it('should track errors correctly', () => {
        expect(scan.hasErrors()).toBe(false)
        expect(scan.hasCriticalErrors()).toBe(false)
        
        scan.addError({
          message: 'Minor error',
          severity: 'low',
          isRetryable: true,
          timestamp: new Date(),
          context: {}
        })
        
        expect(scan.hasErrors()).toBe(true)
        expect(scan.hasCriticalErrors()).toBe(false)
        
        scan.addError({
          message: 'Critical error',
          severity: 'critical',
          isRetryable: false,
          timestamp: new Date(),
          context: {}
        })
        
        expect(scan.hasCriticalErrors()).toBe(true)
      })

      it('should get high severity errors', () => {
        scan.addError({
          message: 'Low error',
          severity: 'low',
          isRetryable: true,
          timestamp: new Date(),
          context: {}
        })
        
        scan.addError({
          message: 'High error',
          severity: 'high',
          isRetryable: true,
          timestamp: new Date(),
          context: {}
        })
        
        scan.addError({
          message: 'Critical error',
          severity: 'critical',
          isRetryable: false,
          timestamp: new Date(),
          context: {}
        })
        
        const highSeverityErrors = scan.getHighSeverityErrors()
        expect(highSeverityErrors).toHaveLength(2)
        expect(highSeverityErrors.some(e => e.message === 'High error')).toBe(true)
        expect(highSeverityErrors.some(e => e.message === 'Critical error')).toBe(true)
      })

      it('should automatically fail scan on critical error', () => {
        scan.addError({
          message: 'Critical error',
          severity: 'critical',
          isRetryable: false,
          timestamp: new Date(),
          context: {}
        })
        
        expect(scan.status).toBe('failed')
      })
    })

    describe('Metrics and Calculations', () => {
      beforeEach(() => {
        scan.start()
        scan.updateProgress(75, 'analysis', 100, 80)
      })

      it('should calculate duration correctly', () => {
        expect(scan.getDuration()).toBeGreaterThan(0)
        
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        expect(scan.getDuration()).toBeGreaterThan(0)
      })

      it('should calculate efficiency score correctly', () => {
        expect(scan.getEfficiencyScore()).toBe(80) // 80/100 * 100
      })

      it('should calculate cost efficiency correctly', () => {
        scan.updateCosts({
          totalCost: 50,
          currency: 'GBP',
          costBySource: {},
          requestCounts: {}
        })
        expect(scan.getCostEfficiency()).toBe(1.6) // 80/50
      })

      it('should calculate estimated time remaining', () => {
        const estimatedCompletion = new Date(Date.now() + 60000) // 1 minute from now
        scan = ScanEntity.create('scan-123', mockConfiguration)
        scan.start(estimatedCompletion)
        
        const timeRemaining = scan.getEstimatedTimeRemaining()
        expect(timeRemaining).toBeGreaterThan(0)
        expect(timeRemaining).toBeLessThanOrEqual(60000)
      })

      it('should return null time remaining for completed scans', () => {
        const mockCosts = { totalCost: 100, currency: 'GBP', costBySource: {}, requestCounts: {} }
        scan.complete(mockCosts)
        
        expect(scan.getEstimatedTimeRemaining()).toBeNull()
      })
    })
  })

  describe('Serialization', () => {
    let scan: ScanEntity

    beforeEach(() => {
      scan = ScanEntity.create('scan-123', mockConfiguration)
      scan.start()
      scan.updateProgress(50, 'analysis', 100, 75)
    })

    it('should serialize to JSON correctly', () => {
      const json = scan.toJSON()
      
      expect(json.id).toBe('scan-123')
      expect(json.configuration).toEqual(mockConfiguration)
      expect(json.status).toBe('scanning')
      expect(json.progress).toBe(50)
      expect(json.currentStage).toBe('analysis')
      expect(json.companiesDiscovered).toBe(100)
      expect(json.companiesAnalyzed).toBe(75)
      expect(typeof json.createdAt).toBe('string')
      expect(typeof json.updatedAt).toBe('string')
      expect(typeof json.startedAt).toBe('string')
    })

    it('should deserialize from JSON correctly', () => {
      const json = scan.toJSON()
      const deserializedScan = ScanEntity.fromJSON(json)
      
      expect(deserializedScan.id).toBe(scan.id)
      expect(deserializedScan.configuration).toEqual(scan.configuration)
      expect(deserializedScan.status).toBe(scan.status)
      expect(deserializedScan.progress).toBe(scan.progress)
      expect(deserializedScan.currentStage).toBe(scan.currentStage)
      expect(deserializedScan.companiesDiscovered).toBe(scan.companiesDiscovered)
      expect(deserializedScan.companiesAnalyzed).toBe(scan.companiesAnalyzed)
    })

    it('should handle round-trip serialization', () => {
      const json = scan.toJSON()
      const deserializedScan = ScanEntity.fromJSON(json)
      const json2 = deserializedScan.toJSON()
      
      expect(json).toEqual(json2)
    })
  })
})