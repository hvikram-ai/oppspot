/**
 * LLM Client Wrapper - Backward Compatibility Layer
 *
 * Provides backward compatibility with existing OpenRouterClient interface
 * while using the new LLMManager system under the hood.
 *
 * Feature Flag: ENABLE_NEW_LLM_SYSTEM
 * - When true: Uses LLMManager with user configurations
 * - When false: Falls back to legacy OpenRouterClient
 */

import { Database } from '@/lib/supabase/database.types';
import {
  LLMProvider,
  LLMService,
  GenerationOptions,
  ModelCapabilities,
  ProviderStatus,
  TestResult,
  LLMError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMQuotaExceededError,
} from './llm-interface';
import { createLLMManager } from '@/lib/llm/manager/LLMManager';
import { OpenRouterClient } from './openrouter';

type Business = Database['public']['Tables']['businesses']['Row'];

/**
 * Wrapper class that uses LLMManager while maintaining OpenRouterClient API
 */
export class LLMClientWrapper implements LLMProvider, LLMService {
  private userId?: string;
  private legacyClient?: OpenRouterClient;

  constructor(apiKey: string, userId?: string) {
    this.userId = userId;

    // Keep legacy client as fallback
    this.legacyClient = new OpenRouterClient(apiKey);
  }

  /**
   * Check if new LLM system is enabled
   */
  private isNewSystemEnabled(): boolean {
    return process.env.ENABLE_NEW_LLM_SYSTEM === 'true';
  }

  /**
   * Generate a business description using AI
   */
  async generateBusinessDescription(business: Partial<Business>): Promise<string> {
    // Use legacy implementation for now
    // Will migrate in Phase 4.5
    return this.legacyClient!.generateBusinessDescription(business);
  }

  /**
   * Generate business insights and analysis
   */
  async generateBusinessInsights(business: Partial<Business>): Promise<{
    market_position: string;
    target_audience: string;
    competitive_advantages: string[];
    growth_opportunities: string[];
    challenges: string[];
  }> {
    // Use legacy implementation for now
    return this.legacyClient!.generateBusinessInsights(business);
  }

  /**
   * Generate SEO keywords for a business
   */
  async generateSEOKeywords(business: Partial<Business>): Promise<string[]> {
    // Use legacy implementation for now
    return this.legacyClient!.generateSEOKeywords(business);
  }

  /**
   * Generate a tagline for a business
   */
  async generateTagline(business: Partial<Business>): Promise<string> {
    // Use legacy implementation for now
    return this.legacyClient!.generateTagline(business);
  }

  /**
   * Categorize a business based on its information
   */
  async suggestCategories(business: Partial<Business>): Promise<string[]> {
    // Use legacy implementation for now
    return this.legacyClient!.suggestCategories(business);
  }

  /**
   * Generate text completion using LLMManager (with fallback)
   */
  async complete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    // Check if new system is enabled and user ID is provided
    if (!this.isNewSystemEnabled() || !this.userId) {
      return this.legacyClient!.complete(prompt, options);
    }

    try {
      const manager = await createLLMManager({
        userId: this.userId,
        enableFallback: true,
        enableCaching: true,
        enableUsageTracking: true,
      });

      try {
        // Convert options to new format
        const messages = [];

        if (options.system_prompt) {
          messages.push({
            role: 'system' as const,
            content: options.system_prompt,
          });
        }

        messages.push({
          role: 'user' as const,
          content: prompt,
        });

        // Use LLMManager
        const response = await manager.chat(messages, {
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.max_tokens,
        });

        return response.content;
      } finally {
        await manager.cleanup();
      }
    } catch (error) {
      console.error('[LLMClientWrapper] New system failed, falling back to legacy:', error);
      // Fallback to legacy client
      return this.legacyClient!.complete(prompt, options);
    }
  }

  /**
   * Fast completion using the lighter model
   */
  async fastComplete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    return this.complete(prompt, {
      ...options,
      model: options.model || 'anthropic/claude-3-haiku',
    });
  }

  /**
   * Check if OpenRouter service is accessible
   */
  async validateAccess(): Promise<boolean> {
    return this.legacyClient!.validateAccess();
  }

  /**
   * Get model capabilities and configuration
   */
  getModelCapabilities(): Record<string, ModelCapabilities | any> {
    return this.legacyClient!.getModelCapabilities();
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  estimateTokens(text: string): number {
    return this.legacyClient!.estimateTokens(text);
  }

  /**
   * Calculate cost for given number of tokens
   */
  calculateCost(tokens: number): number {
    return this.legacyClient!.calculateCost(tokens);
  }

  /**
   * Get current provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    return this.legacyClient!.getStatus();
  }

  /**
   * Test the provider with a simple request
   */
  async testModel(modelName?: string): Promise<TestResult> {
    return this.legacyClient!.testModel(modelName);
  }

  /**
   * Check remaining credits/usage
   */
  async checkUsage(): Promise<{
    credits_remaining?: number;
    credits_used?: number;
  }> {
    return this.legacyClient!.checkUsage();
  }
}

// Export class alias for backward compatibility
export { LLMClientWrapper as LLMClient };

// Create singleton instance (with optional user context)
let globalClient: LLMClientWrapper | null = null;

/**
 * Get AI client instance
 *
 * @param userId - Optional user ID for per-user LLM management
 * @returns LLMClientWrapper instance
 */
export function getAIClient(userId?: string): LLMClientWrapper {
  // If userId provided, always create new instance for that user
  if (userId) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    return new LLMClientWrapper(apiKey, userId);
  }

  // Otherwise use singleton
  if (!globalClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    globalClient = new LLMClientWrapper(apiKey);
  }
  return globalClient;
}

/**
 * Helper: Get LLMManager for a user (new system only)
 *
 * Use this in new code that doesn't need backward compatibility
 */
export async function getUserLLMManager(userId: string) {
  return await createLLMManager({
    userId,
    enableFallback: true,
    enableCaching: true,
    enableUsageTracking: true,
  });
}
