/**
 * Valuation Estimator for M&A Predictions
 *
 * Estimates acquisition valuation ranges using:
 * - Revenue multiples (based on industry averages)
 * - EBITDA multiples (profitability-based)
 * - Comparable deal analysis
 * - Distressed discount factors
 *
 * Only generates valuations for Medium+ likelihood predictions
 *
 * Part of T019 implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type DbClient = SupabaseClient<Database>;

export interface ValuationEstimate {
  min_valuation_gbp: number;
  max_valuation_gbp: number;
  currency: string;
  valuation_method: string;
  confidence_level: 'High' | 'Medium' | 'Low';
  key_assumptions: Record<string, unknown>;
}

interface CompanyFinancials {
  revenue?: number;
  profitability?: number;
  employees?: number;
  sic_code?: string;
  industry?: string;
}

interface HistoricalDealData {
  deal_value_gbp: number;
  target_revenue_at_deal_gbp: number;
}

/**
 * Estimate valuation range for a company
 *
 * Only generates for Medium+ likelihood (score >= 26)
 * Returns null for Low likelihood companies
 *
 * @param companyId - UUID of company to value
 * @param predictionScore - M&A likelihood score (0-100)
 * @returns Valuation estimate or null if not applicable
 */
export async function estimateValuation(
  companyId: string,
  predictionScore: number
): Promise<ValuationEstimate | null> {
  // Only generate valuations for Medium+ likelihood
  if (predictionScore < 26) {
    return null;
  }

  const supabase = await createClient();

  // Fetch company financials
  const { data: company, error } = await supabase
    .from('businesses')
    .select('revenue, profitability, employees, sic_code, industry')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const financials = company as CompanyFinancials;

  // Insufficient data for valuation
  if (!financials.revenue || financials.revenue <= 0) {
    return null;
  }

  // Determine valuation method based on data availability
  let valuation: ValuationEstimate;

  if (financials.profitability && financials.profitability > 0) {
    // Profitable company: Use EBITDA multiple method
    valuation = await calculateEBITDAMultipleValuation(financials, predictionScore, supabase);
  } else {
    // Unprofitable or missing profitability: Use revenue multiple method
    valuation = await calculateRevenueMultipleValuation(financials, predictionScore, supabase);
  }

  return valuation;
}

/**
 * Calculate valuation using revenue multiples
 * Used for unprofitable companies or when EBITDA is unavailable
 */
async function calculateRevenueMultipleValuation(
  financials: CompanyFinancials,
  predictionScore: number,
  supabase: DbClient
): Promise<ValuationEstimate> {
  const revenue = financials.revenue || 0;

  // Get industry-specific revenue multiple from comparable deals
  const industryMultiple = await getIndustryRevenueMultiple(
    financials.sic_code,
    financials.industry,
    supabase
  );

  // Base multiple (industry average or fallback)
  const baseMultiple = industryMultiple || getDefaultRevenueMultiple(financials.industry);

  // Adjust multiple based on prediction score
  // Higher likelihood = lower multiple (distressed/forced sale)
  // Lower likelihood = higher multiple (healthy business)
  let adjustedMultipleLow = baseMultiple;
  let adjustedMultipleHigh = baseMultiple;

  if (predictionScore >= 76) {
    // Very High likelihood: Likely distressed, 20-30% discount
    adjustedMultipleLow = baseMultiple * 0.7;
    adjustedMultipleHigh = baseMultiple * 0.8;
  } else if (predictionScore >= 51) {
    // High likelihood: Some distress signals, 10-20% discount
    adjustedMultipleLow = baseMultiple * 0.8;
    adjustedMultipleHigh = baseMultiple * 0.9;
  } else {
    // Medium likelihood: Strategic acquisition, normal multiples
    adjustedMultipleLow = baseMultiple * 0.9;
    adjustedMultipleHigh = baseMultiple * 1.1;
  }

  const minValuation = Math.round(revenue * adjustedMultipleLow);
  const maxValuation = Math.round(revenue * adjustedMultipleHigh);

  return {
    min_valuation_gbp: minValuation,
    max_valuation_gbp: maxValuation,
    currency: 'GBP',
    valuation_method: 'revenue_multiple',
    confidence_level: industryMultiple ? 'Medium' : 'Low',
    key_assumptions: {
      revenue,
      base_revenue_multiple: baseMultiple,
      adjusted_multiple_low: adjustedMultipleLow,
      adjusted_multiple_high: adjustedMultipleHigh,
      prediction_score: predictionScore,
      source: industryMultiple ? 'comparable_deals' : 'industry_default'
    }
  };
}

/**
 * Calculate valuation using EBITDA multiples
 * More accurate for profitable companies
 */
