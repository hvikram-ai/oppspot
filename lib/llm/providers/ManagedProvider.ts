/**
 * ManagedProvider - oppSpot Managed LLM Service
 *
 * Uses oppSpot's managed OpenRouter account with usage tracking and quota management.
 * This is the default provider for users who don't provide their own API keys.
 *
 * Features:
 * - Access to curated models via system OpenRouter key
 * - Usage tracking and billing
 * - Monthly token/cost limits
 * - Rate limiting per user
 * - Quota management
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
  LLMQuotaExceededError,
  LLMRateLimitError,
} from '../interfaces/ILLMProvider';
import { ManagedConfig } from '../interfaces/ILLMConfig';
import { createClient } from '@/lib/supabase/server';

interface QuotaInfo {
  userId: string;
  monthlyTokenLimit: number;
  tokensUsed: number;
  monthlyCostLimit: number;
  costUsed: number;
  requestsThisMinute: number;
  rateLimitRPM: number;
}

/**
 * Available models for managed service (curated list)
 */
const MANAGED_MODELS = {
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    contextLength: 200000,
    pricingInput: 0.00025,  // $0.25 per 1M tokens
    pricingOutput: 0.00125,  // $1.25 per 1M tokens
    description: 'Fast and cost-effective for most tasks',
  },
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    contextLength: 200000,
    pricingInput: 0.003,    // $3 per 1M tokens
    pricingOutput: 0.015,    // $15 per 1M tokens
    description: 'Most intelligent model for complex tasks',
  },
  'openai/gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    contextLength: 128000,
    pricingInput: 0.01,      // $10 per 1M tokens
    pricingOutput: 0.03,      // $30 per 1M tokens
    description: 'Powerful model for strategic analysis',
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    contextLength: 16385,
    pricingInput: 0.0005,    // $0.50 per 1M tokens
    pricingOutput: 0.0015,    // $1.50 per 1M tokens
    description: 'Fast and economical for simple tasks',
  },
  'meta-llama/llama-3.1-8b-instruct': {
    name: 'Llama 3.1 8B',
    contextLength: 128000,
    pricingInput: 0.0001,    // $0.10 per 1M tokens
    pricingOutput: 0.0001,    // $0.10 per 1M tokens
    description: 'Open source, very cost-effective',
  },
};

export class ManagedProvider extends BaseProvider {
  private config: ManagedConfig['config'];
  private userId: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private systemApiKey: string;

  // Rate limiting
  private requestTimes: number[] = [];
  private readonly rateLimitWindow = 60000; // 1 minute

