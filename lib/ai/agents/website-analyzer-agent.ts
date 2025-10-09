/**
 * Website Analyzer Agent
 * Analyzes company websites for enrichment data and buying signals
 *
 * Analyzes:
 * - Technology stack detection
 * - Product/service offerings
 * - News and blog posts
 * - Contact information
 * - SEO metadata
 * - Social media presence
 * - Career/hiring pages
 *
 * Uses Cheerio for efficient HTML parsing
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from './base-agent'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Row } from '@/lib/supabase/helpers'

export interface WebsiteAnalyzerConfig {
  companyIds?: string[] // Specific companies to analyze
  maxCompanies?: number // Max companies per run
  analyzeTechStack?: boolean
  analyzeContent?: boolean
  analyzeCareerPages?: boolean
  followLinks?: boolean // Whether to crawl additional pages
  maxPagesPerSite?: number
}

export interface WebsiteAnalysisData {
  companyId: string
  url: string
  title?: string
  description?: string
  technologies: string[]
  socialLinks: {
    platform: string
    url: string
  }[]
  contactInfo: {
    email?: string
    phone?: string
    address?: string
  }
  newsItems: {
    title: string
    date?: string
    url: string
  }[]
  careerPages: string[]
  products: string[]
  keywords: string[]
  lastUpdated?: string
}

export class WebsiteAnalyzerAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    const metrics = {
      durationMs: 0,
      itemsProcessed: 0,
      apiCalls: 0,
      tokensUsed: 0,
      cost: 0
    }

    const config = this.config.configuration as WebsiteAnalyzerConfig
    const analyzedData: WebsiteAnalysisData[] = []

    this.log('Starting website analyzer execution')

    try {
      // Get companies to analyze
      const companies = await this.getCompaniesToAnalyze(config)
      this.log(`Analyzing ${companies.length} company websites`)

      // Analyze each company website
      for (const company of companies) {
        try {
          if (!company.website) {
            this.log(`No website for ${company.name}`, 'warn')
            continue
          }

          const websiteData = await this.analyzeWebsite(company)

          if (websiteData) {
            analyzedData.push(websiteData)

            // Save enriched data to database
            await this.saveAnalysisData(websiteData)

            // Detect buying signals from website analysis
            await this.detectSignalsFromWebsite(websiteData)
          }

          metrics.itemsProcessed++
          metrics.apiCalls++

          // Rate limiting
          await this.delay(1000 + Math.random() * 2000) // 1-3 seconds

        } catch (error: any) {
          this.log(`Error analyzing website for ${company.name}: ${error.message}`, 'warn')
        }
      }

      metrics.durationMs = Date.now() - startTime

      this.log(`Completed: Analyzed ${analyzedData.length} websites`)

      return {
        success: true,
        output: {
          analyzedWebsites: analyzedData.length,
          websites: analyzedData
        },
        metrics
      }
    } catch (error: any) {
      metrics.durationMs = Date.now() - startTime
      return {
        success: false,
        output: {},
        error: error.message,
        metrics
      }
    }
  }

  async validateConfig(): Promise<boolean> {
    const config = this.config.configuration as WebsiteAnalyzerConfig

    if (config.maxPagesPerSite && config.maxPagesPerSite > 10) {
      this.log('Configuration warning: maxPagesPerSite > 10 may cause long execution times', 'warn')
    }

    return true
  }

  /**
   * Get companies to analyze
   */
  private async getCompaniesToAnalyze(config: WebsiteAnalyzerConfig) {
    const supabase = await createClient()

    let query = supabase
      .from('businesses')
      .select('id, name, website')
      .not('website', 'is', null)

    // Specific companies
    if (config.companyIds && config.companyIds.length > 0) {
      query = query.in('id', config.companyIds)
    }

    // Limit
    const limit = config.maxCompanies || 20
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
  }

  /**
   * Analyze company website
   */
  private async analyzeWebsite(company: any): Promise<WebsiteAnalysisData | null> {
    const url = this.normalizeUrl(company.website)

    this.log(`Analyzing website: ${url}`)

    try {
      // Fetch website HTML
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OppSpotBot/1.0; +https://oppspot.ai)'
        },
        timeout: 15000,
        maxRedirects: 5
      })

      const html = response.data
      const $ = cheerio.load(html)

      // Extract data
      const analysisData: WebsiteAnalysisData = {
        companyId: company.id,
        url,
        title: this.extractTitle($),
        description: this.extractDescription($),
        technologies: this.detectTechnologies($, html),
        socialLinks: this.extractSocialLinks($),
        contactInfo: this.extractContactInfo($),
        newsItems: this.extractNewsItems($, url),
        careerPages: this.extractCareerPages($, url),
        products: this.extractProducts($),
        keywords: this.extractKeywords($),
        lastUpdated: new Date().toISOString()
      }

      return analysisData

    } catch (error: any) {
      this.log(`Error fetching ${url}: ${error.message}`, 'error')
      return null
    }
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    return $('title').text().trim() ||
           $('meta[property="og:title"]').attr('content') ||
           ''
  }

  /**
   * Extract page description
   */
  private extractDescription($: cheerio.CheerioAPI): string {
    return $('meta[name="description"]').attr('content') ||
           $('meta[property="og:description"]').attr('content') ||
           ''
  }

  /**
   * Detect technologies used on the website
   */
  private detectTechnologies($: cheerio.CheerioAPI, html: string): string[] {
    const technologies: Set<string> = new Set()

    // Check for common frameworks and libraries
    const techSignatures: Record<string, RegExp[]> = {
      'React': [/react/i, /_next\/static/, /react-dom/i],
      'Next.js': [/_next\/static/, /Next\.js/i],
      'Vue.js': [/vue\.js/i, /vuejs/i],
      'Angular': [/angular/i, /ng-/],
      'WordPress': [/wp-content/, /wp-includes/],
      'Shopify': [/cdn\.shopify\.com/, /Shopify/i],
      'Stripe': [/stripe/i, /js\.stripe\.com/],
      'Google Analytics': [/google-analytics/, /gtag/],
      'HubSpot': [/hubspot/i],
      'Salesforce': [/salesforce/i],
      'Intercom': [/intercom/i],
      'Zendesk': [/zendesk/i]
    }

    for (const [tech, patterns] of Object.entries(techSignatures)) {
      if (patterns.some(pattern => pattern.test(html))) {
        technologies.add(tech)
      }
    }

    // Check scripts
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src') || ''

      if (src.includes('jquery')) technologies.add('jQuery')
      if (src.includes('bootstrap')) technologies.add('Bootstrap')
      if (src.includes('tailwind')) technologies.add('Tailwind CSS')
    })

    return Array.from(technologies)
  }

  /**
   * Extract social media links
   */
  private extractSocialLinks($: cheerio.CheerioAPI): { platform: string; url: string }[] {
    const socialLinks: { platform: string; url: string }[] = []

    const platforms: Record<string, RegExp> = {
      'LinkedIn': /linkedin\.com/i,
      'Twitter': /twitter\.com|x\.com/i,
      'Facebook': /facebook\.com/i,
      'Instagram': /instagram\.com/i,
      'YouTube': /youtube\.com/i,
      'GitHub': /github\.com/i
    }

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href') || ''

      for (const [platform, pattern] of Object.entries(platforms)) {
        if (pattern.test(href) && !socialLinks.some(link => link.platform === platform)) {
          socialLinks.push({ platform, url: href })
        }
      }
    })

    return socialLinks
  }

  /**
   * Extract contact information
   */
  private extractContactInfo($: cheerio.CheerioAPI): { email?: string; phone?: string; address?: string } {
    const contactInfo: { email?: string; phone?: string; address?: string } = {}

    // Extract email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/
    const bodyText = $('body').text()
    const emailMatch = bodyText.match(emailRegex)
    if (emailMatch) {
      contactInfo.email = emailMatch[1]
    }

    // Extract phone
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/
    const phoneMatch = bodyText.match(phoneRegex)
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[1].trim()
    }

    // Extract address (look for common patterns)
    const addressElement = $('[itemtype*="PostalAddress"], .address, #address').first()
    if (addressElement.length) {
      contactInfo.address = addressElement.text().trim()
    }

    return contactInfo
  }

  /**
   * Extract news items or blog posts
   */
  private extractNewsItems($: cheerio.CheerioAPI, baseUrl: string): { title: string; date?: string; url: string }[] {
    const newsItems: { title: string; date?: string; url: string }[] = []

    // Look for blog/news sections
    const newsSelectors = [
      'article',
      '.blog-post',
      '.news-item',
      '[class*="post"]',
      '[class*="article"]'
    ]

    newsSelectors.forEach(selector => {
      $(selector).slice(0, 5).each((_, element) => {
        const $el = $(element)
        const title = $el.find('h1, h2, h3, .title').first().text().trim()
        const url = $el.find('a').first().attr('href') || ''
        const date = $el.find('time, .date, [datetime]').first().text().trim()

        if (title && url) {
          newsItems.push({
            title,
            date: date || undefined,
            url: this.resolveUrl(baseUrl, url)
          })
        }
      })
    })

    return newsItems.slice(0, 10) // Limit to 10 items
  }

  /**
   * Extract career/hiring pages
   */
  private extractCareerPages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const careerPages: string[] = []

    const careerKeywords = ['career', 'jobs', 'hiring', 'join', 'work with us', 'vacancies']

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href') || ''
      const text = $(element).text().toLowerCase()

      if (careerKeywords.some(keyword => text.includes(keyword) || href.toLowerCase().includes(keyword))) {
        const fullUrl = this.resolveUrl(baseUrl, href)
        if (!careerPages.includes(fullUrl)) {
          careerPages.push(fullUrl)
        }
      }
    })

    return careerPages.slice(0, 5) // Limit to 5 pages
  }

  /**
   * Extract product/service information
   */
  private extractProducts($: cheerio.CheerioAPI): string[] {
    const products: Set<string> = new Set()

    // Look for product sections
    $('[class*="product"], [id*="product"], .service, [id*="service"]').each((_, element) => {
      const $el = $(element)
      const productName = $el.find('h1, h2, h3, .product-name, .title').first().text().trim()

      if (productName && productName.length > 3 && productName.length < 100) {
        products.add(productName)
      }
    })

    return Array.from(products).slice(0, 10)
  }

  /**
   * Extract keywords from meta tags and content
   */
  private extractKeywords($: cheerio.CheerioAPI): string[] {
    const keywords: Set<string> = new Set()

    // Meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content')
    if (metaKeywords) {
      metaKeywords.split(',').forEach(keyword => {
        keywords.add(keyword.trim().toLowerCase())
      })
    }

    // H1/H2 headings as keywords
    $('h1, h2').each((_, element) => {
      const text = $(element).text().trim().toLowerCase()
      if (text.length > 3 && text.length < 50) {
        keywords.add(text)
      }
    })

    return Array.from(keywords).slice(0, 20)
  }

  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`
    }
    return url
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString()
    } catch {
      return relativeUrl
    }
  }

  /**
   * Save analysis data to database
   */
  private async saveAnalysisData(data: WebsiteAnalysisData): Promise<void> {
    const supabase = await createClient()

    // Update business record with website analysis data
    const updateData: any = {}

    if (data.technologies.length > 0) updateData.technologies = data.technologies
    if (data.description) updateData.description = data.description
    if (data.contactInfo.email) updateData.contact_email = data.contactInfo.email
    if (data.contactInfo.phone) updateData.contact_phone = data.contactInfo.phone

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('businesses')
        // @ts-ignore - Type inference issue
        .update(updateData)
        .eq('id', data.companyId)
    }

    // Store enrichment metadata
    // @ts-ignore - Supabase type inference issue
    await supabase.from('enrichment_data').insert({
      company_id: data.companyId,
      source: 'website_analysis',
      data_type: 'website_profile',
      enriched_data: data,
      enriched_at: new Date().toISOString()
    })

    this.log(`Saved website analysis data for company ${data.companyId}`)
  }

  /**
   * Detect buying signals from website analysis
   */
  private async detectSignalsFromWebsite(data: WebsiteAnalysisData): Promise<void> {
    // Career pages signal (hiring = growth)
    if (data.careerPages.length > 0) {
      await this.createBuyingSignal(
        data.companyId,
        'career_page_detected',
        'moderate',
        65,
        {
          source: 'website_analysis',
          careerPages: data.careerPages,
          careerPagesCount: data.careerPages.length
        }
      )
      this.log(`Detected career page signal for company ${data.companyId}`)
    }

    // Recent news/blog posts signal (active company)
    if (data.newsItems.length > 3) {
      await this.createBuyingSignal(
        data.companyId,
        'active_blog_content',
        'weak',
        50,
        {
          source: 'website_analysis',
          newsItemsCount: data.newsItems.length,
          recentNews: data.newsItems.slice(0, 3)
        }
      )
    }

    // Technology stack signal (modern tech = investment in development)
    const modernTech = ['React', 'Next.js', 'Vue.js', 'Angular']
    const hasModernTech = data.technologies.some(tech => modernTech.includes(tech))

    if (hasModernTech) {
      await this.createBuyingSignal(
        data.companyId,
        'modern_tech_stack',
        'weak',
        55,
        {
          source: 'website_analysis',
          technologies: data.technologies
        }
      )
    }

    // Third-party tools signal (Stripe, HubSpot, etc.)
    const salesTools = ['Stripe', 'HubSpot', 'Salesforce', 'Intercom', 'Zendesk']
    const usingSalesTools = data.technologies.some(tech => salesTools.includes(tech))

    if (usingSalesTools) {
      await this.createBuyingSignal(
        data.companyId,
        'using_sales_tools',
        'moderate',
        70,
        {
          source: 'website_analysis',
          tools: data.technologies.filter(tech => salesTools.includes(tech))
        }
      )
    }
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a Website Analyzer Agent instance from database config
 */
export async function createWebsiteAnalyzerAgent(agentId: string): Promise<WebsiteAnalyzerAgent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .eq('agent_type', 'website_analyzer_agent')
    .single() as { data: Row<'ai_agents'> | null; error: any }

  if (error || !data) {
    throw new Error(`Website analyzer agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    type: data.agent_type,
    configuration: data.configuration,
    isActive: data.is_active,
    scheduleCron: data.schedule_cron
  }

  return new WebsiteAnalyzerAgent(config)
}
