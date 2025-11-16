/**
 * Pattern Matcher for M&A Target Prediction
 *
 * Matches current company against historical M&A transactions to identify similar patterns:
 * - Similar industry/SIC code deals
 * - Similar company size (revenue, employees)
 * - Similar company age at acquisition
 * - Deal rationale patterns (horizontal, vertical, distressed, etc.)
 *
 * Part of T016 implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type DbClient = SupabaseClient<Database>;

export interface AnalysisResult {
  score: number; // 0-100
  factors: AnalysisFactor[];
  confidence: 'High' | 'Medium' | 'Low';
  dataCompleteness: number; // 0-1
  comparableDeals?: ComparableDeal[];
}

export interface AnalysisFactor {
  name: string;
  description: string;
  impact_weight: number; // 0-100
  impact_direction: 'positive' | 'negative' | 'neutral';
  supporting_value?: Record<string, unknown>;
}

export interface ComparableDeal {
  target_company_name: string;
  acquirer_company_name: string;
  deal_date: string;
  deal_value_gbp: number | null;
  similarity_score: number; // 0-100
  matching_factors: string[];
}

interface CompanyProfile {
  sic_code?: string;
  industry?: string;
  revenue?: number;
  employees?: number;
  incorporation_date?: string;
}

interface HistoricalDealData {
  target_company_name: string;
  acquirer_company_name: string;
  deal_date: string;
  deal_value_gbp: number | null;
  target_sic_code?: string;
  target_industry_description?: string;
  target_revenue_at_deal_gbp?: number;
  target_employee_count_at_deal?: number;
  target_age_years?: number;
}

/**
 * Match company against historical M&A patterns
 *
 * Scoring methodology:
 * - 5+ similar historical deals: 25 points (strong pattern match)
 * - 3-4 similar deals: 20 points (moderate pattern)
 * - 1-2 similar deals: 15 points (weak pattern)
 * - High similarity score (>80%): +10 bonus points
 *
 * @param companyId - UUID of company to analyze
 * @returns Pattern matching result with score and comparable deals
 */
