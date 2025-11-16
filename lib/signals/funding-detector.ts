/**
 * Funding Signal Detector
 * Detects and tracks company funding rounds from news sources
 */

import { createClient } from '@/lib/supabase/server'

interface FundingSignal {
  company_id?: string
  company_number?: string
  company_name: string
  round_type: string
  amount?: number
  currency?: string
  valuation?: number
  investors?: string[]
  lead_investor?: string
  announcement_date: Date
  source: string
  source_url?: string
  confidence_score: number
}

interface NewsArticle {
  title: string
  description: string
  content?: string
  url: string
  publishedAt: string
  source: {
    name: string
  }
}

export class FundingDetector {
  private newsApiKey: string | undefined

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY
  }

  /**
   * Search for funding news for a specific company
   */
  async detectFundingForCompany(
    companyName: string,
    companyId?: string
  ): Promise<FundingSignal[]> {
    console.log(`[FundingDetector] Searching for funding news: ${companyName}`)

    try {
      // Search news for funding keywords
      const searchQueries = [
        `"${companyName}" funding round`,
        `"${companyName}" raises million`,
        `"${companyName}" series seed investment`,
        `"${companyName}" venture capital`
      ]

      const signals: FundingSignal[] = []

      for (const query of searchQueries) {
        const articles = await this.searchNews(query)

        for (const article of articles) {
          const signal = await this.extractFundingSignal(article, companyName, companyId)
          if (signal && signal.confidence_score > 0.5) {
            signals.push(signal)
          }
        }
      }

      // Deduplicate and sort by confidence
      const uniqueSignals = this.deduplicateSignals(signals)
        .sort((a, b) => b.confidence_score - a.confidence_score)

      // Save to database
      for (const signal of uniqueSignals.slice(0, 3)) {
        await this.saveFundingSignal(signal)
      }

      return uniqueSignals
    } catch (error) {
      console.error('[FundingDetector] Error detecting funding:', error)
      return []
    }
  }

  /**
   * Scan for funding news across all monitored companies
   */
  async scanAllCompaniesForFunding(): Promise<void> {
    const supabase = await createClient()

    // Get companies that haven't been scanned recently
    const { data: companies } = await supabase
      .from('businesses')
      .select('id, name, company_number')
      .or('last_funding_check.is.null,last_funding_check.lt.' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50)

    if (!companies) return

    console.log(`[FundingDetector] Scanning ${companies.length} companies for funding news`)

    for (const company of companies) {
      await this.detectFundingForCompany(company.name, company.id)

      // Update last check timestamp
      await supabase
        .from('businesses')
        .update({ last_funding_check: new Date().toISOString() })
        .eq('id', company.id)

      // Rate limiting
      await this.delay(1000)
    }
  }

  /**
   * Search news using NewsAPI or fallback
   */
  private async searchNews(query: string): Promise<NewsArticle[]> {
    if (this.newsApiKey) {
      return await this.searchNewsAPI(query)
    } else {
      // Use a mock/demo data for development
      return this.getMockNewsData(query)
    }
  }

  /**
   * Search using NewsAPI
   */
  private async searchNewsAPI(query: string): Promise<NewsArticle[]> {
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.append('q', query)
    url.searchParams.append('language', 'en')
    url.searchParams.append('sortBy', 'relevancy')
    url.searchParams.append('pageSize', '10')
    url.searchParams.append('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': this.newsApiKey!
        }
      })

      if (!response.ok) {
        console.error('[FundingDetector] NewsAPI error:', response.statusText)
        return []
      }

      const data = await response.json()
      return data.articles || []
    } catch (error) {
      console.error('[FundingDetector] Error fetching news:', error)
      return []
    }
  }

  /**
   * Extract funding signal from news article
   */
  private async extractFundingSignal(
    article: NewsArticle,
    companyName: string,
    companyId?: string
  ): Promise<FundingSignal | null> {
    const text = `${article.title} ${article.description} ${article.content || ''}`
    const lowerText = text.toLowerCase()

    // Check if article is actually about funding
    if (!this.isFundingRelated(lowerText)) {
      return null
    }

    // Extract funding amount
    const amount = this.extractAmount(text)

    // Extract round type
    const roundType = this.extractRoundType(lowerText)

    // Extract investors
    const investors = this.extractInvestors(text)

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(text, companyName, amount, roundType)

    if (confidenceScore < 0.3) {
      return null
    }

    return {
      company_id: companyId,
      company_name: companyName,
      round_type: roundType,
      amount: amount?.value,
      currency: amount?.currency || 'GBP',
      investors: investors,
      lead_investor: investors[0],
      announcement_date: new Date(article.publishedAt),
      source: 'news_api',
      source_url: article.url,
      confidence_score: confidenceScore
    }
  }

  /**
   * Check if text is funding-related
   */
  private isFundingRelated(text: string): boolean {
    const fundingKeywords = [
      'funding', 'raises', 'raised', 'investment', 'series',
      'seed', 'venture', 'capital', 'million', 'billion',
      'round', 'valuation', 'investors', 'backed'
    ]

    return fundingKeywords.some(keyword => text.includes(keyword))
  }

  /**
   * Extract funding amount from text
   */
  private extractAmount(text: string): { value: number; currency: string } | null {
    // Match patterns like $5M, £10 million, €2.5m
    const patterns = [
      /\$(\d+(?:\.\d+)?)\s*(?:million|M)/gi,
      /£(\d+(?:\.\d+)?)\s*(?:million|M)/gi,
      /€(\d+(?:\.\d+)?)\s*(?:million|M)/gi,
      /\$(\d+(?:\.\d+)?)\s*(?:billion|B)/gi,
      /£(\d+(?:\.\d+)?)\s*(?:billion|B)/gi,
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match) {
        const value = parseFloat(match[1])
        const currency = match[0].charAt(0) === '$' ? 'USD' :
                        match[0].charAt(0) === '£' ? 'GBP' :
                        match[0].charAt(0) === '€' ? 'EUR' : 'GBP'

        // Convert to standard amount
        const multiplier = match[0].toLowerCase().includes('billion') ? 1000000000 : 1000000
        return {
          value: value * multiplier,
          currency
        }
      }
    }

    return null
  }

  /**
   * Extract funding round type
   */
  private extractRoundType(text: string): string {
    const roundTypes = [
      { pattern: /series\s*[a-e]/i, type: 'series' },
      { pattern: /seed\s*(?:round|funding)/i, type: 'seed' },
      { pattern: /pre[-\s]?seed/i, type: 'pre_seed' },
      { pattern: /series\s*a/i, type: 'series_a' },
      { pattern: /series\s*b/i, type: 'series_b' },
      { pattern: /series\s*c/i, type: 'series_c' },
      { pattern: /series\s*d/i, type: 'series_d_plus' },
      { pattern: /debt\s*(?:financing|funding)/i, type: 'debt' },
      { pattern: /grant/i, type: 'grant' },
    ]

    for (const { pattern, type } of roundTypes) {
      if (pattern.test(text)) {
        return type
      }
    }

    return 'other'
  }

  /**
   * Extract investor names
   */
  private extractInvestors(text: string): string[] {
    const investors: string[] = []

    // Common patterns for investor mentions
    const patterns = [
      /led by ([A-Z][A-Za-z\s&]+?)(?:,|\.|with|and)/g,
      /investors include ([A-Z][A-Za-z\s&,]+?)(?:\.|;)/g,
      /participation from ([A-Z][A-Za-z\s&,]+?)(?:\.|;)/g,
      /backed by ([A-Z][A-Za-z\s&,]+?)(?:\.|;)/g,
    ]

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const investorList = match[1].split(/,|and/)
          .map(s => s.trim())
          .filter(s => s.length > 2 && s.length < 50)

        investors.push(...investorList)
      }
    }

    // Remove duplicates
    return [...new Set(investors)].slice(0, 5)
  }

  /**
   * Calculate confidence score for the funding signal
   */
  private calculateConfidence(
    text: string,
    companyName: string,
    amount: number | null,
    roundType: string
  ): number {
    let confidence = 0.3 // Base confidence

    // Company name appears multiple times
    const companyMentions = (text.match(new RegExp(companyName, 'gi')) || []).length
    if (companyMentions >= 3) confidence += 0.2
    else if (companyMentions >= 2) confidence += 0.1

    // Amount detected
    if (amount) confidence += 0.2

    // Specific round type
    if (roundType !== 'other') confidence += 0.1

    // Recent news (within last week)
    const articleAge = Date.now() - new Date(text).getTime()
    if (articleAge < 7 * 24 * 60 * 60 * 1000) confidence += 0.1

    // Credible sources mentioned
    const credibleSources = ['techcrunch', 'forbes', 'bloomberg', 'reuters', 'financial times']
    if (credibleSources.some(source => text.toLowerCase().includes(source))) {
      confidence += 0.1
    }

    return Math.min(1, confidence)
  }

  /**
   * Deduplicate funding signals
   */
  private deduplicateSignals(signals: FundingSignal[]): FundingSignal[] {
    const uniqueMap = new Map<string, FundingSignal>()

    for (const signal of signals) {
      const key = `${signal.company_name}-${signal.round_type}-${signal.announcement_date.toISOString().split('T')[0]}`

      if (!uniqueMap.has(key) || uniqueMap.get(key)!.confidence_score < signal.confidence_score) {
        uniqueMap.set(key, signal)
      }
    }

    return Array.from(uniqueMap.values())
  }

  /**
   * Save funding signal to database
   */
  private async saveFundingSignal(signal: FundingSignal): Promise<void> {
    const supabase = await createClient()

    try {
      const { error } = await supabase
        .from('funding_signals')
        .upsert({
          ...signal,
          announcement_date: signal.announcement_date.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,announcement_date,round_type'
        })

      if (error) {
        console.error('[FundingDetector] Error saving signal:', error)
      } else {
        console.log(`[FundingDetector] Saved funding signal for ${signal.company_name}`)

        // Trigger BANT score recalculation if company has significant funding
        if (signal.company_id && signal.amount && signal.amount > 1000000) {
          await this.triggerBANTUpdate(signal.company_id)
        }
      }
    } catch (error) {
      console.error('[FundingDetector] Error in save operation:', error)
    }
  }

  /**
   * Trigger BANT score update for a company
   */
  private async triggerBANTUpdate(companyId: string): Promise<void> {
    // This would trigger the BANT scoring service
    // For now, just mark the lead score as needing update
    const supabase = await createClient()

    await supabase
      .from('lead_scores')
      .update({
        bant_last_calculated: null // Mark as needing recalculation
      })
      .eq('company_id', companyId)
  }

  /**
   * Get mock news data for development
   */
  private getMockNewsData(query: string): NewsArticle[] {
    // Return mock data for testing without API key
    const companyName = query.match(/"([^"]+)"/)?.[1] || 'TechCorp'

    return [
      {
        title: `${companyName} Raises £10M in Series A Funding Round`,
        description: `${companyName}, a leading UK technology company, announced today it has raised £10 million in Series A funding led by Venture Partners.`,
        content: `${companyName} has successfully closed a £10 million Series A funding round. The investment was led by Venture Partners with participation from Angel Investors and Tech Capital. The funding will be used to expand operations and accelerate product development.`,
        url: 'https://example.com/funding-news',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Tech News' }
      }
    ]
  }

  /**
   * Utility function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}