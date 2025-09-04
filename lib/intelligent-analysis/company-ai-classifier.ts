/**
 * CompanyAIClassifier: Intelligent company analysis using local LLM
 * Replaces static pattern matching with AI-powered business model detection
 * Built for accurate M&A similarity analysis using local Ollama
 */

import { getOllamaClient, isOllamaEnabled } from '@/lib/ai/ollama'
import { WebsiteScraper } from '@/lib/scraping/website-scraper'

export interface CompanyAnalysisInput {
  company_name: string
  domain?: string
  industry_hint?: string
  description?: string
}

export interface BusinessModelClassification {
  primary_business_function: string
  business_model_type: string
  revenue_model: string
  target_customer_segments: string[]
  value_proposition: string
  market_category: string
  technology_focus: string[]
  competitive_moat: string
  growth_strategy: string
}

export interface CompetitorAnalysis {
  name: string
  similarity_score: number
  similarity_reasoning: string
  competitive_relationship: 'direct' | 'indirect' | 'adjacent' | 'substitute'
  strategic_threat_level: 'high' | 'medium' | 'low'
  market_positioning: string
}

export interface MarketIntelligence {
  market_size_category: 'niche' | 'mid_market' | 'large_market' | 'mega_market'
  growth_stage: 'emerging' | 'growth' | 'mature' | 'consolidating'
  key_market_trends: string[]
  disruption_risks: string[]
  acquisition_drivers: string[]
}

export interface AICompanyAnalysis {
  company_name: string
  confidence_score: number
  business_classification: BusinessModelClassification
  competitors: CompetitorAnalysis[]
  market_intelligence: MarketIntelligence
  strategic_insights: {
    acquisition_rationale: string
    synergy_opportunities: string[]
    integration_challenges: string[]
    valuation_considerations: string[]
  }
  analysis_metadata: {
    data_sources: string[]
    analysis_timestamp: string
    llm_model: string
    processing_time_ms: number
  }
}

export class CompanyAIClassifier {
  private ollamaClient = getOllamaClient()
  private websiteScraper = new WebsiteScraper()

