import type {
  FeatureMatrixEntry,
  FeatureParityScore,
  PricingComparison,
  CompetitiveMoatScore,
  IndustryRecognition,
} from './types';

/**
 * Scoring Engine for Competitive Analysis
 * Implements algorithms from research.md R3 (Feature Parity) and R4 (Moat Strength)
 */

export class ScoringEngine {
  /**
   * Calculate Feature Parity Score
   * Algorithm: (0.7 * overlap + 0.3 * differentiation) * 100
   *
   * @param targetFeatures - Features possessed by target company
   * @param competitorFeatures - Features possessed by competitor
   * @returns FeatureParityScore with overlap, differentiation, and final score
   */
  calculateFeatureParity(
    featureMatrix: FeatureMatrixEntry[],
    targetId: string,
    competitorId: string
  ): Omit<FeatureParityScore, 'id' | 'analysis_id' | 'last_calculated_at'> {
    // Filter features where target has it
    const targetFeatures = featureMatrix.filter(
      (entry) => entry.possessed_by[targetId] === true
    );

    if (targetFeatures.length === 0) {
      return {
        competitor_id: competitorId,
        parity_score: 0,
        overlap_score: 0,
        differentiation_score: 0,
        calculation_method: 'weighted_overlap_differentiation',
        confidence_level: 'low',
        feature_counts: {},
      };
    }

    // Calculate overlap: features in both target and competitor
    const overlapFeatures = targetFeatures.filter(
      (entry) => entry.possessed_by[competitorId] === true
    );

    // Calculate differentiation: features unique to target
    const uniqueTargetFeatures = targetFeatures.filter(
      (entry) => entry.possessed_by[competitorId] !== true
    );

    const overlapScore = (overlapFeatures.length / targetFeatures.length) * 100;
    const differentiationScore = (uniqueTargetFeatures.length / targetFeatures.length) * 100;

    // Parity score formula: 70% overlap + 30% differentiation
    const parityScore = 0.7 * overlapScore + 0.3 * differentiationScore;

    // Count features by category
    const featureCounts = this.countFeaturesByCategory(targetFeatures, competitorId);

    // Determine confidence level based on data completeness
    const confidence = this.determineConfidence(featureMatrix.length, targetFeatures.length);

    return {
      competitor_id: competitorId,
      parity_score: Math.round(parityScore * 100) / 100,
      overlap_score: Math.round(overlapScore * 100) / 100,
      differentiation_score: Math.round(differentiationScore * 100) / 100,
      calculation_method: 'weighted_overlap_differentiation',
      confidence_level: confidence,
      feature_counts: featureCounts,
    };
  }

