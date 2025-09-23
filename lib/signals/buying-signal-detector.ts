/**
 * Buying Signal Detector
 * Core service for detecting and analyzing buying signals from multiple sources
 */

import { createClient } from '@/lib/supabase/server'
import { eventBus } from '@/lib/events/event-bus'
import { modelManager } from '@/lib/ml/infrastructure/model-manager'

export interface BuyingSignal {
  id?: string
  company_id: string
  signal_type: SignalType
  signal_category: SignalCategory
  signal_strength: number // 0-10
  confidence_score: number // 0-1
  source: string
  source_url?: string
  title?: string
  description?: string
  raw_data?: any
  metadata?: Record<string, any>
  detected_at: Date
  expires_at?: Date
}

export type SignalType =
  | 'web_activity'
  | 'job_posting'
  | 'funding'
  | 'tech_adoption'
  | 'executive_change'
  | 'expansion_news'
  | 'partnership'
  | 'product_launch'
  | 'competitor_mention'
  | 'social_engagement'

export type SignalCategory =
  | 'intent'
  | 'growth'
  | 'technology'
  | 'financial'
  | 'organizational'
  | 'engagement'

export interface SignalPattern {
  id: string
  pattern_name: string
  pattern_type: string
  detection_rules: any
  keywords: string[]
  weight: number
  min_confidence: number
}

export interface IntentScore {
  company_id: string
  intent_score: number // 0-100
  intent_level: 'hot' | 'warm' | 'lukewarm' | 'cold' | 'no_intent'
  top_signals: BuyingSignal[]
  growth_indicators: number
  technology_indicators: number
  engagement_indicators: number
  predicted_timeline?: string
  recommended_actions: string[]
  confidence: number
}

export class BuyingSignalDetector {
  private signalWeights: Record<SignalType, number> = {
    web_activity: 0.7,
    job_posting: 0.6,
    funding: 0.9,
    tech_adoption: 0.7,
    executive_change: 0.5,
    expansion_news: 0.8,
    partnership: 0.6,
    product_launch: 0.7,
    competitor_mention: 0.4,
    social_engagement: 0.3
  }

  /**
   * Detect all signals for a company
   */
  async detectSignals(companyId: string): Promise<BuyingSignal[]> {
    console.log(`[SignalDetector] Detecting signals for company ${companyId}`)

    try {
      const signals: BuyingSignal[] = []

      // Run all detection methods in parallel
      const [
        webSignals,
        jobSignals,
        techSignals,
        newsSignals,
        socialSignals
      ] = await Promise.all([
        this.detectWebActivitySignals(companyId),
        this.detectJobPostingSignals(companyId),
        this.detectTechAdoptionSignals(companyId),
        this.detectNewsSignals(companyId),
        this.detectSocialSignals(companyId)
      ])

      signals.push(
        ...webSignals,
        ...jobSignals,
        ...techSignals,
        ...newsSignals,
        ...socialSignals
      )

      // Save signals to database
      await this.saveSignals(signals)

      // Calculate and update intent score
      await this.updateIntentScore(companyId)

      // Emit event for high-value signals
      const highValueSignals = signals.filter(s => s.signal_strength >= 7)
      if (highValueSignals.length > 0) {
        eventBus.emit({
          type: 'buying_signals.detected',
          source: 'signal-detector',
          data: {
            company_id: companyId,
            signal_count: highValueSignals.length,
            max_strength: Math.max(...highValueSignals.map(s => s.signal_strength))
          }
        })
      }

      return signals
    } catch (error) {
      console.error('[SignalDetector] Error detecting signals:', error)
      return []
    }
  }

