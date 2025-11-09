/**
 * SEC EDGAR API Client
 * Access to US public company filings and financial data
 * API Documentation: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 * Coverage: 10,000+ US public companies (SEC registrants)
 * Cost: FREE (no API key required, 10 requests/second limit)
 */

import { createClient } from '@/lib/supabase/server'

export interface SECCompany {
  // Company Identifiers
  cik: string // Central Index Key (10 digits)
  entityType: string // e.g., "operating", "investment"
  sic: string // Standard Industrial Classification code
  sicDescription: string

  // Company Details
  name: string
  tickers?: string[] // Stock ticker symbols
  exchanges?: string[] // Stock exchanges (NYSE, NASDAQ, etc.)

  // Address
  addresses: {
    mailing?: SECAddress
    business?: SECAddress
  }

  // Contact
  phone?: string
  website?: string

  // Filings
  filings: {
    recent: {
      accessionNumber: string[]
      filingDate: string[]
      reportDate: string[]
      acceptanceDateTime: string[]
      form: string[] // e.g., "10-K", "10-Q", "8-K"
      fileNumber: string[]
      filmNumber: string[]
      items?: string[]
      size: number[]
      isXBRL: number[]
      isInlineXBRL: number[]
      primaryDocument: string[]
      primaryDocDescription: string[]
    }
    files?: any[] // Additional files beyond recent
  }

  // Insider Transactions
  formerNames?: Array<{
    name: string
    from: string
    to: string
  }>

  // Metadata
  ein?: string // Employer Identification Number
  description?: string
  category?: string
  fiscalYearEnd?: string // MMDD format
  stateOfIncorporation?: string
  flags?: {
    investmentCompany?: boolean
    investmentCompanyType?: string
  }
}

export interface SECAddress {
  street1?: string
  street2?: string
  city?: string
  stateOrCountry?: string
  zipCode?: string
  stateOrCountryDescription?: string
}

export interface SECCompanyFacts {
  cik: string
  entityName: string
  facts: {
    [taxonomy: string]: {
      // e.g., "us-gaap", "dei"
      [concept: string]: {
        // e.g., "Assets", "Revenues"
        label: string
        description: string
        units: {
          [unit: string]: Array<{
            // e.g., "USD", "shares"
            end: string // Date
            val: number // Value
            accn: string // Accession number
            fy: number // Fiscal year
            fp: string // Fiscal period (Q1, Q2, Q3, FY)
            form: string // Filing form
            filed: string // Filing date
            frame?: string // e.g., "CY2023Q4"
          }>
        }
      }
    }
  }
}

export interface SECCompanyConcept {
  cik: string
  taxonomy: string
  tag: string
  label: string
  description: string
  entityName: string
  units: {
    [unit: string]: Array<{
      start?: string
      end: string
      val: number
      accn: string
      fy: number
      fp: string
      form: string
      filed: string
      frame?: string
    }>
  }
}

export class SECEdgarAPI {
  private baseUrl = 'https://data.sec.gov'
  private userAgent = 'oppSpot/1.0 (https://oppspot.ai; contact@oppspot.ai)' // Required by SEC
  private cacheTTLDays = 7 // SEC data updates weekly
  private requestDelay = 100 // 100ms between requests (10 req/sec limit)
  private lastRequestTime = 0

  /**
   * Search for company by name or ticker
   * Note: Uses company tickers JSON endpoint (updated nightly)
   */
  async searchCompany(query: string): Promise<
    Array<{
      cik: string
      ticker?: string
      title: string
    }>
  > {
    console.log(`[SEC EDGAR] Searching for: ${query}`)

    try {
      // Download company tickers file (updated nightly)
      const response = await this.makeRequest('/files/company_tickers.json')
      const companies = Object.values(response) as any[]

      // Search by name or ticker
      const queryLower = query.toLowerCase()
      const matches = companies
        .filter((c: any) => {
          const titleMatch = c.title?.toLowerCase().includes(queryLower)
          const tickerMatch = c.ticker?.toLowerCase().includes(queryLower)
          return titleMatch || tickerMatch
        })
        .slice(0, 20)
        .map((c: any) => ({
          cik: String(c.cik_str).padStart(10, '0'),
          ticker: c.ticker,
          title: c.title,
        }))

      console.log(`[SEC EDGAR] Found ${matches.length} matches`)
      return matches
    } catch (error) {
      console.error('[SEC EDGAR] Search failed:', error)
      return []
    }
  }

