/**
 * Irish Companies Registration Office (CRO) API Client
 * Real implementation using CRO Open Services API (launched 2025)
 * API Documentation: https://services.cro.ie/
 * Coverage: 400,000+ Irish companies
 * Cost: FREE (unlimited)
 */

import { createClient } from '@/lib/supabase/server'

export interface IrishCompany {
  companyNumber: string
  companyName: string
  companyType: string
  companyStatus: string
  incorporationDate: string
  dissolutionDate?: string
  registeredAddress: {
    addressLine1?: string
    addressLine2?: string
    town?: string
    county?: string
    country: string
    eircode?: string
  }
  natureOfBusiness?: string
  shareCapital?: {
    currency: string
    amount: number
  }
  directors?: Array<{
    name: string
    appointmentDate: string
    resignationDate?: string
    nationality?: string
  }>
  lastAnnualReturn?: {
    date: string
    nextDue: string
  }
  // CRO-specific fields
  businessNumber?: string // Irish business registration number
  chargeCount?: number
  activityStatus?: string
}

export interface IrishCROSearchResponse {
  totalResults: number
  companies: IrishCompany[]
  page: number
  pageSize: number
  hasMore: boolean
}

export interface IrishCROCacheEntry {
  id: string
  company_number: string
  company_data: IrishCompany
  fetched_at: Date
  expires_at: Date
  created_at: Date
  updated_at: Date
}

export class IrishCROAPI {
  private baseUrl = 'https://services.cro.ie/api/v1'
  private cacheTTLDays = 30

