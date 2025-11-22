/**
 * WebSearchService: Multi-source company discovery for Similar Company feature
 * Integrates with multiple search providers to find and enrich company data
 * Built for MnA directors requiring comprehensive company intelligence
 */

import { getErrorMessage } from '@/lib/utils/error-handler'
import {
  IWebSearchService,
  CompanySearchQuery,
  CompanySearchResult,
  EnrichedCompanyData,
  CompanyValidationResult,
  SocialPresence,
  NewsAnalysis
} from '../core/similarity-interfaces'
import { CompanyEntity } from '../core/interfaces'
import { DatabaseSimilaritySearch } from './database-similarity-search'

// API Response Type Definitions
interface GoogleSearchItem {
  snippet?: string
  link?: string
  displayLink?: string
  title?: string
  [key: string]: unknown
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  [key: string]: unknown
}

interface BingSearchItem {
  snippet?: string
  url?: string
  displayUrl?: string
  name?: string
  [key: string]: unknown
}

interface BingWebPages {
  value?: BingSearchItem[]
  [key: string]: unknown
}

interface BingSearchResponse {
  webPages?: BingWebPages
  [key: string]: unknown
}

interface CompaniesHouseAddress {
  address_line_1?: string
  locality?: string
  region?: string
  postal_code?: string
  country?: string
  [key: string]: unknown
}

interface CompaniesHouseItem {
  company_number?: string
  title?: string
  description?: string
  address?: CompaniesHouseAddress
  company_status?: string
  company_type?: string
  date_of_creation?: string
  [key: string]: unknown
}

interface CompaniesHouseResponse {
  items?: CompaniesHouseItem[]
  [key: string]: unknown
}

interface SearchAPIOrganicResult {
  link?: string
  title?: string
  snippet?: string
  [key: string]: unknown
}

