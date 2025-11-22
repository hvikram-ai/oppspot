/**
 * Wikidata SPARQL Client
 * Query Wikipedia's structured data for company enrichment
 * API Documentation: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
 * Coverage: 240,000+ organizations globally
 * Cost: FREE (unlimited)
 * Use Case: Finding websites, founders, industries for notable companies
 */

export interface WikidataCompany {
  wikidataId: string // e.g., "Q95" for Google
  name: string
  website?: string
  industry?: string
  foundedYear?: number
  founders?: string[]
  headquarters?: {
    city?: string
    country?: string
  }
  stockTicker?: string
  stockExchange?: string
  employees?: number
  revenue?: number
  parentOrganization?: {
    wikidataId: string
    name: string
  }
  subsidiaries?: Array<{
    wikidataId: string
    name: string
  }>
  description?: string
  logoUrl?: string
  wikidataUrl: string
  wikipediaUrl?: string
}

export interface WikidataSearchResult {
  wikidataId: string
  name: string
  description?: string
  confidence: number // 0-1 based on name match quality
}

// SPARQL result types
interface SPARQLValue {
  value: string
  type?: string
}

interface SPARQLSearchResult {
  company: SPARQLValue
  companyLabel: SPARQLValue
  companyDescription?: SPARQLValue
}

interface SPARQLCompanyResult {
  company: SPARQLValue
  companyLabel: SPARQLValue
  companyDescription?: SPARQLValue
  website?: SPARQLValue
  industry?: SPARQLValue
  industryLabel?: SPARQLValue
  founded?: SPARQLValue
  founder?: SPARQLValue
  founderLabel?: SPARQLValue
  hqCity?: SPARQLValue
  hqCityLabel?: SPARQLValue
  hqCountry?: SPARQLValue
  hqCountryLabel?: SPARQLValue
  ticker?: SPARQLValue
  exchange?: SPARQLValue
  exchangeLabel?: SPARQLValue
  employees?: SPARQLValue
  revenue?: SPARQLValue
  parent?: SPARQLValue
  parentLabel?: SPARQLValue
  logo?: SPARQLValue
  wikipedia?: SPARQLValue
}

interface SPARQLSubsidiaryResult {
  subsidiary: SPARQLValue
  subsidiaryLabel: SPARQLValue
}

export class WikidataSPARQLClient {
  private endpoint = 'https://query.wikidata.org/sparql'
  private userAgent = 'oppSpot/1.0 (https://oppspot.ai; contact@oppspot.ai)'

  /**
   * Search for companies by name
   */
  async searchCompany(query: string, limit: number = 10): Promise<WikidataSearchResult[]> {
    const sparqlQuery = `
      SELECT DISTINCT ?company ?companyLabel ?companyDescription WHERE {
        ?company wdt:P31/wdt:P279* wd:Q4830453.  # Instance of: business enterprise
        ?company rdfs:label ?label.
        FILTER(CONTAINS(LCASE(?label), "${query.toLowerCase()}")).
        FILTER(LANG(?label) = "en").

        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en".
          ?company rdfs:label ?companyLabel.
          ?company schema:description ?companyDescription.
        }
      }
      LIMIT ${limit}
    `

    console.log(`[Wikidata] Searching for: ${query}`)

    try {
      const results = await this.executeSPARQL(sparqlQuery)

      return results.map((r: SPARQLSearchResult, index: number) => ({
        wikidataId: this.extractWikidataId(r.company.value),
        name: r.companyLabel.value,
        description: r.companyDescription?.value,
        confidence: this.calculateConfidence(query, r.companyLabel.value, index),
      }))
    } catch (error) {
      console.error('[Wikidata] Search failed:', error)
      return []
    }
  }

