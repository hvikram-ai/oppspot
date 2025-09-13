/**
 * DatabaseSimilaritySearch: Fallback similarity search using existing database
 * Uses PostgreSQL full-text search and business data for company matching
 * Works without external APIs - uses your existing businesses table
 */

import { createClient } from '@/lib/supabase/server'
import { CompanyEntity } from '../core/interfaces'
import { CompanySearchResult, EnrichedCompanyData } from '../core/similarity-interfaces'

interface DatabaseSearchOptions {
  targetCompany: string
  industry?: string
  location?: string
  maxResults?: number
  minSimilarityScore?: number
}

interface BusinessRecord {
  id: string
  name: string
  description: string | null
  categories: string[]
  address: any
  website: string | null
  rating: number | null
  metadata: any
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export class DatabaseSimilaritySearch {
  private supabase: any

  constructor() {
    // Don't initialize in constructor to avoid cookies error
    this.supabase = null
  }
  
  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Search for similar companies in the database
   */
  async searchSimilarCompanies(options: DatabaseSearchOptions): Promise<CompanySearchResult[]> {
    const {
      targetCompany,
      industry,
      location,
      maxResults = 20,
      minSimilarityScore = 0.3
    } = options

    console.log(`[DatabaseSearch] Searching for companies similar to: ${targetCompany}`)

    try {
      // Get supabase client
      const supabase = await this.getSupabase()
      
      // Step 1: Try to find the target company first
      const targetResult = await this.findTargetCompany(targetCompany)
      
      // Step 2: Build search query based on target company characteristics
      let query = supabase
        .from('businesses')
        .select('*')

      // Add text search if PostgreSQL full-text search is available
      const searchTerms = this.buildSearchTerms(targetCompany, targetResult)
      
      // Search by name similarity and description
      if (searchTerms.length > 0) {
        const searchQuery = searchTerms.join(' | ')
        query = query.or(`name.ilike.%${targetCompany}%,description.ilike.%${targetCompany}%`)
      }

      // Filter by categories if target has them
      if (targetResult?.categories && targetResult.categories.length > 0) {
        // Match any of the target's categories
        query = query.contains('categories', targetResult.categories.slice(0, 3))
      }

      // Filter by location if specified
      if (location) {
        query = query.ilike('address', `%${location}%`)
      }

      // Limit results
      query = query.limit(maxResults * 2) // Get extra to filter by score

      const { data: businesses, error } = await query

      if (error) {
        console.error('[DatabaseSearch] Query error:', error)
        return []
      }

      if (!businesses || businesses.length === 0) {
        console.log('[DatabaseSearch] No businesses found in database')
        return []
      }

      console.log(`[DatabaseSearch] Found ${businesses.length} potential matches`)

      // Step 3: Calculate similarity scores and convert to search results
      const results = businesses
        .map(business => this.calculateSimilarityAndConvert(business, targetCompany, targetResult))
        .filter(result => result.relevanceScore >= minSimilarityScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults)

      console.log(`[DatabaseSearch] Returning ${results.length} similar companies`)
      return results

    } catch (error) {
      console.error('[DatabaseSearch] Error searching database:', error)
      return []
    }
  }

  /**
   * Find the target company in the database
   */
  private async findTargetCompany(companyName: string): Promise<BusinessRecord | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', `%${companyName}%`)
        .limit(1)
        .single()

      if (error || !data) {
        console.log(`[DatabaseSearch] Target company "${companyName}" not found in database`)
        return null
      }

      console.log(`[DatabaseSearch] Found target company: ${data.name}`)
      return data
    } catch (error) {
      console.error('[DatabaseSearch] Error finding target company:', error)
      return null
    }
  }

  /**
   * Build search terms from company name and data
   */
  private buildSearchTerms(companyName: string, targetData: BusinessRecord | null): string[] {
    const terms: string[] = []
    
    // Add company name variations
    const nameParts = companyName.toLowerCase().split(/\s+/)
    terms.push(...nameParts.filter(part => part.length > 2))
    
    // Add categories as search terms
    if (targetData?.categories) {
      terms.push(...targetData.categories.map(cat => cat.toLowerCase()))
    }
    
    // Add industry keywords
    if (targetData?.description) {
      // Extract key words from description
      const keywords = this.extractKeywords(targetData.description)
      terms.push(...keywords)
    }
    
    return [...new Set(terms)] // Remove duplicates
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Common words to exclude
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of',
      'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further'
    ])
    
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10) // Take top 10 keywords
  }

  /**
   * Calculate similarity score and convert to CompanySearchResult
   */
  private calculateSimilarityAndConvert(
    business: BusinessRecord,
    targetName: string,
    targetData: BusinessRecord | null
  ): CompanySearchResult {
    let similarityScore = 0
    let matchFactors: string[] = []

    // Name similarity (0-0.3)
    const nameSimilarity = this.calculateNameSimilarity(business.name, targetName)
    similarityScore += nameSimilarity * 0.3
    if (nameSimilarity > 0.5) {
      matchFactors.push('name_match')
    }

    // Category overlap (0-0.3)
    if (targetData?.categories && business.categories) {
      const categoryOverlap = this.calculateCategoryOverlap(
        business.categories,
        targetData.categories
      )
      similarityScore += categoryOverlap * 0.3
      if (categoryOverlap > 0) {
        matchFactors.push('category_match')
      }
    }

    // Description similarity (0-0.2)
    if (targetData?.description && business.description) {
      const descSimilarity = this.calculateTextSimilarity(
        business.description,
        targetData.description
      )
      similarityScore += descSimilarity * 0.2
      if (descSimilarity > 0.3) {
        matchFactors.push('description_match')
      }
    }

    // Location proximity (0-0.1)
    if (targetData?.latitude && targetData?.longitude && 
        business.latitude && business.longitude) {
      const distance = this.calculateDistance(
        targetData.latitude,
        targetData.longitude,
        business.latitude,
        business.longitude
      )
      // Score based on distance (closer = higher score)
      const locationScore = Math.max(0, 1 - (distance / 100)) // 100km radius
      similarityScore += locationScore * 0.1
      if (locationScore > 0.5) {
        matchFactors.push('location_proximity')
      }
    }

    // Rating similarity (0-0.1)
    if (targetData?.rating && business.rating) {
      const ratingDiff = Math.abs(targetData.rating - business.rating)
      const ratingScore = Math.max(0, 1 - (ratingDiff / 5))
      similarityScore += ratingScore * 0.1
      if (ratingScore > 0.8) {
        matchFactors.push('similar_rating')
      }
    }

    // Convert to CompanyEntity
    const company: CompanyEntity = {
      id: business.id,
      name: business.name,
      country: this.extractCountryFromAddress(business.address),
      industryCodes: business.categories || [],
      website: business.website,
      description: business.description,
      confidenceScore: similarityScore,
      sourceMetadata: {
        source: 'database',
        discoveredAt: new Date(business.created_at),
        confidence: similarityScore
      },
      createdAt: new Date(business.created_at),
      updatedAt: new Date(business.updated_at)
    }

    // Create search result
    return {
      company,
      relevanceScore: similarityScore,
      matchType: matchFactors.join(',') || 'partial',
      source: 'database',
      snippet: business.description?.substring(0, 200) || '',
      matchedKeywords: matchFactors,
      discoveredAt: new Date()
    }
  }

  /**
   * Calculate name similarity using simple algorithm
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().trim()
    const n2 = name2.toLowerCase().trim()
    
    // Exact match
    if (n1 === n2) return 1
    
    // Contains match
    if (n1.includes(n2) || n2.includes(n1)) return 0.8
    
    // Word overlap
    const words1 = new Set(n1.split(/\s+/))
    const words2 = new Set(n2.split(/\s+/))
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  /**
   * Calculate category overlap
   */
  private calculateCategoryOverlap(categories1: string[], categories2: string[]): number {
    if (!categories1.length || !categories2.length) return 0
    
    const set1 = new Set(categories1.map(c => c.toLowerCase()))
    const set2 = new Set(categories2.map(c => c.toLowerCase()))
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }

  /**
   * Calculate text similarity using keyword overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const keywords1 = new Set(this.extractKeywords(text1))
    const keywords2 = new Set(this.extractKeywords(text2))
    
    if (keywords1.size === 0 || keywords2.size === 0) return 0
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
    const union = new Set([...keywords1, ...keywords2])
    
    return intersection.size / union.size
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Extract country from address object
   */
  private extractCountryFromAddress(address: any): string {
    if (!address) return 'Unknown'
    if (typeof address === 'string') {
      // Try to extract country from string
      const ukPattern = /\b(UK|United Kingdom|England|Scotland|Wales|Northern Ireland)\b/i
      const irelandPattern = /\b(Ireland|Éire)\b/i
      
      if (ukPattern.test(address)) return 'United Kingdom'
      if (irelandPattern.test(address)) return 'Ireland'
      return 'Unknown'
    }
    return address.country || 'Unknown'
  }

  /**
   * Enrich company data with additional information
   */
  async enrichCompanyData(company: CompanyEntity): Promise<EnrichedCompanyData> {
    // For database companies, we already have most data
    // Just structure it properly
    return {
      company,
      financialData: undefined, // Would need separate financial tables
      socialPresence: undefined, // Would need social media data
      newsAnalysis: undefined, // Would need news data
      competitorInfo: undefined, // Would need competitor analysis
      enrichmentQuality: 0.5, // Database data is moderate quality
      lastEnriched: new Date()
    }
  }
}