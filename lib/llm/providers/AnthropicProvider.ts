/**
 * AnthropicProvider - Direct Anthropic API Integration
 *
 * Enables users to use their own Anthropic API keys directly.
 * Supports Claude 3 family models (Haiku, Sonnet, Opus).
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
import { AnthropicConfig } from '../interfaces/ILLMConfig';

const ANTHROPIC_MODELS: Record<string, { name: string; contextLength: number; inputPrice: number; outputPrice: number }> = {
  'claude-3-opus-20240229': { name: 'Claude 3 Opus', contextLength: 200000, inputPrice: 0.015, outputPrice: 0.075 },
  'claude-3-sonnet-20240229': { name: 'Claude 3 Sonnet', contextLength: 200000, inputPrice: 0.003, outputPrice: 0.015 },
  'claude-3-haiku-20240307': { name: 'Claude 3 Haiku', contextLength: 200000, inputPrice: 0.00025, outputPrice: 0.00125 },
  'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', contextLength: 200000, inputPrice: 0.003, outputPrice: 0.015 },
};

export class AnthropicProvider extends BaseProvider {
  private config: AnthropicConfig['config'];
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    super(config.id, 'anthropic', config.name, config.priority);
    this.config = config.config;
    this.baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
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
      // Anthropic doesn't have a health endpoint, so we test with a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401) {
        return { status: 'unhealthy', lastChecked: new Date(), error: 'Invalid API key' };
      }

      const responseTime = Date.now() - startTime;
      return {
        status: response.ok || response.status === 400 ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        availableModels: Object.keys(ANTHROPIC_MODELS),
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

      // Convert messages to Anthropic format (system message separate)
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: opts.maxTokens,
          temperature: opts.temperature,
          top_p: opts.topP,
          ...(systemMessage && { system: systemMessage.content }),
          messages: conversationMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
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
        throw new LLMError(
          errorData.error?.message || `Request failed: ${response.status}`,
          'API_ERROR',
          response.status,
          this.name
        );
      }

      const data = await response.json();
      const modelInfo = ANTHROPIC_MODELS[model] || ANTHROPIC_MODELS['claude-3-haiku-20240307'];
      const cost =
        (data.usage.input_tokens / 1000) * modelInfo.inputPrice +
        (data.usage.output_tokens / 1000) * modelInfo.outputPrice;

      return {
        content: data.content[0].text,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
        metadata: {
          latencyMs: latency,
          cost: {
            input: (data.usage.input_tokens / 1000) * modelInfo.inputPrice,
            output: (data.usage.output_tokens / 1000) * modelInfo.outputPrice,
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

    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        stream: true,
        ...(systemMessage && { system: systemMessage.content }),
        messages: conversationMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
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

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield { delta: parsed.delta.text };
            }

            if (parsed.type === 'message_stop') {
              yield { delta: '', finishReason: 'stop' };
            }

            if (parsed.type === 'message_delta' && parsed.usage) {
              yield {
                delta: '',
                usage: {
                  promptTokens: parsed.usage.input_tokens,
                  completionTokens: parsed.usage.output_tokens,
                  totalTokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
                },
              };
            }
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
    return Object.entries(ANTHROPIC_MODELS).map(([id, info]) => ({
      id,
      name: info.name,
      provider: 'anthropic',
      contextLength: info.contextLength,
      capabilities: { streaming: true, functions: false, vision: false, json_mode: false },
      pricing: { input: info.inputPrice, output: info.outputPrice },
      description: `Anthropic ${info.name}`,
    }));
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Test' }],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (!response.ok && response.status !== 400) {
        return { valid: false, error: `Validation failed: ${response.status}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }
}
