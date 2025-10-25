/**
 * ICP Learning Engine
 * Auto-refining Ideal Customer Profile based on closed deals
 *
 * Uses pattern recognition to learn from won/lost deals and
 * automatically refine targeting criteria over time.
 */

import { createClient } from '@/lib/supabase/server'
import { getLLMProvider } from '@/lib/ai/llm-factory'
import type { Row } from '@/lib/supabase/helpers'
import type { Address } from '@/lib/opp-scan/core/interfaces'

export interface ICPCriteria {
  industries?: string[]
  employee_range?: { min?: number; max?: number }
  revenue_range?: { min?: number; max?: number }
  locations?: string[]
  tech_stack?: string[]
  growth_indicators?: string[]
  company_age?: { min?: number; max?: number }
  funding_stages?: string[]
}

export interface ICPProfile {
  id: string
  org_id: string
  version: number
  name: string
  description: string
  is_active: boolean
  criteria: ICPCriteria
  confidence_scores: Record<string, number>
  metrics: {
    total_matches: number
    won_deals: number
    lost_deals: number
    open_deals: number
    win_rate: number
    avg_deal_size: number
    avg_sales_cycle_days: number
  }
  learned_from: string[]
  training_data_count: number
  last_trained_at: string | null
}

export interface CompanySnapshot {
  industry?: string
  employee_count?: number
  revenue?: number
  location?: string
  tech_stack?: string[]
  buying_signals?: string[]
  funding_stage?: string
  [key: string]: unknown
}

export interface DealOutcome {
  id: string
  company_id: string
  deal_name: string
  deal_value: number
  deal_stage: string
  outcome: 'won' | 'lost' | 'open'
  outcome_reason?: string
  outcome_date?: string
  company_snapshot: CompanySnapshot
  org_id?: string
}

// Extended business type with ICP-specific fields
interface BusinessWithICPFields extends Omit<Row<'businesses'>, 'address'> {
  employee_count?: number
  address: Address | null
}

