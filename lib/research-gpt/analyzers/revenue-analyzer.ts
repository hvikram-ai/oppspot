/**
 * Revenue Signals Analyzer for ResearchGPT™
 *
 * Analyzes financial health and revenue indicators:
 * - Financial health from Companies House accounts
 * - Revenue trends and growth patterns
 * - Profitability indicators
 * - Financial risk assessment
 * - Budget availability signals
 *
 * Sources: Companies House accounts, filing history, news mentions
 */

import type {
  RevenueSignal,
  ConfidenceLevel,
} from '@/types/research-gpt';
import type { AggregatedResearchData } from '../data-sources/data-source-factory';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyzedRevenueSignals {
  financial_health_signals: RevenueSignal[];
  growth_signals: RevenueSignal[];
  risk_signals: RevenueSignal[];
  all_signals: RevenueSignal[];
  financial_summary: {
    health_score: number; // 0-1: overall financial health
    growth_indicator: 'growing' | 'stable' | 'declining' | 'unknown';
    risk_level: 'low' | 'medium' | 'high' | 'unknown';
    budget_availability: 'high' | 'medium' | 'low' | 'unknown';
  };
}

// ============================================================================
// REVENUE SIGNALS ANALYZER
// ============================================================================

export class RevenueAnalyzer {
  /**
   * Analyze revenue and financial signals
   */
  async analyze(aggregatedData: AggregatedResearchData): Promise<{
    revenue_signals: AnalyzedRevenueSignals;
    confidence: ConfidenceLevel;
  }> {
    const startTime = Date.now();

    try {
      const rawSignals = aggregatedData.revenue_signals;

      console.log(`[RevenueAnalyzer] Analyzing ${rawSignals.length} revenue signals...`);

      // Categorize signals
      const financial_health_signals = rawSignals.filter(
        (s) => s.signal_type === 'financial_health' || s.signal_type === 'business_status'
      );

      const growth_signals = rawSignals.filter(
        (s) => s.signal_type === 'accounts_filing' || s.positive === true
      );

      const risk_signals = rawSignals.filter(
        (s) => s.positive === false || s.signal_type === 'business_status'
      );

      // Calculate financial summary
      const financial_summary = this.calculateFinancialSummary(
        rawSignals,
        aggregatedData
      );

      const revenue_signals: AnalyzedRevenueSignals = {
        financial_health_signals,
        growth_signals,
        risk_signals,
        all_signals: rawSignals,
        financial_summary,
      };

      // Calculate confidence
      const confidence = this.calculateConfidence(revenue_signals, aggregatedData);

      const duration = Date.now() - startTime;
      console.log(`[RevenueAnalyzer] Completed in ${duration}ms with ${confidence} confidence`);
      console.log(`[RevenueAnalyzer] Health score: ${financial_summary.health_score.toFixed(2)}, Risk: ${financial_summary.risk_level}`);

      return {
        revenue_signals,
        confidence,
      };
    } catch (error) {
      console.error('[RevenueAnalyzer] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // FINANCIAL SUMMARY CALCULATION
  // ============================================================================

  /**
   * Calculate comprehensive financial summary
   */
  private calculateFinancialSummary(
    signals: RevenueSignal[],
    data: AggregatedResearchData
  ): {
    health_score: number;
    growth_indicator: 'growing' | 'stable' | 'declining' | 'unknown';
    risk_level: 'low' | 'medium' | 'high' | 'unknown';
    budget_availability: 'high' | 'medium' | 'low' | 'unknown';
  } {
    const health_score = this.calculateHealthScore(signals, data);
    const growth_indicator = this.assessGrowth(signals, data);
    const risk_level = this.assessRisk(signals, data);
    const budget_availability = this.assessBudgetAvailability(signals, data);

    return {
      health_score,
      growth_indicator,
      risk_level,
      budget_availability,
    };
  }

  /**
   * Calculate overall financial health score (0-1)
   */
  private calculateHealthScore(signals: RevenueSignal[], data: AggregatedResearchData): number {
    let score = 0.5; // Start neutral

    // Positive signals boost score
    const positiveCount = signals.filter((s) => s.positive === true).length;
    const negativeCount = signals.filter((s) => s.positive === false).length;

    if (positiveCount > negativeCount) {
      score += 0.2;
    } else if (negativeCount > positiveCount) {
      score -= 0.3;
    }

    // Company status signals
    const statusActive = signals.find(
      (s) => s.signal_type === 'business_status' && s.description?.includes('active')
    );
    if (statusActive) score += 0.1;

    const statusRisk = signals.find(
      (s) =>
        s.signal_type === 'business_status' &&
        (s.description?.includes('liquidation') || s.description?.includes('administration'))
    );
    if (statusRisk) score -= 0.5;

    // Accounts compliance
    const accountsUpToDate = signals.find(
      (s) => s.signal_type === 'financial_health' && s.description?.includes('up to date')
    );
    if (accountsUpToDate) score += 0.1;

    const accountsOverdue = signals.find(
      (s) => s.signal_type === 'financial_health' && s.description?.includes('overdue')
    );
    if (accountsOverdue) score -= 0.2;

    // Hiring activity (indicates budget)
    const hiringSignals = data.buying_signals.filter((s) => s.signal_type === 'hiring');
    if (hiringSignals.length > 5) score += 0.1;
    if (hiringSignals.length > 10) score += 0.1;

    // Funding signals (indicates investment)
    const fundingSignals = data.buying_signals.filter((s) => s.signal_type === 'funding');
    if (fundingSignals.length > 0) score += 0.15;

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess growth trajectory
   */
  private assessGrowth(
    signals: RevenueSignal[],
    data: AggregatedResearchData
  ): 'growing' | 'stable' | 'declining' | 'unknown' {
    // Check for growth indicators
    const growthIndicators = [
      data.buying_signals.filter((s) => s.signal_type === 'hiring').length > 5, // Heavy hiring
      data.buying_signals.filter((s) => s.signal_type === 'funding').length > 0, // Recent funding
      data.buying_signals.filter((s) => s.signal_type === 'expansion').length > 0, // Expansion
      data.buying_signals.filter((s) => s.signal_type === 'product_launch').length > 0, // Innovation
    ];

    const growthCount = growthIndicators.filter(Boolean).length;

    // Check for decline indicators
    const declineIndicators = [
      signals.filter((s) => s.signal_type === 'business_status' && s.positive === false).length > 0,
      signals.filter((s) => s.description?.includes('overdue')).length > 0,
    ];

    const declineCount = declineIndicators.filter(Boolean).length;

    if (growthCount >= 2 && declineCount === 0) return 'growing';
    if (declineCount >= 1) return 'declining';
    if (growthCount >= 1) return 'stable';

    return 'unknown';
  }

  /**
   * Assess financial risk level
   */
  private assessRisk(
    signals: RevenueSignal[],
    data: AggregatedResearchData
  ): 'low' | 'medium' | 'high' | 'unknown' {
    const riskFactors: boolean[] = [];

    // High risk: Liquidation/administration
    const criticalStatus = signals.find(
      (s) =>
        s.description?.includes('liquidation') ||
        s.description?.includes('administration') ||
        s.description?.includes('insolvency')
    );
    if (criticalStatus) return 'high';

    // Medium-high risk factors
    riskFactors.push(
      signals.filter((s) => s.description?.includes('overdue')).length > 0, // Overdue accounts
      signals.filter((s) => s.positive === false).length > signals.filter((s) => s.positive).length, // More negative than positive
      data.buying_signals.filter((s) => s.signal_type === 'hiring').length === 0 // No hiring (stagnant)
    );

    const riskCount = riskFactors.filter(Boolean).length;

    if (riskCount >= 2) return 'high';
    if (riskCount === 1) return 'medium';

    // Low risk indicators
    const lowRiskFactors = [
      signals.find((s) => s.description?.includes('up to date')), // Accounts current
      data.buying_signals.filter((s) => s.signal_type === 'funding').length > 0, // Recent funding
      signals.find((s) => s.signal_type === 'business_status' && s.positive === true), // Active status
    ];

    if (lowRiskFactors.filter(Boolean).length >= 2) return 'low';

    return 'unknown';
  }

  /**
   * Assess budget availability for purchases
   */
  private assessBudgetAvailability(
    signals: RevenueSignal[],
    data: AggregatedResearchData
  ): 'high' | 'medium' | 'low' | 'unknown' {
    let score = 0;

    // Strong budget indicators
    const fundingSignals = data.buying_signals.filter((s) => s.signal_type === 'funding');
    if (fundingSignals.length > 0) {
      // Check recency
      const recentFunding = fundingSignals.find((s) => {
        const ageMonths = this.calculateAgeMonths(s.detected_date);
        return ageMonths <= 12;
      });
      if (recentFunding) score += 3; // Recent funding = high budget
    }

    // Heavy hiring (indicates budget)
    const hiringCount = data.buying_signals.filter((s) => s.signal_type === 'hiring').length;
    if (hiringCount > 10) score += 2;
    else if (hiringCount > 5) score += 1;

    // Expansion activity
    const expansionSignals = data.buying_signals.filter((s) => s.category === 'expansion');
    if (expansionSignals.length > 0) score += 1;

    // Product launches (R&D budget)
    const productLaunches = data.buying_signals.filter((s) => s.signal_type === 'product_launch');
    if (productLaunches.length > 0) score += 1;

    // Negative factors
    const accountsOverdue = signals.find((s) => s.description?.includes('overdue'));
    if (accountsOverdue) score -= 2;

    const businessRisk = signals.find((s) => s.positive === false);
    if (businessRisk) score -= 1;

    // Determine level
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    if (score >= 0) return 'low';

    return 'unknown';
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate age in months
   */
  private calculateAgeMonths(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    } catch {
      return 999;
    }
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  /**
   * Calculate confidence in revenue analysis
   */
  private calculateConfidence(
    revenue_signals: AnalyzedRevenueSignals,
    data: AggregatedResearchData
  ): ConfidenceLevel {
    let score = 0;
    let maxScore = 10;

    // Number of revenue signals
    if (revenue_signals.all_signals.length >= 5) score += 2;
    else if (revenue_signals.all_signals.length >= 2) score += 1;

    // Companies House data available (high reliability)
    if (data.metadata.sources_fetched.includes('Companies House')) score += 3;

    // Financial health signals present
    if (revenue_signals.financial_health_signals.length > 0) score += 2;

    // Multiple signal types
    const types = new Set(revenue_signals.all_signals.map((s) => s.signal_type));
    if (types.size >= 2) score += 1;

    // Budget availability determined
    if (revenue_signals.financial_summary.budget_availability !== 'unknown') score += 1;

    // Growth indicator determined
    if (revenue_signals.financial_summary.growth_indicator !== 'unknown') score += 1;

    const percentage = score / maxScore;

    if (percentage >= 0.7) return 'high';
    if (percentage >= 0.4) return 'medium';
    return 'low';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate financial health summary text
   */
  generateHealthSummary(revenue_signals: AnalyzedRevenueSignals): string {
    const summary = revenue_signals.financial_summary;

    const healthText =
      summary.health_score >= 0.7
        ? 'Strong financial health'
        : summary.health_score >= 0.5
        ? 'Moderate financial health'
        : 'Financial health concerns';

    const growthText =
      summary.growth_indicator === 'growing'
        ? 'showing growth'
        : summary.growth_indicator === 'stable'
        ? 'stable performance'
        : summary.growth_indicator === 'declining'
        ? 'facing challenges'
        : 'growth trajectory unclear';

    const riskText =
      summary.risk_level === 'low'
        ? 'Low financial risk'
        : summary.risk_level === 'medium'
        ? 'Moderate risk'
        : summary.risk_level === 'high'
        ? 'High financial risk'
        : 'Risk level unclear';

    const budgetText =
      summary.budget_availability === 'high'
        ? 'Strong budget availability'
        : summary.budget_availability === 'medium'
        ? 'Moderate budget'
        : summary.budget_availability === 'low'
        ? 'Limited budget'
        : 'Budget availability unclear';

    return `${healthText}, ${growthText}. ${riskText}. ${budgetText}.`;
  }

  /**
   * Get key financial metrics
   */
  getKeyMetrics(revenue_signals: AnalyzedRevenueSignals): Record<string, string | number> {
    const summary = revenue_signals.financial_summary;

    return {
      health_score: (summary.health_score * 100).toFixed(0) + '%',
      growth: summary.growth_indicator,
      risk: summary.risk_level,
      budget: summary.budget_availability,
      positive_signals: revenue_signals.all_signals.filter((s) => s.positive === true).length,
      negative_signals: revenue_signals.all_signals.filter((s) => s.positive === false).length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: RevenueAnalyzer | null = null;

export function getRevenueAnalyzer(): RevenueAnalyzer {
  if (!instance) {
    instance = new RevenueAnalyzer();
  }
  return instance;
}

export default RevenueAnalyzer;