  /**
   * Detect web activity signals
   */
  private async detectWebActivitySignals(companyId: string): Promise<BuyingSignal[]> {
    const supabase = await createClient()
    const signals: BuyingSignal[] = []

    // Get recent web activity
    const { data: activities } = await supabase
      .from('web_activity_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (!activities || activities.length === 0) {
      return signals
    }

    // Analyze activity patterns
    const pageTypeCounts: Record<string, number> = {}
    let totalTimeOnSite = 0
    let highIntentPages = 0

    for (const activity of activities) {
      pageTypeCounts[activity.page_type] = (pageTypeCounts[activity.page_type] || 0) + 1
      totalTimeOnSite += activity.time_on_page || 0

      if (['pricing', 'demo', 'contact'].includes(activity.page_type)) {
        highIntentPages++
      }
    }

    // Create signals based on patterns
    if (pageTypeCounts['pricing'] >= 2) {
      signals.push({
        company_id: companyId,
        signal_type: 'web_activity',
        signal_category: 'intent',
        signal_strength: 7.5,
        confidence_score: 0.8,
        source: 'website',
        title: 'Multiple Pricing Page Visits',
        description: `Visited pricing page ${pageTypeCounts['pricing']} times in the last 7 days`,
        detected_at: new Date(),
        metadata: { page_visits: pageTypeCounts['pricing'] }
      })
    }

    if (pageTypeCounts['demo']) {
      signals.push({
        company_id: companyId,
        signal_type: 'web_activity',
        signal_category: 'intent',
        signal_strength: 9.0,
        confidence_score: 0.9,
        source: 'website',
        title: 'Demo Page Visit',
        description: 'Showed interest in product demo',
        detected_at: new Date()
      })
    }

    // High engagement signal
    if (activities.length >= 10 && totalTimeOnSite > 300) {
      signals.push({
        company_id: companyId,
        signal_type: 'web_activity',
        signal_category: 'engagement',
        signal_strength: 6.0,
        confidence_score: 0.7,
        source: 'website',
        title: 'High Website Engagement',
        description: `${activities.length} page views, ${Math.round(totalTimeOnSite / 60)} minutes on site`,
        detected_at: new Date(),
        metadata: {
          page_views: activities.length,
          time_on_site: totalTimeOnSite,
          high_intent_pages: highIntentPages
        }
      })
    }

    return signals
  }

  /**
   * Detect job posting signals
   */
  private async detectJobPostingSignals(companyId: string): Promise<BuyingSignal[]> {
    const supabase = await createClient()
    const signals: BuyingSignal[] = []

    // Get company info
    const { data: company } = await supabase
      .from('businesses')
      .select('name, company_number')
      .eq('id', companyId)
      .single()

    if (!company) return signals

    // Check for job postings (would integrate with job board APIs)
    const jobPostings = await this.fetchJobPostings(company.name)

    if (jobPostings.length > 0) {
      // Analyze posting patterns
      const techRoles = jobPostings.filter(job =>
        job.title.match(/engineer|developer|architect|devops|data|analyst/i)
      )

      const seniorRoles = jobPostings.filter(job =>
        job.title.match(/head|director|vp|chief|senior|lead|manager/i)
      )

      if (jobPostings.length >= 5) {
        signals.push({
          company_id: companyId,
          signal_type: 'job_posting',
          signal_category: 'growth',
          signal_strength: 7.0,
          confidence_score: 0.8,
          source: 'job_boards',
          title: 'Rapid Hiring',
          description: `${jobPostings.length} open positions indicate growth`,
          detected_at: new Date(),
          metadata: {
            total_postings: jobPostings.length,
            tech_roles: techRoles.length,
            senior_roles: seniorRoles.length
          }
        })
      }

      if (techRoles.length >= 3) {
        signals.push({
          company_id: companyId,
          signal_type: 'job_posting',
          signal_category: 'technology',
          signal_strength: 6.5,
          confidence_score: 0.75,
          source: 'job_boards',
          title: 'Technology Team Expansion',
          description: `Hiring ${techRoles.length} technical roles`,
          detected_at: new Date()
        })
      }

      // Save job postings to database
      for (const job of jobPostings.slice(0, 10)) {
        await supabase.from('job_posting_signals').insert({
          company_id: companyId,
          job_title: job.title,
          department: job.department,
          location: job.location,
          job_board_source: job.source,
          job_url: job.url,
          posted_date: job.posted_date
        })
      }
    }

    return signals
  }

