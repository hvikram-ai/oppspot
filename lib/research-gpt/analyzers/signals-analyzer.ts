/**
 * Buying Signals Analyzer for ResearchGPT™
 *
 * Analyzes and prioritizes buying signals from multiple sources:
 * - Hiring signals (job postings, team growth)
 * - Expansion signals (new offices, funding, partnerships)
 * - Leadership changes (new executives, board changes)
 * - Product launches (new features, releases)
 * - Financial events (funding rounds, acquisitions)
 *
 * Outputs prioritized, deduplicated signals with relevance scoring.
 */

import type {
  BuyingSignal,
  BuyingSignalType,
  ConfidenceLevel,
} from '@/types/research-gpt';
import type { AggregatedResearchData } from '../data-sources/data-source-factory';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyzedSignals {
  hiring_signals: BuyingSignal[];
  expansion_signals: BuyingSignal[];
  leadership_changes: BuyingSignal[];
  product_signals: BuyingSignal[];
  financial_signals: BuyingSignal[];
  all_signals: BuyingSignal[];
  summary: {
    total_signals: number;
    by_category: Record<string, number>;
    urgency_score: number; // 0-1: how urgent is this opportunity
    recency_score: number; // 0-1: how recent are the signals
  };
}

// ============================================================================
// SIGNALS ANALYZER
// ============================================================================

