import { createClient } from '@/lib/supabase/server'
import { CompaniesHouseService } from './companies-house'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type Business = Database['public']['Tables']['businesses']['Row']
type BusinessInsert = Database['public']['Tables']['businesses']['Insert']
type BusinessUpdate = Database['public']['Tables']['businesses']['Update']

export interface EnrichmentSource {
  name: string
  enabled: boolean
  priority: number
}

export interface EnrichmentResult {
  source: string
  success: boolean
  data?: Partial<BusinessUpdate>
  error?: string
}

export class DataEnrichmentService {
  private companiesHouseService: CompaniesHouseService
  private sources: EnrichmentSource[] = [
    { name: 'companies_house', enabled: true, priority: 1 },
    { name: 'google_places', enabled: true, priority: 2 },
    { name: 'social_media', enabled: true, priority: 3 },
    { name: 'web_scraping', enabled: true, priority: 4 }
  ]

  constructor() {
    this.companiesHouseService = new CompaniesHouseService()
  }

  /**
   * Enrich a business with data from multiple sources
   */
  async enrichBusiness(
    business: Business,
    sources?: string[]
  ): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = []
    const enabledSources = sources 
      ? this.sources.filter(s => sources.includes(s.name))
      : this.sources.filter(s => s.enabled)

    // Sort by priority
    enabledSources.sort((a, b) => a.priority - b.priority)

    for (const source of enabledSources) {
      const result = await this.enrichFromSource(business, source.name)
      results.push(result)
    }

