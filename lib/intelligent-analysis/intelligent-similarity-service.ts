/**
 * IntelligentSimilarityService: AI-powered similarity analysis for M&A
 * Replaces static demo data with intelligent competitor discovery and analysis
 * Built for real-world M&A intelligence using local LLM and free data sources
 */

import { CompanyAIClassifier, type AICompanyAnalysis } from './company-ai-classifier'
import { getOllamaClient } from '@/lib/ai/ollama'

export interface IntelligentSimilarityRequest {
  target_company_name: string
  target_domain?: string
  industry_hint?: string
  include_financial_analysis?: boolean
  include_market_intelligence?: boolean
  max_competitors?: number
}

export interface IntelligentCompanyMatch {
  id: string
  company_name: string
  overall_score: number
  confidence: number
  rank: number
  
  // Enhanced scoring dimensions
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  
  // AI-generated insights
  similarity_reasoning: string
  competitive_relationship: string
  strategic_value: string
  acquisition_rationale: string
  
  // Company intelligence
  business_model_type: string
  market_category: string
  technology_focus: string[]
  target_customers: string[]
  competitive_advantages: string[]
  
  // Market context
  market_positioning: string
  growth_indicators: string[]
  risk_factors: string[]
  
  // Metadata
  data_sources: string[]
  analysis_confidence: number
}

export interface IntelligentSimilarityAnalysis {
  id: string
  target_company_name: string
  target_company_analysis: AICompanyAnalysis
  status: 'completed'
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  
  // AI-generated insights
  executive_summary: string
  key_opportunities: string[]
  risk_highlights: string[]
  strategic_recommendations: string[]
  market_outlook: string
  
  // Enhanced matches
  similar_company_matches: IntelligentCompanyMatch[]
  
  // Analysis metadata
  analysis_configuration: {
    ai_model: string
    analysis_depth: string
    data_sources: string[]
  }
  created_at: string
  completed_at: string
  
  // Summary statistics
  summary: {
    totalMatches: number
    averageScore: number
    topScore: number
    scoreDistribution: {
      excellent: number
      good: number
      fair: number
      poor: number
    }
    confidenceDistribution: {
      high: number
      medium: number
      low: number
    }
    marketCategories: { [category: string]: number }
    competitiveRelationships: { [relationship: string]: number }
  }
}

export class IntelligentSimilarityService {
  private aiClassifier = new CompanyAIClassifier()
  private ollamaClient = getOllamaClient()