interface SearchAPIKnowledgeGraph {
  title?: string
  name?: string
  website?: string
  description?: string
  founded?: string
  employees?: string
  revenue?: string
  type?: string
  location?: {
    country?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Clearbit API response interfaces
interface ClearbitGeo {
  city?: string
  state?: string
  country?: string
  [key: string]: unknown
}

interface ClearbitCategory {
  industry?: string
  [key: string]: unknown
}

interface ClearbitMetrics {
  employees?: number
  funding?: number
  [key: string]: unknown
}

interface ClearbitResult {
  domain?: string
  name?: string
  geo?: ClearbitGeo
  category?: ClearbitCategory
  description?: string
  foundedYear?: number
  metrics?: ClearbitMetrics
  tags?: string[]
  [key: string]: unknown
}

interface ClearbitResponse {
  results?: ClearbitResult[]
  [key: string]: unknown
}

// Crunchbase API response interfaces
interface CrunchbaseLocationIdentifier {
  value?: string
  [key: string]: unknown
}

interface CrunchbaseCategory {
  value?: string
  [key: string]: unknown
}

interface CrunchbaseFundingTotal {
  value_usd?: number
  [key: string]: unknown
}

interface CrunchbaseWebsite {
  value?: string
  [key: string]: unknown
}

interface CrunchbaseProperties {
  name?: string
  location_identifiers?: CrunchbaseLocationIdentifier[]
  categories?: CrunchbaseCategory[]
  website?: CrunchbaseWebsite
  short_description?: string
  num_employees_enum?: string
  funding_total?: CrunchbaseFundingTotal
  [key: string]: unknown
}

interface CrunchbaseEntity {
  uuid?: string
  properties?: CrunchbaseProperties
  [key: string]: unknown
}

interface CrunchbaseResponse {
  entities?: CrunchbaseEntity[]
  [key: string]: unknown
}

interface SearchAPIResponse {
  organic_results?: SearchAPIOrganicResult[]
  knowledge_graph?: SearchAPIKnowledgeGraph
  [key: string]: unknown
}

// Search provider configurations
interface SearchProviderConfig {
  readonly name: string
  readonly apiKey?: string
  readonly endpoint: string
  readonly rateLimit: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  readonly costPerRequest: number
  readonly reliability: number
  readonly enabled: boolean
}

interface WebSearchConfig {
  readonly providers: SearchProviderConfig[]
  readonly defaultTimeout: number
  readonly maxRetries: number
  readonly cacheEnabled: boolean
  readonly cacheTTL: number
}

interface SearchMetrics {
  source: string
  query: string
  results: number
  responseTime: number
  cost: number
  confidence: number
  cached: boolean
}

interface CachedSearchResult {
  query: string
  results: CompanySearchResult[]
  metadata: SearchMetrics
  timestamp: Date
  expiresAt: Date
}

export class WebSearchService implements IWebSearchService {
  private config: WebSearchConfig
  private searchCache = new Map<string, CachedSearchResult>()
  private rateLimitTrackers = new Map<string, { count: number; resetTime: Date }>()
  private databaseSearch: DatabaseSimilaritySearch

  constructor(config?: Partial<WebSearchConfig>) {
    this.config = {
      providers: [
        {
          name: 'searchapi',
          endpoint: 'https://www.searchapi.io/api/v1/search',
          apiKey: process.env.SEARCHAPI_KEY,
          rateLimit: { requestsPerSecond: 1, requestsPerMinute: 60 },
          costPerRequest: 0, // Free tier: 2000 req/month
          reliability: 0.95,
          enabled: !!process.env.SEARCHAPI_KEY
        },
        {
          name: 'google_search',
          endpoint: 'https://customsearch.googleapis.com/customsearch/v1',
          apiKey: process.env.GOOGLE_SEARCH_API_KEY,
          rateLimit: { requestsPerSecond: 10, requestsPerMinute: 100 },
          costPerRequest: 0.005, // $0.005 per search
          reliability: 0.95,
          enabled: !!process.env.GOOGLE_SEARCH_API_KEY
        },
        {
          name: 'bing_search',
          endpoint: 'https://api.bing.microsoft.com/v7.0/search',
          apiKey: process.env.BING_SEARCH_API_KEY,
          rateLimit: { requestsPerSecond: 3, requestsPerMinute: 1000 },
          costPerRequest: 0.003, // $0.003 per search
          reliability: 0.90,
          enabled: !!process.env.BING_SEARCH_API_KEY
        },
        {
          name: 'companies_house_search',
          endpoint: 'https://api.company-information.service.gov.uk/search/companies',
          apiKey: process.env.COMPANIES_HOUSE_API_KEY,
          rateLimit: { requestsPerSecond: 5, requestsPerMinute: 600 },
          costPerRequest: 0, // Free for basic searches
          reliability: 0.98,
          enabled: !!process.env.COMPANIES_HOUSE_API_KEY
        },
        {
          name: 'clearbit_discovery',
          endpoint: 'https://discovery.clearbit.com/v1/companies/search',
          apiKey: process.env.CLEARBIT_API_KEY,
          rateLimit: { requestsPerSecond: 5, requestsPerMinute: 600 },
          costPerRequest: 0.02, // $0.02 per enrichment
          reliability: 0.85,
          enabled: !!process.env.CLEARBIT_API_KEY
        },
        {
          name: 'crunchbase_search',
          endpoint: 'https://api.crunchbase.com/api/v4/searches/organizations',
          apiKey: process.env.CRUNCHBASE_API_KEY,
          rateLimit: { requestsPerSecond: 1, requestsPerMinute: 200 },
          costPerRequest: 0.05, // $0.05 per search
          reliability: 0.88,
          enabled: !!process.env.CRUNCHBASE_API_KEY
        }
      ],
      defaultTimeout: 30000, // 30 seconds
      maxRetries: 3,
      cacheEnabled: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }
    
    // Initialize database search as fallback
    this.databaseSearch = new DatabaseSimilaritySearch()
  }

  /**
   * Search for companies using multiple providers
   */
  async searchCompanies(query: CompanySearchQuery): Promise<CompanySearchResult[]> {
    const cacheKey = this.generateCacheKey(query)
    
    // Check cache first
    if (this.config.cacheEnabled && this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!
      if (cached.expiresAt > new Date()) {
        console.log(`Cache hit for query: ${query.query}`)
        return cached.results
      } else {
        this.searchCache.delete(cacheKey)
      }
    }

    const results: CompanySearchResult[] = []
    const searchPromises: Promise<CompanySearchResult[]>[] = []

    // Execute searches across enabled providers
    const enabledProviders = this.config.providers.filter(p => p.enabled)
    
    // Check if we have any enabled providers
    if (enabledProviders.length === 0) {
      console.warn('[WebSearchService] No external API providers enabled, using database fallback')
      
      // Use database fallback when no external APIs are available
      try {
        const databaseResults = await this.databaseSearch.searchSimilarCompanies({
          targetCompany: query.query,
          industry: query.filters?.industry,
          location: query.filters?.region,
          maxResults: query.maxResults || 20
        })
        
        console.log(`[WebSearchService] Database fallback returned ${databaseResults.length} results`)
        
        // Cache and return database results
        if (this.config.cacheEnabled && databaseResults.length > 0) {
          this.cacheResults(cacheKey, databaseResults, query)
        }
        
        return databaseResults.slice(0, query.maxResults || 50)
      } catch (error) {
        console.error('[WebSearchService] Database fallback failed:', error)
        return []
      }
    }
    
    for (const provider of enabledProviders) {
      if (this.canMakeRequest(provider)) {
        searchPromises.push(this.searchWithProvider(provider, query))
      }
    }

    try {
      // Execute searches in parallel
      const providerResults = await Promise.allSettled(searchPromises)
      
      let hasAnyResults = false
      for (const result of providerResults) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          results.push(...result.value)
          hasAnyResults = true
        } else if (result.status === 'rejected') {
          console.warn('Provider search failed:', result.reason)
        }
      }
      
      // If all external searches failed or returned no results, use database fallback
      if (!hasAnyResults) {
        console.warn('[WebSearchService] All external searches failed, using database fallback')
        
        try {
          const databaseResults = await this.databaseSearch.searchSimilarCompanies({
            targetCompany: query.query,
            industry: query.filters?.industry,
            location: query.filters?.region,
            maxResults: query.maxResults || 20
          })
          
          if (databaseResults.length > 0) {
            results.push(...databaseResults)
            console.log(`[WebSearchService] Added ${databaseResults.length} results from database fallback`)
          }
        } catch (dbError) {
          console.error('[WebSearchService] Database fallback also failed:', dbError)
        }
      }

      // Deduplicate and rank results
      const deduplicatedResults = this.deduplicateResults(results)
      const rankedResults = this.rankResultsByRelevance(deduplicatedResults, query)

      // Cache results if enabled
      if (this.config.cacheEnabled && rankedResults.length > 0) {
        this.cacheResults(cacheKey, rankedResults, query)
      }

      return rankedResults.slice(0, query.maxResults || 50)
    } catch (error) {
      console.error('Error in searchCompanies:', error)
      throw new Error(`Company search failed: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Enrich company data with additional information
   */
  async enrichCompanyData(company: CompanyEntity): Promise<EnrichedCompanyData> {
    const enrichmentTasks = [
      this.getFinancialData(company),
      this.getSocialPresence(company),
      this.getNewsAnalysis(company),
      this.getTechnologyProfile(company)
    ]

    try {
      const [financialData, socialPresence, newsAnalysis, technologyProfile] = 
        await Promise.allSettled(enrichmentTasks)

      return {
        company,
        financialData: financialData.status === 'fulfilled' ? financialData.value : undefined,
        socialPresence: socialPresence.status === 'fulfilled' ? socialPresence.value : undefined,
        newsAnalysis: newsAnalysis.status === 'fulfilled' ? newsAnalysis.value : undefined,
        technologyProfile: technologyProfile.status === 'fulfilled' ? technologyProfile.value : undefined
      }
    } catch (error) {
      console.error('Error enriching company data:', error)
      return { company }
    }
  }

  /**
   * Get competitors for a company
   */
  async getCompetitors(companyName: string): Promise<CompanyEntity[]> {
    const searchQuery: CompanySearchQuery = {
      query: `competitors of ${companyName}`,
      maxResults: 20
    }

    try {
      const results = await this.searchCompanies(searchQuery)
      return results.map(result => result.company).filter(company => 
        company.name.toLowerCase() !== companyName.toLowerCase()
      )
    } catch (error) {
      console.error('Error finding competitors:', error)
      return []
    }
  }

  /**
   * Validate that a company exists
   */
  async validateCompanyExists(companyName: string): Promise<CompanyValidationResult> {
    const searchQuery: CompanySearchQuery = {
      query: companyName,
      maxResults: 10
    }

    try {
      const results = await this.searchCompanies(searchQuery)
      
      // Look for exact or close matches
      const exactMatch = results.find(r => 
        r.company.name.toLowerCase() === companyName.toLowerCase()
      )
      
      if (exactMatch) {
        return {
          exists: true,
          confidence: exactMatch.relevanceScore,
          validationSource: 'search_exact_match'
        }
      }

      // Look for partial matches
      const partialMatches = results.filter(r =>
        r.company.name.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(r.company.name.toLowerCase())
      )

      if (partialMatches.length > 0) {
        return {
          exists: true,
          confidence: Math.max(...partialMatches.map(m => m.relevanceScore)),
          suggestedMatches: partialMatches.slice(0, 5).map(m => m.company),
          validationSource: 'search_partial_match'
        }
      }

      return {
        exists: false,
        confidence: 0,
        validationSource: 'search_no_match'
      }
    } catch (error) {
      console.error('Error validating company:', error)
      return {
        exists: false,
        confidence: 0,
        validationSource: 'search_error'
      }
    }
  }

  // Private helper methods

  /**
   * Create fetch options with timeout using AbortController (standard approach)
   */
  private createFetchOptionsWithTimeout(timeout: number, additionalOptions?: RequestInit): RequestInit & { signal: AbortSignal } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Clean up timeout if request completes
    const signal = controller.signal
    signal.addEventListener('abort', () => clearTimeout(timeoutId))

    return {
      ...additionalOptions,
      signal
    }
  }

  private async searchWithProvider(
    provider: SearchProviderConfig, 
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    const startTime = Date.now()
    
    try {
      this.recordRequest(provider.name)
      
      let results: CompanySearchResult[] = []
      
      switch (provider.name) {
        case 'searchapi':
          results = await this.searchWithSearchAPI(provider, query)
          break
        case 'google_search':
          results = await this.searchWithGoogle(provider, query)
          break
        case 'bing_search':
          results = await this.searchWithBing(provider, query)
          break
        case 'companies_house_search':
          results = await this.searchWithCompaniesHouse(provider, query)
          break
        case 'clearbit_discovery':
          results = await this.searchWithClearbit(provider, query)
          break
        case 'crunchbase_search':
          results = await this.searchWithCrunchbase(provider, query)
          break
        default:
          console.warn(`Unknown provider: ${provider.name}`)
          return []
      }

      // Add search metadata to results
      return results.map(result => ({
        ...result,
        source: provider.name,
        additionalData: {
          ...result.additionalData,
          searchTime: Date.now() - startTime,
          provider: provider.name,
          cost: provider.costPerRequest
        }
      }))
    } catch (error) {
      console.error(`Search failed for provider ${provider.name}:`, error)
      return []
    }
  }

  private async searchWithSearchAPI(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('SearchAPI key not configured')
    }

    const searchTerms = this.buildSearchTerms(query)
    const searchParams = new URLSearchParams({
      api_key: provider.apiKey,
      q: searchTerms + ' company business',
      location: query.filters?.region || 'United Kingdom',
      num: '20',
      engine: 'google'
    })

    const searchUrl = `${provider.endpoint}?${searchParams}`

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'oppSpot-SimilarCompany/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`SearchAPI error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseSearchAPIResults(data, query)
    } catch (error) {
      console.error('SearchAPI error:', error)
      return []
    }
  }

  private async searchWithGoogle(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('Google Search API key not configured')
    }

    const searchTerms = this.buildSearchTerms(query)
    const searchUrl = `${provider.endpoint}?key=${provider.apiKey}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchTerms)}&num=10`

    try {
      const response = await fetch(searchUrl, this.createFetchOptionsWithTimeout(
        this.config.defaultTimeout,
        {
          headers: {
            'User-Agent': 'oppSpot-SimilarCompany/1.0'
          }
        }
      ))

      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseGoogleResults(data, query)
    } catch (error) {
      console.error('Google search error:', error)
      return []
    }
  }

