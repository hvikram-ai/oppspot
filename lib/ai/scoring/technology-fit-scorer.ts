/**
 * Technology Fit Scorer
 * Analyzes technology stack compatibility and technical maturity
 */

export interface TechnologyScore {
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

export class TechnologyFitScorer {
  async calculateScore(company: any): Promise<TechnologyScore> {
    console.log(`[TechnologyScorer] Calculating score for ${company.name}`)

    const factors = []
    const missingData = []
    let score = 50 // Default score

    // Check for website
    if (company.website) {
      factors.push({
        name: 'Digital Presence',
        value: 70,
        impact: 'positive' as const,
        explanation: 'Company has an active website indicating digital maturity'
      })
      score += 20
    } else {
      missingData.push('Website')
      factors.push({
        name: 'Digital Presence',
        value: 30,
        impact: 'negative' as const,
        explanation: 'No website found - limited digital presence'
      })
      score -= 10
    }

    // Check for tech-related SIC codes
    if (company.sic_codes && Array.isArray(company.sic_codes)) {
      const techCodes = ['62', '63'] // Information and communication
      const hasTechCode = company.sic_codes.some((code: string) =>
        techCodes.some(tc => code.startsWith(tc))
      )

      if (hasTechCode) {
        factors.push({
          name: 'Tech Industry Classification',
          value: 80,
          impact: 'positive' as const,
          explanation: 'Company operates in technology sector'
        })
        score += 15
      }
    }

    // Basic technology adoption indicators
    if (company.metadata?.has_ecommerce) {
      factors.push({
        name: 'E-commerce Capability',
        value: 75,
        impact: 'positive' as const,
        explanation: 'E-commerce enabled business'
      })
      score += 10
    }

    // Data quality calculation
    const dataQuality = 100 - (missingData.length * 20)

    return {
      score: Math.min(100, Math.max(0, score)),
      factors,
      data_quality: Math.max(0, dataQuality),
      missing_data: missingData
    }
  }
}