  /**
   * Detect technology adoption signals
   */
  private async detectTechAdoptionSignals(companyId: string): Promise<BuyingSignal[]> {
    const supabase = await createClient()
    const signals: BuyingSignal[] = []

    // Get company website
    const { data: company } = await supabase
      .from('businesses')
      .select('website')
      .eq('id', companyId)
      .single()

    if (!company?.website) return signals

    // Detect website technologies (would use builtwith/wappalyzer API)
    const technologies = await this.detectWebsiteTechnologies(company.website)

    // Check for new technology adoptions
    const relevantTechs = technologies.filter(tech =>
      ['CRM', 'Marketing', 'Analytics', 'E-commerce'].includes(tech.category)
    )

    if (relevantTechs.length > 0) {
      for (const tech of relevantTechs) {
        // Check if this is a new adoption
        const { data: existing } = await supabase
          .from('tech_adoption_signals')
          .select('id')
          .eq('company_id', companyId)
          .eq('technology_name', tech.name)
          .single()

        if (!existing) {
          signals.push({
            company_id: companyId,
            signal_type: 'tech_adoption',
            signal_category: 'technology',
            signal_strength: 6.0,
            confidence_score: 0.7,
            source: 'website_tech',
            title: `New Technology: ${tech.name}`,
            description: `Adopted ${tech.category} solution`,
            detected_at: new Date(),
            metadata: tech
          })

          // Save to database
          await supabase.from('tech_adoption_signals').insert({
            company_id: companyId,
            technology_name: tech.name,
            technology_category: tech.category,
            technology_vendor: tech.vendor,
            adoption_type: 'new',
            detection_method: 'website_tech',
            confidence: 0.7
          })
        }
      }
    }

    return signals
  }

  /**
   * Detect news-based signals
   */
  private async detectNewsSignals(companyId: string): Promise<BuyingSignal[]> {
    const supabase = await createClient()
    const signals: BuyingSignal[] = []

    // Get company name
    const { data: company } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', companyId)
      .single()

    if (!company) return signals

    // Search for news (using existing funding detector as base)
    const newsArticles = await this.searchCompanyNews(company.name)

    for (const article of newsArticles) {
      const signalType = this.classifyNewsArticle(article)

      if (signalType) {
        signals.push({
          company_id: companyId,
          signal_type: signalType.type,
          signal_category: signalType.category,
          signal_strength: signalType.strength,
          confidence_score: 0.6,
          source: 'news',
          source_url: article.url,
          title: article.title,
          description: article.description,
          detected_at: new Date(article.publishedAt),
          metadata: { article }
        })
      }
    }

    return signals
  }

  /**
   * Detect social media signals
   */
  private async detectSocialSignals(companyId: string): Promise<BuyingSignal[]> {
    // Simplified for now - would integrate with social media APIs
    return []
  }

