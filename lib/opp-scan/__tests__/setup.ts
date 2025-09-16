/**
 * Test Setup and Configuration
 * Global test setup, mocks, and utilities for the test suite
 */

import { jest } from '@jest/globals'

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(min: number, max: number): R
    }
  }
}

// Custom matcher for testing numeric ranges
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min} - ${max}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${min} - ${max}`,
        pass: false,
      }
    }
  },
})

// Mock console methods to reduce noise during tests
const originalConsole = { ...console }

beforeEach(() => {
  // Suppress console output during tests unless explicitly needed
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
})

afterEach(() => {
  // Restore console and clean up mocks
  jest.restoreAllMocks()
})

// Global test utilities
export const TestUtils = {
  /**
   * Creates a delay for testing async operations
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Waits for all pending promises to resolve
   */
  flushPromises: (): Promise<void> => {
    return new Promise(resolve => setImmediate(resolve))
  },

  /**
   * Creates a mock function that can be configured to succeed/fail
   */
  createMockOperation: (results: Array<'success' | 'error'> = ['success']) => {
    let callCount = 0
    return jest.fn().mockImplementation(() => {
      const result = results[callCount % results.length]
      callCount++
      
      if (result === 'success') {
        return Promise.resolve(`success-${callCount}`)
      } else {
        return Promise.reject(new Error(`error-${callCount}`))
      }
    })
  },

  /**
   * Creates mock company data for testing
   */
  createMockCompany: (overrides: Partial<any> = {}) => ({
    id: `company-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Company Ltd',
    country: 'UK',
    industryCodes: ['70100'],
    confidenceScore: 0.85,
    sourceMetadata: {
      source: 'test',
      discoveredAt: new Date(),
      confidence: 0.85
    },
    website: 'https://testcompany.com',
    registrationNumber: 'REG123456',
    ...overrides
  }),

  /**
   * Creates mock scan configuration for testing
   */
  createMockScanConfiguration: (overrides: Partial<any> = {}) => ({
    id: `scan-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user',
    name: 'Test Scan',
    selectedIndustries: [
      { code: '70100', name: 'Management consultancy' },
      { code: '70200', name: 'Management activities' }
    ],
    selectedRegions: [
      { code: 'UK', name: 'United Kingdom' },
      { code: 'US', name: 'United States' }
    ],
    dataSources: ['companies_house', 'crunchbase'],
    scanDepth: 'standard' as const,
    filters: {},
    ...overrides
  }),

  /**
   * Mock cost breakdown for testing
   */
  createMockCosts: (overrides: Partial<any> = {}) => ({
    totalCost: 123.45,
    currency: 'GBP',
    costBySource: {
      companies_house: 0,
      crunchbase: 123.45
    },
    requestCounts: {
      companies_house: { search: 10, details: 50 },
      crunchbase: { search: 8, details: 40 }
    },
    ...overrides
  }),

  /**
   * Enables console output for specific tests when debugging
   */
  enableConsole: () => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.debug = originalConsole.debug
  },

  /**
   * Advances fake timers and flushes promises
   */
  advanceTimersAndFlush: async (ms: number) => {
    jest.advanceTimersByTime(ms)
    await TestUtils.flushPromises()
  }
}

// Mock external dependencies that are commonly used
export const createMockDatabase = () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
})

export const createMockRedisClient = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  keys: jest.fn().mockResolvedValue([]),
  mget: jest.fn().mockResolvedValue([]),
  pipeline: jest.fn().mockReturnValue({
    setex: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  }),
  smembers: jest.fn().mockResolvedValue([]),
  sadd: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  info: jest.fn().mockResolvedValue('used_memory:1048576')
})

// Performance testing utilities
export const PerformanceTestUtils = {
  /**
   * Measures execution time of an operation
   */
  measureTime: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    const result = await operation()
    const end = performance.now()
    return { result, duration: end - start }
  },

  /**
   * Runs an operation multiple times and returns statistics
   */
  benchmark: async <T>(
    operation: () => Promise<T>,
    iterations: number = 10
  ): Promise<{
    mean: number
    min: number
    max: number
    results: T[]
  }> => {
    const durations: number[] = []
    const results: T[] = []

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await PerformanceTestUtils.measureTime(operation)
      durations.push(duration)
      results.push(result)
    }

    return {
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      results
    }
  }
}

// Test data builders
export const TestDataBuilder = {
  company: () => ({
    withId: (id: string) => ({ ...TestUtils.createMockCompany({ id }) }),
    withName: (name: string) => ({ ...TestUtils.createMockCompany({ name }) }),
    withConfidence: (score: number) => ({ ...TestUtils.createMockCompany({ confidenceScore: score }) }),
    withIndustry: (code: string) => ({ ...TestUtils.createMockCompany({ industryCodes: [code] }) }),
  }),

  scan: () => ({
    withId: (id: string) => ({ ...TestUtils.createMockScanConfiguration({ id }) }),
    withName: (name: string) => ({ ...TestUtils.createMockScanConfiguration({ name }) }),
    withIndustries: (industries: unknown[]) => ({ ...TestUtils.createMockScanConfiguration({ selectedIndustries: industries }) }),
    withSources: (sources: string[]) => ({ ...TestUtils.createMockScanConfiguration({ dataSources: sources }) }),
  })
}

// Integration test helpers
export const IntegrationTestHelpers = {
  /**
   * Creates a test container with mocked external dependencies
   */
  createTestContainer: () => {
    // This would return a configured container with test doubles
    // Implementation would depend on your actual container setup
    return {
      database: createMockDatabase(),
      redis: createMockRedisClient(),
      // Add other common dependencies
    }
  },

  /**
   * Sets up test database with required schema
   */
  setupTestDatabase: async () => {
    // Implementation would set up test database schema
    // This is a placeholder for the actual implementation
    return Promise.resolve()
  },

  /**
   * Cleans up test database
   */
  cleanupTestDatabase: async () => {
    // Implementation would clean up test database
    return Promise.resolve()
  }
}

// Export commonly used mocks
export {
  createMockDatabase,
  createMockRedisClient
}