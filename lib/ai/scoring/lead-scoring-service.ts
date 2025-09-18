/**
 * Lead Scoring Service
 * Main orchestrator for AI-powered lead scoring and qualification
 * Integrates financial, technology, industry, growth, and engagement scoring
 */

import { createClient } from '@/lib/supabase/server'
import { FinancialHealthScorer } from './financial-health-scorer'
import { AIFinancialScorer } from './ai-financial-scorer'
import { TechnologyFitScorer } from './technology-fit-scorer'
import { GrowthIndicatorScorer } from './growth-indicator-scorer'
import { EngagementTracker } from './engagement-tracker'
import { IndustryAlignmentScorer } from './industry-alignment-scorer'
import { OllamaScoringService } from './ollama-scoring-service'
import { isOllamaEnabled } from '@/lib/ai/ollama'

export interface LeadScore {
  id?: string
  company_id?: string
  company_number?: string
  company_name: string
  overall_score: number
  financial_health_score: number
  technology_fit_score: number
  industry_alignment_score: number
  growth_indicator_score: number
  engagement_score: number
  confidence_level: 'high' | 'medium' | 'low'
  score_breakdown: ScoreBreakdown
  scoring_metadata: ScoringMetadata
}

export interface ScoreBreakdown {
  financial: ComponentBreakdown
  technology: ComponentBreakdown
  industry: ComponentBreakdown
  growth: ComponentBreakdown
  engagement: ComponentBreakdown
}

export interface ComponentBreakdown {
  score: number
  weight: number
  factors: Array<{
    name: string
    value: number
    impact: 'positive' | 'negative' | 'neutral'
    explanation: string
  }>
  data_quality: number
  missing_data: string[]
}

export interface ScoringMetadata {
  calculation_time_ms: number
  data_sources_used: string[]
  scoring_version: string
  last_updated: string
  next_update: string
}

export interface ScoringWeights {
  financial: number
  technology: number
  industry: number
  growth: number
  engagement: number
}

export interface ScoringOptions {
  use_cache?: boolean
  force_refresh?: boolean
  include_explanations?: boolean
  custom_weights?: ScoringWeights
  org_id?: string
  use_ai?: boolean
  ai_depth?: 'quick' | 'detailed'
}

export class LeadScoringService {
  private financialScorer: FinancialHealthScorer
  private aiFinancialScorer: AIFinancialScorer
  private technologyScorer: TechnologyFitScorer
  private growthScorer: GrowthIndicatorScorer
  private engagementTracker: EngagementTracker
  private industryScorer: IndustryAlignmentScorer
  private ollamaScoring: OllamaScoringService | null = null

  private defaultWeights: ScoringWeights = {
    financial: 0.30,
    technology: 0.20,
    industry: 0.20,
    growth: 0.20,
    engagement: 0.10
  }

  constructor() {
    this.financialScorer = new FinancialHealthScorer()
    this.aiFinancialScorer = new AIFinancialScorer()
    this.technologyScorer = new TechnologyFitScorer()
    this.growthScorer = new GrowthIndicatorScorer()
    this.engagementTracker = new EngagementTracker()
    this.industryScorer = new IndustryAlignmentScorer()

    // Initialize AI scoring if Ollama is enabled
    if (isOllamaEnabled()) {
      this.ollamaScoring = new OllamaScoringService()
    }
  }

