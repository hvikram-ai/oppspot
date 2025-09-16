/**
 * CompanyEnrichmentService: Multi-source data aggregation and validation
 * Enriches basic company information with comprehensive data from multiple sources
 * Designed for high-quality M&A intelligence and due diligence
 */

import { WebsiteScraper } from '@/lib/scraping/website-scraper'
import { getOllamaClient } from '@/lib/ai/ollama'

export interface CompanyEnrichmentRequest {
  company_name: string
  website?: string
  linkedin_url?: string
  industry?: string
  country?: string
  known_info?: Record<string, any>
}

export interface EnrichmentSource {
  source: string
  confidence: number
  timestamp: string
  data: Record<string, any>
}

export interface CompanyEnrichmentResult {
  company_name: string
  enriched_data: {
    // Company Details
    legal_name?: string
    trade_names: string[]
    registration_number?: string
    incorporation_date?: string
    company_type?: string
    
    // Location & Contact
    headquarters: {
      address?: string
      city?: string
      state?: string
      country: string
      postal_code?: string
      coordinates?: { lat: number; lng: number }
    }
    additional_offices: Array<{
      type: 'branch' | 'subsidiary' | 'sales' | 'r&d'
      address: string
      city: string
      country: string
    }>
    contact_info: {
      phone?: string
      email?: string
      website: string
      support_email?: string
      sales_email?: string
    }
    
    // Business Profile
    industry_classification: {
      primary_industry: string
      secondary_industries: string[]
      naics_codes: string[]
      sic_codes: string[]
    }
    business_description: {
      short_description: string
      long_description?: string
      tagline?: string
      mission_statement?: string
      value_proposition: string
    }
    
    // Size & Scale
    company_size: {
      employee_count?: {
        estimate: number
        range: string
        confidence: number
        source: string
      }
      annual_revenue?: {
        estimate: number
        currency: string
        fiscal_year: string
        confidence: number
        source: string
      }
      market_cap?: {
        value: number
        currency: string
        as_of_date: string
      }
    }
    
    // Products & Services
    offerings: {
      primary_products: string[]
      primary_services: string[]
      target_markets: string[]
      customer_segments: string[]
      pricing_model?: string
      distribution_channels: string[]
    }
    
    // Technology & Innovation
    technology_stack: {
      core_technologies: string[]
      programming_languages: string[]
      frameworks: string[]
      cloud_providers: string[]
      development_tools: string[]
      mobile_platforms: string[]
    }
    intellectual_property: {
      patents?: {
        total_count: number
        active_count: number
        key_patents: Array<{
          title: string
          patent_number: string
          filing_date: string
          status: string
        }>
      }
      trademarks?: Array<{
        name: string
        registration_number: string
        status: string
        classes: string[]
      }>
      copyrights?: string[]
    }
    
    // Financial Indicators
    financial_indicators: {
      public_company: boolean
      stock_symbol?: string
      exchange?: string
      funding_status?: 'bootstrapped' | 'seed' | 'series_a' | 'series_b' | 'series_c+' | 'ipo' | 'acquired'
      total_funding?: {
        amount: number
        currency: string
        last_round_date: string
      }
      key_investors?: Array<{
        name: string
        type: 'angel' | 'vc' | 'pe' | 'corporate' | 'government'
        investment_rounds: string[]
      }>
      financial_health_indicators: {
        credit_rating?: string
        debt_to_equity?: number
        profitability_trend?: 'improving' | 'stable' | 'declining'
      }
    }
    
    // Leadership & Organization
    leadership: {
      key_executives: Array<{
        name: string
        title: string
        tenure?: string
        background?: string
        linkedin_url?: string
        previous_companies?: string[]
      }>
      board_of_directors?: Array<{
        name: string
        role: string
        background?: string
        other_boards?: string[]
      }>
      organizational_structure?: {
        departments: string[]
        subsidiaries?: string[]
        parent_company?: string
      }
    }
    
    // Market Presence
    market_presence: {
      geographic_markets: string[]
      market_share_estimates?: Record<string, number>
      customer_base?: {
        total_customers?: number
        notable_clients: string[]
        customer_retention_rate?: number
      }
      partnerships: Array<{
        partner_name: string
        partnership_type: 'technology' | 'distribution' | 'strategic' | 'supplier'
        status: 'active' | 'inactive' | 'unknown'
      }>
    }
    
    // Digital Footprint
    digital_presence: {
      website_analysis: {
        domain_age?: number
        domain_authority?: number
        monthly_visitors?: number
        seo_keywords: string[]
        content_quality_score: number
        technical_seo_score: number
      }
      social_media: {
        platforms: Record<string, {
          url: string
          followers?: number
          engagement_rate?: number
          post_frequency?: string
          last_active?: string
        }>
        social_sentiment?: 'positive' | 'neutral' | 'negative'
      }
      online_reviews: {
        glassdoor?: {
          rating: number
          review_count: number
          employee_satisfaction: number
        }
        trustpilot?: {
          rating: number
          review_count: number
        }
        google_business?: {
          rating: number
          review_count: number
        }
      }
    }
  }
  
