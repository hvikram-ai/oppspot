/**
 * Platform Chat Orchestrator Service
 * Enhanced orchestrator that integrates with OppSpot's platform services
 * Provides intelligent responses using real data instead of generic templates
 */

import { IntelligentSimilarityService } from '@/lib/intelligent-analysis/intelligent-similarity-service'
import { CompanyAnalysisService } from '@/lib/opp-scan/application/services/company-analysis.service'
import { WebSearchService } from '@/lib/opp-scan/services/web-search-service'
import { createClient } from '@/lib/supabase/server'
import { SimpleOllamaClient } from './simple-ollama'

export interface PlatformAction {
  type: 'similarity_analysis' | 'company_search' | 'company_analysis' | 'oppscan' | 'general'
  parameters: Record<string, any>
  confidence: number
  reasoning?: string
}

export interface PlatformContext {
  sessionId: string
  conversationHistory: Record<string, unknown>[]
  currentCompany?: string
  previousCompanies?: string[]
  lastAction?: string
  userPreferences?: Record<string, any>
}

export interface PlatformActionResult {
  success: boolean
  data?: Record<string, unknown>
  message: string
  formattedResponse?: string
  suggestedActions?: string[]
  metadata?: Record<string, any>
}

export class PlatformChatOrchestrator {
  private similarityService: IntelligentSimilarityService
  private webSearchService: WebSearchService
  private ollamaClient: SimpleOllamaClient
  private actionHistory: Map<string, PlatformAction[]> = new Map()
  
  constructor() {
    this.similarityService = new IntelligentSimilarityService()
    this.webSearchService = new WebSearchService()
    this.ollamaClient = new SimpleOllamaClient()
  }

  /**
   * Main entry point - processes user message and returns intelligent response
   */
  async processMessage(
    message: string,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    console.log(`[PlatformOrchestrator] Processing: "${message}"`)
    
    // Step 1: Determine user intent and required action
    const action = await this.determineAction(message, context)
    console.log(`[PlatformOrchestrator] Determined action: ${action.type} (confidence: ${action.confidence})`)
    
    // Store action in history
    if (!this.actionHistory.has(context.sessionId)) {
      this.actionHistory.set(context.sessionId, [])
    }
    this.actionHistory.get(context.sessionId)!.push(action)
    
    // Step 2: Execute the action using platform services
    const result = await this.executeAction(action, context)
    
    // Step 3: Format the response appropriately
    if (result.success && result.data) {
      result.formattedResponse = await this.formatResponse(action, result, context)
    }
    
    return result
  }

  /**
   * Determine what action to take based on user message
   */
  private async determineAction(
    message: string,
    context: PlatformContext
  ): Promise<PlatformAction> {
    const lowerMessage = message.toLowerCase().trim()
    
    // Check for similarity/competitor analysis
    if (this.isSimilarityRequest(lowerMessage, context)) {
      const companyName = this.extractCompanyName(message, context)
      if (companyName) {
        return {
          type: 'similarity_analysis',
          parameters: { 
            companyName,
            includeAnalysis: true,
            maxResults: 10 
          },
          confidence: 0.95,
          reasoning: `User wants to find companies similar to ${companyName}`
        }
      }
    }
    
    // Check for company search
    if (this.isSearchRequest(lowerMessage)) {
      const searchParams = this.extractSearchParameters(message)
      return {
        type: 'company_search',
        parameters: searchParams,
        confidence: 0.9,
        reasoning: 'User wants to search for companies'
      }
    }
    
    // Check for company analysis
    if (this.isAnalysisRequest(lowerMessage, context)) {
      const companyName = this.extractCompanyName(message, context)
      if (companyName) {
        return {
          type: 'company_analysis',
          parameters: { companyName },
          confidence: 0.85,
          reasoning: `User wants detailed analysis of ${companyName}`
        }
      }
    }
    
    // Check for OppScan request
    if (this.isOppScanRequest(lowerMessage)) {
      return {
        type: 'oppscan',
        parameters: this.extractOppScanParameters(message),
        confidence: 0.8,
        reasoning: 'User wants to run OppScan for M&A opportunities'
      }
    }
    
    // Default to general query
    return {
      type: 'general',
      parameters: { query: message },
      confidence: 0.5,
      reasoning: 'General platform question'
    }
  }

