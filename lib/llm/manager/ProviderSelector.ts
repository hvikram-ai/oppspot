/**
 * ProviderSelector - Smart Provider Selection Logic
 *
 * Selects the best provider based on:
 * - User preferences
 * - Provider health status
 * - Priority rankings
 * - Feature requirements (streaming, functions, vision)
 * - Cost constraints
 */

import { ILLMProvider, ProviderStatus } from '../interfaces/ILLMProvider';
import { SelectionCriteria, ProviderComparison } from '../types';

export interface ProviderWithHealth {
  provider: ILLMProvider;
  health: ProviderStatus;
  lastChecked: Date;
  errorRate: number;
  averageLatency: number;
}

export class ProviderSelector {
  private providers: Map<string, ProviderWithHealth> = new Map();

  /**
   * Register a provider
   */
  registerProvider(
    provider: ILLMProvider,
    health: ProviderStatus = 'unknown',
    errorRate: number = 0,
    averageLatency: number = 0
  ): void {
    this.providers.set(provider.id, {
      provider,
      health,
      lastChecked: new Date(),
      errorRate,
      averageLatency,
    });
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Update provider health
   */
  updateProviderHealth(
    providerId: string,
    health: ProviderStatus,
    errorRate?: number,
    averageLatency?: number
  ): void {
    const existing = this.providers.get(providerId);
    if (existing) {
      existing.health = health;
      existing.lastChecked = new Date();
      if (errorRate !== undefined) existing.errorRate = errorRate;
      if (averageLatency !== undefined) existing.averageLatency = averageLatency;
    }
  }

  /**
   * Select best provider based on criteria
   */
  selectProvider(criteria?: SelectionCriteria): ILLMProvider | null {
    let candidates = Array.from(this.providers.values());

    if (candidates.length === 0) {
      return null;
    }

    // Filter by preferred provider if specified
    if (criteria?.preferredProvider) {
      const preferred = this.providers.get(criteria.preferredProvider);
      if (preferred && preferred.health !== 'unhealthy') {
        return preferred.provider;
      }
    }

    // Filter by feature requirements
    if (criteria?.requiresStreaming) {
      candidates = candidates.filter(async c => {
        const models = await c.provider.listModels();
        return models.some(m => m.capabilities.streaming);
      });
    }

    if (criteria?.requiresFunctions) {
      candidates = candidates.filter(async c => {
        const models = await c.provider.listModels();
        return models.some(m => m.capabilities.functions);
      });
    }

    if (criteria?.requiresVision) {
      candidates = candidates.filter(async c => {
        const models = await c.provider.listModels();
        return models.some(m => m.capabilities.vision);
      });
    }

    // Filter out unhealthy providers
    candidates = candidates.filter(c => c.health !== 'unhealthy');

    if (candidates.length === 0) {
      // If all providers unhealthy, return lowest priority as last resort
      const allProviders = Array.from(this.providers.values());
      if (allProviders.length > 0) {
        return allProviders.sort((a, b) => b.provider.priority - a.provider.priority)[0].provider;
      }
      return null;
    }

    // Score each candidate
    const scored = candidates.map(candidate => ({
      candidate,
      score: this.scoreProvider(candidate, criteria),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.candidate.provider || null;
  }

  /**
   * Get ordered list of providers for fallback chain
   */
  getOrderedProviders(criteria?: SelectionCriteria): ILLMProvider[] {
    let candidates = Array.from(this.providers.values());

    if (candidates.length === 0) {
      return [];
    }

    // Filter by criteria if specified
    if (criteria?.requiresStreaming || criteria?.requiresFunctions || criteria?.requiresVision) {
      // Keep filtering logic but return all healthy providers
      candidates = candidates.filter(c => c.health !== 'unhealthy');
    }

    // Score and sort
    const scored = candidates.map(candidate => ({
      provider: candidate.provider,
      score: this.scoreProvider(candidate, criteria),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.provider);
  }

  /**
   * Score a provider (0-100)
   */
  private scoreProvider(
    providerWithHealth: ProviderWithHealth,
    criteria?: SelectionCriteria
  ): number {
    let score = 0;

    // Priority (40 points)
    // Priority 1 gets 40 points, priority 2 gets 30, priority 3 gets 20, etc.
    const priorityScore = Math.max(0, 50 - (providerWithHealth.provider.priority - 1) * 10);
    score += priorityScore;

    // Health status (30 points)
    switch (providerWithHealth.health) {
      case 'healthy':
        score += 30;
        break;
      case 'degraded':
        score += 15;
        break;
      case 'unhealthy':
        score += 0;
        break;
      case 'unknown':
        score += 20; // Give benefit of doubt
        break;
    }

    // Error rate (15 points)
    // 0% error = 15 points, 100% error = 0 points
    const errorPenalty = (providerWithHealth.errorRate / 100) * 15;
    score += (15 - errorPenalty);

    // Latency (15 points)
    // < 1s = 15 points, > 10s = 0 points
    const latencySeconds = providerWithHealth.averageLatency / 1000;
    if (latencySeconds < 1) {
      score += 15;
    } else if (latencySeconds < 5) {
      score += 10;
    } else if (latencySeconds < 10) {
      score += 5;
    } else {
      score += 0;
    }

    // Criteria bonuses
    if (criteria?.maxLatency && providerWithHealth.averageLatency <= criteria.maxLatency) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Compare providers and get recommendations
   */
  async compareProviders(): Promise<ProviderComparison[]> {
    const candidates = Array.from(this.providers.values());

    const comparisons: ProviderComparison[] = [];

    for (const candidate of candidates) {
      const score = this.scoreProvider(candidate);

      let recommendation: ProviderComparison['recommendation'];
      if (score >= 80) recommendation = 'highly_recommended';
      else if (score >= 60) recommendation = 'recommended';
      else if (score >= 40) recommendation = 'acceptable';
      else recommendation = 'not_recommended';

      const reasoning = this.generateReasoning(candidate, score);

      comparisons.push({
        configId: candidate.provider.id,
        providerName: candidate.provider.name,
        providerType: candidate.provider.type,
        score,
        factors: {
          availability: candidate.health === 'healthy' ? 100 : candidate.health === 'degraded' ? 50 : 0,
          latency: Math.max(0, 100 - (candidate.averageLatency / 100)),
          cost: 50, // TODO: Implement cost factor
          reliability: Math.max(0, 100 - candidate.errorRate),
        },
        recommendation,
        reasoning,
      });
    }

    // Sort by score
    comparisons.sort((a, b) => b.score - a.score);

    return comparisons;
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    providerWithHealth: ProviderWithHealth,
    score: number
  ): string {
    const reasons: string[] = [];

    // Health
    if (providerWithHealth.health === 'healthy') {
      reasons.push('Provider is healthy');
    } else if (providerWithHealth.health === 'degraded') {
      reasons.push('Provider is experiencing some issues');
    } else if (providerWithHealth.health === 'unhealthy') {
      reasons.push('Provider is currently unavailable');
    }

    // Priority
    if (providerWithHealth.provider.priority === 1) {
      reasons.push('Set as highest priority');
    }

    // Error rate
    if (providerWithHealth.errorRate < 5) {
      reasons.push('Very reliable');
    } else if (providerWithHealth.errorRate > 20) {
      reasons.push('High error rate detected');
    }

    // Latency
    if (providerWithHealth.averageLatency < 1000) {
      reasons.push('Fast response times');
    } else if (providerWithHealth.averageLatency > 5000) {
      reasons.push('Slow response times');
    }

    // Overall score
    if (score >= 80) {
      reasons.push('Excellent overall performance');
    } else if (score < 40) {
      reasons.push('Consider using alternative provider');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values()).map(p => p.provider);
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): ILLMProvider | null {
    return this.providers.get(providerId)?.provider || null;
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Get healthy provider count
   */
  getHealthyProviderCount(): number {
    return Array.from(this.providers.values()).filter(p => p.health === 'healthy').length;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}