  /**
   * Get company submissions (all filings metadata)
   */
  async getCompanySubmissions(cik: string): Promise<SECCompany | null> {
    // Check cache first
    const cached = await this.getCachedCompany(cik)
    if (cached && !this.isCacheExpired(cached)) {
      console.log(`[SEC EDGAR] Cache HIT: ${cik}`)
      await this.logAPIUsage(`/submissions/CIK${cik}.json`, {
        cik,
        response_status: 200,
        response_time_ms: 0,
        cache_hit: true,
      })
      return cached.company_data
    }

    console.log(`[SEC EDGAR] Cache MISS: ${cik}`)

    const paddedCIK = cik.padStart(10, '0')
    const endpoint = `/submissions/CIK${paddedCIK}.json`
    const startTime = Date.now()

    try {
      const data = await this.makeRequest(endpoint)
      const responseTime = Date.now() - startTime

      const company = this.transformCompanyData(data)

      // Cache the result
      await this.cacheCompany(cik, company)

      // Log API usage
      await this.logAPIUsage(endpoint, {
        cik,
        response_status: 200,
        response_time_ms: responseTime,
        cache_hit: false,
      })

      return company
    } catch (error) {
      console.error(`[SEC EDGAR] Failed to get company ${cik}:`, error)
      return null
    }
  }

  /**
   * Get company facts (all XBRL financial data)
   */
  async getCompanyFacts(cik: string): Promise<SECCompanyFacts | null> {
    const paddedCIK = cik.padStart(10, '0')
    const endpoint = `/api/xbrl/companyfacts/CIK${paddedCIK}.json`

    console.log(`[SEC EDGAR] Getting company facts: ${cik}`)

    try {
      const data = await this.makeRequest(endpoint)
      return data as SECCompanyFacts
    } catch (error) {
      console.error(`[SEC EDGAR] Failed to get company facts ${cik}:`, error)
      return null
    }
  }

  /**
   * Get specific financial concept over time (e.g., Revenue, Assets)
   */
  async getCompanyConcept(
    cik: string,
    taxonomy: string,
    tag: string
  ): Promise<SECCompanyConcept | null> {
    const paddedCIK = cik.padStart(10, '0')
    const endpoint = `/api/xbrl/companyconcept/CIK${paddedCIK}/${taxonomy}/${tag}.json`

    console.log(`[SEC EDGAR] Getting concept: ${cik} - ${taxonomy}/${tag}`)

    try {
      const data = await this.makeRequest(endpoint)
      return data as SECCompanyConcept
    } catch (error) {
      console.error(`[SEC EDGAR] Failed to get concept ${cik}/${tag}:`, error)
      return null
    }
  }

  /**
   * Get revenue data for a company
   */
  async getRevenue(cik: string): Promise<
    Array<{
      fiscalYear: number
      fiscalPeriod: string
      value: number
      filingDate: string
    }>
  > {
    const concept = await this.getCompanyConcept(cik, 'us-gaap', 'Revenues')
    if (!concept || !concept.units.USD) return []

    return concept.units.USD.map((item) => ({
      fiscalYear: item.fy,
      fiscalPeriod: item.fp,
      value: item.val,
      filingDate: item.filed,
    })).sort((a, b) => b.fiscalYear - a.fiscalYear)
  }