export async function matchPatterns(companyId: string): Promise<AnalysisResult> {
  const supabase = await createClient();

  // Fetch company profile
  const { data: company, error } = await supabase
    .from('businesses')
    .select('sic_code, industry, revenue, employees, incorporation_date')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const profile = company as CompanyProfile;

  // Calculate company age
  let companyAge = 0;
  if (profile.incorporation_date) {
    const incDate = new Date(profile.incorporation_date);
    const now = new Date();
    companyAge = (now.getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }

  // Calculate data completeness
  const requiredFields = ['sic_code', 'revenue', 'employees', 'incorporation_date'];
  const presentFields = requiredFields.filter(field => profile[field as keyof CompanyProfile] !== null && profile[field as keyof CompanyProfile] !== undefined);
  const dataCompleteness = presentFields.length / requiredFields.length;

  // Determine confidence
  let confidence: 'High' | 'Medium' | 'Low';
  if (dataCompleteness >= 0.8) {
    confidence = 'High';
  } else if (dataCompleteness >= 0.5) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  // Insufficient data
  if (dataCompleteness < 0.3) {
    return {
      score: 0,
      factors: [{
        name: 'insufficient_pattern_data',
        description: 'Insufficient company data to match against historical M&A patterns',
        impact_weight: 0,
        impact_direction: 'neutral',
        supporting_value: { data_completeness: dataCompleteness }
      }],
      confidence: 'Low',
      dataCompleteness
    };
  }

  // Find comparable historical deals
  const comparableDeals = await findComparableDeals(profile, companyAge, supabase);

  const factors: AnalysisFactor[] = [];
  let totalScore = 0;

  // Factor 1: Pattern Match Count
  if (comparableDeals.length > 0) {
    const matchScore = analyzePatternMatches(comparableDeals);
    totalScore += matchScore.score;
    if (matchScore.factor) {
      factors.push(matchScore.factor);
    }

    // Factor 2: Similarity Quality (average similarity score)
    const avgSimilarity = comparableDeals.reduce((sum, deal) => sum + deal.similarity_score, 0) / comparableDeals.length;
    const qualityScore = analyzeSimilarityQuality(avgSimilarity, comparableDeals.length);
    totalScore += qualityScore.score;
    if (qualityScore.factor) {
      factors.push(qualityScore.factor);
    }

    // Factor 3: Recent Deal Activity (deals in last 12 months)
    const recentDeals = comparableDeals.filter(deal => {
      const dealDate = new Date(deal.deal_date);
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      return dealDate >= twelveMonthsAgo;
    });

    if (recentDeals.length > 0) {
      const recentScore = analyzeRecentActivity(recentDeals.length);
      totalScore += recentScore.score;
      if (recentScore.factor) {
        factors.push(recentScore.factor);
      }
    }
  } else {
    // No comparable deals found
    factors.push({
      name: 'no_comparable_deals',
      description: 'No historical M&A deals match this company profile, limited pattern data',
      impact_weight: 0,
      impact_direction: 'negative',
      supporting_value: { comparable_count: 0 }
    });
  }

  // Normalize score to 0-100 (max possible: 50 points)
  const normalizedScore = Math.min(100, Math.round((totalScore / 50) * 100));

  // Sort factors by impact weight descending
  factors.sort((a, b) => b.impact_weight - a.impact_weight);

  return {
    score: normalizedScore,
    factors: factors.slice(0, 5), // Top 5 factors
    confidence,
    dataCompleteness,
    comparableDeals: comparableDeals.slice(0, 10) // Top 10 comparable deals
  };
}

/**
 * Find historical M&A deals similar to this company
 */
async function findComparableDeals(
  profile: CompanyProfile,
  companyAge: number,
  supabase: DbClient
): Promise<ComparableDeal[]> {
  // Query all verified historical deals
  const { data: allDeals, error } = await supabase
    .from('ma_historical_deals')
    .select('*')
    .eq('verified', true)
    .order('deal_date', { ascending: false });

  if (error || !allDeals) {
    return [];
  }

  // Calculate similarity score for each deal
  const scoredDeals = allDeals.map((deal: HistoricalDealData) => {
    let similarityScore = 0;
    const matchingFactors: string[] = [];

    // Industry match (40 points max)
    if (profile.sic_code && deal.target_sic_code === profile.sic_code) {
      similarityScore += 40;
      matchingFactors.push('exact_sic_match');
    } else if (profile.industry && deal.target_industry_description?.toLowerCase().includes(profile.industry.toLowerCase())) {
      similarityScore += 25;
      matchingFactors.push('industry_match');
    }

    // Revenue match (30 points max)
    if (profile.revenue && deal.target_revenue_at_deal_gbp) {
      const revenueRatio = Math.min(profile.revenue, deal.target_revenue_at_deal_gbp) / Math.max(profile.revenue, deal.target_revenue_at_deal_gbp);
      if (revenueRatio >= 0.7) {
        similarityScore += 30;
        matchingFactors.push('similar_revenue');
      } else if (revenueRatio >= 0.5) {
        similarityScore += 20;
        matchingFactors.push('comparable_revenue');
      } else if (revenueRatio >= 0.3) {
        similarityScore += 10;
        matchingFactors.push('revenue_same_order');
      }
    }

    // Employee count match (15 points max)
    if (profile.employees && deal.target_employee_count_at_deal) {
      const employeeRatio = Math.min(profile.employees, deal.target_employee_count_at_deal) / Math.max(profile.employees, deal.target_employee_count_at_deal);
      if (employeeRatio >= 0.7) {
        similarityScore += 15;
        matchingFactors.push('similar_team_size');
      } else if (employeeRatio >= 0.5) {
        similarityScore += 10;
        matchingFactors.push('comparable_team_size');
      }
    }

    // Age match (15 points max)
    if (companyAge > 0 && deal.target_age_years) {
      const ageDiff = Math.abs(companyAge - deal.target_age_years);
      if (ageDiff <= 2) {
        similarityScore += 15;
        matchingFactors.push('similar_age');
      } else if (ageDiff <= 5) {
        similarityScore += 10;
        matchingFactors.push('comparable_age');
      } else if (ageDiff <= 10) {
        similarityScore += 5;
        matchingFactors.push('same_lifecycle_stage');
      }
    }

    return {
      target_company_name: deal.target_company_name,
      acquirer_company_name: deal.acquirer_company_name,
      deal_date: deal.deal_date,
      deal_value_gbp: deal.deal_value_gbp,
      similarity_score: similarityScore,
      matching_factors: matchingFactors
    };
  });

  // Filter to deals with at least 30% similarity and sort by similarity
  const comparableDeals = scoredDeals
    .filter((deal: ComparableDeal) => deal.similarity_score >= 30)
    .sort((a: ComparableDeal, b: ComparableDeal) => b.similarity_score - a.similarity_score);

  return comparableDeals;
}

/**
 * Analyze pattern match count
 */
function analyzePatternMatches(deals: ComparableDeal[]): { score: number; factor?: AnalysisFactor } {
  const count = deals.length;

  // Strong pattern (5+ matches)
  if (count >= 5) {
    return {
      score: 25,
      factor: {
        name: 'strong_pattern_match',
        description: `${count} similar M&A deals found, strong historical acquisition pattern`,
        impact_weight: 25,
        impact_direction: 'positive',
        supporting_value: { comparable_deals_count: count }
      }
    };
  }

  // Moderate pattern (3-4 matches)
  if (count >= 3) {
    return {
      score: 20,
      factor: {
        name: 'moderate_pattern_match',
        description: `${count} comparable M&A deals identified, moderate acquisition pattern`,
        impact_weight: 20,
        impact_direction: 'positive',
        supporting_value: { comparable_deals_count: count }
      }
    };
  }

  // Weak pattern (1-2 matches)
  if (count >= 1) {
    return {
      score: 15,
      factor: {
        name: 'weak_pattern_match',
        description: `${count} similar M&A deal(s) found, limited historical pattern`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { comparable_deals_count: count }
      }
    };
  }

  return { score: 0 };
}

/**
 * Analyze similarity quality (how close are the matches)
 */
function analyzeSimilarityQuality(avgSimilarity: number, count: number): { score: number; factor?: AnalysisFactor } {
  // Very high similarity (>80%)
  if (avgSimilarity >= 80) {
    return {
      score: 15,
      factor: {
        name: 'very_high_similarity',
        description: `Comparable deals show ${avgSimilarity.toFixed(0)}% average similarity, very strong pattern match`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { average_similarity: avgSimilarity, deal_count: count }
      }
    };
  }

  // High similarity (60-79%)
  if (avgSimilarity >= 60) {
    return {
      score: 10,
      factor: {
        name: 'high_similarity',
        description: `${avgSimilarity.toFixed(0)}% average similarity to comparable deals`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { average_similarity: avgSimilarity, deal_count: count }
      }
    };
  }

  // Moderate similarity (40-59%)
  if (avgSimilarity >= 40) {
    return {
      score: 5,
      factor: {
        name: 'moderate_similarity',
        description: `${avgSimilarity.toFixed(0)}% similarity to historical deals, moderate pattern strength`,
        impact_weight: 5,
        impact_direction: 'neutral',
        supporting_value: { average_similarity: avgSimilarity, deal_count: count }
      }
    };
  }

  return { score: 0 };
}

/**
 * Analyze recent deal activity (deals in last 12 months)
 */
function analyzeRecentActivity(recentCount: number): { score: number; factor?: AnalysisFactor } {
  if (recentCount >= 2) {
    return {
      score: 10,
      factor: {
        name: 'very_recent_pattern',
        description: `${recentCount} similar deals in last 12 months indicates active current market`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { recent_deals_count: recentCount, period_months: 12 }
      }
    };
  }

  if (recentCount === 1) {
    return {
      score: 5,
      factor: {
        name: 'recent_pattern',
        description: '1 similar deal in last 12 months, recent acquisition activity',
        impact_weight: 5,
        impact_direction: 'positive',
        supporting_value: { recent_deals_count: 1, period_months: 12 }
      }
    };
  }

  return { score: 0 };
}