export class ICPLearningEngine {
  /**
   * Get active ICP profile for organization
   */
  async getActiveICP(orgId: string): Promise<ICPProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('icp_profiles')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data as ICPProfile
  }

  /**
   * Train ICP from historical deal outcomes
   */
  async trainFromDeals(orgId: string): Promise<ICPProfile> {
    const supabase = await createClient()

    // Step 1: Get all won and lost deals
    const { data: dealsData, error } = await supabase
      .from('deal_outcomes')
      .select('*')
      .eq('org_id', orgId)
      .in('outcome', ['won', 'lost'])
      .order('outcome_date', { ascending: false })
      .limit(100) // Use last 100 deals

    if (error || !dealsData || dealsData.length === 0) {
      throw new Error('No deal data available for training')
    }

    // Type assertion for deal outcomes
    const deals = dealsData as unknown as DealOutcome[]

    // Step 2: Separate won vs lost deals
    const wonDeals = deals.filter(d => d.outcome === 'won')
    const lostDeals = deals.filter(d => d.outcome === 'lost')

    console.log(`[ICP Learning] Training on ${wonDeals.length} won, ${lostDeals.length} lost deals`)

    // Step 3: Extract patterns from won deals
    const patterns = this.extractPatterns(wonDeals, lostDeals)

    // Step 4: Use AI to generate ICP criteria
    const criteria = await this.generateCriteriaWithAI(patterns, wonDeals, lostDeals)

    // Step 5: Calculate confidence scores
    const confidenceScores = this.calculateConfidenceScores(patterns, wonDeals.length)

    // Step 6: Calculate metrics
    const metrics = this.calculateMetrics(wonDeals, lostDeals)

    // Step 7: Get current active ICP
    const currentICP = await this.getActiveICP(orgId)
    const newVersion = currentICP ? currentICP.version + 1 : 1

    // Step 8: Create new ICP version
    const { data: newICPData, error: createError } = await supabase
      .from('icp_profiles')
      .insert({
        org_id: orgId,
        version: newVersion,
        name: `ICP v${newVersion} (Auto-learned)`,
        description: `Automatically learned from ${wonDeals.length} won deals and ${lostDeals.length} lost deals`,
        criteria: criteria as Record<string, unknown>,
        confidence_scores: confidenceScores as Record<string, unknown>,
        metrics: metrics as Record<string, unknown>,
        learned_from: deals.map(d => d.id) as string[],
        training_data_count: deals.length,
        last_trained_at: new Date().toISOString(),
        is_active: true // Will auto-deactivate others via trigger
      } as Record<string, unknown>)
      .select()
      .single()

    if (createError || !newICPData) {
      throw new Error(`Failed to create ICP: ${createError?.message}`)
    }

    // Type assertion for the new ICP
    const newICP = newICPData as unknown as ICPProfile

    // Step 9: Log evolution
    await this.logEvolution(orgId, newICP.id, 'created', currentICP?.criteria, criteria, {
      won_deals: wonDeals.length,
      lost_deals: lostDeals.length,
      improvement: metrics.win_rate - (currentICP?.metrics.win_rate || 0)
    })

    return newICP
  }

  /**
   * Extract patterns from deal outcomes
   */
  private extractPatterns(wonDeals: DealOutcome[], lostDeals: DealOutcome[]) {
    const patterns = {
      industries: {} as Record<string, number>,
      employee_ranges: [] as number[],
      revenue_ranges: [] as number[],
      locations: {} as Record<string, number>,
      tech_stacks: {} as Record<string, number>,
      growth_indicators: {} as Record<string, number>,
      funding_stages: {} as Record<string, number>
    }

    // Analyze won deals
    for (const deal of wonDeals) {
      const snapshot = deal.company_snapshot

      // Industries
      if (snapshot.industry) {
        patterns.industries[snapshot.industry] = (patterns.industries[snapshot.industry] || 0) + 1
      }

      // Employee count
      if (snapshot.employee_count) {
        patterns.employee_ranges.push(snapshot.employee_count)
      }

      // Revenue
      if (snapshot.revenue) {
        patterns.revenue_ranges.push(snapshot.revenue)
      }

      // Location
      if (snapshot.location) {
        patterns.locations[snapshot.location] = (patterns.locations[snapshot.location] || 0) + 1
      }

      // Tech stack
      if (snapshot.tech_stack && Array.isArray(snapshot.tech_stack)) {
        snapshot.tech_stack.forEach((tech: string) => {
          patterns.tech_stacks[tech] = (patterns.tech_stacks[tech] || 0) + 1
        })
      }

      // Growth indicators
      if (snapshot.buying_signals && Array.isArray(snapshot.buying_signals)) {
        snapshot.buying_signals.forEach((signal: string) => {
          patterns.growth_indicators[signal] = (patterns.growth_indicators[signal] || 0) + 1
        })
      }

      // Funding stage
      if (snapshot.funding_stage) {
        patterns.funding_stages[snapshot.funding_stage] = (patterns.funding_stages[snapshot.funding_stage] || 0) + 1
      }
    }

    return patterns
  }

  /**
   * Generate ICP criteria using AI
   */
  private async generateCriteriaWithAI(
    patterns: {
      industries: Record<string, number>
      employee_ranges: number[]
      revenue_ranges: number[]
      locations: Record<string, number>
      tech_stacks: Record<string, number>
      growth_indicators: Record<string, number>
      funding_stages: Record<string, number>
    },
    wonDeals: DealOutcome[],
    lostDeals: DealOutcome[]
  ): Promise<ICPCriteria> {
    const llm = getLLMProvider()

    const prompt = `Analyze these deal patterns and generate an Ideal Customer Profile (ICP).

**Won Deals Analysis:**
- Total won: ${wonDeals.length}
- Industries: ${JSON.stringify(patterns.industries)}
- Employee ranges: ${JSON.stringify(patterns.employee_ranges.slice(0, 10))}
- Revenue ranges: ${JSON.stringify(patterns.revenue_ranges.slice(0, 10))}
- Locations: ${JSON.stringify(patterns.locations)}
- Tech stacks: ${JSON.stringify(patterns.tech_stacks)}
- Growth indicators: ${JSON.stringify(patterns.growth_indicators)}
- Funding stages: ${JSON.stringify(patterns.funding_stages)}

**Lost Deals:** ${lostDeals.length} total

Based on this data, generate an ICP with these criteria:
1. Top 3-5 industries (SIC codes or names)
2. Employee range (min/max)
3. Revenue range (min/max in GBP)
4. Top 3-5 locations
5. Common tech stack (top 5 technologies)
6. Growth indicators to look for
7. Company age range (if patterns exist)
8. Funding stages (if applicable)

Return ONLY valid JSON:
{
  "industries": ["industry1", "industry2"],
  "employee_range": { "min": 50, "max": 500 },
  "revenue_range": { "min": 1000000, "max": 50000000 },
  "locations": ["London", "Manchester"],
  "tech_stack": ["React", "AWS"],
  "growth_indicators": ["hiring", "funding"],
  "company_age": { "min": 2, "max": 10 },
  "funding_stages": ["Series A", "Series B"]
}

Focus on patterns that appear in >30% of won deals.`

    try {
      const response = await llm.complete(prompt, {
        temperature: 0.3,
        max_tokens: 1500
      })

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Fallback: generate from patterns directly
      return this.generateCriteriaFromPatterns(patterns)
    } catch (error) {
      console.error('[ICP Learning] AI generation failed, using pattern-based fallback:', error)
      return this.generateCriteriaFromPatterns(patterns)
    }
  }

  /**
   * Fallback: Generate criteria from patterns (no AI)
   */
  private generateCriteriaFromPatterns(patterns: {
    industries: Record<string, number>
    employee_ranges: number[]
    revenue_ranges: number[]
    locations: Record<string, number>
    tech_stacks: Record<string, number>
    growth_indicators: Record<string, number>
    funding_stages: Record<string, number>
  }): ICPCriteria {
    // Top industries (appear in >20% of deals)
    const totalDeals = Object.values(patterns.industries).reduce((sum, count) => sum + count, 0)
    const industries = Object.entries(patterns.industries)
      .filter(([_, count]) => count / totalDeals > 0.2)
      .map(([industry]) => industry)
      .slice(0, 5)

    // Employee range (10th-90th percentile)
    const employees = [...patterns.employee_ranges].sort((a, b) => a - b)
    const employeeMin = employees[Math.floor(employees.length * 0.1)]
    const employeeMax = employees[Math.floor(employees.length * 0.9)]

    // Revenue range (10th-90th percentile)
    const revenues = [...patterns.revenue_ranges].sort((a, b) => a - b)
    const revenueMin = revenues[Math.floor(revenues.length * 0.1)]
    const revenueMax = revenues[Math.floor(revenues.length * 0.9)]

    // Top locations
    const locations = Object.entries(patterns.locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([loc]) => loc)

    // Top tech stack
    const techStack = Object.entries(patterns.tech_stacks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tech]) => tech)

    // Growth indicators
    const growthIndicators = Object.entries(patterns.growth_indicators)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ind]) => ind)

    // Funding stages
    const fundingStages = Object.entries(patterns.funding_stages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([stage]) => stage)

    return {
      industries,
      employee_range: { min: employeeMin, max: employeeMax },
      revenue_range: { min: revenueMin, max: revenueMax },
      locations,
      tech_stack: techStack,
      growth_indicators: growthIndicators,
      funding_stages: fundingStages
    }
  }

  /**
   * Calculate confidence scores for each criteria
   */
  private calculateConfidenceScores(patterns: {
    industries: Record<string, number>
    employee_ranges: number[]
    revenue_ranges: number[]
    locations: Record<string, number>
    tech_stacks: Record<string, number>
    growth_indicators: Record<string, number>
    funding_stages: Record<string, number>
  }, wonDealsCount: number): Record<string, number> {
    const scores: Record<string, number> = {}

    // Industry confidence (based on concentration)
    const industryTotal = Object.values(patterns.industries).reduce((sum, count) => sum + count, 0)
    const topIndustryCount = Math.max(...Object.values(patterns.industries))
    scores.industries = Math.min((topIndustryCount / industryTotal) * 100, 100)

    // Employee range confidence (based on sample size)
    scores.employee_range = Math.min((patterns.employee_ranges.length / wonDealsCount) * 100, 100)

    // Revenue range confidence
    scores.revenue_range = Math.min((patterns.revenue_ranges.length / wonDealsCount) * 100, 100)

    // Location confidence
    const locationTotal = Object.values(patterns.locations).reduce((sum, count) => sum + count, 0)
    const topLocationCount = Math.max(...Object.values(patterns.locations), 0)
    scores.locations = Math.min((topLocationCount / locationTotal) * 100, 100)

    // Tech stack confidence
    const techTotal = Object.values(patterns.tech_stacks).reduce((sum, count) => sum + count, 0)
    scores.tech_stack = Math.min((techTotal / wonDealsCount) * 50, 100) // Tech data is often sparse

    // Growth indicators confidence
    const growthTotal = Object.values(patterns.growth_indicators).reduce((sum, count) => sum + count, 0)
    scores.growth_indicators = Math.min((growthTotal / wonDealsCount) * 60, 100)

    return scores
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(wonDeals: DealOutcome[], lostDeals: DealOutcome[]) {
    const totalDeals = wonDeals.length + lostDeals.length
    const winRate = totalDeals > 0 ? wonDeals.length / totalDeals : 0

    const avgDealSize = wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0) / wonDeals.length
      : 0

    // Calculate average sales cycle from won deals
    const dealsWithCycle = wonDeals.filter(d => d.outcome_date)
    const avgSalesCycle = dealsWithCycle.length > 0
      ? dealsWithCycle.reduce((sum, d) => {
          const start = new Date(d.outcome_date!)
          const end = new Date(d.outcome_date!)
          return sum + Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        }, 0) / dealsWithCycle.length
      : 45 // Default 45 days

    return {
      total_matches: 0, // Will be calculated when scoring companies
      won_deals: wonDeals.length,
      lost_deals: lostDeals.length,
      open_deals: 0,
      win_rate: winRate,
      avg_deal_size: avgDealSize,
      avg_sales_cycle_days: Math.round(avgSalesCycle)
    }
  }

  /**
   * Log ICP evolution
   */
  private async logEvolution(
    orgId: string,
    icpId: string,
    changeType: string,
    beforeData: Record<string, unknown>,
    afterData: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ) {
    const supabase = await createClient()

    const insights = []
    if (changeType === 'created') {
      insights.push(`Created new ICP v${triggerData.version || 'unknown'} from ${triggerData.won_deals} won deals`)
      insights.push(`Win rate: ${(triggerData.improvement * 100).toFixed(1)}%`)
    }

    await supabase.from('icp_evolution_log').insert({
      org_id: orgId,
      icp_profile_id: icpId,
      change_type: changeType,
      before_data: beforeData as Record<string, unknown>,
      after_data: afterData as Record<string, unknown>,
      trigger_type: 'auto_learning',
      trigger_data: triggerData as Record<string, unknown>,
      insights
    } as Record<string, unknown>)
  }

  /**
   * Calculate ICP match score for a company
   */
  async calculateMatchScore(companyId: string, icpId: string): Promise<number> {
    const supabase = await createClient()

    // Get ICP
    const { data: icpData } = await supabase
      .from('icp_profiles')
      .select('*')
      .eq('id', icpId)
      .single()

    if (!icpData) {
      throw new Error('ICP not found')
    }

    // Type assertion for ICP
    const icp = icpData as unknown as ICPProfile

    // Get company
    const { data: companyData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single() as { data: Row<'businesses'> | null; error: unknown }

    if (!companyData) {
      throw new Error('Company not found')
    }

    // Type assertion for company with ICP fields
    const company = companyData as unknown as BusinessWithICPFields

    const criteria = icp.criteria
    let totalScore = 0
    let totalWeight = 0

    // Industry match (weight: 30)
    if (criteria.industries && company.sic_codes && company.sic_codes.length > 0) {
      const match = criteria.industries.some((ind: string) =>
        company.sic_codes!.includes(ind)
      )
      totalScore += match ? 30 : 0
      totalWeight += 30
    }

    // Employee range match (weight: 20)
    if (criteria.employee_range && company.employee_count) {
      const min = criteria.employee_range.min || 0
      const max = criteria.employee_range.max || Infinity
      const match = company.employee_count >= min && company.employee_count <= max
      totalScore += match ? 20 : 0
      totalWeight += 20
    }

    // Location match (weight: 15)
    if (criteria.locations && company.address) {
      const address = company.address as Address
      const match = criteria.locations.some((loc: string) =>
        address.city?.toLowerCase().includes(loc.toLowerCase()) ||
        address.region?.toLowerCase().includes(loc.toLowerCase())
      )
      totalScore += match ? 15 : 0
      totalWeight += 15
    }

    // Normalize to 0-100
    const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0

    // Cache the score
    await supabase.from('icp_match_scores').upsert({
      icp_profile_id: icpId,
      company_id: companyId,
      org_id: icp.org_id,
      overall_score: finalScore,
      component_scores: { industry: 0, size: 0, location: 0 }, // TODO: Calculate
      match_reasons: [],
      mismatch_reasons: [],
      calculated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h cache
    } as Record<string, unknown>)

    return finalScore
  }
}

// Singleton instance
export const icpLearningEngine = new ICPLearningEngine()
