/**
 * Cache Service Unit Tests
 * Tests the multi-level caching implementation
 */

import { CacheService } from '../../../infrastructure/services/cache.service'

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  smembers: jest.fn(),
  sadd: jest.fn(),
  expire: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(),
  info: jest.fn()
}

// Mock pipeline for Redis transactions
const mockPipeline = {
  setex: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([])
}

describe('CacheService', () => {
  let cacheService: CacheService

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisClient.pipeline.mockReturnValue(mockPipeline)
    cacheService = new CacheService(mockRedisClient)
  })

  describe('Basic Cache Operations', () => {
    describe('get()', () => {
      it('should return value from Redis when available', async () => {
        const testData = { id: 1, name: 'test' }
        mockRedisClient.get.mockResolvedValue(JSON.stringify(testData))

        const result = await cacheService.get('test-key')

        expect(result).toEqual(testData)
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key')
      })

      it('should fallback to memory cache when Redis fails', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis failed'))

        // Set in memory cache first
        await cacheService.set('test-key', { id: 1, name: 'test' }, 60)
        
        const result = await cacheService.get('test-key')

        expect(result).toEqual({ id: 1, name: 'test' })
      })

      it('should return null when key not found', async () => {
        mockRedisClient.get.mockResolvedValue(null)

        const result = await cacheService.get('nonexistent-key')

        expect(result).toBeNull()
      })

      it('should handle Redis JSON parsing errors gracefully', async () => {
        mockRedisClient.get.mockResolvedValue('invalid-json{')

        const result = await cacheService.get('test-key')

        expect(result).toBeNull()
      })

      it('should expire memory cache items correctly', async () => {
        mockRedisClient.get.mockResolvedValue(null)

        // Set with very short TTL
        await cacheService.set('test-key', { id: 1 }, 0.001) // 1ms
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const result = await cacheService.get('test-key')
        expect(result).toBeNull()
      })
    })

    describe('set()', () => {
      it('should store value in Redis with TTL', async () => {
        const testData = { id: 1, name: 'test' }
        mockRedisClient.setex.mockResolvedValue('OK')

        await cacheService.set('test-key', testData, 3600)

        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'test-key',
          3600,
          JSON.stringify(testData)
        )
      })

      it('should store value in memory cache as backup', async () => {
        const testData = { id: 1, name: 'test' }
        mockRedisClient.setex.mockRejectedValue(new Error('Redis failed'))

        await cacheService.set('test-key', testData, 60)

        // Should fallback to memory
        mockRedisClient.get.mockResolvedValue(null)
        const result = await cacheService.get('test-key')
        expect(result).toEqual(testData)
      })

      it('should use default TTL when not specified', async () => {
        await cacheService.set('test-key', { id: 1 })

        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'test-key',
          3600, // Default TTL
          expect.any(String)
        )
      })

      it('should handle tags for cache invalidation', async () => {
        const testData = { id: 1, name: 'test' }
        const options = { tags: ['user', 'profile'] }

        await cacheService.set('test-key', testData, 3600, options)

        expect(mockRedisClient.sadd).toHaveBeenCalledWith('tag:user', 'test-key')
        expect(mockRedisClient.sadd).toHaveBeenCalledWith('tag:profile', 'test-key')
        expect(mockRedisClient.expire).toHaveBeenCalledWith('tag:user', 3660)
        expect(mockRedisClient.expire).toHaveBeenCalledWith('tag:profile', 3660)
      })

      it('should evict old items from memory cache when full', async () => {
        // Fill memory cache to near capacity
        for (let i = 0; i < 1000; i++) {
          await cacheService.set(`key-${i}`, { id: i }, 60)
        }

        // This should trigger eviction
        await cacheService.set('new-key', { id: 'new' }, 60)

        // Should not throw and should still work
        const result = await cacheService.get('new-key')
        expect(result).toEqual({ id: 'new' })
      })
    })

    describe('delete()', () => {
      it('should delete from both Redis and memory', async () => {
        mockRedisClient.del.mockResolvedValue(1)

        await cacheService.delete('test-key')

        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key')
      })

      it('should handle Redis deletion errors gracefully', async () => {
        mockRedisClient.del.mockRejectedValue(new Error('Redis failed'))

        await expect(cacheService.delete('test-key')).resolves.toBeUndefined()
      })
    })

    describe('clear()', () => {
      it('should clear Redis keys matching pattern', async () => {
        mockRedisClient.keys.mockResolvedValue(['oppspot:key1', 'oppspot:key2'])
        mockRedisClient.del.mockResolvedValue(2)

        await cacheService.clear()

        expect(mockRedisClient.keys).toHaveBeenCalledWith('oppspot:*')
        expect(mockRedisClient.del).toHaveBeenCalledWith('oppspot:key1', 'oppspot:key2')
      })

      it('should handle case with no keys to delete', async () => {
        mockRedisClient.keys.mockResolvedValue([])

        await expect(cacheService.clear()).resolves.toBeUndefined()
      })

      it('should clear memory cache', async () => {
        // Add something to memory cache
        await cacheService.set('test-key', { id: 1 }, 60)
        
        await cacheService.clear()
        
        // Should be gone from memory
        mockRedisClient.get.mockResolvedValue(null)
        const result = await cacheService.get('test-key')
        expect(result).toBeNull()
      })
    })

    describe('exists()', () => {
      it('should check Redis first', async () => {
        mockRedisClient.exists.mockResolvedValue(1)

        const result = await cacheService.exists('test-key')

        expect(result).toBe(true)
        expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key')
      })

      it('should check memory cache if Redis says no', async () => {
        mockRedisClient.exists.mockResolvedValue(0)

        // Set in memory cache
        await cacheService.set('test-key', { id: 1 }, 60)
        
        const result = await cacheService.exists('test-key')

        expect(result).toBe(true)
      })

      it('should return false when key exists nowhere', async () => {
        mockRedisClient.exists.mockResolvedValue(0)

        const result = await cacheService.exists('nonexistent-key')

        expect(result).toBe(false)
      })
    })
  })

  describe('Advanced Operations', () => {
    describe('invalidateByTag()', () => {
      it('should invalidate all keys with specified tag', async () => {
        mockRedisClient.smembers.mockResolvedValue(['key1', 'key2', 'key3'])
        mockRedisClient.del.mockResolvedValue(4)

        await cacheService.invalidateByTag('user')

        expect(mockRedisClient.smembers).toHaveBeenCalledWith('tag:user')
        expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3', 'tag:user')
      })

      it('should handle empty tag sets', async () => {
        mockRedisClient.smembers.mockResolvedValue([])

        await expect(cacheService.invalidateByTag('empty-tag')).resolves.toBeUndefined()
      })

      it('should invalidate from memory cache by tag', async () => {
        // Set items with tags in memory
        await cacheService.set('key1', { id: 1 }, 60, { tags: ['user'] })
        await cacheService.set('key2', { id: 2 }, 60, { tags: ['user', 'admin'] })
        await cacheService.set('key3', { id: 3 }, 60, { tags: ['admin'] })

        await cacheService.invalidateByTag('user')

        // key1 and key2 should be gone, key3 should remain
        mockRedisClient.get.mockResolvedValue(null)
        
        expect(await cacheService.get('key1')).toBeNull()
        expect(await cacheService.get('key2')).toBeNull()
        expect(await cacheService.get('key3')).toEqual({ id: 3 })
      })
    })

    describe('getMultiple()', () => {
      it('should get multiple keys from Redis efficiently', async () => {
        mockRedisClient.mget.mockResolvedValue([
          JSON.stringify({ id: 1 }),
          null,
          JSON.stringify({ id: 3 })
        ])

        const result = await cacheService.getMultiple(['key1', 'key2', 'key3'])

        expect(result).toEqual({
          key1: { id: 1 },
          key2: null,
          key3: { id: 3 }
        })
        expect(mockRedisClient.mget).toHaveBeenCalledWith('key1', 'key2', 'key3')
      })

      it('should fallback to memory for missing Redis values', async () => {
        mockRedisClient.mget.mockResolvedValue([null, null])

        // Set one value in memory
        await cacheService.set('key2', { id: 2 }, 60)

        const result = await cacheService.getMultiple(['key1', 'key2'])

        expect(result).toEqual({
          key1: null,
          key2: { id: 2 }
        })
      })

      it('should handle Redis mget failures gracefully', async () => {
        mockRedisClient.mget.mockRejectedValue(new Error('Redis failed'))

        const result = await cacheService.getMultiple(['key1', 'key2'])

        expect(result).toEqual({
          key1: null,
          key2: null
        })
      })
    })

    describe('setMultiple()', () => {
      beforeEach(() => {
        mockPipeline.exec.mockResolvedValue([])
      })

      it('should set multiple keys using Redis pipeline', async () => {
        const items = {
          key1: { id: 1 },
          key2: { id: 2 },
          key3: { id: 3 }
        }

        await cacheService.setMultiple(items, 3600)

        expect(mockRedisClient.pipeline).toHaveBeenCalled()
        expect(mockPipeline.setex).toHaveBeenCalledWith('key1', 3600, JSON.stringify({ id: 1 }))
        expect(mockPipeline.setex).toHaveBeenCalledWith('key2', 3600, JSON.stringify({ id: 2 }))
        expect(mockPipeline.setex).toHaveBeenCalledWith('key3', 3600, JSON.stringify({ id: 3 }))
        expect(mockPipeline.exec).toHaveBeenCalled()
      })

      it('should handle tags in batch operations', async () => {
        const items = { key1: { id: 1 }, key2: { id: 2 } }
        const options = { tags: ['batch'] }

        await cacheService.setMultiple(items, 3600, options)

        expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:batch', 'key1')
        expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:batch', 'key2')
        expect(mockPipeline.expire).toHaveBeenCalledWith('tag:batch', 3660)
      })

      it('should store in memory cache even if Redis fails', async () => {
        mockPipeline.exec.mockRejectedValue(new Error('Redis pipeline failed'))

        const items = { key1: { id: 1 }, key2: { id: 2 } }
        await cacheService.setMultiple(items, 60)

        // Should be available from memory
        mockRedisClient.get.mockResolvedValue(null)
        mockRedisClient.mget.mockResolvedValue([null, null])
        
        const result = await cacheService.getMultiple(['key1', 'key2'])
        expect(result).toEqual({
          key1: { id: 1 },
          key2: { id: 2 }
        })
      })
    })
  })

  describe('Memory Cache Management', () => {
    beforeEach(() => {
      // Simulate Redis being unavailable to test memory cache specifically
      mockRedisClient.get.mockResolvedValue(null)
      mockRedisClient.setex.mockRejectedValue(new Error('Redis unavailable'))
    })

    it('should cleanup expired items periodically', async () => {
      jest.useFakeTimers()

      // Set items with short TTL
      await cacheService.set('key1', { id: 1 }, 1) // 1 second
      await cacheService.set('key2', { id: 2 }, 10) // 10 seconds

      // Fast-forward past first expiration
      jest.advanceTimersByTime(2000)

      // Trigger cleanup (normally happens every 5 minutes)
      jest.advanceTimersByTime(300000)

      // key1 should be expired, key2 should remain
      expect(await cacheService.get('key1')).toBeNull()
      expect(await cacheService.get('key2')).toEqual({ id: 2 })

      jest.useRealTimers()
    })
  })

  describe('Statistics and Monitoring', () => {
    describe('getStats()', () => {
      it('should return comprehensive cache statistics', async () => {
        mockRedisClient.info
          .mockResolvedValueOnce('used_memory:1048576')
          .mockResolvedValueOnce('db0:keys=100,expires=50')

        // Add some items to memory cache
        await cacheService.set('key1', { id: 1 }, 60)
        await cacheService.set('key2', { id: 2 }, 60)

        const stats = await cacheService.getStats()

        expect(stats).toEqual(expect.objectContaining({
          memory: expect.objectContaining({
            itemCount: expect.any(Number),
            maxItems: 1000
          }),
          redis: expect.objectContaining({
            memoryUsed: 1048576,
            keyCount: 100,
            connected: true
          }),
          lastCleanup: expect.any(Date)
        }))
      })

      it('should handle Redis info failures gracefully', async () => {
        mockRedisClient.info.mockRejectedValue(new Error('Redis info failed'))

        const stats = await cacheService.getStats()

        expect(stats).toEqual(expect.objectContaining({
          memory: expect.any(Object),
          redis: null,
          lastCleanup: expect.any(Date)
        }))
      })
    })
  })

  describe('Cache Without Redis', () => {
    beforeEach(() => {
      cacheService = new CacheService() // No Redis client
    })

    it('should work with memory cache only', async () => {
      await cacheService.set('test-key', { id: 1, name: 'test' }, 60)
      
      const result = await cacheService.get('test-key')
      
      expect(result).toEqual({ id: 1, name: 'test' })
    })

    it('should handle all operations gracefully without Redis', async () => {
      await cacheService.set('key1', { id: 1 }, 60)
      await cacheService.set('key2', { id: 2 }, 60, { tags: ['test'] })
      
      expect(await cacheService.exists('key1')).toBe(true)
      expect(await cacheService.exists('nonexistent')).toBe(false)
      
      const multiple = await cacheService.getMultiple(['key1', 'key2'])
      expect(multiple).toEqual({
        key1: { id: 1 },
        key2: { id: 2 }
      })

      await cacheService.invalidateByTag('test')
      expect(await cacheService.get('key2')).toBeNull()
      expect(await cacheService.get('key1')).toEqual({ id: 1 })

      await cacheService.clear()
      expect(await cacheService.get('key1')).toBeNull()
    })
  })
})