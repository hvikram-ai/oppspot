import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OpenRouter } from '@/lib/ai/openrouter'
import type { BANTQualification, MEDDICQualification } from '@/types/qualification'
import type { Row } from '@/lib/supabase/helpers'

// Company data interface
export interface CompanyData {
  id: string
  name: string
  employee_count?: string
  industry?: string
  revenue?: string
  growth_rate?: 'high' | 'medium' | 'low'
  [key: string]: unknown
}

// Qualification comparison data
export interface QualificationComparison {
  leadId: string
  bant: BANTQualification | null
  meddic: MEDDICQualification | null
  prediction: QualificationPrediction | null
}

// Deal size factors
export interface DealSizeFactors {
  riskFactors: string[]
  successFactors: string[]
}

// Qualification scores
export interface QualificationScores {
  overall: number
  components: Record<string, number>
}

// Qualification comparison result
export interface ComparisonResult {
  comparisons: Array<{
    leadId: string
    bant: BANTQualification | null
    meddic: MEDDICQualification | null
    prediction: QualificationPrediction | null
  }>
  topLead?: string
  insights: string[]
}

export interface QualificationInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'risk' | 'recommendation'
  category: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  suggestedActions: string[]
  relatedMetrics: Record<string, unknown>
}

export interface QualificationPrediction {
  conversionProbability: number
  expectedCloseDate: string
  dealSize: number
  riskFactors: string[]
  successFactors: string[]
  nextBestAction: string
  alternativeApproaches: string[]
}

export class QualificationInsightsEngine {
  private supabase: SupabaseClient | null = null
  private ai: OpenRouter

  constructor() {
    this.ai = new OpenRouter()
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Generate AI-powered insights for a qualification
   */
  async generateInsights(
    leadId: string,
    framework: 'BANT' | 'MEDDIC'
  ): Promise<QualificationInsight[]> {
    try {
      const supabase = await this.getSupabase()
      const insights: QualificationInsight[] = []

      // Get qualification data
      const tableName = framework === 'BANT' ? 'bant_qualifications' : 'meddic_qualifications'
      const { data: qualification } = await supabase
        .from(tableName)
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!qualification) {
        return []
      }

      // Get company data
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', qualification.company_id)
        .single() as { data: Row<'businesses'> | null; error: any }

      // Analyze based on framework
      if (framework === 'BANT') {
        insights.push(...this.analyzeBANT(qualification, company))
      } else {
        insights.push(...this.analyzeMEDDIC(qualification, company))
      }

      // Get AI recommendations
      const aiInsights = await this.getAIRecommendations(qualification, company, framework)
      insights.push(...aiInsights)

      // Sort by impact and confidence
      insights.sort((a, b) => {
        const impactScore = { high: 3, medium: 2, low: 1 }
        const aScore = impactScore[a.impact] * a.confidence
        const bScore = impactScore[b.impact] * b.confidence
        return bScore - aScore
      })

      return insights
    } catch (error) {
      console.error('Error generating insights:', error)
      return []
    }
  }

