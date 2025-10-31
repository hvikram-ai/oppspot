/**
 * LLMManager - Central Orchestration Layer
 *
 * Main entry point for all LLM operations in oppSpot.
 * Manages multiple providers, handles fallback, caching, and monitoring.
 *
 * Key Responsibilities:
 * - Load and manage user's configured providers
 * - Route requests to appropriate provider based on criteria
 * - Handle automatic fallback when providers fail
 * - Cache responses to reduce API calls
 * - Track usage and costs across providers
 * - Monitor provider health
 * - Provide statistics and insights
 */

import { ILLMProvider, LLMMessage, GenerationOptions, LLMResponse, LLMStreamChunk, ModelInfo, ProviderStatus } from '../interfaces/ILLMProvider';
import { LLMManagerOptions, SystemStatistics, ProviderStatistics, LLMConfig } from '../interfaces/ILLMConfig';
import { SelectionCriteria, ProviderComparison } from '../types';
import { LocalLLMProvider } from '../providers/LocalLLMProvider';
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { AnthropicProvider } from '../providers/AnthropicProvider';
import { ManagedProvider } from '../providers/ManagedProvider';
import { ResponseCache } from './ResponseCache';
import { FallbackHandler } from './FallbackHandler';
import { ProviderSelector } from './ProviderSelector';
import { getKeyVault } from '../security/KeyVault';
import { createClient } from '@/lib/supabase/server';

export class LLMManager {
  private options: LLMManagerOptions;
  private providers: Map<string, ILLMProvider> = new Map();
  private cache: ResponseCache;
  private fallbackHandler: FallbackHandler;
  private providerSelector: ProviderSelector;
  private healthCheckInterval?: NodeJS.Timeout;
  private initialized: boolean = false;

  constructor(options: LLMManagerOptions) {
    this.options = {
      enableFallback: options.enableFallback ?? true,
      enableCaching: options.enableCaching ?? true,
      enableUsageTracking: options.enableUsageTracking ?? true,
      cacheTTLSeconds: options.cacheTTLSeconds || 300,
      healthCheckIntervalSeconds: options.healthCheckIntervalSeconds || 30,
      defaultTimeout: options.defaultTimeout || 120000,
      ...options,
    };

    // Initialize cache
    this.cache = new ResponseCache({
      maxSize: 1000,
      ttlSeconds: this.options.cacheTTLSeconds,
      enableCaching: this.options.enableCaching,
    });

    // Initialize provider selector
    this.providerSelector = new ProviderSelector();

    // Initialize fallback handler
    this.fallbackHandler = new FallbackHandler({
      enableFallback: this.options.enableFallback || false,
      maxRetries: 3,
      providers: [],
      onFallback: (providerId, error) => {
        console.warn(`[LLMManager] Fallback triggered for ${providerId}: ${error}`);
      },
    });
  }

  /**
   * Initialize the manager - load user's configured providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load user's provider configurations from database
      const configs = await this.loadUserConfigurations();

      // Initialize each provider
      for (const config of configs) {
        try {
          const provider = await this.createProvider(config);
          await provider.initialize();

          this.providers.set(provider.id, provider);
          this.providerSelector.registerProvider(provider, 'unknown', 0, 0);

          console.log(`[LLMManager] Initialized provider: ${provider.name} (${provider.type})`);
        } catch (error) {
          console.error(`[LLMManager] Failed to initialize provider ${config.id}:`, error);
        }
      }

      // Update fallback handler with providers
      const orderedProviders = this.providerSelector.getOrderedProviders();
      this.fallbackHandler.updateProviders(orderedProviders);

      // Start health check interval
      if (this.options.healthCheckIntervalSeconds && this.options.healthCheckIntervalSeconds > 0) {
        this.startHealthMonitoring();
      }

      this.initialized = true;
      console.log(`[LLMManager] Initialized with ${this.providers.size} providers`);
    } catch (error) {
      console.error('[LLMManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion
   */
  async chat(
    messages: LLMMessage[],
    options?: GenerationOptions,
    criteria?: SelectionCriteria
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache first
    const model = options?.model || 'default';
    const temperature = options?.temperature ?? 0.7;
    const cachedResponse = this.cache.get(messages, model, temperature);

    if (cachedResponse) {
      console.log('[LLMManager] Cache hit');
      return cachedResponse as LLMResponse;
    }

    // Select provider or use fallback
    if (criteria?.allowFallback !== false && this.options.enableFallback) {
      return await this.chatWithFallback(messages, options);
    } else {
      return await this.chatWithSingleProvider(messages, options, criteria);
    }
  }

