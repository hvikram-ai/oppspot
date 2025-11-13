/**
 * Website Discovery Service
 * Intelligently discovers company websites from company names
 */

interface DiscoveryResult {
  website: string | null
  confidence: 'high' | 'medium' | 'low'
  method: 'tld_match' | 'search' | 'companies_house' | 'manual'
  attempted: string[]
}

export class WebsiteDiscovery {
  private timeout: number

  constructor(timeout = 5000) {
    this.timeout = timeout
  }

  /**
   * Main discovery method - tries multiple strategies
   */
  async discoverWebsite(companyName: string): Promise<DiscoveryResult> {
    const attempted: string[] = []

    // Strategy 1: Try common TLD patterns
    const tldResult = await this.tryCommonTLDs(companyName, attempted)
    if (tldResult) {
      return {
        website: tldResult,
        confidence: 'high',
        method: 'tld_match',
        attempted,
      }
    }

    // Strategy 2: Try DuckDuckGo search (no API key needed)
    const searchResult = await this.trySearch(companyName, attempted)
    if (searchResult) {
      return {
        website: searchResult,
        confidence: 'medium',
        method: 'search',
        attempted,
      }
    }

    // No website found
    return {
      website: null,
      confidence: 'low',
      method: 'manual',
      attempted,
    }
  }

  /**
   * Strategy 1: Try common TLD patterns
   */
  private async tryCommonTLDs(
    companyName: string,
    attempted: string[]
  ): Promise<string | null> {
    // Convert company name to potential domain
    const baseDomain = this.companyNameToDomain(companyName)

    // Try common TLDs in order of likelihood
    const tlds = ['.com', '.co.uk', '.io', '.ai', '.net', '.org']

    for (const tld of tlds) {
      const url = `https://${baseDomain}${tld}`
      attempted.push(url)

      if (await this.verifyWebsite(url)) {
        console.log(`[WebsiteDiscovery] Found website via TLD: ${url}`)
        return url
      }
    }

    return null
  }

  /**
   * Strategy 2: Try web search
   */
  private async trySearch(
    companyName: string,
    attempted: string[]
  ): Promise<string | null> {
    try {
      // Use DuckDuckGo instant answer API (no key required)
      const query = encodeURIComponent(`${companyName} official website`)
      const searchUrl = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`

      attempted.push(`search:${query}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'oppSpot Web Scraper (contact@oppspot.com)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      // Extract website from AbstractURL or RelatedTopics
      let website: string | null = null

      if (data.AbstractURL && data.AbstractURL.includes('http')) {
        website = this.extractDomain(data.AbstractURL)
      } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        const firstTopic = data.RelatedTopics[0]
        if (firstTopic.FirstURL) {
          website = this.extractDomain(firstTopic.FirstURL)
        }
      }

      if (website && (await this.verifyWebsite(website))) {
        console.log(`[WebsiteDiscovery] Found website via search: ${website}`)
        return website
      }
    } catch (error) {
      console.error('[WebsiteDiscovery] Search failed:', error)
    }

    return null
  }

  /**
   * Convert company name to domain-friendly format
   */
  private companyNameToDomain(companyName: string): string {
    return (
      companyName
        .toLowerCase()
        // Remove common legal suffixes
        .replace(/\s+(ltd|limited|inc|incorporated|corp|corporation|plc|llc|gmbh|ag)\b/gi, '')
        // Remove special characters
        .replace(/[^a-z0-9]/g, '')
        // Trim whitespace
        .trim()
    )
  }

  /**
   * Verify that a website exists and is accessible
   */
  private async verifyWebsite(url: string): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'oppSpot Web Scraper (contact@oppspot.com)',
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      // Check if response is successful (2xx or 3xx)
      return response.ok || response.status === 301 || response.status === 302
    } catch (error) {
      // Network error, timeout, or invalid URL
      return false
    }
  }

  /**
   * Extract clean domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.hostname}`
    } catch {
      return url
    }
  }
}

/**
 * Helper function to discover website from company name
 */
export async function discoverCompanyWebsite(
  companyName: string
): Promise<DiscoveryResult> {
  const discovery = new WebsiteDiscovery()
  return await discovery.discoverWebsite(companyName)
}
