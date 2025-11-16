/**
 * Multi-Source Waterfall Resolver
 * Intelligently selects the best free data source for company data
 * Priority: Official registries > Global databases > Enrichment > OpenCorporates (fallback)
 */

import { getCompaniesHouseAPI } from '@/lib/services/companies-house'
import { getIrishCROAPI } from '@/lib/irish-cro/api-client'
import { getGLEIFAPI } from '@/lib/gleif/api-client'
import { getSECEdgarAPI } from '@/lib/sec-edgar/api-client'
import { getWikidataSPARQLClient } from '@/lib/wikidata/sparql-client'
import { getOpenCorporatesAPI } from '@/lib/opencorporates/api-client'

export interface CompanyIdentifier {
  name?: string
  companyNumber?: string
  country?: string // ISO 2-letter code (GB, IE, US, etc.)
  jurisdiction?: string // OpenCorporates jurisdiction code
  lei?: string // Legal Entity Identifier
  cik?: string // SEC Central Index Key
  isPublic?: boolean // Is this a publicly traded company?
}

export interface ResolvedCompanyData {
  source: 'companies_house' | 'irish_cro' | 'gleif_lei' | 'sec_edgar' | 'wikidata' | 'opencorporates'
  confidence: number // 0-1
  data: Record<string, unknown>
  enrichments?: {
    // Additional data from other sources
    website?: string
    industry?: string
    founded_year?: number
    founders?: string[]
    [key: string]: unknown
  }
}

export interface DataSourceStrategy {
  priority: number // Lower = higher priority
  canHandle: (identifier: CompanyIdentifier) => boolean
  fetch: (identifier: CompanyIdentifier) => Promise<Record<string, unknown> | null>
  confidence: number // Base confidence for this source
}

export class MultiSourceResolver {
  private strategies: DataSourceStrategy[]