  /**
   * Chat with single provider (no fallback)
   */
  private async chatWithSingleProvider(
    messages: LLMMessage[],
    options?: GenerationOptions,
    criteria?: SelectionCriteria
  ): Promise<LLMResponse> {
    const provider = this.providerSelector.selectProvider(criteria);

    if (!provider) {
      throw new Error('No providers available');
    }

    const response = await provider.chat(messages, options);

    // Cache response
    if (this.options.enableCaching) {
      const model = options?.model || 'default';
      const temperature = options?.temperature ?? 0.7;
      this.cache.set(messages, model, temperature, response);
    }

    // Track usage
    if (this.options.enableUsageTracking) {
      await this.trackUsage(provider.id, 'chat', response);
    }

    return response;
  }

  /**
   * Chat with fallback support
   */
  private async chatWithFallback(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse> {
    const result = await this.fallbackHandler.executeWithFallback(messages, options);

    if (!result.success || !result.response) {
      throw new Error(`All providers failed: ${result.error}`);
    }

    // Cache response
    if (this.options.enableCaching) {
      const model = options?.model || 'default';
      const temperature = options?.temperature ?? 0.7;
      this.cache.set(messages, model, temperature, result.response);
    }

    // Track usage
    if (this.options.enableUsageTracking && result.response) {
      // Get the successful provider from attempts log
      const successfulAttempt = result.attemptsLog.find(a => a.status === 'success');
      if (successfulAttempt) {
        await this.trackUsage(successfulAttempt.providerId, 'chat', result.response);
      }
    }

    // Log fallback if it occurred
    if (result.attemptsLog.length > 1) {
      await this.logFallback(result);
    }

    return result.response;
  }

  /**
   * Generate streaming chat completion
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: GenerationOptions,
    criteria?: SelectionCriteria
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Streaming cannot be cached, so go directly to provider
    if (criteria?.allowFallback !== false && this.options.enableFallback) {
      yield* this.chatStreamWithFallback(messages, options);
    } else {
      yield* this.chatStreamWithSingleProvider(messages, options, criteria);
    }
  }

  /**
   * Stream with single provider
   */
  private async *chatStreamWithSingleProvider(
    messages: LLMMessage[],
    options?: GenerationOptions,
    criteria?: SelectionCriteria
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const provider = this.providerSelector.selectProvider(criteria);

    if (!provider) {
      throw new Error('No providers available');
    }

    yield* provider.chatStream(messages, options);
  }

  /**
   * Stream with fallback
   */
  private async *chatStreamWithFallback(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    for await (const result of this.fallbackHandler.executeStreamWithFallback(messages, options)) {
      yield result.chunk;
    }
  }

  /**
   * List all available models across all providers
   */
  async listModels(): Promise<ModelInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const allModels: ModelInfo[] = [];

    for (const provider of this.providers.values()) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to list models for ${provider.name}:`, error);
      }
    }

    return allModels;
  }

  /**
   * Get model info
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const provider of this.providers.values()) {
      try {
        const info = await provider.getModelInfo(modelId);
        if (info) return info;
      } catch (error) {
        console.error(`Failed to get model info from ${provider.name}:`, error);
      }
    }

    return null;
  }

  /**
   * Add a provider at runtime
   */
  async addProvider(config: LLMConfig): Promise<void> {
    try {
      const provider = await this.createProvider(config);
      await provider.initialize();

      this.providers.set(provider.id, provider);
      this.providerSelector.registerProvider(provider, 'unknown', 0, 0);

      // Update fallback handler
      const orderedProviders = this.providerSelector.getOrderedProviders();
      this.fallbackHandler.updateProviders(orderedProviders);

      console.log(`[LLMManager] Added provider: ${provider.name}`);
    } catch (error) {
      console.error('[LLMManager] Failed to add provider:', error);
      throw error;
    }
  }

  /**
   * Remove a provider
   */
  async removeProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(providerId);
      this.providerSelector.unregisterProvider(providerId);

      // Update fallback handler
      const orderedProviders = this.providerSelector.getOrderedProviders();
      this.fallbackHandler.updateProviders(orderedProviders);

      console.log(`[LLMManager] Removed provider: ${provider.name}`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): SystemStatistics {
    const providers = Array.from(this.providers.values());

    const providerStats: ProviderStatistics[] = providers.map(provider => {
      const metrics = (provider as any).getMetrics?.() || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
      };

      return {
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        totalTokens: 0, // TODO: Track tokens
        totalCost: 0, // TODO: Track cost
        averageLatency: metrics.successfulRequests > 0 ? metrics.totalLatency / metrics.successfulRequests : 0,
        errorRate: metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) * 100 : 0,
        lastUsed: metrics.lastRequestAt,
      };
    });

    const primaryProvider = this.providerSelector.selectProvider();

    return {
      totalProviders: this.providers.size,
      healthyProviders: this.providerSelector.getHealthyProviderCount(),
      degradedProviders: 0, // TODO: Track degraded
      unhealthyProviders: 0, // TODO: Track unhealthy
      primaryProvider: primaryProvider?.name,
      cacheSize: this.cache.size(),
      cacheHitRate: this.cache.getStats().hitRate,
      providers: providerStats,
    };
  }

  /**
   * Compare providers
   */
  async compareProviders(): Promise<ProviderComparison[]> {
    return await this.providerSelector.compareProviders();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cleanup all providers
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }

    this.providers.clear();
    this.cache.clear();
    this.initialized = false;
  }

  /**
   * Create provider instance from configuration
   */
  private async createProvider(config: LLMConfig): Promise<ILLMProvider> {
    switch (config.providerType) {
      case 'local':
        return new LocalLLMProvider(config as any);
      case 'openrouter':
        return new OpenRouterProvider(config as any);
      case 'openai':
        return new OpenAIProvider(config as any);
      case 'anthropic':
        return new AnthropicProvider(config as any);
      case 'managed':
        return new ManagedProvider(config as any, this.options.userId);
      default:
        throw new Error(`Unsupported provider type: ${config.providerType}`);
    }
  }

  /**
   * Load user's provider configurations from database
   */
  private async loadUserConfigurations(): Promise<LLMConfig[]> {
    const supabase = await createClient();
    const keyVault = getKeyVault();

    const { data: rows, error } = await supabase
      .from('llm_configurations')
      .select('*')
      .eq('user_id', this.options.userId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Failed to load user configurations:', error);
      return [];
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    const configs: LLMConfig[] = [];

    for (const row of rows) {
      try {
        // Decrypt configuration
        const decryptedConfig = JSON.parse(keyVault.decrypt(row.encrypted_config));

        // Build config object
        const baseConfig = {
          id: row.id,
          userId: row.user_id,
          organizationId: row.organization_id,
          name: row.name,
          isActive: row.is_active,
          isPrimary: row.is_primary,
          priority: row.priority,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
          lastTestedAt: row.last_tested_at ? new Date(row.last_tested_at) : undefined,
          lastError: row.last_error,
        };

        const config: LLMConfig = {
          ...baseConfig,
          providerType: row.provider_type,
          config: decryptedConfig,
        } as LLMConfig;

        configs.push(config);
      } catch (error) {
        console.error(`Failed to decrypt config ${row.id}:`, error);
      }
    }

    return configs;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const intervalMs = (this.options.healthCheckIntervalSeconds || 30) * 1000;

    this.healthCheckInterval = setInterval(async () => {
      for (const provider of this.providers.values()) {
        try {
          const health = await provider.healthCheck();
          const metrics = (provider as any).getMetrics?.() || {};

          this.providerSelector.updateProviderHealth(
            provider.id,
            health.status,
            metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) * 100 : 0,
            health.responseTime
          );
        } catch (error) {
          console.error(`Health check failed for ${provider.name}:`, error);
          this.providerSelector.updateProviderHealth(provider.id, 'unhealthy', 100, 0);
        }
      }

      // Clear expired cache entries
      this.cache.clearExpired();
    }, intervalMs);
  }

  /**
   * Track usage in database
   */
  private async trackUsage(providerId: string, feature: string, response: LLMResponse): Promise<void> {
    const supabase = await createClient();

    await supabase.from('llm_usage').insert({
      user_id: this.options.userId,
      config_id: providerId,
      feature,
      model: response.model,
      prompt_tokens: response.usage.promptTokens,
      completion_tokens: response.usage.completionTokens,
      total_tokens: response.usage.totalTokens,
      input_cost: response.metadata?.cost?.input || 0,
      output_cost: response.metadata?.cost?.output || 0,
      total_cost: response.metadata?.cost?.total || 0,
      latency_ms: response.metadata?.latencyMs || 0,
      status: 'success',
    });
  }

  /**
   * Log fallback event
   */
  private async logFallback(result: any): Promise<void> {
    console.log('[LLMManager] Fallback occurred:', {
      attempts: result.attemptsLog.length,
      success: result.success,
      totalLatency: result.totalLatencyMs,
    });
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Create and initialize LLMManager for a user
 */
export async function createLLMManager(options: LLMManagerOptions): Promise<LLMManager> {
  const manager = new LLMManager(options);
  await manager.initialize();
  return manager;
}
