import { Database } from '@/lib/supabase/database.types'

type CompanyProfile = {
  company_number: string
  company_name: string
  company_status: string
  company_status_detail?: string
  date_of_incorporation?: string
  type: string
  jurisdiction?: string
  sic_codes?: string[]
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    country?: string
    region?: string
  }
  accounts?: {
    next_due?: string
    last_accounts?: {
      made_up_to?: string
      type?: string
    }
    accounting_reference_date?: {
      day?: string
      month?: string
    }
  }
  confirmation_statement?: {
    next_due?: string
    last_made_up_to?: string
  }
  etag?: string
  links?: {
    self?: string
    filing_history?: string
    officers?: string
    charges?: string
  }
}

type CompanyOfficer = {
  name: string
  officer_role: string
  appointed_on?: string
  resigned_on?: string
  date_of_birth?: {
    month?: number
    year?: number
  }
  nationality?: string
  country_of_residence?: string
  address?: {
    premises?: string
    address_line_1?: string
    locality?: string
    postal_code?: string
    country?: string
  }
}

type FilingHistoryItem = {
  category: string
  date: string
  description: string
  type: string
  links?: {
    self?: string
    document_metadata?: string
  }
}

type SearchResult = {
  items: Array<{
    company_number: string
    title: string
    company_status: string
    company_type: string
    date_of_incorporation?: string
    address?: {
      premises?: string
      address_line_1?: string
      locality?: string
      postal_code?: string
      country?: string
    }
    matches?: {
      title?: number[]
    }
  }>
  total_results: number
  items_per_page: number
  start_index: number
}

export class CompaniesHouseService {
  private apiKey: string
  private apiUrl: string
  private cacheTTL: number
  private rateLimitDelay = 100 // ms between requests
  private lastRequestTime = 0

  constructor() {
    this.apiKey = process.env.COMPANIES_HOUSE_API_KEY || ''
    this.apiUrl = process.env.COMPANIES_HOUSE_API_URL || 'https://api.company-information.service.gov.uk'
    this.cacheTTL = parseInt(process.env.COMPANIES_HOUSE_CACHE_TTL || '86400', 10) // 24 hours default
    
    if (!this.apiKey) {
      console.warn('Companies House API key not configured')
    }
  }

