/**
 * OpenAIProvider - Direct OpenAI API Integration
 *
 * Enables users to use their own OpenAI API keys directly.
 * Supports GPT-4, GPT-3.5, and other OpenAI models.
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
import { OpenAIConfig } from '../interfaces/ILLMConfig';

const OPENAI_MODELS: Record<string, { name: string; contextLength: number; inputPrice: number; outputPrice: number }> = {
  'gpt-4-turbo': { name: 'GPT-4 Turbo', contextLength: 128000, inputPrice: 0.01, outputPrice: 0.03 },
  'gpt-4': { name: 'GPT-4', contextLength: 8192, inputPrice: 0.03, outputPrice: 0.06 },
  'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', contextLength: 16385, inputPrice: 0.0005, outputPrice: 0.0015 },
  'gpt-4o': { name: 'GPT-4o', contextLength: 128000, inputPrice: 0.005, outputPrice: 0.015 },
  'gpt-4o-mini': { name: 'GPT-4o Mini', contextLength: 128000, inputPrice: 0.00015, outputPrice: 0.0006 },
};

export class OpenAIProvider extends BaseProvider {
  private config: OpenAIConfig['config'];
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    super(config.id, 'openai', config.name, config.priority);
    this.config = config.config;
    this.baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
  }

  async initialize(): Promise<void> {
    const validation = await this.validate();
    if (!validation.valid) {
      throw new LLMAuthenticationError(validation.error || 'Invalid API key', this.name);
    }
    this.initialized = true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401) {
        return { status: 'unhealthy', lastChecked: new Date(), error: 'Invalid API key' };
      }

      const responseTime = Date.now() - startTime;
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        availableModels: Object.keys(OPENAI_MODELS),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async chat(messages: LLMMessage[], options?: GenerationOptions): Promise<LLMResponse> {
    if (!this.initialized) await this.initialize();

    const opts = this.applyDefaults(options);
    const model = opts.model || this.config.defaultModel;

    return this.withRetry(async () => {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.config.organizationId && { 'OpenAI-Organization': this.config.organizationId }),
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(messages),
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
          top_p: opts.topP,
          frequency_penalty: opts.frequencyPenalty,
          presence_penalty: opts.presencePenalty,
          stop: opts.stop,
        }),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      const latency = Date.now() - startTime;

      if (response.status === 401) {
        throw new LLMAuthenticationError('Invalid API key', this.name);
      }
      if (response.status === 429) {
        throw new LLMRateLimitError('Rate limit exceeded', this.name);
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMError(errorData.error?.message || `Request failed: ${response.status}`, 'API_ERROR', response.status, this.name);
      }

      const data = await response.json();
      const modelInfo = OPENAI_MODELS[model] || OPENAI_MODELS['gpt-3.5-turbo'];
      const cost = (data.usage.prompt_tokens / 1000) * modelInfo.inputPrice + (data.usage.completion_tokens / 1000) * modelInfo.outputPrice;

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason,
        metadata: {
          latencyMs: latency,
          cost: {
            input: (data.usage.prompt_tokens / 1000) * modelInfo.inputPrice,
            output: (data.usage.completion_tokens / 1000) * modelInfo.outputPrice,
            total: cost,
          },
          providerId: this.id,
          requestId: data.id,
        },
      };
    }, 'chat');
  }

  async *chatStream(messages: LLMMessage[], options?: GenerationOptions): AsyncGenerator<LLMStreamChunk, void, unknown> {
    if (!this.initialized) await this.initialize();

    const opts = this.applyDefaults(options);
    const model = opts.model || this.config.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new LLMError(`Stream failed: ${response.status}`, 'API_ERROR', response.status, this.name);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new LLMError('No response body', 'API_ERROR', 500, this.name);

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
            yield { delta: content, finishReason: parsed.choices[0]?.finish_reason };
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return Object.entries(OPENAI_MODELS).map(([id, info]) => ({
      id,
      name: info.name,
      provider: 'openai',
      contextLength: info.contextLength,
      capabilities: { streaming: true, functions: true, vision: id.includes('gpt-4'), json_mode: true },
      pricing: { input: info.inputPrice, output: info.outputPrice },
      description: `OpenAI ${info.name}`,
    }));
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (!response.ok) {
        return { valid: false, error: `Validation failed: ${response.status}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }
}
