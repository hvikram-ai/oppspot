/**
 * OpenCorporates API Client
 * Handles communication with OpenCorporates API with rate limiting and caching
 * API Documentation: https://api.opencorporates.com/documentation/API-Reference
 */

import {
  OpenCorporatesAPIResponse,
  OpenCorporatesCompany,
  OpenCorporatesCompanyResponse,
  OpenCorporatesSearchResponse,
  OpenCorporatesOfficersResponse,
  OpenCorporatesFilingsResponse,
  OpenCorporatesSearchParams,
  OpenCorporatesCompanyParams,
  OpenCorporatesError,
  OpenCorporatesRateLimitError,
  OpenCorporatesNotFoundError,
  OpenCorporatesRateLimitConfig,
  OpenCorporatesRateLimitState,
  OpenCorporatesAPIUsage,
} from '@/types/opencorporates'
import { createAdminClient } from '@/lib/supabase/server'

export class OpenCorporatesAPI {
  private baseUrl = 'https://api.opencorporates.com/v0.4'
  private apiKey: string
  private rateLimitConfig: OpenCorporatesRateLimitConfig
  private rateLimitState: OpenCorporatesRateLimitState
  private rateLimitStateId = 'global'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENCORPORATES_API_KEY || ''

    // Initialize rate limit config from environment or defaults
    this.rateLimitConfig = {
      requestsPerMonth: parseInt(process.env.OPENCORPORATES_RATE_LIMIT_PER_MONTH || '200'),
      requestsPerDay: parseInt(process.env.OPENCORPORATES_RATE_LIMIT_PER_DAY || '50'),
      cacheTTLDays: parseInt(process.env.OPENCORPORATES_CACHE_TTL_DAYS || '30'),
    }

    // Initialize rate limit state
    this.rateLimitState = {
      monthlyRequests: 0,
      dailyRequests: 0,
      monthResetDate: this.getNextMonthStart(),
      dayResetDate: this.getNextDayStart(),
    }

