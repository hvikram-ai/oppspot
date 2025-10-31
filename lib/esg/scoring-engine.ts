/**
 * ESG Scoring Engine
 * Computes ESG scores based on metrics and benchmarks
 */

import type {
  ESGMetric,
  ESGBenchmark,
  ESGScore,
  ESGLevel,
  ESGCategory,
  ESGSubcategory,
  ESGScoreDetails,
} from '@/types/esg';
import { ESG_METRIC_DEFINITIONS } from '@/types/esg';

export interface ScoringOptions {
  company_id: string;
  period_year: number;
  metrics: ESGMetric[];
  benchmarks: ESGBenchmark[];
}

export interface CategoryScoreResult {
  category: ESGCategory;
  subcategory?: ESGSubcategory;
  score: number;
  level: ESGLevel;
  details: ESGScoreDetails;
  metrics_count: number;
  metrics_with_data: number;
}

export class ESGScoringEngine {
  /**
   * Compute scores for all categories
   */
  async computeAllScores(options: ScoringOptions): Promise<CategoryScoreResult[]> {
    const { metrics } = options;
    const scores: CategoryScoreResult[] = [];

    // Group metrics by category and subcategory
    const grouped = this.groupMetrics(metrics);

    // Compute scores for each group
    for (const [category, subcategories] of Object.entries(grouped)) {
      for (const [subcategory, categoryMetrics] of Object.entries(subcategories)) {
        const scoreResult = await this.computeCategoryScore({
          ...options,
          category: category as ESGCategory,
          subcategory: subcategory === 'null' ? undefined : (subcategory as ESGSubcategory),
          metrics: categoryMetrics,
        });

        scores.push(scoreResult);
      }
    }

    return scores;
  }

  /**
   * Compute score for a specific category/subcategory
   */
  private async computeCategoryScore(options: ScoringOptions & {
    category: ESGCategory;
    subcategory?: ESGSubcategory;
  }): Promise<CategoryScoreResult> {
    const { company_id, period_year, category, subcategory, metrics, benchmarks } = options;

    // Filter metrics for this category/subcategory
    const relevantMetrics = metrics.filter(
      (m) => m.category === category && (!subcategory || m.subcategory === subcategory)
    );

    if (relevantMetrics.length === 0) {
      return {
        category,
        subcategory,
        score: 0,
        level: 'lagging',
        details: {
          metric_scores: {},
          gaps: ['No data available for this category'],
        },
        metrics_count: 0,
        metrics_with_data: 0,
      };
    }

    // Calculate score for each metric
    const metricScores: Record<string, number> = {};
    const weights: Record<string, number> = {};
    let totalWeight = 0;
    let weightedSum = 0;

    for (const metric of relevantMetrics) {
      const definition = ESG_METRIC_DEFINITIONS[metric.metric_key];
      if (!definition) continue;

      // Get weight (from definition or default to 1.0)
      const weight = definition.weight || 1.0;
      weights[metric.metric_key] = weight;

      // Calculate metric score (0-100)
      const metricScore = await this.calculateMetricScore(metric, benchmarks);
      metricScores[metric.metric_key] = metricScore;

      // Add to weighted sum
      weightedSum += metricScore * weight;
      totalWeight += weight;
    }

    // Calculate final score
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Determine level based on score
    const level = this.determineLevel(score);

    // Identify gaps and improvements
    const gaps = this.identifyGaps(relevantMetrics, metricScores);
    const improvements = this.suggestImprovements(relevantMetrics, metricScores, benchmarks);

    return {
      category,
      subcategory,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      level,
      details: {
        weights,
        metric_scores: metricScores,
        gaps,
        improvements,
      },
      metrics_count: relevantMetrics.length,
      metrics_with_data: Object.keys(metricScores).length,
    };
  }

  /**
   * Calculate score for a single metric (0-100)
   */
  private async calculateMetricScore(
    metric: ESGMetric,
    benchmarks: ESGBenchmark[]
  ): Promise<number> {
    const { metric_key, value_numeric, value_boolean } = metric;

    // For boolean metrics
    if (value_boolean !== null) {
      return value_boolean ? 100 : 0;
    }

    // For numeric metrics
    if (value_numeric !== null) {
      // Find matching benchmark
      const benchmark = this.findBenchmark(metric, benchmarks);

      if (benchmark && benchmark.p25 !== null && benchmark.p75 !== null) {
        const definition = ESG_METRIC_DEFINITIONS[metric_key];

        // Determine if higher is better or lower is better
        const goodDirection = definition?.good_direction || 'higher';

        // Calculate percentile position
        let percentile = 50; // Default to median

        if (goodDirection === 'higher') {
          // Higher values are better
          if (value_numeric >= benchmark.p75) {
            percentile = 75 + ((value_numeric - benchmark.p75) / benchmark.p75) * 15;
          } else if (value_numeric >= benchmark.p50) {
            percentile = 50 + ((value_numeric - benchmark.p50!) / (benchmark.p75 - benchmark.p50!)) * 25;
          } else if (value_numeric >= benchmark.p25) {
            percentile = 25 + ((value_numeric - benchmark.p25) / (benchmark.p50! - benchmark.p25)) * 25;
          } else {
            percentile = (value_numeric / benchmark.p25) * 25;
          }
        } else {
          // Lower values are better (e.g., emissions, turnover)
          if (value_numeric <= benchmark.p25) {
            percentile = 75 + (1 - value_numeric / benchmark.p25) * 15;
          } else if (value_numeric <= benchmark.p50!) {
            percentile = 50 + (1 - (value_numeric - benchmark.p25) / (benchmark.p50! - benchmark.p25)) * 25;
          } else if (value_numeric <= benchmark.p75) {
            percentile = 25 + (1 - (value_numeric - benchmark.p50!) / (benchmark.p75 - benchmark.p50!)) * 25;
          } else {
            percentile = Math.max(0, 25 * (1 - (value_numeric - benchmark.p75) / benchmark.p75));
          }
        }

        // Convert percentile to score (0-100)
        return Math.min(100, Math.max(0, percentile));
      }

      // No benchmark available - return neutral score
      return 50;
    }

    // No valid value
    return 0;
  }

