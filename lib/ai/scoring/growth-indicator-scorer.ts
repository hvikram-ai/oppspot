/**
 * Growth Indicator Scorer
 * Identifies and scores growth signals from various data sources
 */

import { createClient } from '@/lib/supabase/server'

export interface GrowthScore {
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

export class GrowthIndicatorScorer {
  async calculateScore(company: Record<string, unknown>): Promise<GrowthScore> {
    console.log(`[GrowthScorer] Calculating score for ${company.name}`)

    const factors: Array<{
      name: string
      value: number
      impact: 'positive' | 'negative' | 'neutral'
      explanation: string
    }> = []
    const missingData = []
    let totalScore = 0
    let totalWeight = 0

    // Check recent incorporation (fast growth potential)
    if (company.date_of_creation || company.incorporation_date) {
      const ageScore = this.scoreCompanyAge(company.date_of_creation || company.incorporation_date)
      factors.push({
        name: 'Company Growth Stage',
        value: ageScore.score,
        impact: ageScore.score > 60 ? 'positive' : 'neutral',
        explanation: ageScore.explanation
      })
      totalScore += ageScore.score * 0.2
      totalWeight += 0.2
    }

    // Check for expansion signals in metadata
    if (company.metadata) {
      const expansionScore = this.scoreExpansionSignals(company.metadata)
      if (expansionScore) {
        factors.push({
          name: 'Expansion Indicators',
          value: expansionScore.score,
          impact: expansionScore.score > 60 ? 'positive' : 'neutral',
          explanation: expansionScore.explanation
        })
        totalScore += expansionScore.score * 0.3
        totalWeight += 0.3
      }
    }

    // Check filing frequency (active companies file more)
    if (company.companies_house_last_updated) {
      const activityScore = this.scoreFilingActivity(company.companies_house_last_updated)
      factors.push({
        name: 'Regulatory Activity',
        value: activityScore,
        impact: (activityScore > 60 ? 'positive' : 'neutral') as const,
        explanation: this.explainActivityScore(activityScore)
      })
      totalScore += activityScore * 0.2
      totalWeight += 0.2
    } else {
      missingData.push('Filing activity')
    }

    // Check for technology/innovation indicators
    if (company.sic_codes) {
      const innovationScore = this.scoreInnovationPotential(company.sic_codes)
      factors.push({
        name: 'Innovation Potential',
        value: innovationScore,
        impact: (innovationScore > 60 ? 'positive' : 'neutral') as const,
        explanation: this.explainInnovationScore(innovationScore)
      })
      totalScore += innovationScore * 0.3
      totalWeight += 0.3
    }

    // If no weighted scores, use default
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50

    const dataQuality = 100 - (missingData.length * 20)

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      factors,
      data_quality: Math.max(0, dataQuality),
      missing_data: missingData
    }
  }

  private scoreCompanyAge(dateCreated: string): { score: number; explanation: string } {
    const created = new Date(dateCreated)
    const now = new Date()
    const years = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)

    if (years < 1) {
      return {
        score: 70,
        explanation: 'Recently incorporated - high growth potential'
      }
    } else if (years < 3) {
      return {
        score: 80,
        explanation: 'Early-stage company in rapid growth phase'
      }
    } else if (years < 5) {
      return {
        score: 75,
        explanation: 'Growth-stage company with scaling potential'
      }
    } else if (years < 10) {
      return {
        score: 65,
        explanation: 'Maturing company with steady growth'
      }
    } else {
      return {
        score: 50,
        explanation: 'Established company with stable growth'
      }
    }
  }

  private scoreExpansionSignals(metadata: Record<string, unknown>): { score: number; explanation: string } | null {
    const signals = []
    let score = 50

    if (metadata.has_multiple_locations) {
      signals.push('multiple locations')
      score += 20
    }

    if (metadata.international_presence) {
      signals.push('international presence')
      score += 25
    }

    if (metadata.recent_funding) {
      signals.push('recent funding')
      score += 30
    }

    if (metadata.hiring_active) {
      signals.push('active hiring')
      score += 20
    }

    if (signals.length === 0) {
      return null
    }

    return {
      score: Math.min(100, score),
      explanation: `Growth signals detected: ${signals.join(', ')}`
    }
  }

  private scoreFilingActivity(lastUpdated: string): number {
    const updated = new Date(lastUpdated)
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate < 30) return 90 // Very recent activity
    if (daysSinceUpdate < 90) return 75 // Recent activity
    if (daysSinceUpdate < 180) return 60 // Moderate activity
    if (daysSinceUpdate < 365) return 45 // Low activity
    return 30 // Inactive
  }

  private scoreInnovationPotential(sicCodes: string[]): number {
    const innovativeSectors = {
      '62': 90, // Computer programming
      '63': 85, // Information services
      '72': 80, // Scientific research
      '71': 75, // Architecture and engineering
      '73': 70, // Advertising and market research
      '58': 65, // Publishing
      '59': 65, // Motion picture and video
      '60': 60, // Broadcasting
    }

    let maxScore = 50 // Base score

    for (const sicCode of sicCodes) {
      const prefix = sicCode.substring(0, 2)
      if (prefix in innovativeSectors) {
        maxScore = Math.max(maxScore, innovativeSectors[prefix as keyof typeof innovativeSectors])
      }
    }

    return maxScore
  }

  private explainActivityScore(score: number): string {
    if (score >= 90) return 'Very recent regulatory filings indicate active business'
    if (score >= 75) return 'Recent filings show active business operations'
    if (score >= 60) return 'Moderate filing activity'
    if (score >= 45) return 'Low filing activity - may indicate slower growth'
    return 'Limited recent activity'
  }

  private explainInnovationScore(score: number): string {
    if (score >= 80) return 'High-innovation sector with strong growth potential'
    if (score >= 70) return 'Innovation-focused industry with growth opportunities'
    if (score >= 60) return 'Moderate innovation potential in sector'
    return 'Traditional sector with steady growth patterns'
  }
}