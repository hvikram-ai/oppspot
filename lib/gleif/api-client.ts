/**
 * GLEIF (Global Legal Entity Identifier Foundation) API Client
 * Access to 2.5M+ legal entities globally (banks, investment firms, large corporations)
 * API Documentation: https://www.gleif.org/en/lei-data/gleif-api
 * Coverage: Global (mandatory for financial entities)
 * Cost: FREE (unlimited, no auth required)
 */

import { createClient } from '@/lib/supabase/server'

export interface LEIEntity {
  // Legal Entity Identifier
  lei: string

  // Entity Details
  legalName: string
  legalForm?: string
  entityStatus: 'ACTIVE' | 'INACTIVE'
  entityCategory?: string

  // Registration
  legalJurisdiction: string // ISO 3166-1 alpha-2 country code
  registrationAuthority?: string
  registrationNumber?: string // Company registration number

  // Address
  legalAddress: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    region?: string
    country: string
    postalCode?: string
  }
  headquartersAddress?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    region?: string
    country: string
    postalCode?: string
  }

  // Relationships
  ultimateParent?: {
    lei: string
    legalName: string
  }
  directParent?: {
    lei: string
    legalName: string
  }

  // Identifiers
  bic?: string[] // Bank Identifier Code (SWIFT)
  mic?: string[] // Market Identifier Code

  // Metadata
  registrationDate: string
  lastUpdateDate: string
  nextRenewalDate: string
  managingLOU: string // Local Operating Unit

  // Data Quality
  leiStatus: 'ISSUED' | 'LAPSED' | 'CANCELLED' | 'RETIRED' | 'ANNULLED' | 'DUPLICATE'
  validationSources?: string
}

export interface LEISearchResult {
  lei: string
  legalName: string
  entityStatus: string
  legalJurisdiction: string
  registrationNumber?: string
}

export interface LEISearchResponse {
  data: LEISearchResult[]
  meta: {
    pagination: {
      total: number
      page: number
      perPage: number
      totalPages: number
    }
  }
}

export class GLEIFAPI {
  private baseUrl = 'https://api.gleif.org/api/v1'
  private leilexBaseUrl = 'https://api.leilex.com' // Alternative API with better fuzzy search
  private cacheTTLDays = 60 // LEI data changes less frequently