  /**
   * Analyze BANT qualification
   */
  private analyzeBANT(qualification: BANTQualification, company: CompanyData | null): QualificationInsight[] {
    const insights: QualificationInsight[] = []

    // Budget Analysis
    if (qualification.budget_score < 50) {
      insights.push({
        type: 'weakness',
        category: 'Budget',
        title: 'Budget Constraints Detected',
        description: `Budget score is ${qualification.budget_score}%, indicating potential funding challenges.`,
        impact: 'high',
        confidence: 85,
        suggestedActions: [
          'Explore flexible payment terms',
          'Present ROI calculation',
          'Discuss phased implementation',
          'Identify cost reduction opportunities'
        ],
        relatedMetrics: {
          budget_score: qualification.budget_score,
          budget_details: qualification.budget_details
        }
      })
    } else if (qualification.budget_score > 80) {
      insights.push({
        type: 'strength',
        category: 'Budget',
        title: 'Strong Budget Alignment',
        description: `Budget score of ${qualification.budget_score}% indicates strong financial readiness.`,
        impact: 'high',
        confidence: 90,
        suggestedActions: [
          'Accelerate sales process',
          'Propose premium package',
          'Discuss additional services'
        ],
        relatedMetrics: {
          budget_score: qualification.budget_score
        }
      })
    }

    // Authority Analysis
    if (qualification.authority_score < 40) {
      insights.push({
        type: 'risk',
        category: 'Authority',
        title: 'Decision Maker Gap',
        description: 'Key decision makers not yet identified or engaged.',
        impact: 'high',
        confidence: 80,
        suggestedActions: [
          'Request introduction to decision makers',
          'Organize executive briefing',
          'Develop champion within organization',
          'Create stakeholder map'
        ],
        relatedMetrics: {
          authority_score: qualification.authority_score,
          decision_makers: qualification.authority_details.decision_makers
        }
      })
    }

    // Need Analysis
    if (qualification.need_score > 70 && qualification.need_details.urgency_level === 'critical') {
      insights.push({
        type: 'opportunity',
        category: 'Need',
        title: 'Critical Business Need Identified',
        description: 'Strong pain points with critical urgency present ideal conditions for conversion.',
        impact: 'high',
        confidence: 88,
        suggestedActions: [
          'Fast-track proposal delivery',
          'Schedule immediate demo',
          'Prepare quick-win implementation plan'
        ],
        relatedMetrics: {
          need_score: qualification.need_score,
          urgency: qualification.need_details.urgency_level
        }
      })
    }

    // Timeline Analysis
    if (qualification.timeline_score < 30) {
      insights.push({
        type: 'weakness',
        category: 'Timeline',
        title: 'Extended Decision Timeline',
        description: 'Long decision timeline may indicate lower priority or budget planning phase.',
        impact: 'medium',
        confidence: 75,
        suggestedActions: [
          'Establish regular check-in schedule',
          'Provide educational content',
          'Build relationship for future opportunity',
          'Identify interim solutions'
        ],
        relatedMetrics: {
          timeline_score: qualification.timeline_score,
          decision_date: qualification.timeline_details.decision_date
        }
      })
    }

    return insights
  }

  /**
   * Analyze MEDDIC qualification
   */
  private analyzeMEDDIC(qualification: MEDDICQualification, company: CompanyData | null): QualificationInsight[] {
    const insights: QualificationInsight[] = []

    // Economic Buyer Analysis
    if (!qualification.economic_buyer_details?.identified) {
      insights.push({
        type: 'risk',
        category: 'Economic Buyer',
        title: 'Economic Buyer Not Identified',
        description: 'Critical gap: Economic buyer must be identified for deal progression.',
        impact: 'high',
        confidence: 95,
        suggestedActions: [
          'Map organizational hierarchy',
          'Ask champion for introduction',
          'Research LinkedIn for budget holders',
          'Request org chart review'
        ],
        relatedMetrics: {
          economic_buyer_score: qualification.economic_buyer_score,
          identified: false
        }
      })
    }

    // Champion Analysis
    if (qualification.champion_score < 50) {
      insights.push({
        type: 'weakness',
        category: 'Champion',
        title: 'Weak Internal Champion',
        description: 'No strong internal advocate to drive the deal forward.',
        impact: 'high',
        confidence: 82,
        suggestedActions: [
          'Identify potential champions',
          'Provide champion enablement materials',
          'Offer to co-present internally',
          'Build multi-threaded relationships'
        ],
        relatedMetrics: {
          champion_score: qualification.champion_score,
          influence_level: qualification.champion_details?.influence_level
        }
      })
    }

    // Metrics Analysis
    if (qualification.metrics_score > 80) {
      insights.push({
        type: 'strength',
        category: 'Metrics',
        title: 'Strong Success Metrics Definition',
        description: 'Well-defined success metrics increase likelihood of successful implementation.',
        impact: 'high',
        confidence: 87,
        suggestedActions: [
          'Document success criteria formally',
          'Establish measurement baseline',
          'Create success tracking dashboard',
          'Schedule regular review checkpoints'
        ],
        relatedMetrics: {
          metrics_score: qualification.metrics_score,
          roi_calculation: qualification.metrics_details?.roi_calculation
        }
      })
    }

    // Decision Process Analysis
    if (qualification.decision_process_score < 60) {
      insights.push({
        type: 'risk',
        category: 'Decision Process',
        title: 'Unclear Decision Process',
        description: 'Decision process not fully mapped, creating uncertainty in deal progression.',
        impact: 'medium',
        confidence: 78,
        suggestedActions: [
          'Map complete decision process',
          'Identify all stakeholders',
          'Clarify approval stages',
          'Document timeline milestones'
        ],
        relatedMetrics: {
          decision_process_score: qualification.decision_process_score,
          current_stage: qualification.decision_process_details?.current_stage
        }
      })
    }

    return insights
  }