  constructor() {
    // Define data source strategies in priority order
    this.strategies = [
      // Priority 1: UK Companies House (FREE, official, unlimited)
      {
        priority: 1,
        canHandle: (id) => id.country === 'GB' || id.country === 'UK' || id.jurisdiction === 'gb',
        fetch: async (id) => {
          const api = getCompaniesHouseAPI()
          if (id.companyNumber) {
            return await api.getCompany(id.companyNumber)
          } else if (id.name) {
            const results = await api.searchCompanies(id.name)
            return results.items[0] || null
          }
          return null
        },
        confidence: 1.0,
      },

      // Priority 2: Irish CRO (FREE, official, unlimited)
      {
        priority: 2,
        canHandle: (id) => id.country === 'IE' || id.jurisdiction === 'ie',
        fetch: async (id) => {
          const api = getIrishCROAPI()
          if (id.companyNumber) {
            return await api.getCompanyDetails(id.companyNumber)
          } else if (id.name) {
            const results = await api.searchCompanies({ companyName: id.name, pageSize: 1 })
            return results.companies[0] || null
          }
          return null
        },
        confidence: 1.0,
      },

      // Priority 3: SEC EDGAR (FREE, official, US public companies only)
      {
        priority: 3,
        canHandle: (id) => (id.country === 'US' && id.isPublic === true) || !!id.cik,
        fetch: async (id) => {
          const api = getSECEdgarAPI()
          if (id.cik) {
            return await api.getCompanySubmissions(id.cik)
          } else if (id.name) {
            const results = await api.searchCompany(id.name)
            if (results.length > 0) {
              return await api.getCompanySubmissions(results[0].cik)
            }
          }
          return null
        },
        confidence: 0.95,
      },

      // Priority 4: GLEIF LEI (FREE, global, large corporations)
      {
        priority: 4,
        canHandle: (id) => !!id.lei || id.name !== undefined,
        fetch: async (id) => {
          const api = getGLEIFAPI()
          if (id.lei) {
            return await api.getLEIRecord(id.lei)
          } else if (id.name) {
            const results = await api.searchByName(id.name, {
              country: id.country,
              status: 'ACTIVE',
              limit: 1,
            })
            if (results.length > 0) {
              return await api.getLEIRecord(results[0].lei)
            }
          }
          return null
        },
        confidence: 0.9,
      },

      // Priority 5: Wikidata (FREE, enrichment for notable companies)
      {
        priority: 5,
        canHandle: (id) => !!id.name,
        fetch: async (id) => {
          const client = getWikidataSPARQLClient()
          if (id.name) {
            const results = await client.searchCompany(id.name, 1)
            if (results.length > 0 && results[0].confidence > 0.7) {
              return await client.getCompanyDetails(results[0].wikidataId)
            }
          }
          return null
        },
        confidence: 0.7,
      },

      // Priority 6: OpenCorporates (LIMITED 200/month, global fallback)
      {
        priority: 6,
        canHandle: (id) => !!(id.jurisdiction && id.companyNumber) || !!id.name,
        fetch: async (id) => {
          // Check if we have rate limit remaining
          const api = getOpenCorporatesAPI()
          const rateLimit = await api.getRateLimitStatus()

          // Reserve buffer of 20 requests
          if (rateLimit.monthlyRemaining < 20) {
            console.warn(
              `[MultiSourceResolver] OpenCorporates rate limit low: ${rateLimit.monthlyRemaining} remaining`
            )
            return null
          }

          if (id.jurisdiction && id.companyNumber) {
            return await api.getCompany(id.jurisdiction, id.companyNumber)
          } else if (id.name) {
            const results = await api.searchCompanies({
              q: id.name,
              jurisdiction_code: id.jurisdiction || id.country?.toLowerCase(),
              per_page: 1,
            })
            if (results.companies.length > 0) {
              const company = results.companies[0].company
              return await api.getCompany(company.jurisdiction_code, company.company_number)
            }
          }
          return null
        },
        confidence: 0.85,
      },
    ]

    // Sort strategies by priority
    this.strategies.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Resolve company data using waterfall strategy
   */
  async resolveCompany(identifier: CompanyIdentifier): Promise<ResolvedCompanyData | null> {
    console.log(`[MultiSourceResolver] Resolving company:`, identifier)

    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      if (!strategy.canHandle(identifier)) {
        continue
      }

      console.log(`[MultiSourceResolver] Trying strategy priority ${strategy.priority}`)

      try {
        const data = await strategy.fetch(identifier)

        if (data) {
          console.log(`[MultiSourceResolver] Success with priority ${strategy.priority}`)

          // Determine source name
          const source = this.getSourceName(strategy.priority)

          // Try to enrich with Wikidata if not already from there
          let enrichments = {}
          if (strategy.priority !== 5 && identifier.name) {
            enrichments = await this.enrichWithWikidata(identifier.name)
          }

          return {
            source,
            confidence: strategy.confidence,
            data,
            enrichments: Object.keys(enrichments).length > 0 ? enrichments : undefined,
          }
        }
      } catch (error) {
        console.error(`[MultiSourceResolver] Strategy ${strategy.priority} failed:`, error)
        // Continue to next strategy
      }
    }

    console.log('[MultiSourceResolver] All strategies failed')
    return null
  }

  /**
   * Get company data with enrichment from multiple sources
   */
  async getEnrichedCompanyData(
    identifier: CompanyIdentifier
  ): Promise<{
    primary: ResolvedCompanyData | null
    enrichment: {
      website?: string
      industry?: string
      founded_year?: number
      founders?: string[]
      wikipedia_url?: string
      [key: string]: unknown
    }
  }> {
    const primary = await this.resolveCompany(identifier)

    if (!primary) {
      return { primary: null, enrichment: {} }
    }

    // Always try Wikidata enrichment for website/founders
    const wikidataEnrichment = await this.enrichWithWikidata(
      identifier.name || primary.data.name || primary.data.legalName
    )

    return {
      primary,
      enrichment: {
        ...primary.enrichments,
        ...wikidataEnrichment,
      },
    }
  }

