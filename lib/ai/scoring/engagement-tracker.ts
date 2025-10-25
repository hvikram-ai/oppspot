/**
 * Engagement Tracker
 * Tracks and scores company engagement levels
 */

import { createClient } from '@/lib/supabase/server'

export interface EngagementScore {
  score: number
  factors: Array<{
    name: string
    value: number
    impact: 'positive' | 'negative' | 'neutral'
    explanation: string
  }>
  data_quality: number
  missing_data: string[]
}

export class EngagementTracker {
  async calculateScore(company: Record<string, unknown>): Promise<EngagementScore> {
    console.log(`[EngagementTracker] Calculating score for ${company.name}`)

    const supabase = await createClient()
    const factors = []
    const missingData = []

    // Fetch engagement events
    const { data: events, error } = await supabase
      .from('engagement_events')
      .select('*')
      .eq('company_id', company.id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('created_at', { ascending: false }) as { data: Array<{ created_at: string } & Record<string, unknown>> | null; error: unknown }

    let score = 30 // Base score for no engagement

    if (events && events.length > 0) {
      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(events)

      // Email engagement
      if (engagementMetrics.emailEngagement > 0) {
        const emailScore = Math.min(100, engagementMetrics.emailEngagement * 10)
        factors.push({
          name: 'Email Engagement',
          value: emailScore,
          impact: (emailScore > 50 ? 'positive' : 'neutral') as const,
          explanation: `${engagementMetrics.emailEngagement} email interactions in last 90 days`
        })
        score += emailScore * 0.3
      }

      // Web engagement
      if (engagementMetrics.webEngagement > 0) {
        const webScore = Math.min(100, engagementMetrics.webEngagement * 5)
        factors.push({
          name: 'Web Engagement',
          value: webScore,
          impact: (webScore > 40 ? 'positive' : 'neutral') as const,
          explanation: `${engagementMetrics.webEngagement} website visits tracked`
        })
        score += webScore * 0.2
      }

      // Meeting engagement
      if (engagementMetrics.meetingEngagement > 0) {
        factors.push({
          name: 'Meeting Activity',
          value: 90,
          impact: 'positive' as const,
          explanation: `${engagementMetrics.meetingEngagement} meetings scheduled/attended`
        })
        score += 40
      }

      // Document engagement
      if (engagementMetrics.documentEngagement > 0) {
        const docScore = Math.min(100, engagementMetrics.documentEngagement * 20)
        factors.push({
          name: 'Document Interaction',
          value: docScore,
          impact: 'positive' as const,
          explanation: `${engagementMetrics.documentEngagement} documents viewed/downloaded`
        })
        score += docScore * 0.2
      }

      // Recency bonus
      const recencyScore = this.calculateRecencyScore(events[0].created_at)
      if (recencyScore > 0) {
        factors.push({
          name: 'Recent Activity',
          value: recencyScore,
          impact: (recencyScore > 60 ? 'positive' : 'neutral') as const,
          explanation: this.explainRecency(events[0].created_at)
        })
        score = score * (1 + recencyScore / 100)
      }
    } else {
      factors.push({
        name: 'Engagement History',
        value: 0,
        impact: 'negative' as const,
        explanation: 'No engagement tracked - cold lead'
      })
      missingData.push('Engagement events')
    }

    const dataQuality = events && events.length > 0 ? 80 : 20

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      factors,
      data_quality: dataQuality,
      missing_data: missingData
    }
  }

  /**
   * Record a new engagement event
   */
  async recordEngagementEvent(
    companyId: string,
    eventType: string,
    eventData: any = {},
    userId?: string
  ): Promise<void> {
    const supabase = await createClient()

    const scoreImpact = this.getEventScoreImpact(eventType)

    const { error } = await supabase
      .from('engagement_events')
      .insert({
        company_id: companyId,
        event_type: eventType,
        event_data: eventData,
        engagement_score_impact: scoreImpact,
        user_id: userId,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('[EngagementTracker] Error recording event:', error)
      throw error
    }

    console.log(`[EngagementTracker] Recorded ${eventType} event for company ${companyId}`)
  }

  private calculateEngagementMetrics(events: any[]) {
    const metrics = {
      emailEngagement: 0,
      webEngagement: 0,
      meetingEngagement: 0,
      documentEngagement: 0,
      totalEngagement: 0
    }

    for (const event of events) {
      metrics.totalEngagement++

      switch (event.event_type) {
        case 'email_open':
        case 'email_click':
        case 'email_reply':
          metrics.emailEngagement++
          break
        case 'page_view':
        case 'form_submit':
          metrics.webEngagement++
          break
        case 'meeting_scheduled':
        case 'meeting_attended':
          metrics.meetingEngagement++
          break
        case 'document_download':
        case 'proposal_viewed':
          metrics.documentEngagement++
          break
      }
    }

    return metrics
  }

  private calculateRecencyScore(lastEventDate: string): number {
    const last = new Date(lastEventDate)
    const now = new Date()
    const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince < 1) return 100
    if (daysSince < 3) return 90
    if (daysSince < 7) return 80
    if (daysSince < 14) return 70
    if (daysSince < 30) return 60
    if (daysSince < 60) return 40
    if (daysSince < 90) return 20
    return 0
  }

  private getEventScoreImpact(eventType: string): number {
    const impacts: { [key: string]: number } = {
      'meeting_attended': 30,
      'meeting_scheduled': 25,
      'demo_request': 25,
      'proposal_viewed': 20,
      'contract_sent': 20,
      'email_reply': 15,
      'form_submit': 15,
      'document_download': 10,
      'email_click': 8,
      'phone_call': 8,
      'email_open': 5,
      'page_view': 3,
      'linkedin_interaction': 3
    }

    return impacts[eventType] || 1
  }

  private explainRecency(lastDate: string): string {
    const last = new Date(lastDate)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince === 0) return 'Engaged today - hot lead'
    if (daysSince === 1) return 'Engaged yesterday - very active'
    if (daysSince < 7) return `Last engaged ${daysSince} days ago - active lead`
    if (daysSince < 30) return `Last engaged ${daysSince} days ago - warm lead`
    return `Last engaged ${daysSince} days ago - cooling lead`
  }
}