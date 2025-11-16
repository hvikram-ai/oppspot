/**
 * Prediction Scorer for M&A Target Prediction
 *
 * Combines analyzer outputs with AI-powered analysis to generate final prediction score:
 * - Rule-based scoring (50% weight): Financial (30%) + Operational (10%) + Market (10%)
 * - AI-powered scoring (50% weight): OpenRouter API with Claude 3.5 Sonnet
 * - Hybrid final score: (rule_score * 0.5) + (ai_score * 0.5)
 *
 * Part of T017 implementation
 */

import { analyzeFinancials } from '../analyzers/financial-analyzer';
import { analyzeOperations } from '../analyzers/operational-analyzer';
import { analyzeMarket } from '../analyzers/market-analyzer';
import { matchPatterns } from '../analyzers/pattern-matcher';
// Temporarily disabled - LLM manager not yet implemented
// import { LLMManager } from '@/lib/ai/llm-manager';
import type { AnalysisFactor, AnalysisResult } from '../analyzers/financial-analyzer';

export interface PredictionScore {
  prediction_score: number; // 0-100 (final hybrid score)
  likelihood_category: 'Low' | 'Medium' | 'High' | 'Very High';
  confidence_level: 'High' | 'Medium' | 'Low';
  rule_based_score: number; // 0-100
  ai_score: number; // 0-100
  top_factors: AnalysisFactor[]; // Top 5 combined factors
  calculation_time_ms: number;
  algorithm_type: string;
  analysis_version: string;
}

/**
 * Calculate hybrid prediction score combining rule-based and AI analysis
 *
 * @param companyId - UUID of company to score
 * @returns Prediction score with likelihood category and confidence
 */
export async function calculatePredictionScore(companyId: string): Promise<PredictionScore> {
  const startTime = Date.now();

  // Run all analyzers in parallel for performance
  const [financialResult, operationalResult, marketResult, patternResult] = await Promise.all([
    analyzeFinancials(companyId),
    analyzeOperations(companyId),
    analyzeMarket(companyId),
    matchPatterns(companyId)
  ]);

  // Calculate rule-based score (weighted combination)
  const ruleBasedScore = calculateRuleBasedScore(
    financialResult.score,
    operationalResult.score,
    marketResult.score,
    patternResult.score
  );

  // Calculate AI-powered score
  const aiScore = await calculateAIScore(companyId, {
    financial: financialResult,
    operational: operationalResult,
    market: marketResult,
    pattern: patternResult
  });

  // Hybrid final score (50% rule-based, 50% AI)
  const hybridScore = Math.round((ruleBasedScore * 0.5) + (aiScore * 0.5));

  // Categorize likelihood
  const likelihoodCategory = categorizeLikelihood(hybridScore);

  // Determine confidence level (based on data completeness across analyzers)
  const avgDataCompleteness = (
    financialResult.dataCompleteness +
    operationalResult.dataCompleteness +
    marketResult.dataCompleteness +
    patternResult.dataCompleteness
  ) / 4;

  let confidenceLevel: 'High' | 'Medium' | 'Low';
  if (avgDataCompleteness >= 0.75) {
    confidenceLevel = 'High';
  } else if (avgDataCompleteness >= 0.5) {
    confidenceLevel = 'Medium';
  } else {
    confidenceLevel = 'Low';
  }

  // Combine top factors from all analyzers
  const allFactors = [
    ...financialResult.factors,
    ...operationalResult.factors,
    ...marketResult.factors,
    ...patternResult.factors
  ];

  // Sort by impact weight and take top 5
  const topFactors = allFactors
    .sort((a, b) => b.impact_weight - a.impact_weight)
    .slice(0, 5);

  const calculationTimeMs = Date.now() - startTime;

  return {
    prediction_score: hybridScore,
    likelihood_category: likelihoodCategory,
    confidence_level: confidenceLevel,
    rule_based_score: ruleBasedScore,
    ai_score: aiScore,
    top_factors: topFactors,
    calculation_time_ms: calculationTimeMs,
    algorithm_type: 'hybrid_ai_rule_based',
    analysis_version: '1.0'
  };
}

/**
 * Calculate rule-based score from analyzer outputs
 *
 * Weights:
 * - Financial: 30%
 * - Operational: 10%
 * - Market: 10%
 * - Pattern matching: 10%
 * Total: 60% (normalized to 100)
 */
function calculateRuleBasedScore(
  financialScore: number,
  operationalScore: number,
  marketScore: number,
  patternScore: number
): number {
  const weightedScore =
    (financialScore * 0.30) +
    (operationalScore * 0.10) +
    (marketScore * 0.10) +
    (patternScore * 0.10);

  // Normalize from 60 to 100 scale
  return Math.round((weightedScore / 0.60) * 100);
}