  // Enrichment Metadata
  enrichment_metadata: {
    sources_used: EnrichmentSource[]
    confidence_score: number
    completeness_score: number
    last_enriched: string
    data_freshness: {
      financial_data: string
      contact_info: string
      leadership_data: string
      market_data: string
    }
    gaps_identified: string[]
    recommended_actions: string[]
  }
}

export class CompanyEnrichmentService {
  private websiteScraper = new WebsiteScraper()
  private ollamaClient = getOllamaClient()
  
  /**
   * Enrich company data from multiple sources
   */
  async enrichCompanyData(request: CompanyEnrichmentRequest): Promise<CompanyEnrichmentResult> {
    const startTime = Date.now()
    const sources: EnrichmentSource[] = []
    
    try {
      // Source 1: Website Analysis
      const websiteData = await this.enrichFromWebsite(request, sources)
      
      // Source 2: LinkedIn Analysis (if URL provided)
      const linkedinData = await this.enrichFromLinkedIn(request, sources)
      
      // Source 3: Search Engine Intelligence
      const searchData = await this.enrichFromSearch(request, sources)
      
      // Source 4: Financial Data Providers
      const financialData = await this.enrichFromFinancialSources(request, sources)
      
      // Source 5: Patent and IP Databases
      const ipData = await this.enrichFromIPSources(request, sources)
      
      // Source 6: News and Media Analysis
      const mediaData = await this.enrichFromMediaSources(request, sources)
      
      // Consolidate and validate data using LLM
      const consolidatedData = await this.consolidateEnrichmentData(
        request,
        { websiteData, linkedinData, searchData, financialData, ipData, mediaData },
        sources
      )
      
      return {
        company_name: request.company_name,
        enriched_data: consolidatedData,
        enrichment_metadata: {
          sources_used: sources,
          confidence_score: this.calculateConfidenceScore(sources, consolidatedData),
          completeness_score: this.calculateCompletenessScore(consolidatedData),
          last_enriched: new Date().toISOString(),
          data_freshness: {
            financial_data: 'unknown',
            contact_info: 'recent',
            leadership_data: 'unknown',
            market_data: 'recent'
          },
          gaps_identified: this.identifyDataGaps(consolidatedData),
          recommended_actions: this.generateRecommendations(consolidatedData)
        }
      }
      
    } catch (error) {
      console.error('[CompanyEnrichment] Enrichment failed:', error)
      throw new Error(`Company enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Enrich data from company website
   */
  private async enrichFromWebsite(
    request: CompanyEnrichmentRequest, 
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    if (!request.website) {
      return null
    }
    
    try {
      const websiteData = await this.websiteScraper.scrapeWebsite(request.website)
      
      sources.push({
        source: 'website_analysis',
        confidence: 85,
        timestamp: new Date().toISOString(),
        data: websiteData
      })
      
      return websiteData
      
    } catch (error) {
      console.warn('[CompanyEnrichment] Website enrichment failed:', error)
      sources.push({
        source: 'website_analysis',
        confidence: 0,
        timestamp: new Date().toISOString(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      return null
    }
  }
  
  /**
   * Enrich data from LinkedIn (placeholder - would integrate with LinkedIn API)
   */
  private async enrichFromLinkedIn(
    request: CompanyEnrichmentRequest,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    // Placeholder for LinkedIn API integration
    // In production, this would use LinkedIn Company API
    
    sources.push({
      source: 'linkedin_api',
      confidence: 0,
      timestamp: new Date().toISOString(),
      data: { status: 'not_implemented' }
    })
    
    return null
  }
  
  /**
   * Enrich data from search engines
   */
  private async enrichFromSearch(
    request: CompanyEnrichmentRequest,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    try {
      // Use LLM to generate targeted search queries
      const searchQueries = await this.generateSearchQueries(request)
      
      // Simulate search results (in production, would use Google/Bing APIs)
      const searchResults = {
        company_info: [],
        financial_info: [],
        leadership_info: [],
        news_mentions: []
      }
      
      sources.push({
        source: 'search_engines',
        confidence: 60,
        timestamp: new Date().toISOString(),
        data: searchResults
      })
      
      return searchResults
      
    } catch (error) {
      console.warn('[CompanyEnrichment] Search enrichment failed:', error)
      return null
    }
  }
  
  /**
   * Enrich data from financial sources
   */
  private async enrichFromFinancialSources(
    request: CompanyEnrichmentRequest,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    // Placeholder for financial data providers (Yahoo Finance, Alpha Vantage, etc.)
    
    sources.push({
      source: 'financial_databases',
      confidence: 0,
      timestamp: new Date().toISOString(),
      data: { status: 'not_implemented' }
    })
    
    return null
  }
  
  /**
   * Enrich data from IP and patent databases
   */
  private async enrichFromIPSources(
    request: CompanyEnrichmentRequest,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    // Placeholder for patent database APIs (USPTO, Google Patents, etc.)
    
    sources.push({
      source: 'ip_databases',
      confidence: 0,
      timestamp: new Date().toISOString(),
      data: { status: 'not_implemented' }
    })
    
    return null
  }
  
  /**
   * Enrich data from media and news sources
   */
  private async enrichFromMediaSources(
    request: CompanyEnrichmentRequest,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    // Placeholder for news APIs (NewsAPI, Bing News, etc.)
    
    sources.push({
      source: 'media_sources',
      confidence: 0,
      timestamp: new Date().toISOString(),
      data: { status: 'not_implemented' }
    })
    
    return null
  }
  
  /**
   * Generate targeted search queries using LLM
   */
  private async generateSearchQueries(request: CompanyEnrichmentRequest): Promise<string[]> {
    const prompt = `Generate targeted web search queries to find comprehensive information about ${request.company_name}:

Company: ${request.company_name}
Industry: ${request.industry || 'Unknown'}
Country: ${request.country || 'Unknown'}

Generate 10-15 specific search queries to find:
1. Company financial information and revenue
2. Leadership team and key executives
3. Product and service offerings
4. Recent news and developments
5. Funding and investment history
6. Technology stack and innovations
7. Partnerships and acquisitions
8. Market position and competitors

Return as a JSON array of strings, each optimized for search engines.`

    try {
      const response = await this.ollamaClient.fastComplete(prompt, {
        system_prompt: 'You are a research specialist expert in web search optimization. Generate precise, effective search queries.',
        temperature: 0.4,
        max_tokens: 400
      })

      // Parse the response to extract search queries
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback to default queries
      return [
        `"${request.company_name}" revenue employees company profile`,
        `"${request.company_name}" CEO founder leadership team`,
        `"${request.company_name}" products services offerings`,
        `"${request.company_name}" funding investors valuation`,
        `"${request.company_name}" news recent developments`
      ]
      
    } catch (error) {
      console.warn('[CompanyEnrichment] Search query generation failed:', error)
      return [`"${request.company_name}" company information`]
    }
  }
  
  /**
   * Consolidate enrichment data using LLM
   */
  private async consolidateEnrichmentData(
    request: CompanyEnrichmentRequest,
    enrichmentData: Record<string, any>,
    sources: EnrichmentSource[]
  ): Promise<unknown> {
    const prompt = `Consolidate and structure comprehensive company data for ${request.company_name}:

Available Data Sources:
${JSON.stringify(enrichmentData, null, 2).substring(0, 3000)}

Create a comprehensive company profile with the following structure:
1. Legal and corporate details
2. Location and contact information
3. Industry classification and business description
4. Company size and financial indicators
5. Products, services, and market presence
6. Technology stack and intellectual property
7. Leadership team and organizational structure
8. Digital presence and online reputation

Resolve any conflicts between sources, prioritize higher-confidence data, and fill gaps with reasonable estimates where possible.
Return as structured JSON matching the CompanyEnrichmentResult format.`

    try {
      const response = await this.ollamaClient.complete(prompt, {
        system_prompt: 'You are a data analyst specializing in company intelligence consolidation. Create comprehensive, accurate company profiles by synthesizing multiple data sources.',
        temperature: 0.3,
        max_tokens: 1500
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch (parseError) {
          console.warn('[CompanyEnrichment] Failed to parse consolidated data:', parseError)
        }
      }
      
      // Return default structure if parsing fails
      return this.getDefaultEnrichedData(request)
      
    } catch (error) {
      console.warn('[CompanyEnrichment] Data consolidation failed:', error)
      return this.getDefaultEnrichedData(request)
    }
  }
  
  /**
   * Calculate confidence score based on source reliability
   */
  private calculateConfidenceScore(sources: EnrichmentSource[], data: Record<string, unknown>): number {
    if (sources.length === 0) return 0
    
    const totalConfidence = sources.reduce((sum, source) => sum + source.confidence, 0)
    const avgConfidence = totalConfidence / sources.length
    
    // Adjust based on data completeness
    const completenessBonus = this.calculateCompletenessScore(data) * 0.2
    
    return Math.min(100, Math.round(avgConfidence + completenessBonus))
  }
  
  /**
   * Calculate data completeness score
   */
  private calculateCompletenessScore(data: Record<string, unknown>): number {
    const requiredFields = [
      'headquarters', 'industry_classification', 'business_description',
      'company_size', 'offerings', 'leadership', 'digital_presence'
    ]
    
    let filledFields = 0
    for (const field of requiredFields) {
      if (data[field] && Object.keys(data[field]).length > 0) {
        filledFields++
      }
    }
    
    return Math.round((filledFields / requiredFields.length) * 100)
  }
  
  /**
   * Identify data gaps for improvement
   */
  private identifyDataGaps(data: Record<string, unknown>): string[] {
    const gaps: string[] = []
    
    if (!data.company_size?.employee_count) gaps.push('Employee count estimation')
    if (!data.company_size?.annual_revenue) gaps.push('Revenue information')
    if (!data.leadership?.key_executives?.length) gaps.push('Leadership team details')
    if (!data.financial_indicators?.funding_status) gaps.push('Funding and investment history')
    if (!data.offerings?.primary_products?.length) gaps.push('Product/service portfolio')
    if (!data.technology_stack?.core_technologies?.length) gaps.push('Technology stack analysis')
    
    return gaps
  }
  
  /**
   * Generate recommendations for data improvement
   */
  private generateRecommendations(data: Record<string, unknown>): string[] {
    const recommendations: string[] = []
    
    const completeness = this.calculateCompletenessScore(data)
    
    if (completeness < 70) {
      recommendations.push('Conduct deeper web research for missing data points')
    }
    
    if (!data.financial_indicators?.public_company) {
      recommendations.push('Check SEC filings for financial disclosures')
    }
    
    if (!data.leadership?.key_executives?.length) {
      recommendations.push('Research LinkedIn for leadership team information')
    }
    
    if (!data.market_presence?.partnerships?.length) {
      recommendations.push('Analyze press releases for partnership announcements')
    }
    
    recommendations.push('Set up monitoring for ongoing company intelligence updates')
    
    return recommendations
  }
  
  /**
   * Get default enriched data structure
   */
  private getDefaultEnrichedData(request: CompanyEnrichmentRequest): Record<string, unknown> {
    return {
      legal_name: request.company_name,
      trade_names: [request.company_name],
      headquarters: {
        country: request.country || 'Unknown'
      },
      additional_offices: [],
      contact_info: {
        website: request.website || ''
      },
      industry_classification: {
        primary_industry: request.industry || 'Unknown',
        secondary_industries: [],
        naics_codes: [],
        sic_codes: []
      },
      business_description: {
        short_description: `${request.company_name} company profile`,
        value_proposition: 'To be determined through further analysis'
      },
      company_size: {},
      offerings: {
        primary_products: [],
        primary_services: [],
        target_markets: [],
        customer_segments: [],
        distribution_channels: []
      },
      technology_stack: {
        core_technologies: [],
        programming_languages: [],
        frameworks: [],
        cloud_providers: [],
        development_tools: [],
        mobile_platforms: []
      },
      intellectual_property: {},
      financial_indicators: {
        public_company: false,
        financial_health_indicators: {}
      },
      leadership: {
        key_executives: [],
        organizational_structure: {
          departments: []
        }
      },
      market_presence: {
        geographic_markets: [],
        customer_base: {
          notable_clients: []
        },
        partnerships: []
      },
      digital_presence: {
        website_analysis: {
          seo_keywords: [],
          content_quality_score: 50,
          technical_seo_score: 50
        },
        social_media: {
          platforms: {}
        },
        online_reviews: {}
      }
    }
  }
}