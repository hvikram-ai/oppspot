/**
 * BaseProvider - Abstract Base Class for LLM Providers
 *
 * Provides common functionality for all LLM provider implementations:
 * - Retry logic with exponential backoff
 * - Error handling and classification
 * - Token counting
 * - Cost estimation
 * - Health checking
 * - Request/response logging
 */

import {
  ILLMProvider,
  ProviderType,
  ProviderStatus,
  LLMMessage,
  GenerationOptions,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
  ProviderHealth,
  LLMError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMQuotaExceededError,
  LLMAuthenticationError,
  LLMRateLimitError,
} from '../interfaces/ILLMProvider';

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatency: number;
  lastRequestAt?: Date;
  lastErrorAt?: Date;
  lastError?: string;
}

export abstract class BaseProvider implements ILLMProvider {
  public readonly id: string;
  public readonly type: ProviderType;
  public readonly name: string;
  public readonly priority: number;

  protected initialized: boolean = false;
  protected defaultTimeout: number = 120000; // 2 minutes
  protected metrics: ProviderMetrics;

  protected retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };

  constructor(id: string, type: ProviderType, name: string, priority: number) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.priority = priority;

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
    };
  }

  /**
   * Initialize the provider (must be implemented by subclasses)
   */
  abstract initialize(): Promise<void>;

  /**
   * Check provider health (must be implemented by subclasses)
   */
  abstract healthCheck(): Promise<ProviderHealth>;

  /**
   * Generate chat completion (must be implemented by subclasses)
   */
  abstract chat(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse>;

  /**
   * Generate streaming chat completion (must be implemented by subclasses)
   */
  abstract chatStream(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  /**
   * List available models (must be implemented by subclasses)
   */
  abstract listModels(): Promise<ModelInfo[]>;

  /**
   * Get model info (must be implemented by subclasses)
   */
  abstract getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Estimate cost for a request
   */
  async estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: string
  ): Promise<number> {
    const modelInfo = await this.getModelInfo(model);

    if (!modelInfo?.pricing) {
      return 0;
    }

    const inputCost = (promptTokens / 1000) * modelInfo.pricing.input;
    const outputCost = (completionTokens / 1000) * modelInfo.pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Count tokens in text (basic implementation, can be overridden)
   */
  async countTokens(text: string, model?: string): Promise<number> {
    // Basic estimation: ~4 characters per token
    // Providers should override with model-specific tokenization
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate provider configuration (must be implemented by subclasses)
   */
  abstract validate(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Execute a request with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'request'
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryOptions.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const latency = Date.now() - startTime;

        this.updateMetrics(true, latency);

        return result;
      } catch (error) {
        lastError = error as Error;
        this.updateMetrics(false);

        // Don't retry on authentication errors
        if (error instanceof LLMAuthenticationError) {
          throw error;
        }

        // Check if we should retry
        const shouldRetry = this.shouldRetry(error as LLMError, attempt);

        if (!shouldRetry || attempt === this.retryOptions.maxRetries) {
          throw error;
        }

        // Wait before retry with exponential backoff
        await this.sleep(delay);
        delay = Math.min(delay * this.retryOptions.backoffMultiplier, this.retryOptions.maxDelayMs);

        console.log(
          `[${this.name}] Retrying ${operationName} (attempt ${attempt + 1}/${this.retryOptions.maxRetries})`
        );
      }
    }

    throw lastError || new LLMError('Max retries exceeded', 'MAX_RETRIES', 500, this.name);
  }

  /**
   * Determine if an error is retryable
   */
  protected shouldRetry(error: LLMError, attempt: number): boolean {
    // Don't retry authentication errors
    if (error instanceof LLMAuthenticationError) {
      return false;
    }

    // Retry timeouts
    if (error instanceof LLMTimeoutError) {
      return true;
    }

    // Retry rate limits (with exponential backoff)
    if (error instanceof LLMRateLimitError) {
      return true;
    }

    // Retry unavailable errors
    if (error instanceof LLMUnavailableError) {
      return true;
    }

    // Retry based on status code
    if (error.statusCode && this.retryOptions.retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for a duration
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update provider metrics
   */
  protected updateMetrics(success: boolean, latencyMs?: number): void {
    this.metrics.totalRequests++;
    this.metrics.lastRequestAt = new Date();

    if (success) {
      this.metrics.successfulRequests++;
      if (latencyMs) {
        this.metrics.totalLatency += latencyMs;
      }
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastErrorAt = new Date();
    }
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.metrics.successfulRequests === 0) return 0;
    return this.metrics.totalLatency / this.metrics.successfulRequests;
  }

  /**
   * Get error rate (percentage)
   */
  getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
  }

  /**
   * Get provider status based on metrics
   */
  protected getStatusFromMetrics(): ProviderStatus {
    const errorRate = this.getErrorRate();
    const avgLatency = this.getAverageLatency();

    if (errorRate > 50) return 'unhealthy';
    if (errorRate > 20 || avgLatency > 30000) return 'degraded';
    if (this.metrics.totalRequests > 0) return 'healthy';

    return 'unknown';
  }

  /**
   * Handle API errors and convert to LLM errors
   */
  protected handleError(error: unknown, context: string): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for timeout
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return new LLMTimeoutError(error.message, this.name);
      }

      // Check for network errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return new LLMUnavailableError(error.message, this.name);
      }

      return new LLMError(
        `${context}: ${error.message}`,
        'UNKNOWN_ERROR',
        500,
        this.name
      );
    }

    return new LLMError(
      `${context}: Unknown error`,
      'UNKNOWN_ERROR',
      500,
      this.name
    );
  }

  /**
   * Format messages for API requests (helper method)
   */
  protected formatMessages(messages: LLMMessage[]): Array<{
    role: string;
    content: string;
    name?: string;
  }> {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    }));
  }

  /**
   * Apply default options
   */
  protected applyDefaults(options?: GenerationOptions): Required<GenerationOptions> {
    return {
      model: options?.model || 'default',
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 4000,
      topP: options?.topP ?? 1.0,
      frequencyPenalty: options?.frequencyPenalty ?? 0,
      presencePenalty: options?.presencePenalty ?? 0,
      stop: options?.stop ?? [],
      stream: options?.stream ?? false,
      functions: options?.functions ?? [],
      functionCall: options?.functionCall ?? 'auto',
    };
  }

  /**
   * Log request for debugging (can be overridden)
   */
  protected logRequest(
    messages: LLMMessage[],
    options: GenerationOptions,
    requestId?: string
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] Request:`, {
        requestId,
        messageCount: messages.length,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
    }
  }

  /**
   * Log response for debugging (can be overridden)
   */
  protected logResponse(
    response: LLMResponse,
    requestId?: string
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] Response:`, {
        requestId,
        model: response.model,
        tokens: response.usage.totalTokens,
        latency: response.metadata?.latencyMs,
        cost: response.metadata?.cost?.total,
      });
    }
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
    };
  }
}
