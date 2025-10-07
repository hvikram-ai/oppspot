/**
 * Predictive Lead Scoring Engine
 * AI-powered scoring with deal probability, timing predictions, and actionable insights
 */

import { createClient } from '@/lib/supabase/server';
import { OpenRouterService } from '@/lib/ai/openrouter';

export interface PredictiveLeadScore {
  company_id: string;
  company_name: string;

  // Core predictions
  overall_score: number;
  deal_probability: number;
  conversion_likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  optimal_engagement_timing: TimingRecommendation;

  // Financial predictions
  estimated_deal_size: number;
  estimated_close_date: Date;

  // Component analysis
  scores: {
    buying_signals: number;
    financial_health: number;
    technology_fit: number;
    engagement: number;
    stakeholder: number;
    market_timing: number;
  };

  // AI insights
  insights: {
    key_strengths: string[];
    risk_factors: string[];
    recommended_actions: ActionRecommendation[];
    competitive_position: CompetitivePosition;
  };

  // Success predictors
  predictors: {
    success_indicators: SuccessIndicator[];
    failure_warnings: WarningSign[];
    critical_requirements_met: boolean;
  };

  // Metadata
  metadata: {
    model_confidence: number;
    data_completeness: number;
    scoring_method: string;
    calculated_at: Date;
  };
}

export type TimingRecommendation =
  | 'immediate'
  | 'within_24h'
  | 'within_week'
  | '1_3_months'
  | '3_6_months'
  | '6_12_months'
  | 'not_ready';

export type CompetitivePosition =
  | 'sole_vendor'
  | 'preferred'
  | 'competing'
  | 'outsider'
  | 'unknown';

export interface ActionRecommendation {
  type: 'outreach' | 'content' | 'demo' | 'proposal' | 'nurture' | 'event';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  expected_impact: string;
  success_probability: number;
}

export interface SuccessIndicator {
  indicator: string;
  strength: 'strong' | 'moderate' | 'weak';
  impact: number;
}

export interface WarningSign {
  warning: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string;
}

export class PredictiveLeadScorer {
  private openRouter: OpenRouterService;

  constructor() {
    this.openRouter = new OpenRouterService(process.env.OPENROUTER_API_KEY || '');
  }

  /**
   * Calculate comprehensive predictive lead score
   */
  async calculatePredictiveScore(
    companyId: string,
    options: {
      includeRecommendations?: boolean;
      useAI?: boolean;
      orgId?: string;
    } = {}
  ): Promise<PredictiveLeadScore> {
    const supabase = await createClient();

    // Fetch all relevant data in parallel
    const [
      companyData,
      buyingSignals,
      stakeholders,
      engagementHistory,
      competitorData
    ] = await Promise.all([
      this.fetchCompanyData(companyId),
      this.fetchBuyingSignals(companyId),
      this.fetchStakeholders(companyId),
      this.fetchEngagementHistory(companyId),
      this.fetchCompetitorData(companyId)
    ]);

    // Calculate component scores
    const scores = {
      buying_signals: await this.scoreBuyingSignals(buyingSignals as any),
      financial_health: await this.scoreFinancialHealth(companyData),
      technology_fit: await this.scoreTechnologyFit(companyData),
      engagement: await this.scoreEngagement(engagementHistory as any),
      stakeholder: await this.scoreStakeholders(stakeholders),
      market_timing: await this.scoreMarketTiming(companyData, buyingSignals as any)
    };

    // Calculate overall score with weighted average
    const weights = {
      buying_signals: 0.25,
      financial_health: 0.20,
      technology_fit: 0.15,
      engagement: 0.15,
      stakeholder: 0.15,
      market_timing: 0.10
    };

    const overall_score = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);

    // Use AI for advanced predictions if enabled
    let aiPredictions = null;
    if (options.useAI !== false) {
      aiPredictions = await this.getAIPredictions({
        companyData,
        buyingSignals,
        stakeholders,
        scores,
        overall_score
      });
    }

    // Calculate deal probability
    const deal_probability = this.calculateDealProbability(
      overall_score,
      scores,
      buyingSignals as any,
      stakeholders,
      aiPredictions || {}
    );

    // Determine optimal timing
    const optimal_engagement_timing = this.determineOptimalTiming(
      buyingSignals as any,
      scores,
      aiPredictions || {}
    );

    // Generate insights and recommendations
    const insights = await this.generateInsights(
      companyData,
      scores,
      buyingSignals as any,
      stakeholders,
      competitorData,
      aiPredictions || {}
    );