export class SignalsAnalyzer {
  /**
   * Analyze buying signals from aggregated data
   */
  async analyze(aggregatedData: AggregatedResearchData): Promise<{
    signals: AnalyzedSignals;
    confidence: ConfidenceLevel;
  }> {
    const startTime = Date.now();

    try {
      const rawSignals = aggregatedData.buying_signals;

      console.log(`[SignalsAnalyzer] Analyzing ${rawSignals.length} raw signals...`);

      // Categorize signals
      const hiring_signals = this.filterByType(rawSignals, 'hiring');
      const expansion_signals = this.filterByCategory(rawSignals, 'expansion');
      const leadership_changes = this.filterByCategory(rawSignals, 'leadership');
      const product_signals = this.filterByType(rawSignals, 'product_launch');
      const financial_signals = this.filterByType(rawSignals, 'funding');

      // Enhance signals with additional scoring
      const enhancedSignals = this.enhanceSignals(rawSignals);

      // Calculate summary metrics
      const summary = this.calculateSummary(enhancedSignals);

      // Sort by priority
      const prioritized = this.prioritizeSignals(enhancedSignals);

      const signals: AnalyzedSignals = {
        hiring_signals: this.prioritizeSignals(hiring_signals).slice(0, 10),
        expansion_signals: this.prioritizeSignals(expansion_signals).slice(0, 10),
        leadership_changes: this.prioritizeSignals(leadership_changes).slice(0, 5),
        product_signals: this.prioritizeSignals(product_signals).slice(0, 5),
        financial_signals: this.prioritizeSignals(financial_signals).slice(0, 5),
        all_signals: prioritized.slice(0, 20), // Top 20 overall
        summary,
      };

      // Calculate confidence
      const confidence = this.calculateConfidence(signals, aggregatedData);

      const duration = Date.now() - startTime;
      console.log(`[SignalsAnalyzer] Completed in ${duration}ms with ${confidence} confidence`);
      console.log(`[SignalsAnalyzer] Found: ${hiring_signals.length} hiring, ${expansion_signals.length} expansion, ${leadership_changes.length} leadership`);

      return {
        signals,
        confidence,
      };
    } catch (error) {
      console.error('[SignalsAnalyzer] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // FILTERING METHODS
  // ============================================================================

  /**
   * Filter signals by type
   */
  private filterByType(signals: BuyingSignal[], type: BuyingSignalType): BuyingSignal[] {
    return signals.filter((s) => s.signal_type === type);
  }

  /**
   * Filter signals by category
   */
  private filterByCategory(signals: BuyingSignal[], category: string): BuyingSignal[] {
    return signals.filter((s) => s.category === category);
  }

  // ============================================================================
  // ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Enhance signals with additional metadata and scoring
   */
  private enhanceSignals(signals: BuyingSignal[]): BuyingSignal[] {
    return signals.map((signal) => ({
      ...signal,
      relevance_score: this.calculateRelevance(signal),
      urgency: this.calculateUrgency(signal),
      age_days: this.calculateAgeDays(signal.detected_date),
    }));
  }

  /**
   * Calculate relevance score (0-1)
   */
  private calculateRelevance(signal: BuyingSignal): number {
    // Start with existing relevance or default
    let score = signal.relevance_score || 0.5;

    // Boost for high-value signal types
    if (signal.signal_type === 'funding') score += 0.2;
    if (signal.signal_type === 'leadership_change') score += 0.15;
    if (signal.signal_type === 'product_launch') score += 0.1;

    // Boost for recent signals
    const ageDays = this.calculateAgeDays(signal.detected_date);
    if (ageDays <= 7) score += 0.1;
    if (ageDays <= 30) score += 0.05;

    // Boost for high confidence
    if (signal.confidence === 'high') score += 0.1;

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Calculate urgency (how time-sensitive is this signal)
   */
  private calculateUrgency(signal: BuyingSignal): 'high' | 'medium' | 'low' {
    const ageDays = this.calculateAgeDays(signal.detected_date);

    // Recent leadership changes = high urgency (contact within 30 days)
    if (signal.signal_type === 'leadership_change' && ageDays <= 30) {
      return 'high';
    }

    // Recent funding = high urgency (they have budget)
    if (signal.signal_type === 'funding' && ageDays <= 90) {
      return 'high';
    }

    // Hiring = medium urgency (growing team)
    if (signal.signal_type === 'hiring' && ageDays <= 60) {
      return 'medium';
    }

    // Product launches = medium urgency
    if (signal.signal_type === 'product_launch' && ageDays <= 60) {
      return 'medium';
    }

    // Expansion = medium urgency
    if (signal.category === 'expansion' && ageDays <= 90) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate age in days
   */
  private calculateAgeDays(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 999; // Unknown age
    }
  }

  // ============================================================================
  // PRIORITIZATION
  // ============================================================================

  /**
   * Prioritize signals by combined score
   */
  private prioritizeSignals(signals: BuyingSignal[]): BuyingSignal[] {
    return signals.sort((a, b) => {
      const scoreA = this.calculatePriorityScore(a);
      const scoreB = this.calculatePriorityScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate priority score for sorting
   */
  private calculatePriorityScore(signal: BuyingSignal): number {
    const relevance = signal.relevance_score || 0.5;
    const confidenceWeight = signal.confidence === 'high' ? 1.0 : signal.confidence === 'medium' ? 0.7 : 0.4;
    const recencyWeight = this.calculateRecencyWeight(signal.detected_date);
    const urgencyWeight = signal.urgency === 'high' ? 1.0 : signal.urgency === 'medium' ? 0.7 : 0.4;

    return relevance * 0.4 + confidenceWeight * 0.2 + recencyWeight * 0.2 + urgencyWeight * 0.2;
  }

  /**
   * Calculate recency weight (0-1, newer = higher)
   */
  private calculateRecencyWeight(dateString: string): number {
    const ageDays = this.calculateAgeDays(dateString);

    if (ageDays <= 7) return 1.0;
    if (ageDays <= 30) return 0.9;
    if (ageDays <= 90) return 0.7;
    if (ageDays <= 180) return 0.5;
    return 0.3;
  }

  // ============================================================================
  // SUMMARY CALCULATION
  // ============================================================================

  /**
   * Calculate summary metrics
   */
  private calculateSummary(signals: BuyingSignal[]): {
    total_signals: number;
    by_category: Record<string, number>;
    urgency_score: number;
    recency_score: number;
  } {
    // Count by category
    const by_category: Record<string, number> = {};
    for (const signal of signals) {
      const category = signal.category || 'other';
      by_category[category] = (by_category[category] || 0) + 1;
    }

    // Calculate urgency score (average)
    const urgencyScores = signals.map((s) => {
      const urgency = s.urgency || this.calculateUrgency(s);
      return urgency === 'high' ? 1.0 : urgency === 'medium' ? 0.6 : 0.3;
    });
    const urgency_score = urgencyScores.length > 0
      ? urgencyScores.reduce((sum, score) => sum + score, 0) / urgencyScores.length
      : 0;

    // Calculate recency score (average)
    const recencyScores = signals.map((s) => this.calculateRecencyWeight(s.detected_date));
    const recency_score = recencyScores.length > 0
      ? recencyScores.reduce((sum, score) => sum + score, 0) / recencyScores.length
      : 0;

    return {
      total_signals: signals.length,
      by_category,
      urgency_score,
      recency_score,
    };
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  /**
   * Calculate overall confidence in signals analysis
   */
  private calculateConfidence(
    signals: AnalyzedSignals,
    data: AggregatedResearchData
  ): ConfidenceLevel {
    let score = 0;
    let maxScore = 10;

    // Number of signals found
    if (signals.all_signals.length >= 10) score += 3;
    else if (signals.all_signals.length >= 5) score += 2;
    else if (signals.all_signals.length >= 2) score += 1;

    // Diversity of signal types
    const types = new Set(signals.all_signals.map((s) => s.signal_type));
    if (types.size >= 3) score += 2;
    else if (types.size >= 2) score += 1;

    // Signal confidence
    const highConfidenceCount = signals.all_signals.filter((s) => s.confidence === 'high').length;
    if (highConfidenceCount >= 5) score += 2;
    else if (highConfidenceCount >= 2) score += 1;

    // Recency
    if (signals.summary.recency_score >= 0.7) score += 2;
    else if (signals.summary.recency_score >= 0.5) score += 1;

    // Source diversity
    if (data.metadata.sources_fetched.length >= 3) score += 1;

    const percentage = score / maxScore;

    if (percentage >= 0.7) return 'high';
    if (percentage >= 0.4) return 'medium';
    return 'low';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get top N signals by priority
   */
  getTopSignals(signals: BuyingSignal[], n: number): BuyingSignal[] {
    return this.prioritizeSignals(signals).slice(0, n);
  }

  /**
   * Filter signals by age (days)
   */
  getRecentSignals(signals: BuyingSignal[], maxAgeDays: number): BuyingSignal[] {
    return signals.filter((s) => this.calculateAgeDays(s.detected_date) <= maxAgeDays);
  }

  /**
   * Get signals by urgency level
   */
  getSignalsByUrgency(signals: BuyingSignal[], urgency: 'high' | 'medium' | 'low'): BuyingSignal[] {
    return signals.filter((s) => (s.urgency || this.calculateUrgency(s)) === urgency);
  }

  /**
   * Generate signal summary text
   */
  generateSummaryText(signals: AnalyzedSignals): string {
    const parts: string[] = [];

    if (signals.hiring_signals.length > 0) {
      parts.push(`${signals.hiring_signals.length} hiring signal${signals.hiring_signals.length > 1 ? 's' : ''}`);
    }

    if (signals.expansion_signals.length > 0) {
      parts.push(`${signals.expansion_signals.length} expansion signal${signals.expansion_signals.length > 1 ? 's' : ''}`);
    }

    if (signals.leadership_changes.length > 0) {
      parts.push(`${signals.leadership_changes.length} leadership change${signals.leadership_changes.length > 1 ? 's' : ''}`);
    }

    if (signals.financial_signals.length > 0) {
      parts.push(`${signals.financial_signals.length} funding event${signals.financial_signals.length > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'No significant buying signals detected';
    }

    return `Found ${parts.join(', ')}.`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: SignalsAnalyzer | null = null;

export function getSignalsAnalyzer(): SignalsAnalyzer {
  if (!instance) {
    instance = new SignalsAnalyzer();
  }
  return instance;
}

export default SignalsAnalyzer;