  /**
   * Calculate comprehensive lead score for a company
   */
  async calculateScore(
    companyIdentifier: string | { company_id?: string; company_number?: string; company_name: string },
    options: ScoringOptions = {}
  ): Promise<LeadScore> {
    const startTime = Date.now()
    const supabase = await createClient()

    console.log('[LeadScoring] Starting score calculation:', companyIdentifier)

    try {
      // Resolve company data
      const company = await this.resolveCompany(companyIdentifier)
      if (!company) {
        throw new Error('Company not found')
      }

      // Check for cached score if not forcing refresh
      if (!options.force_refresh && options.use_cache !== false) {
        const cachedScore = await this.getCachedScore(company.id)
        if (cachedScore && this.isCacheValid(cachedScore)) {
          console.log('[LeadScoring] Returning cached score')
          return cachedScore
        }
      }

      // Use AI scoring if requested and available
      if (options.use_ai && this.ollamaScoring) {
        try {
          console.log('[LeadScoring] Using AI-powered scoring')
          const aiAnalysis = await this.ollamaScoring.analyzeCompany(company, {
            depth: options.ai_depth || 'detailed',
            useCache: options.use_cache !== false,
            includeRecommendations: options.include_explanations !== false
          })

          // Convert AI analysis to LeadScore format
          return this.convertAIAnalysisToLeadScore(aiAnalysis, company)
        } catch (aiError) {
          console.error('[LeadScoring] AI scoring failed, falling back to rule-based:', aiError)
          // Fall through to rule-based scoring
        }
      }

      // Get scoring weights (custom or org-specific)
      const weights = await this.getScoringWeights(options)

      // Calculate individual component scores in parallel
      // Use AI financial scorer if available and AI is enabled
      const useAIFinancial = options.use_ai !== false && isOllamaEnabled()

      const [
        financialScore,
        technologyScore,
        industryScore,
        growthScore,
        engagementScore
      ] = await Promise.all([
        useAIFinancial ?
          this.aiFinancialScorer.calculateScore(company) :
          this.financialScorer.calculateScore(company),
        this.technologyScorer.calculateScore(company),
        this.industryScorer.calculateScore(company),
        this.growthScorer.calculateScore(company),
        this.engagementTracker.calculateScore(company)
      ])

      // Calculate weighted overall score
      const overallScore = this.calculateOverallScore(
        {
          financial: financialScore.score,
          technology: technologyScore.score,
          industry: industryScore.score,
          growth: growthScore.score,
          engagement: engagementScore.score
        },
        weights
      )

      // Determine confidence level based on data completeness
      const confidenceLevel = this.calculateConfidenceLevel([
        financialScore,
        technologyScore,
        industryScore,
        growthScore,
        engagementScore
      ])

      // Build score breakdown
      const scoreBreakdown: ScoreBreakdown = {
        financial: {
          score: financialScore.score,
          weight: weights.financial,
          factors: financialScore.factors,
          data_quality: financialScore.data_quality,
          missing_data: financialScore.missing_data
        },
        technology: {
          score: technologyScore.score,
          weight: weights.technology,
          factors: technologyScore.factors,
          data_quality: technologyScore.data_quality,
          missing_data: technologyScore.missing_data
        },
        industry: {
          score: industryScore.score,
          weight: weights.industry,
          factors: industryScore.factors,
          data_quality: industryScore.data_quality,
          missing_data: industryScore.missing_data
        },
        growth: {
          score: growthScore.score,
          weight: weights.growth,
          factors: growthScore.factors,
          data_quality: growthScore.data_quality,
          missing_data: growthScore.missing_data
        },
        engagement: {
          score: engagementScore.score,
          weight: weights.engagement,
          factors: engagementScore.factors,
          data_quality: engagementScore.data_quality,
          missing_data: engagementScore.missing_data
        }
      }

      // Build metadata
      const scoringMetadata: ScoringMetadata = {
        calculation_time_ms: Date.now() - startTime,
        data_sources_used: this.collectDataSources(scoreBreakdown),
        scoring_version: '1.0.0',
        last_updated: new Date().toISOString(),
        next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }

      // Create lead score object
      const leadScore: LeadScore = {
        company_id: company.id,
        company_number: company.company_number,
        company_name: company.name,
        overall_score: overallScore,
        financial_health_score: financialScore.score,
        technology_fit_score: technologyScore.score,
        industry_alignment_score: industryScore.score,
        growth_indicator_score: growthScore.score,
        engagement_score: engagementScore.score,
        confidence_level: confidenceLevel,
        score_breakdown: scoreBreakdown,
        scoring_metadata: scoringMetadata
      }

      // Save score to database
      await this.saveScore(leadScore)

      // Trigger alerts if configured
      await this.checkAndTriggerAlerts(leadScore, options.org_id)

      console.log(`[LeadScoring] Score calculated in ${Date.now() - startTime}ms:`, overallScore)
      return leadScore

    } catch (error) {
      console.error('[LeadScoring] Error calculating score:', error)
      throw error
    }
  }

