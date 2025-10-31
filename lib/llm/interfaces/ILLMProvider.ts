/**
 * Core LLM Provider Interface
 *
 * Defines the contract that all LLM providers must implement.
 * Based on enterprise architecture from appboardguru2.
 */

export type ProviderType =
  | 'local'          // Ollama, LM Studio, LocalAI
  | 'openrouter'     // OpenRouter (BYOK)
  | 'openai'         // OpenAI direct API
  | 'anthropic'      // Anthropic direct API
  | 'managed'        // oppSpot managed service
  | 'custom';        // Custom endpoint

export type ProviderStatus =
  | 'healthy'        // Provider is operational
  | 'degraded'       // Provider is slow or partially working
  | 'unhealthy'      // Provider is failing
  | 'unknown';       // Status not yet checked

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface LLMFunction {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'error';
  functionCall?: {
    name: string;
    arguments: string;
  };
  metadata?: {
    latencyMs: number;
    cost?: {
      input: number;
      output: number;
      total: number;
    };
    cached?: boolean;
    providerId: string;
    requestId?: string;
  };
}

export interface LLMStreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length' | 'function_call' | 'content_filter';
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextLength: number;
  capabilities: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
    json_mode: boolean;
  };
  pricing?: {
    input: number;   // cost per 1k input tokens
    output: number;  // cost per 1k output tokens
  };
  description?: string;
}

export interface ProviderHealth {
  status: ProviderStatus;
  lastChecked: Date;
  responseTime?: number;  // milliseconds
  errorRate?: number;     // percentage
  availableModels?: string[];
  error?: string;
}

/**
 * Main interface that all LLM providers must implement
 */
export interface ILLMProvider {
  /**
   * Unique identifier for this provider configuration
   */
  readonly id: string;

  /**
   * Provider type
   */
  readonly type: ProviderType;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Priority for provider selection (1 = highest)
   */
  readonly priority: number;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if provider is available and healthy
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Generate a chat completion
   */
  chat(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse>;

  /**
   * Generate a streaming chat completion
   */
  chatStream(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  /**
   * List available models
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Get information about a specific model
   */
  getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Estimate cost for a request (in USD)
   */
  estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: string
  ): Promise<number>;

  /**
   * Count tokens in text for a specific model
   */
  countTokens(text: string, model?: string): Promise<number>;

  /**
   * Validate provider configuration
   */
  validate(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

/**
 * Error classes
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, 'TIMEOUT', 408, provider);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMUnavailableError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, 'UNAVAILABLE', 503, provider);
    this.name = 'LLMUnavailableError';
  }
}

export class LLMQuotaExceededError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, 'QUOTA_EXCEEDED', 429, provider);
    this.name = 'LLMQuotaExceededError';
  }
}

export class LLMAuthenticationError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_FAILED', 401, provider);
    this.name = 'LLMAuthenticationError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string, provider?: string, public readonly retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, provider);
    this.name = 'LLMRateLimitError';
  }
}
