import { 
  LLMProvider, 
  LLMService,
  ProviderConfig, 
  LLMProviderFactory,
  GenerationOptions,
  LLMError,
  LLMUnavailableError
} from './llm-interface'
import { OpenRouterClient } from './openrouter'
import { OllamaClient } from './ollama'
import { createCachedProvider, MemoryLLMCache, ModelWarmer } from './llm-cache'

/**
 * Fallback LLM Provider that attempts primary provider first, then falls back
 */
class FallbackLLMProvider implements LLMProvider, LLMService {
  constructor(
    private primaryProvider: LLMProvider & LLMService,
    private fallbackProvider: LLMProvider & LLMService,
    private fallbackDelay: number = 10000 // 10 seconds before trying fallback
  ) {}

  async complete(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      // Try primary provider first
      return await this.primaryProvider.complete(prompt, options)
    } catch (error) {
      console.warn('[LLM Fallback] Primary provider failed, trying fallback:', error)
      
      // Check if fallback is available
      const fallbackAvailable = await this.fallbackProvider.validateAccess()
      if (!fallbackAvailable) {
        throw new LLMUnavailableError('fallback', 'Both primary and fallback providers unavailable')
      }
      
      return await this.fallbackProvider.complete(prompt, options)
    }
  }

  async fastComplete(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      return await this.primaryProvider.fastComplete(prompt, options)
    } catch (error) {
      console.warn('[LLM Fallback] Primary provider failed for fast completion, trying fallback:', error)
      return await this.fallbackProvider.fastComplete(prompt, options)
    }
  }

  async validateAccess(): Promise<boolean> {
    const [primaryValid, fallbackValid] = await Promise.all([
      this.primaryProvider.validateAccess(),
      this.fallbackProvider.validateAccess()
    ])
    return primaryValid || fallbackValid
  }

  getModelCapabilities() {
    return {
      primary: this.primaryProvider.getModelCapabilities(),
      fallback: this.fallbackProvider.getModelCapabilities()
    }
  }

  estimateTokens(text: string): number {
    return this.primaryProvider.estimateTokens(text)
  }

  calculateCost(tokens: number): number {
    return this.primaryProvider.calculateCost(tokens)
  }

  async getStatus() {
    const [primaryStatus, fallbackStatus] = await Promise.all([
      this.primaryProvider.getStatus(),
      this.fallbackProvider.getStatus()
    ])
    
    return {
      available: primaryStatus.available || fallbackStatus.available,
      models: [...(primaryStatus.models || []), ...(fallbackStatus.models || [])],
      primary: primaryStatus,
      fallback: fallbackStatus
    }
  }

  async testModel(modelName?: string) {
    try {
      return await this.primaryProvider.testModel(modelName)
    } catch (error) {
      console.warn('[LLM Fallback] Primary test failed, trying fallback')
      return await this.fallbackProvider.testModel(modelName)
    }
  }

  // LLMService interface methods - delegate to primary with fallback
  async generateBusinessDescription(business: any): Promise<string> {
    try {
      return await this.primaryProvider.generateBusinessDescription(business)
    } catch (error) {
      console.warn('[LLM Fallback] Primary business description failed, trying fallback')
      return await this.fallbackProvider.generateBusinessDescription(business)
    }
  }

  async generateBusinessInsights(business: any) {
    try {
      return await this.primaryProvider.generateBusinessInsights(business)
    } catch (error) {
      console.warn('[LLM Fallback] Primary business insights failed, trying fallback')
      return await this.fallbackProvider.generateBusinessInsights(business)
    }
  }

  async generateSEOKeywords(business: any): Promise<string[]> {
    try {
      return await this.primaryProvider.generateSEOKeywords(business)
    } catch (error) {
      console.warn('[LLM Fallback] Primary SEO keywords failed, trying fallback')
      return await this.fallbackProvider.generateSEOKeywords(business)
    }
  }

  async generateTagline(business: any): Promise<string> {
    try {
      return await this.primaryProvider.generateTagline(business)
    } catch (error) {
      console.warn('[LLM Fallback] Primary tagline failed, trying fallback')
      return await this.fallbackProvider.generateTagline(business)
    }
  }

  async suggestCategories(business: any): Promise<string[]> {
    try {
      return await this.primaryProvider.suggestCategories(business)
    } catch (error) {
      console.warn('[LLM Fallback] Primary categories failed, trying fallback')
      return await this.fallbackProvider.suggestCategories(business)
    }
  }
}

/**
 * Factory implementation for creating LLM providers
 */
export class DefaultLLMProviderFactory implements LLMProviderFactory {
  create(config: ProviderConfig): LLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaClient()
        
      case 'openrouter':
        if (!config.apiKey) {
          throw new Error('OpenRouter API key is required')
        }
        return new OpenRouterClient(config.apiKey)
        
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }
  }

  createWithFallback(
    primaryConfig: ProviderConfig, 
    fallbackConfig: ProviderConfig
  ): LLMProvider {
    const primaryProvider = this.create(primaryConfig) as LLMProvider & LLMService
    const fallbackProvider = this.create(fallbackConfig) as LLMProvider & LLMService
    
    return new FallbackLLMProvider(primaryProvider, fallbackProvider)
  }
}

