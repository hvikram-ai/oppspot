/**
 * FallbackHandler - Manages Provider Fallback Logic
 *
 * Handles automatic fallback between providers when primary fails.
 * Tracks fallback attempts and provides logging.
 */

import { ILLMProvider, LLMError, LLMMessage, GenerationOptions, LLMResponse } from '../interfaces/ILLMProvider';
import { FallbackLog } from '../types';

export interface FallbackOptions {
  enableFallback: boolean;
  maxRetries: number;
  providers: ILLMProvider[];
  onFallback?: (providerId: string, error: string) => void;
}

export interface FallbackResult {
  success: boolean;
  response?: LLMResponse;
  error?: string;
  attemptsLog: Array<{
    providerId: string;
    providerName: string;
    status: 'success' | 'failed' | 'timeout' | 'rate_limited';
    error?: string;
    latencyMs?: number;
  }>;
  totalLatencyMs: number;
}

export class FallbackHandler {
  private options: FallbackOptions;

  constructor(options: FallbackOptions) {
    this.options = options;
  }

  /**
   * Execute a request with fallback logic
   */
  async executeWithFallback(
    messages: LLMMessage[],
    generationOptions?: GenerationOptions
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const attemptsLog: FallbackResult['attemptsLog'] = [];

    if (!this.options.enableFallback || this.options.providers.length === 0) {
      return {
        success: false,
        error: 'No providers available or fallback disabled',
        attemptsLog,
        totalLatencyMs: Date.now() - startTime,
      };
    }

    // Try each provider in order of priority
    for (const provider of this.options.providers) {
      const attemptStart = Date.now();

      try {
        // Attempt request with this provider
        const response = await provider.chat(messages, generationOptions);

        const attemptLatency = Date.now() - attemptStart;

        attemptsLog.push({
          providerId: provider.id,
          providerName: provider.name,
          status: 'success',
          latencyMs: attemptLatency,
        });

        return {
          success: true,
          response,
          attemptsLog,
          totalLatencyMs: Date.now() - startTime,
        };
      } catch (error) {
        const attemptLatency = Date.now() - attemptStart;
        const llmError = error as LLMError;

        const status = this.classifyError(llmError);

        attemptsLog.push({
          providerId: provider.id,
          providerName: provider.name,
          status,
          error: llmError.message,
          latencyMs: attemptLatency,
        });

        // Notify about fallback
        if (this.options.onFallback) {
          this.options.onFallback(provider.id, llmError.message);
        }

        console.warn(
          `[FallbackHandler] Provider ${provider.name} failed: ${llmError.message}. Trying next provider...`
        );

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    return {
      success: false,
      error: 'All providers failed',
      attemptsLog,
      totalLatencyMs: Date.now() - startTime,
    };
  }

  /**
   * Execute a streaming request with fallback logic
   */
  async *executeStreamWithFallback(
    messages: LLMMessage[],
    generationOptions?: GenerationOptions
  ): AsyncGenerator<{ providerId: string; chunk: any }, void, unknown> {
    if (!this.options.enableFallback || this.options.providers.length === 0) {
      throw new LLMError('No providers available or fallback disabled', 'NO_PROVIDERS', 500);
    }

    // Try each provider in order
    for (const provider of this.options.providers) {
      try {
        // Attempt streaming with this provider
        for await (const chunk of provider.chatStream(messages, generationOptions)) {
          yield {
            providerId: provider.id,
            chunk,
          };
        }

        // If we get here, streaming was successful
        return;
      } catch (error) {
        const llmError = error as LLMError;

        // Notify about fallback
        if (this.options.onFallback) {
          this.options.onFallback(provider.id, llmError.message);
        }

        console.warn(
          `[FallbackHandler] Provider ${provider.name} streaming failed: ${llmError.message}. Trying next provider...`
        );

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new LLMError('All providers failed for streaming', 'ALL_PROVIDERS_FAILED', 500);
  }

  /**
   * Classify error type for logging
   */
  private classifyError(error: LLMError): 'failed' | 'timeout' | 'rate_limited' {
    if (error.code === 'TIMEOUT') return 'timeout';
    if (error.code === 'RATE_LIMIT') return 'rate_limited';
    return 'failed';
  }

  /**
   * Create fallback log entry for database
   */
  createFallbackLog(
    userId: string,
    requestId: string,
    result: FallbackResult
  ): FallbackLog {
    return {
      requestId,
      userId,
      originalConfigId: this.options.providers[0]?.id || '',
      fallbackChain: this.options.providers.map(p => p.id),
      executedProviders: result.attemptsLog.map((attempt, index) => ({
        configId: attempt.providerId,
        providerName: attempt.providerName,
        attempt: index + 1,
        status: attempt.status,
        error: attempt.error,
        latencyMs: attempt.latencyMs,
      })),
      finalStatus: result.success ? 'success' : 'all_failed',
      totalLatencyMs: result.totalLatencyMs,
      createdAt: new Date(),
    };
  }

  /**
   * Update provider list
   */
  updateProviders(providers: ILLMProvider[]): void {
    this.options.providers = providers;
  }

  /**
   * Get current provider list
   */
  getProviders(): ILLMProvider[] {
    return this.options.providers;
  }

  /**
   * Check if fallback is enabled
   */
  isEnabled(): boolean {
    return this.options.enableFallback;
  }

  /**
   * Enable/disable fallback
   */
  setEnabled(enabled: boolean): void {
    this.options.enableFallback = enabled;
  }
}