  /**
   * Search for entities by name (fuzzy matching)
   */
  async searchByName(
    query: string,
    options?: {
      country?: string
      status?: 'ACTIVE' | 'INACTIVE'
      limit?: number
    }
  ): Promise<LEISearchResult[]> {
    const endpoint = '/fuzzycompletions'
    const queryParams = new URLSearchParams()

    queryParams.append('field', 'fulltext')
    queryParams.append('q', query)

    if (options?.country) {
      queryParams.append('filter[entity.legalJurisdiction]', options.country)
    }
    if (options?.status) {
      queryParams.append('filter[entity.status]', options.status)
    }

    console.log(`[GLEIF] Fuzzy search: ${query}`)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json',
        },
      })

      if (!response.ok) {
        throw new Error(`GLEIF API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Extract LEI codes from fuzzy search results
      const leis = data.data
        ?.map((item: any) => item.id)
        .slice(0, options?.limit || 10)

      if (!leis || leis.length === 0) {
        return []
      }

      // Get simplified details for each LEI
      return leis.map((lei: string) => ({
        lei,
        legalName: data.data.find((d: any) => d.id === lei)?.attributes?.entity?.legalName?.name || '',
        entityStatus: data.data.find((d: any) => d.id === lei)?.attributes?.entity?.status || '',
        legalJurisdiction: data.data.find((d: any) => d.id === lei)?.attributes?.entity?.legalJurisdiction || '',
        registrationNumber: data.data.find((d: any) => d.id === lei)?.attributes?.entity?.registeredAs,
      }))
    } catch (error) {
      console.error('[GLEIF] Search failed:', error)
      return []
    }
  }

  /**
   * Get full entity details by LEI
   */
  async getLEIRecord(lei: string): Promise<LEIEntity | null> {
    // Check cache first
    const cached = await this.getCachedLEI(lei)
    if (cached && !this.isCacheExpired(cached)) {
      console.log(`[GLEIF] Cache HIT: ${lei}`)
      await this.logAPIUsage(`/lei-records/${lei}`, {
        lei,
        response_status: 200,
        response_time_ms: 0,
        cache_hit: true,
      })
      return cached.lei_data
    }

    console.log(`[GLEIF] Cache MISS: ${lei}`)

    const endpoint = `/lei-records/${lei}`
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json',
        },
      })

      if (response.status === 404) {
        console.log(`[GLEIF] LEI not found: ${lei}`)
        return null
      }

      if (!response.ok) {
        throw new Error(`GLEIF API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // Transform to our format
      const entity = this.transformLEIData(data.data)

      // Cache the result
      await this.cacheLEI(lei, entity)

      // Log API usage
      await this.logAPIUsage(endpoint, {
        lei,
        response_status: 200,
        response_time_ms: responseTime,
        cache_hit: false,
      })

      return entity
    } catch (error) {
      console.error(`[GLEIF] Failed to get LEI ${lei}:`, error)
      return null
    }
  }

  /**
   * Search by company registration number
   */
  async searchByRegistrationNumber(
    registrationNumber: string,
    country: string
  ): Promise<LEISearchResult[]> {
    const queryParams = new URLSearchParams()

    queryParams.append('filter[entity.registeredAs]', registrationNumber)
    queryParams.append('filter[entity.legalJurisdiction]', country)

    const endpoint = `/lei-records?${queryParams.toString()}`

    console.log(`[GLEIF] Search by registration: ${registrationNumber} (${country})`)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json',
        },
      })

      if (!response.ok) {
        throw new Error(`GLEIF API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return (data.data || []).map((item: any) => ({
        lei: item.id,
        legalName: item.attributes?.entity?.legalName?.name || '',
        entityStatus: item.attributes?.entity?.status || '',
        legalJurisdiction: item.attributes?.entity?.legalJurisdiction || '',
        registrationNumber: item.attributes?.entity?.registeredAs,
      }))
    } catch (error) {
      console.error('[GLEIF] Search by registration failed:', error)
      return []
    }
  }

  /**
   * Get corporate parent relationships
   */
  async getParentRelationship(lei: string): Promise<{
    ultimateParent?: LEISearchResult
    directParent?: LEISearchResult
    level?: number
  } | null> {
    const endpoint = `/lei-records/${lei}/direct-parent-relationship`

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json',
        },
      })

      if (response.status === 404) {
        return null // No parent relationship
      }

      if (!response.ok) {
        throw new Error(`GLEIF API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data) return null

      return {
        directParent: {
          lei: data.data.relationships?.parent?.data?.id,
          legalName: data.data.attributes?.parent?.legalName || '',
          entityStatus: '',
          legalJurisdiction: '',
        },
        ultimateParent: data.data.relationships?.ultimate?.data?.id
          ? {
              lei: data.data.relationships.ultimate.data.id,
              legalName: data.data.attributes?.ultimate?.legalName || '',
              entityStatus: '',
              legalJurisdiction: '',
            }
          : undefined,
        level: data.data.attributes?.accounting?.accountingPeriod,
      }
    } catch (error) {
      console.error(`[GLEIF] Failed to get parent relationship for ${lei}:`, error)
      return null
    }
  }

  /**
   * Convert LEI entity to oppspot businesses table format
   */
  convertToStandardFormat(leiEntity: LEIEntity): {
    name: string
    company_number: string
    company_status: string
    company_type: string
    registered_office_address: any
    data_source: 'gleif_lei'
    data_sources: any
    cache_expires_at: Date
    oc_jurisdiction_code: string
    oc_uid: string
  } {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

    return {
      name: leiEntity.legalName,
      company_number: leiEntity.registrationNumber || leiEntity.lei,
      company_status: leiEntity.entityStatus,
      company_type: leiEntity.legalForm || 'Unknown',
      registered_office_address: leiEntity.legalAddress,
      data_source: 'gleif_lei',
      data_sources: {
        gleif_lei: {
          last_updated: new Date(),
          lei: leiEntity.lei,
          managing_lou: leiEntity.managingLOU,
        },
      },
      cache_expires_at: expiresAt,
      oc_jurisdiction_code: leiEntity.legalJurisdiction.toLowerCase(),
      oc_uid: leiEntity.lei,
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
      // Try to search for Microsoft (known large entity)
      const results = await this.searchByName('Microsoft Corporation', { limit: 1 })

      if (results.length > 0) {
        return {
          success: true,
          message: `Connected to GLEIF API successfully. Found ${results.length} entities.`,
        }
      } else {
        return {
          success: false,
          message: 'GLEIF API connection failed: No results returned',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `GLEIF connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Transform GLEIF LEI data to our format
   */
  private transformLEIData(data: any): LEIEntity {
    const entity = data.attributes?.entity
    const registration = data.attributes?.registration

    return {
      lei: data.id,
      legalName: entity?.legalName?.name || '',
      legalForm: entity?.legalForm?.id,
      entityStatus: entity?.status || 'UNKNOWN',
      entityCategory: entity?.category,
      legalJurisdiction: entity?.legalJurisdiction || '',
      registrationAuthority: entity?.registrationAuthority?.id,
      registrationNumber: entity?.registeredAs,
      legalAddress: {
        addressLine1: entity?.legalAddress?.addressLines?.[0],
        addressLine2: entity?.legalAddress?.addressLines?.[1],
        city: entity?.legalAddress?.city,
        region: entity?.legalAddress?.region,
        country: entity?.legalAddress?.country || '',
        postalCode: entity?.legalAddress?.postalCode,
      },
      headquartersAddress: entity?.headquartersAddress
        ? {
            addressLine1: entity.headquartersAddress.addressLines?.[0],
            addressLine2: entity.headquartersAddress.addressLines?.[1],
            city: entity.headquartersAddress.city,
            region: entity.headquartersAddress.region,
            country: entity.headquartersAddress.country || '',
            postalCode: entity.headquartersAddress.postalCode,
          }
        : undefined,
      bic: entity?.bic || [],
      mic: entity?.mic || [],
      registrationDate: registration?.initialRegistrationDate || '',
      lastUpdateDate: registration?.lastUpdateDate || '',
      nextRenewalDate: registration?.nextRenewalDate || '',
      managingLOU: registration?.managingLOU || '',
      leiStatus: registration?.status || 'ISSUED',
      validationSources: entity?.validationSources,
    }
  }

  // =====================================================
  // Caching
  // =====================================================

  /**
   * Get cached LEI data
   */
  private async getCachedLEI(
    lei: string
  ): Promise<{ lei_data: LEIEntity; expires_at: Date } | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gleif_lei_cache')
        .select('lei_data, expires_at')
        .eq('lei', lei)
        .single()

      if (error || !data) return null

      return {
        lei_data: data.lei_data as LEIEntity,
        expires_at: new Date(data.expires_at),
      }
    } catch (error) {
      console.error('[GLEIF] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache LEI data
   */
  private async cacheLEI(lei: string, entity: LEIEntity): Promise<void> {
    try {
      const supabase = createClient()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.cacheTTLDays)

      await supabase.from('gleif_lei_cache').upsert(
        {
          lei,
          lei_data: entity,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'lei',
        }
      )

      console.log(`[GLEIF] Cached: ${lei} (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      console.error('[GLEIF] Cache write error:', error)
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
      lei?: string
      response_status: number
      response_time_ms: number
      cache_hit: boolean
      error_message?: string
    }
  ): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.from('gleif_api_usage').insert({
        endpoint,
        lei: data.lei,
        response_status: data.response_status,
        response_time_ms: data.response_time_ms,
        cache_hit: data.cache_hit,
        error_message: data.error_message,
      })
    } catch (error) {
      console.error('[GLEIF] Failed to log API usage:', error)
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let apiClientInstance: GLEIFAPI | null = null

/**
 * Get singleton instance of GLEIF API client
 */
export function getGLEIFAPI(): GLEIFAPI {
  if (!apiClientInstance) {
    apiClientInstance = new GLEIFAPI()
  }
  return apiClientInstance
}
