/**
 * Unified LLM Provider Interface
 * 
 * This interface abstracts different LLM providers (OpenRouter, Ollama, etc.)
 * to enable seamless switching and fallback mechanisms.
 */

export interface GenerationOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  top_p?: number
  top_k?: number
  stream?: boolean
}

export interface ModelCapabilities {
  name: string
  contextLength: number
  maxTokens: number
  bestFor: string[]
  cost: number // Cost per 1K tokens
  speed: 'fast' | 'medium' | 'slow'
}

export interface ProviderStatus {
  available: boolean
  models: string[]
  version?: string
  uptime?: number
  lastError?: string
}

export interface GenerationMetrics {
  tokensGenerated: number
  responseTime: number
  model: string
  cost: number
  provider: string
}

export interface TestResult {
  success: boolean
  responseTime: number
  tokensGenerated?: number
  error?: string
}

/**
 * Core LLM Provider Interface
 */
export interface LLMProvider {
  /**
   * Generate text completion
   */
  complete(prompt: string, options?: GenerationOptions): Promise<string>

  /**
   * Fast completion using the most efficient model
   */
  fastComplete(prompt: string, options?: GenerationOptions): Promise<string>

  /**
   * Check if the provider is accessible and working
   */
  validateAccess(): Promise<boolean>

  /**
   * Get available models and their capabilities
   */
  getModelCapabilities(): Record<string, ModelCapabilities | unknown>

  /**
   * Estimate tokens in given text
   */
  estimateTokens(text: string): number

  /**
   * Calculate cost for given number of tokens
   */
  calculateCost(tokens: number): number

  /**
   * Get current provider status
   */
  getStatus(): Promise<ProviderStatus>

  /**
   * Test the provider with a simple request
   */
  testModel(modelName?: string): Promise<TestResult>
}

/**
 * Extended interface for providers that support model management
 */
export interface ManagedLLMProvider extends LLMProvider {
  /**
   * List available models
   */
  listModels(): Promise<unknown[]>

  /**
   * Check if a specific model is available
   */
  hasModel(modelName: string): Promise<boolean>

  /**
   * Ensure a model is available (download if needed)
   */
  ensureModel(modelName: string): Promise<boolean>

  /**
   * Warm up models for faster response times
   */
  warmModels(): Promise<void>
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: 'openrouter' | 'ollama'
  apiKey?: string
  baseUrl?: string
  primaryModel?: string
  fastModel?: string
  timeout?: number
  enableFallback?: boolean
  fallbackProvider?: 'openrouter' | 'ollama'
}

/**
 * LLM Service Interface for the similarity explanation service
 */
export interface LLMService extends LLMProvider {
  /**
   * Generate business description using AI
   */
  generateBusinessDescription(business: Record<string, unknown>): Promise<string>

  /**
   * Generate business insights and analysis
   */
  generateBusinessInsights(business: Record<string, unknown>): Promise<{
    market_position: string
    target_audience: string
    competitive_advantages: string[]
    growth_opportunities: string[]
    challenges: string[]
  }>

  /**
   * Generate SEO keywords for a business
   */
  generateSEOKeywords(business: Record<string, unknown>): Promise<string[]>

  /**
   * Generate a tagline for a business
   */
  generateTagline(business: Record<string, unknown>): Promise<string>

  /**
   * Categorize a business based on its information
   */
  suggestCategories(business: Record<string, unknown>): Promise<string[]>
}

/**
 * Factory interface for creating LLM providers
 */
export interface LLMProviderFactory {
  create(config: ProviderConfig): LLMProvider
  createWithFallback(primaryConfig: ProviderConfig, fallbackConfig: ProviderConfig): LLMProvider
}

/**
 * Error classes for LLM operations
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public model?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(provider: string, timeout: number, model?: string) {
    super(`Request timed out after ${timeout}ms`, provider, model)
    this.name = 'LLMTimeoutError'
  }
}

export class LLMUnavailableError extends LLMError {
  constructor(provider: string, reason: string) {
    super(`Provider unavailable: ${reason}`, provider)
    this.name = 'LLMUnavailableError'
  }
}

export class LLMQuotaExceededError extends LLMError {
  constructor(provider: string, model?: string) {
    super('API quota exceeded', provider, model)
    this.name = 'LLMQuotaExceededError'
  }
}

/**
 * Utility types
 */
export type TaskType = 'fast' | 'detailed' | 'primary'
export type ProviderType = 'openrouter' | 'ollama'

/**
 * Cache interface for LLM responses
 */
export interface LLMCache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  clear(): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Monitoring interface for LLM operations
 */
export interface LLMMonitor {
  recordGeneration(metrics: GenerationMetrics): void
  recordError(error: LLMError): void
  getStats(timeframe?: string): Promise<{
    totalRequests: number
    successRate: number
    averageResponseTime: number
    totalTokens: number
    totalCost: number
    errorsByType: Record<string, number>
  }>
}

/**
 * Batch processing interface
 */
export interface BatchRequest {
  id: string
  prompt: string
  options?: GenerationOptions
}

export interface BatchResponse {
  id: string
  result: string
  metrics: GenerationMetrics
  error?: LLMError
}

export interface BatchProcessor {
  processBatch(requests: BatchRequest[]): Promise<BatchResponse[]>
}

/**
 * Configuration validation utilities
 */
export interface ConfigValidator {
  validateProviderConfig(config: ProviderConfig): boolean
  validateGenerationOptions(options: GenerationOptions): boolean
  sanitizePrompt(prompt: string): string
}

/**
 * Provider health check interface
 */
export interface HealthChecker {
  checkProvider(provider: LLMProvider): Promise<{
    healthy: boolean
    latency: number
    error?: string
  }>
  
  checkAllProviders(providers: LLMProvider[]): Promise<Map<string, boolean>>
}