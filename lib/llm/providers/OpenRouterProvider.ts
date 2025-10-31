/**
 * OpenRouterProvider - OpenRouter API (BYOK - Bring Your Own Key)
 *
 * Enables users to use their own OpenRouter API subscription.
 * Provides access to 100+ models from multiple providers.
 *
 * Features:
 * - Access to all OpenRouter models (GPT-4, Claude, Llama, etc.)
 * - Streaming support
 * - Usage tracking
 * - Cost calculation
 * - Model pricing information
 */

import { BaseProvider } from './BaseProvider';
import {
  LLMMessage,
  GenerationOptions,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
  ProviderHealth,
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
} from '../interfaces/ILLMProvider';
import { OpenRouterConfig } from '../interfaces/ILLMConfig';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;   // price per 1M tokens
    completion: string; // price per 1M tokens
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export class OpenRouterProvider extends BaseProvider {
  private config: OpenRouterConfig['config'];
  private baseUrl: string;
  private modelCache: Map<string, OpenRouterModel> = new Map();
  private lastModelSync?: Date;

  constructor(config: OpenRouterConfig) {
    super(config.id, 'openrouter', config.name, config.priority);
    this.config = config.config;
    this.baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    try {
      // Validate API key
      const validation = await this.validate();
      if (!validation.valid) {
        throw new LLMAuthenticationError(
          validation.error || 'Invalid API key',
          this.name
        );
      }

      // Cache available models
      await this.syncModels();

      this.initialized = true;
    } catch (error) {
      throw this.handleError(error, 'Initialization failed');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Test API with a minimal request
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 401) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: 'Invalid API key or authentication failed',
        };
      }

      if (!response.ok) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: `API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const availableModels = (data.data || []).slice(0, 10).map((m: OpenRouterModel) => m.id);

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
        availableModels,
        errorRate: this.getErrorRate(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate chat completion
   */
  async chat(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const opts = this.applyDefaults(options);
    const model = opts.model || this.config.defaultModel;

    return this.withRetry(async () => {
      const startTime = Date.now();

      const payload = {
        model,
        messages: this.formatMessages(messages),
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        top_p: opts.topP,
        frequency_penalty: opts.frequencyPenalty,
        presence_penalty: opts.presencePenalty,
        stop: opts.stop,
        stream: false,
      };

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.config.siteUrl || 'https://oppspot.ai',
        'X-Title': this.config.siteName || 'oppSpot',
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      const latency = Date.now() - startTime;

      // Handle errors
      if (response.status === 401) {
        throw new LLMAuthenticationError(
          'Invalid API key or authentication failed',
          this.name
        );
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new LLMRateLimitError(
          'Rate limit exceeded',
          this.name,
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMError(
          errorData.error?.message || `API request failed: ${response.status}`,
          'API_ERROR',
          response.status,
          this.name
        );
      }

      const data: OpenRouterResponse = await response.json();

      // Calculate cost
      const cost = await this.estimateCost(
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
        data.model
      );

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: (data.choices[0].finish_reason as any) || 'stop',
        metadata: {
          latencyMs: latency,
          cost: {
            input: (data.usage.prompt_tokens / 1000) * (await this.getModelInputPrice(data.model)),
            output: (data.usage.completion_tokens / 1000) * (await this.getModelOutputPrice(data.model)),
            total: cost,
          },
          providerId: this.id,
          requestId: data.id,
        },
      };
    }, 'chat');
  }

  /**
   * Generate streaming chat completion
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    if (!this.initialized) {
      await this.initialize();
    }

    const opts = this.applyDefaults(options);
    const model = opts.model || this.config.defaultModel;

    const payload = {
      model,
      messages: this.formatMessages(messages),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      top_p: opts.topP,
      stream: true,
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.config.siteUrl || 'https://oppspot.ai',
      'X-Title': this.config.siteName || 'oppSpot',
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      throw new LLMAuthenticationError('Invalid API key', this.name);
    }

    if (!response.ok) {
      throw new LLMError(
        `Stream request failed: ${response.status}`,
        'API_ERROR',
        response.status,
        this.name
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body', 'API_ERROR', 500, this.name);
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            const finishReason = parsed.choices[0]?.finish_reason;

            yield {
              delta: content,
              finishReason,
              usage: parsed.usage ? {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              } : undefined,
            };
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      // Return cached models if recently synced
      if (this.lastModelSync && (Date.now() - this.lastModelSync.getTime() < 3600000)) {
        return Array.from(this.modelCache.values()).map(m => this.mapToModelInfo(m));
      }

      await this.syncModels();
      return Array.from(this.modelCache.values()).map(m => this.mapToModelInfo(m));
    } catch (error) {
      console.error('Failed to list OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Sync models from OpenRouter API
   */
  private async syncModels(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new LLMError('Failed to fetch models', 'API_ERROR', response.status, this.name);
    }

    const data = await response.json();
    this.modelCache.clear();

    for (const model of data.data || []) {
      this.modelCache.set(model.id, model);
    }

    this.lastModelSync = new Date();
  }

  /**
   * Get model info
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // Check cache first
    if (this.modelCache.has(modelId)) {
      return this.mapToModelInfo(this.modelCache.get(modelId)!);
    }

    // Fetch all models if cache is empty
    if (this.modelCache.size === 0) {
      await this.syncModels();
    }

    const model = this.modelCache.get(modelId);
    return model ? this.mapToModelInfo(model) : null;
  }

  /**
   * Map OpenRouter model to ModelInfo
   */
  private mapToModelInfo(model: OpenRouterModel): ModelInfo {
    return {
      id: model.id,
      name: model.name,
      provider: 'openrouter',
      contextLength: model.context_length,
      capabilities: {
        streaming: true,
        functions: true,
        vision: model.id.includes('vision') || model.id.includes('gpt-4o'),
        json_mode: true,
      },
      pricing: {
        input: parseFloat(model.pricing.prompt) / 1000, // Convert to per 1k tokens
        output: parseFloat(model.pricing.completion) / 1000,
      },
      description: model.description,
    };
  }

  /**
   * Get model input price (per 1k tokens)
   */
  private async getModelInputPrice(modelId: string): Promise<number> {
    const info = await this.getModelInfo(modelId);
    return info?.pricing?.input || 0;
  }

  /**
   * Get model output price (per 1k tokens)
   */
  private async getModelOutputPrice(modelId: string): Promise<number> {
    const info = await this.getModelInfo(modelId);
    return info?.pricing?.output || 0;
  }

  /**
   * Estimate cost
   */
  async estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: string
  ): Promise<number> {
    const inputPrice = await this.getModelInputPrice(model);
    const outputPrice = await this.getModelOutputPrice(model);

    const inputCost = (promptTokens / 1000) * inputPrice;
    const outputCost = (completionTokens / 1000) * outputPrice;

    return inputCost + outputCost;
  }

  /**
   * Validate configuration
   */
  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test API key with a simple request
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Invalid API key. Please check your OpenRouter API key.',
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          error: `API validation failed: ${response.status} ${response.statusText}`,
        };
      }

      // Check if default model exists
      const data = await response.json();
      const models = data.data || [];
      const hasDefaultModel = models.some((m: OpenRouterModel) => m.id === this.config.defaultModel);

      if (!hasDefaultModel) {
        return {
          valid: false,
          error: `Default model "${this.config.defaultModel}" not found in OpenRouter`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
}
