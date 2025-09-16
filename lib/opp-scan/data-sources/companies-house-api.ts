/**
 * Companies House API Integration
 * Real data collection from UK Companies House REST API
 */

interface CompaniesHouseConfig {
  apiKey: string
  baseUrl: string
  rateLimit: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
}

interface CompaniesHouseCompany {
  company_name: string
  company_number: string
  company_status: string
  company_type: string
  date_of_creation: string
  registered_office_address: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    region?: string
    country?: string
    postal_code?: string
  }
  sic_codes?: string[]
  accounts?: {
    last_accounts?: {
      made_up_to?: string
      type?: string
    }
    next_due?: string
    overdue?: boolean
  }
  confirmation_statement?: {
    last_made_up_to?: string
    next_due?: string
    overdue?: boolean
  }
}

interface CompaniesHouseSearchResponse {
  total_results: number
  items: CompaniesHouseCompany[]
  items_per_page: number
  page_number: number
  start_index: number
  kind: string
}

interface CompaniesHouseOfficer {
  name: string
  officer_role: string
  appointed_on: string
  date_of_birth?: {
    month: number
    year: number
  }
  nationality?: string
  country_of_residence?: string
  occupation?: string
  address: {
    address_line_1?: string
    locality?: string
    region?: string
    country?: string
    postal_code?: string
  }
}

interface CompaniesHouseFiling {
  category: string
  date: string
  description: string
  type: string
  action_date?: string
  made_up_date?: string
  pages?: number
  paper_filed?: boolean
}

export class CompaniesHouseAPI {
  private config: CompaniesHouseConfig
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false
  private lastRequestTime = 0
  private requestCount = 0
  private windowStart = Date.now()

  constructor(apiKey?: string) {
    this.config = {
      apiKey: apiKey || process.env.COMPANIES_HOUSE_API_KEY || '',
      baseUrl: 'https://api.company-information.service.gov.uk',
      rateLimit: {
        requestsPerSecond: 5, // Companies House allows 600 requests per 5 minutes
        requestsPerMinute: 600
      }
    }

    if (!this.config.apiKey) {
      console.warn('Companies House API key not found. Set COMPANIES_HOUSE_API_KEY environment variable.')
    }
  }

  /**
   * Search for companies by various criteria
   */
  async searchCompanies(params: {
    query?: string
    sicCodes?: string[]
    incorporatedFrom?: string
    incorporatedTo?: string
    companyStatus?: 'active' | 'dissolved' | 'liquidation' | 'receivership' | 'administration'
    companyType?: string[]
    itemsPerPage?: number
    startIndex?: number
    location?: string
  }): Promise<CompaniesHouseSearchResponse> {
    if (!this.config.apiKey) {
      throw new Error('Companies House API key is required')
    }

    const searchParams = new URLSearchParams()
    
    if (params.query) {
      searchParams.append('q', params.query)
    }

    if (params.sicCodes && params.sicCodes.length > 0) {
      // Companies House uses SIC code filtering in the query
      const sicQuery = params.sicCodes.map(code => `sic:${code}`).join(' OR ')
      if (params.query) {
        searchParams.set('q', `(${params.query}) AND (${sicQuery})`)
      } else {
        searchParams.set('q', sicQuery)
      }
    }

    if (params.companyStatus) {
      searchParams.append('company_status', params.companyStatus)
    }

    if (params.companyType && params.companyType.length > 0) {
      params.companyType.forEach(type => {
        searchParams.append('company_type', type)
      })
    }

    if (params.incorporatedFrom) {
      searchParams.append('incorporated_from', params.incorporatedFrom)
    }

    if (params.incorporatedTo) {
      searchParams.append('incorporated_to', params.incorporatedTo)
    }

    searchParams.append('items_per_page', (params.itemsPerPage || 20).toString())
    searchParams.append('start_index', (params.startIndex || 0).toString())

    const url = `/search/companies?${searchParams.toString()}`
    
    try {
      const response = await this.makeRequest(url)
      return response as CompaniesHouseSearchResponse
    } catch (error) {
      console.error('Companies House search failed:', error)
      throw new Error(`Companies House API search failed: ${error.message}`)
    }
  }

