/**
 * LinkedIn Scraper Agent
 * Enriches company data with LinkedIn insights
 *
 * Extracts:
 * - Company size and employee count
 * - Recent posts and updates
 * - Employee growth trends
 * - Engagement metrics
 * - Leadership information
 *
 * Uses Puppeteer for dynamic content rendering
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from './base-agent'
import { createClient } from '@/lib/supabase/server'
import puppeteer, { Browser, Page } from 'puppeteer'
import type { Row } from '@/lib/supabase/helpers'

export interface LinkedInScraperConfig {
  companyIds?: string[] // Specific companies to scrape
  maxCompanies?: number // Max companies per run
  includeEmployeeGrowth?: boolean
  includeRecentPosts?: boolean
  includeLeadership?: boolean
  headless?: boolean // For debugging
}

export interface LinkedInCompanyData {
  companyId: string
  linkedInUrl?: string
  employeeCount?: number
  followerCount?: number
  recentPosts?: {
    date: string
    content: string
    engagement: number
  }[]
  employeeGrowth?: {
    period: string
    growthPercentage: number
  }
  leadership?: {
    name: string
    title: string
    profileUrl: string
  }[]
  industry?: string
  headquarters?: string
  specialties?: string[]
}

export class LinkedInScraperAgent extends BaseAgent {
  private browser: Browser | null = null

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

    const config = this.config.configuration as LinkedInScraperConfig
    const enrichedData: LinkedInCompanyData[] = []

    this.log('Starting LinkedIn scraper execution')

    try {
      // Initialize browser
      await this.initBrowser(config.headless !== false)

      // Get companies to enrich
      const companies = await this.getCompaniesToEnrich(config)
      this.log(`Enriching ${companies.length} companies from LinkedIn`)

      // Scrape each company
      for (const company of companies) {
        try {
          const linkedInData = await this.scrapeCompanyProfile(company)

          if (linkedInData) {
            enrichedData.push(linkedInData)

            // Save enriched data to database
            await this.saveEnrichedData(linkedInData)

            // Detect buying signals from LinkedIn data
            await this.detectSignalsFromLinkedIn(linkedInData)
          }

          metrics.itemsProcessed++
          metrics.apiCalls++ // Count each scrape as an API call

          // Rate limiting - wait between requests
          await this.delay(2000 + Math.random() * 3000) // 2-5 seconds

        } catch (error: any) {
          this.log(`Error scraping company ${company.name}: ${error.message}`, 'warn')
        }
      }

      metrics.durationMs = Date.now() - startTime

      this.log(`Completed: Enriched ${enrichedData.length} companies from LinkedIn`)

      return {
        success: true,
        output: {
          enrichedCompanies: enrichedData.length,
          companies: enrichedData
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
    } finally {
      await this.closeBrowser()
    }
  }

  async validateConfig(): Promise<boolean> {
    const config = this.config.configuration as LinkedInScraperConfig

    if (config.maxCompanies && config.maxCompanies > 100) {
      this.log('Configuration warning: maxCompanies should not exceed 100 to avoid rate limits', 'warn')
    }

    return true
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(headless = true): Promise<void> {
    this.log('Initializing browser')

    this.browser = await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    })
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.log('Browser closed')
    }
  }

  /**
   * Get companies to enrich
   */
  private async getCompaniesToEnrich(config: LinkedInScraperConfig) {
    const supabase = await createClient()

    let query = supabase
      .from('businesses')
      .select('id, name, website, linkedin_url')

    // Specific companies
    if (config.companyIds && config.companyIds.length > 0) {
      query = query.in('id', config.companyIds)
    }

    // Limit
    const limit = config.maxCompanies || 10
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
  }

  /**
   * Scrape company LinkedIn profile
   */
  private async scrapeCompanyProfile(company: any): Promise<LinkedInCompanyData | null> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const linkedInUrl = company.linkedin_url || this.constructLinkedInUrl(company.name)

    if (!linkedInUrl) {
      this.log(`No LinkedIn URL for ${company.name}`, 'warn')
      return null
    }

    this.log(`Scraping LinkedIn profile: ${linkedInUrl}`)

    const page = await this.browser.newPage()

    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      // Navigate to LinkedIn page
      await page.goto(linkedInUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      // Wait for content to load
      await page.waitForSelector('body', { timeout: 10000 })

      // Extract company data from page
      const companyData = await page.evaluate(() => {
        const data: any = {}

        // Extract employee count
        const employeeCountElement = document.querySelector('[data-test-id="about-us__size"]')
        if (employeeCountElement) {
          const text = employeeCountElement.textContent || ''
          const match = text.match(/(\d+[\d,]*)/g)
          if (match) {
            data.employeeCount = parseInt(match[0].replace(/,/g, ''))
          }
        }

        // Extract follower count
        const followerElement = document.querySelector('[data-test-id="org-followers-count"]')
        if (followerElement) {
          const text = followerElement.textContent || ''
          const match = text.match(/(\d+[\d,]*)/g)
          if (match) {
            data.followerCount = parseInt(match[0].replace(/,/g, ''))
          }
        }

        // Extract industry
        const industryElement = document.querySelector('[data-test-id="about-us__industry"]')
        if (industryElement) {
          data.industry = industryElement.textContent?.trim()
        }

        // Extract headquarters
        const hqElement = document.querySelector('[data-test-id="about-us__headquarters"]')
        if (hqElement) {
          data.headquarters = hqElement.textContent?.trim()
        }

        // Extract specialties
        const specialtiesElement = document.querySelector('[data-test-id="about-us__specialties"]')
        if (specialtiesElement) {
          data.specialties = specialtiesElement.textContent?.split(',').map(s => s.trim())
        }

        return data
      })

      return {
        companyId: company.id,
        linkedInUrl,
        ...companyData
      }

    } catch (error: any) {
      this.log(`Error scraping ${linkedInUrl}: ${error.message}`, 'error')
      return null
    } finally {
      await page.close()
    }
  }

  /**
   * Construct LinkedIn URL from company name
   */
  private constructLinkedInUrl(companyName: string): string | null {
    if (!companyName) return null

    // Clean and format company name for LinkedIn URL
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    return `https://www.linkedin.com/company/${cleanName}/about/`
  }

  /**
   * Save enriched data to database
   */
  private async saveEnrichedData(data: LinkedInCompanyData): Promise<void> {
    const supabase = await createClient()

    // Update business record with LinkedIn data
    const updateData: any = {}

    if (data.employeeCount) updateData.employee_count = data.employeeCount
    if (data.linkedInUrl) updateData.linkedin_url = data.linkedInUrl
    if (data.industry) updateData.industry = data.industry
    if (data.headquarters) updateData.headquarters = data.headquarters

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
      source: 'linkedin',
      data_type: 'company_profile',
      enriched_data: data,
      enriched_at: new Date().toISOString()
    })

    this.log(`Saved LinkedIn data for company ${data.companyId}`)
  }

  /**
   * Detect buying signals from LinkedIn data
   */
  private async detectSignalsFromLinkedIn(data: LinkedInCompanyData): Promise<void> {
    // Employee growth signal
    if (data.employeeGrowth && data.employeeGrowth.growthPercentage > 20) {
      await this.createBuyingSignal(
        data.companyId,
        'rapid_employee_growth',
        'strong',
        85,
        {
          source: 'linkedin',
          growthPercentage: data.employeeGrowth.growthPercentage,
          period: data.employeeGrowth.period,
          currentEmployeeCount: data.employeeCount
        }
      )
      this.log(`Detected rapid employee growth signal for company ${data.companyId}`)
    }

    // High engagement on recent posts
    if (data.recentPosts && data.recentPosts.length > 0) {
      const avgEngagement = data.recentPosts.reduce((sum, post) => sum + post.engagement, 0) / data.recentPosts.length

      if (avgEngagement > 100) {
        await this.createBuyingSignal(
          data.companyId,
          'high_social_engagement',
          'moderate',
          70,
          {
            source: 'linkedin',
            averageEngagement: avgEngagement,
            postsAnalyzed: data.recentPosts.length
          }
        )
      }
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
 * Create a LinkedIn Scraper Agent instance from database config
 */
export async function createLinkedInScraperAgent(agentId: string): Promise<LinkedInScraperAgent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .eq('agent_type', 'linkedin_scraper_agent')
    .single() as { data: Row<'ai_agents'> | null; error: any }

  if (error || !data) {
    throw new Error(`LinkedIn scraper agent not found: ${agentId}`)
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

  return new LinkedInScraperAgent(config)
}
