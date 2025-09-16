/**
 * LLM Response Cache System
 * 
 * Provides caching layer for LLM responses to improve performance
 * and reduce costs, especially important for local models that need warm-up time
 */

import { LLMCache } from './llm-interface'
import crypto from 'crypto'

interface CacheEntry {
  response: string
  timestamp: number
  model: string
  tokens: number
  cost: number
}

/**
 * In-memory LLM cache implementation
 */
export class MemoryLLMCache implements LLMCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number = 3600000 // 1 hour default TTL
  private maxSize: number = 1000 // Maximum cache entries
  private hitCount: number = 0
  private missCount: number = 0

  constructor(ttl?: number, maxSize?: number) {
    if (ttl) this.ttl = ttl
    if (maxSize) this.maxSize = maxSize
  }

  /**
   * Generate cache key from prompt and options
   */
  private generateCacheKey(prompt: string, options: Record<string, unknown> = {}): string {
    const normalizedOptions = {
      model: options.model || 'default',
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500,
      system_prompt: options.system_prompt || ''
    }
    
    const keyContent = JSON.stringify({ prompt, options: normalizedOptions })
    return crypto.createHash('sha256').update(keyContent).digest('hex')
  }

  /**
   * Get cached response if available and not expired
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.missCount++
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      this.missCount++
      return null
    }

    this.hitCount++
    return entry.response
  }

  /**
   * Cache a response
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const entry: CacheEntry = {
      response: value,
      timestamp: Date.now(),
      model: 'unknown', // Will be set by caller
      tokens: 0, // Will be set by caller
      cost: 0 // Will be set by caller
    }

    this.cache.set(key, entry)
  }

  /**
   * Set cache entry with additional metadata
   */
  async setWithMetadata(
    key: string, 
    value: string, 
    model: string, 
    tokens: number, 
    cost: number, 
    ttl?: number
  ): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const entry: CacheEntry = {
      response: value,
      timestamp: Date.now(),
      model,
      tokens,
      cost
    }

    this.cache.set(key, entry)
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
  }

  /**
   * Delete a specific cache entry
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    hitCount: number
    missCount: number
    hitRate: number
    totalTokensCached: number
    totalCostSaved: number
  } {
    const entries = Array.from(this.cache.values())
    const totalTokensCached = entries.reduce((sum, entry) => sum + entry.tokens, 0)
    const totalCostSaved = entries.reduce((sum, entry) => sum + entry.cost, 0)
    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      totalTokensCached,
      totalCostSaved
    }
  }

  /**
   * Get cache key for prompt and options
   */
  getCacheKey(prompt: string, options: any = {}): string {
    return this.generateCacheKey(prompt, options)
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Cached LLM Provider wrapper
 * 
 * Wraps any LLM provider with caching functionality
 */
export class CachedLLMProvider<T extends any> {
  private cache: MemoryLLMCache
  private provider: T

  constructor(provider: T, cache?: MemoryLLMCache) {
    this.provider = provider
    this.cache = cache || new MemoryLLMCache()
  }

  /**
   * Complete with caching
   */
  async complete(prompt: string, options: any = {}): Promise<string> {
    const cacheKey = this.cache.getCacheKey(prompt, options)
    
    // Try cache first
    const cachedResponse = await this.cache.get(cacheKey)
    if (cachedResponse) {
      console.log('[LLM Cache] Cache hit')
      return cachedResponse
    }

    console.log('[LLM Cache] Cache miss, calling provider')
    
    // Call provider
    const response = await this.provider.complete(prompt, options)
    
    // Cache the response with metadata
    const tokens = this.provider.estimateTokens ? this.provider.estimateTokens(response) : 0
    const cost = this.provider.calculateCost ? this.provider.calculateCost(tokens) : 0
    const model = options.model || 'default'
    
    await this.cache.setWithMetadata(cacheKey, response, model, tokens, cost)
    
    return response
  }

  /**
   * Fast complete with caching
   */
  async fastComplete(prompt: string, options: any = {}): Promise<string> {
    if (this.provider.fastComplete) {
      return this.fastCompleteWithCache(prompt, options)
    } else {
      return this.complete(prompt, options)
    }
  }

  private async fastCompleteWithCache(prompt: string, options: any = {}): Promise<string> {
    const cacheKey = this.cache.getCacheKey(prompt, { ...options, fast: true })
    
    const cachedResponse = await this.cache.get(cacheKey)
    if (cachedResponse) {
      console.log('[LLM Cache] Fast cache hit')
      return cachedResponse
    }

    const response = await this.provider.fastComplete(prompt, options)
    
    const tokens = this.provider.estimateTokens ? this.provider.estimateTokens(response) : 0
    const cost = this.provider.calculateCost ? this.provider.calculateCost(tokens) : 0
    const model = options.model || 'fast'
    
    await this.cache.setWithMetadata(cacheKey, response, model, tokens, cost)
    
    return response
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Cleanup expired entries
   */
  cleanupCache(): void {
    this.cache.cleanup()
  }

  /**
   * Proxy all other methods to the underlying provider
   */
  get [Symbol.toStringTag]() {
    return this.provider.constructor.name + 'Cached'
  }
}

// Create a proxy to forward all other method calls to the provider
export function createCachedProvider<T extends any>(
  provider: T, 
  cache?: MemoryLLMCache
): T & CachedLLMProvider<T> {
  const cachedProvider = new CachedLLMProvider(provider, cache)
  
  return new Proxy(cachedProvider, {
    get(target, prop, receiver) {
      // If the property exists on the cached provider, use it
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      
      // If the property exists on the underlying provider, proxy it
      if (prop in target.provider) {
        const value = Reflect.get(target.provider, prop, receiver)
        
        // If it's a method, bind it to the provider
        if (typeof value === 'function') {
          return value.bind(target.provider)
        }
        
        return value
      }
      
      return undefined
    }
  }) as T & CachedLLMProvider<T>
}

// Export default cache instance
export const defaultCache = new MemoryLLMCache()

/**
 * Model warming service
 * 
 * Pre-warms models for faster response times
 */
export class ModelWarmer {
  private warmedModels: Set<string> = new Set()
  private warmingPrompts: string[] = [
    'Hello',
    'What is AI?',
    'Generate a brief summary.',
    'Analyze this data.',
    'Create a professional response.'
  ]

  constructor(private provider: any) {}

  /**
   * Warm up a specific model
   */
  async warmModel(modelName: string): Promise<void> {
    if (this.warmedModels.has(modelName)) {
      console.log(`[Model Warmer] Model ${modelName} already warmed`)
      return
    }

    console.log(`[Model Warmer] Warming model: ${modelName}`)
    
    try {
      // Use a short warming prompt
      await this.provider.complete(this.warmingPrompts[0], {
        model: modelName,
        max_tokens: 10,
        temperature: 0.1
      })
      
      this.warmedModels.add(modelName)
      console.log(`[Model Warmer] Model ${modelName} warmed successfully`)
    } catch (error) {
      console.error(`[Model Warmer] Failed to warm model ${modelName}:`, error)
    }
  }

  /**
   * Warm all available models
   */
  async warmAllModels(): Promise<void> {
    if (!this.provider.listModels) {
      console.warn('[Model Warmer] Provider does not support model listing')
      return
    }

    try {
      const models = await this.provider.listModels()
      for (const model of models) {
        const modelName = typeof model === 'string' ? model : model.name
        await this.warmModel(modelName)
      }
    } catch (error) {
      console.error('[Model Warmer] Failed to warm all models:', error)
    }
  }

  /**
   * Keep models alive with periodic requests
   */
  startKeepAlive(interval: number = 300000): NodeJS.Timer {
    return setInterval(async () => {
      for (const modelName of this.warmedModels) {
        try {
          await this.provider.complete('ping', {
            model: modelName,
            max_tokens: 1,
            temperature: 0
          })
          console.log(`[Model Warmer] Keep-alive sent to ${modelName}`)
        } catch (error) {
          console.warn(`[Model Warmer] Keep-alive failed for ${modelName}:`, error)
          // Remove from warmed set if it fails
          this.warmedModels.delete(modelName)
        }
      }
    }, interval)
  }

  /**
   * Get warmed models
   */
  getWarmedModels(): string[] {
    return Array.from(this.warmedModels)
  }

  /**
   * Check if a model is warmed
   */
  isModelWarmed(modelName: string): boolean {
    return this.warmedModels.has(modelName)
  }
}