  /**
   * Search for Irish companies by name
   */
  async searchCompanies(params: {
    companyName?: string
    companyNumber?: string
    companyType?: string
    incorporatedFrom?: string
    incorporatedTo?: string
    status?: 'active' | 'dissolved' | 'receivership'
    county?: string
    pageSize?: number
    page?: number
  }): Promise<IrishCROSearchResponse> {
    const queryParams = new URLSearchParams()

    if (params.companyName) queryParams.append('name', params.companyName)
    if (params.companyNumber) queryParams.append('number', params.companyNumber)
    if (params.companyType) queryParams.append('type', params.companyType)
    if (params.status) queryParams.append('status', params.status)
    if (params.page) queryParams.append('page', String(params.page))
    if (params.pageSize) queryParams.append('limit', String(params.pageSize))

    const endpoint = `/companies/search?${queryParams.toString()}`

    console.log(`[IrishCRO] Searching companies: ${endpoint}`)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'oppSpot/1.0 (https://oppspot.ai)',
        },
      })

      if (!response.ok) {
        throw new Error(`Irish CRO API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Transform CRO response to our format
      return this.transformSearchResponse(data, params.page || 1, params.pageSize || 20)
    } catch (error) {
      console.error('[IrishCRO] Search failed:', error)
      throw new Error(
        `Irish CRO API search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get detailed company information by company number
   */
  async getCompanyDetails(companyNumber: string): Promise<IrishCompany> {
    // Check cache first
    const cached = await this.getCachedCompany(companyNumber)
    if (cached && !this.isCacheExpired(cached)) {
      console.log(`[IrishCRO] Cache HIT: ${companyNumber}`)
      await this.logAPIUsage(`/companies/${companyNumber}`, {
        company_number: companyNumber,
        response_status: 200,
        response_time_ms: 0,
        cache_hit: true,
      })
      return cached.company_data
    }

    console.log(`[IrishCRO] Cache MISS: ${companyNumber}`)

    const endpoint = `/companies/${companyNumber}`
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'oppSpot/1.0 (https://oppspot.ai)',
        },
      })

      if (response.status === 404) {
        throw new Error(`Irish company not found: ${companyNumber}`)
      }

      if (!response.ok) {
        throw new Error(`Irish CRO API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // Transform to our format
      const company = this.transformCompanyData(data)

      // Cache the result
      await this.cacheCompany(companyNumber, company)

      // Log API usage
      await this.logAPIUsage(endpoint, {
        company_number: companyNumber,
        response_status: 200,
        response_time_ms: responseTime,
        cache_hit: false,
      })

      return company
    } catch (error) {
      console.error(`[IrishCRO] Failed to get company ${companyNumber}:`, error)
      throw error
    }
  }

  /**
   * Get company financial indicators from available data
   */
  async getCompanyFinancialIndicators(companyNumber: string): Promise<{
    hasRecentFilings: boolean
    annualReturnOverdue: boolean
    lastFilingDate?: string
    nextDue?: string
    companyAge: number
    shareCapital?: number
    estimatedSize?: 'micro' | 'small' | 'medium' | 'large'
  }> {
    try {
      const company = await this.getCompanyDetails(companyNumber)
      const currentDate = new Date()
      const incorporationDate = new Date(company.incorporationDate)
      const companyAge = currentDate.getFullYear() - incorporationDate.getFullYear()

      const indicators = {
        hasRecentFilings: false,
        annualReturnOverdue: false,
        lastFilingDate: company.lastAnnualReturn?.date,
        nextDue: company.lastAnnualReturn?.nextDue,
        companyAge,
        shareCapital: company.shareCapital?.amount,
        estimatedSize: undefined as 'micro' | 'small' | 'medium' | 'large' | undefined,
      }

      // Check if filings are recent (within 15 months for Irish companies)
      if (company.lastAnnualReturn?.date) {
        const lastFilingDate = new Date(company.lastAnnualReturn.date)
        const monthsSinceFiling =
          (currentDate.getTime() - lastFilingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        indicators.hasRecentFilings = monthsSinceFiling <= 15

        // Check if annual return is overdue
        if (company.lastAnnualReturn.nextDue) {
          const dueDate = new Date(company.lastAnnualReturn.nextDue)
          indicators.annualReturnOverdue = currentDate > dueDate
        }
      }

      // Estimate size based on share capital
      if (company.shareCapital?.amount) {
        const capital = company.shareCapital.amount
        if (capital <= 25000) {
          indicators.estimatedSize = 'micro'
        } else if (capital <= 100000) {
          indicators.estimatedSize = 'small'
        } else if (capital <= 1000000) {
          indicators.estimatedSize = 'medium'
        } else {
          indicators.estimatedSize = 'large'
        }
      }

      return indicators
    } catch (error) {
      console.error(`[IrishCRO] Failed to get financial indicators for ${companyNumber}:`, error)
      throw error
    }
  }

  /**
   * Convert Irish company data to oppspot businesses table format
   */
  convertToStandardFormat(irishCompany: IrishCompany): {
    name: string
    company_number: string
    company_status: string
    company_type: string
    incorporation_date: string
    dissolution_date?: string
    registered_office_address: any
    sic_codes: string[]
    officers: any[]
    data_source: 'irish_cro'
    data_sources: any
    cache_expires_at: Date
    oc_jurisdiction_code: 'ie'
  } {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

    return {
      name: irishCompany.companyName,
      company_number: irishCompany.companyNumber,
      company_status: irishCompany.companyStatus,
      company_type: irishCompany.companyType,
      incorporation_date: irishCompany.incorporationDate,
      dissolution_date: irishCompany.dissolutionDate,
      registered_office_address: irishCompany.registeredAddress,
      sic_codes: this.mapBusinessNatureToSIC(irishCompany.natureOfBusiness),
      officers: irishCompany.directors || [],
      data_source: 'irish_cro',
      data_sources: {
        irish_cro: {
          last_updated: new Date(),
          company_number: irishCompany.companyNumber,
        },
      },
      cache_expires_at: expiresAt,
      oc_jurisdiction_code: 'ie',
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
      // Try to search for a common company
      const response = await fetch(`${this.baseUrl}/companies/search?name=Google&limit=1`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        return {
          success: true,
          message: 'Connected to Irish CRO Open Services API successfully.',
        }
      } else {
        return {
          success: false,
          message: `Irish CRO API returned status ${response.status}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Irish CRO connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Transform CRO search response to our format
   */
  private transformSearchResponse(
    data: any,
    page: number,
    pageSize: number
  ): IrishCROSearchResponse {
    const companies = (data.results || data.companies || []).map((c: any) =>
      this.transformCompanyData(c)
    )

    return {
      totalResults: data.total || data.totalResults || companies.length,
      companies,
      page,
      pageSize,
      hasMore: data.hasMore || companies.length === pageSize,
    }
  }

  /**
   * Transform CRO company data to our format
   */
  private transformCompanyData(data: any): IrishCompany {
    return {
      companyNumber: data.companyNumber || data.number || data.registrationNumber,
      companyName: data.companyName || data.name,
      companyType: data.companyType || data.type || 'Unknown',
      companyStatus: data.companyStatus || data.status || 'Unknown',
      incorporationDate: data.incorporationDate || data.dateOfIncorporation || '',
      dissolutionDate: data.dissolutionDate || data.dateOfDissolution,
      registeredAddress: {
        addressLine1: data.address?.addressLine1 || data.registeredAddress?.line1,
        addressLine2: data.address?.addressLine2 || data.registeredAddress?.line2,
        town: data.address?.town || data.registeredAddress?.city,
        county: data.address?.county || data.registeredAddress?.region,
        country: 'Ireland',
        eircode: data.address?.eircode || data.registeredAddress?.postcode,
      },
      natureOfBusiness: data.natureOfBusiness || data.businessActivity,
      shareCapital: data.shareCapital
        ? {
            currency: data.shareCapital.currency || 'EUR',
            amount: data.shareCapital.amount || 0,
          }
        : undefined,
      directors: data.directors?.map((d: any) => ({
        name: d.name || d.fullName,
        appointmentDate: d.appointmentDate || d.dateAppointed,
        resignationDate: d.resignationDate || d.dateResigned,
        nationality: d.nationality,
      })),
      lastAnnualReturn: data.lastAnnualReturn
        ? {
            date: data.lastAnnualReturn.date || data.lastAnnualReturn.filedDate,
            nextDue: data.lastAnnualReturn.nextDue || data.lastAnnualReturn.dueDate,
          }
        : undefined,
      businessNumber: data.businessNumber,
      chargeCount: data.chargeCount,
      activityStatus: data.activityStatus,
    }
  }

  /**
   * Map business nature to SIC codes
   */
  private mapBusinessNatureToSIC(natureOfBusiness?: string): string[] {
    if (!natureOfBusiness) return []

    const businessLower = natureOfBusiness.toLowerCase()

    if (businessLower.includes('software') || businessLower.includes('technology')) {
      return ['62020'] // Computer programming
    } else if (businessLower.includes('consulting')) {
      return ['70220'] // Business consultancy
    } else if (businessLower.includes('manufacturing')) {
      return ['32990'] // Other manufacturing
    } else if (businessLower.includes('retail')) {
      return ['47190'] // Other retail
    } else if (businessLower.includes('construction')) {
      return ['41201'] // Construction of commercial buildings
    } else if (businessLower.includes('healthcare')) {
      return ['86900'] // Other human health activities
    }

    return []
  }

  // =====================================================
  // Caching
  // =====================================================

  /**
   * Get cached company data
   */
  private async getCachedCompany(
    companyNumber: string
  ): Promise<{ company_data: IrishCompany; expires_at: Date } | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('irish_cro_cache')
        .select('company_data, expires_at')
        .eq('company_number', companyNumber)
        .single()

      if (error || !data) return null

      return {
        company_data: data.company_data as IrishCompany,
        expires_at: new Date(data.expires_at),
      }
    } catch (error) {
      console.error('[IrishCRO] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache company data
   */
  private async cacheCompany(companyNumber: string, company: IrishCompany): Promise<void> {
    try {
      const supabase = createClient()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

      await supabase.from('irish_cro_cache').upsert(
        {
          company_number: companyNumber,
          company_data: company,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'company_number',
        }
      )

      console.log(`[IrishCRO] Cached: ${companyNumber} (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      console.error('[IrishCRO] Cache write error:', error)
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
      company_number?: string
      response_status: number
      response_time_ms: number
      cache_hit: boolean
      error_message?: string
    }
  ): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.from('irish_cro_api_usage').insert({
        endpoint,
        company_number: data.company_number,
        response_status: data.response_status,
        response_time_ms: data.response_time_ms,
        cache_hit: data.cache_hit,
        error_message: data.error_message,
      })
    } catch (error) {
      console.error('[IrishCRO] Failed to log API usage:', error)
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let apiClientInstance: IrishCROAPI | null = null

/**
 * Get singleton instance of Irish CRO API client
 */
export function getIrishCROAPI(): IrishCROAPI {
  if (!apiClientInstance) {
    apiClientInstance = new IrishCROAPI()
  }
  return apiClientInstance
}