async function calculateEBITDAMultipleValuation(
  financials: CompanyFinancials,
  predictionScore: number,
  supabase: DbClient
): Promise<ValuationEstimate> {
  const profitability = financials.profitability || 0;
  const revenue = financials.revenue || 0;

  // Estimate EBITDA (simplified: assume profitability ~ EBITDA for SMEs)
  const ebitda = profitability;

  // Get industry-specific EBITDA multiple
  const industryMultiple = await getIndustryEBITDAMultiple(
    financials.sic_code,
    financials.industry,
    supabase
  );

  // Base multiple (industry average or fallback)
  const baseMultiple = industryMultiple || getDefaultEBITDAMultiple(financials.industry);

  // Adjust multiple based on prediction score
  let adjustedMultipleLow = baseMultiple;
  let adjustedMultipleHigh = baseMultiple;

  if (predictionScore >= 76) {
    // Very High: Distressed, 30-40% discount
    adjustedMultipleLow = baseMultiple * 0.6;
    adjustedMultipleHigh = baseMultiple * 0.7;
  } else if (predictionScore >= 51) {
    // High: 15-25% discount
    adjustedMultipleLow = baseMultiple * 0.75;
    adjustedMultipleHigh = baseMultiple * 0.85;
  } else {
    // Medium: Normal range
    adjustedMultipleLow = baseMultiple * 0.9;
    adjustedMultipleHigh = baseMultiple * 1.1;
  }

  const minValuation = Math.round(ebitda * adjustedMultipleLow);
  const maxValuation = Math.round(ebitda * adjustedMultipleHigh);

  return {
    min_valuation_gbp: minValuation,
    max_valuation_gbp: maxValuation,
    currency: 'GBP',
    valuation_method: 'ebitda_multiple',
    confidence_level: industryMultiple ? 'High' : 'Medium',
    key_assumptions: {
      revenue,
      ebitda,
      base_ebitda_multiple: baseMultiple,
      adjusted_multiple_low: adjustedMultipleLow,
      adjusted_multiple_high: adjustedMultipleHigh,
      prediction_score: predictionScore,
      source: industryMultiple ? 'comparable_deals' : 'industry_default'
    }
  };
}

/**
 * Get industry-specific revenue multiple from comparable deals
 */
async function getIndustryRevenueMultiple(
  sicCode?: string,
  industry?: string,
  supabase?: DbClient
): Promise<number | null> {
  if (!supabase || (!sicCode && !industry)) {
    return null;
  }

  // Query historical deals in same industry with known valuations and revenue
  const { data: deals, error } = await supabase
    .from('ma_historical_deals')
    .select('deal_value_gbp, target_revenue_at_deal_gbp')
    .or(`target_sic_code.eq.${sicCode},target_industry_description.ilike.%${industry}%`)
    .not('deal_value_gbp', 'is', null)
    .not('target_revenue_at_deal_gbp', 'is', null)
    .gt('target_revenue_at_deal_gbp', 0)
    .limit(20);

  if (error || !deals || deals.length === 0) {
    return null;
  }

  // Calculate multiples from historical deals
  const multiples = deals.map((deal: HistoricalDealData) => deal.deal_value_gbp / deal.target_revenue_at_deal_gbp);

  // Return median multiple (more robust than average)
  multiples.sort((a, b) => a - b);
  const median = multiples[Math.floor(multiples.length / 2)];

  return median;
}

/**
 * Get industry-specific EBITDA multiple from comparable deals
 */
async function getIndustryEBITDAMultiple(
  sicCode?: string,
  industry?: string,
  supabase?: DbClient
): Promise<number | null> {
  if (!supabase || (!sicCode && !industry)) {
    return null;
  }

  // Note: Our seed data doesn't have EBITDA, so this will often return null
  // In production, would query deals with profitability/EBITDA data
  const { data: deals, error } = await supabase
    .from('ma_historical_deals')
    .select('deal_value_gbp, target_revenue_at_deal_gbp')
    .or(`target_sic_code.eq.${sicCode},target_industry_description.ilike.%${industry}%`)
    .not('deal_value_gbp', 'is', null)
    .limit(10);

  if (error || !deals || deals.length === 0) {
    return null;
  }

  // Fallback: Estimate EBITDA multiple from revenue multiple
  // Typical EBITDA multiple = Revenue multiple * 3-4x (rough approximation)
  const revenueMultiple = await getIndustryRevenueMultiple(sicCode, industry, supabase);
  if (revenueMultiple) {
    return revenueMultiple * 3.5;
  }

  return null;
}

/**
 * Get default revenue multiple by industry sector
 * Fallback when no comparable deals available
 */
function getDefaultRevenueMultiple(industry?: string): number {
  const industryLower = (industry || '').toLowerCase();

  // SaaS / Technology: High growth multiples
  if (industryLower.includes('software') || industryLower.includes('saas') || industryLower.includes('technology')) {
    return 3.0; // 2-4x revenue
  }

  // Professional Services: Moderate multiples
  if (industryLower.includes('consulting') || industryLower.includes('professional') || industryLower.includes('legal')) {
    return 1.5; // 1-2x revenue
  }

  // Retail / E-commerce: Lower multiples
  if (industryLower.includes('retail') || industryLower.includes('e-commerce') || industryLower.includes('shop')) {
    return 0.8; // 0.5-1x revenue
  }

  // Manufacturing: Traditional multiples
  if (industryLower.includes('manufacturing') || industryLower.includes('production')) {
    return 1.2; // 0.8-1.5x revenue
  }

  // Healthcare: Higher multiples
  if (industryLower.includes('health') || industryLower.includes('medical')) {
    return 2.0; // 1.5-2.5x revenue
  }

  // Default: Conservative multiple
  return 1.0; // 0.8-1.2x revenue
}

/**
 * Get default EBITDA multiple by industry sector
 */
function getDefaultEBITDAMultiple(industry?: string): number {
  const industryLower = (industry || '').toLowerCase();

  // Technology: High multiples
  if (industryLower.includes('software') || industryLower.includes('saas') || industryLower.includes('technology')) {
    return 10.0; // 8-12x EBITDA
  }

  // Professional Services
  if (industryLower.includes('consulting') || industryLower.includes('professional')) {
    return 6.0; // 5-7x EBITDA
  }

  // Retail
  if (industryLower.includes('retail') || industryLower.includes('e-commerce')) {
    return 5.0; // 4-6x EBITDA
  }

  // Manufacturing
  if (industryLower.includes('manufacturing')) {
    return 6.5; // 5-8x EBITDA
  }

  // Healthcare
  if (industryLower.includes('health') || industryLower.includes('medical')) {
    return 8.0; // 7-9x EBITDA
  }

  // Default
  return 6.0; // 5-7x EBITDA
}