  /**
   * Get detailed company information by company number
   */
  async getCompanyDetails(companyNumber: string): Promise<CompaniesHouseCompany> {
    if (!this.config.apiKey) {
      throw new Error('Companies House API key is required')
    }

    const url = `/company/${companyNumber}`
    
    try {
      const response = await this.makeRequest(url)
      return response as CompaniesHouseCompany
    } catch (error) {
      console.error(`Failed to get company details for ${companyNumber}:`, error)
      throw new Error(`Failed to get company details: ${error.message}`)
    }
  }

  /**
   * Get company officers (directors, secretaries, etc.)
   */
  async getCompanyOfficers(companyNumber: string, itemsPerPage = 35): Promise<{
    officers: CompaniesHouseOfficer[]
    totalResults: number
  }> {
    if (!this.config.apiKey) {
      throw new Error('Companies House API key is required')
    }

    const url = `/company/${companyNumber}/officers?items_per_page=${itemsPerPage}`
    
    try {
      const response = await this.makeRequest(url)
      return {
        officers: response.items || [],
        totalResults: response.total_results || 0
      }
    } catch (error) {
      console.error(`Failed to get officers for ${companyNumber}:`, error)
      throw new Error(`Failed to get company officers: ${error.message}`)
    }
  }

  /**
   * Get company filing history
   */
  async getCompanyFilings(companyNumber: string, itemsPerPage = 35): Promise<{
    filings: CompaniesHouseFiling[]
    totalResults: number
  }> {
    if (!this.config.apiKey) {
      throw new Error('Companies House API key is required')
    }

    const url = `/company/${companyNumber}/filing-history?items_per_page=${itemsPerPage}`
    
    try {
      const response = await this.makeRequest(url)
      return {
        filings: response.items || [],
        totalResults: response.total_results || 0
      }
    } catch (error) {
      console.error(`Failed to get filings for ${companyNumber}:`, error)
      throw new Error(`Failed to get company filings: ${error.message}`)
    }
  }

