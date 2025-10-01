/**
 * Cache Service Implementation
 * Provides multi-level caching with Redis and in-memory fallback
 */

import { ICacheService, CacheOptions } from '../../core/interfaces'

export class CacheService implements ICacheService {
  private memoryCache = new Map<string, CacheItem>()
  private readonly defaultTtl = 3600 // 1 hour
  private readonly maxMemoryItems = 1000
  
  constructor(
    private readonly redisClient?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, ex: number) => Promise<void>; del: (key: string) => Promise<void> }
  ) {
    // Clean up expired items from memory cache periodically
    setInterval(() => this.cleanupMemoryCache(), 300000) // Every 5 minutes
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redisClient) {
        const redisValue = await this.redisClient.get(key)
        if (redisValue) {
          return JSON.parse(redisValue)
        }
      }

      // Fallback to memory cache
      const memoryItem = this.memoryCache.get(key)
      if (memoryItem && memoryItem.expiresAt > Date.now()) {
        return memoryItem.value
      }

      // Clean up expired item
      if (memoryItem) {
        this.memoryCache.delete(key)
      }

      return null
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number, options?: CacheOptions): Promise<void> {
    const ttl = ttlSeconds || this.defaultTtl
    const expiresAt = Date.now() + (ttl * 1000)

    try {
      // Store in Redis if available
      if (this.redisClient) {
        const serialized = JSON.stringify(value)
        
        if (options?.tags) {
          // Store with tags for invalidation
          await Promise.all([
            this.redisClient.setex(key, ttl, serialized),
            ...options.tags.map(tag => 
              this.redisClient.sadd(`tag:${tag}`, key)
            )
          ])
          
          // Set expiry for tag sets
          await Promise.all(
            options.tags.map(tag => 
              this.redisClient.expire(`tag:${tag}`, ttl + 60)
            )
          )
        } else {
          await this.redisClient.setex(key, ttl, serialized)
        }
      }

      // Also store in memory cache as backup
      if (this.memoryCache.size >= this.maxMemoryItems) {
        this.evictOldestMemoryItems(100) // Remove oldest 100 items
      }

      this.memoryCache.set(key, {
        value,
        expiresAt,
        tags: options?.tags
      })

    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error)
      // At least try to store in memory
      this.memoryCache.set(key, { value, expiresAt, tags: options?.tags })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redisClient) {
        await this.redisClient.del(key)
      }

      // Delete from memory
      this.memoryCache.delete(key)
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error)
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear Redis (only our keys if possible)
      if (this.redisClient) {
        const keys = await this.redisClient.keys('oppspot:*')
        if (keys.length > 0) {
          await this.redisClient.del(...keys)
        }
      }

      // Clear memory cache
      this.memoryCache.clear()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.redisClient) {
        const exists = await this.redisClient.exists(key)
        if (exists) return true
      }

      // Check memory cache
      const memoryItem = this.memoryCache.get(key)
      return memoryItem ? memoryItem.expiresAt > Date.now() : false
    } catch (error) {
      console.error(`Error checking cache key existence ${key}:`, error)
      return false
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      if (this.redisClient) {
        // Get all keys with this tag
        const keys = await this.redisClient.smembers(`tag:${tag}`)
        
        if (keys.length > 0) {
          // Delete all keys and the tag set
          await Promise.all([
            this.redisClient.del(...keys),
            this.redisClient.del(`tag:${tag}`)
          ])
        }
      }

      // Invalidate from memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.tags?.includes(tag)) {
          this.memoryCache.delete(key)
        }
      }
    } catch (error) {
      console.error(`Error invalidating cache by tag ${tag}:`, error)
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {}

    try {
      // Get from Redis if available
      if (this.redisClient && keys.length > 0) {
        const redisValues = await this.redisClient.mget(...keys)
        
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          const value = redisValues[i]
          
          if (value) {
            results[key] = JSON.parse(value)
          } else {
            // Check memory cache for missing keys
            const memoryItem = this.memoryCache.get(key)
            results[key] = (memoryItem && memoryItem.expiresAt > Date.now()) 
              ? memoryItem.value 
              : null
          }
        }
      } else {
        // Use memory cache only
        for (const key of keys) {
          const memoryItem = this.memoryCache.get(key)
          results[key] = (memoryItem && memoryItem.expiresAt > Date.now()) 
            ? memoryItem.value 
            : null
        }
      }
    } catch (error) {
      console.error('Error getting multiple cache keys:', error)
      // Return all nulls
      for (const key of keys) {
        results[key] = null
      }
    }

    return results
  }

  async setMultiple<T>(items: Record<string, T>, ttlSeconds?: number, options?: CacheOptions): Promise<void> {
    const ttl = ttlSeconds || this.defaultTtl
    const expiresAt = Date.now() + (ttl * 1000)

    try {
      if (this.redisClient) {
        const pipeline = this.redisClient.pipeline()
        
        for (const [key, value] of Object.entries(items)) {
          const serialized = JSON.stringify(value)
          pipeline.setex(key, ttl, serialized)
          
          // Handle tags
          if (options?.tags) {
            options.tags.forEach(tag => {
              pipeline.sadd(`tag:${tag}`, key)
              pipeline.expire(`tag:${tag}`, ttl + 60)
            })
          }
        }
        
        await pipeline.exec()
      }

      // Store in memory cache
      for (const [key, value] of Object.entries(items)) {
        if (this.memoryCache.size >= this.maxMemoryItems) {
          this.evictOldestMemoryItems(100)
        }
        
        this.memoryCache.set(key, {
          value,
          expiresAt,
          tags: options?.tags
        })
      }
    } catch (error) {
      console.error('Error setting multiple cache keys:', error)
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      let redisStats = null
      
      if (this.redisClient) {
        const info = await this.redisClient.info('memory')
        const keyspace = await this.redisClient.info('keyspace')
        
        redisStats = {
          memoryUsed: this.parseRedisInfo(info, 'used_memory'),
          keyCount: this.parseRedisKeyspace(keyspace),
          connected: true
        }
      }

      return {
        memory: {
          itemCount: this.memoryCache.size,
          maxItems: this.maxMemoryItems
        },
        redis: redisStats,
        lastCleanup: new Date()
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        memory: {
          itemCount: this.memoryCache.size,
          maxItems: this.maxMemoryItems
        },
        redis: null,
        lastCleanup: new Date()
      }
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiresAt <= now) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`)
    }
  }

  private evictOldestMemoryItems(count: number): void {
    const entries = Array.from(this.memoryCache.entries())
    entries.sort(([,a], [,b]) => a.expiresAt - b.expiresAt)
    
    const toEvict = entries.slice(0, count)
    toEvict.forEach(([key]) => this.memoryCache.delete(key))
  }

  private parseRedisInfo(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:([0-9]+)`))
    return match ? parseInt(match[1]) : 0
  }

  private parseRedisKeyspace(keyspace: string): number {
    const match = keyspace.match(/keys=([0-9]+)/)
    return match ? parseInt(match[1]) : 0
  }
}

interface CacheItem {
  value: unknown
  expiresAt: number
  tags?: string[]
}

interface CacheStats {
  memory: {
    itemCount: number
    maxItems: number
  }
  redis: {
    memoryUsed: number
    keyCount: number
    connected: boolean
  } | null
  lastCleanup: Date
}