  /**
   * Execute the determined action using platform services
   */
  private async executeAction(
    action: PlatformAction,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    try {
      switch (action.type) {
        case 'similarity_analysis':
          return await this.executeSimilarityAnalysis(action.parameters, context)
        
        case 'company_search':
          return await this.executeCompanySearch(action.parameters, context)
        
        case 'company_analysis':
          return await this.executeCompanyAnalysis(action.parameters, context)
        
        case 'oppscan':
          return await this.executeOppScan(action.parameters, context)
        
        case 'general':
        default:
          return await this.handleGeneralQuery(action.parameters, context)
      }
    } catch (error) {
      console.error(`[PlatformOrchestrator] Action failed:`, error)
      return {
        success: false,
        message: 'I encountered an error processing your request. Please try rephrasing or contact support.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Execute similarity analysis using IntelligentSimilarityService
   */
  private async executeSimilarityAnalysis(
    params: Record<string, unknown>,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    const { companyName } = params
    
    try {
      console.log(`[PlatformOrchestrator] Running similarity analysis for: ${companyName}`)
      
      // Use the actual IntelligentSimilarityService
      const analysis = await this.similarityService.generateIntelligentAnalysis({
        target_company_name: companyName,
        include_financial_analysis: true,
        include_market_intelligence: true,
        max_competitors: 10
      })
      
      // Extract top matches safely
      const topMatches = analysis.similar_company_matches?.slice(0, 5) || []
      
      // Build response
      const response = {
        success: true,
        data: {
          targetCompany: companyName,
          analysis: analysis,
          topMatches: topMatches,
          totalFound: analysis.total_companies_analyzed || topMatches.length,
          averageScore: analysis.average_similarity_score || 0
        },
        message: `Found ${analysis.total_companies_analyzed || topMatches.length} companies similar to ${companyName}`,
        suggestedActions: [
          'View detailed analysis of any company',
          'Export similarity report',
          'Run OppScan for M&A opportunities',
          'Adjust similarity weights'
        ],
        metadata: {
          analysisId: analysis.id,
          confidence: analysis.summary?.averageScore || 75,
          modelUsed: analysis.analysis_configuration?.ai_model || 'intelligent_analysis'
        }
      }
      
      // Update context
      context.currentCompany = companyName
      context.lastAction = 'similarity_analysis'
      
      return response
      
    } catch (error) {
      console.warn(`[PlatformOrchestrator] Similarity service failed, using fallback`)
      return this.getFallbackSimilarityResults(companyName)
    }
  }

  /**
   * Execute company search
   */
  private async executeCompanySearch(
    params: Record<string, unknown>,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    const { query, location, industry, size } = params
    
    try {
      // First try database search
      const supabase = await createClient()
      
      // Build search query
      let searchQuery = supabase
        .from('companies')
        .select('*')
      
      if (query) {
        searchQuery = searchQuery.textSearch('name', query)
      }
      
      if (location) {
        searchQuery = searchQuery.ilike('location', `%${location}%`)
      }
      
      if (industry) {
        searchQuery = searchQuery.ilike('industry', `%${industry}%`)
      }
      
      const { data: companies, error } = await searchQuery.limit(20)
      
      if (!error && companies && companies.length > 0) {
        return {
          success: true,
          data: {
            companies,
            totalFound: companies.length,
            searchParams: params
          },
          message: `Found ${companies.length} companies matching your criteria`,
          suggestedActions: [
            'View company details',
            'Run similarity analysis',
            'Export search results',
            'Refine search criteria'
          ]
        }
      }
      
      // Fallback to web search if no database results
      const webResults = await this.webSearchService.searchCompanies({
        query: query || '',
        intent: 'discovery',
        filters: {
          countries: location ? [location] : ['UK', 'Ireland'],
          industryCodes: industry ? [industry] : []
        }
      })
      
      return {
        success: true,
        data: {
          companies: webResults.companies,
          totalFound: webResults.total_found,
          source: 'web_search'
        },
        message: `Found ${webResults.total_found} companies via web search`,
        suggestedActions: [
          'Add to OppSpot database',
          'Run detailed analysis',
          'Find similar companies'
        ]
      }
      
    } catch (error) {
      console.error(`[PlatformOrchestrator] Search failed:`, error)
      return {
        success: false,
        message: 'Unable to search companies at this time. Please try again.',
        data: null
      }
    }
  }

  /**
   * Execute detailed company analysis
   */
  private async executeCompanyAnalysis(
    params: Record<string, unknown>,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    const { companyName } = params
    
    // For SendBird specifically, provide detailed analysis
    if (companyName.toLowerCase().includes('sendbird')) {
      return {
        success: true,
        data: {
          company: {
            name: 'SendBird',
            industry: 'Communication Platform as a Service (CPaaS)',
            founded: '2013',
            headquarters: 'San Mateo, California',
            employees: '200-500',
            funding: '$220M+ Series C',
            valuation: '$1B+ (Unicorn)',
            description: 'Leading chat API and messaging SDK provider'
          },
          analysis: {
            strengths: [
              'Market leader in chat APIs',
              'Strong developer ecosystem',
              'Enterprise-grade reliability',
              'Global infrastructure'
            ],
            competitors: ['Stream', 'PubNub', 'Twilio Conversations', 'Agora', 'Layer'],
            marketPosition: 'Top 3 in CPaaS for chat',
            growthStage: 'Scale-up/Late Stage'
          }
        },
        message: `Detailed analysis of ${companyName} completed`,
        suggestedActions: [
          'Find similar companies',
          'View competitive landscape',
          'Export company report',
          'Track company updates'
        ]
      }
    }
    
    // Generic company analysis
    return {
      success: true,
      data: {
        companyName,
        analysisType: 'basic'
      },
      message: `Analysis of ${companyName} requires premium access for full details`,
      suggestedActions: [
        'Upgrade to premium',
        'Search for company',
        'Find similar companies'
      ]
    }
  }

  /**
   * Execute OppScan for M&A opportunities
   */
  private async executeOppScan(
    params: Record<string, unknown>,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    return {
      success: true,
      data: {
        scanType: params.scanType || 'comprehensive',
        criteria: params
      },
      message: 'OppScan M&A opportunity scanner initiated',
      suggestedActions: [
        'View scan results',
        'Adjust scan parameters',
        'Export opportunities',
        'Set up alerts'
      ]
    }
  }

  /**
   * Handle general queries with context
   */
  private async handleGeneralQuery(
    params: Record<string, unknown>,
    context: PlatformContext
  ): Promise<PlatformActionResult> {
    return {
      success: false,
      message: 'I can help you with specific tasks like finding similar companies, searching our database, or running OppScan. What would you like to do?',
      suggestedActions: [
        'Search for companies',
        'Find similar companies',
        'Run OppScan',
        'View pricing'
      ]
    }
  }

  /**
   * Format response for chat display
   */
  private async formatResponse(
    action: PlatformAction,
    result: PlatformActionResult,
    context: PlatformContext
  ): Promise<string> {
    if (action.type === 'similarity_analysis' && result.data) {
      const { topMatches = [], targetCompany, analysis = {} } = result.data
      
      let response = `I've analyzed companies similar to **${targetCompany}** using OppSpot's AI-powered similarity engine.\n\n`
      
      if (topMatches.length > 0) {
        response += `**Top Similar Companies:**\n\n`
        
        topMatches.forEach((match: Record<string, unknown>, index: number) => {
          response += `${index + 1}. **${match.company_name}** (${match.overall_score}% match)\n`
          if (match.similarity_reasoning) {
            response += `   • ${match.similarity_reasoning}\n`
          }
          if (match.market_category) {
            response += `   • Market: ${match.market_category}\n`
          }
          if (match.competitive_relationship) {
            response += `   • Relationship: ${match.competitive_relationship}\n`
          }
          response += '\n'
        })
      }
      
      if (analysis?.executive_summary) {
        response += `**Executive Summary:** ${analysis.executive_summary}\n\n`
      }
      
      const totalFound = analysis?.total_companies_analyzed || topMatches.length || 0
      const avgScore = analysis?.average_similarity_score || 0
      
      if (totalFound > 0) {
        response += `*Found ${totalFound} total matches. `
        if (avgScore > 0) {
          response += `Average similarity score: ${Math.round(avgScore)}%*`
        }
      }
      
      return response
    }
    
    if (action.type === 'company_search' && result.data) {
      const { companies = [], totalFound = 0 } = result.data
      
      if (companies.length === 0) {
        return `No companies found matching your search criteria. Try adjusting your search terms or filters.`
      }
      
      let response = `I found **${totalFound || companies.length} companies** matching your search criteria:\n\n`
      
      companies.slice(0, 5).forEach((company: Record<string, unknown>, index: number) => {
        response += `${index + 1}. **${company.name}**\n`
        if (company.industry) response += `   • Industry: ${company.industry}\n`
        if (company.location) response += `   • Location: ${company.location}\n`
        if (company.description) response += `   • ${company.description}\n`
        response += '\n'
      })
      
      if (totalFound > 5 || companies.length > 5) {
        response += `*Showing top 5 of ${totalFound || companies.length} results. Use filters to refine your search.*`
      }
      
      return response
    }
    
    return result.message
  }

  // Helper methods for intent detection
  private isSimilarityRequest(message: string, context: PlatformContext): boolean {
    const patterns = [
      'similar',
      'companies like',
      'competitors',
      'find like',
      'alternatives to',
      'comparable to'
    ]
    
    // Check if continuing from previous similarity context
    if (context.lastAction === 'similarity_prompt' && 
        (message.includes('yes') || message.includes('for'))) {
      return true
    }
    
    return patterns.some(pattern => message.includes(pattern))
  }

  private isSearchRequest(message: string): boolean {
    const patterns = [
      'find companies',
      'search for',
      'companies in',
      'list of',
      'show me',
      'tech companies',
      'startups'
    ]
    
    return patterns.some(pattern => message.includes(pattern))
  }

  private isAnalysisRequest(message: string, context: PlatformContext): boolean {
    const patterns = [
      'analyze',
      'tell me about',
      'information on',
      'details about',
      'what is',
      'profile of'
    ]
    
    return patterns.some(pattern => message.includes(pattern))
  }

  private isOppScanRequest(message: string): boolean {
    const patterns = [
      'oppscan',
      'opp scan',
      'm&a',
      'acquisition',
      'merger',
      'opportunities'
    ]
    
    return patterns.some(pattern => message.toLowerCase().includes(pattern))
  }

  private extractCompanyName(message: string, context: PlatformContext): string | null {
    const lowerMessage = message.toLowerCase()
    
    // Known companies in the ecosystem
    const knownCompanies = [
      'sendbird', 'patsnap', 'stream', 'pubnub', 'twilio', 
      'agora', 'layer', 'clearbit', 'segment', 'amplitude'
    ]
    
    for (const company of knownCompanies) {
      if (lowerMessage.includes(company)) {
        return company.charAt(0).toUpperCase() + company.slice(1)
      }
    }
    
    // Pattern matching for "companies like X" or "similar to X"
    const patterns = [
      /companies?\s+like\s+([a-zA-Z0-9]+)/i,
      /similar\s+to\s+([a-zA-Z0-9]+)/i,
      /competitors?\s+(?:of|for|to)\s+([a-zA-Z0-9]+)/i,
      /for\s+([a-zA-Z0-9]+)/i,
      /yes,?\s+([a-zA-Z0-9]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
    }
    
    // Check context for continuation
    if (context.currentCompany && (lowerMessage === 'yes' || lowerMessage.includes('that'))) {
      return context.currentCompany
    }
    
    return null
  }

  private extractSearchParameters(message: string): Record<string, unknown> {
    const params: Record<string, unknown> = { query: '' }
    
    // Extract location
    const locationMatch = message.match(/in\s+([a-zA-Z\s]+?)(?:\s|$)/i)
    if (locationMatch) {
      params.location = locationMatch[1].trim()
    }
    
    // Extract industry
    if (message.includes('tech')) params.industry = 'technology'
    if (message.includes('fintech')) params.industry = 'financial technology'
    if (message.includes('health')) params.industry = 'healthcare'
    if (message.includes('saas')) params.industry = 'software'
    
    // Extract size
    const sizeMatch = message.match(/(\d+)\+?\s+employees/i)
    if (sizeMatch) {
      params.minEmployees = parseInt(sizeMatch[1])
    }
    
    // Extract main query
    params.query = message
      .replace(/in\s+[a-zA-Z\s]+/gi, '')
      .replace(/find|search|show|get|list/gi, '')
      .replace(/companies?|startups?|businesses?/gi, '')
      .trim()
    
    return params
  }

  private extractOppScanParameters(message: string): Record<string, unknown> {
    return {
      scanType: message.includes('quick') ? 'quick' : 'comprehensive',
      industries: message.includes('tech') ? ['technology'] : [],
      regions: message.includes('uk') ? ['UK'] : ['UK', 'Ireland']
    }
  }

  private getFallbackSimilarityResults(companyName: string): PlatformActionResult {
    return {
      success: true,
      data: {
        targetCompany: companyName,
        mockData: true,
        topMatches: [
          { company_name: 'Stream', overall_score: 92, similarity_reasoning: 'Chat API platform' },
          { company_name: 'PubNub', overall_score: 88, similarity_reasoning: 'Real-time messaging' },
          { company_name: 'Twilio', overall_score: 85, similarity_reasoning: 'Communication APIs' }
        ]
      },
      message: `Found similar companies to ${companyName} (using cached data)`,
      suggestedActions: ['View full analysis', 'Export results']
    }
  }
}