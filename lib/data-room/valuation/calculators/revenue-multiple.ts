/**
 * Revenue Multiple Calculator
 *
 * Calculates SaaS company valuation using revenue multiple methodology
 * Formula: Valuation = ARR × Revenue Multiple
 * Adjusts multiple based on: growth rate, NRR, gross margin, profitability
 *
 * Target Output: "$75M-$120M" range with low/mid/high estimates
 */

import type {
  ValuationModel,
  ValuationComparable,
  MultipleAdjustment,
  CalculationDetails,
  AIInsights,
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

// Base revenue multiples by company stage and growth
const BASE_MULTIPLES = {
  early_stage: {
    high_growth: 12.0, // >100% YoY
    medium_growth: 8.0, // 50-100% YoY
    low_growth: 5.0, // <50% YoY
  },
  growth: {
    high_growth: 10.0, // >80% YoY
    medium_growth: 7.0, // 40-80% YoY
    low_growth: 4.0, // <40% YoY
  },
  late_stage: {
    high_growth: 8.0, // >50% YoY
    medium_growth: 5.0, // 25-50% YoY
    low_growth: 3.0, // <25% YoY
  },
  public: {
    high_growth: 7.0, // >40% YoY
    medium_growth: 4.0, // 20-40% YoY
    low_growth: 2.5, // <20% YoY
  },
};

// Adjustment factors
const ADJUSTMENTS = {
  // Growth rate adjustments
  exceptional_growth: { threshold: 150, adjustment: +2.0, reason: 'Exceptional growth (>150% YoY)' },
  strong_growth: { threshold: 100, adjustment: +1.5, reason: 'Strong growth (>100% YoY)' },
  healthy_growth: { threshold: 50, adjustment: +0.5, reason: 'Healthy growth (>50% YoY)' },

  // NRR adjustments
  excellent_nrr: { threshold: 120, adjustment: +1.5, reason: 'Excellent NRR (>120%)' },
  strong_nrr: { threshold: 110, adjustment: +1.0, reason: 'Strong NRR (>110%)' },
  good_nrr: { threshold: 100, adjustment: +0.5, reason: 'Good NRR (>100%)' },
  weak_nrr: { threshold: 90, adjustment: -1.0, reason: 'Weak NRR (<90%)' },

  // Gross margin adjustments
  excellent_margin: { threshold: 80, adjustment: +1.0, reason: 'Excellent gross margin (>80%)' },
  strong_margin: { threshold: 70, adjustment: +0.5, reason: 'Strong gross margin (>70%)' },
  weak_margin: { threshold: 50, adjustment: -1.0, reason: 'Weak gross margin (<50%)' },

  // Profitability adjustments
  profitable: { adjustment: +1.5, reason: 'Profitable (positive EBITDA)' },
  near_profitable: { adjustment: +0.5, reason: 'Near profitable (EBITDA margin >-10%)' },
  high_burn: { adjustment: -1.0, reason: 'High burn rate with limited runway' },

  // CAC efficiency
  efficient_cac: { threshold: 12, adjustment: +0.5, reason: 'Efficient CAC payback (<12 months)' },
  slow_cac: { threshold: 24, adjustment: -0.5, reason: 'Slow CAC payback (>24 months)' },
};

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export interface RevenueMultipleCalculationInput {
  // Financial inputs
  arr: number;
  revenue_growth_rate?: number | null;
  gross_margin?: number | null;
  net_revenue_retention?: number | null;
  cac_payback_months?: number | null;
  ebitda?: number | null;
  burn_rate?: number | null;
  runway_months?: number | null;

  // Comparables for benchmarking
  comparables?: ValuationComparable[];

  // Company context
  company_stage?: 'early_stage' | 'growth' | 'late_stage' | 'public';
  currency?: string;
}

export interface RevenueMultipleCalculationResult {
  // Valuation estimates
  valuation_low: number;
  valuation_mid: number;
  valuation_high: number;

  // Revenue multiples
  multiple_low: number;
  multiple_mid: number;
  multiple_high: number;

  // Confidence and quality
  confidence: number; // 0.0 to 1.0
  data_quality_score: number;

  // Calculation breakdown
  calculation_details: CalculationDetails;

  // AI insights (if generated)
  ai_insights?: AIInsights;
}

/**
 * Calculate valuation using revenue multiple methodology
 */
export function calculateRevenueMultiple(
  input: RevenueMultipleCalculationInput
): RevenueMultipleCalculationResult {
  // Step 1: Determine base multiple
  const baseMultiple = determineBaseMultiple(
    input.revenue_growth_rate,
    input.company_stage || 'growth'
  );

  // Step 2: Calculate adjustments
  const adjustments = calculateAdjustments(input);

  // Step 3: Apply adjustments to get mid-case multiple
  const adjustmentSum = adjustments.reduce((sum, adj) => sum + adj.impact, 0);
  const midMultiple = Math.max(1.0, baseMultiple + adjustmentSum); // Floor at 1.0x

  // Step 4: Calculate range (mid +/- 20%)
  const lowMultiple = midMultiple * 0.8;
  const highMultiple = midMultiple * 1.2;

  // Step 5: Calculate valuations
  const valuationLow = input.arr * lowMultiple;
  const valuationMid = input.arr * midMultiple;
  const valuationHigh = input.arr * highMultiple;

  // Step 6: Calculate confidence
  const confidence = calculateConfidence(input, adjustments);

  // Step 7: Calculate data quality
  const dataQuality = calculateDataQuality(input);

  // Step 8: Build calculation details
  const calculationDetails: CalculationDetails = {
    methodology: 'Revenue Multiple',
    inputs_used: getInputsUsed(input),
    inputs_missing: getInputsMissing(input),
    base_multiple: baseMultiple,
    adjustments,
    final_multiple: midMultiple,
    valuation_formula: `ARR (${formatCurrency(input.arr, input.currency)}) × Revenue Multiple (${midMultiple.toFixed(2)}x)`,
    comparable_stats: input.comparables ? calculateComparableStats(input.comparables) : undefined,
  };

  // Step 9: Generate AI insights
  const aiInsights = generateInsights(input, adjustments, midMultiple);

  return {
    valuation_low: valuationLow,
    valuation_mid: valuationMid,
    valuation_high: valuationHigh,
    multiple_low: lowMultiple,
    multiple_mid: midMultiple,
    multiple_high: highMultiple,
    confidence,
    data_quality_score: dataQuality,
    calculation_details: calculationDetails,
    ai_insights: aiInsights,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine base revenue multiple based on growth rate and stage
 */
function determineBaseMultiple(
  growthRate: number | null | undefined,
  stage: 'early_stage' | 'growth' | 'late_stage' | 'public'
): number {
  const stageMultiples = BASE_MULTIPLES[stage];

  if (!growthRate) {
    // No growth data - use medium growth as default
    return stageMultiples.medium_growth;
  }

  // Determine growth tier
  const growthThresholds = {
    early_stage: { high: 100, medium: 50 },
    growth: { high: 80, medium: 40 },
    late_stage: { high: 50, medium: 25 },
    public: { high: 40, medium: 20 },
  };

  const thresholds = growthThresholds[stage];

  if (growthRate >= thresholds.high) {
    return stageMultiples.high_growth;
  } else if (growthRate >= thresholds.medium) {
    return stageMultiples.medium_growth;
  } else {
    return stageMultiples.low_growth;
  }
}

/**
 * Calculate all adjustments to base multiple
 */
function calculateAdjustments(
  input: RevenueMultipleCalculationInput
): MultipleAdjustment[] {
  const adjustments: MultipleAdjustment[] = [];

  // Growth rate adjustments
  if (input.revenue_growth_rate !== null && input.revenue_growth_rate !== undefined) {
    if (input.revenue_growth_rate >= ADJUSTMENTS.exceptional_growth.threshold) {
      adjustments.push({
        factor: 'Growth Rate',
        impact: ADJUSTMENTS.exceptional_growth.adjustment,
        reasoning: ADJUSTMENTS.exceptional_growth.reason,
      });
    } else if (input.revenue_growth_rate >= ADJUSTMENTS.strong_growth.threshold) {
      adjustments.push({
        factor: 'Growth Rate',
        impact: ADJUSTMENTS.strong_growth.adjustment,
        reasoning: ADJUSTMENTS.strong_growth.reason,
      });
    } else if (input.revenue_growth_rate >= ADJUSTMENTS.healthy_growth.threshold) {
      adjustments.push({
        factor: 'Growth Rate',
        impact: ADJUSTMENTS.healthy_growth.adjustment,
        reasoning: ADJUSTMENTS.healthy_growth.reason,
      });
    }
  }

  // NRR adjustments
  if (input.net_revenue_retention !== null && input.net_revenue_retention !== undefined) {
    if (input.net_revenue_retention >= ADJUSTMENTS.excellent_nrr.threshold) {
      adjustments.push({
        factor: 'Net Revenue Retention',
        impact: ADJUSTMENTS.excellent_nrr.adjustment,
        reasoning: ADJUSTMENTS.excellent_nrr.reason,
      });
    } else if (input.net_revenue_retention >= ADJUSTMENTS.strong_nrr.threshold) {
      adjustments.push({
        factor: 'Net Revenue Retention',
        impact: ADJUSTMENTS.strong_nrr.adjustment,
        reasoning: ADJUSTMENTS.strong_nrr.reason,
      });
    } else if (input.net_revenue_retention >= ADJUSTMENTS.good_nrr.threshold) {
      adjustments.push({
        factor: 'Net Revenue Retention',
        impact: ADJUSTMENTS.good_nrr.adjustment,
        reasoning: ADJUSTMENTS.good_nrr.reason,
      });
    } else if (input.net_revenue_retention < ADJUSTMENTS.weak_nrr.threshold) {
      adjustments.push({
        factor: 'Net Revenue Retention',
        impact: ADJUSTMENTS.weak_nrr.adjustment,
        reasoning: ADJUSTMENTS.weak_nrr.reason,
      });
    }
  }

  // Gross margin adjustments
  if (input.gross_margin !== null && input.gross_margin !== undefined) {
    if (input.gross_margin >= ADJUSTMENTS.excellent_margin.threshold) {
      adjustments.push({
        factor: 'Gross Margin',
        impact: ADJUSTMENTS.excellent_margin.adjustment,
        reasoning: ADJUSTMENTS.excellent_margin.reason,
      });
    } else if (input.gross_margin >= ADJUSTMENTS.strong_margin.threshold) {
      adjustments.push({
        factor: 'Gross Margin',
        impact: ADJUSTMENTS.strong_margin.adjustment,
        reasoning: ADJUSTMENTS.strong_margin.reason,
      });
    } else if (input.gross_margin < ADJUSTMENTS.weak_margin.threshold) {
      adjustments.push({
        factor: 'Gross Margin',
        impact: ADJUSTMENTS.weak_margin.adjustment,
        reasoning: ADJUSTMENTS.weak_margin.reason,
      });
    }
  }

  // Profitability adjustments
  if (input.ebitda !== null && input.ebitda !== undefined && input.arr) {
    const ebitdaMargin = (input.ebitda / input.arr) * 100; // EBITDA margin %

    if (ebitdaMargin > 0) {
      adjustments.push({
        factor: 'Profitability',
        impact: ADJUSTMENTS.profitable.adjustment,
        reasoning: ADJUSTMENTS.profitable.reason,
      });
    } else if (ebitdaMargin > -10) {
      adjustments.push({
        factor: 'Profitability',
        impact: ADJUSTMENTS.near_profitable.adjustment,
        reasoning: ADJUSTMENTS.near_profitable.reason,
      });
    }
  }

  // Burn rate / runway adjustments
  if (
    input.burn_rate &&
    input.runway_months !== null &&
    input.runway_months !== undefined &&
    input.runway_months < 12
  ) {
    adjustments.push({
      factor: 'Cash Position',
      impact: ADJUSTMENTS.high_burn.adjustment,
      reasoning: ADJUSTMENTS.high_burn.reason,
    });
  }

  // CAC efficiency adjustments
  if (input.cac_payback_months !== null && input.cac_payback_months !== undefined) {
    if (input.cac_payback_months <= ADJUSTMENTS.efficient_cac.threshold) {
      adjustments.push({
        factor: 'CAC Efficiency',
        impact: ADJUSTMENTS.efficient_cac.adjustment,
        reasoning: ADJUSTMENTS.efficient_cac.reason,
      });
    } else if (input.cac_payback_months >= ADJUSTMENTS.slow_cac.threshold) {
      adjustments.push({
        factor: 'CAC Efficiency',
        impact: ADJUSTMENTS.slow_cac.adjustment,
        reasoning: ADJUSTMENTS.slow_cac.reason,
      });
    }
  }

  return adjustments;
}

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(
  input: RevenueMultipleCalculationInput,
  adjustments: MultipleAdjustment[]
): number {
  let score = 0.5; // Start at 50%

  // Bonus for having key metrics
  if (input.revenue_growth_rate !== null && input.revenue_growth_rate !== undefined) score += 0.15;
  if (input.gross_margin !== null && input.gross_margin !== undefined) score += 0.1;
  if (input.net_revenue_retention !== null && input.net_revenue_retention !== undefined) score += 0.15;
  if (input.ebitda !== null && input.ebitda !== undefined) score += 0.05;
  if (input.cac_payback_months !== null && input.cac_payback_months !== undefined) score += 0.05;

  // Bonus for having comparables
  if (input.comparables && input.comparables.length >= 3) {
    score += 0.1;
  } else if (input.comparables && input.comparables.length >= 1) {
    score += 0.05;
  }

  return Math.min(1.0, score); // Cap at 1.0
}

/**
 * Calculate data quality score
 */
function calculateDataQuality(input: RevenueMultipleCalculationInput): number {
  const criticalMetrics = ['revenue_growth_rate', 'gross_margin', 'net_revenue_retention'];

  const availableCount = criticalMetrics.filter(
    (metric) =>
      input[metric as keyof RevenueMultipleCalculationInput] !== null &&
      input[metric as keyof RevenueMultipleCalculationInput] !== undefined
  ).length;

  return availableCount / criticalMetrics.length;
}

/**
 * Get list of inputs used in calculation
 */
function getInputsUsed(input: RevenueMultipleCalculationInput): string[] {
  const used: string[] = ['arr'];

  if (input.revenue_growth_rate !== null && input.revenue_growth_rate !== undefined)
    used.push('revenue_growth_rate');
  if (input.gross_margin !== null && input.gross_margin !== undefined) used.push('gross_margin');
  if (input.net_revenue_retention !== null && input.net_revenue_retention !== undefined)
    used.push('net_revenue_retention');
  if (input.cac_payback_months !== null && input.cac_payback_months !== undefined)
    used.push('cac_payback_months');
  if (input.ebitda !== null && input.ebitda !== undefined) used.push('ebitda');
  if (input.burn_rate !== null && input.burn_rate !== undefined) used.push('burn_rate');
  if (input.runway_months !== null && input.runway_months !== undefined) used.push('runway_months');

  return used;
}

/**
 * Get list of missing inputs
 */
function getInputsMissing(input: RevenueMultipleCalculationInput): string[] {
  const all = [
    'revenue_growth_rate',
    'gross_margin',
    'net_revenue_retention',
    'cac_payback_months',
    'ebitda',
    'burn_rate',
    'runway_months',
  ];

  return all.filter(
    (metric) =>
      input[metric as keyof RevenueMultipleCalculationInput] === null ||
      input[metric as keyof RevenueMultipleCalculationInput] === undefined
  );
}

/**
 * Calculate statistics from comparables
 */
function calculateComparableStats(comparables: ValuationComparable[]) {
  if (comparables.length === 0) return undefined;

  const multiples = comparables.map((c) => c.revenue_multiple);

  // Sort for median calculation
  const sortedMultiples = [...multiples].sort((a, b) => a - b);
  const median =
    sortedMultiples.length % 2 === 0
      ? (sortedMultiples[sortedMultiples.length / 2 - 1] + sortedMultiples[sortedMultiples.length / 2]) / 2
      : sortedMultiples[Math.floor(sortedMultiples.length / 2)];

  const avg = multiples.reduce((sum, m) => sum + m, 0) / multiples.length;

  // Standard deviation
  const variance = multiples.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / multiples.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: comparables.length,
    median_multiple: median,
    avg_multiple: avg,
    std_dev: stdDev,
  };
}

/**
 * Generate AI insights about the valuation
 */
function generateInsights(
  input: RevenueMultipleCalculationInput,
  adjustments: MultipleAdjustment[],
  finalMultiple: number
): AIInsights {
  // Reasoning
  const reasoning = `Valuation calculated using revenue multiple methodology. Base multiple of ${finalMultiple.toFixed(2)}x applied to ARR of ${formatCurrency(input.arr, input.currency)}.`;

  // Identify risks
  const risks: string[] = [];
  if (!input.revenue_growth_rate) risks.push('Growth rate not provided - valuation assumes average growth');
  if (!input.net_revenue_retention || input.net_revenue_retention < 100)
    risks.push('Net revenue retention is below 100% - indicates customer churn risk');
  if (input.runway_months && input.runway_months < 12)
    risks.push(`Limited cash runway (${input.runway_months} months) may require fundraising`);
  if (!input.gross_margin || input.gross_margin < 70)
    risks.push('Gross margin below 70% - may impact profitability at scale');

  // Identify opportunities
  const opportunities: string[] = [];
  if (input.revenue_growth_rate && input.revenue_growth_rate > 100)
    opportunities.push('Exceptional growth rate positions company for premium valuation');
  if (input.net_revenue_retention && input.net_revenue_retention > 120)
    opportunities.push('Strong net revenue retention indicates excellent product-market fit');
  if (input.gross_margin && input.gross_margin > 80)
    opportunities.push('Excellent gross margins provide leverage for profitability');
  if (input.ebitda && input.ebitda > 0)
    opportunities.push('Profitability achieved - reduces financing risk and improves valuation');

  // Extract assumptions
  const assumptions = adjustments.map((adj) => `${adj.factor}: ${adj.reasoning}`);

  // Confidence factors
  const confidenceFactors = {
    data_completeness: calculateDataQuality(input),
    market_comparability: input.comparables && input.comparables.length >= 3 ? 0.8 : 0.5,
    financial_health: input.ebitda && input.ebitda > 0 ? 0.9 : 0.6,
  };

  // Comparable companies
  const comparableCompanies =
    input.comparables?.map((c) => `${c.company_name} (${c.revenue_multiple.toFixed(1)}x)`) || [];

  return {
    reasoning,
    risks,
    opportunities,
    assumptions,
    comparable_companies: comparableCompanies,
    confidence_factors: confidenceFactors,
  };
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency?: string): string {
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  if (amount >= 1000000) {
    return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
  } else {
    return `${currencySymbol}${amount.toFixed(0)}`;
  }
}

/**
 * Format valuation range for display
 */
export function formatValuationRange(
  low: number,
  high: number,
  currency?: string
): string {
  return `${formatCurrency(low, currency)}-${formatCurrency(high, currency)}`;
}
