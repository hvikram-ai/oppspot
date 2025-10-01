/**
 * BANT Scoring Service
 * Implements Budget, Authority, Need, Timeline qualification framework
 */

import { createClient } from '@/lib/supabase/server'

export interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
  overall_score: number
  qualification_status: 'highly_qualified' | 'qualified' | 'nurture' | 'disqualified'
  details: BANTDetails
}

export interface BANTDetails {
  budget: {
    estimated_budget?: number
    budget_confirmed: boolean
    budget_range?: string
    funding_available: boolean
    recent_funding?: {
      amount: number
      date: string
      round_type: string
    }
  }
  authority: {
    decision_makers_identified: boolean
    decision_maker_count: number
    champion_identified: boolean
    stakeholder_engagement_level: number
    buying_committee_mapped: boolean
  }
  need: {
    pain_points_identified: string[]
    urgency_level: 'critical' | 'high' | 'medium' | 'low'
    use_case_fit: number
    problem_acknowledgment: boolean
    solution_awareness: boolean
  }
  timeline: {
    decision_timeline?: string
    implementation_timeline?: string
    urgency_indicators: string[]
    buying_stage: 'awareness' | 'consideration' | 'decision' | 'purchase'
    timeline_confirmed: boolean
  }
  recommendations: string[]
  next_actions: string[]
}