  /**
   * Calculate intent score for a company
   */
  async calculateIntentScore(companyId: string): Promise<IntentScore> {
    const supabase = await createClient()

    // Get recent signals
    const { data: signals } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('detected_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order('signal_strength', { ascending: false })

    if (!signals || signals.length === 0) {
      return {
        company_id: companyId,
        intent_score: 0,
        intent_level: 'no_intent',
        top_signals: [],
        growth_indicators: 0,
        technology_indicators: 0,
        engagement_indicators: 0,
        recommended_actions: ['Continue monitoring'],
        confidence: 0
      }
    }

    // Calculate weighted score
    let weightedSum = 0
    let totalWeight = 0

    for (const signal of signals) {
      const age = (Date.now() - new Date(signal.detected_at).getTime()) / (1000 * 60 * 60 * 24)
      const recency = age < 7 ? 1.0 : age < 30 ? 0.7 : age < 90 ? 0.4 : 0.2
      const weight = this.signalWeights[signal.signal_type as SignalType] || 0.5

      weightedSum += signal.signal_strength * weight * recency
      totalWeight += weight * recency
    }

    const intentScore = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : 0

    // Determine intent level
    const intentLevel =
      intentScore >= 80 ? 'hot' :
      intentScore >= 60 ? 'warm' :
      intentScore >= 40 ? 'lukewarm' :
      intentScore >= 20 ? 'cold' :
      'no_intent'

    // Calculate category scores
    const categoryScores = {
      growth: 0,
      technology: 0,
      engagement: 0
    }

    for (const signal of signals) {
      if (signal.signal_category === 'growth') {
        categoryScores.growth += signal.signal_strength
      } else if (signal.signal_category === 'technology') {
        categoryScores.technology += signal.signal_strength
      } else if (signal.signal_category === 'engagement') {
        categoryScores.engagement += signal.signal_strength
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(intentLevel, signals)

    // Predict timeline
    const timeline = this.predictPurchaseTimeline(intentScore, signals)

    return {
      company_id: companyId,
      intent_score: Math.round(intentScore),
      intent_level: intentLevel,
      top_signals: signals.slice(0, 5),
      growth_indicators: categoryScores.growth,
      technology_indicators: categoryScores.technology,
      engagement_indicators: categoryScores.engagement,
      predicted_timeline: timeline,
      recommended_actions: recommendations,
      confidence: Math.min(signals.length / 10, 1) * 0.9
    }
  }

  /**
   * Generate action recommendations based on signals
   */
  private generateRecommendations(
    intentLevel: string,
    signals: BuyingSignal[]
  ): string[] {
    const recommendations: string[] = []

    if (intentLevel === 'hot') {
      recommendations.push('Schedule immediate outreach call')
      recommendations.push('Prepare personalized demo')
      recommendations.push('Send ROI calculator')
    } else if (intentLevel === 'warm') {
      recommendations.push('Send targeted case study')
      recommendations.push('Invite to webinar')
      recommendations.push('Schedule follow-up in 1 week')
    }

    // Check for specific signal types
    if (signals.some(s => s.signal_type === 'web_activity' && s.title?.includes('Pricing'))) {
      recommendations.push('Send pricing comparison guide')
    }

    if (signals.some(s => s.signal_type === 'job_posting')) {
      recommendations.push('Highlight scalability features')
    }

    if (signals.some(s => s.signal_type === 'tech_adoption')) {
      recommendations.push('Emphasize integration capabilities')
    }

    return recommendations.slice(0, 5)
  }

  /**
   * Predict purchase timeline
   */
  private predictPurchaseTimeline(intentScore: number, signals: BuyingSignal[]): string {
    // Check for urgent signals
    const hasUrgentSignals = signals.some(s =>
      s.signal_type === 'web_activity' &&
      (s.title?.includes('Demo') || s.title?.includes('Contact'))
    )

    if (hasUrgentSignals && intentScore >= 70) {
      return 'immediate'
    } else if (intentScore >= 60) {
      return '1-3_months'
    } else if (intentScore >= 40) {
      return '3-6_months'
    } else {
      return '6+_months'
    }
  }

  /**
   * Helper methods
   */
  private async saveSignals(signals: BuyingSignal[]): Promise<void> {
    if (signals.length === 0) return

    const supabase = await createClient()

    for (const signal of signals) {
      await supabase.from('buying_signals').insert({
        company_id: signal.company_id,
        signal_type: signal.signal_type,
        signal_category: signal.signal_category,
        signal_strength: signal.signal_strength,
        confidence_score: signal.confidence_score,
        source: signal.source,
        source_url: signal.source_url,
        title: signal.title,
        description: signal.description,
        raw_data: signal.raw_data,
        metadata: signal.metadata,
        detected_at: signal.detected_at.toISOString(),
        expires_at: signal.expires_at?.toISOString()
      })
    }
  }

  private async updateIntentScore(companyId: string): Promise<void> {
    const intentScore = await this.calculateIntentScore(companyId)
    const supabase = await createClient()

    await supabase.from('company_signal_summary').upsert({
      company_id: companyId,
      intent_score: intentScore.intent_score,
      intent_level: intentScore.intent_level,
      growth_score: intentScore.growth_indicators,
      technology_score: intentScore.technology_indicators,
      engagement_score: intentScore.engagement_indicators,
      predicted_timeline: intentScore.predicted_timeline,
      recommended_actions: intentScore.recommended_actions,
      top_signals: intentScore.top_signals,
      updated_at: new Date().toISOString()
    })
  }

  // Mock implementations for external data sources
  private async fetchJobPostings(companyName: string): Promise<any[]> {
    // Would integrate with job board APIs
    // For now, return mock data
    return []
  }

  private async detectWebsiteTechnologies(website: string): Promise<any[]> {
    // Would use BuiltWith or Wappalyzer API
    return []
  }

  private async searchCompanyNews(companyName: string): Promise<any[]> {
    // Would use News API
    return []
  }

  private classifyNewsArticle(article: any): { type: SignalType; category: SignalCategory; strength: number } | null {
    const title = article.title.toLowerCase()
    const description = (article.description || '').toLowerCase()
    const content = title + ' ' + description

    if (content.includes('funding') || content.includes('raises') || content.includes('investment')) {
      return { type: 'funding', category: 'financial', strength: 8 }
    }

    if (content.includes('partnership') || content.includes('collaborate')) {
      return { type: 'partnership', category: 'growth', strength: 6 }
    }

    if (content.includes('expansion') || content.includes('new office') || content.includes('entering market')) {
      return { type: 'expansion_news', category: 'growth', strength: 7 }
    }

    if (content.includes('launch') || content.includes('release') || content.includes('announce')) {
      return { type: 'product_launch', category: 'technology', strength: 6 }
    }

    return null
  }
}

// Export singleton instance
export const signalDetector = new BuyingSignalDetector()