  /**
   * Advanced search with multiple filters for acquisition targeting
   */
  async searchAcquisitionTargets(params: {
    industries: Array<{ sic_code: string; industry: string }>
    regions?: string[]
    minIncorporationYear?: number
    maxIncorporationYear?: number
    companyTypes?: string[]
    excludeDormant?: boolean
    itemsPerPage?: number
    startIndex?: number
  }): Promise<{
    companies: CompaniesHouseCompany[]
    totalResults: number
    searchMetadata: {
      searchTerms: string[]
      filters: any
      executionTime: number
    }
  }> {
    const startTime = Date.now()
    const searchTerms: string[] = []
    const allCompanies: CompaniesHouseCompany[] = []

    // Search by industry SIC codes
    for (const industry of params.industries) {
      const sicQuery = `sic:${industry.sic_code}`
      searchTerms.push(`SIC ${industry.sic_code} (${industry.industry})`)

      try {
        const searchResult = await this.searchCompanies({
          query: sicQuery,
          companyStatus: 'active',
          companyType: params.companyTypes || ['ltd', 'plc'],
          incorporatedFrom: params.minIncorporationYear ? `${params.minIncorporationYear}-01-01` : undefined,
          incorporatedTo: params.maxIncorporationYear ? `${params.maxIncorporationYear}-12-31` : undefined,
          itemsPerPage: params.itemsPerPage || 100,
          startIndex: params.startIndex || 0
        })

        // Filter out dormant companies if requested
        let filteredCompanies = searchResult.items
        if (params.excludeDormant) {
          filteredCompanies = filteredCompanies.filter(company => 
            !company.company_name.toLowerCase().includes('dormant') &&
            company.company_status === 'active'
          )
        }

        allCompanies.push(...filteredCompanies)

        // Add delay between searches to respect rate limits
        await this.delay(200)
      } catch (error) {
        console.error(`Search failed for SIC code ${industry.sic_code}:`, error)
      }
    }

    // Remove duplicates based on company number
    const uniqueCompanies = allCompanies.filter((company, index, self) =>
      self.findIndex(c => c.company_number === company.company_number) === index
    )

    return {
      companies: uniqueCompanies,
      totalResults: uniqueCompanies.length,
      searchMetadata: {
        searchTerms,
        filters: params,
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get company financial indicators from filing data
   */
  async getCompanyFinancialIndicators(companyNumber: string): Promise<{
    hasRecentAccounts: boolean
    accountsOverdue: boolean
    confirmationStatementOverdue: boolean
    lastAccountsDate?: string
    nextAccountsDue?: string
    companyAge: number
    estimatedSize?: 'micro' | 'small' | 'medium' | 'large'
  }> {
    try {
      const company = await this.getCompanyDetails(companyNumber)
      const currentDate = new Date()
      const incorporationDate = new Date(company.date_of_creation)
      const companyAge = currentDate.getFullYear() - incorporationDate.getFullYear()

      const indicators = {
        hasRecentAccounts: false,
        accountsOverdue: company.accounts?.overdue || false,
        confirmationStatementOverdue: company.confirmation_statement?.overdue || false,
        lastAccountsDate: company.accounts?.last_accounts?.made_up_to,
        nextAccountsDue: company.accounts?.next_due,
        companyAge,
        estimatedSize: undefined as 'micro' | 'small' | 'medium' | 'large' | undefined
      }

      // Check if accounts are recent (within 18 months)
      if (company.accounts?.last_accounts?.made_up_to) {
        const lastAccountsDate = new Date(company.accounts.last_accounts.made_up_to)
        const monthsSinceAccounts = (currentDate.getTime() - lastAccountsDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        indicators.hasRecentAccounts = monthsSinceAccounts <= 18
      }

      // Estimate company size based on company type and accounts filing
      if (company.accounts?.last_accounts?.type) {
        switch (company.accounts.last_accounts.type.toLowerCase()) {
          case 'micro-entity':
            indicators.estimatedSize = 'micro'
            break
          case 'small':
            indicators.estimatedSize = 'small'
            break
          case 'medium':
            indicators.estimatedSize = 'medium'
            break
          case 'full':
          case 'group':
            indicators.estimatedSize = 'large'
            break
        }
      } else if (company.company_type === 'plc') {
        indicators.estimatedSize = 'large'
      }

      return indicators
    } catch (error) {
      console.error(`Failed to get financial indicators for ${companyNumber}:`, error)
      throw error
    }
  }

  /**
   * Make rate-limited API request
   */
  private async makeRequest(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.enforceRateLimit()

          const url = `${this.config.baseUrl}${endpoint}`
          const headers = {
            'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
            'Content-Type': 'application/json',
            'User-Agent': 'OppSpot-AcquisitionIntelligence/1.0'
          }

          const response = await fetch(url, { headers })

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limit exceeded, retry after delay
              await this.delay(60000) // Wait 1 minute
              return this.makeRequest(endpoint)
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          resolve(data)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.isProcessingQueue) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        await request()
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const timeSinceWindowStart = now - this.windowStart

    // Reset window if more than a minute has passed
    if (timeSinceWindowStart >= 60000) {
      this.requestCount = 0
      this.windowStart = now
    }

    // Check if we've exceeded the per-minute limit
    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - timeSinceWindowStart
      await this.delay(waitTime)
      this.requestCount = 0
      this.windowStart = Date.now()
    }

    // Ensure minimum time between requests
    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond
    if (timeSinceLastRequest < minInterval) {
      await this.delay(minInterval - timeSinceLastRequest)
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    success: boolean
    message: string
    rateLimit?: {
      remaining: number
      reset: number
    }
  }> {
    try {
      const testSearch = await this.searchCompanies({
        query: 'test',
        itemsPerPage: 1
      })

      return {
        success: true,
        message: `Connected successfully. Found ${testSearch.total_results} companies in test search.`
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      }
    }
  }
}

export default CompaniesHouseAPI