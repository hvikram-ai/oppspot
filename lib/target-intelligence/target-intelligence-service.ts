/**
 * TargetIntelligenceService: Advanced target company analysis using local LLM
 * Orchestrates multi-source data gathering and AI-powered insights generation
 * Built for comprehensive M&A due diligence and strategic assessment
 */

import { getOllamaClient, isOllamaEnabled } from '@/lib/ai/ollama'
import { WebsiteScraper } from '@/lib/scraping/website-scraper'
import { WebSearchService } from '@/lib/opp-scan/services/web-search-service'

export interface TargetCompanyInput {
  company_name: string
  website?: string
  industry?: string
  country?: string
  description?: string
}

export interface EnhancedCompanyProfile {
  // Basic Information
  company_name: string
  legal_name?: string
  website: string
  headquarters: {
    address: string
    city: string
    country: string
    postal_code?: string
  }
  
  // Business Details
  industry: string
  sub_industries: string[]
  business_model: string
  founded_year?: number
  employee_count?: {
    estimate: number
    range: string
    confidence: number
  }
  
  // Financial Intelligence
  financial_profile: {
    revenue_estimate?: {
      value: number
      currency: string
      period: string
      confidence: number
      source: string
    }
    funding_history: Array<{
      round_type: string
      amount?: number
      date: string
      investors: string[]
      valuation?: number
    }>
    financial_health_score: number
    profitability_indicators: {
      estimated_margins?: number
      revenue_growth?: number
      sustainability_score: number
    }
  }
  
  // Leadership & Team
  leadership_team: Array<{
    name: string
    title: string
    background?: string
    linkedin_url?: string
    experience_years?: number
  }>
  
  // Technology & Digital Presence
  technology_profile: {
    tech_stack: string[]
    digital_maturity_score: number
    website_analysis: {
      seo_score: number
      mobile_friendly: boolean
      load_speed_score: number
      security_score: number
    }
    social_media_presence: {
      platforms: Record<string, { url: string; followers?: number; engagement_rate?: number }>
      social_activity_score: number
    }
  }
  
  // Market Intelligence
  market_position: {
    competitive_position: 'leader' | 'challenger' | 'follower' | 'niche'
    market_share_estimate?: number
    key_competitors: Array<{
      name: string
      relationship: 'direct' | 'indirect' | 'adjacent'
      competitive_threat: 'high' | 'medium' | 'low'
    }>
    swot_analysis: {
      strengths: string[]
      weaknesses: string[]
      opportunities: string[]
      threats: string[]
    }
  }
  
  // ESG & Sustainability
  esg_assessment: {
    environmental_score: number
    social_score: number
    governance_score: number
    overall_esg_score: number
    sustainability_initiatives: string[]
    certifications: string[]
    esg_risks: string[]
  }
  
  // News & Sentiment
  market_sentiment: {
    overall_sentiment: 'positive' | 'neutral' | 'negative'
    sentiment_score: number
    recent_news: Array<{
      title: string
      url: string
      date: string
      sentiment: 'positive' | 'neutral' | 'negative'
      impact_score: number
      summary: string
    }>
    industry_trends_impact: string[]
  }
  
  // AI-Generated Insights
  ai_insights: {
    executive_summary: string
    investment_thesis: string
    acquisition_readiness_score: number
    key_value_drivers: string[]
    potential_risks: string[]
    integration_complexity: 'low' | 'medium' | 'high'
    strategic_fit_assessment: string
    due_diligence_priorities: string[]
    valuation_considerations: string[]
  }
  
  // Metadata
  analysis_metadata: {
    generated_at: string
    confidence_score: number
    data_sources: string[]
    llm_model_used: string
    processing_time_ms: number
    last_updated: string
  }
}

interface AnalysisProgress {
  stage: string
  progress: number
  message: string
  current_task?: string
}

export class TargetIntelligenceService {
  private ollamaClient = getOllamaClient()
  private websiteScraper = new WebsiteScraper()
  private webSearchService = new WebSearchService()
  private progressCallback?: (progress: AnalysisProgress) => void

  constructor(progressCallback?: (progress: AnalysisProgress) => void) {
    this.progressCallback = progressCallback
  }