  /**
   * Get AI-powered recommendations
   */
  private async getAIRecommendations(
    qualification: BANTQualification | MEDDICQualification,
    company: CompanyData | null,
    framework: string
  ): Promise<QualificationInsight[]> {
    try {
      const prompt = `
        Analyze this ${framework} qualification and provide strategic insights:

        Company: ${company?.name || 'Unknown'}
        Industry: ${company?.industry || 'Unknown'}
        Size: ${company?.employee_count || 0} employees

        Qualification Scores:
        ${JSON.stringify(this.extractScores(qualification, framework), null, 2)}

        Provide 3-5 specific, actionable insights that will help close this deal.
        Focus on:
        1. Hidden opportunities based on the data
        2. Risk mitigation strategies
        3. Competitive positioning tactics
        4. Negotiation leverage points

        Format as JSON array with: type, category, title, description, impact, suggestedActions
      `

      const response = await this.ai.complete(prompt, {
        temperature: 0.7,
        maxTokens: 1000
      })

      const insights = this.parseAIResponse(response)
      return insights.map(insight => ({
        ...insight,
        confidence: 70, // AI insights have moderate confidence
        relatedMetrics: {}
      }))
    } catch (error) {
      console.error('Error getting AI recommendations:', error)
      return []
    }
  }