    // Identify success predictors and warnings
    const predictors = this.identifyPredictors(
      scores,
      buyingSignals as any,
      stakeholders,
      engagementHistory as any
    );

    // Estimate deal size and close date
    const estimated_deal_size = this.estimateDealSize(companyData, scores);
    const estimated_close_date = this.estimateCloseDate(optimal_engagement_timing);

    // Prepare the complete score object
    const predictiveScore: PredictiveLeadScore = {
      company_id: companyId,
      company_name: (companyData as any).name || 'Unknown',
      overall_score: Math.round(overall_score),
      deal_probability,
      conversion_likelihood: this.getConversionLikelihood(deal_probability),
      optimal_engagement_timing,
      estimated_deal_size,
      estimated_close_date,
      scores,
      insights: insights as any,
      predictors: predictors as any,
      metadata: {
        model_confidence: this.calculateConfidence(companyData, buyingSignals, stakeholders),
        data_completeness: this.calculateDataCompleteness(companyData, buyingSignals, stakeholders),
        scoring_method: options.useAI !== false ? 'ai_enhanced' : 'rule_based',
        calculated_at: new Date()
      }
    };

    // Save to database
    await this.savePredictiveScore(predictiveScore, options.orgId);

    return predictiveScore;
  }

  /**
   * Get AI predictions using OpenRouter
   */
  private async getAIPredictions(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const companyData = data.companyData as any;
    const scores = data.scores as any;
    const buyingSignals = data.buyingSignals as any;
    const stakeholders = data.stakeholders as any;

    const prompt = `
      Analyze this B2B lead data and provide predictive insights:

      Company: ${companyData?.name || 'Unknown'}
      Industry: ${companyData?.industry || 'Unknown'}
      Size: ${companyData?.employee_count_min || 'N/A'}-${companyData?.employee_count_max || 'N/A'} employees

      Scores:
      - Buying Signals: ${scores?.buying_signals || 0}/100
      - Financial Health: ${scores?.financial_health || 0}/100
      - Technology Fit: ${scores?.technology_fit || 0}/100
      - Engagement: ${scores?.engagement || 0}/100
      - Stakeholder: ${scores?.stakeholder || 0}/100

      Recent Buying Signals (last 30 days): ${buyingSignals?.length || 0}
      Key Stakeholders Identified: ${stakeholders?.length || 0}

      Provide:
      1. Deal probability percentage (0-100)
      2. Key strengths (3-5 bullet points)
      3. Risk factors (3-5 bullet points)
      4. Recommended next actions (3 specific actions)
      5. Competitive positioning assessment
      6. Optimal engagement timing

      Format as JSON.
    `;

    try {
      const response = await this.openRouter.complete(prompt, {
        model: 'anthropic/claude-3-haiku-20240307',
        temperature: 0.3,
        max_tokens: 1000
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('AI prediction error:', error);
      return {};
    }
  }

  /**
   * Calculate deal probability based on multiple factors
   */
  private calculateDealProbability(
    overallScore: number,
    scores: Record<string, number>,
    buyingSignals: Array<{ signal_strength: number; detected_at: string }>,
    stakeholders: Array<Record<string, unknown>>,
    aiPredictions: Record<string, unknown>
  ): number {
    let probability = overallScore * 0.8; // Base from overall score

    // Boost for strong buying signals
    const recentStrongSignals = buyingSignals.filter(s =>
      s.signal_strength >= 80 &&
      new Date(s.detected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (recentStrongSignals.length > 3) probability += 15;
    else if (recentStrongSignals.length > 1) probability += 8;

    // Boost for champion stakeholder
    const hasChampion = stakeholders.some((s: any) => s.role_type === 'champion');
    if (hasChampion) probability += 10;

    // Boost for decision maker engagement
    const hasEngagedDecisionMaker = stakeholders.some((s: any) =>
      s.decision_authority && s.engagement_score > 50
    );
    if (hasEngagedDecisionMaker) probability += 12;

    // AI adjustment if available
    if (aiPredictions?.deal_probability && typeof (aiPredictions as any).deal_probability === 'number') {
      probability = (probability + (aiPredictions as any).deal_probability) / 2;
    }

    return Math.min(100, Math.max(0, probability));
  }

  /**
   * Determine optimal timing for engagement
   */
  private determineOptimalTiming(
    buyingSignals: Array<{ signal_type: string; signal_strength: number; detected_at: string }>,
    scores: Record<string, number>,
    aiPredictions: Record<string, unknown>
  ): TimingRecommendation {
    // Check for urgent signals
    const urgentSignals = buyingSignals.filter(s =>
      s.signal_type === 'budget_allocated' ||
      s.signal_type === 'rfp_issued' ||
      s.signal_type === 'competitor_issues'
    );

    if (urgentSignals.length > 0) return 'immediate';

    // Check buying signal recency and strength
    const recentStrongSignals = buyingSignals.filter(s =>
      s.signal_strength >= 70 &&
      new Date(s.detected_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentStrongSignals.length >= 2) return 'within_24h';
    if (recentStrongSignals.length >= 1) return 'within_week';

    // Check overall readiness
    if (scores.buying_signals >= 70 && scores.stakeholder >= 60) {
      return '1_3_months';
    }

    if (scores.buying_signals >= 50 || scores.engagement >= 40) {
      return '3_6_months';
    }

    if (scores.financial_health >= 60) {
      return '6_12_months';
    }

    return 'not_ready';
  }

  /**
   * Generate actionable insights
   */
  private async generateInsights(
    companyData: Record<string, unknown>,
    scores: Record<string, number>,
    buyingSignals: Array<{ signal_type?: string; signal_strength: number; detected_at: string }>,
    stakeholders: Array<{ role_type?: string; champion_score?: number; decision_authority?: boolean; engagement_score?: number }>,
    competitorData: Record<string, unknown>,
    aiPredictions: Record<string, unknown>
  ): Promise<{
    key_strengths: string[];
    risk_factors: string[];
    recommended_actions: Array<{
      type: string;
      priority: string;
      action: string;
      reason: string;
      expected_impact: string;
      success_probability: number;
    }>;
    competitive_position: CompetitivePosition;
  }> {
    const insights = {
      key_strengths: [] as string[],
      risk_factors: [] as string[],
      recommended_actions: [] as Array<{
        type: string;
        priority: string;
        action: string;
        reason: string;
        expected_impact: string;
        success_probability: number;
      }>,
      competitive_position: 'unknown' as CompetitivePosition
    };

    // Identify strengths
    if (scores.buying_signals >= 80) {
      insights.key_strengths.push('Strong buying signals indicate active interest');
    }
    if (scores.financial_health >= 80) {
      insights.key_strengths.push('Excellent financial health ensures budget availability');
    }
    if (stakeholders.some((s: any) => s.role_type === 'champion' && s.champion_score >= 70)) {
      insights.key_strengths.push('Internal champion actively supporting');
    }

    // Identify risks
    if (scores.engagement < 30) {
      insights.risk_factors.push('Low engagement requires immediate attention');
    }
    if (stakeholders.some((s: any) => s.role_type === 'detractor')) {
      insights.risk_factors.push('Active detractor may block progress');
    }
    if (!stakeholders.some((s: any) => s.decision_authority)) {
      insights.risk_factors.push('No decision maker identified yet');
    }

    // Generate recommendations
    if (scores.buying_signals >= 70) {
      insights.recommended_actions.push({
        type: 'demo',
        priority: 'high',
        action: 'Schedule product demonstration',
        reason: 'High buying intent detected',
        expected_impact: 'Accelerate decision process',
        success_probability: 75
      });
    }

    if (scores.stakeholder < 50) {
      insights.recommended_actions.push({
        type: 'outreach',
        priority: 'critical',
        action: 'Map and engage key stakeholders',
        reason: 'Limited stakeholder coverage',
        expected_impact: 'Improve decision influence',
        success_probability: 60
      });
    }

    // Merge with AI predictions if available
    if (aiPredictions) {
      if (Array.isArray((aiPredictions as any).key_strengths)) {
        insights.key_strengths.push(...(aiPredictions as any).key_strengths);
      }
      if ((aiPredictions as any).competitive_position) {
        insights.competitive_position = (aiPredictions as any).competitive_position as CompetitivePosition;
      }
    }

    return insights;
  }

  /**
   * Identify success predictors and warning signs
   */
  private identifyPredictors(
    scores: Record<string, number>,
    buyingSignals: Array<{ signal_strength: number }>,
    stakeholders: Array<{ role_type?: string; engagement_score?: number; decision_authority?: boolean }>,
    engagementHistory: Array<Record<string, unknown>>
  ): {
    success_indicators: Array<{ indicator: string; strength: string; impact: number }>;
    failure_warnings: Array<{ warning: string; severity: string; mitigation: string }>;
    critical_requirements_met: boolean;
  } {
    const predictors = {
      success_indicators: [] as Array<{ indicator: string; strength: string; impact: number }>,
      failure_warnings: [] as Array<{ warning: string; severity: string; mitigation: string }>,
      critical_requirements_met: false
    };

    // Success indicators
    if (buyingSignals.filter(s => s.signal_strength >= 70).length >= 3) {
      predictors.success_indicators.push({
        indicator: 'Multiple strong buying signals detected',
        strength: 'strong',
        impact: 25
      });
    }

    if (stakeholders.some((s: any) => s.role_type === 'champion' && s.engagement_score >= 70)) {
      predictors.success_indicators.push({
        indicator: 'Engaged champion advocate',
        strength: 'strong',
        impact: 20
      });
    }

    // Warning signs
    if (engagementHistory.filter((e: any) =>
      new Date(e.date as string) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length === 0) {
      predictors.failure_warnings.push({
        warning: 'No recent engagement activity',
        severity: 'high',
        mitigation: 'Initiate immediate outreach campaign'
      });
    }

    // Check critical requirements
    const hasDecisionMaker = stakeholders.some(s => s.decision_authority);
    const hasBudget = scores.financial_health >= 60;
    const hasNeed = scores.buying_signals >= 50;
    const hasTiming = buyingSignals.some((s: any) => s.signal_type === 'budget_allocated');

    predictors.critical_requirements_met =
      hasDecisionMaker && hasBudget && hasNeed && hasTiming;

    return predictors;
  }

  // Helper methods for data fetching
  private async fetchCompanyData(companyId: string): Promise<Record<string, unknown>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single();
    return data || {};
  }

  private async fetchBuyingSignals(companyId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('detected_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('signal_strength', { ascending: false });
    return data || [];
  }

  private async fetchStakeholders(companyId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('company_id', companyId)
      .order('influence_level', { ascending: false });
    return data || [];
  }

  private async fetchEngagementHistory(companyId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stakeholder_engagement')
      .select('*')
      .eq('company_id', companyId)
      .order('engagement_date', { ascending: false })
      .limit(20);
    return data || [];
  }

  private async fetchCompetitorData(companyId: string): Promise<Record<string, unknown>> {
    // Placeholder for competitor analysis
    return {};
  }

  // Scoring helper methods
  private async scoreBuyingSignals(signals: Array<{ detected_at: string; signal_strength: number }>): Promise<number> {
    if (signals.length === 0) return 0;

    const recentSignals = signals.filter(s =>
      new Date(s.detected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const avgStrength = signals.reduce((sum, s) => sum + s.signal_strength, 0) / signals.length;
    const recencyBoost = recentSignals.length * 5;

    return Math.min(100, avgStrength + recencyBoost);
  }

  private async scoreFinancialHealth(company: Record<string, unknown>): Promise<number> {
    // Implement financial scoring based on company data
    const baseScore = 60;
    const employeeCountMax = typeof company.employee_count_max === 'number' ? company.employee_count_max : 0;
    const sizeBoost = employeeCountMax > 500 ? 20 : 10;
    return Math.min(100, baseScore + sizeBoost);
  }

  private async scoreTechnologyFit(company: Record<string, unknown>): Promise<number> {
    // Implement technology fit scoring
    return 70; // Placeholder
  }

  private async scoreEngagement(history: Array<{ engagement_date: string }>): Promise<number> {
    if (history.length === 0) return 0;

    const recentEngagements = history.filter(h =>
      new Date(h.engagement_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    return Math.min(100, recentEngagements.length * 15);
  }

  private async scoreStakeholders(stakeholders: Array<{ role_type?: string; decision_authority?: boolean; budget_authority?: boolean }>): Promise<number> {
    if (stakeholders.length === 0) return 0;

    let score = stakeholders.length * 10;

    // Boost for key roles
    if (stakeholders.some(s => s.role_type === 'champion')) score += 20;
    if (stakeholders.some(s => s.decision_authority)) score += 15;
    if (stakeholders.some(s => s.budget_authority)) score += 15;

    return Math.min(100, score);
  }

  private async scoreMarketTiming(company: Record<string, unknown>, signals: Array<{ signal_type?: string }>): Promise<number> {
    // Check for timing-related signals
    const timingSignals = signals.filter(s =>
      s.signal_type === 'budget_allocated' ||
      s.signal_type === 'contract_expiring' ||
      s.signal_type === 'fiscal_year_planning'
    );

    return Math.min(100, 50 + timingSignals.length * 25);
  }

  // Utility methods
  private getConversionLikelihood(probability: number): PredictiveLeadScore['conversion_likelihood'] {
    if (probability >= 80) return 'very_high';
    if (probability >= 60) return 'high';
    if (probability >= 40) return 'medium';
    if (probability >= 20) return 'low';
    return 'very_low';
  }

  private estimateDealSize(company: Record<string, unknown>, scores: Record<string, number>): number {
    const baseDealSize = 50000;
    const employeeCountMax = typeof company.employee_count_max === 'number' ? company.employee_count_max : 100;
    const sizeMultiplier = Math.max(1, employeeCountMax / 100);
    const scoreMultiplier = scores.financial_health / 50;

    return Math.round(baseDealSize * sizeMultiplier * scoreMultiplier);
  }

  private estimateCloseDate(timing: TimingRecommendation): Date {
    const today = new Date();

    switch (timing) {
      case 'immediate':
        return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'within_24h':
        return new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
      case 'within_week':
        return new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
      case '1_3_months':
        return new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      case '3_6_months':
        return new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
      case '6_12_months':
        return new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateConfidence(company: Record<string, unknown>, signals: Array<unknown>, stakeholders: Array<unknown>): number {
    let confidence = 50;

    if (signals.length > 5) confidence += 15;
    if (stakeholders.length > 3) confidence += 15;
    if (company.website) confidence += 10;
    if (company.employee_count_max) confidence += 10;

    return Math.min(100, confidence);
  }

  private calculateDataCompleteness(company: Record<string, unknown>, signals: Array<unknown>, stakeholders: Array<unknown>): number {
    const completeness = 0;
    const totalFields = 10;
    let filledFields = 0;

    if (company.name) filledFields++;
    if (company.website) filledFields++;
    if (company.employee_count_max) filledFields++;
    if (company.industry) filledFields++;
    if (company.address) filledFields++;
    if (signals.length > 0) filledFields++;
    if (stakeholders.length > 0) filledFields++;
    if (company.description) filledFields++;
    if (company.phone) filledFields++;
    if (company.email) filledFields++;

    return (filledFields / totalFields) * 100;
  }

  /**
   * Save predictive score to database
   */
  private async savePredictiveScore(score: PredictiveLeadScore, orgId?: string): Promise<void> {
    const supabase = await createClient();

    const dbScore = {
      company_id: score.company_id,
      org_id: orgId,
      overall_score: score.overall_score,
      deal_probability: score.deal_probability,
      conversion_likelihood: score.conversion_likelihood,
      optimal_engagement_timing: score.optimal_engagement_timing,
      estimated_deal_size: score.estimated_deal_size,
      estimated_close_date: score.estimated_close_date,
      buying_signals_score: score.scores.buying_signals,
      financial_health_score: score.scores.financial_health,
      technology_fit_score: score.scores.technology_fit,
      engagement_score: score.scores.engagement,
      stakeholder_score: score.scores.stakeholder,
      market_timing_score: score.scores.market_timing,
      key_strengths: score.insights.key_strengths,
      risk_factors: score.insights.risk_factors,
      recommended_actions: score.insights.recommended_actions,
      competitive_position: score.insights.competitive_position,
      success_indicators: score.predictors.success_indicators,
      failure_warnings: score.predictors.failure_warnings,
      critical_requirements_met: score.predictors.critical_requirements_met,
      model_confidence: score.metadata.model_confidence,
      data_completeness: score.metadata.data_completeness,
      scoring_method: score.metadata.scoring_method,
      calculated_at: score.metadata.calculated_at
    };

    await supabase
      .from('ai_lead_scores')
      // @ts-expect-error - Supabase type inference issue with upsert options
      .upsert(dbScore, {
        onConflict: 'company_id,org_id'
      });

    // Save recommendations
    for (const rec of score.insights.recommended_actions) {
      await supabase
        .from('ai_engagement_recommendations')
        // @ts-expect-error - Supabase type inference issue with insert() method
        .insert({
          company_id: score.company_id,
          recommendation_type: rec.type,
          priority: rec.priority,
          recommended_action: rec.action,
          action_reason: rec.reason,
          expected_impact: rec.expected_impact,
          success_probability: rec.success_probability,
          recommended_date: new Date()
        });
    }
  }
}