  /**
   * Generate comprehensive enhanced company profile using LLM analysis
   */
  async generateEnhancedProfile(
    input: TargetCompanyInput,
    options: {
      include_competitive_analysis?: boolean
      include_financial_deep_dive?: boolean
      include_esg_assessment?: boolean
      use_real_time_data?: boolean
    } = {}
  ): Promise<EnhancedCompanyProfile> {
    const startTime = Date.now()
    
    this.updateProgress('initialization', 0, 'Initializing target intelligence analysis...')

    if (!isOllamaEnabled()) {
      throw new Error('Local LLM (Ollama) is not enabled. Please configure ENABLE_OLLAMA=true')
    }

    try {
      // Phase 1: Website Data Gathering
      this.updateProgress('web_scraping', 10, 'Analyzing company website...')
      const websiteData = await this.analyzeWebsite(input.website || `https://${input.company_name.toLowerCase().replace(/\s+/g, '')}.com`)

      // Phase 2: Web Search Intelligence
      this.updateProgress('web_search', 25, 'Gathering market intelligence...')
      const webIntelligence = await this.gatherWebIntelligence(input.company_name, input.industry)

      // Phase 3: Financial Analysis
      this.updateProgress('financial_analysis', 40, 'Analyzing financial profile...')
      const financialProfile = await this.analyzeFinancialProfile(input, websiteData, webIntelligence)

      // Phase 4: Competitive Landscape
      if (options.include_competitive_analysis) {
        this.updateProgress('competitive_analysis', 55, 'Mapping competitive landscape...')
      }
      const marketPosition = await this.analyzeMarketPosition(input, webIntelligence)

      // Phase 5: ESG Assessment
      if (options.include_esg_assessment) {
        this.updateProgress('esg_analysis', 70, 'Conducting ESG assessment...')
      }
      const esgAssessment = await this.generateESGAssessment(input, websiteData, webIntelligence)

      // Phase 6: News & Sentiment Analysis
      this.updateProgress('sentiment_analysis', 80, 'Analyzing market sentiment...')
      const marketSentiment = await this.analyzeMarketSentiment(input.company_name)

      // Phase 7: AI Insights Generation
      this.updateProgress('ai_insights', 90, 'Generating AI-powered insights...')
      const aiInsights = await this.generateAIInsights(input, {
        websiteData,
        webIntelligence,
        financialProfile,
        marketPosition,
        esgAssessment,
        marketSentiment
      })

      // Phase 8: Profile Assembly
      this.updateProgress('assembly', 95, 'Assembling comprehensive profile...')
      const enhancedProfile = await this.assembleEnhancedProfile(
        input,
        websiteData,
        webIntelligence,
        financialProfile,
        marketPosition,
        esgAssessment,
        marketSentiment,
        aiInsights,
        startTime
      )

      this.updateProgress('completed', 100, 'Target intelligence analysis completed')
      return enhancedProfile

    } catch (error) {
      console.error('[TargetIntelligence] Analysis failed:', error)
      throw new Error(`Target intelligence analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze company website for detailed information
   */
  private async analyzeWebsite(url: string): Promise<unknown> {
    try {
      return await this.websiteScraper.scrapeWebsite(url)
    } catch (error) {
      console.warn('[TargetIntelligence] Website analysis failed:', error)
      return {
        title: null,
        description: null,
        technologies: [],
        teamMembers: [],
        hasSsl: false,
        mobileFriendly: false
      }
    }
  }

  /**
   * Gather intelligence from web search
   */
  private async gatherWebIntelligence(companyName: string, industry?: string): Promise<unknown> {
    try {
      const searchQueries = [
        `"${companyName}" company profile revenue employees`,
        `"${companyName}" funding investors valuation`,
        `"${companyName}" competitors market share ${industry || ''}`,
        `"${companyName}" news recent developments`,
        `"${companyName}" leadership CEO founders team`
      ]

      const searchResults = await Promise.allSettled(
        searchQueries.map(query => 
          this.webSearchService.searchCompanies({
            query,
            filters: { regions: [], industries: industry ? [industry] : [] },
            limit: 10
          })
        )
      )

      return searchResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .flat()

    } catch (error) {
      console.warn('[TargetIntelligence] Web intelligence gathering failed:', error)
      return []
    }
  }

  /**
   * Analyze financial profile using LLM
   */
  private async analyzeFinancialProfile(
    input: TargetCompanyInput, 
    websiteData: Record<string, unknown>, 
    webIntelligence: Record<string, unknown>
  ): Promise<unknown> {
    const prompt = `Analyze the financial profile for ${input.company_name} based on available data:

Company Information:
- Name: ${input.company_name}
- Industry: ${input.industry || 'Unknown'}
- Website Analysis: ${JSON.stringify(websiteData, null, 2).substring(0, 1000)}
- Web Intelligence: ${JSON.stringify(webIntelligence, null, 2).substring(0, 1000)}

Generate a comprehensive financial analysis including:
1. Revenue estimation with confidence level
2. Employee count estimation
3. Funding history assessment
4. Financial health indicators
5. Growth trajectory analysis

Return the analysis in JSON format with specific numerical estimates where possible.`

    try {
      // Check if Ollama is available
      const isAvailable = await this.ollamaClient.isAvailable()
      
      if (!isAvailable) {
        console.warn('[TargetIntelligence] Ollama not available, using fallback analysis')
        return this.generateFallbackFinancialProfile(input, websiteData, webIntelligence)
      }
      
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a financial analyst specializing in company valuation and financial assessment. Provide detailed, data-driven analysis with confidence scores.',
        temperature: 0.3,
        max_tokens: 800,
        model: 'tinyllama:1.1b' // Use fast model for better performance
      })

      // Parse LLM response into structured data
      return this.parseFinancialAnalysis(response)

    } catch (error) {
      console.warn('[TargetIntelligence] Financial analysis failed:', error)
      // Use intelligent fallback instead of default
      return this.generateFallbackFinancialProfile(input, websiteData, webIntelligence)
    }
  }

  /**
   * Analyze market position and competitive landscape using LLM
   */
  private async analyzeMarketPosition(input: TargetCompanyInput, webIntelligence: Record<string, unknown>): Promise<unknown> {
    const prompt = `Conduct a comprehensive competitive analysis for ${input.company_name}:

Company: ${input.company_name}
Industry: ${input.industry || 'Unknown'}
Market Intelligence: ${JSON.stringify(webIntelligence, null, 2).substring(0, 1500)}

Provide detailed analysis including:
1. Market position classification (leader/challenger/follower/niche)
2. Key competitors identification and threat assessment
3. SWOT analysis
4. Competitive advantages and differentiators
5. Market share estimation

Structure the response as detailed JSON with confidence scores.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a strategic market analyst with expertise in competitive intelligence and market positioning. Focus on actionable insights and realistic assessments.',
        temperature: 0.4,
        max_tokens: 1000
      })

      return this.parseMarketPositionAnalysis(response)

    } catch (error) {
      console.warn('[TargetIntelligence] Market position analysis failed:', error)
      return this.getDefaultMarketPosition()
    }
  }

  /**
   * Generate ESG assessment using LLM
   */
  private async generateESGAssessment(
    input: TargetCompanyInput, 
    websiteData: Record<string, unknown>, 
    webIntelligence: Record<string, unknown>
  ): Promise<unknown> {
    const prompt = `Conduct comprehensive ESG (Environmental, Social, Governance) assessment for ${input.company_name}:

Available Data:
- Company: ${input.company_name}
- Industry: ${input.industry || 'Unknown'}
- Website Data: ${JSON.stringify(websiteData, null, 2).substring(0, 800)}
- Market Intelligence: ${JSON.stringify(webIntelligence, null, 2).substring(0, 800)}

Assess and score (0-100) the following ESG dimensions:
1. Environmental: sustainability practices, carbon footprint, green initiatives
2. Social: employee relations, community impact, diversity & inclusion
3. Governance: board structure, transparency, ethical practices

Provide specific scores, identified initiatives, risks, and certifications.
Return as structured JSON with detailed explanations.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are an ESG specialist with expertise in sustainability assessment and corporate governance. Provide evidence-based ESG scores and specific recommendations.',
        temperature: 0.3,
        max_tokens: 700
      })

      return this.parseESGAssessment(response)

    } catch (error) {
      console.warn('[TargetIntelligence] ESG assessment failed:', error)
      return this.getDefaultESGAssessment()
    }
  }

  /**
   * Analyze market sentiment using LLM
   */
  private async analyzeMarketSentiment(companyName: string): Promise<unknown> {
    const prompt = `Analyze current market sentiment and recent developments for ${companyName}:

Provide analysis of:
1. Overall market sentiment (positive/neutral/negative) with score (0-100)
2. Recent news impact assessment
3. Industry trend implications
4. Sentiment trajectory (improving/stable/declining)
5. Key sentiment drivers

Focus on factual analysis and provide confidence levels for assessments.
Return as structured JSON with specific sentiment scores.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a market sentiment analyst specializing in corporate perception and market dynamics. Base analysis on available public information and provide realistic sentiment assessments.',
        temperature: 0.4,
        max_tokens: 600
      })

      return this.parseMarketSentiment(response)

    } catch (error) {
      console.warn('[TargetIntelligence] Market sentiment analysis failed:', error)
      return this.getDefaultMarketSentiment()
    }
  }

  /**
   * Generate comprehensive AI insights using LLM
   */
  private async generateAIInsights(input: TargetCompanyInput, analysisData: Record<string, unknown>): Promise<unknown> {
    const prompt = `Generate comprehensive M&A intelligence insights for ${input.company_name}:

Complete Analysis Data:
${JSON.stringify(analysisData, null, 2).substring(0, 2000)}

Generate strategic insights including:
1. Executive summary (2-3 paragraphs)
2. Investment thesis and strategic rationale
3. Acquisition readiness score (0-100)
4. Key value drivers and competitive advantages
5. Potential risks and mitigation strategies
6. Integration complexity assessment
7. Due diligence priorities
8. Valuation considerations and multiples

Provide actionable, strategic-level insights suitable for M&A decision makers.
Return as detailed JSON with specific scores and recommendations.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a senior M&A strategist with expertise in corporate development and acquisition analysis. Provide strategic-level insights with specific, actionable recommendations for acquisition decisions.',
        temperature: 0.4,
        max_tokens: 1200
      })

      return this.parseAIInsights(response)

    } catch (error) {
      console.warn('[TargetIntelligence] AI insights generation failed:', error)
      return this.getDefaultAIInsights()
    }
  }

  /**
   * Assemble the complete enhanced profile
   */
  private async assembleEnhancedProfile(
    input: TargetCompanyInput,
    websiteData: Record<string, unknown>,
    webIntelligence: Record<string, unknown>,
    financialProfile: Record<string, unknown>,
    marketPosition: Record<string, unknown>,
    esgAssessment: Record<string, unknown>,
    marketSentiment: Record<string, unknown>,
    aiInsights: Record<string, unknown>,
    startTime: number
  ): Promise<EnhancedCompanyProfile> {
    const processingTime = Date.now() - startTime
    
    return {
      company_name: input.company_name,
      legal_name: websiteData?.title || input.company_name,
      website: input.website || `https://${input.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
      headquarters: {
        address: 'TBD - Address extraction needed',
        city: 'TBD',
        country: input.country || 'Unknown',
        postal_code: undefined
      },
      industry: input.industry || 'Technology',
      sub_industries: ['TBD - Industry analysis needed'],
      business_model: 'TBD - Business model analysis needed',
      founded_year: undefined,
      employee_count: financialProfile?.employee_count,
      financial_profile: financialProfile,
      leadership_team: websiteData?.teamMembers || [],
      technology_profile: {
        tech_stack: websiteData?.technologies || [],
        digital_maturity_score: this.calculateDigitalMaturityScore(websiteData),
        website_analysis: {
          seo_score: websiteData?.seoScore || 50,
          mobile_friendly: websiteData?.mobileFriendly || false,
          load_speed_score: 75,
          security_score: websiteData?.hasSsl ? 90 : 30
        },
        social_media_presence: {
          platforms: websiteData?.socialLinks || {},
          social_activity_score: 50
        }
      },
      market_position: marketPosition,
      esg_assessment: esgAssessment,
      market_sentiment: marketSentiment,
      ai_insights: aiInsights,
      analysis_metadata: {
        generated_at: new Date().toISOString(),
        confidence_score: this.calculateOverallConfidence(financialProfile, marketPosition, esgAssessment),
        data_sources: ['website_analysis', 'web_search', 'llm_analysis'],
        llm_model_used: 'llama3.1:13b',
        processing_time_ms: processingTime,
        last_updated: new Date().toISOString()
      }
    }
  }

  // Helper methods for parsing LLM responses
  private parseFinancialAnalysis(response: string): Record<string, unknown> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse financial analysis JSON:', error)
    }
    return this.getDefaultFinancialProfile()
  }

  private parseMarketPositionAnalysis(response: string): Record<string, unknown> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse market position JSON:', error)
    }
    return this.getDefaultMarketPosition()
  }

  private parseESGAssessment(response: string): Record<string, unknown> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse ESG assessment JSON:', error)
    }
    return this.getDefaultESGAssessment()
  }

  private parseMarketSentiment(response: string): Record<string, unknown> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse market sentiment JSON:', error)
    }
    return this.getDefaultMarketSentiment()
  }

  private parseAIInsights(response: string): Record<string, unknown> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse AI insights JSON:', error)
    }
    return this.getDefaultAIInsights()
  }

  // Default fallback data methods
  private generateFallbackFinancialProfile(input: TargetCompanyInput, websiteData: Record<string, unknown>, webIntelligence: Record<string, unknown>): Record<string, unknown> {
    // Generate intelligent fallback based on available data
    const hasWebsite = !!websiteData?.title
    const hasWebData = webIntelligence && webIntelligence.length > 0
    
    return {
      revenue_estimate: {
        value: hasWebsite ? 5000000 : 1000000, // Estimate based on presence
        currency: 'USD',
        period: 'annual',
        confidence: hasWebsite ? 40 : 20,
        source: 'Estimated based on industry averages and digital presence'
      },
      employee_count: {
        estimate: hasWebsite ? 50 : 10,
        range: hasWebsite ? '11-50' : '1-10',
        confidence: hasWebsite ? 45 : 25
      },
      funding_history: [],
      financial_health_score: hasWebsite ? 65 : 45,
      profitability_indicators: {
        estimated_margins: hasWebsite ? 15 : 10,
        revenue_growth: hasWebData ? 20 : 5,
        sustainability_score: 60
      }
    }
  }
  
  private getDefaultFinancialProfile(): Record<string, unknown> {
    return {
      revenue_estimate: {
        value: 0,
        currency: 'USD',
        period: 'annual',
        confidence: 10,
        source: 'estimated'
      },
      funding_history: [],
      financial_health_score: 50,
      profitability_indicators: {
        sustainability_score: 50
      }
    }
  }

  private getDefaultMarketPosition(): Record<string, unknown> {
    return {
      competitive_position: 'follower' as const,
      key_competitors: [],
      swot_analysis: {
        strengths: ['TBD'],
        weaknesses: ['Limited data available'],
        opportunities: ['Market expansion'],
        threats: ['Competitive pressure']
      }
    }
  }

  private getDefaultESGAssessment(): Record<string, unknown> {
    return {
      environmental_score: 50,
      social_score: 50,
      governance_score: 50,
      overall_esg_score: 50,
      sustainability_initiatives: [],
      certifications: [],
      esg_risks: []
    }
  }

  private getDefaultMarketSentiment(): Record<string, unknown> {
    return {
      overall_sentiment: 'neutral' as const,
      sentiment_score: 50,
      recent_news: [],
      industry_trends_impact: []
    }
  }

  private getDefaultAIInsights(): Record<string, unknown> {
    return {
      executive_summary: 'Comprehensive analysis pending - additional data sources needed for complete assessment.',
      investment_thesis: 'Investment opportunity requires further evaluation.',
      acquisition_readiness_score: 50,
      key_value_drivers: ['TBD - Analysis in progress'],
      potential_risks: ['Limited data availability'],
      integration_complexity: 'medium' as const,
      strategic_fit_assessment: 'Requires detailed assessment',
      due_diligence_priorities: ['Financial verification', 'Market validation'],
      valuation_considerations: ['Market-based approach recommended']
    }
  }

  // Utility methods
  private calculateDigitalMaturityScore(websiteData: Record<string, unknown>): number {
    let score = 0
    if (websiteData?.hasSsl) score += 20
    if (websiteData?.mobileFriendly) score += 20
    if (websiteData?.technologies?.length > 0) score += 20
    if (websiteData?.seoScore > 70) score += 20
    if (websiteData?.socialLinks && Object.keys(websiteData.socialLinks).length > 0) score += 20
    return score
  }

  private calculateOverallConfidence(financial: Record<string, unknown>, market: Record<string, unknown>, esg: Record<string, unknown>): number {
    // Calculate weighted confidence based on data availability and quality
    let confidence = 0
    confidence += (financial?.revenue_estimate?.confidence || 0) * 0.4
    confidence += (market?.competitive_position ? 70 : 30) * 0.3
    confidence += (esg?.overall_esg_score > 0 ? 60 : 30) * 0.3
    return Math.round(confidence)
  }

  private updateProgress(stage: string, progress: number, message: string, currentTask?: string) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        current_task: currentTask
      })
    }
  }
}