  /**
   * Generate conversion prediction
   */
  async generatePrediction(leadId: string): Promise<QualificationPrediction | null> {
    try {
      const supabase = await this.getSupabase()

      // Get all qualification data
      const [bant, meddic, company, history] = await Promise.all([
        supabase.from('bant_qualifications')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase.from('meddic_qualifications')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase.from('businesses')
          .select('*')
          .limit(1)
          .single(),
        supabase.from('engagement_events')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      // Calculate base conversion probability
      let conversionProbability = 0
      let scoreCount = 0

      if (bant.data) {
        conversionProbability += bant.data.overall_score
        scoreCount++
      }

      if (meddic.data) {
        conversionProbability += meddic.data.overall_score
        scoreCount++
      }

      if (scoreCount > 0) {
        conversionProbability = conversionProbability / scoreCount
      }

      // Adjust based on engagement
      const engagementBoost = this.calculateEngagementBoost(history.data || [])
      conversionProbability = Math.min(100, conversionProbability + engagementBoost)

      // Calculate expected close date
      const expectedCloseDate = this.calculateExpectedCloseDate(
        bant.data,
        meddic.data,
        conversionProbability
      )

      // Estimate deal size
      const dealSize = this.estimateDealSize(company.data, bant.data, meddic.data)

      // Identify risk and success factors
      const { riskFactors, successFactors } = this.identifyFactors(bant.data, meddic.data)

      // Determine next best action
      const nextBestAction = await this.determineNextBestAction(
        bant.data,
        meddic.data,
        conversionProbability
      )

      // Generate alternative approaches
      const alternativeApproaches = this.generateAlternativeApproaches(
        riskFactors,
        conversionProbability
      )

      return {
        conversionProbability: Math.round(conversionProbability),
        expectedCloseDate,
        dealSize,
        riskFactors,
        successFactors,
        nextBestAction,
        alternativeApproaches
      }
    } catch (error) {
      console.error('Error generating prediction:', error)
      return null
    }
  }

  /**
   * Calculate engagement boost for probability
   */
  private calculateEngagementBoost(events: Array<Record<string, unknown>>): number {
    if (events.length === 0) return 0

    let boost = 0

    // Recent engagement (last 7 days)
    const recentEvents = events.filter(e => {
      // @ts-ignore - Supabase type inference issue
      const eventDate = new Date(e.created_at)
      const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 7
    })

    boost += Math.min(10, recentEvents.length * 2)

    // High-value events
    const highValueEvents = events.filter(e =>
      ['demo_scheduled', 'proposal_sent', 'meeting_completed'].includes(e.event_type)
    )
    boost += Math.min(10, highValueEvents.length * 3)

    return boost
  }

  /**
   * Calculate expected close date
   */
  private calculateExpectedCloseDate(
    bant: BANTQualification | null,
    meddic: MEDDICQualification | null,
    probability: number
  ): string {
    const baseDate = new Date()

    // Start with timeline from qualification
    if (bant?.timeline_details?.decision_date) {
      return bant.timeline_details.decision_date
    }

    if (meddic?.decision_process_details?.timeline?.decision_date) {
      return meddic.decision_process_details.timeline.decision_date
    }

    // Estimate based on probability
    if (probability > 80) {
      baseDate.setDate(baseDate.getDate() + 30) // 1 month
    } else if (probability > 60) {
      baseDate.setDate(baseDate.getDate() + 60) // 2 months
    } else if (probability > 40) {
      baseDate.setDate(baseDate.getDate() + 90) // 3 months
    } else {
      baseDate.setDate(baseDate.getDate() + 180) // 6 months
    }

    return baseDate.toISOString().split('T')[0]
  }

  /**
   * Estimate deal size
   */
  private estimateDealSize(company: CompanyData | null, bant: BANTQualification | null, meddic: MEDDICQualification | null): number {
    let baseSize = 50000 // Default deal size

    // Adjust based on company size
    if (company) {
      if (company.employee_count > 1000) {
        baseSize = 250000
      } else if (company.employee_count > 500) {
        baseSize = 150000
      } else if (company.employee_count > 100) {
        baseSize = 75000
      }
    }

    // Adjust based on budget indicators
    if (bant?.budget_details?.budget_range) {
      const ranges = {
        'under_10k': 7500,
        '10k_50k': 30000,
        '50k_100k': 75000,
        '100k_500k': 300000,
        'over_500k': 750000
      }
      baseSize = ranges[bant.budget_details.budget_range] || baseSize
    }

    // Adjust based on ROI calculation
    if (meddic?.metrics_details?.roi_calculation?.investment) {
      baseSize = meddic.metrics_details.roi_calculation.investment
    }

    return baseSize
  }

  /**
   * Identify risk and success factors
   */
  private identifyFactors(bant: BANTQualification | null, meddic: MEDDICQualification | null): DealSizeFactors {
    const riskFactors: string[] = []
    const successFactors: string[] = []

    // BANT factors
    if (bant) {
      if (bant.budget_score < 50) riskFactors.push('Limited budget availability')
      if (bant.budget_score > 80) successFactors.push('Strong budget alignment')

      if (bant.authority_score < 50) riskFactors.push('Decision maker not engaged')
      if (bant.authority_score > 80) successFactors.push('Executive sponsorship secured')

      if (bant.need_score < 50) riskFactors.push('Weak problem-solution fit')
      if (bant.need_score > 80) successFactors.push('Critical business need identified')

      if (bant.timeline_score < 30) riskFactors.push('Extended decision timeline')
      if (bant.timeline_score > 70) successFactors.push('Urgent implementation needed')
    }

    // MEDDIC factors
    if (meddic) {
      if (!meddic.economic_buyer_details?.identified) {
        riskFactors.push('Economic buyer not identified')
      } else {
        successFactors.push('Economic buyer engaged')
      }

      if (meddic.champion_score < 50) riskFactors.push('No strong internal champion')
      if (meddic.champion_score > 80) successFactors.push('Strong champion advocacy')

      if (meddic.metrics_score > 80) successFactors.push('Clear success metrics defined')
      if (meddic.identify_pain_score > 80) successFactors.push('Significant pain quantified')
    }

    return { riskFactors, successFactors }
  }

  /**
   * Determine next best action
   */
  private async determineNextBestAction(
    bant: BANTQualification | null,
    meddic: MEDDICQualification | null,
    probability: number
  ): Promise<string> {
    // Priority-based action determination
    if (meddic && !meddic.economic_buyer_details?.identified) {
      return 'Identify and engage economic buyer through executive briefing'
    }

    if (bant && bant.authority_score < 50) {
      return 'Schedule meeting with decision makers to confirm buying process'
    }

    if (meddic && meddic.champion_score < 50) {
      return 'Develop internal champion through value demonstration'
    }

    if (bant && bant.budget_score < 50) {
      return 'Present ROI analysis and flexible payment options'
    }

    if (probability > 80) {
      return 'Accelerate deal closure with time-limited incentive'
    }

    if (probability > 60) {
      return 'Schedule proof of concept to demonstrate value'
    }

    return 'Nurture with educational content and case studies'
  }

  /**
   * Generate alternative approaches
   */
  private generateAlternativeApproaches(
    riskFactors: string[],
    probability: number
  ): string[] {
    const approaches: string[] = []

    if (riskFactors.includes('Limited budget availability')) {
      approaches.push('Propose phased implementation to spread costs')
      approaches.push('Explore leasing or subscription model')
    }

    if (riskFactors.includes('Decision maker not engaged')) {
      approaches.push('Request champion to facilitate executive introduction')
      approaches.push('Create compelling executive summary with peer benchmarks')
    }

    if (riskFactors.includes('Extended decision timeline')) {
      approaches.push('Offer pilot program with quick wins')
      approaches.push('Provide competitive analysis showing first-mover advantage')
    }

    if (probability < 40) {
      approaches.push('Transition to long-term nurture campaign')
      approaches.push('Explore partnership opportunities for future')
    }

    return approaches
  }

  /**
   * Extract scores based on framework
   */
  private extractScores(qualification: BANTQualification | MEDDICQualification, framework: string): QualificationScores {
    if (framework === 'BANT') {
      const bant = qualification as BANTQualification
      return {
        overall: bant.overall_score,
        components: {
          budget: bant.budget_score,
          authority: bant.authority_score,
          need: bant.need_score,
          timeline: bant.timeline_score
        }
      }
    } else {
      const meddic = qualification as MEDDICQualification
      return {
        overall: meddic.overall_score,
        components: {
          metrics: meddic.metrics_score,
          economic_buyer: meddic.economic_buyer_score,
          decision_criteria: meddic.decision_criteria_score,
          decision_process: meddic.decision_process_score,
          identify_pain: meddic.identify_pain_score,
          champion: meddic.champion_score
        }
      }
    }
  }

  /**
   * Parse AI response into insights
   */
  private parseAIResponse(response: string): Partial<QualificationInsight>[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return []
    } catch (error) {
      console.error('Error parsing AI response:', error)
      return []
    }
  }

  /**
   * Generate qualification comparison
   */
  async compareQualifications(leadIds: string[]): Promise<ComparisonResult | null> {
    try {
      const supabase = await this.getSupabase()
      const comparisons = []

      for (const leadId of leadIds) {
        const [bant, meddic, prediction] = await Promise.all([
          supabase.from('bant_qualifications')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase.from('meddic_qualifications')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          this.generatePrediction(leadId)
        ])

        comparisons.push({
          leadId,
          bant: bant.data,
          meddic: meddic.data,
          prediction
        })
      }

      // Rank by conversion probability
      comparisons.sort((a, b) =>
        (b.prediction?.conversionProbability || 0) - (a.prediction?.conversionProbability || 0)
      )

      return {
        comparisons,
        topLead: comparisons[0]?.leadId,
        insights: this.generateComparativeInsights(comparisons)
      }
    } catch (error) {
      console.error('Error comparing qualifications:', error)
      return null
    }
  }

  /**
   * Generate comparative insights
   */
  private generateComparativeInsights(comparisons: QualificationComparison[]): string[] {
    const insights: string[] = []

    if (comparisons.length < 2) return insights

    // Find patterns - with proper type handling
    const validPredictions = comparisons
      .map(c => c.prediction)
      .filter((p): p is QualificationPrediction => p !== null)

    if (validPredictions.length === 0) return insights

    const avgProbability = validPredictions.reduce((sum, p) =>
      sum + p.conversionProbability, 0) / validPredictions.length

    insights.push(`Average conversion probability across leads: ${Math.round(avgProbability)}%`)

    // Identify outliers
    const highPerformers = comparisons.filter(c =>
      c.prediction && c.prediction.conversionProbability > avgProbability + 20
    )
    if (highPerformers.length > 0) {
      insights.push(`${highPerformers.length} leads significantly outperform the average`)
    }

    // Common weaknesses
    const weaknesses = new Map<string, number>()
    validPredictions.forEach(prediction => {
      prediction.riskFactors.forEach((risk: string) => {
        weaknesses.set(risk, (weaknesses.get(risk) || 0) + 1)
      })
    })

    const commonWeakness = Array.from(weaknesses.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (commonWeakness && commonWeakness[1] > comparisons.length / 2) {
      insights.push(`Common challenge: ${commonWeakness[0]} (affects ${commonWeakness[1]} leads)`)
    }

    return insights
  }
}