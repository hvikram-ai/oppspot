/**
 * M&A Prediction Service
 *
 * Main orchestrator that coordinates all M&A prediction components:
 * 1. Runs all analyzers in parallel (financial, operational, market, pattern)
 * 2. Calculates prediction score (hybrid AI + rule-based)
 * 3. Calculates confidence level
 * 4. Generates valuation (if Medium+ likelihood)
 * 5. Generates acquirer profiles (if High+ likelihood)
 * 6. Saves results via repository
 * 7. Returns complete MAPredictionDetail
 *
 * Part of T022 implementation
 */

import { calculatePredictionScore } from './scoring/prediction-scorer';
import { calculateConfidence } from './scoring/confidence-calculator';
import { estimateValuation } from './valuation/valuation-estimator';
import { generateAcquirerProfiles } from './analyzers/acquirer-profiler';
import { savePrediction, getActivePrediction, logAuditTrail } from './repository/prediction-repository';
import type { MAPredictionDetail } from '@/lib/types/ma-prediction';

/**
 * Generate complete M&A prediction for a company
 *
 * This is the main entry point for generating predictions.
 * Coordinates all analysis components and saves to database.
 *
 * @param companyId - UUID of company to analyze
 * @returns Complete prediction with factors, valuation, acquirer profiles
 * @throws Error if insufficient data or processing fails
 */
export async function generatePrediction(companyId: string): Promise<MAPredictionDetail> {
  const startTime = Date.now();

  try {
    // Step 1: Calculate prediction score (runs all analyzers + AI)
    const scoreResult = await calculatePredictionScore(companyId);

    // Step 2: Calculate confidence level (data quality assessment)
    const confidenceResult = await calculateConfidence(companyId);

    // Override confidence if data quality is poor
    let finalConfidence = scoreResult.confidence_level;
    if (confidenceResult.confidence_level === 'Low') {
      finalConfidence = 'Low';
    } else if (confidenceResult.confidence_level === 'Medium' && finalConfidence === 'High') {
      finalConfidence = 'Medium';
    }

    // Check minimum data threshold (FR-024)
    if (confidenceResult.years_of_history < 1 || confidenceResult.data_completeness < 0.4) {
      throw new Error(`Insufficient data to generate prediction. Requires at least 1 year of history and 40% data completeness. Current: ${confidenceResult.years_of_history.toFixed(1)} years, ${Math.round(confidenceResult.data_completeness * 100)}% complete.`);
    }

    // Step 3: Generate valuation (if Medium+ likelihood)
    let valuation = null;
    if (scoreResult.prediction_score >= 26) {
      try {
        valuation = await estimateValuation(companyId, scoreResult.prediction_score);
      } catch (error) {
        console.error('Valuation estimation failed:', error);
        // Non-fatal - continue without valuation
      }
    }

    // Step 4: Generate acquirer profiles (if High+ likelihood)
    let acquirerProfiles: any[] = [];
    if (scoreResult.prediction_score >= 51) {
      try {
        acquirerProfiles = await generateAcquirerProfiles(companyId, scoreResult.prediction_score);
      } catch (error) {
        console.error('Acquirer profiling failed:', error);
        // Non-fatal - continue without acquirer profiles
      }
    }

    // Step 5: Prepare prediction data
    const predictionData = {
      company_id: companyId,
      prediction_score: scoreResult.prediction_score,
      likelihood_category: scoreResult.likelihood_category,
      confidence_level: finalConfidence,
      analysis_version: scoreResult.analysis_version,
      algorithm_type: scoreResult.algorithm_type,
      data_last_refreshed: new Date().toISOString(),
      calculation_time_ms: scoreResult.calculation_time_ms
    };

    // Step 6: Prepare factors (top 5)
    const factors = scoreResult.top_factors.slice(0, 5).map((factor, index) => ({
      rank: index + 1,
      factor_type: inferFactorType(factor.name),
      factor_name: factor.name,
      factor_description: factor.description,
      impact_weight: factor.impact_weight,
      impact_direction: factor.impact_direction,
      supporting_value: factor.supporting_value || {}
    }));

    // Step 7: Prepare valuation data
    const valuationData = valuation ? {
      min_valuation_gbp: valuation.min_valuation_gbp,
      max_valuation_gbp: valuation.max_valuation_gbp,
      currency: valuation.currency,
      valuation_method: valuation.valuation_method,
      confidence_level: valuation.confidence_level,
      key_assumptions: valuation.key_assumptions
    } : null;

    // Step 8: Prepare acquirer profile data
    const acquirerProfilesData = acquirerProfiles.map(profile => ({
      rank: profile.rank,
      potential_acquirer_id: profile.potential_acquirer_id,
      industry_match: profile.industry_match,
      size_ratio_description: profile.size_ratio_description,
      geographic_proximity: profile.geographic_proximity,
      strategic_rationale: profile.strategic_rationale,
      strategic_rationale_description: profile.strategic_rationale_description,
      match_score: profile.match_score
    }));

    // Step 9: Save to database
    const savedPrediction = await savePrediction(
      predictionData,
      factors,
      valuationData,
      acquirerProfilesData
    );

    // Step 10: Log completion
    const totalTime = Date.now() - startTime;
    await logAuditTrail(savedPrediction.id, 'prediction_completed', {
      company_id: companyId,
      prediction_score: scoreResult.prediction_score,
      total_time_ms: totalTime,
      has_valuation: !!valuation,
      has_acquirer_profiles: acquirerProfiles.length > 0
    });

    return savedPrediction;
  } catch (error) {
    // Log failure
    await logAuditTrail(null, 'prediction_failed', {
      company_id: companyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      total_time_ms: Date.now() - startTime
    });

    throw error;
  }
}

/**
 * Retrieve existing prediction for a company
 *
 * @param companyId - UUID of company
 * @returns Active prediction or throws if not found
 */
export async function getPrediction(companyId: string): Promise<MAPredictionDetail> {
  return await getActivePrediction(companyId);
}

/**
 * Infer factor type from factor name
 * Helper to categorize factors as financial, operational, market, or historical
 */
function inferFactorType(factorName: string): 'financial' | 'operational' | 'market' | 'historical' {
  const name = factorName.toLowerCase();

  // Financial factors
  if (name.includes('revenue') || name.includes('profit') || name.includes('accounts') ||
      name.includes('financial') || name.includes('cash') || name.includes('debt')) {
    return 'financial';
  }

  // Operational factors
  if (name.includes('employee') || name.includes('team') || name.includes('filing') ||
      name.includes('status') || name.includes('operational') || name.includes('director')) {
    return 'operational';
  }

  // Historical/pattern factors
  if (name.includes('pattern') || name.includes('deal') || name.includes('comparable') ||
      name.includes('historical') || name.includes('similar') || name.includes('precedent')) {
    return 'historical';
  }

  // Market factors
  if (name.includes('industry') || name.includes('sector') || name.includes('market') ||
      name.includes('consolidation') || name.includes('region') || name.includes('geographic') ||
      name.includes('age') || name.includes('mature') || name.includes('young')) {
    return 'market';
  }

  // Default to market
  return 'market';
}