export class BANTScorer {
  /**
   * Calculate comprehensive BANT score for a company
   */
  async calculateBANTScore(companyId: string): Promise<BANTScore> {
    const supabase = await createClient()

    console.log(`[BANTScorer] Calculating BANT score for company ${companyId}`)

    try {
      // Fetch company data
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (!company) {
        throw new Error('Company not found')
      }

      // Fetch related data for BANT calculation
      const [stakeholders, fundingSignals, engagementEvents, leadScore] = await Promise.all([
        this.fetchStakeholders(companyId),
        this.fetchFundingSignals(companyId),
        this.fetchEngagementEvents(companyId),
        this.fetchLeadScore(companyId)
      ])

      // Calculate individual BANT components
      const budgetScore = await this.calculateBudgetScore(company, fundingSignals)
      const authorityScore = await this.calculateAuthorityScore(stakeholders, engagementEvents)
      const needScore = await this.calculateNeedScore(company, engagementEvents, leadScore)
      const timelineScore = await this.calculateTimelineScore(engagementEvents, company)

      // Calculate overall score
      const overallScore = Math.round(
        (budgetScore.score + authorityScore.score + needScore.score + timelineScore.score) / 4
      )

      // Determine qualification status
      const qualificationStatus = this.determineQualificationStatus(
        budgetScore.score,
        authorityScore.score,
        needScore.score,
        timelineScore.score
      )

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        budgetScore,
        authorityScore,
        needScore,
        timelineScore
      )

      // Generate next actions
      const nextActions = this.generateNextActions(
        qualificationStatus,
        budgetScore,
        authorityScore,
        needScore,
        timelineScore
      )

      const bantScore: BANTScore = {
        budget_score: budgetScore.score,
        authority_score: authorityScore.score,
        need_score: needScore.score,
        timeline_score: timelineScore.score,
        overall_score: overallScore,
        qualification_status: qualificationStatus,
        details: {
          budget: budgetScore.details,
          authority: authorityScore.details,
          need: needScore.details,
          timeline: timelineScore.details,
          recommendations,
          next_actions: nextActions
        }
      }

      // Save BANT score to database
      await this.saveBANTScore(companyId, bantScore)

      return bantScore
    } catch (error) {
      console.error('[BANTScorer] Error calculating BANT score:', error)
      throw error
    }
  }

  /**
   * Calculate Budget score
   */
  private async calculateBudgetScore(
    company: Record<string, unknown>,
    fundingSignals: Array<{ announcement_date: string; amount?: number; round_type?: string }>
  ): Promise<{
    score: number;
    budget_confirmed: boolean;
    funding_available: boolean;
    recent_funding?: { amount?: number; date: string; round_type?: string };
    estimated_budget?: number;
    budget_range?: string;
  }> {
    let score = 30 // Base score
    const details: {
      budget_confirmed: boolean;
      funding_available: boolean;
      recent_funding?: { amount?: number; date: string; round_type?: string };
      estimated_budget?: number;
      budget_range?: string;
    } = {
      budget_confirmed: false,
      funding_available: false
    }

    // Check for recent funding (strong budget indicator)
    if (fundingSignals.length > 0) {
      const recentFunding = fundingSignals[0]
      const monthsSinceFunding = this.monthsSince(new Date(recentFunding.announcement_date))

      if (monthsSinceFunding < 6) {
        score += 40 // Very recent funding
        details.recent_funding = {
          amount: recentFunding.amount,
          date: recentFunding.announcement_date,
          round_type: recentFunding.round_type
        }
        details.funding_available = true
      } else if (monthsSinceFunding < 12) {
        score += 25 // Recent funding
        details.recent_funding = recentFunding
        details.funding_available = true
      } else {
        score += 10 // Older funding
      }

      // Estimate budget based on funding amount (typically 10-20% of funding for vendors)
      if (recentFunding.amount) {
        details.estimated_budget = recentFunding.amount * 0.15
        details.budget_range = this.getBudgetRange(details.estimated_budget)
      }
    }

    // Company size indicators
    if (company.employee_count) {
      if (company.employee_count > 100) {
        score += 15 // Larger companies typically have budget
      } else if (company.employee_count > 25) {
        score += 10
      } else if (company.employee_count > 10) {
        score += 5
      }
    }

    // Industry and company status
    if (company.company_status === 'active') {
      score += 5
    }

    // Growth companies more likely to invest
    const companyAge = this.yearsSince(new Date(company.date_of_creation))
    if (companyAge < 5 && companyAge > 1) {
      score += 10 // Growth stage companies
    }

    return {
      score: Math.min(100, score),
      ...details
    }
  }

  /**
   * Calculate Authority score
   */
  private async calculateAuthorityScore(
    stakeholders: Array<{ role_type?: string; decision_authority?: boolean; engagement_score?: number; champion_score?: number }>,
    engagementEvents: Array<Record<string, unknown>>
  ): Promise<{
    score: number;
    decision_makers_identified: boolean;
    decision_maker_count: number;
    champion_identified: boolean;
    stakeholder_engagement_level: number;
    buying_committee_mapped: boolean;
  }> {
    let score = 20 // Base score
    const details: {
      decision_makers_identified: boolean;
      decision_maker_count: number;
      champion_identified: boolean;
      stakeholder_engagement_level: number;
      buying_committee_mapped: boolean;
    } = {
      decision_makers_identified: false,
      decision_maker_count: 0,
      champion_identified: false,
      stakeholder_engagement_level: 0,
      buying_committee_mapped: false
    }

    // Check stakeholder coverage
    if (stakeholders.length > 0) {
      score += 10

      // Count decision makers
      const decisionMakers = stakeholders.filter(s => s.is_decision_maker)
      if (decisionMakers.length > 0) {
        score += 20
        details.decision_makers_identified = true
        details.decision_maker_count = decisionMakers.length

        // Multiple decision makers = buying committee
        if (decisionMakers.length >= 2) {
          score += 10
          details.buying_committee_mapped = true
        }
      }

      // Check for champion
      const champions = stakeholders.filter(s => s.is_champion)
      if (champions.length > 0) {
        score += 25
        details.champion_identified = true
      }

      // Check for budget authority
      const budgetHolders = stakeholders.filter(s => s.has_budget_authority)
      if (budgetHolders.length > 0) {
        score += 15
      }

      // Calculate engagement level
      const avgEngagement = stakeholders.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / stakeholders.length
      details.stakeholder_engagement_level = Math.round(avgEngagement)

      if (avgEngagement > 70) {
        score += 10
      } else if (avgEngagement > 50) {
        score += 5
      }
    }

    // Engagement depth
    const uniqueStakeholderEngagements = new Set(engagementEvents.map(e => e.stakeholder_id)).size
    if (uniqueStakeholderEngagements >= 3) {
      score += 10 // Multiple stakeholders engaged
    }

    return {
      score: Math.min(100, score),
      ...details
    }
  }

  /**
   * Calculate Need score
   */
  private async calculateNeedScore(
    company: Record<string, unknown>,
    engagementEvents: Array<{ event_type?: string; event_data?: Record<string, unknown> }>,
    leadScore: Record<string, unknown>
  ): Promise<{
    score: number;
    pain_points_identified: string[];
    urgency_level: 'critical' | 'high' | 'medium' | 'low';
    use_case_fit: number;
    problem_acknowledgment: boolean;
    solution_awareness: boolean;
  }> {
    let score = 25 // Base score
    const details: {
      pain_points_identified: string[];
      urgency_level: 'critical' | 'high' | 'medium' | 'low';
      use_case_fit: number;
      problem_acknowledgment: boolean;
      solution_awareness: boolean;
    } = {
      pain_points_identified: [],
      urgency_level: 'low',
      use_case_fit: 50,
      problem_acknowledgment: false,
      solution_awareness: false
    }

    // High engagement indicates need
    if (engagementEvents.length > 10) {
      score += 20
      details.problem_acknowledgment = true
    } else if (engagementEvents.length > 5) {
      score += 10
    }

    // Demo attendance is strong need indicator
    const demoEvents = engagementEvents.filter(e =>
      e.event_type === 'demo_attended' || e.event_type === 'demo_scheduled'
    )
    if (demoEvents.length > 0) {
      score += 25
      details.solution_awareness = true
      details.urgency_level = 'high'
    }

    // Document downloads indicate research phase
    const documentEvents = engagementEvents.filter(e =>
      e.event_type === 'document_viewed' || e.event_type === 'document_shared'
    )
    if (documentEvents.length > 0) {
      score += 10
      details.solution_awareness = true
    }

    // Use existing lead score as indicator
    if (leadScore) {
      if (leadScore.industry_alignment_score > 70) {
        score += 10
        details.use_case_fit = leadScore.industry_alignment_score
      }
      if (leadScore.growth_indicator_score > 70) {
        score += 10
        details.urgency_level = 'medium'
      }
    }

    // Recent repeated engagement shows active need
    const recentEvents = engagementEvents.filter(e =>
      this.daysSince(new Date(e.created_at)) < 30
    )
    if (recentEvents.length > 5) {
      score += 10
      details.urgency_level = details.urgency_level === 'low' ? 'medium' : 'high'
    }

    // Identify pain points from engagement patterns
    details.pain_points_identified = this.identifyPainPoints(engagementEvents)

    return {
      score: Math.min(100, score),
      ...details
    }
  }

  /**
   * Calculate Timeline score
   */
  private async calculateTimelineScore(
    engagementEvents: Array<{ created_at: string; event_type?: string }>,
    company: Record<string, unknown>
  ): Promise<{
    score: number;
    decision_timeline?: string;
    implementation_timeline?: string;
    urgency_indicators: string[];
    fiscal_year_timing?: string;
    buying_cycle_stage: string;
  }> {
    let score = 20 // Base score
    const details: {
      decision_timeline?: string;
      implementation_timeline?: string;
      urgency_indicators: string[];
      fiscal_year_timing?: string;
      buying_cycle_stage: string;
    } = {
      buying_cycle_stage: 'awareness',
      urgency_indicators: []
    }

    // Recent high engagement indicates active buying process
    const recentEvents = engagementEvents.filter(e =>
      this.daysSince(new Date(e.created_at)) < 14
    )

    if (recentEvents.length > 5) {
      score += 30
      details.buying_stage = 'consideration'
      details.urgency_indicators.push('High recent activity')
    } else if (recentEvents.length > 2) {
      score += 15
    }

    // Demo or meeting attendance indicates decision stage
    const demoOrMeetings = engagementEvents.filter(e =>
      e.event_type === 'demo_attended' || e.event_type === 'meeting_attended'
    )
    if (demoOrMeetings.length > 0) {
      score += 25
      details.buying_stage = 'decision'

      // Recent demo = very hot
      const recentDemo = demoOrMeetings.find(e =>
        this.daysSince(new Date(e.created_at)) < 7
      )
      if (recentDemo) {
        score += 15
        details.urgency_indicators.push('Recent demo attended')
        details.timeline_confirmed = true
        details.decision_timeline = '1-3 months'
      }
    }

    // Engagement acceleration
    const engagementVelocity = this.calculateEngagementVelocity(engagementEvents)
    if (engagementVelocity > 2) {
      score += 10
      details.urgency_indicators.push('Accelerating engagement')
    }

    // Fiscal year considerations
    const currentMonth = new Date().getMonth()
    if (currentMonth === 11 || currentMonth === 2 || currentMonth === 5) {
      // Quarter ends typically have budget urgency
      score += 5
      details.urgency_indicators.push('Quarter-end approaching')
    }

    return {
      score: Math.min(100, score),
      ...details
    }
  }

  /**
   * Determine qualification status based on BANT scores
   */
  private determineQualificationStatus(
    budget: number,
    authority: number,
    need: number,
    timeline: number
  ): 'highly_qualified' | 'qualified' | 'nurture' | 'disqualified' {
    const avgScore = (budget + authority + need + timeline) / 4

    // All factors must be strong for high qualification
    if (budget >= 70 && authority >= 70 && need >= 70 && timeline >= 70) {
      return 'highly_qualified'
    }
    // Good scores with at least budget and authority
    else if (avgScore >= 60 && budget >= 50 && authority >= 50) {
      return 'qualified'
    }
    // Has potential but needs development
    else if (avgScore >= 40 || (need >= 60 && (budget >= 40 || authority >= 40))) {
      return 'nurture'
    }
    // Low scores across the board
    else {
      return 'disqualified'
    }
  }

  /**
   * Generate recommendations based on BANT scores
   */
  private generateRecommendations(budget: any, authority: any, need: any, timeline: any): string[] {
    const recommendations: string[] = []

    // Budget recommendations
    if (budget.score < 50) {
      recommendations.push('Qualify budget availability and procurement process')
      if (!budget.details.recent_funding) {
        recommendations.push('Research company financial health and funding status')
      }
    }

    // Authority recommendations
    if (authority.score < 50) {
      recommendations.push('Map the buying committee and identify decision makers')
      if (!authority.details.champion_identified) {
        recommendations.push('Cultivate an internal champion')
      }
    } else if (!authority.details.buying_committee_mapped) {
      recommendations.push('Complete stakeholder mapping')
    }

    // Need recommendations
    if (need.score < 50) {
      recommendations.push('Conduct discovery call to identify pain points')
      recommendations.push('Share relevant case studies and ROI data')
    } else if (need.score < 70) {
      recommendations.push('Deepen understanding of specific use cases')
    }

    // Timeline recommendations
    if (timeline.score < 50) {
      recommendations.push('Clarify decision timeline and buying process')
      recommendations.push('Understand any competing priorities')
    } else if (timeline.details.buying_stage === 'decision') {
      recommendations.push('Prepare proposal and pricing options')
      recommendations.push('Schedule closing call with decision makers')
    }

    return recommendations
  }

  /**
   * Generate next actions based on qualification status
   */
  private generateNextActions(
    status: string,
    budget: any,
    authority: any,
    need: any,
    timeline: any
  ): string[] {
    const actions: string[] = []

    switch (status) {
      case 'highly_qualified':
        actions.push('Schedule executive alignment meeting')
        actions.push('Prepare and send formal proposal')
        actions.push('Create mutual success plan')
        actions.push('Involve customer success for smooth onboarding planning')
        break

      case 'qualified':
        actions.push('Schedule product deep-dive demo')
        actions.push('Connect with additional stakeholders')
        actions.push('Share ROI calculator and business case')
        actions.push('Establish clear next steps and timeline')
        break

      case 'nurture':
        actions.push('Add to nurture campaign')
        actions.push('Schedule quarterly check-in')
        actions.push('Share educational content')
        actions.push('Monitor for buying signals')
        break

      case 'disqualified':
        actions.push('Move to long-term nurture')
        actions.push('Re-evaluate in 6 months')
        actions.push('Keep in marketing automation')
        break
    }

    return actions
  }

  /**
   * Helper function to fetch stakeholders
   */
  private async fetchStakeholders(companyId: string): Promise<any[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('company_id', companyId)

    return data || []
  }

  /**
   * Helper function to fetch funding signals
   */
  private async fetchFundingSignals(companyId: string): Promise<any[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('funding_signals')
      .select('*')
      .eq('company_id', companyId)
      .order('announcement_date', { ascending: false })
      .limit(3)

    return data || []
  }

  /**
   * Helper function to fetch engagement events
   */
  private async fetchEngagementEvents(companyId: string): Promise<any[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('engagement_events')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    return data || []
  }

  /**
   * Helper function to fetch lead score
   */
  private async fetchLeadScore(companyId: string): Promise<any> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('company_id', companyId)
      .single()

    return data
  }

  /**
   * Save BANT score to database
   */
  private async saveBANTScore(companyId: string, bantScore: BANTScore): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('lead_scores')
      .update({
        bant_budget_score: bantScore.budget_score,
        bant_authority_score: bantScore.authority_score,
        bant_need_score: bantScore.need_score,
        bant_timeline_score: bantScore.timeline_score,
        bant_overall_score: bantScore.overall_score,
        bant_qualification_status: bantScore.qualification_status,
        bant_details: bantScore.details,
        bant_last_calculated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)

    if (error) {
      console.error('[BANTScorer] Error saving BANT score:', error)
      throw error
    }
  }

  /**
   * Identify pain points from engagement patterns
   */
  private identifyPainPoints(events: any[]): string[] {
    const painPoints: string[] = []

    // Analyze event types and patterns
    const eventTypes = events.map(e => e.event_type)

    if (eventTypes.includes('demo_scheduled') || eventTypes.includes('demo_attended')) {
      painPoints.push('Actively evaluating solutions')
    }

    if (events.filter(e => e.event_type.includes('document')).length > 2) {
      painPoints.push('Researching implementation options')
    }

    if (events.filter(e => e.event_type.includes('meeting')).length > 1) {
      painPoints.push('Internal discussions ongoing')
    }

    return painPoints
  }

  /**
   * Calculate engagement velocity
   */
  private calculateEngagementVelocity(events: any[]): number {
    if (events.length < 2) return 0

    const sortedEvents = events.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Compare recent week to previous week
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000

    const recentWeek = sortedEvents.filter(e =>
      new Date(e.created_at).getTime() > oneWeekAgo
    ).length

    const previousWeek = sortedEvents.filter(e => {
      const time = new Date(e.created_at).getTime()
      return time <= oneWeekAgo && time > twoWeeksAgo
    }).length

    return previousWeek > 0 ? recentWeek / previousWeek : recentWeek
  }

  /**
   * Get budget range string
   */
  private getBudgetRange(amount: number): string {
    if (amount < 10000) return 'Under £10k'
    if (amount < 50000) return '£10k - £50k'
    if (amount < 100000) return '£50k - £100k'
    if (amount < 500000) return '£100k - £500k'
    return 'Over £500k'
  }

  /**
   * Utility functions for date calculations
   */
  private monthsSince(date: Date): number {
    const months = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return Math.floor(months)
  }

  private yearsSince(date: Date): number {
    const years = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return Math.floor(years)
  }

  private daysSince(date: Date): number {
    const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return Math.floor(days)
  }
}