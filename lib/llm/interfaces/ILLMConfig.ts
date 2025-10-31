/**
 * LLM Configuration Types
 *
 * Defines configuration structures for LLM providers and system-wide settings.
 * Based on enterprise architecture from appboardguru2.
 */

import { ProviderType } from './ILLMProvider';

/**
 * Base configuration for all LLM providers
 */
export interface BaseLLMConfig {
  id: string;
  userId: string;
  organizationId?: string;
  providerType: ProviderType;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  priority: number;  // 1 = highest priority
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  lastTestedAt?: Date;
  lastError?: string;
}

/**
 * Local LLM configuration (Ollama, LM Studio, LocalAI)
 */
export interface LocalLLMConfig extends BaseLLMConfig {
  providerType: 'local';
  config: {
    endpoint: string;           // e.g., http://localhost:11434
    serverType: 'ollama' | 'lmstudio' | 'localai' | 'custom';
    defaultModel: string;
    availableModels?: string[];
    timeout?: number;           // milliseconds
    enableGPU?: boolean;
  };
}

/**
 * OpenRouter configuration (user's own API key)
 */
export interface OpenRouterConfig extends BaseLLMConfig {
  providerType: 'openrouter';
  config: {
    apiKey: string;             // Will be encrypted
    baseUrl?: string;           // Default: https://openrouter.ai/api/v1
    defaultModel: string;
    preferredModels?: string[]; // List of models user prefers
    siteName?: string;          // For OpenRouter analytics
    siteUrl?: string;           // For OpenRouter analytics
  };
}

/**
 * OpenAI configuration (direct API)
 */
export interface OpenAIConfig extends BaseLLMConfig {
  providerType: 'openai';
  config: {
    apiKey: string;             // Will be encrypted
    organizationId?: string;
    baseUrl?: string;           // For Azure OpenAI or custom endpoints
    defaultModel: string;
    apiVersion?: string;        // For Azure OpenAI
  };
}

/**
 * Anthropic configuration (direct API)
 */
export interface AnthropicConfig extends BaseLLMConfig {
  providerType: 'anthropic';
  config: {
    apiKey: string;             // Will be encrypted
    baseUrl?: string;
    defaultModel: string;
  };
}

/**
 * Managed provider configuration (oppSpot managed service)
 */
export interface ManagedConfig extends BaseLLMConfig {
  providerType: 'managed';
  config: {
    // No API key needed - uses system credentials
    defaultModel: string;
    monthlyTokenLimit?: number;
    monthlyCostLimit?: number;  // In USD
    rateLimitRPM?: number;      // Requests per minute
  };
}

/**
 * Custom provider configuration (any OpenAI-compatible endpoint)
 */
export interface CustomLLMConfig extends BaseLLMConfig {
  providerType: 'custom';
  config: {
    endpoint: string;
    apiKey?: string;            // Optional, will be encrypted if provided
    defaultModel: string;
    headers?: Record<string, string>;
    authType?: 'bearer' | 'api-key' | 'none';
  };
}

/**
 * Union type of all provider configurations
 */
export type LLMConfig =
  | LocalLLMConfig
  | OpenRouterConfig
  | OpenAIConfig
  | AnthropicConfig
  | ManagedConfig
  | CustomLLMConfig;

/**
 * Database representation of provider configuration (with encrypted keys)
 */
export interface LLMConfigurationRow {
  id: string;
  user_id: string;
  organization_id?: string;
  provider_type: ProviderType;
  name: string;
  encrypted_config: string;    // JSON encrypted with AES-256-GCM
  is_active: boolean;
  is_primary: boolean;
  priority: number;
  monthly_token_limit?: number;
  monthly_cost_limit?: number;
  rate_limit_rpm?: number;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  last_tested_at?: string;
  last_error?: string;
}

/**
 * Fallback rule configuration
 */
export interface FallbackRule {
  id: string;
  userId: string;
  name: string;
  fallbackChain: string[];     // Array of config IDs in fallback order
  enableOnError: boolean;
  enableOnTimeout: boolean;
  enableOnRateLimit: boolean;
  enableOnQuota: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  isActive: boolean;
}

/**
 * Usage alert configuration
 */
export interface UsageAlert {
  id: string;
  userId: string;
  alertType: 'daily_tokens' | 'daily_cost' | 'hourly_requests' | 'monthly_cost';
  thresholdValue: number;
  thresholdUnit: string;
  isActive: boolean;
  lastTriggered?: Date;
  notificationChannels: {
    email?: boolean;
    webhook?: string;
    inApp?: boolean;
  };
}

/**
 * System-wide LLM preferences
 */
export interface LLMPreferences {
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultTopP?: number;
  enableFallback: boolean;
  enableCaching: boolean;
  enableStreaming: boolean;
  enableUsageTracking: boolean;
  customSystemPrompt?: string;
}

/**
 * Manager initialization options
 */
export interface LLMManagerOptions {
  userId: string;
  organizationId?: string;
  enableFallback?: boolean;
  enableCaching?: boolean;
  enableUsageTracking?: boolean;
  cacheTTLSeconds?: number;
  healthCheckIntervalSeconds?: number;
  defaultTimeout?: number;
  preferences?: Partial<LLMPreferences>;
}

/**
 * Provider statistics
 */
export interface ProviderStatistics {
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  lastUsed?: Date;
}

/**
 * System statistics
 */
export interface SystemStatistics {
  totalProviders: number;
  healthyProviders: number;
  degradedProviders: number;
  unhealthyProviders: number;
  primaryProvider?: string;
  cacheSize?: number;
  cacheHitRate?: number;
  providers: ProviderStatistics[];
}