    return results
  }

  /**
   * Enrich from a specific source
   */
  private async enrichFromSource(
    business: Business,
    source: string
  ): Promise<EnrichmentResult> {
    try {
      switch (source) {
        case 'companies_house':
          return await this.enrichFromCompaniesHouse(business)
        case 'google_places':
          return await this.enrichFromGooglePlaces(business)
        case 'social_media':
          return await this.enrichFromSocialMedia(business)
        case 'web_scraping':
          return await this.enrichFromWebScraping(business)
        default:
          return {
            source,
            success: false,
            error: 'Unknown enrichment source'
          }
      }
    } catch (error) {
      return {
        source,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Enrich from Companies House
   */
  private async enrichFromCompaniesHouse(business: Business): Promise<EnrichmentResult> {
    // Skip if no company number
    if (!business.company_number) {
      // Try to find by name
      const searchResults = await this.companiesHouseService.searchCompanies(business.name, 1)
      if (searchResults.length === 0) {
        return {
          source: 'companies_house',
          success: false,
          error: 'No matching company found'
        }
      }

      const companyNumber = searchResults[0].company_number
      const profile = await this.companiesHouseService.getCompanyProfile(companyNumber)
      
      if (profile) {
        const formatted = this.companiesHouseService.formatForDatabase(profile)
        return {
          source: 'companies_house',
          success: true,
          data: {
            ...formatted,
            company_number: companyNumber,
            companies_house_last_updated: new Date().toISOString(),
            cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      }
    }

    // Check if cache is still valid
    if (this.companiesHouseService.isCacheValid(business.companies_house_last_updated)) {
      return {
        source: 'companies_house',
        success: true,
        data: {} // No update needed
      }
    }

    // Refresh data
    const profile = await this.companiesHouseService.getCompanyProfile(business.company_number)
    if (profile) {
      const formatted = this.companiesHouseService.formatForDatabase(profile)
      return {
        source: 'companies_house',
        success: true,
        data: {
          ...formatted,
          companies_house_last_updated: new Date().toISOString(),
          cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }

    return {
      source: 'companies_house',
      success: false,
      error: 'Failed to fetch company profile'
    }
  }

  /**
   * Enrich from Google Places
   */
  private async enrichFromGooglePlaces(business: Business): Promise<EnrichmentResult> {
    // This would integrate with Google Places API
    // For now, return a placeholder
    const enrichedData: Partial<BusinessUpdate> = {}

    // Only enrich if we have a Google Place ID
    if (business.google_place_id) {
      // In a real implementation, this would call Google Places API
      enrichedData.metadata = {
        ...(business.metadata as unknown || {}),
        google_places_enriched: true,
        enriched_at: new Date().toISOString()
      }
    }

    return {
      source: 'google_places',
      success: true,
      data: enrichedData
    }
  }

  /**
   * Enrich from Social Media
   */
  private async enrichFromSocialMedia(business: Business): Promise<EnrichmentResult> {
    const enrichedData: Partial<BusinessUpdate> = {}
    const socialLinks: Record<string, unknown> = {}

    // Extract social media links from website if available
    if (business.website) {
      // This would normally scrape the website for social media links
      // For now, just add placeholder logic
      const domain = business.website.replace(/https?:\/\//, '').replace(/www\./, '')
      
      socialLinks.potential = {
        linkedin: `https://linkedin.com/company/${domain.split('.')[0]}`,
        twitter: `https://twitter.com/${domain.split('.')[0]}`,
        facebook: `https://facebook.com/${domain.split('.')[0]}`
      }
    }

    if (Object.keys(socialLinks).length > 0) {
      enrichedData.social_links = socialLinks
      enrichedData.metadata = {
        ...(business.metadata as unknown || {}),
        social_media_enriched: true,
        enriched_at: new Date().toISOString()
      }
    }

    return {
      source: 'social_media',
      success: true,
      data: enrichedData
    }
  }

  /**
   * Enrich from Web Scraping
   */
  private async enrichFromWebScraping(business: Business): Promise<EnrichmentResult> {
    const enrichedData: Partial<BusinessUpdate> = {}

    // This would normally scrape the business website
    // For now, add basic metadata
    if (business.website) {
      enrichedData.metadata = {
        ...(business.metadata as unknown || {}),
        website_scraped: true,
        scraped_at: new Date().toISOString()
      }
    }

    return {
      source: 'web_scraping',
      success: true,
      data: enrichedData
    }
  }

  /**
   * Merge enrichment results into a single update object
   */
  mergeEnrichmentResults(results: EnrichmentResult[]): Partial<BusinessUpdate> {
    const merged: Partial<BusinessUpdate> = {}

    for (const result of results) {
      if (result.success && result.data) {
        // Merge data, with later sources overriding earlier ones
        Object.assign(merged, result.data)
        
        // Special handling for metadata - merge instead of replace
        if (result.data.metadata && merged.metadata) {
          merged.metadata = {
            ...(merged.metadata as unknown),
            ...(result.data.metadata as unknown)
          }
        }
      }
    }

    return merged
  }

  /**
   * Batch enrich multiple businesses
   */
  async batchEnrich(
    businessIds: string[],
    sources?: string[]
  ): Promise<Map<string, EnrichmentResult[]>> {
    const supabase = await createClient()
    const results = new Map<string, EnrichmentResult[]>()

    // Fetch businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .in('id', businessIds) as { data: Row<'businesses'>[] | null; error: any }

    if (!businesses) return results

    // Enrich each business
    for (const business of businesses) {
      const enrichmentResults = await this.enrichBusiness(business, sources)
      results.set(business.id, enrichmentResults)

      // Apply enrichments to database
      const merged = this.mergeEnrichmentResults(enrichmentResults)
      if (Object.keys(merged).length > 0) {
        await supabase
          .from('businesses')
          // @ts-expect-error - Type inference issue
          .update(merged)
          .eq('id', business.id)
      }
    }

    return results
  }

  /**
   * Get enrichment statistics for a business
   */
  getEnrichmentStats(business: Business): {
    completeness: number
    sources: string[]
    lastEnriched: string | null
  } {
    const enrichedSources: string[] = []
    let fieldCount = 0
    let filledCount = 0

    // Check Companies House enrichment
    if (business.company_number) {
      enrichedSources.push('companies_house')
      fieldCount += 10
      filledCount += [
        business.company_status,
        business.company_type,
        business.incorporation_date,
        business.registered_office_address,
        business.sic_codes
      ].filter(Boolean).length
    }

    // Check Google Places enrichment
    if (business.google_place_id) {
      enrichedSources.push('google_places')
      fieldCount += 5
      filledCount += [
        business.rating,
        business.address,
        business.phone_numbers,
        business.website
      ].filter(Boolean).length
    }

    // Check social media enrichment
    // @ts-expect-error - Supabase type inference issue
    if (business.social_links && Object.keys(business.social_links as unknown).length > 0) {
      enrichedSources.push('social_media')
    }

    // Calculate completeness percentage
    const completeness = fieldCount > 0 ? Math.round((filledCount / fieldCount) * 100) : 0

    // Get last enriched date
    const metadata = business.metadata as unknown
    const lastEnriched = metadata?.enriched_at || business.companies_house_last_updated || null

    return {
      completeness,
      sources: enrichedSources,
      lastEnriched
    }
  }
}