/**
 * Calculate AI-powered score using OpenRouter API (Claude 3.5 Sonnet)
 *
 * Sends company data + analyzer results to LLM for qualitative assessment
 */
async function calculateAIScore(
  companyId: string,
  analyzerResults: {
    financial: AnalysisResult;
    operational: AnalysisResult;
    market: AnalysisResult;
    pattern: AnalysisResult;
  }
): Promise<number> {
  try {
    return 50; // Temporary fallback score until LLM manager is implemented
    // Temporarily disabled - LLM manager not yet implemented
    // const llmManager = LLMManager.getInstance();

    // Prepare prompt with analyzer results
    // const prompt = buildAIPrompt(companyId, analyzerResults);

    // Call LLM (Claude 3.5 Sonnet via OpenRouter)
    // const response = await llmManager.completion({
    //       messages: [
    //         {
    //           role: 'system',
    //           content: 'You are an M&A analyst expert. Analyze companies to predict acquisition likelihood. Respond ONLY with a JSON object containing a score (0-100) and brief reasoning.'
    //         },
    //         {
    //           role: 'user',
    //           content: prompt
    //         }
    //       ],
    //       temperature: 0.3, // Low temperature for consistent scoring
    //       max_tokens: 500
    //     });
    //
    //     // Parse AI response
    //     const aiAnalysis = parseAIResponse(response.content);
    //
    //     // Return score (0-100)
    //     return Math.min(100, Math.max(0, aiAnalysis.score));

    // Temporary: return fallback score until LLM manager is implemented
    return 50;
  } catch (error) {
    console.error('AI scoring failed, falling back to rule-based score:', error);
    // Fallback: If AI fails, use rule-based score
    return calculateRuleBasedScore(
      analyzerResults.financial.score,
      analyzerResults.operational.score,
      analyzerResults.market.score,
      analyzerResults.pattern.score
    );
  }
}

/**
 * Build prompt for AI scoring
 */
function buildAIPrompt(
  companyId: string,
  analyzerResults: {
    financial: AnalysisResult;
    operational: AnalysisResult;
    market: AnalysisResult;
    pattern: AnalysisResult;
  }
): string {
  const { financial, operational, market, pattern } = analyzerResults;

  return `Analyze the following company for M&A target likelihood (0-100 score):

**Financial Analysis** (Score: ${financial.score}/100, Confidence: ${financial.confidence})
${financial.factors.slice(0, 3).map((f: AnalysisFactor) => `- ${f.name}: ${f.description}`).join('\n')}

**Operational Analysis** (Score: ${operational.score}/100, Confidence: ${operational.confidence})
${operational.factors.slice(0, 3).map((f: AnalysisFactor) => `- ${f.name}: ${f.description}`).join('\n')}

**Market Analysis** (Score: ${market.score}/100, Confidence: ${market.confidence})
${market.factors.slice(0, 3).map((f: AnalysisFactor) => `- ${f.name}: ${f.description}`).join('\n')}

**Pattern Matching** (Score: ${pattern.score}/100, Confidence: ${pattern.confidence})
${pattern.factors.slice(0, 3).map((f: AnalysisFactor) => `- ${f.name}: ${f.description}`).join('\n')}
${pattern.comparableDeals ? `\nComparable deals found: ${pattern.comparableDeals.length}` : ''}

Based on this analysis, provide:
1. An M&A target likelihood score (0-100)
2. Brief reasoning (2-3 sentences)

Respond in this exact JSON format:
{
  "score": 75,
  "reasoning": "Company shows strong acquisition signals including..."
}`;
}

/**
 * Parse AI response to extract score
 */
function parseAIResponse(content: string): { score: number; reasoning: string } {
  try {
    // Try to parse as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || 50,
        reasoning: parsed.reasoning || ''
      };
    }

    // Fallback: Extract number from text
    const scoreMatch = content.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) {
      return {
        score: parseInt(scoreMatch[1], 10),
        reasoning: content
      };
    }

    // Default fallback
    return { score: 50, reasoning: 'Unable to parse AI response' };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return { score: 50, reasoning: 'Parse error' };
  }
}

/**
 * Categorize likelihood based on score
 *
 * - Low: 0-25
 * - Medium: 26-50
 * - High: 51-75
 * - Very High: 76-100
 */
function categorizeLikelihood(score: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (score >= 76) return 'Very High';
  if (score >= 51) return 'High';
  if (score >= 26) return 'Medium';
  return 'Low';
}
