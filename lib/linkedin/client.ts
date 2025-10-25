import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

export interface LinkedInCompanyData {
  url?: string
  name: string
  tagline?: string
  description?: string
  industry?: string
  company_size?: string
  employee_count?: number
  headquarters?: string
  founded?: number
  website?: string
  specialties?: string[]
  logo_url?: string
  cover_image_url?: string
  followers?: number
  about?: string
  locations?: Array<{
    city?: string
    country?: string
    is_headquarters?: boolean
  }>
  updates?: Array<{
    text: string
    date: string
    likes?: number
    comments?: number
  }>
}

export interface LinkedInSearchResult {
  company_name: string
  linkedin_url: string
  description?: string
  location?: string
  industry?: string
  employees?: string
}

/**
 * LinkedIn Data Client
 * Note: LinkedIn has strict rate limiting and anti-scraping measures.
 * This implementation uses public data and search engines for discovery.
 * For production, consider using LinkedIn's official API or a service like Proxycurl.
 */
export class LinkedInClient {
  private baseUrl = 'https://www.linkedin.com'
  
  /**
   * Search for a company on LinkedIn using web search
   * This method uses DuckDuckGo or Google to find LinkedIn company pages
   */
  async searchCompany(companyName: string, location?: string): Promise<LinkedInSearchResult | null> {
    try {
      // Build search query
      const query = `site:linkedin.com/company "${companyName}"${location ? ` ${location}` : ''}`
      
      // Use DuckDuckGo HTML API (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) {
        console.error('Search failed:', response.status)
        return null
      }
      
      const html = await response.text()
      
      // Parse the first LinkedIn company URL from results
      const linkedInMatch = html.match(/linkedin\.com\/company\/([a-zA-Z0-9-]+)/i)
      
      if (linkedInMatch) {
        const companySlug = linkedInMatch[1]
        return {
          company_name: companyName,
          linkedin_url: `https://www.linkedin.com/company/${companySlug}`,
          location: location
        }
      }
      
      return null
    } catch (error) {
      console.error('LinkedIn search error:', error)
      return null
    }
  }

  /**
   * Extract structured data from a LinkedIn company page
   * Uses publicly available structured data (JSON-LD)
   */
  async getCompanyData(linkedinUrl: string): Promise<LinkedInCompanyData | null> {
    try {
      // LinkedIn blocks most scraping attempts, so we'll use a different approach
      // We'll extract what we can from search results and structured data
      
      const companySlug = this.extractCompanySlug(linkedinUrl)
      if (!companySlug) return null
      
      // Try to get basic info from public sources
      const basicInfo = await this.getBasicCompanyInfo(companySlug)
      
      return basicInfo
    } catch (error) {
      console.error('Error fetching LinkedIn data:', error)
      return null
    }
  }

  /**
   * Get basic company information using alternative methods
   */
  private async getBasicCompanyInfo(companySlug: string): Promise<LinkedInCompanyData | null> {
    try {
      // Use alternative data sources or APIs
      // For now, return structured placeholder that can be enriched later
      
      return {
        name: companySlug.replace(/-/g, ' '),
        url: `https://www.linkedin.com/company/${companySlug}`,
        description: 'LinkedIn profile available',
        // These would be populated by actual API or scraping service
        industry: null,
        company_size: null,
        employee_count: null,
        headquarters: null,
        founded: null,
        specialties: [],
        followers: null
      }
    } catch (error) {
      console.error('Error getting basic company info:', error)
      return null
    }
  }

  /**
   * Extract company slug from LinkedIn URL
   */
  private extractCompanySlug(url: string): string | null {
    const match = url.match(/linkedin\.com\/company\/([a-zA-Z0-9-]+)/i)
    return match ? match[1] : null
  }

  /**
   * Estimate employee count from size description
   */
  estimateEmployeeCount(sizeDescription: string): number | null {
    const sizeMap: Record<string, number> = {
      '1-10 employees': 5,
      '11-50 employees': 30,
      '51-200 employees': 125,
      '201-500 employees': 350,
      '501-1000 employees': 750,
      '1001-5000 employees': 3000,
      '5001-10000 employees': 7500,
      '10001+ employees': 15000,
      'Self-employed': 1
    }
    
    for (const [key, value] of Object.entries(sizeMap)) {
      if (sizeDescription.includes(key)) {
        return value
      }
    }
    
    return null
  }

  /**
   * Format LinkedIn data for storage in our database
   */
  formatForDatabase(linkedinData: LinkedInCompanyData): Partial<Business> {
    const updates: Partial<Business> = {}
    
    // Add LinkedIn data to metadata
    updates.metadata = {
      linkedin: {
        url: linkedinData.url,
        industry: linkedinData.industry,
        company_size: linkedinData.company_size,
        employee_count: linkedinData.employee_count,
        headquarters: linkedinData.headquarters,
        founded: linkedinData.founded,
        specialties: linkedinData.specialties,
        followers: linkedinData.followers,
        last_updated: new Date().toISOString()
      }
    }
    
    // Update description if we have a better one from LinkedIn
    if (linkedinData.about && linkedinData.about.length > 100) {
      updates.description = linkedinData.about
    }
    
    // Add LinkedIn URL to social links
    if (linkedinData.url) {
      updates.social_links = {
        linkedin: linkedinData.url
      }
    }
    
    return updates
  }
}

/**
 * Alternative: Use a professional API service for LinkedIn data
 * Services like Proxycurl, ScrapingBee, or Phantombuster provide reliable LinkedIn data
 */
export class ProxycurlClient {
  private apiKey: string
  private baseUrl = 'https://nubela.co/proxycurl/api/v2'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  /**
   * Get company data using Proxycurl API
   * Note: Requires a Proxycurl API key
   */
  async getCompanyProfile(linkedinUrl: string): Promise<LinkedInCompanyData> {
    try {
      const response = await fetch(`${this.baseUrl}/linkedin/company`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        params: {
          url: linkedinUrl,
          resolve_numeric_id: true,
          categories: 'include',
          funding_data: 'include',
          extra: 'include',
          exit_data: 'include',
          acquisitions: 'include',
          use_cache: 'if-recent'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Proxycurl API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Proxycurl error:', error)
      throw error
    }
  }
  
  /**
   * Search for companies by name
   */
  async searchCompanies(query: string, location?: string): Promise<LinkedInSearchResult[]> {
    try {
      const params = new URLSearchParams({
        company_name: query,
        ...(location && { country: location })
      })
      
      const response = await fetch(
        `${this.baseUrl}/linkedin/company/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Proxycurl search error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Proxycurl search error:', error)
      throw error
    }
  }
}

// Helper function to get the appropriate client
export function getLinkedInClient(): LinkedInClient | ProxycurlClient {
  // Check if we have a Proxycurl API key
  const proxycurlKey = process.env.PROXYCURL_API_KEY
  
  if (proxycurlKey) {
    console.log('Using Proxycurl for LinkedIn data')
    return new ProxycurlClient(proxycurlKey)
  }
  
  // Fallback to basic LinkedIn client
  console.log('Using basic LinkedIn search (limited functionality)')
  return new LinkedInClient()
}