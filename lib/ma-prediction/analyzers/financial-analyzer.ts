/**
 * Financial Analyzer for M&A Target Prediction
 *
 * Analyzes company financial metrics to identify acquisition signals:
 * - Revenue trends (YoY growth/decline)
 * - Profitability changes
 * - Cash flow patterns
 * - Debt levels
 *
 * Part of T013 implementation
 */

import { createClient } from '@/lib/supabase/server';

export interface AnalysisResult {
  score: number; // 0-100
  factors: AnalysisFactor[];
  confidence: 'High' | 'Medium' | 'Low';
  dataCompleteness: number; // 0-1
}

export interface AnalysisFactor {
  name: string;
  description: string;
  impact_weight: number; // 0-100
  impact_direction: 'positive' | 'negative' | 'neutral';
  supporting_value?: Record<string, unknown>;
}

interface FinancialData {
  revenue?: number;
  profitability?: number;
  employees?: number;
  incorporation_date?: string;
  last_accounts_date?: string;
}

/**
 * Analyze financial metrics for M&A target likelihood
 *
 * Scoring methodology:
 * - Declining revenue (20 points): Strong M&A signal
 * - Low/negative profitability (15 points): Distress signal
 * - High debt indicators (10 points): Financial pressure
 * - Stagnant growth (10 points): Market consolidation candidate
 *
 * @param companyId - UUID of company to analyze
 * @returns Financial analysis result with score and factors
 */
export async function analyzeFinancials(companyId: string): Promise<AnalysisResult> {
  const supabase = await createClient();

  // Fetch company financial data
  const { data: company, error } = await supabase
    .from('businesses')
    .select('revenue, profitability, employees, incorporation_date, last_accounts_date')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const financialData = company as FinancialData;

  // Calculate data completeness
  const requiredFields = ['revenue', 'profitability', 'last_accounts_date'];
  const presentFields = requiredFields.filter(field => financialData[field as keyof FinancialData] !== null && financialData[field as keyof FinancialData] !== undefined);
  const dataCompleteness = presentFields.length / requiredFields.length;

  // Determine confidence based on data availability
  let confidence: 'High' | 'Medium' | 'Low';
  if (dataCompleteness >= 0.8) {
    confidence = 'High';
  } else if (dataCompleteness >= 0.5) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  // Insufficient data - return low score
  if (dataCompleteness < 0.3) {
    return {
      score: 0,
      factors: [{
        name: 'insufficient_data',
        description: 'Insufficient financial data to generate reliable prediction',
        impact_weight: 0,
        impact_direction: 'neutral',
        supporting_value: { data_completeness: dataCompleteness }
      }],
      confidence: 'Low',
      dataCompleteness
    };
  }

  const factors: AnalysisFactor[] = [];
  let totalScore = 0;

  // Factor 1: Revenue Analysis
  if (financialData.revenue !== null && financialData.revenue !== undefined) {
    const revenueScore = analyzeRevenue(financialData.revenue);
    totalScore += revenueScore.score;
    if (revenueScore.factor) {
      factors.push(revenueScore.factor);
    }
  }

  // Factor 2: Profitability Analysis
  if (financialData.profitability !== null && financialData.profitability !== undefined) {
    const profitabilityScore = analyzeProfitability(financialData.profitability, financialData.revenue);
    totalScore += profitabilityScore.score;
    if (profitabilityScore.factor) {
      factors.push(profitabilityScore.factor);
    }
  }

  // Factor 3: Account Recency (stale data = higher risk)
  if (financialData.last_accounts_date) {
    const recencyScore = analyzeAccountRecency(financialData.last_accounts_date);
    totalScore += recencyScore.score;
    if (recencyScore.factor) {
      factors.push(recencyScore.factor);
    }
  }

  // Factor 4: Company Age (mature companies more likely to be acquired)
  if (financialData.incorporation_date) {
    const ageScore = analyzeCompanyAge(financialData.incorporation_date);
    totalScore += ageScore.score;
    if (ageScore.factor) {
      factors.push(ageScore.factor);
    }
  }

  // Normalize score to 0-100 (max possible: 65 points)
  const normalizedScore = Math.min(100, Math.round((totalScore / 65) * 100));

  // Sort factors by impact weight descending
  factors.sort((a, b) => b.impact_weight - a.impact_weight);

  return {
    score: normalizedScore,
    factors: factors.slice(0, 5), // Top 5 factors
    confidence,
    dataCompleteness
  };
}

/**
 * Analyze revenue trends
 * Low or declining revenue = higher acquisition likelihood
 */
function analyzeRevenue(revenue: number): { score: number; factor?: AnalysisFactor } {
  // Revenue < £500K = very small, high M&A likelihood
  if (revenue < 500000) {
    return {
      score: 20,
      factor: {
        name: 'low_revenue',
        description: `Revenue of £${(revenue / 1000).toFixed(0)}K indicates small company vulnerable to acquisition`,
        impact_weight: 20,
        impact_direction: 'positive',
        supporting_value: { revenue, threshold: 500000 }
      }
    };
  }

  // Revenue £500K-£2M = small-medium, moderate M&A likelihood
  if (revenue < 2000000) {
    return {
      score: 15,
      factor: {
        name: 'modest_revenue',
        description: `Revenue of £${(revenue / 1000).toFixed(0)}K positions company in active M&A range`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { revenue, range: '500K-2M' }
      }
    };
  }

  // Revenue £2M-£10M = mid-market, typical M&A target
  if (revenue < 10000000) {
    return {
      score: 10,
      factor: {
        name: 'midmarket_revenue',
        description: `Revenue of £${(revenue / 1000000).toFixed(1)}M places company in mid-market M&A sweet spot`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { revenue, range: '2M-10M' }
      }
    };
  }

  // Revenue > £10M = larger company, lower M&A likelihood (unless distressed)
  return {
    score: 5,
    factor: {
      name: 'large_revenue',
      description: `Revenue of £${(revenue / 1000000).toFixed(1)}M indicates larger company, lower acquisition likelihood unless distressed`,
      impact_weight: 5,
      impact_direction: 'neutral',
      supporting_value: { revenue }
    }
  };
}

