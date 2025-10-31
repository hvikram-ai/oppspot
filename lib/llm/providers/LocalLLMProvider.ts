/**
 * LocalLLMProvider - Local LLM Support (Ollama, LM Studio, LocalAI)
 *
 * Enables users to run LLMs locally for zero API cost and maximum privacy.
 * Supports:
 * - Ollama (port 11434)
 * - LM Studio (port 1234)
 * - LocalAI (port 8080)
 * - Custom OpenAI-compatible endpoints
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
  LLMTimeoutError,
  LLMUnavailableError,
} from '../interfaces/ILLMProvider';
import { LocalLLMConfig } from '../interfaces/ILLMConfig';

interface OllamaModelDetails {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaGenerateRequest {
  model: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class LocalLLMProvider extends BaseProvider {
  private config: LocalLLMConfig['config'];
  private baseUrl: string;

  constructor(config: LocalLLMConfig) {
    super(config.id, 'local', config.name, config.priority);
    this.config = config.config;
    this.baseUrl = this.config.endpoint.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      const health = await this.healthCheck();

      if (health.status === 'unhealthy') {
        throw new LLMUnavailableError(
          `Local LLM server at ${this.baseUrl} is not available`,
          this.name
        );
      }

      // Fetch available models if not provided
      if (!this.config.availableModels || this.config.availableModels.length === 0) {
        const models = await this.listModels();
        this.config.availableModels = models.map(m => m.id);
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
      // Check if server is responsive
      const endpoint = this.config.serverType === 'ollama'
        ? `${this.baseUrl}/api/tags`
        : `${this.baseUrl}/v1/models`;

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      // Extract available models
      let availableModels: string[] = [];
      if (this.config.serverType === 'ollama' && data.models) {
        availableModels = data.models.map((m: OllamaModelDetails) => m.name);
      } else if (data.data) {
        availableModels = data.data.map((m: { id: string }) => m.id);
      }

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

      if (this.config.serverType === 'ollama') {
        return await this.ollamaChat(messages, model, opts, startTime);
      } else {
        return await this.openAICompatibleChat(messages, model, opts, startTime);
      }
    }, 'chat');
  }

  /**
   * Ollama-specific chat implementation
   */
  private async ollamaChat(
    messages: LLMMessage[],
    model: string,
    opts: Required<GenerationOptions>,
    startTime: number
  ): Promise<LLMResponse> {
    const payload: OllamaGenerateRequest = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: opts.temperature,
        top_p: opts.topP,
        num_predict: opts.maxTokens,
        stop: opts.stop,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout || this.defaultTimeout),
    });

    if (!response.ok) {
      throw new LLMError(
        `Ollama request failed: ${response.status} ${response.statusText}`,
        'API_ERROR',
        response.status,
        this.name
      );
    }

    const data: OllamaResponse = await response.json();
    const latency = Date.now() - startTime;

    return {
      content: data.message.content,
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: 'stop',
      metadata: {
        latencyMs: latency,
        cost: { input: 0, output: 0, total: 0 }, // Local = zero cost
        providerId: this.id,
      },
    };
  }

  /**
   * OpenAI-compatible chat implementation (for LM Studio, LocalAI, etc.)
   */
  private async openAICompatibleChat(
    messages: LLMMessage[],
    model: string,
    opts: Required<GenerationOptions>,
    startTime: number
  ): Promise<LLMResponse> {
    const payload = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      top_p: opts.topP,
      frequency_penalty: opts.frequencyPenalty,
      presence_penalty: opts.presencePenalty,
      stop: opts.stop,
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout || this.defaultTimeout),
    });

    if (!response.ok) {
      throw new LLMError(
        `Local LLM request failed: ${response.status} ${response.statusText}`,
        'API_ERROR',
        response.status,
        this.name
      );
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0].finish_reason || 'stop',
      metadata: {
        latencyMs: latency,
        cost: { input: 0, output: 0, total: 0 }, // Local = zero cost
        providerId: this.id,
      },
    };
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

    if (this.config.serverType === 'ollama') {
      yield* this.ollamaStreamChat(messages, model, opts);
    } else {
      yield* this.openAICompatibleStreamChat(messages, model, opts);
    }
  }

  /**
   * Ollama streaming implementation
   */
  private async *ollamaStreamChat(
    messages: LLMMessage[],
    model: string,
    opts: Required<GenerationOptions>
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const payload: OllamaGenerateRequest = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      options: {
        temperature: opts.temperature,
        top_p: opts.topP,
        num_predict: opts.maxTokens,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new LLMError(
        `Ollama stream failed: ${response.status}`,
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
          if (!line.trim()) continue;

          try {
            const data: OllamaResponse = JSON.parse(line);

            yield {
              delta: data.message?.content || '',
              finishReason: data.done ? 'stop' : undefined,
              usage: data.done ? {
                promptTokens: data.prompt_eval_count,
                completionTokens: data.eval_count,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
              } : undefined,
            };
          } catch (e) {
            console.error('Failed to parse Ollama stream chunk:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * OpenAI-compatible streaming implementation
   */
  private async *openAICompatibleStreamChat(
    messages: LLMMessage[],
    model: string,
    opts: Required<GenerationOptions>
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const payload = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new LLMError(
        `Local LLM stream failed: ${response.status}`,
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

          const data = line.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';

            yield {
              delta: content,
              finishReason: parsed.choices[0]?.finish_reason,
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
      if (this.config.serverType === 'ollama') {
        return await this.listOllamaModels();
      } else {
        return await this.listOpenAICompatibleModels();
      }
    } catch (error) {
      console.error(`Failed to list models from ${this.name}:`, error);
      return [];
    }
  }

  /**
   * List Ollama models
   */
  private async listOllamaModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.models || []).map((model: OllamaModelDetails) => ({
      id: model.name,
      name: model.name,
      provider: 'local' as const,
      contextLength: 4096, // Default, actual varies by model
      capabilities: {
        streaming: true,
        functions: false,
        vision: false,
        json_mode: true,
      },
      pricing: { input: 0, output: 0 }, // Local = free
      description: `Local Ollama model: ${model.details?.family || 'unknown'}`,
    }));
  }

  /**
   * List OpenAI-compatible models
   */
  private async listOpenAICompatibleModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.data || []).map((model: { id: string; object: string }) => ({
      id: model.id,
      name: model.id,
      provider: 'local' as const,
      contextLength: 4096,
      capabilities: {
        streaming: true,
        functions: false,
        vision: false,
        json_mode: false,
      },
      pricing: { input: 0, output: 0 },
      description: `Local model: ${model.id}`,
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
    try {
      // Check if endpoint is reachable
      const health = await this.healthCheck();

      if (health.status === 'unhealthy') {
        return {
          valid: false,
          error: health.error || 'Server is not reachable',
        };
      }

      // Check if default model is available
      const models = await this.listModels();
      const hasDefaultModel = models.some(m => m.id === this.config.defaultModel);

      if (!hasDefaultModel) {
        return {
          valid: false,
          error: `Default model "${this.config.defaultModel}" not found. Available: ${models.map(m => m.id).join(', ')}`,
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
   * Static method: Auto-detect local LLM servers
   */
  static async discoverLocalServers(): Promise<Array<{
    serverType: 'ollama' | 'lmstudio' | 'localai';
    endpoint: string;
    available: boolean;
    models?: string[];
  }>> {
    const servers = [
      { type: 'ollama' as const, url: 'http://localhost:11434', path: '/api/tags' },
      { type: 'lmstudio' as const, url: 'http://localhost:1234', path: '/v1/models' },
      { type: 'localai' as const, url: 'http://localhost:8080', path: '/v1/models' },
    ];

    const results = await Promise.all(
      servers.map(async (server) => {
        try {
          const response = await fetch(`${server.url}${server.path}`, {
            signal: AbortSignal.timeout(2000),
          });

          if (response.ok) {
            const data = await response.json();
            const models = server.type === 'ollama'
              ? (data.models || []).map((m: OllamaModelDetails) => m.name)
              : (data.data || []).map((m: { id: string }) => m.id);

            return {
              serverType: server.type,
              endpoint: server.url,
              available: true,
              models,
            };
          }
        } catch {
          // Server not available
        }

        return {
          serverType: server.type,
          endpoint: server.url,
          available: false,
        };
      })
    );

    return results;
  }
}