/**
 * Configuration-based LLM provider creation
 */
export class LLMProviderManager {
  private static instance: LLMProviderManager
  private factory: LLMProviderFactory
  private providers: Map<string, LLMProvider> = new Map()

  constructor(factory?: LLMProviderFactory) {
    this.factory = factory || new DefaultLLMProviderFactory()
  }

  static getInstance(): LLMProviderManager {
    if (!LLMProviderManager.instance) {
      LLMProviderManager.instance = new LLMProviderManager()
    }
    return LLMProviderManager.instance
  }

  /**
   * Get configured LLM provider based on environment variables
   */
  getProvider(): LLMProvider & LLMService {
    const cacheKey = 'configured-provider'
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey) as LLMProvider & LLMService
    }

    const config = this.getConfigFromEnvironment()
    let provider: LLMProvider

    if (config.enableFallback && config.fallbackProvider) {
      const fallbackConfig = this.getFallbackConfig()
      provider = this.factory.createWithFallback(config, fallbackConfig)
    } else {
      provider = this.factory.create(config)
    }

    // Add caching layer
    const enableCache = process.env.ENABLE_LLM_CACHE !== 'false'
    const cachedProvider = enableCache 
      ? createCachedProvider(provider as LLMProvider & LLMService, new MemoryLLMCache())
      : provider as LLMProvider & LLMService

    this.providers.set(cacheKey, cachedProvider)
    return cachedProvider
  }

  /**
   * Get provider configuration from environment variables
   */
  private getConfigFromEnvironment(): ProviderConfig {
    const isOllamaEnabled = process.env.ENABLE_OLLAMA === 'true'
    const enableFallback = process.env.OPENROUTER_FALLBACK_ENABLED === 'true'

    if (isOllamaEnabled) {
      return {
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        primaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'llama3.1:13b',
        fastModel: process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b',
        timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000'),
        enableFallback,
        fallbackProvider: enableFallback ? 'openrouter' : undefined
      }
    } else {
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        primaryModel: 'anthropic/claude-3.5-sonnet',
        fastModel: 'anthropic/claude-3-haiku',
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '120000')
      }
    }
  }

  /**
   * Get fallback provider configuration
   */
  private getFallbackConfig(): ProviderConfig {
    const primaryConfig = this.getConfigFromEnvironment()
    
    if (primaryConfig.provider === 'ollama') {
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        primaryModel: 'anthropic/claude-3.5-sonnet',
        fastModel: 'anthropic/claude-3-haiku'
      }
    } else {
      return {
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        primaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'llama3.1:13b',
        fastModel: process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b'
      }
    }
  }

  /**
   * Health check all configured providers
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    const config = this.getConfigFromEnvironment()
    
    try {
      const provider = this.getProvider()
      const isHealthy = await provider.validateAccess()
      results.set(config.provider, isHealthy)
    } catch (error) {
      console.error(`Health check failed for ${config.provider}:`, error)
      results.set(config.provider, false)
    }

    return results
  }

  /**
   * Warm up all configured providers
   */
  async warmUp(): Promise<void> {
    try {
      const provider = this.getProvider()
      
      // If it's an Ollama client or has an Ollama client, warm up the models
      if ('warmModels' in provider) {
        console.log('[LLM Manager] Warming up models...')
        await (provider as unknown).warmModels()
      } else if ('provider' in provider && 'warmModels' in (provider as unknown).provider) {
        // For cached or wrapped providers
        console.log('[LLM Manager] Warming up wrapped models...')
        await (provider as unknown).provider.warmModels()
      }
      
      // Test with a simple request
      await provider.testModel()
      console.log('[LLM Manager] Provider warmed up successfully')
    } catch (error) {
      console.warn('[LLM Manager] Failed to warm up provider:', error)
    }
  }

  /**
   * Clear provider cache (useful for configuration changes)
   */
  clearCache(): void {
    this.providers.clear()
  }
}

// Singleton instance
const llmManager = LLMProviderManager.getInstance()

/**
 * Get the configured LLM provider
 */
export function getLLMProvider(): LLMProvider & LLMService {
  return llmManager.getProvider()
}

/**
 * Health check for all providers
 */
export async function healthCheckProviders(): Promise<Map<string, boolean>> {
  return llmManager.healthCheck()
}

/**
 * Warm up providers
 */
export async function warmUpProviders(): Promise<void> {
  return llmManager.warmUp()
}

/**
 * Clear provider cache
 */
export function clearProviderCache(): void {
  return llmManager.clearCache()
}

/**
 * Utility function to check which provider is currently active
 */
export function getActiveProviderType(): 'ollama' | 'openrouter' {
  return process.env.ENABLE_OLLAMA === 'true' ? 'ollama' : 'openrouter'
}

/**
 * Get provider configuration for debugging
 */
export function getProviderConfig(): ProviderConfig {
  return llmManager['getConfigFromEnvironment']()
}