  /**
   * Check which data sources can handle this identifier
   */
  async getAvailableSources(identifier: CompanyIdentifier): Promise<
    Array<{
      source: string
      priority: number
      confidence: number
      canHandle: boolean
    }>
  > {
    return this.strategies.map((strategy) => ({
      source: this.getSourceName(strategy.priority),
      priority: strategy.priority,
      confidence: strategy.confidence,
      canHandle: strategy.canHandle(identifier),
    }))
  }

  /**
   * Get OpenCorporates rate limit status
   */
  async getOpenCorporatesRateLimit(): Promise<{
    dailyRemaining: number
    monthlyRemaining: number
    dailyResetAt: Date
    monthlyResetAt: Date
  }> {
    const api = getOpenCorporatesAPI()
    return await api.getRateLimitStatus()
  }

  /**
   * Test all data source connections
   */
  async testAllConnections(): Promise<
    Array<{
      source: string
      success: boolean
      message: string
    }>
  > {
    const results = []

    // Companies House
    try {
      const ch = getCompaniesHouseAPI()
      const test = await ch.testConnection()
      results.push({ source: 'Companies House', success: test.success, message: test.message })
    } catch (error) {
      results.push({
        source: 'Companies House',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Irish CRO
    try {
      const cro = getIrishCROAPI()
      const test = await cro.testConnection()
      results.push({ source: 'Irish CRO', success: test.success, message: test.message })
    } catch (error) {
      results.push({
        source: 'Irish CRO',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // GLEIF LEI
    try {
      const gleif = getGLEIFAPI()
      const test = await gleif.testConnection()
      results.push({ source: 'GLEIF LEI', success: test.success, message: test.message })
    } catch (error) {
      results.push({
        source: 'GLEIF LEI',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // SEC EDGAR
    try {
      const sec = getSECEdgarAPI()
      const test = await sec.testConnection()
      results.push({ source: 'SEC EDGAR', success: test.success, message: test.message })
    } catch (error) {
      results.push({
        source: 'SEC EDGAR',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Wikidata
    try {
      const wikidata = getWikidataSPARQLClient()
      const test = await wikidata.testConnection()
      results.push({ source: 'Wikidata', success: test.success, message: test.message })
    } catch (error) {
      results.push({
        source: 'Wikidata',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return results
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Get source name from priority
   */
  private getSourceName(
    priority: number
  ): 'companies_house' | 'irish_cro' | 'gleif_lei' | 'sec_edgar' | 'wikidata' | 'opencorporates' {
    const sourceMap: Record<number, string> = {
      1: 'companies_house',
      2: 'irish_cro',
      3: 'sec_edgar',
      4: 'gleif_lei',
      5: 'wikidata',
      6: 'opencorporates',
    }
    return (sourceMap[priority] || 'opencorporates') as 'companies_house' | 'irish_cro' | 'gleif_lei' | 'sec_edgar' | 'wikidata' | 'opencorporates'
  }

  /**
   * Enrich company data with Wikidata
   */
  private async enrichWithWikidata(companyName: string): Promise<{
    website?: string
    industry?: string
    founded_year?: number
    founders?: string[]
    wikipedia_url?: string
    [key: string]: unknown
  }> {
    try {
      const client = getWikidataSPARQLClient()
      const results = await client.searchCompany(companyName, 1)

      if (results.length === 0 || results[0].confidence < 0.7) {
        return {}
      }

      const details = await client.getCompanyDetails(results[0].wikidataId)
      if (!details) return {}

      return client.convertToEnrichmentData(details)
    } catch (error) {
      console.error('[MultiSourceResolver] Wikidata enrichment failed:', error)
      return {}
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let resolverInstance: MultiSourceResolver | null = null

/**
 * Get singleton instance of multi-source resolver
 */
export function getMultiSourceResolver(): MultiSourceResolver {
  if (!resolverInstance) {
    resolverInstance = new MultiSourceResolver()
  }
  return resolverInstance
}