  /**
   * Calculate Competitive Moat Score
   * Algorithm: Weighted average of 5 factors
   * - Feature Differentiation: 35%
   * - Pricing Power: 25%
   * - Brand Recognition: 20%
   * - Customer Lock-In: 10%
   * - Network Effects: 10%
   *
   * @param parityScores - Feature parity scores for all competitors
   * @param pricingComparisons - Pricing data for target and competitors
   * @param recognitions - Industry recognitions for target
   * @param competitorNames - Names of competitors (for platform threat detection)
   * @returns CompetitiveMoatScore with overall score and component scores
   */
  calculateMoatScore(
    analysisId: string,
    parityScores: FeatureParityScore[],
    pricingComparisons: PricingComparison[],
    recognitions: IndustryRecognition[] = [],
    targetPricing?: PricingComparison,
    competitorNames: string[] = []
  ): Omit<CompetitiveMoatScore, 'id' | 'last_calculated_at' | 'created_at'> {
    // 1. Feature Differentiation (35%) - Based on average parity score
    const avgParityScore =
      parityScores.length > 0
        ? parityScores.reduce((sum, score) => sum + score.parity_score, 0) / parityScores.length
        : 50;
    const featureDifferentiationScore = Math.max(0, 100 - avgParityScore);

    // 2. Pricing Power (25%) - Based on price premium vs competitors
    const pricingPowerScore = this.calculatePricingPower(targetPricing, pricingComparisons);

    // 3. Brand Recognition (20%) - Based on industry recognitions
    const brandRecognitionScore = this.calculateBrandRecognition(recognitions);

    // 4. Customer Lock-In (10%) - Placeholder (would need contract data)
    const customerLockInScore = 50; // Default to neutral

    // 5. Network Effects (10%) - Placeholder (would need user base data)
    const networkEffectsScore = 50; // Default to neutral

    // Calculate weighted moat score
    const moatScore =
      0.35 * featureDifferentiationScore +
      0.25 * pricingPowerScore +
      0.20 * brandRecognitionScore +
      0.10 * customerLockInScore +
      0.10 * networkEffectsScore;

    // Identify risk factors (including platform threats)
    const riskFactors = this.identifyRiskFactors(
      featureDifferentiationScore,
      pricingPowerScore,
      avgParityScore,
      competitorNames
    );

    return {
      analysis_id: analysisId,
      moat_score: Math.round(moatScore * 100) / 100,
      feature_differentiation_score: Math.round(featureDifferentiationScore * 100) / 100,
      pricing_power_score: Math.round(pricingPowerScore * 100) / 100,
      brand_recognition_score: Math.round(brandRecognitionScore * 100) / 100,
      customer_lock_in_score: Math.round(customerLockInScore * 100) / 100,
      network_effects_score: Math.round(networkEffectsScore * 100) / 100,
      supporting_evidence: {
        avg_parity_score: Math.round(avgParityScore * 100) / 100,
        competitor_count: parityScores.length,
        recognition_count: recognitions.length,
      },
      risk_factors: riskFactors,
    };
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  /**
   * Count features by category for reporting
   */
  private countFeaturesByCategory(
    features: FeatureMatrixEntry[],
    competitorId: string
  ): Record<string, number> {
    const counts: Record<string, number> = {};

    features.forEach((feature) => {
      const category = feature.feature_category;
      if (!counts[category]) {
        counts[category] = 0;
      }
      if (feature.possessed_by[competitorId] === true) {
        counts[category]++;
      }
    });

    return counts;
  }

  /**
   * Determine confidence level based on data completeness
   */
  private determineConfidence(totalFeatures: number, targetFeatures: number): 'high' | 'medium' | 'low' {
    if (totalFeatures >= 50 && targetFeatures >= 20) return 'high';
    if (totalFeatures >= 20 && targetFeatures >= 10) return 'medium';
    return 'low';
  }

  /**
   * Calculate pricing power score
   * Formula: Normalize price premium (-50% to +100%) to 0-100 score
   */
  private calculatePricingPower(
    targetPricing: PricingComparison | undefined,
    competitorPricing: PricingComparison[]
  ): number {
    if (!targetPricing || !targetPricing.representative_price || competitorPricing.length === 0) {
      return 50; // Default to neutral if no pricing data
    }

    // Calculate median competitor price
    const competitorPrices = competitorPricing
      .map((p) => p.representative_price)
      .filter((price): price is number => price !== null && price !== undefined)
      .sort((a, b) => a - b);

    if (competitorPrices.length === 0) {
      return 50;
    }

    const medianPrice =
      competitorPrices.length % 2 === 0
        ? (competitorPrices[competitorPrices.length / 2 - 1] +
            competitorPrices[competitorPrices.length / 2]) /
          2
        : competitorPrices[Math.floor(competitorPrices.length / 2)];

    // Calculate price premium percentage
    const pricePremium = ((targetPricing.representative_price - medianPrice) / medianPrice) * 100;

    // Normalize to 0-100 scale
    // -50% to +100% maps to 0-100 score
    // 0% (parity) maps to 50
    // +100% (double price) maps to 100
    // -50% (half price) maps to 0
    const normalized = Math.max(0, Math.min(100, 50 + pricePremium / 2));

    return normalized;
  }

  /**
   * Calculate brand recognition score
   * Based on:
   * - G2 ratings (40%)
   * - Gartner mentions (30%)
   * - Awards (20%)
   * - Review volume (10%)
   */
  private calculateBrandRecognition(recognitions: IndustryRecognition[]): number {
    if (recognitions.length === 0) return 30; // Default low score if no recognitions

    // Count by source type
    const gartnerMentions = recognitions.filter((r) =>
      r.source?.toLowerCase().includes('gartner')
    ).length;
    const g2Mentions = recognitions.filter((r) => r.source?.toLowerCase().includes('g2')).length;
    const awards = recognitions.filter((r) => r.recognition_type?.toLowerCase().includes('award'))
      .length;

    // Calculate component scores
    const gartnerScore = Math.min(100, (gartnerMentions / 10) * 100);
    const g2Score = Math.min(100, (g2Mentions / 5) * 100);
    const awardScore = Math.min(100, (awards / 5) * 100);
    const volumeScore = Math.min(100, (recognitions.length / 20) * 100);

    // Weighted average
    const score = 0.3 * gartnerScore + 0.4 * g2Score + 0.2 * awardScore + 0.1 * volumeScore;

    return Math.round(score * 100) / 100;
  }

  /**
   * Identify risk factors based on scores
   * Enhanced to detect platform threats (Microsoft, Miro, Google, etc.)
   */
  private identifyRiskFactors(
    featureDifferentiation: number,
    pricingPower: number,
    avgParityScore: number,
    competitorNames?: string[]
  ): string[] {
    const risks: string[] = [];

    // Platform threat detection
    const platformCompetitors = this.detectPlatformThreats(competitorNames || []);
    if (platformCompetitors.length > 0) {
      const platformNames = platformCompetitors.join(', ');
      risks.push(`⚠️ Platform Threat: Competing with ${platformNames} - High distribution/ecosystem risk`);

      // Add specific platform risk analysis
      if (featureDifferentiation < 40 && platformCompetitors.length > 0) {
        risks.push('🔴 Critical: Low differentiation against platform players - High acquisition/displacement risk');
      }
    }

    // Feature parity risks
    if (avgParityScore > 85) {
      risks.push('High feature parity - Commodity risk');
    }

    if (featureDifferentiation < 20) {
      risks.push('Low feature differentiation - Weak competitive position');
    } else if (featureDifferentiation < 40) {
      risks.push('Moderate feature differentiation - Risk of feature parity over time');
    }

    // Pricing risks
    if (pricingPower < 40) {
      risks.push('Limited pricing power - May indicate weak brand or value prop');
    }

    if (pricingPower > 80) {
      risks.push('High price premium - May limit market expansion');
    }

    // Combined risk analysis
    if (avgParityScore > 75 && featureDifferentiation < 30) {
      risks.push('🔴 High vulnerability: High parity + low differentiation = weak moat');
    }

    return risks;
  }

  /**
   * Detect if competing against major platform companies
   * These companies have massive distribution, ecosystem lock-in, and resources
   */
  private detectPlatformThreats(competitorNames: string[]): string[] {
    const platforms = [
      { name: 'Microsoft', aliases: ['microsoft', 'msft', 'office', 'teams', 'azure', 'power platform'] },
      { name: 'Miro', aliases: ['miro', 'realtimeboard'] },
      { name: 'Google', aliases: ['google', 'workspace', 'gcp', 'alphabet'] },
      { name: 'Atlassian', aliases: ['atlassian', 'jira', 'confluence', 'trello'] },
      { name: 'Salesforce', aliases: ['salesforce', 'slack'] },
      { name: 'Notion', aliases: ['notion'] },
      { name: 'Airtable', aliases: ['airtable'] },
      { name: 'Figma', aliases: ['figma', 'figjam'] },
      { name: 'Adobe', aliases: ['adobe'] },
      { name: 'SAP', aliases: ['sap'] },
    ];

    const detectedPlatforms: string[] = [];
    const normalizedCompetitors = competitorNames.map(n => n.toLowerCase());

    for (const platform of platforms) {
      const isPresent = normalizedCompetitors.some(competitor =>
        platform.aliases.some(alias => competitor.includes(alias))
      );

      if (isPresent && !detectedPlatforms.includes(platform.name)) {
        detectedPlatforms.push(platform.name);
      }
    }

    return detectedPlatforms;
  }

  /**
   * Calculate confidence level for moat score
   */
  calculateMoatConfidence(
    parityScoreCount: number,
    pricingDataCount: number,
    recognitionCount: number
  ): 'high' | 'medium' | 'low' {
    const dataCompleteness =
      (parityScoreCount > 3 ? 1 : 0) +
      (pricingDataCount > 2 ? 1 : 0) +
      (recognitionCount > 0 ? 1 : 0);

    if (dataCompleteness >= 2) return 'high';
    if (dataCompleteness === 1) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const scoringEngine = new ScoringEngine();
