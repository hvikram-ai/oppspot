/**
 * Companies House Service - Lite Version
 * 
 * This version works with the existing database schema by storing
 * Companies House data in the metadata JSONB field until the full
 * migration is applied.
 */

import { Database } from '@/types/database'

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
  }
  confirmation_statement?: {
    next_due?: string
    last_made_up_to?: string
  }
  etag?: string
}

export class CompaniesHouseServiceLite {
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

  private async makeRequest<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Companies House API key not configured')
    }

    await this.enforceRateLimit()

    const url = `${this.apiUrl}${endpoint}`
    const auth = Buffer.from(`${this.apiKey}:`).toString('base64')

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
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
  async searchCompanies(query: string, itemsPerPage = 20, startIndex = 0) {
    const params = new URLSearchParams({
      q: query,
      items_per_page: itemsPerPage.toString(),
      start_index: startIndex.toString(),
    })

    return this.makeRequest<any>(`/search/companies?${params}`)
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
    const sanitizedNumber = companyNumber.replace(/\s/g, '').toUpperCase()
    return this.makeRequest<CompanyProfile>(`/company/${sanitizedNumber}`)
  }

  /**
   * Format for existing database schema (stores in metadata field)
   */
  formatForDatabase(companyData: CompanyProfile): Partial<Database['public']['Tables']['businesses']['Insert']> {
    // Store Companies House data in metadata field
    const companiesHouseData = {
      company_number: companyData.company_number,
      company_status: companyData.company_status,
      company_type: companyData.type,
      incorporation_date: companyData.date_of_incorporation,
      sic_codes: companyData.sic_codes || [],
      registered_office_address: companyData.registered_office_address,
      accounts: companyData.accounts,
      confirmation_statement: companyData.confirmation_statement,
      last_updated: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + this.cacheTTL * 1000).toISOString(),
    }

    return {
      name: companyData.company_name,
      metadata: {
        companies_house: companiesHouseData,
        data_sources: ['companies_house'],
        last_enriched: new Date().toISOString(),
      } as any,
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
      } as any : {},
      verified_at: new Date().toISOString(),
      categories: this.mapSicCodesToCategories(companyData.sic_codes),
    }
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(metadata: any): boolean {
    if (!metadata?.companies_house?.cache_expires_at) return false
    
    const expiresAt = new Date(metadata.companies_house.cache_expires_at).getTime()
    const now = Date.now()
    
    return now < expiresAt
  }

  /**
   * Map SIC codes to business categories
   */
  private mapSicCodesToCategories(sicCodes?: string[]): string[] {
    if (!sicCodes || sicCodes.length === 0) return []
    
    const categories: string[] = []
    
    for (const code of sicCodes) {
      // Map common SIC codes to categories
      if (code.startsWith('62')) categories.push('Technology')
      if (code.startsWith('47')) categories.push('Retail')
      if (code.startsWith('56')) categories.push('Food & Beverage')
      if (code.startsWith('68')) categories.push('Real Estate')
      if (code.startsWith('85')) categories.push('Education')
      if (code.startsWith('86') || code.startsWith('87')) categories.push('Healthcare')
      if (code.startsWith('64') || code.startsWith('65')) categories.push('Financial Services')
      if (code.startsWith('41') || code.startsWith('42')) categories.push('Construction')
      if (code.startsWith('45')) categories.push('Automotive')
      if (code.startsWith('73')) categories.push('Advertising & Marketing')
    }
    
    // Return unique categories
    return [...new Set(categories)]
  }

  /**
   * Get company number from metadata
   */
  getCompanyNumber(business: any): string | null {
    return business.metadata?.companies_house?.company_number || null
  }

  /**
   * Get Companies House data from metadata
   */
  getCompaniesHouseData(business: any): any {
    return business.metadata?.companies_house || null
  }
}

// Singleton instance
let instance: CompaniesHouseServiceLite | null = null

export function getCompaniesHouseService(): CompaniesHouseServiceLite {
  if (!instance) {
    instance = new CompaniesHouseServiceLite()
  }
  return instance
}