  /**
   * Get latest 10-K filing (annual report)
   */
  async getLatest10K(cik: string): Promise<{
    accessionNumber: string
    filingDate: string
    reportDate: string
    primaryDocument: string
    url: string
  } | null> {
    const company = await this.getCompanySubmissions(cik)
    if (!company) return null

    const filings = company.filings.recent
    const index10K = filings.form.findIndex((f) => f === '10-K')

    if (index10K === -1) return null

    const accessionNumber = filings.accessionNumber[index10K]
    const cleanAccession = accessionNumber.replace(/-/g, '')

    return {
      accessionNumber,
      filingDate: filings.filingDate[index10K],
      reportDate: filings.reportDate[index10K],
      primaryDocument: filings.primaryDocument[index10K],
      url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${cleanAccession}/${filings.primaryDocument[index10K]}`,
    }
  }

  /**
   * Convert SEC company data to oppspot businesses table format
   */
  convertToStandardFormat(secCompany: SECCompany): {
    name: string
    company_number: string
    company_status: string
    company_type: string
    registered_office_address: any
    website?: string
    sic_codes: string[]
    data_source: 'sec_edgar'
    data_sources: any
    cache_expires_at: Date
    oc_jurisdiction_code: 'us'
    oc_uid: string
  } {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

    return {
      name: secCompany.name,
      company_number: secCompany.cik,
      company_status: 'Active', // SEC registrants are active
      company_type: secCompany.entityType || 'Public Company',
      registered_office_address: secCompany.addresses.business || secCompany.addresses.mailing,
      website: secCompany.website,
      sic_codes: secCompany.sic ? [secCompany.sic] : [],
      data_source: 'sec_edgar',
      data_sources: {
        sec_edgar: {
          last_updated: new Date(),
          cik: secCompany.cik,
          tickers: secCompany.tickers,
          exchanges: secCompany.exchanges,
        },
      },
      cache_expires_at: expiresAt,
      oc_jurisdiction_code: 'us',
      oc_uid: `sec-${secCompany.cik}`,
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Try to get Apple Inc. (known CIK: 0000320193)
      const apple = await this.getCompanySubmissions('320193')

      if (apple && apple.name.includes('Apple')) {
        return {
          success: true,
          message: 'Connected to SEC EDGAR API successfully.',
        }
      } else {
        return {
          success: false,
          message: 'SEC EDGAR API returned unexpected data',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `SEC EDGAR connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Make HTTP request with rate limiting and required User-Agent
   */
  private async makeRequest(endpoint: string): Promise<any> {
    // Rate limiting: 10 requests per second (100ms between requests)
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.requestDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()

    const url = `${this.baseUrl}${endpoint}`

    console.log(`[SEC EDGAR] GET ${endpoint}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent, // REQUIRED by SEC
        Accept: 'application/json',
      },
    })

    if (response.status === 404) {
      throw new Error(`SEC company not found: ${endpoint}`)
    }

    if (!response.ok) {
      throw new Error(`SEC EDGAR API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Transform SEC submissions data to our format
   */
  private transformCompanyData(data: any): SECCompany {
    return {
      cik: data.cik,
      entityType: data.entityType,
      sic: data.sic,
      sicDescription: data.sicDescription,
      name: data.name,
      tickers: data.tickers,
      exchanges: data.exchanges,
      addresses: {
        mailing: data.addresses?.mailing,
        business: data.addresses?.business,
      },
      phone: data.phone,
      website: data.website,
      filings: data.filings,
      formerNames: data.formerNames,
      ein: data.ein,
      description: data.description,
      category: data.category,
      fiscalYearEnd: data.fiscalYearEnd,
      stateOfIncorporation: data.stateOfIncorporation,
      flags: data.flags,
    }
  }

  // =====================================================
  // Caching
  // =====================================================

  /**
   * Get cached company data
   */
  private async getCachedCompany(
    cik: string
  ): Promise<{ company_data: SECCompany; expires_at: Date } | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sec_edgar_cache')
        .select('company_data, expires_at')
        .eq('cik', cik.padStart(10, '0'))
        .single()

      if (error || !data) return null

      return {
        company_data: data.company_data as SECCompany,
        expires_at: new Date(data.expires_at),
      }
    } catch (error) {
      console.error('[SEC EDGAR] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache company data
   */
  private async cacheCompany(cik: string, company: SECCompany): Promise<void> {
    try {
      const supabase = createClient()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

      await supabase.from('sec_edgar_cache').upsert(
        {
          cik: cik.padStart(10, '0'),
          company_data: company,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'cik',
        }
      )

      console.log(`[SEC EDGAR] Cached: ${cik} (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      console.error('[SEC EDGAR] Cache write error:', error)
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cached: { expires_at: Date }): boolean {
    return new Date() >= cached.expires_at
  }

  /**
   * Log API usage for monitoring
   */
  private async logAPIUsage(
    endpoint: string,
    data: {
      cik?: string
      response_status: number
      response_time_ms: number
      cache_hit: boolean
      error_message?: string
    }
  ): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.from('sec_edgar_api_usage').insert({
        endpoint,
        cik: data.cik,
        response_status: data.response_status,
        response_time_ms: data.response_time_ms,
        cache_hit: data.cache_hit,
        error_message: data.error_message,
      })
    } catch (error) {
      console.error('[SEC EDGAR] Failed to log API usage:', error)
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let apiClientInstance: SECEdgarAPI | null = null

/**
 * Get singleton instance of SEC EDGAR API client
 */
export function getSECEdgarAPI(): SECEdgarAPI {
  if (!apiClientInstance) {
    apiClientInstance = new SECEdgarAPI()
  }
  return apiClientInstance
}