    // Load current rate limit state from database
    this.loadRateLimitState()
  }

  // =====================================================
  // Public API Methods
  // =====================================================

  /**
   * Search for companies across jurisdictions
   */
  async searchCompanies(
    params: OpenCorporatesSearchParams
  ): Promise<OpenCorporatesSearchResponse> {
    const queryParams = new URLSearchParams()

    if (params.q) queryParams.append('q', params.q)
    if (params.jurisdiction_code) {
      const jurisdictions = Array.isArray(params.jurisdiction_code)
        ? params.jurisdiction_code
        : [params.jurisdiction_code]
      jurisdictions.forEach((j) => queryParams.append('jurisdiction_code', j))
    }
    if (params.company_type) queryParams.append('company_type', params.company_type)
    if (params.current_status) queryParams.append('current_status', params.current_status)
    if (params.created_since) queryParams.append('created_since', params.created_since)
    if (params.branch) queryParams.append('branch', params.branch)
    if (params.nonprofit !== undefined) queryParams.append('nonprofit', String(params.nonprofit))
    if (params.order) queryParams.append('order', params.order)
    if (params.page) queryParams.append('page', String(params.page))
    if (params.per_page) queryParams.append('per_page', String(params.per_page))
    if (params.sparse) queryParams.append('sparse', 'true')

    const endpoint = `/companies/search?${queryParams.toString()}`
    const response = await this.makeRequest<OpenCorporatesAPIResponse<OpenCorporatesSearchResponse>>(
      endpoint
    )

    return response.results
  }

  /**
   * Get company details by jurisdiction and company number
   */
  async getCompany(
    jurisdiction: string,
    companyNumber: string,
    params?: OpenCorporatesCompanyParams
  ): Promise<OpenCorporatesCompany> {
    // Check cache first
    const cached = await this.getCachedCompany(jurisdiction, companyNumber)
    if (cached && !this.isCacheExpired(cached)) {
      console.log(`[OpenCorporates] Cache HIT: ${jurisdiction}/${companyNumber}`)
      await this.logAPIUsage(`/companies/${jurisdiction}/${companyNumber}`, {
        jurisdiction_code: jurisdiction,
        company_number: companyNumber,
        response_status: 200,
        response_time_ms: 0,
        cache_hit: true,
      })
      return cached.company_data
    }

    console.log(`[OpenCorporates] Cache MISS: ${jurisdiction}/${companyNumber}`)

    // Fetch from API
    const queryParams = new URLSearchParams()
    if (params?.sparse) queryParams.append('sparse', 'true')
    if (params?.fields) {
      params.fields.forEach((field) => queryParams.append('fields', field))
    }

    const query = queryParams.toString()
    const endpoint = `/companies/${jurisdiction}/${companyNumber}${query ? `?${query}` : ''}`

    const startTime = Date.now()
    const response = await this.makeRequest<OpenCorporatesAPIResponse<OpenCorporatesCompanyResponse>>(
      endpoint
    )
    const responseTime = Date.now() - startTime

    const company = response.results.company

    // Cache the result
    await this.cacheCompany(jurisdiction, companyNumber, company)

    // Log API usage
    await this.logAPIUsage(endpoint, {
      jurisdiction_code: jurisdiction,
      company_number: companyNumber,
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
    })

    return company
  }

  /**
   * Get officers for a company
   */
  async getOfficers(
    jurisdiction: string,
    companyNumber: string,
    page?: number
  ): Promise<OpenCorporatesOfficersResponse> {
    const queryParams = new URLSearchParams()
    if (page) queryParams.append('page', String(page))

    const query = queryParams.toString()
    const endpoint = `/companies/${jurisdiction}/${companyNumber}/officers${query ? `?${query}` : ''}`

    const response = await this.makeRequest<OpenCorporatesAPIResponse<{ officers: unknown[] }>>(
      endpoint
    )

    return {
      officers: response.results.officers || [],
      total_count: response.results.officers?.length,
      page: page || 1,
    }
  }

  /**
   * Get filings for a company
   */
  async getFilings(
    jurisdiction: string,
    companyNumber: string,
    page?: number
  ): Promise<OpenCorporatesFilingsResponse> {
    const queryParams = new URLSearchParams()
    if (page) queryParams.append('page', String(page))

    const query = queryParams.toString()
    const endpoint = `/companies/${jurisdiction}/${companyNumber}/filings${query ? `?${query}` : ''}`

    const response = await this.makeRequest<OpenCorporatesAPIResponse<{ filings: unknown[] }>>(
      endpoint
    )

    return {
      filings: response.results.filings || [],
      total_count: response.results.filings?.length,
      page: page || 1,
    }
  }

  // =====================================================
  // Rate Limiting
  // =====================================================

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    // Reset counters if time periods have elapsed
    const now = new Date()

    if (now >= this.rateLimitState.dayResetDate) {
      this.rateLimitState.dailyRequests = 0
      this.rateLimitState.dayResetDate = this.getNextDayStart()
    }

    if (now >= this.rateLimitState.monthResetDate) {
      this.rateLimitState.monthlyRequests = 0
      this.rateLimitState.monthResetDate = this.getNextMonthStart()
    }

    // Check limits
    if (this.rateLimitState.dailyRequests >= this.rateLimitConfig.requestsPerDay) {
      const retryAfter = Math.ceil(
        (this.rateLimitState.dayResetDate.getTime() - now.getTime()) / 1000
      )
      throw new OpenCorporatesRateLimitError(
        `Daily API limit exceeded (${this.rateLimitConfig.requestsPerDay}/day). Try again in ${Math.ceil(retryAfter / 3600)} hours.`,
        retryAfter
      )
    }

    if (this.rateLimitState.monthlyRequests >= this.rateLimitConfig.requestsPerMonth) {
      const retryAfter = Math.ceil(
        (this.rateLimitState.monthResetDate.getTime() - now.getTime()) / 1000
      )
      throw new OpenCorporatesRateLimitError(
        `Monthly API limit exceeded (${this.rateLimitConfig.requestsPerMonth}/month). Try again in ${Math.ceil(retryAfter / 86400)} days.`,
        retryAfter
      )
    }
  }

  /**
   * Increment rate limit counters
   */
  private async incrementRateLimitCounters(): Promise<void> {
    this.rateLimitState.dailyRequests++
    this.rateLimitState.monthlyRequests++
    await this.saveRateLimitState()
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<{
    dailyRemaining: number
    monthlyRemaining: number
    dailyResetAt: Date
    monthlyResetAt: Date
  }> {
    return {
      dailyRemaining: this.rateLimitConfig.requestsPerDay - this.rateLimitState.dailyRequests,
      monthlyRemaining: this.rateLimitConfig.requestsPerMonth - this.rateLimitState.monthlyRequests,
      dailyResetAt: this.rateLimitState.dayResetDate,
      monthlyResetAt: this.rateLimitState.monthResetDate,
    }
  }

  // =====================================================
  // Caching
  // =====================================================

  /**
   * Get cached company data
   */
  private async getCachedCompany(
    jurisdiction: string,
    companyNumber: string
  ): Promise<{ company_data: OpenCorporatesCompany; expires_at: Date } | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('opencorporates_cache')
        .select('company_data, expires_at')
        .eq('jurisdiction_code', jurisdiction)
        .eq('company_number', companyNumber)
        .single()

      if (error || !data) return null

      return {
        company_data: data.company_data as OpenCorporatesCompany,
        expires_at: new Date(data.expires_at),
      }
    } catch (error) {
      console.error('[OpenCorporates] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache company data
   */
  private async cacheCompany(
    jurisdiction: string,
    companyNumber: string,
    company: OpenCorporatesCompany
  ): Promise<void> {
    try {
      const supabase = createClient()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.rateLimitConfig.cacheTTLDays)

      await supabase.from('opencorporates_cache').upsert(
        {
          jurisdiction_code: jurisdiction,
          company_number: companyNumber,
          company_data: company,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'jurisdiction_code,company_number',
        }
      )

      console.log(`[OpenCorporates] Cached: ${jurisdiction}/${companyNumber} (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      console.error('[OpenCorporates] Cache write error:', error)
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cached: { expires_at: Date }): boolean {
    return new Date() >= cached.expires_at
  }

  // =====================================================
  // HTTP Request Handling
  // =====================================================

  /**
   * Make HTTP request to OpenCorporates API
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Check rate limits
    await this.checkRateLimit()

    // Build URL
    const url = new URL(endpoint, this.baseUrl)
    if (this.apiKey) {
      url.searchParams.append('api_token', this.apiKey)
    }

    console.log(`[OpenCorporates] GET ${endpoint}`)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'oppSpot/1.0 (https://oppspot.ai)',
        },
      })

      // Increment rate limit counters
      await this.incrementRateLimitCounters()

      // Handle errors
      if (!response.ok) {
        await this.handleHTTPError(response, endpoint)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof OpenCorporatesError) {
        throw error
      }
      throw new OpenCorporatesError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
        0,
        { endpoint, originalError: error }
      )
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHTTPError(response: Response, endpoint: string): Promise<never> {
    const status = response.status
    let errorMessage = `HTTP ${status}: ${response.statusText}`
    let errorCode = 'HTTP_ERROR'
    let errorDetails: Record<string, unknown> = { endpoint, status }

    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage
        errorCode = errorData.error.code || errorCode
        errorDetails = { ...errorDetails, ...errorData.error }
      }
    } catch {
      // JSON parsing failed, use default error message
    }

    // Log failed request
    await this.logAPIUsage(endpoint, {
      response_status: status,
      response_time_ms: 0,
      cache_hit: false,
      error_message: errorMessage,
    })

    // Throw specific error types
    if (status === 404) {
      const match = endpoint.match(/\/companies\/([^/]+)\/([^/?]+)/)
      if (match) {
        throw new OpenCorporatesNotFoundError(match[1], match[2])
      }
    }

    if (status === 429) {
      throw new OpenCorporatesRateLimitError(errorMessage)
    }

    throw new OpenCorporatesError(errorMessage, errorCode, status, errorDetails)
  }

  // =====================================================
  // Logging & Monitoring
  // =====================================================

  /**
   * Log API usage for monitoring
   */
  private async logAPIUsage(
    endpoint: string,
    data: Partial<OpenCorporatesAPIUsage>
  ): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.from('opencorporates_api_usage').insert({
        endpoint,
        jurisdiction_code: data.jurisdiction_code,
        company_number: data.company_number,
        response_status: data.response_status || 0,
        response_time_ms: data.response_time_ms || 0,
        cache_hit: data.cache_hit || false,
        error_message: data.error_message,
      })
    } catch (error) {
      console.error('[OpenCorporates] Failed to log API usage:', error)
    }
  }

  // =====================================================
  // Rate Limit State Persistence
  // =====================================================

  /**
   * Load rate limit state from database
   */
  private async loadRateLimitState(): Promise<void> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('opencorporates_rate_limits')
        .select('daily_requests, monthly_requests, day_reset_date, month_reset_date')
        .eq('id', this.rateLimitStateId)
        .single()

      if (error) {
        console.warn('[OpenCorporates] Rate limit state not loaded (missing table or row):', error.message)
        return
      }

      if (data) {
        this.rateLimitState.dailyRequests = data.daily_requests ?? this.rateLimitState.dailyRequests
        this.rateLimitState.monthlyRequests = data.monthly_requests ?? this.rateLimitState.monthlyRequests
        this.rateLimitState.dayResetDate = data.day_reset_date ? new Date(data.day_reset_date) : this.rateLimitState.dayResetDate
        this.rateLimitState.monthResetDate = data.month_reset_date ? new Date(data.month_reset_date) : this.rateLimitState.monthResetDate
        console.log('[OpenCorporates] Loaded rate limit state from database')
      }
    } catch (error) {
      console.warn('[OpenCorporates] Failed to load rate limit state:', error)
    }
  }

  /**
   * Save rate limit state to database
   */
  private async saveRateLimitState(): Promise<void> {
    try {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from('opencorporates_rate_limits')
        .upsert({
          id: this.rateLimitStateId,
          daily_requests: this.rateLimitState.dailyRequests,
          monthly_requests: this.rateLimitState.monthlyRequests,
          day_reset_date: this.rateLimitState.dayResetDate.toISOString(),
          month_reset_date: this.rateLimitState.monthResetDate.toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.warn('[OpenCorporates] Failed to persist rate limit state:', error.message)
      }
    } catch (error) {
      console.warn('[OpenCorporates] Failed to persist rate limit state:', error)
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Get start of next day (UTC)
   */
  private getNextDayStart(): Date {
    const tomorrow = new Date()
    tomorrow.setUTCHours(24, 0, 0, 0)
    return tomorrow
  }

  /**
   * Get start of next month (UTC)
   */
  private getNextMonthStart(): Date {
    const nextMonth = new Date()
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1)
    nextMonth.setUTCHours(0, 0, 0, 0)
    return nextMonth
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let apiClientInstance: OpenCorporatesAPI | null = null

/**
 * Get singleton instance of OpenCorporates API client
 */
export function getOpenCorporatesAPI(): OpenCorporatesAPI {
  if (!apiClientInstance) {
    apiClientInstance = new OpenCorporatesAPI()
  }
  return apiClientInstance
}