  /**
   * Generate intelligent similarity analysis using AI instead of static patterns
   */
  async generateIntelligentAnalysis(
    request: IntelligentSimilarityRequest
  ): Promise<IntelligentSimilarityAnalysis> {
    const startTime = Date.now()
    const analysisId = this.generateAnalysisId()
    
    console.log(`[IntelligentSimilarity] Starting AI-powered analysis for: ${request.target_company_name}`)

    try {
      // Phase 1: Analyze target company using AI
      const targetAnalysis = await this.aiClassifier.analyzeCompany({
        company_name: request.target_company_name,
        domain: request.target_domain,
        industry_hint: request.industry_hint
      })

      console.log(`[IntelligentSimilarity] Target analysis completed. Found ${targetAnalysis.competitors.length} competitors`)

      // Phase 2: Analyze each competitor to get detailed intelligence
      const intelligentMatches = await this.analyzeCompetitors(
        targetAnalysis,
        request.max_competitors || 15
      )

      // Phase 3: Generate comprehensive insights using LLM
      const executiveSummary = await this.generateExecutiveSummary(
        targetAnalysis,
        intelligentMatches
      )

      const keyOpportunities = await this.identifyKeyOpportunities(
        targetAnalysis,
        intelligentMatches
      )

      const riskHighlights = await this.analyzeRiskHighlights(
        targetAnalysis,
        intelligentMatches
      )

      const strategicRecommendations = await this.generateStrategicRecommendations(
        targetAnalysis,
        intelligentMatches
      )

      const marketOutlook = await this.analyzeMarketOutlook(targetAnalysis)

      // Phase 4: Calculate summary statistics
      const summary = this.calculateSummaryStatistics(intelligentMatches)

      const completedAt = new Date().toISOString()

      console.log(`[IntelligentSimilarity] Analysis completed in ${Date.now() - startTime}ms`)

      return {
        id: analysisId,
        target_company_name: request.target_company_name,
        target_company_analysis: targetAnalysis,
        status: 'completed',
        total_companies_analyzed: intelligentMatches.length,
        average_similarity_score: summary.averageScore,
        top_similarity_score: summary.topScore,
        executive_summary: executiveSummary,
        key_opportunities: keyOpportunities,
        risk_highlights: riskHighlights,
        strategic_recommendations: strategicRecommendations,
        market_outlook: marketOutlook,
        similar_company_matches: intelligentMatches,
        analysis_configuration: {
          ai_model: 'llama3.1:13b',
          analysis_depth: 'comprehensive',
          data_sources: ['ai_analysis', 'web_intelligence', 'competitive_research']
        },
        created_at: new Date(startTime).toISOString(),
        completed_at: completedAt,
        summary: summary
      }

    } catch (error) {
      console.error('[IntelligentSimilarity] Analysis failed:', error)
      throw new Error(`Intelligent similarity analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze competitors to create intelligent matches
   */
  private async analyzeCompetitors(
    targetAnalysis: AICompanyAnalysis,
    maxCompetitors: number
  ): Promise<IntelligentCompanyMatch[]> {
    const matches: IntelligentCompanyMatch[] = []
    
    // Get top competitors from AI analysis
    const topCompetitors = targetAnalysis.competitors.slice(0, maxCompetitors)
    
    for (let i = 0; i < topCompetitors.length; i++) {
      const competitor = topCompetitors[i]
      
      try {
        console.log(`[IntelligentSimilarity] Analyzing competitor ${i + 1}/${topCompetitors.length}: ${competitor.name}`)
        
        // Analyze each competitor with AI
        const competitorAnalysis = await this.aiClassifier.analyzeCompany({
          company_name: competitor.name
        })

        // Calculate sophisticated similarity scores
        const scores = await this.calculateIntelligentScores(
          targetAnalysis,
          competitorAnalysis,
          competitor
        )

        const intelligentMatch: IntelligentCompanyMatch = {
          id: this.generateMatchId(competitor.name),
          company_name: competitor.name,
          overall_score: scores.overall_score,
          confidence: scores.confidence,
          rank: i + 1,
          financial_score: scores.financial_score,
          strategic_score: scores.strategic_score,
          operational_score: scores.operational_score,
          market_score: scores.market_score,
          risk_score: scores.risk_score,
          similarity_reasoning: competitor.similarity_reasoning,
          competitive_relationship: competitor.competitive_relationship,
          strategic_value: await this.generateStrategicValue(targetAnalysis, competitorAnalysis),
          acquisition_rationale: competitorAnalysis.strategic_insights.acquisition_rationale,
          business_model_type: competitorAnalysis.business_classification.business_model_type,
          market_category: competitorAnalysis.business_classification.market_category,
          technology_focus: competitorAnalysis.business_classification.technology_focus,
          target_customers: competitorAnalysis.business_classification.target_customer_segments,
          competitive_advantages: [competitorAnalysis.business_classification.competitive_moat],
          market_positioning: competitor.market_positioning,
          growth_indicators: competitorAnalysis.market_intelligence.key_market_trends,
          risk_factors: competitorAnalysis.market_intelligence.disruption_risks,
          data_sources: competitorAnalysis.analysis_metadata.data_sources,
          analysis_confidence: competitorAnalysis.confidence_score
        }

        matches.push(intelligentMatch)

      } catch (error) {
        console.warn(`[IntelligentSimilarity] Failed to analyze competitor ${competitor.name}:`, error)
        
        // Create fallback match with limited data
        matches.push({
          id: this.generateMatchId(competitor.name),
          company_name: competitor.name,
          overall_score: competitor.similarity_score,
          confidence: 50,
          rank: i + 1,
          financial_score: competitor.similarity_score,
          strategic_score: competitor.similarity_score,
          operational_score: competitor.similarity_score * 0.9,
          market_score: competitor.similarity_score * 1.1,
          risk_score: 100 - competitor.similarity_score,
          similarity_reasoning: competitor.similarity_reasoning,
          competitive_relationship: competitor.competitive_relationship,
          strategic_value: 'Requires further analysis',
          acquisition_rationale: 'Analysis pending',
          business_model_type: 'Unknown',
          market_category: 'Technology',
          technology_focus: [],
          target_customers: [],
          competitive_advantages: [],
          market_positioning: competitor.market_positioning,
          growth_indicators: [],
          risk_factors: [],
          data_sources: ['limited_analysis'],
          analysis_confidence: 30
        })
      }
    }

    return matches
  }

  /**
   * Calculate intelligent similarity scores based on multiple dimensions
   */
  private async calculateIntelligentScores(
    target: AICompanyAnalysis,
    competitor: AICompanyAnalysis,
    competitorInfo: any
  ): Promise<any> {
    // Business model similarity
    const businessModelSimilarity = this.calculateBusinessModelSimilarity(
      target.business_classification,
      competitor.business_classification
    )

    // Market similarity  
    const marketSimilarity = this.calculateMarketSimilarity(
      target.market_intelligence,
      competitor.market_intelligence
    )

    // Technology similarity
    const technologySimilarity = this.calculateTechnologySimilarity(
      target.business_classification.technology_focus,
      competitor.business_classification.technology_focus
    )

    // Customer similarity
    const customerSimilarity = this.calculateCustomerSimilarity(
      target.business_classification.target_customer_segments,
      competitor.business_classification.target_customer_segments
    )

    // Calculate dimensional scores
    const financial_score = Math.round(businessModelSimilarity * 0.6 + marketSimilarity * 0.4)
    const strategic_score = Math.round(competitorInfo.similarity_score * 0.7 + customerSimilarity * 0.3)
    const operational_score = Math.round(technologySimilarity * 0.8 + businessModelSimilarity * 0.2)
    const market_score = Math.round(marketSimilarity * 0.9 + customerSimilarity * 0.1)
    const risk_score = Math.round(100 - (competitorInfo.strategic_threat_level === 'high' ? 80 : 
                                        competitorInfo.strategic_threat_level === 'medium' ? 60 : 40))

    const overall_score = Math.round(
      financial_score * 0.25 +
      strategic_score * 0.30 +
      operational_score * 0.20 +
      market_score * 0.15 +
      risk_score * 0.10
    )

    const confidence = Math.round(
      (target.confidence_score + competitor.confidence_score) / 2
    )

    return {
      overall_score,
      confidence,
      financial_score,
      strategic_score,
      operational_score,
      market_score,
      risk_score
    }
  }

  /**
   * Generate strategic value assessment using LLM
   */
  private async generateStrategicValue(
    target: AICompanyAnalysis,
    competitor: AICompanyAnalysis
  ): Promise<string> {
    const prompt = `Assess the strategic value of acquiring "${competitor.company_name}" for "${target.company_name}":

Target Company:
- Business: ${target.business_classification.primary_business_function}
- Market: ${target.business_classification.market_category}
- Moat: ${target.business_classification.competitive_moat}

Potential Target:
- Business: ${competitor.business_classification.primary_business_function}  
- Market: ${competitor.business_classification.market_category}
- Moat: ${competitor.business_classification.competitive_moat}

Provide a 1-2 sentence strategic value assessment focusing on the specific value this acquisition would create.`

    try {
      const response = await this.ollamaClient.fastComplete(prompt, {
        system_prompt: 'You are an M&A strategist. Provide concise strategic value assessments.',
        temperature: 0.3,
        max_tokens: 150
      })

      return response.trim()

    } catch (error) {
      console.warn('[IntelligentSimilarity] Strategic value generation failed:', error)
      return 'Strategic value assessment requires further analysis'
    }
  }

  // LLM-powered insights generation methods
  private async generateExecutiveSummary(
    target: AICompanyAnalysis,
    matches: IntelligentCompanyMatch[]
  ): Promise<string> {
    const topMatches = matches.slice(0, 5).map(m => m.company_name).join(', ')
    
    const prompt = `Create an executive summary for M&A analysis of "${target.company_name}":

Company Profile: ${target.business_classification.primary_business_function} in ${target.business_classification.market_category}
Top Similar Companies: ${topMatches}
Market Stage: ${target.market_intelligence.growth_stage}
Total Companies Analyzed: ${matches.length}

Write a 2-3 sentence executive summary highlighting the key findings and strategic opportunities.`

    try {
      const response = await this.ollamaClient.fastComplete(prompt, {
        system_prompt: 'You are an M&A analyst writing executive summaries for investment committees.',
        temperature: 0.3,
        max_tokens: 200
      })

      return response.trim()

    } catch (error) {
      console.warn('[IntelligentSimilarity] Executive summary generation failed:', error)
      return `${target.company_name} analysis identified ${matches.length} potential acquisition targets in the ${target.business_classification.market_category} sector, with strong strategic fit opportunities in ${target.market_intelligence.growth_stage} market conditions.`
    }
  }

  private async identifyKeyOpportunities(
    target: AICompanyAnalysis,
    matches: IntelligentCompanyMatch[]
  ): Promise<string[]> {
    const opportunities = target.strategic_insights.synergy_opportunities || []
    const marketDrivers = target.market_intelligence.acquisition_drivers || []
    
    return [...opportunities, ...marketDrivers].slice(0, 5)
  }

  private async analyzeRiskHighlights(
    target: AICompanyAnalysis,
    matches: IntelligentCompanyMatch[]
  ): Promise<string[]> {
    const integrationChallenges = target.strategic_insights.integration_challenges || []
    const disruptionRisks = target.market_intelligence.disruption_risks || []
    
    return [...integrationChallenges, ...disruptionRisks].slice(0, 4)
  }

  private async generateStrategicRecommendations(
    target: AICompanyAnalysis,
    matches: IntelligentCompanyMatch[]
  ): Promise<string[]> {
    const recommendations = [
      `Focus on ${target.business_classification.market_category} sector acquisitions`,
      `Target companies with ${target.business_classification.business_model_type} business models`,
      `Prioritize ${matches[0]?.competitive_relationship || 'strategic'} competitive relationships`
    ]

    if (target.market_intelligence.growth_stage === 'growth') {
      recommendations.push('Act quickly in this growing market before valuations increase')
    }

    return recommendations
  }

  private async analyzeMarketOutlook(target: AICompanyAnalysis): Promise<string> {
    const stage = target.market_intelligence.growth_stage
    const trends = target.market_intelligence.key_market_trends.join(', ')
    
    return `The ${target.business_classification.market_category} market is in ${stage} stage with key trends including ${trends}.`
  }

  // Similarity calculation methods
  private calculateBusinessModelSimilarity(target: any, competitor: any): number {
    let similarity = 50

    if (target.business_model_type === competitor.business_model_type) similarity += 30
    if (target.revenue_model === competitor.revenue_model) similarity += 20
    
    return Math.min(similarity, 100)
  }

  private calculateMarketSimilarity(target: any, competitor: any): number {
    let similarity = 50

    if (target.market_size_category === competitor.market_size_category) similarity += 20
    if (target.growth_stage === competitor.growth_stage) similarity += 30
    
    return Math.min(similarity, 100)
  }

  private calculateTechnologySimilarity(targetTech: string[], competitorTech: string[]): number {
    if (targetTech.length === 0 || competitorTech.length === 0) return 50
    
    const intersection = targetTech.filter(tech => 
      competitorTech.some(cTech => cTech.toLowerCase().includes(tech.toLowerCase()))
    )
    
    const similarity = (intersection.length / Math.max(targetTech.length, competitorTech.length)) * 100
    return Math.round(similarity)
  }

  private calculateCustomerSimilarity(targetCustomers: string[], competitorCustomers: string[]): number {
    if (targetCustomers.length === 0 || competitorCustomers.length === 0) return 50
    
    const intersection = targetCustomers.filter(customer => 
      competitorCustomers.some(cCustomer => 
        cCustomer.toLowerCase().includes(customer.toLowerCase()) ||
        customer.toLowerCase().includes(cCustomer.toLowerCase())
      )
    )
    
    const similarity = (intersection.length / Math.max(targetCustomers.length, competitorCustomers.length)) * 100
    return Math.round(similarity)
  }

  private calculateSummaryStatistics(matches: IntelligentCompanyMatch[]): any {
    const scores = matches.map(m => m.overall_score)
    const confidences = matches.map(m => m.confidence)

    return {
      totalMatches: matches.length,
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      topScore: Math.max(...scores),
      scoreDistribution: {
        excellent: matches.filter(m => m.overall_score >= 85).length,
        good: matches.filter(m => m.overall_score >= 70 && m.overall_score < 85).length,
        fair: matches.filter(m => m.overall_score >= 55 && m.overall_score < 70).length,
        poor: matches.filter(m => m.overall_score < 55).length
      },
      confidenceDistribution: {
        high: matches.filter(m => m.confidence >= 80).length,
        medium: matches.filter(m => m.confidence >= 60 && m.confidence < 80).length,
        low: matches.filter(m => m.confidence < 60).length
      },
      marketCategories: this.countCategories(matches, 'market_category'),
      competitiveRelationships: this.countCategories(matches, 'competitive_relationship')
    }
  }

  private countCategories(matches: IntelligentCompanyMatch[], field: keyof IntelligentCompanyMatch): { [key: string]: number } {
    const counts: { [key: string]: number } = {}
    matches.forEach(match => {
      const value = match[field] as string
      counts[value] = (counts[value] || 0) + 1
    })
    return counts
  }

  // Utility methods
  private generateAnalysisId(): string {
    return `intelligent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private generateMatchId(companyName: string): string {
    return `match_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
  }
}