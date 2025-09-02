/**
 * Circuit Breaker Tests
 * Tests the circuit breaker resilience pattern implementation
 */

import { 
  CircuitBreaker, 
  CircuitBreakerState,
  CircuitBreakerOpenError,
  CircuitBreakerOptions 
} from '../../../infrastructure/resilience/circuit-breaker'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker
  let mockOperation: jest.Mock

  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 3,
    resetTimeout: 1000,
    monitoringPeriod: 5000,
    name: 'test-circuit'
  }

  beforeEach(() => {
    mockOperation = jest.fn()
    circuitBreaker = new CircuitBreaker(defaultOptions)
  })

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should have zero failure count initially', () => {
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failureCount).toBe(0)
      expect(metrics.totalRequests).toBe(0)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.totalSuccesses).toBe(0)
    })
  })

  describe('Successful Operations', () => {
    it('should execute operation successfully when closed', async () => {
      mockOperation.mockResolvedValue('success')

      const result = await circuitBreaker.execute(mockOperation)

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should track successful operations in metrics', async () => {
      mockOperation.mockResolvedValue('success')

      await circuitBreaker.execute(mockOperation)
      await circuitBreaker.execute(mockOperation)

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(2)
      expect(metrics.totalSuccesses).toBe(2)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.failureRate).toBe(0)
    })

    it('should reset failure count on successful operation', async () => {
      // Cause some failures first
      mockOperation.mockRejectedValue(new Error('failure'))
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      expect(circuitBreaker.getMetrics().failureCount).toBe(2)

      // Then succeed
      mockOperation.mockResolvedValue('success')
      await circuitBreaker.execute(mockOperation)

      expect(circuitBreaker.getMetrics().failureCount).toBe(0)
    })
  })

  describe('Failed Operations', () => {
    it('should track failed operations in metrics', async () => {
      mockOperation.mockRejectedValue(new Error('failure'))

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.totalSuccesses).toBe(0)
      expect(metrics.totalFailures).toBe(1)
      expect(metrics.failureCount).toBe(1)
      expect(metrics.failureRate).toBe(100)
    })

    it('should remain closed until failure threshold is reached', async () => {
      mockOperation.mockRejectedValue(new Error('failure'))

      // Fail twice (below threshold of 3)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)

      // Third failure should open the circuit
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should not count expected errors as failures', async () => {
      const cbWithExpectedErrors = new CircuitBreaker({
        ...defaultOptions,
        expectedErrors: ['expected']
      })

      mockOperation.mockRejectedValue(new Error('expected error'))

      // Should not count towards failure threshold
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('expected error')
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('expected error')
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('expected error')

      expect(cbWithExpectedErrors.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(cbWithExpectedErrors.getMetrics().failureCount).toBe(0)
    })
  })

  describe('OPEN State Behavior', () => {
    beforeEach(async () => {
      // Open the circuit by exceeding failure threshold
      mockOperation.mockRejectedValue(new Error('failure'))
      
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should reject operations immediately when open', async () => {
      mockOperation.mockResolvedValue('success')

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(CircuitBreakerOpenError)
      
      // Operation should not have been called
      expect(mockOperation).toHaveBeenCalledTimes(3) // Only the initial failures
    })

    it('should provide time until next attempt in error message', async () => {
      mockOperation.mockResolvedValue('success')

      try {
        await circuitBreaker.execute(mockOperation)
        fail('Should have thrown CircuitBreakerOpenError')
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError)
        expect(error.message).toContain('Next attempt in')
      }
    })

    it('should transition to HALF_OPEN after reset timeout', async () => {
      jest.useFakeTimers()

      // Advance time past reset timeout
      jest.advanceTimersByTime(1001)

      mockOperation.mockResolvedValue('success')
      await circuitBreaker.execute(mockOperation)

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)

      jest.useRealTimers()
    })

    it('should track time until next attempt in metrics', () => {
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.timeUntilNextAttempt).toBeGreaterThan(0)
      expect(metrics.timeUntilNextAttempt).toBeLessThanOrEqual(1000)
    })
  })

  describe('HALF_OPEN State Behavior', () => {
    beforeEach(async () => {
      jest.useFakeTimers()

      // Open the circuit
      mockOperation.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      }

      // Advance time to trigger transition to HALF_OPEN
      jest.advanceTimersByTime(1001)

      // Clear the mock to track new calls
      mockOperation.mockClear()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should transition to CLOSED on successful operation', async () => {
      mockOperation.mockResolvedValue('success')

      // Need multiple successes to close (threshold/2 = 2 successes needed)
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should transition back to OPEN on failure', async () => {
      mockOperation.mockRejectedValue(new Error('still failing'))

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('still failing')

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should require multiple successes before closing', async () => {
      mockOperation.mockResolvedValue('success')

      // First success - should stay HALF_OPEN
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      // Second success - should transition to CLOSED
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('Manual Operations', () => {
    it('should reset circuit breaker manually', async () => {
      // Open the circuit
      mockOperation.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN)

      // Manual reset
      circuitBreaker.reset()

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(circuitBreaker.getMetrics().failureCount).toBe(0)
    })
  })

  describe('Metrics and Monitoring', () => {
    it('should provide comprehensive metrics', async () => {
      mockOperation
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success')

      await circuitBreaker.execute(mockOperation)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')
      await circuitBreaker.execute(mockOperation)

      const metrics = circuitBreaker.getMetrics()

      expect(metrics).toEqual(expect.objectContaining({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0, // Reset by successful operation
        totalRequests: 3,
        totalFailures: 1,
        totalSuccesses: 2,
        failureRate: expect.closeTo(33.33, 1),
        lastFailureTime: expect.any(Number),
        timeUntilNextAttempt: 0
      }))
    })

    it('should track last failure time', async () => {
      const beforeFailure = Date.now()
      mockOperation.mockRejectedValue(new Error('failure'))

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(beforeFailure)
      expect(metrics.lastFailureTime).toBeLessThanOrEqual(Date.now())
    })

    it('should calculate failure rate correctly', async () => {
      // 2 successes, 1 failure = 33.33% failure rate
      mockOperation
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))

      await circuitBreaker.execute(mockOperation)
      await circuitBreaker.execute(mockOperation)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('failure')

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failureRate).toBeCloseTo(33.33, 1)
    })
  })

  describe('Configuration Options', () => {
    it('should respect custom failure threshold', async () => {
      const customCB = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        name: 'custom'
      })

      mockOperation.mockRejectedValue(new Error('failure'))

      // Should take 5 failures to open
      for (let i = 0; i < 4; i++) {
        await expect(customCB.execute(mockOperation)).rejects.toThrow('failure')
        expect(customCB.getState()).toBe(CircuitBreakerState.CLOSED)
      }

      // 5th failure should open it
      await expect(customCB.execute(mockOperation)).rejects.toThrow('failure')
      expect(customCB.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should respect custom reset timeout', async () => {
      jest.useFakeTimers()

      const customCB = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 5000, // 5 seconds
        monitoringPeriod: 10000,
        name: 'custom'
      })

      // Open the circuit
      mockOperation.mockRejectedValue(new Error('failure'))
      await expect(customCB.execute(mockOperation)).rejects.toThrow('failure')
      expect(customCB.getState()).toBe(CircuitBreakerState.OPEN)

      // Should still be open after 4 seconds
      jest.advanceTimersByTime(4000)
      mockOperation.mockResolvedValue('success')
      await expect(customCB.execute(mockOperation)).rejects.toThrow(CircuitBreakerOpenError)

      // Should transition to HALF_OPEN after 5 seconds
      jest.advanceTimersByTime(1001)
      await customCB.execute(mockOperation)
      expect(customCB.getState()).toBe(CircuitBreakerState.CLOSED)

      jest.useRealTimers()
    })

    it('should handle multiple expected error patterns', async () => {
      const customCB = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['timeout', 'rate limit', 'NetworkError'],
        name: 'custom'
      })

      // These should not count towards failure threshold
      mockOperation.mockRejectedValueOnce(new Error('Connection timeout occurred'))
      mockOperation.mockRejectedValueOnce(new Error('Rate limit exceeded'))
      mockOperation.mockRejectedValueOnce(new NetworkError('Network failed'))

      await expect(customCB.execute(mockOperation)).rejects.toThrow('timeout')
      await expect(customCB.execute(mockOperation)).rejects.toThrow('Rate limit')
      await expect(customCB.execute(mockOperation)).rejects.toThrow('Network failed')

      expect(customCB.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(customCB.getMetrics().failureCount).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle synchronous operation failures', async () => {
      const syncOperation = () => {
        throw new Error('sync error')
      }

      await expect(circuitBreaker.execute(syncOperation)).rejects.toThrow('sync error')
      expect(circuitBreaker.getMetrics().totalFailures).toBe(1)
    })

    it('should handle operations that return rejected promises', async () => {
      const rejectedPromiseOperation = () => Promise.reject(new Error('rejected'))

      await expect(circuitBreaker.execute(rejectedPromiseOperation)).rejects.toThrow('rejected')
      expect(circuitBreaker.getMetrics().totalFailures).toBe(1)
    })

    it('should handle zero failure threshold', async () => {
      const zeroCB = new CircuitBreaker({
        failureThreshold: 0,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        name: 'zero'
      })

      // Should immediately open on first failure
      mockOperation.mockRejectedValue(new Error('failure'))
      await expect(zeroCB.execute(mockOperation)).rejects.toThrow('failure')

      expect(zeroCB.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should handle very short reset timeouts', async () => {
      jest.useFakeTimers()

      const fastCB = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 10, // 10ms
        monitoringPeriod: 1000,
        name: 'fast'
      })

      // Open the circuit
      mockOperation.mockRejectedValue(new Error('failure'))
      await expect(fastCB.execute(mockOperation)).rejects.toThrow('failure')

      // Should quickly transition to HALF_OPEN
      jest.advanceTimersByTime(11)
      mockOperation.mockResolvedValue('success')
      await fastCB.execute(mockOperation)

      expect(fastCB.getState()).toBe(CircuitBreakerState.CLOSED)

      jest.useRealTimers()
    })
  })
})

// Helper class for testing
class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}