  /**
   * Get detailed company information by Wikidata ID
   */
  async getCompanyDetails(wikidataId: string): Promise<WikidataCompany | null> {
    const sparqlQuery = `
      SELECT DISTINCT
        ?company ?companyLabel ?companyDescription
        ?website ?industry ?industryLabel
        ?founded ?founder ?founderLabel
        ?hqCity ?hqCityLabel ?hqCountry ?hqCountryLabel
        ?ticker ?exchange ?exchangeLabel
        ?employees ?revenue
        ?parent ?parentLabel
        ?logo ?wikipedia
      WHERE {
        BIND(wd:${wikidataId} AS ?company)

        OPTIONAL { ?company wdt:P856 ?website. }
        OPTIONAL { ?company wdt:P452 ?industry. }
        OPTIONAL { ?company wdt:P571 ?founded. }
        OPTIONAL { ?company wdt:P112 ?founder. }
        OPTIONAL {
          ?company wdt:P159 ?hq.
          ?hq wdt:P131 ?hqCity.
          ?hq wdt:P17 ?hqCountry.
        }
        OPTIONAL { ?company wdt:P414 ?ticker. }
        OPTIONAL { ?company wdt:P414 ?exchange. }
        OPTIONAL { ?company wdt:P1128 ?employees. }
        OPTIONAL { ?company wdt:P2139 ?revenue. }
        OPTIONAL { ?company wdt:P749 ?parent. }
        OPTIONAL { ?company wdt:P154 ?logo. }
        OPTIONAL {
          ?wikipedia schema:about ?company.
          ?wikipedia schema:isPartOf <https://en.wikipedia.org/>.
        }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `

    console.log(`[Wikidata] Getting details for: ${wikidataId}`)

    try {
      const results = await this.executeSPARQL(sparqlQuery)

      if (results.length === 0) return null

      // Aggregate multiple rows (e.g., multiple founders)
      const firstRow = results[0]
      const founders = (results as SPARQLCompanyResult[])
        .filter((r) => r.founderLabel)
        .map((r) => r.founderLabel!.value)
        .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i) // Unique

      return {
        wikidataId,
        name: firstRow.companyLabel.value,
        description: firstRow.companyDescription?.value,
        website: firstRow.website?.value,
        industry: firstRow.industryLabel?.value,
        foundedYear: firstRow.founded ? new Date(firstRow.founded.value).getFullYear() : undefined,
        founders,
        headquarters: {
          city: firstRow.hqCityLabel?.value,
          country: firstRow.hqCountryLabel?.value,
        },
        stockTicker: firstRow.ticker?.value,
        stockExchange: firstRow.exchangeLabel?.value,
        employees: firstRow.employees ? parseInt(firstRow.employees.value) : undefined,
        revenue: firstRow.revenue ? parseFloat(firstRow.revenue.value) : undefined,
        parentOrganization: firstRow.parentLabel
          ? {
              wikidataId: this.extractWikidataId(firstRow.parent.value),
              name: firstRow.parentLabel.value,
            }
          : undefined,
        subsidiaries: [],
        logoUrl: firstRow.logo?.value,
        wikidataUrl: `https://www.wikidata.org/wiki/${wikidataId}`,
        wikipediaUrl: firstRow.wikipedia?.value,
      }
    } catch (error) {
      console.error(`[Wikidata] Failed to get details for ${wikidataId}:`, error)
      return null
    }
  }

  /**
   * Get subsidiaries of a parent company
   */
  async getSubsidiaries(wikidataId: string): Promise<
    Array<{
      wikidataId: string
      name: string
    }>
  > {
    const sparqlQuery = `
      SELECT DISTINCT ?subsidiary ?subsidiaryLabel WHERE {
        ?subsidiary wdt:P749 wd:${wikidataId}.  # Parent organization
        ?subsidiary wdt:P31/wdt:P279* wd:Q4830453.  # Is a business

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 50
    `

    console.log(`[Wikidata] Getting subsidiaries for: ${wikidataId}`)

    try {
      const results = await this.executeSPARQL(sparqlQuery)

      return (results as SPARQLSubsidiaryResult[]).map((r) => ({
        wikidataId: this.extractWikidataId(r.subsidiary.value),
        name: r.subsidiaryLabel.value,
      }))
    } catch (error) {
      console.error(`[Wikidata] Failed to get subsidiaries for ${wikidataId}:`, error)
      return []
    }
  }

  /**
   * Search companies by industry
   */
  async searchByIndustry(
    industry: string,
    country?: string,
    limit: number = 20
  ): Promise<WikidataSearchResult[]> {
    let countryFilter = ''
    if (country) {
      countryFilter = `?company wdt:P17 wd:${this.getCountryWikidataId(country)}.`
    }

    const sparqlQuery = `
      SELECT DISTINCT ?company ?companyLabel ?companyDescription WHERE {
        ?company wdt:P31/wdt:P279* wd:Q4830453.  # Business enterprise
        ?company wdt:P452 ?industry.
        ?industry rdfs:label ?industryLabel.
        FILTER(CONTAINS(LCASE(?industryLabel), "${industry.toLowerCase()}")).
        ${countryFilter}

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT ${limit}
    `

    console.log(`[Wikidata] Searching by industry: ${industry}`)

    try {
      const results = await this.executeSPARQL(sparqlQuery)

      return (results as SPARQLSearchResult[]).map((r, index: number) => ({
        wikidataId: this.extractWikidataId(r.company.value),
        name: r.companyLabel.value,
        description: r.companyDescription?.value,
        confidence: 0.8 - index * 0.02, // Lower confidence for industry matches
      }))
    } catch (error) {
      console.error('[Wikidata] Industry search failed:', error)
      return []
    }
  }

  /**
   * Find company website by name (useful for enrichment)
   */
  async findWebsite(companyName: string): Promise<string | null> {
    const results = await this.searchCompany(companyName, 1)
    if (results.length === 0 || results[0].confidence < 0.7) {
      return null
    }

    const details = await this.getCompanyDetails(results[0].wikidataId)
    return details?.website || null
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Try to get Google (Q95)
      const google = await this.getCompanyDetails('Q95')

      if (google && google.name.includes('Google')) {
        return {
          success: true,
          message: 'Connected to Wikidata SPARQL endpoint successfully.',
        }
      } else {
        return {
          success: false,
          message: 'Wikidata SPARQL endpoint returned unexpected data',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Wikidata connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Execute SPARQL query
   */
  private async executeSPARQL(query: string): Promise<unknown[]> {
    const url = new URL(this.endpoint)
    url.searchParams.append('query', query)
    url.searchParams.append('format', 'json')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/sparql-results+json',
      },
    })

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.results.bindings
  }

  /**
   * Extract Wikidata ID from URI
   */
  private extractWikidataId(uri: string): string {
    return uri.split('/').pop() || ''
  }

  /**
   * Calculate confidence score based on name match
   */
  private calculateConfidence(query: string, result: string, position: number): number {
    const queryLower = query.toLowerCase()
    const resultLower = result.toLowerCase()

    // Exact match
    if (resultLower === queryLower) return 1.0

    // Starts with query
    if (resultLower.startsWith(queryLower)) return 0.9 - position * 0.05

    // Contains query
    if (resultLower.includes(queryLower)) return 0.8 - position * 0.05

    // Fuzzy match (word overlap)
    const queryWords = queryLower.split(/\s+/)
    const resultWords = resultLower.split(/\s+/)
    const overlap = queryWords.filter((w) => resultWords.includes(w)).length
    const confidence = (overlap / queryWords.length) * 0.7 - position * 0.05

    return Math.max(0.1, confidence)
  }

  /**
   * Get Wikidata ID for country code
   */
  private getCountryWikidataId(countryCode: string): string {
    const countryMap: Record<string, string> = {
      US: 'Q30', // United States
      GB: 'Q145', // United Kingdom
      UK: 'Q145',
      IE: 'Q27', // Ireland
      DE: 'Q183', // Germany
      FR: 'Q142', // France
      CA: 'Q16', // Canada
      AU: 'Q408', // Australia
      SG: 'Q334', // Singapore
      IN: 'Q668', // India
      CN: 'Q148', // China
      JP: 'Q17', // Japan
    }

    return countryMap[countryCode.toUpperCase()] || 'Q30' // Default to US
  }

  /**
   * Convert to oppspot enrichment format
   */
  convertToEnrichmentData(wikidataCompany: WikidataCompany): {
    website?: string
    industry?: string
    founded_year?: number
    founders?: string[]
    headquarters_city?: string
    headquarters_country?: string
    stock_ticker?: string
    stock_exchange?: string
    employees?: number
    revenue?: number
    description?: string
    logo_url?: string
    wikipedia_url?: string
    wikidata_url?: string
  } {
    return {
      website: wikidataCompany.website,
      industry: wikidataCompany.industry,
      founded_year: wikidataCompany.foundedYear,
      founders: wikidataCompany.founders,
      headquarters_city: wikidataCompany.headquarters?.city,
      headquarters_country: wikidataCompany.headquarters?.country,
      stock_ticker: wikidataCompany.stockTicker,
      stock_exchange: wikidataCompany.stockExchange,
      employees: wikidataCompany.employees,
      revenue: wikidataCompany.revenue,
      description: wikidataCompany.description,
      logo_url: wikidataCompany.logoUrl,
      wikipedia_url: wikidataCompany.wikipediaUrl,
      wikidata_url: wikidataCompany.wikidataUrl,
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let sparqlClientInstance: WikidataSPARQLClient | null = null

/**
 * Get singleton instance of Wikidata SPARQL client
 */
export function getWikidataSPARQLClient(): WikidataSPARQLClient {
  if (!sparqlClientInstance) {
    sparqlClientInstance = new WikidataSPARQLClient()
  }
  return sparqlClientInstance
}