  private async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Companies House API key not configured')
    }

    await this.enforceRateLimit()

    const url = `${this.apiUrl}${endpoint}`
    const auth = Buffer.from(`${this.apiKey}:`).toString('base64')

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Company not found')
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (response.status === 401) {
          throw new Error('Invalid API key')
        }
        
        const errorText = await response.text()
        throw new Error(`Companies House API error: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to fetch from Companies House API')
    }
  }

  /**
   * Search for companies by name or number
   */
  async searchCompanies(query: string, itemsPerPage = 20, startIndex = 0): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      items_per_page: itemsPerPage.toString(),
      start_index: startIndex.toString(),
    })

    return this.makeRequest<SearchResult>(`/search/companies?${params}`)
  }

  /**
   * Get detailed company profile
   */
  async getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
    // Sanitize company number (remove spaces, convert to uppercase)
    const sanitizedNumber = companyNumber.replace(/\s/g, '').toUpperCase()
    return this.makeRequest<CompanyProfile>(`/company/${sanitizedNumber}`)
  }

  /**
   * Get company officers (directors, secretaries, etc.)
   */
  async getCompanyOfficers(companyNumber: string): Promise<{ items: CompanyOfficer[] }> {
    const sanitizedNumber = companyNumber.replace(/\s/g, '').toUpperCase()
    return this.makeRequest<{ items: CompanyOfficer[] }>(`/company/${sanitizedNumber}/officers`)
  }

  /**
   * Get filing history
   */
  async getFilingHistory(companyNumber: string, itemsPerPage = 25): Promise<{ items: FilingHistoryItem[] }> {
    const sanitizedNumber = companyNumber.replace(/\s/g, '').toUpperCase()
    const params = new URLSearchParams({
      items_per_page: itemsPerPage.toString(),
    })
    return this.makeRequest<{ items: FilingHistoryItem[] }>(`/company/${sanitizedNumber}/filing-history?${params}`)
  }

  /**
   * Convert Companies House data to our database format
   */
  formatForDatabase(companyData: CompanyProfile): Partial<Database['public']['Tables']['businesses']['Insert']> {
    return {
      company_number: companyData.company_number,
      name: companyData.company_name,
      company_status: companyData.company_status,
      company_type: companyData.type,
      incorporation_date: companyData.date_of_incorporation,
      sic_codes: companyData.sic_codes || [],
      registered_office_address: companyData.registered_office_address as unknown,
      companies_house_data: companyData as unknown,
      companies_house_last_updated: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + this.cacheTTL * 1000).toISOString(),
      data_sources: {
        companies_house: {
          last_updated: new Date().toISOString(),
          version: companyData.etag,
        }
      } as unknown,
      // Map address for consistency with existing schema
      address: companyData.registered_office_address ? {
        formatted: [
          companyData.registered_office_address.address_line_1,
          companyData.registered_office_address.address_line_2,
          companyData.registered_office_address.locality,
          companyData.registered_office_address.postal_code,
          companyData.registered_office_address.country,
        ].filter(Boolean).join(', '),
        street: companyData.registered_office_address.address_line_1,
        city: companyData.registered_office_address.locality,
        postal_code: companyData.registered_office_address.postal_code,
        country: companyData.registered_office_address.country,
      } as unknown : null,
    }
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(lastUpdated: string | null, ttlSeconds?: number): boolean {
    if (!lastUpdated) return false
    
    const ttl = ttlSeconds || this.cacheTTL
    const lastUpdatedTime = new Date(lastUpdated).getTime()
    const now = Date.now()
    const age = (now - lastUpdatedTime) / 1000 // age in seconds
    
    return age < ttl
  }

  /**
   * Get company with caching support
   */
  async getCompanyWithCache(
    companyNumber: string,
    existingData?: { companies_house_last_updated?: string | null }
  ): Promise<CompanyProfile | null> {
    // Check if we have valid cached data
    if (existingData?.companies_house_last_updated && 
        this.isCacheValid(existingData.companies_house_last_updated)) {
      return null // Return null to indicate cache is still valid
    }

    // Fetch fresh data from API
    try {
      return await this.getCompanyProfile(companyNumber)
    } catch (error) {
      console.error('Failed to fetch company from Companies House:', error)
      // Return null if fetch fails but we have cached data
      if (existingData?.companies_house_last_updated) {
        return null
      }
      throw error
    }
  }

  /**
   * Enrich existing business data with Companies House information
   */
  async enrichBusinessData(
    business: Partial<Database['public']['Tables']['businesses']['Row']>,
    forceRefresh = false
  ): Promise<Partial<Database['public']['Tables']['businesses']['Update']>> {
    // If no company number, try to find it via search
    let companyNumber = business.company_number
    
    if (!companyNumber && business.name) {
      try {
        const searchResults = await this.searchCompanies(business.name, 5)
        if (searchResults.items.length > 0) {
          // Try to find best match (could be enhanced with fuzzy matching)
          const match = searchResults.items.find(item => 
            item.title.toLowerCase() === business.name?.toLowerCase()
          ) || searchResults.items[0]
          
          companyNumber = match.company_number
        }
      } catch (error) {
        console.error('Failed to search for company:', error)
      }
    }

    if (!companyNumber) {
      return {}
    }

    // Check cache unless force refresh is requested
    if (!forceRefresh && business.companies_house_last_updated) {
      if (this.isCacheValid(business.companies_house_last_updated)) {
        return {} // Cache is still valid, no update needed
      }
    }

    try {
      // Fetch company profile
      const companyProfile = await this.getCompanyProfile(companyNumber)
      
      // Fetch additional data in parallel
      const [officers, filingHistory] = await Promise.all([
        this.getCompanyOfficers(companyNumber).catch(() => ({ items: [] })),
        this.getFilingHistory(companyNumber).catch(() => ({ items: [] })),
      ])

      // Format for database update
      const updates = this.formatForDatabase(companyProfile)
      
      // Add officers and filing history
      return {
        ...updates,
        officers: officers.items as unknown,
        filing_history: filingHistory.items.slice(0, 10) as unknown, // Keep last 10 filings
      }
    } catch (error) {
      console.error('Failed to enrich business data:', error)
      throw error
    }
  }
}

// Singleton instance
let instance: CompaniesHouseService | null = null

export function getCompaniesHouseService(): CompaniesHouseService {
  if (!instance) {
    instance = new CompaniesHouseService()
  }
  return instance
}