  /**
   * Batch score multiple companies
   */
  async batchScore(
    companyIdentifiers: string[],
    options: ScoringOptions = {}
  ): Promise<LeadScore[]> {
    console.log(`[LeadScoring] Starting batch scoring for ${companyIdentifiers.length} companies`)

    // Process in batches to avoid overwhelming the system
    const batchSize = 10
    const results: LeadScore[] = []

    for (let i = 0; i < companyIdentifiers.length; i += batchSize) {
      const batch = companyIdentifiers.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(
        batch.map(id => this.calculateScore(id, options))
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('[LeadScoring] Batch scoring error:', result.reason)
        }
      }
    }

    return results
  }

  /**
   * Get score explanation in human-readable format
   */
  async getScoreExplanation(
    companyIdentifier: string,
    options: { detailed?: boolean } = {}
  ): Promise<string> {
    const score = await this.calculateScore(companyIdentifier, { use_cache: true })

    let explanation = `## Lead Score Analysis for ${score.company_name}\n\n`
    explanation += `**Overall Score: ${score.overall_score}/100** (${this.getScoreLabel(score.overall_score)})\n`
    explanation += `**Confidence Level: ${score.confidence_level}**\n\n`

    // Component scores
    explanation += `### Component Scores\n`
    explanation += `- Financial Health: ${score.financial_health_score}/100\n`
    explanation += `- Technology Fit: ${score.technology_fit_score}/100\n`
    explanation += `- Industry Alignment: ${score.industry_alignment_score}/100\n`
    explanation += `- Growth Indicators: ${score.growth_indicator_score}/100\n`
    explanation += `- Engagement Level: ${score.engagement_score}/100\n\n`

    if (options.detailed) {
      // Add detailed factor analysis
      explanation += `### Key Factors\n\n`

      for (const [component, breakdown] of Object.entries(score.score_breakdown)) {
        explanation += `#### ${this.capitalizeFirst(component)} (Weight: ${breakdown.weight * 100}%)\n`

        const topFactors = breakdown.factors
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
          .slice(0, 3)

        for (const factor of topFactors) {
          const icon = factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : '➖'
          explanation += `${icon} ${factor.name}: ${factor.explanation}\n`
        }
        explanation += '\n'
      }
    }

    // Recommendations
    explanation += `### Recommendations\n`
    const recommendations = this.generateRecommendations(score)
    for (const rec of recommendations) {
      explanation += `- ${rec}\n`
    }

    return explanation
  }

  /**
   * Update scoring weights for an organization
   */
  async updateScoringWeights(
    orgId: string,
    weights: Partial<ScoringWeights>
  ): Promise<void> {
    const supabase = await createClient()

    // Validate weights sum to 1.0
    const newWeights = { ...this.defaultWeights, ...weights }
    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error('Weights must sum to 1.0')
    }

    // Update each criteria weight
    for (const [type, weight] of Object.entries(newWeights)) {
      await supabase
        .from('scoring_criteria')
        .update({ weight, updated_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('criteria_type', type)
    }

    console.log('[LeadScoring] Updated scoring weights for org:', orgId)
  }

  // Private helper methods

  private async resolveCompany(identifier: any) {
    const supabase = await createClient()

    if (typeof identifier === 'string') {
      // Try company_number first, then company_id
      const { data: byNumber } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', identifier.toUpperCase())
        .single()

      if (byNumber) return byNumber

      const { data: byId } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', identifier)
        .single()

      return byId
    }

    if (identifier.company_id) {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', identifier.company_id)
        .single()
      return data
    }

    if (identifier.company_number) {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', identifier.company_number.toUpperCase())
        .single()
      return data
    }

    // If only name provided, search by name
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .ilike('name', `%${identifier.company_name}%`)
      .limit(1)
      .single()

    return data
  }

  private async getCachedScore(companyId: string): Promise<LeadScore | null> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('company_id', companyId)
      .single()

    return data
  }

  private isCacheValid(score: LeadScore): boolean {
    if (!score.scoring_metadata?.last_updated) return false
    const lastUpdated = new Date(score.scoring_metadata.last_updated)
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)
    return hoursSinceUpdate < 24 // Cache valid for 24 hours
  }

  private async getScoringWeights(options: ScoringOptions): Promise<ScoringWeights> {
    if (options.custom_weights) {
      return options.custom_weights
    }

    if (options.org_id) {
      const supabase = await createClient()
      const { data } = await supabase
        .from('scoring_criteria')
        .select('criteria_type, weight')
        .eq('org_id', options.org_id)
        .eq('is_active', true)

      if (data && data.length > 0) {
        const weights: any = {}
        data.forEach(criteria => {
          weights[criteria.criteria_type] = criteria.weight
        })
        return { ...this.defaultWeights, ...weights }
      }
    }

    return this.defaultWeights
  }

  private calculateOverallScore(
    scores: { [key: string]: number },
    weights: ScoringWeights
  ): number {
    let weightedSum = 0
    let totalWeight = 0

    for (const [component, score] of Object.entries(scores)) {
      const weight = weights[component as keyof ScoringWeights]
      if (weight) {
        weightedSum += score * weight
        totalWeight += weight
      }
    }

    return Math.round(totalWeight > 0 ? weightedSum / totalWeight : 0)
  }

  private calculateConfidenceLevel(componentScores: any[]): 'high' | 'medium' | 'low' {
    const avgDataQuality = componentScores.reduce((sum, score) => sum + score.data_quality, 0) / componentScores.length
    const totalMissingData = componentScores.reduce((sum, score) => sum + score.missing_data.length, 0)

    if (avgDataQuality > 80 && totalMissingData < 3) return 'high'
    if (avgDataQuality > 60 && totalMissingData < 6) return 'medium'
    return 'low'
  }

  private collectDataSources(breakdown: ScoreBreakdown): string[] {
    const sources = new Set<string>()

    for (const component of Object.values(breakdown)) {
      component.factors.forEach(factor => {
        // Extract data source from factor name or use default
        if (factor.name.includes('Companies House')) sources.add('companies_house')
        if (factor.name.includes('Website')) sources.add('website_analysis')
        if (factor.name.includes('Email')) sources.add('email_tracking')
        if (factor.name.includes('Job')) sources.add('job_postings')
        if (factor.name.includes('News')) sources.add('news_monitoring')
      })
    }

    return Array.from(sources)
  }

  private async saveScore(score: LeadScore): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('lead_scores')
      .upsert({
        company_id: score.company_id,
        company_number: score.company_number,
        company_name: score.company_name,
        overall_score: score.overall_score,
        financial_health_score: score.financial_health_score,
        technology_fit_score: score.technology_fit_score,
        industry_alignment_score: score.industry_alignment_score,
        growth_indicator_score: score.growth_indicator_score,
        engagement_score: score.engagement_score,
        confidence_level: score.confidence_level,
        score_breakdown: score.score_breakdown,
        scoring_metadata: score.scoring_metadata,
        financial_factors: score.score_breakdown.financial.factors,
        technology_factors: score.score_breakdown.technology.factors,
        industry_factors: score.score_breakdown.industry.factors,
        growth_factors: score.score_breakdown.growth.factors,
        engagement_factors: score.score_breakdown.engagement.factors,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', score.company_id)

    if (error) {
      console.error('[LeadScoring] Error saving score:', error)
      throw error
    }
  }

  private async checkAndTriggerAlerts(score: LeadScore, orgId?: string): Promise<void> {
    if (!orgId) return

    const supabase = await createClient()
    const { data: alerts } = await supabase
      .from('scoring_alerts')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)

    if (!alerts) return

    for (const alert of alerts) {
      if (this.shouldTriggerAlert(score, alert.criteria)) {
        console.log(`[LeadScoring] Triggering alert: ${alert.alert_name}`)
        // TODO: Implement notification sending
      }
    }
  }

  private shouldTriggerAlert(score: LeadScore, criteria: any): boolean {
    const scoreType = criteria.score_type || 'overall'
    const value = score[`${scoreType}_score` as keyof LeadScore] as number
    const threshold = criteria.value

    switch (criteria.operator) {
      case '>=': return value >= threshold
      case '>': return value > threshold
      case '<=': return value <= threshold
      case '<': return value < threshold
      case '==': return value === threshold
      default: return false
    }
  }

  private getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Very Good'
    if (score >= 60) return 'Good'
    if (score >= 45) return 'Average'
    if (score >= 30) return 'Below Average'
    return 'Poor'
  }

  private generateRecommendations(score: LeadScore): string[] {
    const recommendations: string[] = []

    if (score.overall_score >= 80) {
      recommendations.push('High-priority lead - schedule immediate outreach')
      recommendations.push('Consider executive-level engagement')
    } else if (score.overall_score >= 60) {
      recommendations.push('Promising lead - nurture with targeted content')
      recommendations.push('Monitor for increased engagement signals')
    } else if (score.overall_score >= 40) {
      recommendations.push('Requires further qualification')
      recommendations.push('Focus on education and awareness building')
    } else {
      recommendations.push('Low priority - add to long-term nurture campaign')
      recommendations.push('Re-evaluate in 6 months')
    }

    // Specific recommendations based on low scores
    const breakdown = score.score_breakdown
    if (breakdown.financial.score < 50) {
      recommendations.push('Financial health concerns - verify budget availability')
    }
    if (breakdown.engagement.score < 30) {
      recommendations.push('Low engagement - increase touchpoints and value delivery')
    }
    if (breakdown.growth.score > 80) {
      recommendations.push('High growth company - emphasize scalability and ROI')
    }

    return recommendations.slice(0, 5) // Return top 5 recommendations
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Convert AI analysis to LeadScore format
   */
  private convertAIAnalysisToLeadScore(
    aiAnalysis: any,
    company: any
  ): LeadScore {
    // Build score breakdown from AI analysis
    const scoreBreakdown: ScoreBreakdown = {
      financial: {
        score: aiAnalysis.financial.score,
        weight: this.defaultWeights.financial,
        factors: aiAnalysis.financial.key_factors.map((factor: string) => ({
          name: 'AI Financial Analysis',
          value: aiAnalysis.financial.score,
          impact: aiAnalysis.financial.score > 60 ? 'positive' : aiAnalysis.financial.score < 40 ? 'negative' : 'neutral',
          explanation: factor
        })),
        data_quality: aiAnalysis.financial.confidence === 'high' ? 90 :
                     aiAnalysis.financial.confidence === 'medium' ? 70 : 50,
        missing_data: []
      },
      technology: {
        score: aiAnalysis.technology.score,
        weight: this.defaultWeights.technology,
        factors: aiAnalysis.technology.key_factors.map((factor: string) => ({
          name: 'AI Technology Assessment',
          value: aiAnalysis.technology.score,
          impact: aiAnalysis.technology.score > 60 ? 'positive' : aiAnalysis.technology.score < 40 ? 'negative' : 'neutral',
          explanation: factor
        })),
        data_quality: aiAnalysis.technology.confidence === 'high' ? 90 :
                     aiAnalysis.technology.confidence === 'medium' ? 70 : 50,
        missing_data: []
      },
      industry: {
        score: aiAnalysis.industry.score,
        weight: this.defaultWeights.industry,
        factors: aiAnalysis.industry.key_factors.map((factor: string) => ({
          name: 'AI Industry Analysis',
          value: aiAnalysis.industry.score,
          impact: aiAnalysis.industry.score > 60 ? 'positive' : aiAnalysis.industry.score < 40 ? 'negative' : 'neutral',
          explanation: factor
        })),
        data_quality: aiAnalysis.industry.confidence === 'high' ? 90 :
                     aiAnalysis.industry.confidence === 'medium' ? 70 : 50,
        missing_data: []
      },
      growth: {
        score: aiAnalysis.growth.score,
        weight: this.defaultWeights.growth,
        factors: aiAnalysis.growth.key_factors.map((factor: string) => ({
          name: 'AI Growth Potential',
          value: aiAnalysis.growth.score,
          impact: aiAnalysis.growth.score > 60 ? 'positive' : aiAnalysis.growth.score < 40 ? 'negative' : 'neutral',
          explanation: factor
        })),
        data_quality: aiAnalysis.growth.confidence === 'high' ? 90 :
                     aiAnalysis.growth.confidence === 'medium' ? 70 : 50,
        missing_data: []
      },
      engagement: {
        score: aiAnalysis.engagement.score,
        weight: this.defaultWeights.engagement,
        factors: aiAnalysis.engagement.key_factors.map((factor: string) => ({
          name: 'AI Engagement Analysis',
          value: aiAnalysis.engagement.score,
          impact: aiAnalysis.engagement.score > 60 ? 'positive' : aiAnalysis.engagement.score < 40 ? 'negative' : 'neutral',
          explanation: factor
        })),
        data_quality: aiAnalysis.engagement.confidence === 'high' ? 90 :
                     aiAnalysis.engagement.confidence === 'medium' ? 70 : 50,
        missing_data: []
      }
    }

    // Create scoring metadata with AI information
    const scoringMetadata: ScoringMetadata = {
      calculation_time_ms: aiAnalysis.ai_metadata.analysis_time_ms,
      data_sources_used: ['companies_house', 'ai_analysis', 'engagement_tracking'],
      scoring_version: '2.0.0-AI',
      last_updated: new Date().toISOString(),
      next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    const leadScore: LeadScore = {
      company_id: company.id,
      company_number: company.company_number,
      company_name: company.name,
      overall_score: aiAnalysis.overall.score,
      financial_health_score: aiAnalysis.financial.score,
      technology_fit_score: aiAnalysis.technology.score,
      industry_alignment_score: aiAnalysis.industry.score,
      growth_indicator_score: aiAnalysis.growth.score,
      engagement_score: aiAnalysis.engagement.score,
      confidence_level: aiAnalysis.overall.confidence,
      score_breakdown: scoreBreakdown,
      scoring_metadata: scoringMetadata
    }

    // Save the AI-enhanced score with additional metadata
    this.saveAIScore(leadScore, aiAnalysis)

    return leadScore
  }

  /**
   * Save AI-enhanced score with additional metadata
   */
  private async saveAIScore(score: LeadScore, aiAnalysis: any): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('lead_scores')
      .upsert({
        ...score,
        ai_analysis: aiAnalysis,
        ai_model_used: aiAnalysis.ai_metadata.model_used,
        ai_confidence: aiAnalysis.overall.confidence,
        ai_reasoning: aiAnalysis.natural_language_summary,
        use_ai_scoring: true,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', score.company_id)

    console.log('[LeadScoring] AI-enhanced score saved')
  }
}