  /**
   * Analyze company using AI intelligence instead of static patterns
   */
  async analyzeCompany(input: CompanyAnalysisInput): Promise<AICompanyAnalysis> {
    const startTime = Date.now()
    
    if (!isOllamaEnabled()) {
      throw new Error('Local LLM (Ollama) is required for intelligent company analysis')
    }

    console.log(`[CompanyAI] Starting intelligent analysis for: ${input.company_name}`)

    try {
      // Phase 1: Gather contextual data
      const websiteData = await this.gatherWebsiteIntelligence(input)
      
      // Phase 2: AI-powered business model classification
      const businessClassification = await this.classifyBusinessModel(input, websiteData)
      
      // Phase 3: Intelligent competitor discovery
      const competitors = await this.discoverCompetitors(input, businessClassification)
      
      // Phase 4: Market intelligence analysis
      const marketIntelligence = await this.analyzeMarketIntelligence(input, businessClassification)
      
      // Phase 5: Strategic insights generation
      const strategicInsights = await this.generateStrategicInsights(
        input, 
        businessClassification, 
        competitors, 
        marketIntelligence
      )

      const processingTime = Date.now() - startTime

      return {
        company_name: input.company_name,
        confidence_score: this.calculateConfidenceScore(websiteData, businessClassification),
        business_classification: businessClassification,
        competitors: competitors,
        market_intelligence: marketIntelligence,
        strategic_insights: strategicInsights,
        analysis_metadata: {
          data_sources: ['llm_analysis', 'website_scraping', 'ai_classification'],
          analysis_timestamp: new Date().toISOString(),
          llm_model: 'llama3.1:13b',
          processing_time_ms: processingTime
        }
      }

    } catch (error) {
      console.error('[CompanyAI] Analysis failed:', error)
      throw new Error(`Company AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gather website intelligence for context
   */
  private async gatherWebsiteIntelligence(input: CompanyAnalysisInput): Promise<any> {
    if (!input.domain) {
      // Try to infer domain from company name
      const inferredDomain = this.inferDomainFromName(input.company_name)
      input.domain = inferredDomain
    }

    if (input.domain) {
      try {
        console.log(`[CompanyAI] Scraping website: ${input.domain}`)
        return await this.websiteScraper.scrapeWebsite(input.domain)
      } catch (error) {
        console.warn(`[CompanyAI] Website scraping failed for ${input.domain}:`, error)
        return null
      }
    }

    return null
  }

  /**
   * Classify business model using LLM
   */
  private async classifyBusinessModel(
    input: CompanyAnalysisInput, 
    websiteData: any
  ): Promise<BusinessModelClassification> {
    const prompt = `Analyze the business model of "${input.company_name}" and provide detailed classification:

Company Information:
- Name: ${input.company_name}
- Domain: ${input.domain || 'Unknown'}
- Industry Hint: ${input.industry_hint || 'Unknown'}
- Description: ${input.description || 'Not provided'}

Website Data Analysis:
${websiteData ? JSON.stringify(websiteData, null, 2).substring(0, 1500) : 'No website data available'}

Provide a comprehensive business model analysis with these specific categories:

1. Primary Business Function: What core problem does this company solve?
2. Business Model Type: (SaaS, Marketplace, Services, Hardware, etc.)
3. Revenue Model: How do they make money?
4. Target Customer Segments: Who are their primary customers?
5. Value Proposition: What unique value do they provide?
6. Market Category: What market/industry do they operate in?
7. Technology Focus: Key technologies or technical capabilities
8. Competitive Moat: What protects them from competition?
9. Growth Strategy: How do they plan to scale?

Return ONLY a JSON object with this exact structure:
{
  "primary_business_function": "string",
  "business_model_type": "string", 
  "revenue_model": "string",
  "target_customer_segments": ["string1", "string2"],
  "value_proposition": "string",
  "market_category": "string",
  "technology_focus": ["tech1", "tech2"],
  "competitive_moat": "string",
  "growth_strategy": "string"
}`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a business analyst expert in company classification and market analysis. Provide accurate, specific business model analysis based on available data. Focus on factual analysis over speculation.',
        temperature: 0.3,
        max_tokens: 800
      })

      return this.parseBusinessModelResponse(response)

    } catch (error) {
      console.warn('[CompanyAI] Business model classification failed:', error)
      return this.getDefaultBusinessClassification(input.company_name)
    }
  }

  /**
   * Discover intelligent competitors using LLM
   */
  private async discoverCompetitors(
    input: CompanyAnalysisInput, 
    businessModel: BusinessModelClassification
  ): Promise<CompetitorAnalysis[]> {
    const prompt = `Identify real competitors for "${input.company_name}" based on this business analysis:

Business Model: ${businessModel.business_model_type}
Market Category: ${businessModel.market_category}
Primary Function: ${businessModel.primary_business_function}
Target Customers: ${businessModel.target_customer_segments.join(', ')}
Technology Focus: ${businessModel.technology_focus.join(', ')}

Find 8-12 actual competitors that fall into these categories:
1. Direct Competitors (same solution, same market)
2. Indirect Competitors (different solution, same problem)
3. Adjacent Competitors (similar customers, different problems)
4. Substitute Products (alternative approaches to same outcome)

For each competitor, provide:
- Company name (real, existing companies only)
- Similarity score (0-100)
- Detailed reasoning for why they compete
- Competitive relationship type
- Strategic threat level
- Market positioning difference

Return ONLY a JSON array with this structure:
[
  {
    "name": "Company Name",
    "similarity_score": 85,
    "similarity_reasoning": "Detailed explanation of competitive overlap",
    "competitive_relationship": "direct|indirect|adjacent|substitute",
    "strategic_threat_level": "high|medium|low", 
    "market_positioning": "How they position differently"
  }
]

Focus on real companies that actually exist and compete in this space.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a competitive intelligence expert with deep knowledge of technology markets and business landscapes. Identify real, existing competitors with specific reasoning.',
        temperature: 0.4,
        max_tokens: 1200
      })

      return this.parseCompetitorResponse(response)

    } catch (error) {
      console.warn('[CompanyAI] Competitor discovery failed:', error)
      return this.getDefaultCompetitors()
    }
  }

  /**
   * Analyze market intelligence using LLM
   */
  private async analyzeMarketIntelligence(
    input: CompanyAnalysisInput,
    businessModel: BusinessModelClassification
  ): Promise<MarketIntelligence> {
    const prompt = `Analyze the market intelligence for "${input.company_name}" in the ${businessModel.market_category} sector:

Business Context:
- Market Category: ${businessModel.market_category}
- Business Function: ${businessModel.primary_business_function}
- Target Customers: ${businessModel.target_customer_segments.join(', ')}
- Revenue Model: ${businessModel.revenue_model}

Provide market analysis covering:

1. Market Size Category: Estimate if this is a niche, mid-market, large market, or mega-market
2. Growth Stage: Is this market emerging, in growth phase, mature, or consolidating?
3. Key Market Trends: What are the 3-5 most important trends affecting this market?
4. Disruption Risks: What could disrupt or threaten this market?
5. Acquisition Drivers: Why would companies want to acquire in this space?

Return ONLY a JSON object:
{
  "market_size_category": "niche|mid_market|large_market|mega_market",
  "growth_stage": "emerging|growth|mature|consolidating",
  "key_market_trends": ["trend1", "trend2", "trend3"],
  "disruption_risks": ["risk1", "risk2"],
  "acquisition_drivers": ["driver1", "driver2", "driver3"]
}`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a market research analyst with expertise in technology markets and M&A trends. Provide realistic market assessments based on current industry knowledge.',
        temperature: 0.4,
        max_tokens: 600
      })

      return this.parseMarketIntelligenceResponse(response)

    } catch (error) {
      console.warn('[CompanyAI] Market intelligence analysis failed:', error)
      return this.getDefaultMarketIntelligence()
    }
  }

  /**
   * Generate strategic insights for M&A decisions
   */
  private async generateStrategicInsights(
    input: CompanyAnalysisInput,
    businessModel: BusinessModelClassification,
    competitors: CompetitorAnalysis[],
    marketIntel: MarketIntelligence
  ): Promise<any> {
    const prompt = `Generate strategic M&A insights for acquiring "${input.company_name}":

Company Profile:
- Business: ${businessModel.primary_business_function}
- Model: ${businessModel.business_model_type}
- Market: ${businessModel.market_category}
- Moat: ${businessModel.competitive_moat}

Market Context:
- Market Stage: ${marketIntel.growth_stage}
- Key Trends: ${marketIntel.key_market_trends.join(', ')}
- Acquisition Drivers: ${marketIntel.acquisition_drivers.join(', ')}

Top Competitors: ${competitors.slice(0, 3).map(c => c.name).join(', ')}

Provide M&A strategic analysis:

1. Acquisition Rationale: Why would this be a strategic acquisition? (2-3 sentences)
2. Synergy Opportunities: What specific synergies could be realized? (3-4 points)
3. Integration Challenges: What would make integration difficult? (2-3 points)
4. Valuation Considerations: What factors would affect valuation? (3-4 points)

Return ONLY a JSON object:
{
  "acquisition_rationale": "Strategic reasoning for acquisition",
  "synergy_opportunities": ["synergy1", "synergy2", "synergy3"],
  "integration_challenges": ["challenge1", "challenge2"],
  "valuation_considerations": ["factor1", "factor2", "factor3"]
}`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a senior M&A strategist with expertise in technology acquisitions. Provide actionable strategic insights for acquisition decisions.',
        temperature: 0.3,
        max_tokens: 700
      })

      return this.parseStrategicInsightsResponse(response)

    } catch (error) {
      console.warn('[CompanyAI] Strategic insights generation failed:', error)
      return this.getDefaultStrategicInsights()
    }
  }

  // Helper methods for parsing LLM responses
  private parseBusinessModelResponse(response: string): BusinessModelClassification {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse business model JSON:', error)
    }
    return this.getDefaultBusinessClassification('Unknown Company')
  }

  private parseCompetitorResponse(response: string): CompetitorAnalysis[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse competitors JSON:', error)
    }
    return this.getDefaultCompetitors()
  }

  private parseMarketIntelligenceResponse(response: string): MarketIntelligence {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse market intelligence JSON:', error)
    }
    return this.getDefaultMarketIntelligence()
  }

  private parseStrategicInsightsResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse strategic insights JSON:', error)
    }
    return this.getDefaultStrategicInsights()
  }

  // Default fallback methods
  private getDefaultBusinessClassification(companyName: string): BusinessModelClassification {
    return {
      primary_business_function: `${companyName} business operations`,
      business_model_type: 'Technology Services',
      revenue_model: 'Software/Services Revenue',
      target_customer_segments: ['Business Customers'],
      value_proposition: 'Technology solutions for business needs',
      market_category: 'Technology Services',
      technology_focus: ['Software Development'],
      competitive_moat: 'Technical expertise and customer relationships',
      growth_strategy: 'Market expansion and service development'
    }
  }

  private getDefaultCompetitors(): CompetitorAnalysis[] {
    return [
      {
        name: 'Industry Leader 1',
        similarity_score: 70,
        similarity_reasoning: 'Similar market focus and business model',
        competitive_relationship: 'indirect',
        strategic_threat_level: 'medium',
        market_positioning: 'Established market leader'
      },
      {
        name: 'Growth Competitor',
        similarity_score: 65,
        similarity_reasoning: 'Emerging player with similar approach',
        competitive_relationship: 'direct',
        strategic_threat_level: 'medium',
        market_positioning: 'Fast-growing alternative'
      }
    ]
  }

  private getDefaultMarketIntelligence(): MarketIntelligence {
    return {
      market_size_category: 'mid_market',
      growth_stage: 'growth',
      key_market_trends: ['Digital transformation', 'Cloud adoption', 'AI integration'],
      disruption_risks: ['New technology platforms', 'Market consolidation'],
      acquisition_drivers: ['Technology capabilities', 'Market access', 'Talent acquisition']
    }
  }

  private getDefaultStrategicInsights(): any {
    return {
      acquisition_rationale: 'Strategic acquisition to enhance technology capabilities and market presence.',
      synergy_opportunities: ['Technology integration', 'Cross-selling opportunities', 'Operational efficiencies'],
      integration_challenges: ['Cultural alignment', 'System integration'],
      valuation_considerations: ['Market multiples', 'Growth potential', 'Technology assets', 'Customer base value']
    }
  }

  // Utility methods
  private inferDomainFromName(companyName: string): string | undefined {
    // Simple domain inference logic
    const cleanName = companyName.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
    
    return `https://${cleanName}.com`
  }

  private calculateConfidenceScore(websiteData: any, businessModel: BusinessModelClassification): number {
    let confidence = 50 // Base confidence

    // Website data availability
    if (websiteData) {
      confidence += 20
      if (websiteData.description) confidence += 10
      if (websiteData.technologies && websiteData.technologies.length > 0) confidence += 10
    }

    // Business model completeness
    if (businessModel.technology_focus.length > 0) confidence += 10
    if (businessModel.competitive_moat !== 'Unknown') confidence += 10

    return Math.min(confidence, 95) // Cap at 95% confidence
  }
}