  private async searchWithBing(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('Bing Search API key not configured')
    }

    const searchTerms = this.buildSearchTerms(query)
    const searchUrl = `${provider.endpoint}?q=${encodeURIComponent(searchTerms)}&count=10&mkt=en-GB`

    try {
      const response = await fetch(searchUrl, this.createFetchOptionsWithTimeout(
        this.config.defaultTimeout,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': provider.apiKey,
            'User-Agent': 'oppSpot-SimilarCompany/1.0'
          }
        }
      ))

      if (!response.ok) {
        throw new Error(`Bing Search API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseBingResults(data, query)
    } catch (error) {
      console.error('Bing search error:', error)
      return []
    }
  }

  private async searchWithCompaniesHouse(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('Companies House API key not configured')
    }

    const searchUrl = `${provider.endpoint}?q=${encodeURIComponent(query.query)}&items_per_page=20`

    try {
      const response = await fetch(searchUrl, this.createFetchOptionsWithTimeout(
        this.config.defaultTimeout,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(provider.apiKey + ':').toString('base64')}`,
            'User-Agent': 'oppSpot-SimilarCompany/1.0'
          }
        }
      ))

      if (!response.ok) {
        throw new Error(`Companies House API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseCompaniesHouseResults(data, query)
    } catch (error) {
      console.error('Companies House search error:', error)
      return []
    }
  }

  private async searchWithClearbit(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('Clearbit API key not configured')
    }

    const searchParams = new URLSearchParams({
      query: query.query,
      limit: '20',
      ...(query.industry && { categories: query.industry }),
      ...(query.region && { location: query.region })
    })

    const searchUrl = `${provider.endpoint}?${searchParams.toString()}`

    try {
      const response = await fetch(searchUrl, this.createFetchOptionsWithTimeout(
        this.config.defaultTimeout,
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'User-Agent': 'oppSpot-SimilarCompany/1.0'
          }
        }
      ))

      if (!response.ok) {
        throw new Error(`Clearbit API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseClearbitResults(data, query)
    } catch (error) {
      console.error('Clearbit search error:', error)
      return []
    }
  }

  private async searchWithCrunchbase(
    provider: SearchProviderConfig,
    query: CompanySearchQuery
  ): Promise<CompanySearchResult[]> {
    if (!provider.apiKey) {
      throw new Error('Crunchbase API key not configured')
    }

    const searchBody = {
      field_ids: [
        'identifier',
        'name',
        'short_description',
        'website',
        'location_identifiers',
        'categories',
        'num_employees_enum',
        'funding_total'
      ],
      query: [
        {
          type: 'predicate',
          field_id: 'name',
          operator_id: 'includes',
          values: [query.query]
        }
      ],
      limit: 20
    }

    try {
      const response = await fetch(provider.endpoint, this.createFetchOptionsWithTimeout(
        this.config.defaultTimeout,
        {
          method: 'POST',
          headers: {
            'X-cb-user-key': provider.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'oppSpot-SimilarCompany/1.0'
          },
          body: JSON.stringify(searchBody)
        }
      ))

      if (!response.ok) {
        throw new Error(`Crunchbase API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseCrunchbaseResults(data, query)
    } catch (error) {
      console.error('Crunchbase search error:', error)
      return []
    }
  }

  // Result parsers for different providers

  private parseGoogleResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as GoogleSearchResponse
    if (!response.items || !Array.isArray(response.items)) return []

    return response.items.map((item) => {
      const companyData = this.extractCompanyFromGoogleResult(item as Record<string, unknown>)
      return {
        company: companyData,
        relevanceScore: this.calculateRelevanceScore(companyData, query),
        source: 'google_search',
        additionalData: {
          snippet: item.snippet,
          link: item.link,
          displayLink: item.displayLink
        }
      }
    })
  }

  private parseBingResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as BingSearchResponse
    if (!response.webPages?.value || !Array.isArray(response.webPages.value)) return []

    return response.webPages.value.map((item) => {
      const companyData = this.extractCompanyFromBingResult(item as Record<string, unknown>)
      return {
        company: companyData,
        relevanceScore: this.calculateRelevanceScore(companyData, query),
        source: 'bing_search',
        additionalData: {
          snippet: item.snippet,
          url: item.url,
          displayUrl: item.displayUrl
        }
      }
    })
  }

  private parseCompaniesHouseResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as CompaniesHouseResponse
    if (!response.items || !Array.isArray(response.items)) return []

    return response.items.map((item) => {
      const addressData = item.address as Record<string, unknown> | undefined
      const companyData: CompanyEntity = {
        id: item.company_number || '',
        name: item.title || '',
        registrationNumber: item.company_number,
        country: this.parseCompanyCountry(addressData),
        industryCodes: [],
        description: item.description,
        address: {
          street: item.address?.address_line_1,
          city: item.address?.locality,
          region: item.address?.region,
          postalCode: item.address?.postal_code,
          country: this.parseCompanyCountry(addressData)
        },
        confidenceScore: 0.95, // High confidence for official records
        sourceMetadata: {
          source: 'companies_house',
          discoveredAt: new Date(),
          confidence: 0.95,
          rawData: item as Record<string, unknown>
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        company: companyData,
        relevanceScore: this.calculateRelevanceScore(companyData, query),
        source: 'companies_house_search',
        additionalData: {
          companyStatus: item.company_status,
          companyType: item.company_type,
          dateOfCreation: item.date_of_creation
        }
      }
    })
  }

  private parseSearchAPIResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as SearchAPIResponse
    if (!response.organic_results && !response.knowledge_graph) return []

    const results: CompanySearchResult[] = []

    // Parse organic search results
    if (response.organic_results && Array.isArray(response.organic_results)) {
      response.organic_results.forEach((item) => {
        const domain = this.extractDomain(item.link || '')
        const companyName = this.extractCompanyNameFromTitle(item.title || '')

        const companyData: CompanyEntity = {
          id: domain || this.generateId(),
          name: companyName,
          country: 'United Kingdom', // Default for UK/Ireland focus
          industryCodes: [],
          website: item.link,
          description: item.snippet,
          confidenceScore: 0.75,
          sourceMetadata: {
            source: 'searchapi',
            discoveredAt: new Date(),
            confidence: 0.75,
            searchTerms: item.title ? [item.title] : [],
            rawData: item as Record<string, unknown>
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        results.push({
          company: companyData,
          relevanceScore: this.calculateRelevanceScore(companyData, query),
          source: 'searchapi',
          additionalData: {
            snippet: item.snippet,
            discoveredAt: new Date()
          }
        })
      })
    }

    // Parse knowledge graph if available (for direct company matches)
    if (response.knowledge_graph) {
      const kg = response.knowledge_graph
      const companyData: CompanyEntity = {
        id: this.extractDomain(kg.website || '') || this.generateId(),
        name: kg.title || kg.name || '',
        country: kg.location?.country || 'United Kingdom',
        industryCodes: kg.type ? [kg.type] : [],
        website: kg.website,
        description: kg.description,
        foundingYear: kg.founded ? parseInt(kg.founded) : undefined,
        employeeCount: kg.employees,
        revenueEstimate: kg.revenue ? parseFloat(kg.revenue) : undefined,
        confidenceScore: 0.95, // Higher confidence for knowledge graph
        sourceMetadata: {
          source: 'searchapi_knowledge',
          discoveredAt: new Date(),
          confidence: 0.95,
          rawData: kg as Record<string, unknown>
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      results.unshift({ // Add to beginning as most relevant
        company: companyData,
        relevanceScore: 1.0, // Perfect match from knowledge graph
        source: 'searchapi_knowledge',
        additionalData: {
          snippet: kg.description,
          matchType: 'exact',
          matchedKeywords: [],
          discoveredAt: new Date()
        }
      })
    }

    return results
  }

  private parseClearbitResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as ClearbitResponse
    if (!response.results || !Array.isArray(response.results)) return []

    return response.results.map((item) => {
      const companyData: CompanyEntity = {
        id: (item.domain as string) || this.generateId(),
        name: (item.name as string) || '',
        country: item.geo?.country || 'Unknown',
        industryCodes: item.category?.industry ? [item.category.industry] : [],
        website: item.domain ? `https://${item.domain}` : undefined,
        description: item.description,
        foundingYear: item.foundedYear,
        address: item.geo ? {
          city: item.geo.city,
          region: item.geo.state,
          country: item.geo.country || 'Unknown'
        } : undefined,
        confidenceScore: 0.85,
        sourceMetadata: {
          source: 'clearbit_discovery',
          discoveredAt: new Date(),
          confidence: 0.85,
          rawData: item as Record<string, unknown>
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        company: companyData,
        relevanceScore: this.calculateRelevanceScore(companyData, query),
        source: 'clearbit_discovery',
        additionalData: {
          employees: item.metrics?.employees,
          funding: item.metrics?.funding,
          tags: item.tags
        }
      }
    })
  }

  private parseCrunchbaseResults(data: Record<string, unknown>, query: CompanySearchQuery): CompanySearchResult[] {
    const response = data as CrunchbaseResponse
    if (!response.entities || !Array.isArray(response.entities)) return []

    return response.entities.map((item) => {
      const props = item.properties
      const companyData: CompanyEntity = {
        id: (item.uuid as string) || this.generateId(),
        name: (props?.name as string) || '',
        country: props?.location_identifiers?.[0]?.value?.split(',').pop()?.trim() || 'Unknown',
        industryCodes: props?.categories?.map((cat) => cat.value || '') || [],
        website: props?.website?.value,
        description: props?.short_description,
        confidenceScore: 0.88,
        sourceMetadata: {
          source: 'crunchbase_search',
          discoveredAt: new Date(),
          confidence: 0.88,
          rawData: item as Record<string, unknown>
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        company: companyData,
        relevanceScore: this.calculateRelevanceScore(companyData, query),
        source: 'crunchbase_search',
        additionalData: {
          fundingTotal: props?.funding_total?.value_usd,
          numEmployees: props?.num_employees_enum,
          categories: props?.categories?.map((cat) => cat.value)
        }
      }
    })
  }

  // Company data extraction helpers

  private extractCompanyFromGoogleResult(item: Record<string, unknown>): CompanyEntity {
    const link = (item.link as string) || ''
    const title = (item.title as string) || ''
    const snippet = (item.snippet as string) || ''
    const domain = this.extractDomain(link)
    const companyName = this.extractCompanyNameFromTitle(title)

    return {
      id: domain || this.generateId(),
      name: companyName,
      country: 'Unknown', // Will be enriched later
      industryCodes: [],
      website: link,
      description: snippet,
      confidenceScore: 0.7,
      sourceMetadata: {
        source: 'google_search',
        discoveredAt: new Date(),
        confidence: 0.7,
        searchTerms: title ? [title] : [],
        rawData: item
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private extractCompanyFromBingResult(item: Record<string, unknown>): CompanyEntity {
    const url = (item.url as string) || ''
    const name = (item.name as string) || ''
    const snippet = (item.snippet as string) || ''
    const domain = this.extractDomain(url)
    const companyName = this.extractCompanyNameFromTitle(name)

    return {
      id: domain || this.generateId(),
      name: companyName,
      country: 'Unknown', // Will be enriched later
      industryCodes: [],
      website: url,
      description: snippet,
      confidenceScore: 0.7,
      sourceMetadata: {
        source: 'bing_search',
        discoveredAt: new Date(),
        confidence: 0.7,
        searchTerms: name ? [name] : [],
        rawData: item
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Utility methods

  private buildSearchTerms(query: CompanySearchQuery): string {
    let terms = query.query

    if (query.industry) {
      terms += ` ${query.industry} company`
    }

    if (query.region) {
      terms += ` ${query.region}`
    }

    if (query.sizeRange) {
      if (query.sizeRange.minEmployees) {
        terms += ` employees ${query.sizeRange.minEmployees}+`
      }
    }

    return terms
  }

  private calculateRelevanceScore(company: CompanyEntity, query: CompanySearchQuery): number {
    let score = 0.5 // Base score

    // Name similarity
    const nameScore = this.calculateStringSimilarity(
      company.name.toLowerCase(), 
      query.query.toLowerCase()
    )
    score += nameScore * 0.4

    // Industry match
    if (query.industry && company.industryCodes.some(code => 
      code.toLowerCase().includes(query.industry!.toLowerCase())
    )) {
      score += 0.2
    }

    // Region match
    if (query.region && company.country.toLowerCase().includes(query.region.toLowerCase())) {
      score += 0.15
    }

    // Website presence
    if (company.website) {
      score += 0.1
    }

    // Description quality
    if (company.description && company.description.length > 50) {
      score += 0.05
    }

    return Math.min(1.0, score)
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }

    const distance = matrix[len1][len2]
    const maxLength = Math.max(len1, len2)
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
  }

  private deduplicateResults(results: CompanySearchResult[]): CompanySearchResult[] {
    const seen = new Set<string>()
    const deduplicated: CompanySearchResult[] = []

    for (const result of results) {
      // Create deduplication key based on name and domain
      const key = this.createDeduplicationKey(result.company)
      
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(result)
      }
    }

    return deduplicated
  }

  private createDeduplicationKey(company: CompanyEntity): string {
    const domain = company.website ? this.extractDomain(company.website) : ''
    return `${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${domain}`.toLowerCase()
  }

  private rankResultsByRelevance(
    results: CompanySearchResult[], 
    query: CompanySearchQuery
  ): CompanySearchResult[] {
    return results.sort((a, b) => {
      // Primary sort: relevance score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      
      // Secondary sort: source reliability
      const aProvider = this.config.providers.find(p => p.name === a.source)
      const bProvider = this.config.providers.find(p => p.name === b.source)
      const aReliability = aProvider?.reliability || 0.5
      const bReliability = bProvider?.reliability || 0.5
      
      return bReliability - aReliability
    })
  }

  // Enrichment methods

  private async getFinancialData(company: CompanyEntity): Promise<Record<string, unknown> | undefined> {
    // This would integrate with financial data providers
    // For now, return undefined to avoid API costs
    return undefined
  }

  private async getSocialPresence(company: CompanyEntity): Promise<SocialPresence | undefined> {
    if (!company.website) return undefined

    // Extract domain for social media search
    const domain = this.extractDomain(company.website)
    if (!domain) return undefined

    // This would search for social media profiles
    // For now, return a basic structure
    return {
      platforms: {
        linkedin: {
          followers: 0,
          engagement: 0,
          activityLevel: 'low'
        }
      },
      overallEngagement: 0,
      brandSentiment: 'neutral'
    }
  }

  private async getNewsAnalysis(company: CompanyEntity): Promise<NewsAnalysis | undefined> {
    // This would search for recent news about the company
    // For now, return undefined to avoid API costs
    return undefined
  }

  private async getTechnologyProfile(company: CompanyEntity): Promise<Record<string, unknown> | undefined> {
    // This would analyze the company's technology stack
    // For now, return undefined to avoid API costs
    return undefined
  }

  // Cache management

  private generateCacheKey(query: CompanySearchQuery): string {
    const keyData = {
      query: query.query,
      industry: query.industry,
      region: query.region,
      maxResults: query.maxResults || 50
    }
    return Buffer.from(JSON.stringify(keyData)).toString('base64')
  }

  private cacheResults(
    key: string, 
    results: CompanySearchResult[], 
    query: CompanySearchQuery
  ): void {
    const cached: CachedSearchResult = {
      query: query.query,
      results,
      metadata: {
        source: 'cache',
        query: query.query,
        results: results.length,
        responseTime: 0,
        cost: 0,
        confidence: results.length > 0 ? results[0].relevanceScore : 0,
        cached: true
      },
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.config.cacheTTL)
    }

    this.searchCache.set(key, cached)
  }

  // Rate limiting

  private canMakeRequest(provider: SearchProviderConfig): boolean {
    const tracker = this.rateLimitTrackers.get(provider.name)
    const now = new Date()

    if (!tracker) {
      this.rateLimitTrackers.set(provider.name, {
        count: 0,
        resetTime: new Date(now.getTime() + 60000) // Reset in 1 minute
      })
      return true
    }

    if (now > tracker.resetTime) {
      tracker.count = 0
      tracker.resetTime = new Date(now.getTime() + 60000)
      return true
    }

    return tracker.count < provider.rateLimit.requestsPerMinute
  }

  private recordRequest(providerName: string): void {
    const tracker = this.rateLimitTrackers.get(providerName)
    if (tracker) {
      tracker.count++
    }
  }

  // Utility methods

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  private extractCompanyNameFromTitle(title: string): string {
    // Remove common suffixes and clean up title
    const cleanTitle = title
      .replace(/\s*-\s*.*/g, '') // Remove everything after dash
      .replace(/\s*\|\s*.*/g, '') // Remove everything after pipe
      .replace(/\s*:\s*.*/g, '') // Remove everything after colon
      .replace(/(Ltd|Limited|Inc|Corp|LLC|PLC)\.?/gi, '') // Remove company suffixes
      .trim()

    return cleanTitle || title
  }

  private parseCompanyCountry(address: Record<string, unknown> | undefined): string {
    if (!address) return 'UK'

    // Companies House addresses
    const country = address.country as string | undefined
    const locality = address.locality as string | undefined
    const region = address.region as string | undefined

    if (country) return country
    if (locality?.toLowerCase().includes('london')) return 'England'
    if (region?.toLowerCase().includes('scotland')) return 'Scotland'
    if (region?.toLowerCase().includes('wales')) return 'Wales'

    return 'UK'
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Public utility methods for cost tracking

  getTotalCost(): number {
    return Array.from(this.searchCache.values()).reduce((total, cached) => 
      total + (cached.metadata.cost || 0), 0
    )
  }

  getProviderStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {}
    
    for (const provider of this.config.providers) {
      const tracker = this.rateLimitTrackers.get(provider.name)
      stats[provider.name] = {
        enabled: provider.enabled,
        reliability: provider.reliability,
        costPerRequest: provider.costPerRequest,
        requestsUsed: tracker?.count || 0,
        requestsRemaining: provider.rateLimit.requestsPerMinute - (tracker?.count || 0)
      }
    }
    
    return stats
  }

  clearCache(): void {
    this.searchCache.clear()
  }
}