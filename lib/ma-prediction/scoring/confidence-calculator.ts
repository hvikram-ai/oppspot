/**
 * Confidence Calculator for M&A Predictions
 *
 * Assesses data quality and completeness to determine prediction confidence:
 * - Years of financial history available
 * - Required fields present
 * - Data recency (how old is the latest data)
 * - Data consistency (no anomalies or gaps)
 *
 * Part of T018 implementation
 */

import { createClient } from '@/lib/supabase/server';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface ConfidenceAssessment {
  confidence_level: ConfidenceLevel;
  confidence_score: number; // 0-100
  data_completeness: number; // 0-1
  data_recency_days: number;
  years_of_history: number;
  missing_fields: string[];
  quality_factors: QualityFactor[];
}

export interface QualityFactor {
  factor: string;
  status: 'excellent' | 'good' | 'poor';
  description: string;
}

/**
 * Calculate confidence level for an M&A prediction
 *
 * High confidence requirements:
 * - 2+ years of financial history
 * - All required fields present (revenue, profitability, employees)
 * - Data < 12 months old
 *
 * Medium confidence:
 * - 1-2 years of history OR partial data
 * - Data 12-24 months old
 *
 * Low confidence:
 * - <1 year of history
 * - Missing critical fields
 * - Data >24 months old
 *
 * @param companyId - UUID of company to assess
 * @returns Confidence assessment with level and supporting factors
 */
export async function calculateConfidence(companyId: string): Promise<ConfidenceAssessment> {
  const supabase = await createClient();

  // Fetch company data
  const { data: company, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const qualityFactors: QualityFactor[] = [];
  const missingFields: string[] = [];

  // Check required fields
  const requiredFields = [
    { key: 'revenue', name: 'Revenue' },
    { key: 'profitability', name: 'Profitability' },
    { key: 'employees', name: 'Employee count' },
    { key: 'incorporation_date', name: 'Incorporation date' },
    { key: 'sic_code', name: 'SIC code' },
    { key: 'last_accounts_date', name: 'Last accounts date' }
  ];

  let presentCount = 0;
  for (const field of requiredFields) {
    if (company[field.key] !== null && company[field.key] !== undefined) {
      presentCount++;
    } else {
      missingFields.push(field.name);
    }
  }

  const dataCompleteness = presentCount / requiredFields.length;

  // Factor 1: Data Completeness
  if (dataCompleteness >= 0.9) {
    qualityFactors.push({
      factor: 'data_completeness',
      status: 'excellent',
      description: `${Math.round(dataCompleteness * 100)}% of required fields present`
    });
  } else if (dataCompleteness >= 0.7) {
    qualityFactors.push({
      factor: 'data_completeness',
      status: 'good',
      description: `${Math.round(dataCompleteness * 100)}% of required fields present, some gaps`
    });
  } else {
    qualityFactors.push({
      factor: 'data_completeness',
      status: 'poor',
      description: `Only ${Math.round(dataCompleteness * 100)}% of required fields present, significant gaps`
    });
  }

  // Factor 2: Data Recency
  let dataRecencyDays = 0;
  if (company.last_accounts_date) {
    const lastAccountsDate = new Date(company.last_accounts_date);
    const now = new Date();
    dataRecencyDays = Math.floor((now.getTime() - lastAccountsDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dataRecencyDays <= 365) {
      qualityFactors.push({
        factor: 'data_recency',
        status: 'excellent',
        description: `Financial data from ${Math.round(dataRecencyDays / 30)} months ago, very recent`
      });
    } else if (dataRecencyDays <= 730) {
      qualityFactors.push({
        factor: 'data_recency',
        status: 'good',
        description: `Financial data from ${Math.round(dataRecencyDays / 30)} months ago, moderately recent`
      });
    } else {
      qualityFactors.push({
        factor: 'data_recency',
        status: 'poor',
        description: `Financial data from ${Math.round(dataRecencyDays / 365)} years ago, stale data reduces confidence`
      });
    }
  } else {
    dataRecencyDays = 9999; // Unknown/very old
    qualityFactors.push({
      factor: 'data_recency',
      status: 'poor',
      description: 'No accounts date available, cannot assess data freshness'
    });
  }

  // Factor 3: Company Age (proxy for data history availability)
  let yearsOfHistory = 0;
  if (company.incorporation_date) {
    const incDate = new Date(company.incorporation_date);
    const now = new Date();
    const companyAge = (now.getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Assume years of history = min(company age, 5 years max useful history)
    yearsOfHistory = Math.min(companyAge, 5);

    if (yearsOfHistory >= 2) {
      qualityFactors.push({
        factor: 'historical_data',
        status: 'excellent',
        description: `${yearsOfHistory.toFixed(1)} years of company history available`
      });
    } else if (yearsOfHistory >= 1) {
      qualityFactors.push({
        factor: 'historical_data',
        status: 'good',
        description: `${yearsOfHistory.toFixed(1)} years of company history, limited but usable`
      });
    } else {
      qualityFactors.push({
        factor: 'historical_data',
        status: 'poor',
        description: `Only ${yearsOfHistory.toFixed(1)} years of company history, very limited data`
      });
    }
  } else {
    qualityFactors.push({
      factor: 'historical_data',
      status: 'poor',
      description: 'No incorporation date, cannot assess historical data availability'
    });
  }

  // Factor 4: Financial Data Quality
  if (company.revenue && company.profitability) {
    const profitMargin = company.revenue > 0 ? (company.profitability / company.revenue) : 0;

    // Sanity check: profit margin should be reasonable (-100% to +100%)
    if (profitMargin >= -1 && profitMargin <= 1) {
      qualityFactors.push({
        factor: 'financial_consistency',
        status: 'excellent',
        description: 'Financial metrics appear consistent and realistic'
      });
    } else {
      qualityFactors.push({
        factor: 'financial_consistency',
        status: 'poor',
        description: 'Financial metrics show anomalies, may indicate data quality issues'
      });
    }
  }

  // Calculate overall confidence score (0-100)
  let confidenceScore = 0;

  // Data completeness (40 points max)
  confidenceScore += dataCompleteness * 40;

  // Data recency (30 points max)
  if (dataRecencyDays <= 365) {
    confidenceScore += 30;
  } else if (dataRecencyDays <= 730) {
    confidenceScore += 20;
  } else if (dataRecencyDays <= 1095) {
    confidenceScore += 10;
  }

  // Historical data (30 points max)
  if (yearsOfHistory >= 2) {
    confidenceScore += 30;
  } else if (yearsOfHistory >= 1) {
    confidenceScore += 20;
  } else if (yearsOfHistory >= 0.5) {
    confidenceScore += 10;
  }

  confidenceScore = Math.min(100, Math.round(confidenceScore));

  // Determine confidence level
  let confidenceLevel: ConfidenceLevel;
  if (confidenceScore >= 75 && dataCompleteness >= 0.8 && yearsOfHistory >= 2 && dataRecencyDays <= 365) {
    confidenceLevel = 'High';
  } else if (confidenceScore >= 50 && dataCompleteness >= 0.6) {
    confidenceLevel = 'Medium';
  } else {
    confidenceLevel = 'Low';
  }

  return {
    confidence_level: confidenceLevel,
    confidence_score: confidenceScore,
    data_completeness: dataCompleteness,
    data_recency_days: dataRecencyDays,
    years_of_history: yearsOfHistory,
    missing_fields: missingFields,
    quality_factors: qualityFactors
  };
}
