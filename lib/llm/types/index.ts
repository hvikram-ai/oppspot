/**
 * Shared Types for LLM Management System
 *
 * Common types used across the LLM infrastructure.
 */

import { ProviderType } from '../interfaces/ILLMProvider';

/**
 * Usage record for tracking LLM requests
 */
export interface UsageRecord {
  id: string;
  userId: string;
  configId: string;
  feature: string;              // e.g., 'research-gpt', 'data-room', 'chat'
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;            // USD
  outputCost: number;           // USD
  totalCost: number;            // USD
  latencyMs: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  errorMessage?: string;
  requestSample?: string;       // First 500 chars for debugging
  responseSample?: string;      // First 500 chars for debugging
  createdAt: Date;
}

/**
 * Model cache entry
 */
export interface ModelCacheEntry {
  id: string;
  configId: string;
  modelId: string;
  modelName: string;
  capabilities: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
    json_mode: boolean;
  };
  pricingInput: number;         // Cost per 1k input tokens
  pricingOutput: number;        // Cost per 1k output tokens
  contextLength: number;
  isAvailable: boolean;
  lastSynced: Date;
  createdAt: Date;
}

/**
 * Usage aggregation for analytics
 */
export interface UsageAggregation {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  byProvider: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    averageLatency: number;
  }>;
  byFeature: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

/**
 * Quota tracking
 */
export interface QuotaInfo {
  userId: string;
  period: 'daily' | 'monthly';
  tokenLimit?: number;
  costLimit?: number;           // USD
  requestLimit?: number;
  tokensUsed: number;
  costUsed: number;
  requestsUsed: number;
  percentUsed: number;
  resetAt: Date;
  exceeded: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  configId: string;
  providerName: string;
  providerType: ProviderType;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTimeMs?: number;
  availableModels?: string[];
  error?: string;
  checkedAt: Date;
}

/**
 * Provider discovery result (for auto-detecting local servers)
 */
export interface ProviderDiscoveryResult {
  serverType: 'ollama' | 'lmstudio' | 'localai' | 'custom';
  endpoint: string;
  port: number;
  available: boolean;
  version?: string;
  models?: string[];
}

/**
 * Fallback execution log
 */
export interface FallbackLog {
  requestId: string;
  userId: string;
  originalConfigId: string;
  fallbackChain: string[];
  executedProviders: Array<{
    configId: string;
    providerName: string;
    attempt: number;
    status: 'success' | 'failed' | 'timeout' | 'rate_limited';
    error?: string;
    latencyMs?: number;
  }>;
  finalStatus: 'success' | 'all_failed';
  totalLatencyMs: number;
  createdAt: Date;
}

/**
 * Cache entry for LLM responses
 */
export interface CacheEntry {
  key: string;
  value: unknown;
  expiresAt: Date;
  createdAt: Date;
  hitCount: number;
  lastAccessed: Date;
}

/**
 * Model pricing information
 */
export interface ModelPricing {
  modelId: string;
  providerType: ProviderType;
  inputCostPer1k: number;       // USD per 1k input tokens
  outputCostPer1k: number;      // USD per 1k output tokens
  contextLength: number;
  updatedAt: Date;
}

/**
 * Feature configuration for LLM usage
 */
export interface FeatureConfig {
  featureName: string;
  enabled: boolean;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  allowUserOverride: boolean;
  requiresAuth: boolean;
  quotaPerUser?: {
    dailyRequests?: number;
    monthlyRequests?: number;
    dailyTokens?: number;
    monthlyTokens?: number;
  };
}

/**
 * Alert trigger event
 */
export interface AlertEvent {
  id: string;
  userId: string;
  alertId: string;
  alertType: string;
  threshold: number;
  currentValue: number;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

/**
 * Provider availability window
 */
export interface AvailabilityWindow {
  configId: string;
  startTime: Date;
  endTime: Date;
  availability: number;         // Percentage (0-100)
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
}

/**
 * Key rotation record
 */
export interface KeyRotationRecord {
  id: string;
  userId: string;
  configId: string;
  oldKeyHash: string;
  newKeyHash: string;
  rotationReason: string;
  rotatedBy: string;
  rotatedAt: Date;
}

/**
 * Request context for LLM calls
 */
export interface RequestContext {
  userId: string;
  organizationId?: string;
  feature: string;
  requestId: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Provider selection criteria
 */
export interface SelectionCriteria {
  preferredProvider?: string;   // Config ID
  preferredModel?: string;
  requiresStreaming?: boolean;
  requiresFunctions?: boolean;
  requiresVision?: boolean;
  maxCostPerRequest?: number;
  maxLatency?: number;
  allowFallback?: boolean;
}

/**
 * Batch processing options
 */
export interface BatchOptions {
  maxConcurrent: number;
  delayBetweenRequests?: number;
  continueOnError: boolean;
  trackProgress?: (completed: number, total: number) => void;
}

/**
 * Token estimation result
 */
export interface TokenEstimate {
  promptTokens: number;
  estimatedCompletionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  provider: ProviderType;
}

/**
 * Provider comparison result
 */
export interface ProviderComparison {
  configId: string;
  providerName: string;
  providerType: ProviderType;
  score: number;                // 0-100
  factors: {
    availability: number;
    latency: number;
    cost: number;
    reliability: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
  reasoning: string;
}