  /**
   * Find matching benchmark for a metric
   */
  private findBenchmark(metric: ESGMetric, benchmarks: ESGBenchmark[]): ESGBenchmark | null {
    // Try exact match with all criteria
    let match = benchmarks.find(
      (b) =>
        b.metric_key === metric.metric_key &&
        b.sector === metric.benchmark_sector &&
        b.size_band === metric.benchmark_size_band &&
        b.region === metric.benchmark_region
    );

    if (match) return match;

    // Try without region
    match = benchmarks.find(
      (b) =>
        b.metric_key === metric.metric_key &&
        b.sector === metric.benchmark_sector &&
        b.size_band === metric.benchmark_size_band
    );

    if (match) return match;

    // Try without size_band
    match = benchmarks.find(
      (b) => b.metric_key === metric.metric_key && b.sector === metric.benchmark_sector
    );

    if (match) return match;

    // Try metric key only (global benchmark)
    match = benchmarks.find((b) => b.metric_key === metric.metric_key);

    return match || null;
  }

  /**
   * Determine ESG level based on score
   */
  private determineLevel(score: number): ESGLevel {
    if (score >= 75) return 'leading';
    if (score >= 25) return 'par';
    return 'lagging';
  }

  /**
   * Identify gaps in data coverage
   */
  private identifyGaps(metrics: ESGMetric[], scores: Record<string, number>): string[] {
    const gaps: string[] = [];

    // Check for missing key metrics
    const expectedMetrics = new Set<string>();
    metrics.forEach((m) => {
      const definition = ESG_METRIC_DEFINITIONS[m.metric_key];
      if (definition) {
        expectedMetrics.add(m.metric_key);
      }
    });

    // Identify metrics with no data
    const metricsWithData = new Set(Object.keys(scores));
    const missingMetrics = Array.from(expectedMetrics).filter((k) => !metricsWithData.has(k));

    if (missingMetrics.length > 0) {
      gaps.push(`Missing data for ${missingMetrics.length} metrics`);
    }

    // Check for low-quality data (low confidence)
    const lowConfidenceMetrics = metrics.filter((m) => m.confidence && m.confidence < 0.5);
    if (lowConfidenceMetrics.length > 0) {
      gaps.push(`${lowConfidenceMetrics.length} metrics have low confidence scores`);
    }

    return gaps;
  }

  /**
   * Suggest improvements based on benchmark comparisons
   */
  private suggestImprovements(
    metrics: ESGMetric[],
    scores: Record<string, number>,
    benchmarks: ESGBenchmark[]
  ): string[] {
    const improvements: string[] = [];

    for (const metric of metrics) {
      const score = scores[metric.metric_key];
      if (score !== undefined && score < 50) {
        const benchmark = this.findBenchmark(metric, benchmarks);
        if (benchmark && benchmark.p50 !== null && metric.value_numeric !== null) {
          const definition = ESG_METRIC_DEFINITIONS[metric.metric_key];
          const gap = Math.abs(metric.value_numeric - benchmark.p50);
          const gapPct = (gap / benchmark.p50) * 100;

          if (gapPct > 20) {
            improvements.push(
              `${definition?.name || metric.metric_key}: ${gapPct.toFixed(0)}% below median benchmark`
            );
          }
        }
      }
    }

    return improvements;
  }

  /**
   * Group metrics by category and subcategory
   */
  private groupMetrics(metrics: ESGMetric[]): Record<string, Record<string, ESGMetric[]>> {
    const grouped: Record<string, Record<string, ESGMetric[]>> = {};

    for (const metric of metrics) {
      const category = metric.category;
      const subcategory = metric.subcategory || 'null';

      if (!grouped[category]) {
        grouped[category] = {};
      }

      if (!grouped[category][subcategory]) {
        grouped[category][subcategory] = [];
      }

      grouped[category][subcategory].push(metric);
    }

    return grouped;
  }
}

// Singleton instance
let scoringEngineInstance: ESGScoringEngine | null = null;

export function getScoringEngine(): ESGScoringEngine {
  if (!scoringEngineInstance) {
    scoringEngineInstance = new ESGScoringEngine();
  }
  return scoringEngineInstance;
}