  constructor(config: ManagedConfig, userId: string) {
    super(config.id, 'managed', config.name, config.priority);
    this.config = config.config;
    this.userId = userId;

    // Get system OpenRouter key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        'OPENROUTER_API_KEY not configured for managed service',
        'CONFIGURATION_ERROR',
        500,
        this.name
      );
    }
    this.systemApiKey = apiKey;
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    try {
      // Validate system API key
      const validation = await this.validate();
      if (!validation.valid) {
        throw new LLMError(
          validation.error || 'System API key validation failed',
          'CONFIGURATION_ERROR',
          500,
          this.name
        );
      }

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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.systemApiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: `API returned ${response.status}`,
        };
      }

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
        availableModels: Object.keys(MANAGED_MODELS),
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

    // Check quota before making request
    await this.checkQuota(model, messages);

    // Check rate limit
    await this.checkRateLimit();

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
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.systemApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://oppspot.ai',
          'X-Title': 'oppSpot Managed Service',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMError(
          errorData.error?.message || `API request failed: ${response.status}`,
          'API_ERROR',
          response.status,
          this.name
        );
      }

      const data = await response.json();

      // Calculate cost
      const cost = this.calculateCost(
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
        model
      );

      // Track usage in database
      await this.trackUsage(
        model,
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
        cost,
        latency
      );

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason || 'stop',
        metadata: {
          latencyMs: latency,
          cost: {
            input: (data.usage.prompt_tokens / 1000) * this.getModelInputPrice(model),
            output: (data.usage.completion_tokens / 1000) * this.getModelOutputPrice(model),
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

    // Check quota and rate limit
    await this.checkQuota(model, messages);
    await this.checkRateLimit();

    const payload = {
      model,
      messages: this.formatMessages(messages),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.systemApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oppspot.ai',
        'X-Title': 'oppSpot Managed Service',
      },
      body: JSON.stringify(payload),
    });

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
    let totalTokens = 0;

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

            yield {
              delta: content,
              finishReason: parsed.choices[0]?.finish_reason,
              usage: parsed.usage ? {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              } : undefined,
            };

            if (parsed.usage) {
              totalTokens = parsed.usage.total_tokens;
            }
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }

      // Track usage after stream completes
      if (totalTokens > 0) {
        const cost = this.calculateCost(totalTokens * 0.7, totalTokens * 0.3, model);
        await this.trackUsage(model, Math.round(totalTokens * 0.7), Math.round(totalTokens * 0.3), cost, 0);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List available models (curated list for managed service)
   */
  async listModels(): Promise<ModelInfo[]> {
    return Object.entries(MANAGED_MODELS).map(([id, info]) => ({
      id,
      name: info.name,
      provider: 'managed',
      contextLength: info.contextLength,
      capabilities: {
        streaming: true,
        functions: id.startsWith('openai/gpt') || id.includes('claude'),
        vision: id.includes('gpt-4') && id.includes('vision'),
        json_mode: true,
      },
      pricing: {
        input: info.pricingInput,
        output: info.pricingOutput,
      },
      description: info.description,
    }));
  }

  /**
   * Get model info
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  /**
   * Validate configuration
   */
  async validate(): Promise<{ valid: boolean; error?: string }> {
    if (!this.systemApiKey) {
      return {
        valid: false,
        error: 'System OpenRouter API key not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.systemApiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `API validation failed: ${response.status}`,
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

  /**
   * Check user quota before making request
   */
  private async checkQuota(model: string, messages: LLMMessage[]): Promise<void> {
    const supabase = await createClient();

    // Get user's quota info
    const { data: quotaData } = await supabase
      .from('user_settings')
      .select('llm_monthly_tokens_used, llm_monthly_cost_used')
      .eq('user_id', this.userId)
      .single();

    const tokensUsed = quotaData?.llm_monthly_tokens_used || 0;
    const costUsed = quotaData?.llm_monthly_cost_used || 0;

    // Check token limit
    if (this.config.monthlyTokenLimit && tokensUsed >= this.config.monthlyTokenLimit) {
      throw new LLMQuotaExceededError(
        `Monthly token limit of ${this.config.monthlyTokenLimit} exceeded. Used: ${tokensUsed}`,
        this.name
      );
    }

    // Check cost limit
    if (this.config.monthlyCostLimit && costUsed >= this.config.monthlyCostLimit) {
      throw new LLMQuotaExceededError(
        `Monthly cost limit of $${this.config.monthlyCostLimit} exceeded. Used: $${costUsed.toFixed(2)}`,
        this.name
      );
    }

    // Estimate cost for this request
    const estimatedTokens = await this.estimateTokens(messages);
    const estimatedCost = this.calculateCost(estimatedTokens, estimatedTokens * 0.3, model);

    if (this.config.monthlyCostLimit && (costUsed + estimatedCost) > this.config.monthlyCostLimit) {
      throw new LLMQuotaExceededError(
        `This request would exceed your monthly cost limit of $${this.config.monthlyCostLimit}`,
        this.name
      );
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const rateLimitRPM = this.config.rateLimitRPM || 60;

    // Remove old request times
    this.requestTimes = this.requestTimes.filter(t => now - t < this.rateLimitWindow);

    // Check if rate limit exceeded
    if (this.requestTimes.length >= rateLimitRPM) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.rateLimitWindow - (now - oldestRequest);

      throw new LLMRateLimitError(
        `Rate limit of ${rateLimitRPM} requests per minute exceeded`,
        this.name,
        Math.ceil(waitTime / 1000)
      );
    }

    // Add current request
    this.requestTimes.push(now);
  }

  /**
   * Track usage in database
   */
  private async trackUsage(
    model: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    latencyMs: number
  ): Promise<void> {
    const supabase = await createClient();

    // Insert usage record
    await supabase.from('llm_usage').insert({
      user_id: this.userId,
      config_id: this.id,
      feature: 'managed',
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      input_cost: (promptTokens / 1000) * this.getModelInputPrice(model),
      output_cost: (completionTokens / 1000) * this.getModelOutputPrice(model),
      total_cost: cost,
      latency_ms: latencyMs,
      status: 'success',
    });

    // Update user's monthly totals
    await supabase.rpc('increment_llm_usage', {
      p_user_id: this.userId,
      p_tokens: promptTokens + completionTokens,
      p_cost: cost,
    });
  }

  /**
   * Calculate cost for a request
   */
  private calculateCost(promptTokens: number, completionTokens: number, model: string): number {
    const inputCost = (promptTokens / 1000) * this.getModelInputPrice(model);
    const outputCost = (completionTokens / 1000) * this.getModelOutputPrice(model);
    return inputCost + outputCost;
  }

  /**
   * Get model input price
   */
  private getModelInputPrice(model: string): number {
    return MANAGED_MODELS[model as keyof typeof MANAGED_MODELS]?.pricingInput || 0;
  }

  /**
   * Get model output price
   */
  private getModelOutputPrice(model: string): number {
    return MANAGED_MODELS[model as keyof typeof MANAGED_MODELS]?.pricingOutput || 0;
  }

  /**
   * Estimate tokens for messages
   */
  private async estimateTokens(messages: LLMMessage[]): Promise<number> {
    const text = messages.map(m => m.content).join(' ');
    return await this.countTokens(text);
  }
}
