/**
 * ResponseCache - In-Memory LRU Cache for LLM Responses
 *
 * Caches LLM responses to reduce API calls and costs.
 * Uses LRU (Least Recently Used) eviction strategy.
 */

import { LLMMessage } from '../interfaces/ILLMProvider';
import { CacheEntry } from '../types';

export interface CacheOptions {
  maxSize: number;           // Maximum number of entries
  ttlSeconds: number;        // Time to live in seconds
  enableCaching: boolean;    // Enable/disable caching
}

export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[];
  private options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.options = {
      maxSize: options.maxSize || 1000,
      ttlSeconds: options.ttlSeconds || 300, // 5 minutes default
      enableCaching: options.enableCaching ?? true,
    };
  }

  /**
   * Generate cache key from messages and options
   */
  private generateKey(
    messages: LLMMessage[],
    model: string,
    temperature: number
  ): string {
    const messagesStr = messages
      .map(m => `${m.role}:${m.content}`)
      .join('|');

    const payload = `${model}:${temperature}:${messagesStr}`;

    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `cache_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get cached response
   */
  get(
    messages: LLMMessage[],
    model: string,
    temperature: number
  ): unknown | null {
    if (!this.options.enableCaching) return null;

    const key = this.generateKey(messages, model, temperature);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access tracking
    entry.lastAccessed = new Date();
    entry.hitCount++;
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set cached response
   */
  set(
    messages: LLMMessage[],
    model: string,
    temperature: number,
    value: unknown
  ): void {
    if (!this.options.enableCaching) return;

    const key = this.generateKey(messages, model, temperature);

    // Check if we need to evict
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.options.ttlSeconds * 1000);

    this.cache.set(key, {
      key,
      value,
      expiresAt,
      createdAt: now,
      hitCount: 0,
      lastAccessed: now,
    });

    this.updateAccessOrder(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      totalEntries++;
    }

    // Estimate misses (this is approximate)
    const totalMisses = Math.max(0, totalEntries - totalHits);
    const hitRate = totalEntries > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate,
      totalHits,
      totalMisses,
    };
  }

  /**
   * Enable/disable caching
   */
  setEnabled(enabled: boolean): void {
    this.options.enableCaching = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.options.enableCaching;
  }
}