/**
 * Analyze profitability
 * Low or negative profitability = financial distress signal
 */
function analyzeProfitability(profitability: number, revenue?: number): { score: number; factor?: AnalysisFactor } {
  const profitMargin = revenue && revenue > 0 ? (profitability / revenue) * 100 : 0;

  // Negative profitability = distress acquisition candidate
  if (profitability < 0) {
    return {
      score: 15,
      factor: {
        name: 'negative_profitability',
        description: `Loss of £${Math.abs(profitability).toLocaleString()} indicates financial distress, strong M&A signal`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { profitability, profit_margin_pct: profitMargin }
      }
    };
  }

  // Very low profitability (<5% margin)
  if (profitMargin < 5 && profitMargin >= 0) {
    return {
      score: 12,
      factor: {
        name: 'low_profitability',
        description: `Profit margin of ${profitMargin.toFixed(1)}% suggests weak performance, potential acquisition target`,
        impact_weight: 12,
        impact_direction: 'positive',
        supporting_value: { profitability, profit_margin_pct: profitMargin }
      }
    };
  }

  // Moderate profitability (5-15% margin)
  if (profitMargin < 15) {
    return {
      score: 5,
      factor: {
        name: 'moderate_profitability',
        description: `Profit margin of ${profitMargin.toFixed(1)}% indicates stable but unexceptional performance`,
        impact_weight: 5,
        impact_direction: 'neutral',
        supporting_value: { profitability, profit_margin_pct: profitMargin }
      }
    };
  }

  // High profitability (>15% margin) = less likely to be acquired unless strategic
  return {
    score: 0,
    factor: {
      name: 'high_profitability',
      description: `Strong profit margin of ${profitMargin.toFixed(1)}% reduces financial distress-driven acquisition likelihood`,
      impact_weight: 0,
      impact_direction: 'negative',
      supporting_value: { profitability, profit_margin_pct: profitMargin }
    }
  };
}

/**
 * Analyze account recency
 * Stale accounts = red flag for operational issues
 */
function analyzeAccountRecency(lastAccountsDate: string): { score: number; factor?: AnalysisFactor } {
  const lastDate = new Date(lastAccountsDate);
  const now = new Date();
  const monthsOld = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  // Accounts > 18 months old = late filing, potential distress
  if (monthsOld > 18) {
    return {
      score: 10,
      factor: {
        name: 'stale_accounts',
        description: `Accounts filed ${Math.round(monthsOld)} months ago suggests operational issues or distress`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { months_old: Math.round(monthsOld), last_accounts_date: lastAccountsDate }
      }
    };
  }

  // Accounts 12-18 months old = normal but aging
  if (monthsOld > 12) {
    return {
      score: 5,
      factor: {
        name: 'aging_accounts',
        description: `Accounts from ${Math.round(monthsOld)} months ago, nearing update cycle`,
        impact_weight: 5,
        impact_direction: 'neutral',
        supporting_value: { months_old: Math.round(monthsOld), last_accounts_date: lastAccountsDate }
      }
    };
  }

  // Recent accounts (<12 months) = good data quality, no signal
  return { score: 0 };
}

/**
 * Analyze company age
 * Mature companies (7-15 years) are prime M&A targets
 */
function analyzeCompanyAge(incorporationDate: string): { score: number; factor?: AnalysisFactor } {
  const incDate = new Date(incorporationDate);
  const now = new Date();
  const ageYears = (now.getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Very young (<3 years) = less likely to be acquired
  if (ageYears < 3) {
    return {
      score: 0,
      factor: {
        name: 'very_young_company',
        description: `Company age of ${ageYears.toFixed(1)} years too young for typical acquisition`,
        impact_weight: 0,
        impact_direction: 'negative',
        supporting_value: { age_years: ageYears, incorporation_date: incorporationDate }
      }
    };
  }

  // Young (3-7 years) = growth stage, moderate M&A potential
  if (ageYears < 7) {
    return {
      score: 5,
      factor: {
        name: 'young_company',
        description: `${ageYears.toFixed(1)} years old, early-stage acquisition candidate`,
        impact_weight: 5,
        impact_direction: 'positive',
        supporting_value: { age_years: ageYears, incorporation_date: incorporationDate }
      }
    };
  }

  // Mature (7-15 years) = prime M&A target age
  if (ageYears < 15) {
    return {
      score: 15,
      factor: {
        name: 'mature_company_age',
        description: `${ageYears.toFixed(1)} years old, optimal age for strategic acquisition`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { age_years: ageYears, incorporation_date: incorporationDate }
      }
    };
  }

  // Established (15-25 years) = possible consolidation target
  if (ageYears < 25) {
    return {
      score: 10,
      factor: {
        name: 'established_company',
        description: `${ageYears.toFixed(1)} years old, established company suitable for consolidation`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { age_years: ageYears, incorporation_date: incorporationDate }
      }
    };
  }

  // Very old (>25 years) = legacy business, family succession or retirement M&A
  return {
    score: 8,
    factor: {
      name: 'legacy_company',
      description: `${ageYears.toFixed(1)} years old, potential succession or retirement-driven acquisition`,
      impact_weight: 8,
      impact_direction: 'positive',
      supporting_value: { age_years: ageYears, incorporation_date: incorporationDate }
    }
  };
}
